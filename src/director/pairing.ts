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

// ---- prompt sync between the Director and the paired canvas. The clip prompt is the same text in three places (the "prompt" step grid, the "generate" step grid,
// the canvas Prompt card). The grids read `shot.prompt_user`, the card holds `params.text`.
//  - Director -> card: when a prompt is SAVED in a grid (or made by the crew) the card follows at once.
//  - card -> Director: only by the card's "Apply to the Director" button (a half-typed card text is never copied by itself).
let syncStarted = false;

/** the open Director project + its episode canvas, when both are open together (else null) */
function pairContext() {
  const d = useDirector.getState(); const g = useGraph.getState(); const p = d.project;
  if (!p || d.readOnly || d.demo || !g.canvasFile) return null;
  const link = p.canvas_links.find((l) => l.canvas_file === g.canvasFile && l.shots.length && !l.aspect && l.purpose !== 'casting' && l.purpose !== 'music');
  return link ? { d, g, p, link } : null;
}
const effectiveOf = (p: DirectorProject, s: DirectorProject['shots'][number]) => clipPromptOf(s, p.series.language, shotSubjects(p, s));
const cardTextOf = (g: ReturnType<typeof useGraph.getState>, id: string) => { const n = g.nodes.find((x) => x.id === id); return n ? String(n.params.text ?? '') : undefined; };

/** the prompt card of a clip of the paired canvas: does its text differ from what the Director holds? (null = not a paired clip card) */
export function promptCardState(nodeId: string): { shotId: string; differs: boolean } | null {
  const c = pairContext(); if (!c) return null;
  const sh = c.link.shots.find((x) => x.node_ids[0] === nodeId); const s = sh && c.p.shots.find((x) => x.shot_id === sh.shot_id); if (!sh || !s) return null;
  const text = (cardTextOf(c.g, nodeId) ?? '').trim();
  return { shotId: sh.shot_id, differs: !!text && text !== effectiveOf(c.p, s).trim() };
}

/** the card's "Apply to the Director" button: the card text becomes the clip's prompt in the Director */
export function applyCardToDirector(nodeId: string): boolean {
  const c = pairContext(); if (!c) return false;
  const sh = c.link.shots.find((x) => x.node_ids[0] === nodeId); const s = sh && c.p.shots.find((x) => x.shot_id === sh.shot_id); if (!sh || !s) return false;
  const text = (cardTextOf(c.g, nodeId) ?? '').trim(); if (!text) return false;
  c.d.edit((x) => {
    const q = x.shots.find((z) => z.shot_id === sh.shot_id); if (q) q.prompt_user = text === composeClipPrompt(q, x.series.language, shotSubjects(x, q)) ? undefined : text;
    const l = x.canvas_links.find((z) => z.canvas_id === c.link.canvas_id); if (l) l.prompt_sent = { ...(l.prompt_sent ?? {}), [sh.shot_id]: text };
  });
  return true;
}

export function startPairSync(): void {
  if (syncStarted) return; syncStarted = true;
  let key = '';
  const dirSnap = new Map<string, string>();   // shot -> the Director's prompt as last seen
  const sameKey = (c: NonNullable<ReturnType<typeof pairContext>>) => {
    const k = `${c.p.project_id}|${c.g.canvasFile}`; if (k === key) return true;
    key = k; dirSnap.clear(); for (const sh of c.link.shots) { const s = c.p.shots.find((x) => x.shot_id === sh.shot_id); if (s) dirSnap.set(s.shot_id, effectiveOf(c.p, s)); }
    return false;
  };
  useDirector.subscribe(() => {
    const c = pairContext(); if (!c) { key = ''; return; }
    if (!sameKey(c)) return;
    for (const sh of c.link.shots) {
      const s = c.p.shots.find((x) => x.shot_id === sh.shot_id); if (!s) continue;
      const now = effectiveOf(c.p, s);
      if (dirSnap.get(s.shot_id) === now) continue;
      dirSnap.set(s.shot_id, now);
      const id = sh.node_ids[0]; const cur = cardTextOf(c.g, id);
      if (cur === undefined || cur === now) continue;
      c.g.setParam(id, 'text', now);
      if (c.link.prompt_sent?.[s.shot_id] !== now) c.d.edit((x) => { const l = x.canvas_links.find((z) => z.canvas_id === c.link.canvas_id); if (l) l.prompt_sent = { ...(l.prompt_sent ?? {}), [s.shot_id]: now }; });   // not "stale"
    }
  });
}
