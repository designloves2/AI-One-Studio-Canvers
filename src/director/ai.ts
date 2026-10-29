// Director Mode crew: the producer (the user) talks, the LLM answers as the writer / director / art / sound / music staff with ONE JSON reply,
// and the app applies it to the project. Pure: the LLM is passed in as a function, so scripts can test everything with a fake one.
//
// Why JSON: the LLM backends here are plain text-in / text-out (same protocol as the Live Canvas). The app checks the reply
// (clip count, numbers) BEFORE touching the project, asks the model once or twice to fix it, and only then applies it.
import { addChat, episodeByNo, findReference, mentionedRefs, newEpisode, newReference, newScene, newShot, shotsOfEpisode, syncShotAssets } from './model';
import { PRESETS, RESOLUTIONS, splitSeconds, usableClipSeconds } from './series';
import { allFormatsGuide, detectFormat, formatOf, isFormat, vocabOf } from './formats';
import { applyMusicPatch, newMusic, songMap, songText } from './music';
import type { CrewRole, DirectorProject, DirectorSeries, ReferenceKind, StageId } from './types';
import type { Kickoff } from './workflow';

export const ASPECTS = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];
export type Intent = 'work' | 'revise' | 'approve' | 'ask';

export interface ClipPlan { prompt_en: string; prompt_ko?: string; camera?: string; dialogue?: string; sound?: string; music?: string; cast?: string[]; location?: string }
export interface Edit {
  op: 'set_episode' | 'set_clip' | 'delete_clip' | 'set_scene' | 'set_reference' | 'delete_reference' | 'skip_references';
  episode?: number; no?: number; clip?: number; scene?: number; name?: string;
  title?: string; logline?: string; summary?: string; kind?: ReferenceKind; description?: string; status?: string; variant_of?: string; cast?: string[]; location?: string; locations?: string[];
  /** set_reference: the new name of an entry (the clips and episodes that use it follow) */
  new_name?: string;
  /** set_clip: false = leave this clip out of the joined video, true = put it back */
  include?: boolean;
  prompt_en?: string; prompt_ko?: string; camera?: string; dialogue?: string; sound?: string; music?: string; notes?: string;
}
export interface AiReply {
  crew?: CrewRole; say: string; intent?: Intent;
  series?: Partial<DirectorSeries>;
  /** music video: the song (where it comes from, style, lyrics, length, sections). `generate: true` = the producer asked to make the song now. */
  music?: Record<string, unknown> & { generate?: boolean };
  brief?: { text?: string; assumptions?: string[] };
  episodes?: { no: number; title?: string; logline?: string; cast?: string[]; locations?: string[] }[];
  references?: { kind?: ReferenceKind; name: string; description?: string; prompt_en?: string; prompt_ko?: string; variant_of?: string }[];
  episode_plan?: { no?: number; scenes: { title?: string; summary?: string; clips: ClipPlan[] }[] };
  edits?: Edit[];
  suggest?: string[];
}

export type LlmFn = (system: string, prompt: string) => Promise<string>;

export const CREW_LABEL: Record<CrewRole, string> = { producer_desk: 'Producer desk', writer: 'Writer', director: 'Director', cinematographer: 'Cinematographer', art: 'Art department', sound: 'Sound director', music: 'Music director' };

const clip = (v: unknown, n: number) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

// ------------------------------------------------------------------ what the model is told
function stateText(p: DirectorProject): string {
  const s = p.series, w = p.workflow;
  const L: string[] = [];
  L.push(`STAGE: ${w.stage} (${w.status[w.stage]}), current episode ${w.episode_no} of ${s.total_episodes}`);
  L.push(`KIND OF WORK: ${s.format} (${formatOf(s.format).label})`);
  L.push(`SERIES: title="${s.title}" genre="${s.genre}" tone="${s.tone}" language=${s.language} episodes=${s.total_episodes} episode_seconds=${s.episode_seconds} clip_seconds=${s.clip_seconds} aspect=${s.aspect} resolution=${s.resolution} preset=${s.preset}`);
  if (s.logline) L.push(`LOGLINE: ${clip(s.logline, 200)}`);
  if (s.synopsis) L.push(`SYNOPSIS: ${clip(s.synopsis, 600)}`);
  if (s.sound_direction) L.push(`SOUND DIRECTION: ${clip(s.sound_direction, 200)}`);
  if (s.music_direction) L.push(`MUSIC DIRECTION: ${clip(s.music_direction, 200)}`);
  if (s.format === 'musicvideo' && songText(p)) L.push(songText(p));
  if (p.brief.text) L.push(`BRIEF (${p.brief.status}): ${clip(p.brief.text, 800)}`);
  if (p.episodes.length) L.push('EPISODES:\n' + p.episodes.map((e) => `  ${e.no}. ${clip(e.title, 40)} - ${clip(e.logline, 90)} [${e.status}]${e.cast?.length ? ` | cast: ${e.cast.join(', ')}` : ''}${e.locations?.length ? ` | places: ${e.locations.join(', ')}` : ''}`).join('\n'));
  if (p.references.length) L.push('CAST (casting entries; use these names exactly):\n' + p.references.filter((r) => r.status !== 'rejected').map((r) => `  ${r.kind}: ${r.name}${r.variant_of ? ` (look of ${r.variant_of})` : ''} [${r.status}${r.asset_id ? ', registered asset' : ''}] ${clip(r.description, 260)}`).join('\n'));
  const ep = episodeByNo(p, w.episode_no);
  if (ep && (ep.stage === 'review' || ep.stage === 'done')) L.push(`EPISODE ${ep.no} IS IN THE FINAL REVIEW: the producer watches the joined video${ep.final ? '' : ' (not joined yet)'}. Changes the producer asks for are made with "edits" on the clips (set_clip; include:false leaves a clip out of the video); a changed clip goes back to be generated again.`);
  if (ep) {
    const shots = shotsOfEpisode(p, ep.episode_id);
    if (shots.length) {
      const sc = new Map(p.scenes.map((x) => [x.scene_id, x]));
      L.push(`EPISODE ${ep.no} CLIPS:\n` + shots.map((x, i) => `  clip ${i + 1} (scene ${sc.get(x.scene_id)?.order}, ${x.duration_sec}s, ${x.status}): ${clip(x.prompt_en, 140)}${x.cast.length ? ` | cast: ${x.cast.join(', ')}` : ''}${x.location ? ` | place: ${x.location}` : ''}${x.dialogue ? ` | dialogue: ${clip(x.dialogue, 60)}` : ''}${x.sound ? ` | sound: ${clip(x.sound, 50)}` : ''}${x.music ? ` | music: ${clip(x.music, 50)}` : ''}`).join('\n'));
    }
  }
  return L.join('\n');
}

export function buildSystem(p: DirectorProject, previous: string[] = []): string {
  const lang = p.series.language === 'en' ? 'English' : 'Korean';
  const f = formatOf(p.series.format);
  return `You are the whole production crew of an AI film studio: the writer, the director, the cinematographer, the art department (reference images), the sound director and the music director.
The USER IS THE PRODUCER. The producer only talks: gives the idea, asks for changes, approves. You do all the work and make every creative and technical decision yourself.
Never ask the producer to fill in details. If something is missing, choose a sensible default and list it under brief.assumptions (or say it in one short sentence). Ask a question only if you truly cannot go on.

Reply with ONE JSON object only (no markdown). All keys are optional except "say":
{
 "crew": "writer|director|cinematographer|art|sound|music|producer_desk"   // who is speaking; the one the job belongs to
 "say": "1-3 short sentences to the producer in ${lang}: what you did / decided / what you need",
 "intent": "work|revise|approve|ask",   // approve ONLY when the producer clearly accepts the current step (예: 승인, 좋아 진행해, OK)
 "series": { "format":"drama|film|ad|musicvideo|vlog|short","title","genre","tone","logline","synopsis","language":"ko|en","total_episodes","episode_seconds","clip_seconds","aspect":"${ASPECTS.join('|')}","resolution":"${RESOLUTIONS.join('|')}","preset":"${PRESETS.join('|')}","sound_direction","music_direction" },
 "music": { "source":"upload|generate", "title","style":"genre, tempo, mood, instruments, voice","lyrics","language":"ko|en","duration_sec","bpm","sections":[{"name":"intro|verse|pre-chorus|chorus|bridge|outro","start_sec","end_sec"}],"generate":true }, // music video only: the producer can bring their own song (source upload) or ask for one (source generate); generate:true = make the song now
 "brief": { "text": "the brief in prose: concept, audience, tone, structure, look, sound, music, how it will be produced", "assumptions": ["..."] },
 "episodes": [ { "no":1, "title":"", "logline":"", "cast":["CAST names of the people and props in this episode"], "locations":["CAST names of the places of this episode"] } ],
 "references": [ { "kind":"character|location|prop", "name":"", "description":"the look in ${lang}: what an image maker needs (a person: age, build, face, hair, clothes; a place: architecture, light, mood; a prop: shape, material, colour). ONE text only; the image model's own prompt writer turns it into the model's prompt", "variant_of":"base entry name, only for a new costume / look" } ],
 "episode_plan": { "no": 1, "scenes": [ { "title":"", "summary":"", "clips": [ { "prompt_en":"what the camera sees: subject, action, setting, camera, light", "prompt_ko":"short Korean", "camera":"", "dialogue":"spoken lines with the speaker", "sound":"effects and ambience", "music":"the music under this clip", "cast":["names from CAST in this clip"], "location":"a CAST location name" } ] } ] },
 "edits": [ {"op":"set_clip","episode":1,"clip":2,"prompt_en":"...","cast":["names"],"location":"name","include":true}, {"op":"set_episode","no":3,"title":"","logline":"","cast":["names"],"locations":["names"]}, {"op":"set_scene","episode":1,"scene":2,"title":"","summary":""}, {"op":"delete_clip","episode":1,"clip":4}, {"op":"set_reference","name":"","new_name":"","kind":"","description":"","variant_of":""}, {"op":"delete_reference","name":""}, {"op":"skip_references"} ],
 "suggest": ["up to 3 short next things the producer might say"]
}
THIS WORK IS A ${f.label.toUpperCase()}. ${f.guide}
RULES
- Picture and sound prompts are written in English; "say" and prompt_ko are ${lang}. Keep every clip's picture description self-contained (characters described again, no "as before").
- THE ORDER OF WORK: brief -> casting (actors, places, props are cast and their images are made FIRST) -> scenario (the series plan and every episode are written ONLY with the approved CAST) -> clips.
- A clip is one continuous shot of the length given by the app. The lead and the other main characters are the same people in every episode: the same CAST entry, the same face. Only costume and place change: for a new costume or a new look of a place, add a variant entry (variant_of) at casting time or with set_reference.
- Every clip names its cast and location with the exact CAST names; never invent a name that is not in CAST. EVERY person who appears or speaks in a clip is in that clip's cast (also one who only speaks off screen), every prop that appears or is used in a clip is in that clip's cast too, and EVERY clip has a location. Each episode lists its cast (its people AND props) and its places in "episodes"; no episode may be left without cast or without a place.
- When the producer asks to change a cast entry, change that entry (set_reference with its exact name, or new_name to rename it) and keep it consistent in the episodes and clips; answer only after it is changed.
- The writer writes dialogue and story; the sound director writes "sound" (effects, ambience); the music director writes "music" and the series music direction.
- Change only what the producer asked to change. Use "edits" for small changes (one clip, one episode, one reference). Do not resend the whole plan for a small change.
- Approved work stays as it is unless the producer asks to change it.
- To approve: {"intent":"approve","say":"..."} and nothing else.

${previous.length ? `\nTHIS PROJECT CONTINUES EARLIER WORK. Read it completely and carry it on: same world, same cast (same people, same looks), the story must follow on from where it ended, nothing from it may be contradicted, and new episodes must not repeat what already happened. Keep sound and music direction consistent unless the producer asks otherwise.\n\n${previous.join('\n\n')}\n` : ''}
CURRENT STATE
${stateText(p)}`;
}

/** The instruction for an automatic step (the producer did not type it). */
export function kickoffInstruction(p: DirectorProject, k: Exclude<Kickoff, 'canvas' | null>): string {
  const s = p.series;
  if (k === 'brief') return `Write the brief from the producer's request above. FIRST decide the kind of work (series.format) from what the producer asked for; the kinds are:\n${allFormatsGuide()}\nWhen the producer does not give numbers, use that kind's usual numbers. Fill "series" completely (format, title, genre, tone, logline, language, total_episodes, episode_seconds, clip_seconds, aspect, resolution, preset, sound_direction, music_direction) and "brief". Defaults when not said: clip_seconds 10, aspect 16:9, resolution 1080p, preset h3_7plus1_kimchy, language ko (when earlier work is given, its settings are the defaults). Series length and episode length must follow what the producer said exactly.`;
  const f = formatOf(s.format);
  if (k === 'music') {
    const m = p.music;
    if (m?.source === 'upload') return `The producer uploaded their own song${m.title ? ` "${m.title}"` : ''} (${m.duration_sec}s). You cannot hear it: propose its structure with "music.sections" (name, start_sec, end_sec; contiguous from 0 to ${m.duration_sec}s) the way a song of this length is usually built, a title if there is none, and the style / lyrics only if the producer wrote them. Keep everything that is already filled in.`;
    return `Write the song for this music video: "music" with title, style (genre, tempo, mood, instruments, voice), the full lyrics in ${s.language === 'en' ? 'English' : 'Korean'}, language, duration_sec (the length the producer asked for; if not said use ${s.episode_seconds}), bpm, and sections (contiguous from 0 to duration_sec). Set music.source to "generate". The song matches the look and mood of the brief and the cast.`;
  }
  if (k === 'series' && !f.multi) return `Write the ${vocabOf(s.format).scenario.toLowerCase()} of this ${f.label.toLowerCase()} with the approved CAST: "series.synopsis" and "series.logline", and "episodes" with EXACTLY 1 entry (no 1, a title and one line that says what the piece is about). ${f.guide}`;
  if (k === 'series') return `Write the scenario of the whole series with the approved CAST: "series.synopsis" and "series.logline" updates, and "episodes" with EXACTLY ${s.total_episodes} entries numbered 1 to ${s.total_episodes} (a title and one story line each; name the main cast and the costume or place changes in the story line) and for EACH episode "cast" (every CAST person and important prop who appears in it) and "locations" (every CAST place it happens in), with the exact CAST names; no episode without cast and without a place, and every CAST entry is used in at least one episode. The episodes must build one story arc with hooks and a cliffhanger at the end of each episode. The leads appear throughout; use the supporting cast, places and props where they fit.`;
  if (k === 'references') return `Do the casting now, before any story is written (${vocabOf(s.format).cast}). From the brief choose the ${vocabOf(s.format).characters.toLowerCase()} (the leads and the important supporting cast, each with a precise look: age, build, face, hair, usual clothes), the main ${vocabOf(s.format).locations.toLowerCase()} and the key ${vocabOf(s.format).props.toLowerCase()}${s.format === 'ad' ? ' (the product is a prop entry with its exact look; no logo, no text on it)' : ''}. Use "references" (4 to 12 entries; kind character / location / prop; each with a "description" in ${s.language === 'en' ? 'English' : 'Korean'} and no separate prompt). If CAST already holds entries (taken over from earlier work), do NOT cast them again: list only NEW cast that the next story needs, and keep the old entries as they are. If the story needs a costume or a look that is clearly different (wedding dress, uniform, night version of a place), add it as its own entry with variant_of set to the base entry. The sound and music directions may be refined in "series".`;
  const no = p.workflow.episode_no;
  const parts = splitSeconds(s.episode_seconds, s.clip_seconds);
  const songMapText = f.id === 'musicvideo' && p.music?.sections.length ? ` THE SONG MAP (which part of the song each clip covers): ${songMap(p.music.duration_sec, s.clip_seconds, p.music.sections).map((c) => `clip ${c.no} = ${c.from}-${c.to}s ${c.section ?? ''}`).join('; ')}. Each clip's picture follows its part of the song, "music" says which part it is, "dialogue" holds the lyric line sung in that clip (or is empty).` : '';
  const epNow = episodeByNo(p, no);
  const cl = epNow && (epNow.cast?.length || epNow.locations?.length) ? ` This episode's cast (people and props): ${(epNow.cast ?? []).join(', ') || '-'}; its places: ${(epNow.locations ?? []).join(', ') || '-'}. Use exactly these people, props and places: every person and every prop that appears or is used in a clip is in that clip's "cast", and every clip has a location. Never invent a person, prop or place that is not in this list.` : ' Every person and prop that appears is in the cast of that clip, and every clip has a location.';
  return `Write ${f.multi ? `episode ${no} ("${epNow?.title ?? ''}")` : `the whole ${f.label.toLowerCase()}`}. Use "episode_plan" with scenes and clips.${cl} EXACTLY ${parts.length} clips in total across all scenes (the app sets their lengths: ${parts.join(', ')} seconds). Every clip needs prompt_en, prompt_ko, camera, dialogue (may be empty), sound and music.${songMapText}`;
}

// ------------------------------------------------------------------ reading the reply
export function parseReply(raw: string): AiReply {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no JSON object in the reply');
  s = s.slice(a, b + 1);
  let o: unknown;
  try { o = JSON.parse(s); } catch { o = JSON.parse(s.replace(/,\s*([}\]])/g, '$1')); }
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('the reply is not a JSON object');
  const r = o as AiReply;
  if (typeof r.say !== 'string') r.say = '';
  return r;
}

/** the length and the number of episodes the producer wrote in plain words (only when it is said once and clearly; a clip length such as "클립 10초" is not the episode length) */
export function saidNumbers(text: string): { seconds?: number; episodes?: number } {
  const t = text.replace(/클립\s*당?\s*\d+(?:\.\d+)?\s*초/g, ' ').replace(/\d+(?:\.\d+)?\s*초\s*(?:클립|단위|씩)/g, ' ').replace(/clips?\s*(?:of\s*)?\d+\s*(?:s|sec)/gi, ' ');
  const out: { seconds?: number; episodes?: number } = {};
  const d = [...t.matchAll(/(\d+)\s*분(?:\s*(\d+)\s*초)?|(\d+)\s*초/g)];
  if (d.length === 1) out.seconds = d[0][3] !== undefined ? Number(d[0][3]) : Number(d[0][1]) * 60 + Number(d[0][2] ?? 0);
  const e = [...t.matchAll(/(\d+)\s*부작/g)];
  if (e.length === 1) out.episodes = Number(e[0][1]);
  return out;
}

/** What is wrong with the reply for the step it was asked for (null = fine). Checked BEFORE anything is applied. */
export function checkReply(p: DirectorProject, r: AiReply, kickoff: Kickoff | 'free'): string | null {
  const s = { ...p.series, ...(r.series ?? {}) };
  if (kickoff === 'brief') {
    if (!r.series || !r.brief?.text?.trim()) return 'the reply needs "series" and "brief.text"';
    if (!(Number(s.total_episodes) >= 1) || !(Number(s.episode_seconds) > 0)) return '"series.total_episodes" and "series.episode_seconds" must be numbers';
    const said = saidNumbers(p.chat.filter((m) => m.role === 'user').map((m) => m.text).join(' \n '));
    if (s.format !== 'musicvideo') {
      if (said.seconds !== undefined && Math.abs(Number(s.episode_seconds) - said.seconds) > 0.5) return `the producer asked for ${said.seconds} seconds per episode, but "series.episode_seconds" is ${s.episode_seconds}. Use exactly what the producer said`;
      if (said.episodes !== undefined && Number(s.total_episodes) !== said.episodes) return `the producer asked for ${said.episodes} episodes, but "series.total_episodes" is ${s.total_episodes}. Use exactly what the producer said`;
    }
  }
  if (kickoff === 'series') {
    const n = Number(s.total_episodes);
    const eps = r.episodes ?? [];
    const nos = new Set(eps.map((e) => Number(e.no)));
    if (eps.length !== n || [...Array(n)].some((_, i) => !nos.has(i + 1))) return `"episodes" must have exactly ${n} entries numbered 1 to ${n} (got ${eps.length})`;
    if (eps.some((e) => !String(e.title ?? '').trim() && !String(e.logline ?? '').trim())) return 'every episode needs a title or a logline';
    const live = p.references.filter((x) => x.status !== 'rejected');
    if (live.length) {
      const names = (e: { cast?: string[]; locations?: string[] }) => [...(e.cast ?? []), ...(e.locations ?? [])].map(String);
      const bad = new Set<string>(); for (const e of eps) for (const n of names(e)) if (!findReference(p, n)) bad.add(n);
      if (bad.size) return `these names are not in CAST: ${[...bad].slice(0, 6).join(', ')}. Use the exact CAST names in each episode's "cast" and "locations"`;
      const noCast = eps.filter((e) => !names(e).some((n) => findReference(p, n)?.kind !== 'location')).map((e) => e.no);
      if (noCast.length && live.some((x) => x.kind !== 'location')) return `episode ${noCast.slice(0, 6).join(', ')}: "cast" is empty. Every episode lists the CAST people / props who appear in it`;
      const noPlace = eps.filter((e) => !names(e).some((n) => findReference(p, n)?.kind === 'location')).map((e) => e.no);
      if (noPlace.length && live.some((x) => x.kind === 'location')) return `episode ${noPlace.slice(0, 6).join(', ')}: "locations" is empty. Every episode lists the CAST places where it happens`;
    }
  }
  if (kickoff === 'music') {
    const mu = r.music; if (!mu) return 'the reply needs "music"';
    const src = p.music?.source ?? mu.source;
    if (!Array.isArray(mu.sections) || !mu.sections.length) return '"music.sections" is needed (name, start_sec, end_sec)';
    if (!(Number(mu.duration_sec ?? p.music?.duration_sec) >= 10)) return '"music.duration_sec" is needed (10 - 600)';
    if (src === 'generate' && (!String(mu.lyrics ?? p.music?.lyrics ?? '').trim() || !String(mu.style ?? p.music?.style ?? '').trim())) return 'a generated song needs "style" and "lyrics"';
  }
  if (kickoff === 'references' && !(r.references ?? []).some((x) => x?.name)) return 'the reply needs "references" with at least one named entry';
  if (kickoff === 'episode') {
    const want = splitSeconds(s.episode_seconds, usableClipSeconds(Number(s.clip_seconds)).value).length;
    const plan = r.episode_plan;
    const clips = plan?.scenes?.flatMap((x) => x.clips ?? []) ?? [];
    if (!plan || !clips.length) return 'the reply needs "episode_plan" with scenes and clips';
    if (clips.length !== want) return `"episode_plan" must have exactly ${want} clips in total (got ${clips.length})`;
    if (clips.some((c) => !String(c?.prompt_en ?? '').trim())) return 'every clip needs prompt_en';
    const live = p.references.filter((r) => r.status !== 'rejected');
    if (live.length) {
      const bad = new Set<string>();
      for (const c of clips) for (const n of [...(c.cast ?? []), ...(c.location ? [c.location] : [])]) if (!findReference(p, String(n)) || findReference(p, String(n))!.status === 'rejected') bad.add(String(n));
      if (bad.size) return `these names are not in CAST: ${[...bad].slice(0, 6).join(', ')}. Use the exact CAST names`;
    }
    const ep = episodeByNo(p, p.workflow.episode_no);
    if (ep && shotsOfEpisode(p, ep.episode_id).some((x) => x.results.length)) return 'this episode already has generated results; change single clips with "edits" instead';
  }
  return null;
}

// ------------------------------------------------------------------ applying the reply
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v));

/** change the series settings (the crew's JSON and the dropdowns of the brief screen use the same checks: numbers are limited, unknown values are ignored, a clip length is moved into what the card renders) */
export function applySeriesPatch(p: DirectorProject, patch: Partial<DirectorSeries>, notes: string[]): void { applySeries(p, patch, notes); }

function applySeries(p: DirectorProject, patch: Partial<DirectorSeries>, notes: string[]) {
  const s = p.series;
  for (const k of ['title', 'genre', 'tone', 'logline', 'synopsis', 'sound_direction', 'music_direction'] as const) if (typeof patch[k] === 'string') s[k] = patch[k]!;
  if (isFormat(patch.format)) s.format = patch.format;
  if (patch.language === 'ko' || patch.language === 'en') s.language = patch.language;
  const n = Math.round(num(patch.total_episodes)); if (patch.total_episodes !== undefined && n >= 1 && n <= 200) s.total_episodes = n;
  const es = num(patch.episode_seconds); if (patch.episode_seconds !== undefined && es >= 5 && es <= 3600) s.episode_seconds = es;
  if (patch.clip_seconds !== undefined && num(patch.clip_seconds) > 0) { const u = usableClipSeconds(num(patch.clip_seconds)); s.clip_seconds = u.value; if (u.note) notes.push(u.note); }
  if (patch.aspect && ASPECTS.includes(patch.aspect)) s.aspect = patch.aspect;
  if (patch.resolution && (RESOLUTIONS as string[]).includes(patch.resolution)) s.resolution = patch.resolution;
  if (patch.preset && (PRESETS as string[]).includes(patch.preset)) s.preset = patch.preset;
}

const refKey = (n: string) => n.trim().toLowerCase();

/** a new name for a cast entry: everything that used the old one follows */
function renameReference(p: DirectorProject, r: DirectorProject['references'][number], to: string) {
  const old = r.name; r.name = to;
  const swap = (a?: string[]) => a?.map((n) => (n === old ? to : n));
  for (const s of p.shots) { s.cast = swap(s.cast)!; if (s.location === old) s.location = to; }
  for (const e of p.episodes) { if (e.cast) e.cast = swap(e.cast); if (e.locations) e.locations = swap(e.locations); }
  for (const q of p.references) if (q.variant_of === old) q.variant_of = to;
}

/** `free` = the producer asked for it by chat (an approved cast entry may then be changed, and an episode plan goes to the episode being looked at); `episode` = the episode a written plan belongs to */
export function applyReply(p: DirectorProject, r: AiReply, opt: { free?: boolean; episode?: number } = {}): string[] {
  const notes: string[] = [];
  if (r.series) applySeries(p, r.series, notes);
  if (r.music && p.series.format === 'musicvideo') { const { generate: _g, ...patch } = r.music;   void _g; p.music = p.music ?? newMusic(); applyMusicPatch(p.music, patch, notes); }
  if (r.brief) {
    if (typeof r.brief.text === 'string') { p.brief.text = r.brief.text.trim(); p.brief.status = 'draft'; }
    if (Array.isArray(r.brief.assumptions)) p.brief.assumptions = r.brief.assumptions.map(String).filter(Boolean).slice(0, 12);
  }
  for (const e of r.episodes ?? []) {
    const no = Math.round(num(e.no));
    if (!(no >= 1 && no <= p.series.total_episodes)) continue;
    const ep = episodeByNo(p, no) ?? newEpisode(p, no);
    if (typeof e.title === 'string') ep.title = e.title.trim();
    if (typeof e.logline === 'string') ep.logline = e.logline.trim();
    setEpisodeRefs(p, ep, e.cast, e.locations);
  }
  p.episodes.sort((a, b) => a.no - b.no);
  // a shorter series drops the plain "planned" extras (never an episode that has scenes)
  p.episodes = p.episodes.filter((e) => e.no <= p.series.total_episodes || p.scenes.some((s) => s.episode_id === e.episode_id));
  for (const x of r.references ?? []) {
    if (!x?.name) continue;
    const cur = p.references.find((q) => refKey(q.name) === refKey(x.name));
    if (cur) { if (opt.free || cur.status !== 'approved') { if (x.description) { cur.description = x.description; if (cur.results.length) notes.push(`${cur.name}: the old image is kept, generate again to see the change`); } } continue; }
    const nr = newReference(p, (['character', 'location', 'prop'] as const).includes(x.kind as ReferenceKind) ? (x.kind as ReferenceKind) : 'character', x.name.trim(), x.description || x.prompt_ko || x.prompt_en || '', '');
    if (x.variant_of && findReference(p, x.variant_of)) nr.variant_of = findReference(p, x.variant_of)!.name;
  }
  if (r.episode_plan) {
    const no = Math.round(num(opt.episode ?? r.episode_plan.no ?? p.workflow.episode_no));   // a written plan always goes to the episode that was asked for, whatever number the model put in it
    const ep = episodeByNo(p, no);
    if (ep) {
      const old = new Set(p.scenes.filter((s) => s.episode_id === ep.episode_id).map((s) => s.scene_id));
      p.shots = p.shots.filter((x) => !old.has(x.scene_id)); p.scenes = p.scenes.filter((s) => !old.has(s.scene_id));
      const lengths = splitSeconds(p.series.episode_seconds, p.series.clip_seconds);
      let k = 0;
      for (const sc of r.episode_plan.scenes) {
        const scene = newScene(p, ep.episode_id, String(sc.title ?? '').trim()); scene.summary = String(sc.summary ?? '').trim();
        for (const c of sc.clips ?? []) {
          const shot = newShot(p, scene.scene_id);
          shot.duration_sec = lengths[k++] ?? p.series.clip_seconds;
          shot.prompt_en = String(c.prompt_en ?? '').trim(); shot.prompt_ko = String(c.prompt_ko ?? '').trim(); shot.camera = String(c.camera ?? '').trim();
          shot.dialogue = String(c.dialogue ?? '').trim(); shot.sound = String(c.sound ?? '').trim(); shot.music = String(c.music ?? '').trim();
          shot.cast = (c.cast ?? []).map((n) => findReference(p, String(n))?.name).filter((n): n is string => !!n); shot.location = c.location ? (findReference(p, c.location)?.name ?? '') : '';
        }
      }
      ep.status = 'drafted';
      repairClipRefs(p, ep.episode_id);
    }
  }
  for (const e of r.edits ?? []) applyEdit(p, e, notes);
  for (const ep of p.episodes) if (p.scenes.some((s) => s.episode_id === ep.episode_id)) repairClipRefs(p, ep.episode_id);
  syncShotAssets(p);
  return notes;
}

/** an episode's own cast and places (names resolved to CAST entries; a place goes to `locations`, everything else to `cast`) */
function setEpisodeRefs(p: DirectorProject, ep: DirectorProject['episodes'][number], cast?: string[], locations?: string[]) {
  if (!Array.isArray(cast) && !Array.isArray(locations)) return;
  const c: string[] = [], l: string[] = [];
  for (const n of [...(Array.isArray(cast) ? cast : []), ...(Array.isArray(locations) ? locations : [])]) {
    const r = findReference(p, String(n)); if (!r || r.status === 'rejected') continue;
    const to = r.kind === 'location' ? l : c; if (!to.includes(r.name)) to.push(r.name);
  }
  ep.cast = c; ep.locations = l;
}

/**
 * Make every clip's references complete without asking the model again: a cast entry whose name is written in the clip (picture, Korean text, dialogue) is in the clip's cast,
 * a clip without a place gets the place of the clip before it (else the episode's first place), and the episode's own list gets what its clips use.
 */
export function repairClipRefs(p: DirectorProject, episodeId: string): void {
  const ep = p.episodes.find((e) => e.episode_id === episodeId); if (!ep) return;
  let lastPlace = '';
  const useCast = new Set<string>(), usePlaces = new Set<string>();
  for (const s of shotsOfEpisode(p, episodeId)) {
    const text = [s.prompt_en, s.prompt_ko, s.dialogue, s.notes, s.sound].join(' \n ');
    const have = s.cast.map((n) => findReference(p, n)?.name).filter((n): n is string => !!n);
    let place = s.location ? (findReference(p, s.location)?.name ?? '') : '';
    for (const r of mentionedRefs(p, text, [...have, place])) {
      if (r.kind === 'location') { if (!place) place = r.name; } else if (!have.includes(r.name)) have.push(r.name);
    }
    if (!place) place = lastPlace || (ep.locations ?? [])[0] || '';
    s.cast = [...new Set(have)]; s.location = place;
    if (place) { lastPlace = place; usePlaces.add(place); }
    s.cast.forEach((n) => useCast.add(n));
  }
  if (useCast.size || usePlaces.size) { ep.cast = [...new Set([...(ep.cast ?? []), ...useCast])]; ep.locations = [...new Set([...(ep.locations ?? []), ...usePlaces])]; }
}

function applyEdit(p: DirectorProject, e: Edit, notes: string[]) {
  const epNo = Math.round(num(e.episode ?? p.workflow.episode_no));
  const ep = episodeByNo(p, epNo);
  const clips = ep ? shotsOfEpisode(p, ep.episode_id) : [];
  switch (e.op) {
    case 'set_episode': {
      const t = episodeByNo(p, Math.round(num(e.no ?? e.episode)));
      if (!t) return void notes.push(`episode ${e.no ?? e.episode} does not exist`);
      if (typeof e.title === 'string') t.title = e.title.trim(); if (typeof e.logline === 'string') t.logline = e.logline.trim();
      setEpisodeRefs(p, t, e.cast, e.locations); return;
    }
    case 'set_clip': {
      const s = clips[Math.round(num(e.clip)) - 1];
      if (!s) return void notes.push(`clip ${e.clip} of episode ${epNo} does not exist`);
      let changed = false;
      for (const k of ['prompt_en', 'prompt_ko', 'camera', 'dialogue', 'sound', 'music', 'notes'] as const) if (typeof e[k] === 'string' && e[k] !== s[k]) { s[k] = e[k]!; changed = true; }
      if (Array.isArray(e.cast)) { s.cast = e.cast.map((n) => findReference(p, String(n))?.name).filter((n): n is string => !!n); changed = true; }
      if (typeof e.location === 'string') { s.location = findReference(p, e.location)?.name ?? ''; changed = true; }
      if (typeof e.include === 'boolean') s.excluded = e.include ? undefined : true;
      // a changed clip needs a new look-over; its old results stay in the history
      if (changed) s.passed = undefined;   // a changed clip has to be looked at again
      if (changed && ['approved', 'review', 'done', 'ready'].includes(s.status)) { s.status = 'draft'; if (s.results.length) notes.push(`clip ${e.clip}: the old result is kept, generate again to see the change`); }
      return;
    }
    case 'delete_clip': {
      const s = clips[Math.round(num(e.clip)) - 1];
      if (!s) return void notes.push(`clip ${e.clip} of episode ${epNo} does not exist`);
      p.shots = p.shots.filter((x) => x.shot_id !== s.shot_id);
      const sc = p.scenes.find((x) => x.scene_id === s.scene_id)!; sc.shot_ids = sc.shot_ids.filter((id) => id !== s.shot_id);
      p.shots.filter((x) => x.scene_id === sc.scene_id).sort((a, b) => a.order - b.order).forEach((x, i) => { x.order = i + 1; });
      notes.push(`clip ${e.clip} removed: the episode is now ${Math.round(shotsOfEpisode(p, ep!.episode_id).reduce((a, x) => a + x.duration_sec, 0) * 10) / 10} s`); return;
    }
    case 'set_scene': {
      const sc = ep && p.scenes.filter((x) => x.episode_id === ep.episode_id).sort((a, b) => a.order - b.order)[Math.round(num(e.scene)) - 1];
      if (!sc) return void notes.push(`scene ${e.scene} of episode ${epNo} does not exist`);
      if (typeof e.title === 'string') sc.title = e.title.trim(); if (typeof e.summary === 'string') sc.summary = e.summary.trim(); return;
    }
    case 'set_reference': {
      if (!e.name) return;
      let r = p.references.find((q) => refKey(q.name) === refKey(e.name!));
      if (!r) r = newReference(p, (['character', 'location', 'prop'] as const).includes(e.kind as ReferenceKind) ? (e.kind as ReferenceKind) : 'character', e.name.trim());
      if (typeof e.description === 'string' && e.description.trim()) r.description = e.description.trim();
      if (typeof e.new_name === 'string' && e.new_name.trim() && e.new_name.trim() !== r.name) renameReference(p, r, e.new_name.trim());
      if (e.status === 'rejected' || e.status === 'proposed') r.status = e.status;
      if (e.variant_of && findReference(p, e.variant_of)) r.variant_of = findReference(p, e.variant_of)!.name;
      if ((e.description || e.new_name) && r.results.length) notes.push(`${r.name}: the old image is kept, generate again to see the change`);
      return;
    }
    case 'delete_reference': p.references = p.references.filter((q) => refKey(q.name) !== refKey(e.name ?? '')); return;
    case 'skip_references': p.references = p.references.filter((q) => q.status !== 'proposed'); return;
  }
}

// ------------------------------------------------------------------ one turn
export interface TurnResult { reply: AiReply; notes: string[]; attempts: number }

/**
 * Ask the model, check the reply, ask again (up to `maxAttempts`) with what was wrong, then apply it to `p`.
 * `p` is only changed after a reply passed the check. `userText` is what the producer typed (or the automatic instruction for a kickoff).
 */
export async function directorTurn(p: DirectorProject, userText: string, llm: LlmFn, opt: { kickoff?: Kickoff | 'free'; maxAttempts?: number; previous?: string[] } = {}): Promise<TurnResult> {
  const kickoff = opt.kickoff ?? 'free';
  const recent = p.chat.slice(-12).map((m) => `${m.role === 'user' ? 'Producer' : CREW_LABEL[m.crew ?? 'producer_desk']}: ${clip(m.text, 400)}`).join('\n');
  const base = `${recent ? `CONVERSATION SO FAR\n${recent}\n\n` : ''}Producer: ${userText}\n\nReply with the JSON object only.`;
  let err = '', reply: AiReply | null = null, attempts = 0;
  const max = opt.maxAttempts ?? 3;
  while (attempts < max && !reply) {
    attempts++;
    const system = buildSystem(p, opt.previous) + (err ? `\n\nYOUR PREVIOUS REPLY WAS REJECTED: ${err}. Return the complete corrected JSON object.` : '');
    let raw = '';
    try { raw = await llm(system, base); } catch (e) { throw e; }
    try {
      const r = parseReply(raw);
      if (kickoff === 'brief' && r.series && !isFormat(r.series.format)) { const f = detectFormat(p.chat.filter((m) => m.role === 'user').map((m) => m.text).join(' ')); if (f) r.series.format = f; }
      if (r.crew === 'music' && formatNow(p, r) !== 'musicvideo') r.crew = 'producer_desk';
      const bad = r.intent === 'approve' ? null : checkReply(p, r, kickoff);
      if (bad) { err = bad; continue; }
      reply = r;
    } catch (e) { err = (e as Error).message; }
  }
  if (!reply) throw new Error(`The crew could not produce a usable answer (${err}). Try again, or pick a stronger LLM in Settings.`);
  const notes = reply.intent === 'approve' ? [] : applyReply(p, reply, { free: kickoff === 'free', episode: kickoff === 'episode' ? p.workflow.episode_no : undefined });
  return { reply, notes, attempts };
}

const formatNow = (p: DirectorProject, r: AiReply) => (isFormat(r.series?.format) ? r.series!.format : p.series.format);

export const defaultCrew = (stage: StageId): CrewRole => ({ intake: 'producer_desk', brief: 'producer_desk', series: 'writer', references: 'art', episode: 'director', canvas: 'cinematographer', execute: 'cinematographer', review: 'director' } as Record<StageId, CrewRole>)[stage];
export { addChat };
