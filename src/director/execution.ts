// Director Mode phase 4: execution modes and results -> shots. Pure (no DOM, no store, no network) so scripts can test it.
//
// Execution modes (settings.execution_mode). The default is `manual`: the Director screen starts nothing.
//   manual             no Run button here; generate in Canvas mode
//   approval_required  a Run button per shot, only for shots whose status is "approved"; asks before every run
//   step_by_step       one button, "Run next": runs the next approved shot that has no finished result, one at a time, asks every time
//   hybrid             "Run all approved" (one question, shows how many shots, runs them one after another, stops at the first failure)
//                      plus the per-shot Run of approval_required
// A shot only ever runs when the user pressed a button for it and answered the question.
import type { GraphNode } from '../types';
import { composeClipPrompt } from './compose';
import type { CanvasLink, DirectorProject, DirectorShot, ExecutionMode, ResultRef, ShotStatus } from './types';

export const EXECUTION_MODES: ExecutionMode[] = ['manual', 'approval_required', 'step_by_step', 'hybrid'];

const FINISHED: ShotStatus[] = ['review', 'done'];
const ordered = (p: DirectorProject): DirectorShot[] => {
  const so = new Map(p.scenes.map((s) => [s.scene_id, s.order]));
  return [...p.shots].sort((a, b) => (so.get(a.scene_id) ?? 0) - (so.get(b.scene_id) ?? 0) || a.order - b.order);
};

export interface RunPlan { shots: DirectorShot[]; blocked?: string }

/** Which shots a button press would run. `target` = the shot whose own Run button was pressed (undefined for Run next / Run all). */
export function planRun(mode: ExecutionMode, p: DirectorProject, link: CanvasLink | null, target?: string): RunPlan {
  if (mode === 'manual') return { shots: [], blocked: 'manual' };
  if (!link) return { shots: [], blocked: 'no-canvas' };
  const linked = new Set(link.shots.map((s) => s.shot_id));
  const ok = (s: DirectorShot) => s.status === 'approved' && linked.has(s.shot_id);
  if (target) {
    if (mode === 'step_by_step') return { shots: [], blocked: 'use-run-next' };
    const s = p.shots.find((x) => x.shot_id === target);
    if (!s) return { shots: [], blocked: 'unknown-shot' };
    if (!linked.has(s.shot_id)) return { shots: [], blocked: 'not-in-canvas' };
    if (s.status !== 'approved') return { shots: [], blocked: 'not-approved' };
    return { shots: [s] };
  }
  const all = ordered(p).filter(ok);
  if (mode === 'step_by_step') {
    const next = all.find((s) => !s.results.some((r) => r.picked) );
    return next ? { shots: [next] } : { shots: [], blocked: 'nothing-to-run' };
  }
  if (mode === 'hybrid') return all.length ? { shots: all } : { shots: [], blocked: 'nothing-to-run' };
  return { shots: [], blocked: 'use-shot-run' };   // approval_required has no batch button
}

/** Shots whose card still holds an older prompt than the Director text (running now would generate the old text). */
export function staleShots(p: DirectorProject, link: CanvasLink, only?: string[]): string[] {
  const sent = link.prompt_sent ?? {};
  return p.shots.filter((s) => (!only || only.includes(s.shot_id)) && sent[s.shot_id] !== composeClipPrompt(s)).map((s) => s.shot_id);
}

export type RunOutcome = 'ok' | 'error' | 'cancelled';
export interface RunDeps {
  shots: DirectorShot[];
  /** one question for the whole press (shot count shown by the caller); false = nothing runs */
  confirm(shots: DirectorShot[]): Promise<boolean>;
  run(shot: DirectorShot): Promise<RunOutcome>;
  setStatus(shotId: string, status: ShotStatus): void;
  /** called after each shot, whatever happened, to pull its results in */
  collect(shot: DirectorShot): void;
}
export interface RunSummary { asked: boolean; ran: string[]; failed?: string; cancelled?: string; notRun: string[] }

export async function runShots(d: RunDeps): Promise<RunSummary> {
  const sum: RunSummary = { asked: false, ran: [], notRun: d.shots.map((s) => s.shot_id) };
  if (!d.shots.length) return sum;
  sum.asked = true;
  if (!(await d.confirm(d.shots))) return sum;
  for (const s of d.shots) d.setStatus(s.shot_id, 'queued');
  for (const s of d.shots) {
    d.setStatus(s.shot_id, 'generating');
    let out: RunOutcome;
    try { out = await d.run(s); } catch { out = 'error'; }
    d.collect(s);
    sum.notRun = sum.notRun.filter((id) => id !== s.shot_id);
    if (out === 'ok') { d.setStatus(s.shot_id, 'review'); sum.ran.push(s.shot_id); continue; }
    if (out === 'cancelled') { d.setStatus(s.shot_id, 'approved'); sum.cancelled = s.shot_id; }
    else { d.setStatus(s.shot_id, 'failed'); sum.failed = s.shot_id; }
    for (const rest of d.shots.filter((x) => sum.notRun.includes(x.shot_id))) d.setStatus(rest.shot_id, 'approved');   // queued but never started: back to approved
    return sum;
  }
  return sum;
}

export interface SyncReport { added: string[]; statusChanged: string[]; missingNodes: string[] }
/**
 * Pull the results of the linked canvas into the shots (mutates `p`; call it inside the store's edit()).
 * Results only ever get added: a result that disappeared from the canvas stays in the shot history.
 * `runtime` (optional) lets a running / failed card show up as the shot status.
 */
export function applyCanvasResults(p: DirectorProject, link: CanvasLink, nodes: Pick<GraphNode, 'id' | 'results'>[], runtime: Record<string, { status: string } | undefined> = {}, now: () => string = () => new Date().toISOString()): SyncReport {
  const rep: SyncReport = { added: [], statusChanged: [], missingNodes: [] };
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const l of link.shots) {
    const shot = p.shots.find((s) => s.shot_id === l.shot_id);
    const genId = l.node_ids[1];
    if (!shot || !genId) continue;
    const node = byId.get(genId);
    if (!node) { rep.missingNodes.push(shot.shot_id); continue; }
    const have = new Set(shot.results.map((r) => r.result_id));
    for (const a of node.results) {
      if (!a.file || a.type === 'text') continue;
      const id = `rs_${a.id}`;
      if (have.has(id)) continue;
      const r: ResultRef = { result_id: id, file: a.file, kind: a.type, node_id: genId, created_at: now(), picked: false };
      shot.results.push(r); have.add(id); rep.added.push(id);
    }
    if (shot.results.length && !shot.results.some((r) => r.picked)) shot.results[shot.results.length - 1].picked = true;   // the newest is the one shown until the user picks
    const before = shot.status;
    const rt = runtime[genId]?.status;
    if (rt === 'running' && ['queued', 'approved', 'ready'].includes(shot.status)) shot.status = 'generating';
    else if (rt === 'error' && ['queued', 'generating'].includes(shot.status)) shot.status = 'failed';
    else if (rep.added.some((id) => shot.results.some((r) => r.result_id === id)) && ['queued', 'generating', 'approved'].includes(shot.status) && rt !== 'running') shot.status = 'review';
    if (shot.status !== before) rep.statusChanged.push(shot.shot_id);
  }
  return rep;
}

export const isFinished = (s: DirectorShot) => FINISHED.includes(s.status);

/** Pull the images of the casting canvas into the cast entries (adds only; the newest becomes the picked one until the producer picks). */
export function applyReferenceResults(p: DirectorProject, link: CanvasLink, nodes: Pick<GraphNode, 'id' | 'results'>[], now: () => string = () => new Date().toISOString()): { added: string[]; missingNodes: string[] } {
  const rep = { added: [] as string[], missingNodes: [] as string[] };
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const l of link.refs ?? []) {
    const ref = p.references.find((r) => r.ref_id === l.ref_id);
    const node = byId.get(l.node_ids[1]);
    if (!ref) continue;
    if (!node) { rep.missingNodes.push(ref.name); continue; }
    const have = new Set(ref.results.map((r) => r.result_id));
    let fresh = false;
    for (const a of node.results) {
      if (a.type !== 'image' || !a.file) continue;
      const id = `rs_${a.id}`;
      if (have.has(id)) continue;
      ref.results.push({ result_id: id, file: a.file, kind: 'image', node_id: l.node_ids[1], created_at: now(), picked: false }); have.add(id); rep.added.push(id); fresh = true;
    }
    if (fresh) ref.results.forEach((r, i) => { r.picked = i === ref.results.length - 1; });   // a new image becomes the picked one
    else if (ref.results.length && !ref.results.some((r) => r.picked)) ref.results[ref.results.length - 1].picked = true;
  }
  return rep;
}

// ------------------------------------------------------------------ batches: several episodes, or the clips the producer picked
export interface EpisodeBatch { no: number; shots: DirectorShot[]; /** chosen clips that were not "approved" (review / done / failed ...): they are put back to approved before they run */ requeue: string[] }
export interface BatchPlan { batches: EpisodeBatch[]; skipped: { no: number; reason: 'unknown' | 'not-in-generate-step' | 'no-canvas' | 'nothing-to-run' }[]; clips: number }

/** a new random seed (a different take of a clip) */
export const newSeed = () => 1 + Math.floor(Math.random() * 2147483646);

/**
 * What a batch run would generate. `nos` = the episodes (in this order). Without `clipIds` every APPROVED clip of an episode that is at the
 * generate step runs. With `clipIds` exactly those clips run (any status: that is how a clip is made again), in any episode that has a canvas.
 * Episodes that cannot run are listed in `skipped` with the reason; nothing is silently dropped.
 */
export function planBatch(p: DirectorProject, nos: number[], opt: { clipIds?: string[] } = {}): BatchPlan {
  const plan: BatchPlan = { batches: [], skipped: [], clips: 0 };
  const chosen = opt.clipIds ? new Set(opt.clipIds) : null;
  for (const no of [...new Set(nos)]) {
    const ep = p.episodes.find((x) => x.no === no);
    if (!ep) { plan.skipped.push({ no, reason: 'unknown' }); continue; }
    const shots = ordered(p).filter((s) => p.scenes.find((c) => c.scene_id === s.scene_id)?.episode_id === ep.episode_id);
    const picked = chosen ? shots.filter((s) => chosen.has(s.shot_id)) : shots.filter((s) => s.status === 'approved');
    if (chosen && !picked.length) continue;   // none of the chosen clips is in this episode: not an error
    if (!chosen && ep.stage !== 'execute') { plan.skipped.push({ no, reason: 'not-in-generate-step' }); continue; }
    if (!p.canvas_links.some((l) => l.episode_id === ep.episode_id && !l.aspect)) { plan.skipped.push({ no, reason: 'no-canvas' }); continue; }
    if (!picked.length) { plan.skipped.push({ no, reason: 'nothing-to-run' }); continue; }
    plan.batches.push({ no, shots: picked, requeue: picked.filter((s) => s.status !== 'approved').map((s) => s.shot_id) });
    plan.clips += picked.length;
  }
  return plan;
}

/** give these clips a new random seed (the clips that are listed only; every other clip keeps its seed) */
export function reseed(p: DirectorProject, shotIds: string[], make: () => number = newSeed): number {
  let n = 0;
  for (const s of p.shots) if (shotIds.includes(s.shot_id)) { s.seed = make(); n++; }
  return n;
}

/** put chosen clips back to "approved" so the run buttons accept them again; their old results stay in the history */
export function requeueClips(p: DirectorProject, shotIds: string[]): number {
  let n = 0;
  for (const s of p.shots) if (shotIds.includes(s.shot_id) && s.status !== 'approved') { s.status = 'approved'; n++; }
  return n;
}

/** give these cast entries a new random seed (a different take of their image); the entries that are not listed keep theirs */
export function reseedRefs(p: DirectorProject, refIds: string[], make: () => number = newSeed): number {
  let n = 0;
  for (const r of p.references) if (refIds.includes(r.ref_id)) { r.seed = make(); n++; }
  return n;
}

/** Pull the generated song(s) of the music canvas into the song's candidates (adds only; the newest becomes the picked one). Returns how many were added. */
export function applyMusicResult(p: DirectorProject, link: CanvasLink, nodes: Pick<GraphNode, 'id' | 'results'>[], now: () => string = () => new Date().toISOString()): number {
  const m = p.music; const node = nodes.find((n) => n.id === (link.music_nodes ?? []).at(-1));
  if (!m || !node) return 0;
  const have = new Set(m.candidates.map((c) => c.result_id)); let added = 0;
  for (const a of node.results) {
    if (a.type !== 'audio' || !a.file) continue;
    const id = `rs_${a.id}`; if (have.has(id)) continue;
    m.candidates.forEach((c) => { c.picked = false; });
    m.candidates.push({ result_id: id, file: a.file, kind: 'audio', node_id: node.id, created_at: now(), picked: true, source: 'generated' }); have.add(id); added++;
  }
  return added;
}

/** Pull the finished episode (clips joined, with the song on top for a music video) of the episode canvas into the episode. Returns how many were added (0 or 1). */
export function applyEpisodeFinal(p: DirectorProject, link: CanvasLink, nodes: Pick<GraphNode, 'id' | 'results'>[], now: () => string = () => new Date().toISOString()): number {
  const ep = p.episodes.find((e) => e.episode_id === link.episode_id); const node = nodes.find((n) => n.id === link.final_node_id);
  if (!ep || !node) return 0;
  const a = [...node.results].reverse().find((r) => r.type === 'video' && r.file);
  if (!a || !a.file) return 0;
  const id = `rs_${a.id}`; if (ep.final?.result_id === id) return 0;
  ep.final = { result_id: id, file: a.file, kind: 'video', node_id: node.id, created_at: now(), picked: true, source: 'generated' };
  return 1;
}
