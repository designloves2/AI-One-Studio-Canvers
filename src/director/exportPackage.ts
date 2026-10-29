// The production package of one episode (what "manual -> take it as a file" downloads). Pure: the caller gives it the data and a file fetcher.
//   manifest.json   what is in the package and what could not be included
//   README.md       how to use it
//   canvas.canvers.json   the episode canvas (opens in AI ONE Studio Canvers: Canvas mode -> import)
//   prompts.md      every clip: picture, dialogue, sound, music, cast, length
//   clips.json      the same as data
//   assets/...      the cast images, when they could be fetched; the ones that could not are listed in manifest.missing (never pretended)
import { composeClipPrompt } from './compose';
import { castOf, episodeByNo, shotsOfEpisode } from './model';
import { safeName, utf8, type ZipFile } from './zip';
import type { DirectorProject } from './types';
import type { Project } from '../types';

export type Fetcher = (ref: { ref_id: string; name: string }) => Promise<{ data: Uint8Array; ext: string } | null>;

export interface PackageResult { files: ZipFile[]; included: string[]; missing: { name: string; reason: string }[]; zipName: string }

const pad2 = (n: number) => String(n).padStart(2, '0');

export async function buildEpisodePackage(p: DirectorProject, canvas: Project | null, fetchAsset: Fetcher, now: () => string = () => new Date().toISOString(), episodeNo?: number): Promise<PackageResult> {
  const ep = episodeByNo(p, episodeNo ?? p.workflow.episode_no);
  if (!ep) throw new Error('no episode');
  const shots = shotsOfEpisode(p, ep.episode_id);
  const files: ZipFile[] = []; const included: string[] = []; const missing: { name: string; reason: string }[] = [];
  const stem = `${safeName(p.series.title || p.name, 'project')} - ep${pad2(ep.no)}`;

  // assets (the cast images the episode uses)
  const refs = [...new Map(shots.flatMap((s) => castOf(p, s)).map((r) => [r.ref_id, r])).values()];
  const assetPath = new Map<string, string>();
  const used = new Set<string>();
  for (const r of refs) {
    let got: Awaited<ReturnType<Fetcher>> = null, why = 'could not be read';
    try { got = await fetchAsset({ ref_id: r.ref_id, name: r.name }); } catch (e) { why = (e as Error).message; }
    if (!got) { missing.push({ name: r.name, reason: why }); continue; }
    let n = `assets/${safeName(r.name, 'asset')}.${/^[a-z0-9]{1,5}$/i.test(got.ext) ? got.ext.toLowerCase() : 'png'}`;
    for (let i = 2; used.has(n); i++) n = n.replace(/( \d+)?(\.[a-z0-9]+)$/i, ` ${i}$2`);
    used.add(n); assetPath.set(r.ref_id, n);
    files.push({ path: n, data: got.data }); included.push(n);
  }
  if (!canvas) missing.push({ name: 'canvas.canvers.json', reason: 'the episode canvas has not been built yet' });

  const md: string[] = [`# ${p.series.title || p.name} - episode ${ep.no}${ep.title ? `: ${ep.title}` : ''}`, '', ep.logline, '',
    `Format: ${p.series.aspect}, ${p.series.resolution}, clips of ${p.series.clip_seconds}s, ${shots.length} clips (${Math.round(shots.reduce((a, s) => a + s.duration_sec, 0) * 10) / 10}s).`, ''];
  shots.forEach((s, i) => {
    const cast = castOf(p, s);
    md.push(`## Clip ${i + 1} (${s.duration_sec}s${s.camera ? `, ${s.camera}` : ''})`, '', '```', composeClipPrompt(s), '```');
    if (cast.length) md.push('', 'Reference images, in this order: ' + cast.map((r, k) => `@image${k + 1} = ${r.name}${assetPath.has(r.ref_id) ? ` (${assetPath.get(r.ref_id)})` : ' (file not included)'}`).join(', '));
    md.push('');
  });
  files.push({ path: 'prompts.md', data: utf8(md.join('\n')) }); included.push('prompts.md');
  files.push({ path: 'clips.json', data: utf8(JSON.stringify(shots.map((s, i) => ({ clip: i + 1, duration_sec: s.duration_sec, camera: s.camera, prompt_en: s.prompt_en, prompt_ko: s.prompt_ko, dialogue: s.dialogue, sound: s.sound, music: s.music, cast: s.cast, location: s.location, prompt_for_model: composeClipPrompt(s) })), null, 1)) }); included.push('clips.json');
  if (canvas) { files.push({ path: 'canvas.canvers.json', data: utf8(JSON.stringify(canvas, null, 1)) }); included.push('canvas.canvers.json'); }
  files.push({ path: 'README.md', data: utf8(['# Production package', '',
    'Made by AI ONE Studio Canvers, Director mode.', '',
    '- `canvas.canvers.json`: open AI ONE Studio Canvers, Canvas mode, import this file. The clips are already connected.',
    '- `prompts.md` / `clips.json`: the text of every clip, if you want to use another tool.',
    '- `assets/`: the cast images, in the order the prompts name them (@image1, @image2 ...).',
    '- `manifest.json`: what is in this package, and what could not be included.', ''].join('\n')) }); included.push('README.md');
  files.push({ path: 'manifest.json', data: utf8(JSON.stringify({ app: 'ai-one-studio-canvers', kind: 'director-episode-package', created_at: now(), project: p.name, project_id: p.project_id, episode: ep.no, clips: shots.length, files: [...included, 'manifest.json'], missing }, null, 1)) });
  return { files, included: [...included, 'manifest.json'], missing, zipName: `${stem}.zip` };
}
