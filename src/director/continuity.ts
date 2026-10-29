// Continuing an earlier project: "용의 눈동자 1편 내용에 이어지는 2편을 만들자".
// The crew reads the whole earlier project (settings, cast, scenario, every episode's clips) and the new project starts with the same cast
// (same images, same registered assets: nothing is cast or generated again). Pure (no DOM, no network).
import { newId, shotsOfEpisode } from './model';
import type { DirectorProject, DirectorReference } from './types';

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.,:;!?'"()\[\]{}~·]+/g, '');
/** "용의 눈동자 2편 초안" -> "용의 눈동자": the part number and what follows it are not the series name */
const stripNo = (s: string) => s.replace(/\s*(\d+|[일이삼사오육칠팔구십]+)\s*(편|화|부작|부|기|시즌|part|ep|episode|season).*$/i, '');

export interface ProjectRef { name: string; title?: string }

/** Which saved projects does the producer's sentence name? The longest / most exact match wins; ties are all returned (at most 3). */
export function matchProjects(text: string, entries: ProjectRef[], exclude: string[] = []): string[] {
  const t = norm(text);
  const scored = entries.filter((e) => !exclude.includes(e.name)).map((e) => {
    let best = 0;
    for (const raw of [e.name, e.title ?? '']) {
      const n = norm(raw); if (n.length < 2) continue;
      if (t.includes(n)) best = Math.max(best, 100 + n.length);
      else { const base = norm(stripNo(raw)); if (base.length >= 3 && t.includes(base)) best = Math.max(best, base.length); }
    }
    return { name: e.name, best };
  }).filter((x) => x.best > 0);
  if (!scored.length) return [];
  const top = Math.max(...scored.map((x) => x.best));
  return scored.filter((x) => x.best === top).slice(0, 3).map((x) => x.name);
}

const clip = (v: unknown, n: number) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

/**
 * Everything the crew needs to continue `q`, as compact text. The newest episodes get the most detail; the total stays under `maxChars`
 * (the oldest episodes are shortened to one line first, so the end of the story is never the part that is cut).
 */
export function summarizePrevious(q: DirectorProject, maxChars = 14000): string {
  const s = q.series;
  const head: string[] = [];
  head.push(`PREVIOUS WORK: "${q.name}"${s.title ? ` (series title "${s.title}")` : ''}`);
  head.push(`settings: ${s.total_episodes} episodes x ${s.episode_seconds}s, clips ${s.clip_seconds}s, ${s.aspect}, ${s.resolution}, genre "${s.genre}", tone "${s.tone}"`);
  if (s.logline) head.push(`logline: ${clip(s.logline, 300)}`);
  if (s.synopsis) head.push(`synopsis: ${clip(s.synopsis, 900)}`);
  if (s.sound_direction) head.push(`sound direction: ${clip(s.sound_direction, 240)}`);
  if (s.music_direction) head.push(`music direction: ${clip(s.music_direction, 240)}`);
  const cast = q.references.filter((r) => r.status !== 'rejected');
  if (cast.length) head.push('cast:\n' + cast.map((r) => `  ${r.kind}: ${r.name}${r.variant_of ? ` (look of ${r.variant_of})` : ''} - ${clip(r.description, 200)}`).join('\n'));
  const eps = [...q.episodes].sort((a, b) => a.no - b.no);
  const full = (e: typeof eps[number]) => {
    const scenes = q.scenes.filter((x) => x.episode_id === e.episode_id).sort((a, b) => a.order - b.order);
    const shots = shotsOfEpisode(q, e.episode_id);
    const lines = [`episode ${e.no} "${e.title}": ${clip(e.logline, 300)}`];
    for (const sc of scenes) {
      lines.push(`  scene ${sc.order} ${clip(sc.title, 40)}: ${clip(sc.summary, 200)}`);
      for (const sh of q.shots.filter((x) => x.scene_id === sc.scene_id).sort((a, b) => a.order - b.order)) lines.push(`    - ${clip(sh.prompt_en, 160)}${sh.dialogue ? ` | "${clip(sh.dialogue, 120)}"` : ''}`);
    }
    return shots.length ? lines.join('\n') : lines[0];
  };
  const one = (e: typeof eps[number]) => `episode ${e.no} "${e.title}": ${clip(e.logline, 200)}`;
  const base = head.join('\n');
  let budget = maxChars - base.length;
  const parts = new Map<number, string>(eps.map((e) => [e.no, one(e)]));
  budget -= [...parts.values()].reduce((a, v) => a + v.length + 1, 0);
  for (const e of [...eps].reverse()) {   // upgrade from the newest episode backwards while there is room
    const f = full(e), add = f.length - parts.get(e.no)!.length;
    if (add <= budget) { parts.set(e.no, f); budget -= add; }
  }
  return `${base}\n${eps.map((e) => parts.get(e.no)).join('\n')}`;
}

/**
 * The new project starts where the old one left off: same look, same cast, same assets. Mutates `p`. Returns what was taken over.
 * The cast keeps its images and registered assets (status approved, nothing to generate); episodes, scenes and clips are NOT copied.
 */
export function inheritFrom(p: DirectorProject, q: DirectorProject, file: string): { cast: number; assets: number } {
  const s = q.series;
  p.series = { ...p.series, format: s.format, language: s.language, genre: s.genre, tone: s.tone, clip_seconds: s.clip_seconds, episode_seconds: s.episode_seconds, aspect: s.aspect, resolution: s.resolution, preset: s.preset, sound_direction: s.sound_direction, music_direction: s.music_direction };
  const assetMap = new Map<string, string>();
  for (const a of q.assets) {
    const id = newId('as'); assetMap.set(a.asset_id, id);
    p.assets.push({ ...structuredClone(a), asset_id: id });
  }
  let cast = 0;
  for (const r of q.references.filter((x) => x.status !== 'rejected')) {
    const c: DirectorReference = { ...structuredClone(r), ref_id: newId('rf'), status: 'approved', asset_id: r.asset_id ? assetMap.get(r.asset_id) : undefined };
    p.references.push(c); cast++;
  }
  p.continues = [...(p.continues ?? []), { project_id: q.project_id, name: q.name, file }];
  return { cast, assets: assetMap.size };
}

/** Attach an earlier project as reading material only (no cast is copied): used when it is named after the project already started. */
export function attachContext(p: DirectorProject, q: DirectorProject, file: string): void {
  if (!(p.continues ?? []).some((c) => c.project_id === q.project_id)) p.continues = [...(p.continues ?? []), { project_id: q.project_id, name: q.name, file }];
}
