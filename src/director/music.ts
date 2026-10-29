// The song of a music video: where it comes from (the producer's own file, or made by the AI), its structure (sections with times),
// and which part of the song every clip covers. Pure (no DOM, no network).
import { splitSeconds } from './series';
import type { DirectorMusic, DirectorProject, ResultRef, SectionName, SongSection } from './types';

export const SECTION_NAMES: SectionName[] = ['intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'outro'];
const isSection = (v: unknown): v is SectionName => typeof v === 'string' && (SECTION_NAMES as string[]).includes(v);
const MIN_SONG = 10, MAX_SONG = 600;

export function newMusic(): DirectorMusic {
  return { source: null, title: '', style: '', lyrics: '', language: 'ko', duration_sec: 0, bpm: 0, sections: [], candidates: [], status: 'draft' };
}

/** the typical shape of a pop song, scaled to the length (the crew writes real sections; this is the fallback and the "reset" of the screen) */
export function defaultSections(duration: number): SongSection[] {
  if (!(duration >= MIN_SONG)) return [];
  const shape: [SectionName, number][] = [['intro', 0.06], ['verse', 0.18], ['pre-chorus', 0.07], ['chorus', 0.16], ['verse', 0.16], ['pre-chorus', 0.05], ['chorus', 0.16], ['bridge', 0.08], ['outro', 0.08]];
  const out: SongSection[] = []; let t = 0;
  shape.forEach(([name, share], i) => {
    const end = i === shape.length - 1 ? Math.round(duration) : Math.min(Math.round(duration), Math.round(t + duration * share));
    if (end > t) out.push({ name, start_sec: t, end_sec: end });
    t = end;
  });
  return out;
}

/** make the sections one unbroken run from 0 to the end of the song: valid names only, sorted, no overlap, no gap */
export function normalizeSections(list: unknown, duration: number): SongSection[] {
  if (!Array.isArray(list) || !(duration > 0)) return [];
  const raw = list.map((s) => s as Partial<SongSection>).filter((s) => isSection(s.name) && Number.isFinite(Number(s.end_sec))).sort((a, b) => Number(a.start_sec ?? 0) - Number(b.start_sec ?? 0));
  const out: SongSection[] = []; let t = 0;
  raw.forEach((s, i) => {
    const last = i === raw.length - 1;
    const end = last ? Math.round(duration) : Math.min(Math.round(duration), Math.max(t, Math.round(Number(s.end_sec))));
    if (end > t) { out.push({ name: s.name as SectionName, start_sec: t, end_sec: end, ...(s.lyric ? { lyric: String(s.lyric) } : {}) }); t = end; }
  });
  return out;
}

/** change the song data from the crew's JSON or the screen; unknown values are ignored, numbers are limited (returns notes for the producer) */
export function applyMusicPatch(m: DirectorMusic, patch: Record<string, unknown>, notes: string[] = []): DirectorMusic {
  if (patch.source === 'upload' || patch.source === 'generate' || patch.source === null) m.source = patch.source as DirectorMusic['source'];
  for (const k of ['title', 'style', 'lyrics'] as const) if (typeof patch[k] === 'string') m[k] = (patch[k] as string).trim();
  if (patch.language === 'ko' || patch.language === 'en') m.language = patch.language;
  const dur = Number(patch.duration_sec);
  if (patch.duration_sec !== undefined && Number.isFinite(dur)) {
    const c = Math.min(MAX_SONG, Math.max(MIN_SONG, Math.round(dur)));
    if (c !== Math.round(dur)) notes.push(`song length ${Math.round(dur)} s is outside ${MIN_SONG}-${MAX_SONG} s, so ${c} s is used`);
    m.duration_sec = c;
  }
  const bpm = Number(patch.bpm);
  if (patch.bpm !== undefined && Number.isFinite(bpm)) m.bpm = Math.min(240, Math.max(0, Math.round(bpm))) >= 40 ? Math.min(240, Math.round(bpm)) : 0;
  if (typeof patch.engine === 'string') m.engine = patch.engine;
  if (Array.isArray(patch.sections)) m.sections = normalizeSections(patch.sections, m.duration_sec || Number((patch.sections as { end_sec?: number }[]).at(-1)?.end_sec) || 0);
  if (m.duration_sec > 0 && !m.sections.length) m.sections = defaultSections(m.duration_sec);
  else if (m.sections.length && m.duration_sec > 0 && m.sections.at(-1)!.end_sec !== m.duration_sec) m.sections = normalizeSections(m.sections, m.duration_sec);
  return m;
}

export interface ClipSpan { no: number; from: number; to: number; section: SectionName | null }
/** which part of the song each clip covers: the song is cut into clips of `clipSeconds` (same rule as every episode), the section is the one at the clip's middle */
export function songMap(duration: number, clipSeconds: number, sections: SongSection[]): ClipSpan[] {
  let t = 0;
  return splitSeconds(duration, clipSeconds).map((len, i) => {
    const from = t, to = Math.round((t + len) * 100) / 100; t = to;
    const mid = (from + to) / 2;
    return { no: i + 1, from, to, section: sections.find((s) => mid >= s.start_sec && mid < s.end_sec)?.name ?? null };
  });
}

export const pickedAudio = (m: DirectorMusic | undefined): ResultRef | undefined => m?.candidates.find((c) => c.picked && c.kind === 'audio');

/** what is missing before the song can be approved */
export function musicBlockers(p: DirectorProject): string[] {
  const m = p.music; const out: string[] = [];
  if (!m || !m.source) return ['Choose where the song comes from: your own file, or made by the AI.'];
  if (!pickedAudio(m)) out.push(m.source === 'upload' ? 'No song file has been uploaded yet.' : 'The song has not been generated yet.');
  if (!(m.duration_sec >= MIN_SONG)) out.push('The song length is not known yet.');
  if (!m.sections.length) out.push('The song has no sections yet.');
  return out;
}

const clip = (v: string, n: number) => (v.length > n ? `${v.slice(0, n)}…` : v);
/** the song as text for the crew (system prompt) with the clip map */
export function songText(p: DirectorProject): string {
  const m = p.music; if (!m || (!m.source && !m.title)) return '';
  const L = [`SONG: "${m.title}" (${m.source === 'upload' ? "the producer's own file" : m.source === 'generate' ? 'made by the AI' : 'source not chosen'}), ${m.duration_sec}s${m.bpm ? `, ${m.bpm} BPM` : ''}, language ${m.language}`];
  if (m.style) L.push(`  style: ${clip(m.style, 200)}`);
  if (m.lyrics) L.push(`  lyrics: ${clip(m.lyrics.replace(/\s*\n\s*/g, ' / '), 700)}`);
  if (m.sections.length) L.push(`  sections: ${m.sections.map((s) => `${s.start_sec}-${s.end_sec}s ${s.name}`).join('; ')}`);
  if (m.sections.length && m.duration_sec > 0) L.push(`  clips: ${songMap(m.duration_sec, p.series.clip_seconds, m.sections).map((c) => `#${c.no} ${c.from}-${c.to}s ${c.section ?? ''}`).join('; ')}`);
  return L.join('\n');
}
