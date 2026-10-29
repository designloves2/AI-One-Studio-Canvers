// Director -> Canvas adapter (docs/DIRECTOR_MODE_DATA_CONTRACT.md section 5). Pure: no DOM, no store, no network.
// Builds an ordinary Project (version 1) so the result opens in Canvas mode and in older Canvers builds.
//   - one Prompt card + one generator card per shot, wired text -> prompt input
//   - node ids are fixed per shot (n_<shot_id>_text / n_<shot_id>_gen), so building again updates instead of duplicating
//   - a card the registry does not know is never swapped for another one: that shot is skipped and listed in report.missing
//   - positions, parameters and results a user changed in the canvas are kept
import type { GraphEdge, GraphNode, Primitive, Project } from '../types';
import type { CanvasLink, DirectorProject, DirectorShot } from './types';
import { newId } from './model';

export interface RegDef {
  id: string;
  inputs: { id: string; type: string; optional?: boolean; multi?: boolean }[];
  outputs: { id: string; type: string }[];
  /** the engine a new card starts on (undefined = the card has none) */
  engineId?: string;
  /** parameter id -> allowed values (select) or range (slider/number); only parameters that exist */
  params: Record<string, { options?: string[]; min?: number; max?: number }>;
  defaults: Record<string, Primitive>;
}
export interface RegistryLike { get(defId: string): RegDef | undefined; compatible(a: string, b: string): boolean }

export type Generator = 'image-generate' | 'video-generate';
export interface AdapterOptions { generator?: Generator; canvasId?: string; now?: () => string }

export interface AdapterReport {
  created: string[]; updated: string[];
  /** prompt card the user edited in the canvas: left as it is */
  keptUserText: string[];
  /** a card of an earlier build the user deleted in the canvas: made again */
  recreated: string[];
  /** shots not built because the registry lacks the card / a usable port */
  missing: { shot_id: string; reason: string }[];
  /** shots no longer in the Director project whose cards are still in the canvas (never deleted) */
  orphaned: string[];
  /** shots that use assets, which are not wired into cards yet */
  assetsNotWired: string[];
  /** shots with an empty English prompt (a card is still made) */
  emptyPrompt: string[];
}

export interface AdapterResult { project: Project; link: CanvasLink; report: AdapterReport }

export const textNodeId = (shotId: string) => `n_${shotId}_text`;
export const genNodeId = (shotId: string) => `n_${shotId}_gen`;
export const edgeId = (shotId: string) => `e_${shotId}`;

const COL_GEN_X = 420, ROW_H = 480, SCENE_GAP = 80;

const textOut = (d: RegDef) => d.outputs.find((o) => o.type === 'text');
const textIn = (d: RegDef, reg: RegistryLike, from: string) => d.inputs.find((i) => !i.multi && !i.optional && reg.compatible(from, i.type))
  ?? d.inputs.find((i) => !i.multi && reg.compatible(from, i.type) && i.type === 'text');

function genParams(d: RegDef, p: DirectorProject, sh: DirectorShot, kind: Generator): Record<string, Primitive> {
  const out: Record<string, Primitive> = { ...d.defaults };
  const asp = d.params.aspect;
  if (asp?.options?.includes(p.brief.aspect)) out.aspect = p.brief.aspect;
  const sec = d.params.seconds;
  if (kind === 'video-generate' && sec) {
    const lo = sec.min ?? 1, hi = sec.max ?? 60;
    out.seconds = Math.min(hi, Math.max(lo, Math.round(sh.duration_sec)));
  }
  return out;
}

/**
 * @param existing the canvas built from this project before (or null). Its nodes are updated in place, never rebuilt.
 * @param prev the link saved in the Director project for that canvas (carries the prompt each card was last given)
 */
export function buildCanvasFromDirector(p: DirectorProject, reg: RegistryLike, existing: Project | null, prev: CanvasLink | null, canvasFile: string, opt: AdapterOptions = {}): AdapterResult {
  const kind: Generator = opt.generator ?? 'image-generate';
  const now = (opt.now ?? (() => new Date().toISOString()))();
  const report: AdapterReport = { created: [], updated: [], keptUserText: [], recreated: [], missing: [], orphaned: [], assetsNotWired: [], emptyPrompt: [] };
  const promptDef = reg.get('prompt'), genDef = reg.get(kind);

  const nodes: GraphNode[] = existing ? JSON.parse(JSON.stringify(existing.nodes)) : [];
  const edges: GraphEdge[] = existing ? JSON.parse(JSON.stringify(existing.edges)) : [];
  const byNode = new Map(nodes.map((n) => [n.id, n]));
  const prevSent = prev?.prompt_sent ?? {};
  const sent: Record<string, string> = { ...prevSent };
  const linkShots: CanvasLink['shots'] = [];

  const sceneOrder = new Map(p.scenes.map((s) => [s.scene_id, s.order]));
  const shots = [...p.shots].sort((a, b) => (sceneOrder.get(a.scene_id) ?? 0) - (sceneOrder.get(b.scene_id) ?? 0) || a.order - b.order);

  const wired = promptDef && genDef ? { out: textOut(promptDef), inn: textIn(genDef, reg, 'text') } : null;
  let y = 0, lastScene = '';
  for (const sh of shots) {
    const sc = p.scenes.find((s) => s.scene_id === sh.scene_id);
    const label = `${sc?.order ?? '?'}.${sh.order}`;
    if (!promptDef) { report.missing.push({ shot_id: sh.shot_id, reason: 'card "prompt" is not in the registry' }); continue; }
    if (!genDef) { report.missing.push({ shot_id: sh.shot_id, reason: `card "${kind}" is not in the registry` }); continue; }
    if (!wired?.out || !wired.inn) { report.missing.push({ shot_id: sh.shot_id, reason: `no text port to connect "prompt" to "${kind}"` }); continue; }
    if (sh.scene_id !== lastScene) { if (lastScene) y += SCENE_GAP; lastScene = sh.scene_id; }
    if (!sh.prompt_en.trim()) report.emptyPrompt.push(sh.shot_id);
    if (sh.asset_ids.length) report.assetsNotWired.push(sh.shot_id);

    const tid = textNodeId(sh.shot_id), gid = genNodeId(sh.shot_id);
    // --- prompt card
    let tn = byNode.get(tid);
    if (!tn) {
      tn = { id: tid, defId: 'prompt', x: 0, y, params: { ...promptDef.defaults, text: sh.prompt_en }, results: [], activeResult: 0, title: `${label} prompt` };
      nodes.push(tn); byNode.set(tid, tn); (prevSent[sh.shot_id] !== undefined ? report.recreated : report.created).push(tid);
      sent[sh.shot_id] = sh.prompt_en;
    } else if (String(tn.params.text ?? '') === sh.prompt_en) {
      sent[sh.shot_id] = sh.prompt_en;   // already the same
    } else if (prevSent[sh.shot_id] !== undefined && String(tn.params.text ?? '') === prevSent[sh.shot_id]) {
      // untouched since the last build: follow the Director text
      tn.params = { ...tn.params, text: sh.prompt_en }; report.updated.push(tid);
      sent[sh.shot_id] = sh.prompt_en;
    } else {
      report.keptUserText.push(tid);   // the user rewrote it in the canvas; theirs wins and the next build still sees it as theirs
    }
    // --- generator card
    let gn = byNode.get(gid);
    if (!gn) {
      gn = { id: gid, defId: kind, x: COL_GEN_X, y, params: genParams(genDef, p, sh, kind), engineId: genDef.engineId, results: [], activeResult: 0, title: label };
      nodes.push(gn); byNode.set(gid, gn); (prev?.shots.some((s) => s.shot_id === sh.shot_id) ? report.recreated : report.created).push(gid);
    }
    // --- wire (only when missing: a user may have rewired it)
    const eid = edgeId(sh.shot_id);
    if (!edges.some((e) => e.id === eid) && !edges.some((e) => e.source === tid && e.target === gid)) {
      edges.push({ id: eid, source: tid, sourceHandle: wired.out.id, target: gid, targetHandle: wired.inn.id });
    }
    linkShots.push({ shot_id: sh.shot_id, node_ids: [tid, gid] });
    y += ROW_H;
  }

  const inDirector = new Set(p.shots.map((s) => s.shot_id));
  for (const l of prev?.shots ?? []) if (!inDirector.has(l.shot_id) && l.node_ids.some((id) => byNode.has(id))) report.orphaned.push(l.shot_id);
  // a shot that could not be built keeps its older link entry so it is not forgotten
  for (const l of prev?.shots ?? []) if (!linkShots.some((s) => s.shot_id === l.shot_id) && !report.orphaned.includes(l.shot_id)) linkShots.push(l);
  for (const k of Object.keys(sent)) if (!inDirector.has(k) && !report.orphaned.includes(k)) delete sent[k];

  const project: Project = {
    app: 'ai-one-studio-canvers', version: 1, id: existing?.id ?? p.project_id, name: existing?.name ?? p.name,
    nodes, edges, updatedAt: now,
  };
  const link: CanvasLink = { canvas_id: prev?.canvas_id ?? opt.canvasId ?? newId('cv'), canvas_file: canvasFile, shots: linkShots, created_at: prev?.created_at ?? now, prompt_sent: sent };
  return { project, link, report };
}
