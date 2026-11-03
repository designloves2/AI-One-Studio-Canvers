// Director <-> canvas pairs. The Director project is the master: every canvas it builds carries `director` (project file, episode) in the canvas file,
// so a canvas can open its Director project and a Director project opens its canvas. A canvas without a pair is a free canvas.
import { useDirector } from '../store/director';
import { useGraph } from '../store/graph';
import { askConfirm, notify } from '../ui/dialog';
import { t as tr } from '../i18n';
import { listCanvases, loadCanvas, saveCanvas } from '../backend/canvases';
import { openSavedCanvas, saveCanvasToList } from '../engine/actions';
import { episodeByNo, safeProjectName, shotSubjects } from './model';
import { clipPromptOf, composeClipPrompt } from './compose';
import { epStageIndex } from './workflow';
import type { CanvasLink, DirectorProject } from './types';
import type { DirectorPair, Project } from '../types';

const DEMO_FILE = '(demo) ';
export const isDemoFile = (file: string) => file.startsWith(DEMO_FILE);

/** the pair a link of the open Director project stands for (null while the project has no usable file name) */
export function pairOf(p: DirectorProject, file: string | null, link: CanvasLink): DirectorPair | null {
  const dfile = file ?? safeProjectName(p.name); if (!dfile) return null;
  const ep = link.episode_id ? p.episodes.find((e) => e.episode_id === link.episode_id) : undefined;
  return { file: dfile, project_id: p.project_id, name: p.name, ...(ep ? { episode_id: ep.episode_id, no: ep.no } : {}), purpose: link.purpose ?? 'episode' };
}

/** write the pair into a canvas that is about to be saved by the Director (and into the open canvas when it is that same file) */
export function stampPair(project: Project, link: CanvasLink, file: string): Project {
  const d = useDirector.getState(); if (!d.project || isDemoFile(file)) return project;
  const pair = pairOf(d.project, d.file, link); if (!pair) return project;
  project.director = pair;
  const g = useGraph.getState(); if (g.canvasFile === file) g.setDirectorPair(pair);
  return project;
}

/**
 * Old canvases (made before pairs existed) get their pair when their Director project is opened. A saved canvas file is rewritten with the pair only;
 * the open canvas just remembers it (it is saved with the next save), so nothing the producer typed is touched.
 */
export async function backfillPairs(): Promise<void> {
  const d = useDirector.getState(); const p = d.project; if (!p || d.readOnly) return;
  let saved: string[] = [];
  try { saved = (await listCanvases()).map((c) => c.name); } catch { return; }
  for (const link of p.canvas_links) {
    if (isDemoFile(link.canvas_file) || !saved.includes(link.canvas_file)) continue;
    const pair = pairOf(p, d.file, link); if (!pair) continue;
    const g = useGraph.getState();
    if (g.canvasFile === link.canvas_file) { if (JSON.stringify(g.directorPair) !== JSON.stringify(pair)) g.setDirectorPair(pair); continue; }
    try {
      const c = await loadCanvas(link.canvas_file);
      if (JSON.stringify(c.director) === JSON.stringify(pair)) continue;
      await saveCanvas(link.canvas_file, { ...c, director: pair });
    } catch { /* an unreadable canvas keeps no pair */ }
  }
}

/** the canvas of the episode the Director screen is on (a main episode canvas; the cast / song canvases are helpers) */
export function canvasOfFocus(p: DirectorProject, no: number): CanvasLink | null {
  const e = episodeByNo(p, no);
  return (e && p.canvas_links.find((l) => l.episode_id === e.episode_id && !l.aspect && !isDemoFile(l.canvas_file))) || null;
}

/** episodes whose canvas step is approved (generate stage or later, not finished) but whose paired canvas file does not exist (never made, or deleted in the Canvas) */
export function episodesWithoutCanvas(p: DirectorProject, saved: string[]): number[] {
  return p.episodes
    .filter((e) => epStageIndex(e.stage) >= epStageIndex('execute') && e.stage !== 'done')
    .filter((e) => { const l = canvasOfFocus(p, e.no); return !l || !saved.includes(l.canvas_file); })
    .map((e) => e.no);
}

/**
 * Director project opened -> its canvas opens too (no mode change; asks first when the open canvas has unsaved changes).
 * An episode that is past the canvas step but has no canvas any more: the producer is warned and can make it right away.
 */
export async function openCanvasOfProject(): Promise<void> {
  const d = useDirector.getState(); const p = d.project; if (!p || d.demo) return;
  await backfillPairs();
  let saved: string[] = [];
  try { saved = (await listCanvases()).map((c) => c.name); } catch { return; }
  const lost = d.readOnly ? [] : episodesWithoutCanvas(p, saved);
  if (lost.length && await askConfirm(`${tr('The paired canvas of these episodes is missing (never made, or deleted in the Canvas):')} ${lost.join(', ')}

${tr('Make the generation canvas now?')}`)) {
    const { makeEpisodeCanvas } = await import('./canvasAction');
    for (const no of lost) { try { await makeEpisodeCanvas(no); } catch (e) { void notify(`${no}: ${(e as Error).message}`); } }
    try { saved = (await listCanvases()).map((c) => c.name); } catch { /* keep the old list */ }
  }
  const link = canvasOfFocus(useDirector.getState().project ?? p, d.focus); if (!link || !saved.includes(link.canvas_file)) return;
  if (useGraph.getState().canvasFile !== link.canvas_file) await openSavedCanvas(link.canvas_file);
}

/** canvas -> its Director project (and episode) */
export async function openDirectorOfCanvas(): Promise<void> {
  const g = useGraph.getState(); const pair = g.directorPair; if (!pair) return;
  const d = useDirector.getState();
  if (d.busy) { void notify(tr('The crew is working. Wait until it is done.')); return; }
  try {
    if (d.file !== pair.file || d.project?.project_id !== pair.project_id) {
      if (d.dirty && d.project && !d.file && !(await askConfirm(tr('This project has unsaved changes. Continue?')))) return;
      await d.open(pair.file);
      if (useDirector.getState().project?.project_id !== pair.project_id) { void notify(`${tr('This canvas belongs to a Director project that was replaced or renamed.')}\n${pair.name}`); }
    }
    if (pair.no) useDirector.getState().setFocus(pair.no);
    g.setMode('director');
  } catch (e) { void notify(`${tr('The Director project of this canvas could not be opened.')}\n${pair.name}\n${(e as Error).message}`); }
}

/**
 * A new Director project starts while a canvas without a Director pair is open: that canvas will be replaced by a new canvas for the Director.
 * Warn, let the producer save it first, then clear the canvas. Returns false when the producer cancels (nothing changes).
 */
export async function prepareCanvasForNewDirector(): Promise<boolean> {
  const g = useGraph.getState();
  if (useDirector.getState().demo || g.directorPair || !g.nodes.length) return true;   // empty, or already a Director canvas of some project: leave it
  if (!(await askConfirm(`${tr('The open canvas has no Director project. A new Director project replaces it with a new canvas made for the Director.')}\n\n${tr('Save this canvas first, then continue?')}`))) return false;
  if (g.dirty || !g.canvasFile) {
    if (!(await saveCanvasToList())) return false;   // not saved: do not throw the canvas away
  }
  useGraph.getState().newProject();
  return true;
}

/** the new Director canvas takes the place of the empty canvas that was left for it */
export async function adoptIntoEmptyCanvas(file: string): Promise<void> {
  const g = useGraph.getState();
  if (g.nodes.length || g.canvasFile || g.directorPair) return;
  await openSavedCanvas(file);
}

// ---- live prompt sync: the clip prompt is the same text in three places (the "prompt" step grid, the "generate" step grid, the canvas Prompt card).
// The grids read `shot.prompt_user`, the card holds `params.text`. While a Director project and its episode canvas are open together, a change on either
// side is copied to the other at once (last edit wins). Nothing is copied while the two sides were never edited (a difference that already existed stays).
let syncStarted = false;
export function startPairSync(): void {
  if (syncStarted) return; syncStarted = true;
  let key = '';
  const dirSnap = new Map<string, string>();   // shot -> the Director's prompt as last seen
  const cvSnap = new Map<string, string>();    // text card -> the card's text as last seen
  const pending = new Set<string>();           // shots whose card text changed
  let timer: ReturnType<typeof setTimeout> | undefined;

  const ctx = () => {
    const d = useDirector.getState(); const g = useGraph.getState(); const p = d.project;
    if (!p || d.readOnly || d.demo || !g.canvasFile) return null;
    const link = p.canvas_links.find((l) => l.canvas_file === g.canvasFile && l.shots.length && !l.aspect && l.purpose !== 'casting' && l.purpose !== 'music');
    return link ? { d, g, p, link } : null;
  };
  const effective = (p: DirectorProject, s: DirectorProject['shots'][number]) => clipPromptOf(s, p.series.language, shotSubjects(p, s));
  const cardText = (g: ReturnType<typeof useGraph.getState>, id: string) => { const n = g.nodes.find((x) => x.id === id); return n ? String(n.params.text ?? '') : undefined; };
  const snapshot = (c: NonNullable<ReturnType<typeof ctx>>) => {
    dirSnap.clear(); cvSnap.clear(); pending.clear();
    for (const sh of c.link.shots) {
      const s = c.p.shots.find((x) => x.shot_id === sh.shot_id); if (s) dirSnap.set(s.shot_id, effective(c.p, s));
      const t = cardText(c.g, sh.node_ids[0]); if (t !== undefined) cvSnap.set(sh.node_ids[0], t);
    }
  };
  const sameKey = (c: NonNullable<ReturnType<typeof ctx>>) => { const k = `${c.p.project_id}|${c.g.canvasFile}`; if (k === key) return true; key = k; snapshot(c); return false; };

  /** the adapter's record of what the card was given: kept equal, so "the prompts changed after the canvas was made" does not show for a synced edit */
  const markSent = (shotId: string, text: string) => {
    const d = useDirector.getState(); const c = ctx(); if (!c) return;
    if (c.link.prompt_sent?.[shotId] === text) return;
    d.edit((x) => { const l = x.canvas_links.find((z) => z.canvas_id === c.link.canvas_id); if (l) l.prompt_sent = { ...(l.prompt_sent ?? {}), [shotId]: text }; });
  };

  // Director -> canvas card
  useDirector.subscribe(() => {
    const c = ctx(); if (!c) { key = ''; return; }
    if (!sameKey(c)) return;
    for (const sh of c.link.shots) {
      const s = c.p.shots.find((x) => x.shot_id === sh.shot_id); if (!s) continue;
      const now = effective(c.p, s);
      if (dirSnap.get(s.shot_id) === now) continue;
      dirSnap.set(s.shot_id, now);
      const id = sh.node_ids[0]; const cur = cardText(c.g, id);
      if (cur === undefined || cur === now) continue;
      cvSnap.set(id, now);
      c.g.setParam(id, 'text', now);
      markSent(s.shot_id, now);
    }
  });

  // canvas card -> Director
  const flush = () => {
    const c = ctx(); if (!c) { pending.clear(); return; }
    for (const shotId of [...pending]) {
      pending.delete(shotId);
      const sh = c.link.shots.find((x) => x.shot_id === shotId); const s = c.p.shots.find((x) => x.shot_id === shotId); if (!sh || !s) continue;
      const text = (cvSnap.get(sh.node_ids[0]) ?? '').trim();
      if (!text || effective(c.p, s) === text) continue;   // an emptied card is not a prompt
      c.d.edit((x) => { const q = x.shots.find((z) => z.shot_id === shotId); if (q) q.prompt_user = text === composeClipPrompt(q, x.series.language, shotSubjects(x, q)) ? undefined : text; });
      dirSnap.set(shotId, text);
      markSent(shotId, text);
    }
  };
  useGraph.subscribe(() => {
    const c = ctx(); if (!c) { key = ''; return; }
    if (!sameKey(c)) return;
    for (const sh of c.link.shots) {
      const id = sh.node_ids[0]; const t = cardText(c.g, id);
      if (t === undefined || cvSnap.get(id) === t) continue;
      cvSnap.set(id, t); pending.add(sh.shot_id);
    }
    if (pending.size) { clearTimeout(timer); timer = setTimeout(flush, 350); }
  });
}
