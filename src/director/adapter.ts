// Director -> Canvas adapter (docs/DIRECTOR_MODE_DATA_CONTRACT.md section 5). Pure: no DOM, no store, no network.
// Builds an ordinary Project (version 1) so the result opens in Canvas mode and in older Canvers builds.
//   - one Prompt card + one generator card per shot, wired text -> prompt input
//   - node ids are fixed per shot (n_<shot_id>_text / n_<shot_id>_gen), so building again updates instead of duplicating
//   - a card the registry does not know is never swapped for another one: that shot is skipped and listed in report.missing
//   - positions, parameters and results a user changed in the canvas are kept
import type { Asset, GraphEdge, GraphNode, Primitive, Project } from '../types';
import type { CanvasLink, DirectorProject, DirectorShot } from './types';
import { castOf, newId, shotsOfEpisode } from './model';
import { composeClipPrompt } from './compose';

export interface RegDef {
  id: string;
  inputs: { id: string; type: string; optional?: boolean; multi?: boolean }[];
  outputs: { id: string; type: string }[];
  /** the engine a new card starts on (undefined = the card has none) */
  engineId?: string;
  /** every engine id the card offers */
  engines?: string[];
  /** parameter id -> allowed values (select) or range (slider/number); only parameters that exist */
  params: Record<string, { options?: string[]; min?: number; max?: number }>;
  defaults: Record<string, Primitive>;
}
export interface RegistryLike { get(defId: string): RegDef | undefined; compatible(a: string, b: string): boolean }

export type Generator = 'image-generate' | 'video-generate';
export interface AdapterOptions {
  generator?: Generator; canvasId?: string; now?: () => string;
  /** build only this episode's clips (one canvas per episode) */
  episodeId?: string;
  /** values for the shared `h3-turbo` card (7+1 / Kimchy / resolution); only used with video-generate */
  turbo?: Record<string, Primitive>;
  /** the picked image of each cast entry (key = ref_id). Clips that use cast get these connected as reference images, in the order of their prompt. */
  refAssets?: Record<string, Asset>;
}

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
  /** things that were not exactly as asked (the 7+1 card is not in the registry, ...) */
  warnings: string[];
  /** how many reference-image wires were made / kept */
  refsWired: number;
}

export interface AdapterResult { project: Project; link: CanvasLink; report: AdapterReport }

export const textNodeId = (shotId: string) => `n_${shotId}_text`;
export const genNodeId = (shotId: string) => `n_${shotId}_gen`;
export const edgeId = (shotId: string) => `e_${shotId}`;
export const turboNodeId = (episodeId: string) => `n_turbo_${episodeId}`;

const COL_GEN_X = 420, ROW_H = 480, SCENE_GAP = 80;

const textOut = (d: RegDef) => d.outputs.find((o) => o.type === 'text');
const textIn = (d: RegDef, reg: RegistryLike, from: string) => d.inputs.find((i) => !i.multi && !i.optional && reg.compatible(from, i.type))
  ?? d.inputs.find((i) => !i.multi && reg.compatible(from, i.type) && i.type === 'text');

function genParams(d: RegDef, p: DirectorProject, sh: DirectorShot, kind: Generator): Record<string, Primitive> {
  const out: Record<string, Primitive> = { ...d.defaults };
  const asp = d.params.aspect;
  if (asp?.options?.includes(p.series.aspect)) out.aspect = p.series.aspect;
  if (d.params.seed && sh.seed !== undefined && sh.seed >= 0) out.seed = sh.seed;
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
  const report: AdapterReport = { created: [], updated: [], keptUserText: [], recreated: [], missing: [], orphaned: [], assetsNotWired: [], emptyPrompt: [], warnings: [], refsWired: 0 };
  const promptDef = reg.get('prompt'), genDef = reg.get(kind);

  const nodes: GraphNode[] = existing ? JSON.parse(JSON.stringify(existing.nodes)) : [];
  const edges: GraphEdge[] = existing ? JSON.parse(JSON.stringify(existing.edges)) : [];
  const byNode = new Map(nodes.map((n) => [n.id, n]));
  const prevSent = prev?.prompt_sent ?? {};
  const sent: Record<string, string> = { ...prevSent };
  const prevSeed = prev?.seed_sent ?? {}; const seedSent: Record<string, number> = { ...prevSeed };
  const linkShots: CanvasLink['shots'] = [];

  const sceneOrder = new Map(p.scenes.map((s) => [s.scene_id, s.order]));
  const shots = opt.episodeId ? shotsOfEpisode(p, opt.episodeId) : [...p.shots].sort((a, b) => (sceneOrder.get(a.scene_id) ?? 0) - (sceneOrder.get(b.scene_id) ?? 0) || a.order - b.order);
  const turboDef = kind === 'video-generate' && opt.turbo ? reg.get('h3-turbo') : undefined;
  if (kind === 'video-generate' && opt.turbo && !turboDef) report.warnings.push('card "h3-turbo" is not in the registry: the clips are made without the 7+1 / Kimchy settings');
  const turboOut = turboDef?.outputs.find((o) => o.type === 'pipe');
  const turboIn = turboDef && genDef ? genDef.inputs.find((i) => i.multi && reg.compatible('pipe', i.type) && i.type === 'pipe') : undefined;
  if (turboDef && (!turboOut || !turboIn)) report.warnings.push('the 7+1 card cannot be connected to this generator: the clips are made without it');
  let turboId = '';
  // reference images: Load Image cards (shared by all clips of the episode) wired into the generator's image input, engine "multi-reference"
  const importDef = opt.refAssets ? reg.get('import') : undefined;
  const importOut = importDef?.outputs.find((o) => o.type === 'image');
  const refIn = genDef?.inputs.find((i) => i.multi && i.type === 'image');
  const refEngine = kind === 'video-generate' && genDef?.engines?.includes('h3-ref') ? 'h3-ref' : undefined;
  const refsOk = !!(importDef && importOut && refIn && refEngine);
  if (opt.refAssets && Object.keys(opt.refAssets).length && !refsOk) report.warnings.push('the cast images cannot be connected (no Load Image card, no image input or no multi-reference engine): the clips are made from the text only');
  let refRow = 0;

  const wired = promptDef && genDef ? { out: textOut(promptDef), inn: textIn(genDef, reg, 'text') } : null;
  let y = 0, lastScene = '';
  for (const sh of shots) {
    const sc = p.scenes.find((s) => s.scene_id === sh.scene_id);
    const label = `${sc?.order ?? '?'}.${sh.order}`;
    if (!promptDef) { report.missing.push({ shot_id: sh.shot_id, reason: 'card "prompt" is not in the registry' }); continue; }
    if (!genDef) { report.missing.push({ shot_id: sh.shot_id, reason: `card "${kind}" is not in the registry` }); continue; }
    if (!wired?.out || !wired.inn) { report.missing.push({ shot_id: sh.shot_id, reason: `no text port to connect "prompt" to "${kind}"` }); continue; }
    if (sh.scene_id !== lastScene) { if (lastScene) y += SCENE_GAP; lastScene = sh.scene_id; }
    const promptText = composeClipPrompt(sh);
    if (!sh.prompt_en.trim()) report.emptyPrompt.push(sh.shot_id);
    if (sh.asset_ids.length) report.assetsNotWired.push(sh.shot_id);

    const tid = textNodeId(sh.shot_id), gid = genNodeId(sh.shot_id);
    const castRefs = refsOk ? castOf(p, sh).filter((r) => opt.refAssets![r.ref_id]) : [];
    // --- prompt card
    let tn = byNode.get(tid);
    if (!tn) {
      tn = { id: tid, defId: 'prompt', x: 0, y, params: { ...promptDef.defaults, text: promptText }, results: [], activeResult: 0, title: `${label} prompt` };
      nodes.push(tn); byNode.set(tid, tn); (prevSent[sh.shot_id] !== undefined ? report.recreated : report.created).push(tid);
      sent[sh.shot_id] = promptText;
    } else if (String(tn.params.text ?? '') === promptText) {
      sent[sh.shot_id] = promptText;   // already the same
    } else if (prevSent[sh.shot_id] !== undefined && String(tn.params.text ?? '') === prevSent[sh.shot_id]) {
      // untouched since the last build: follow the Director text
      tn.params = { ...tn.params, text: promptText }; report.updated.push(tid);
      sent[sh.shot_id] = promptText;
    } else {
      report.keptUserText.push(tid);   // the user rewrote it in the canvas; theirs wins and the next build still sees it as theirs
    }
    // --- generator card
    let gn = byNode.get(gid);
    if (!gn) {
      gn = { id: gid, defId: kind, x: COL_GEN_X, y, params: genParams(genDef, p, sh, kind), engineId: castRefs.length ? refEngine : genDef.engineId, results: [], activeResult: 0, title: label };
      nodes.push(gn); byNode.set(gid, gn); (prev?.shots.some((s) => s.shot_id === sh.shot_id) ? report.recreated : report.created).push(gid);
    }
    // --- the seed: follows the clip's seed while the card still holds the seed the adapter gave it (a seed typed in the canvas is the producer's)
    if (genDef.params.seed) {
      const want = sh.seed !== undefined && sh.seed >= 0 ? sh.seed : -1;
      const was = prevSeed[sh.shot_id] ?? -1;
      if (Number(gn.params.seed ?? -1) === was && was !== want) { gn.params = { ...gn.params, seed: want }; if (!report.created.includes(gid)) report.updated.push(gid); seedSent[sh.shot_id] = want; }
      else if (seedSent[sh.shot_id] === undefined) seedSent[sh.shot_id] = Number(gn.params.seed ?? -1);
    }
    // --- wire (only when missing: a user may have rewired it)
    const eid = edgeId(sh.shot_id);
    if (!edges.some((e) => e.id === eid) && !edges.some((e) => e.source === tid && e.target === gid)) {
      edges.push({ id: eid, source: tid, sourceHandle: wired.out.id, target: gid, targetHandle: wired.inn.id });
    }
    // --- the cast images of this clip, in prompt order (@image1, @image2 ...)
    for (const r of castRefs) {
      const rid = `n_ref_${r.ref_id}`;
      let rn = byNode.get(rid);
      if (!rn) {
        rn = { id: rid, defId: 'import', x: -840, y: refRow * 300, params: {}, results: [opt.refAssets![r.ref_id]], activeResult: 0, title: r.name };
        nodes.push(rn); byNode.set(rid, rn); report.created.push(rid); refRow++;
      } else if (!rn.results.length) rn.results = [opt.refAssets![r.ref_id]];
      const reid = `e_ref_${r.ref_id}_${sh.shot_id}`;
      if (!edges.some((e) => e.id === reid)) edges.push({ id: reid, source: rid, sourceHandle: importOut!.id, target: gid, targetHandle: refIn!.id });
      report.refsWired++;
    }
    // --- the shared 7+1 / Kimchy card of the episode, wired to every clip (made once, the user's changes to it are kept)
    if (turboDef && turboOut && turboIn && opt.episodeId) {
      turboId = turboNodeId(opt.episodeId);
      if (!byNode.get(turboId)) {
        const tnode: GraphNode = { id: turboId, defId: 'h3-turbo', x: -420, y: 0, params: { ...turboDef.defaults, ...(opt.turbo as Record<string, Primitive>) }, results: [], activeResult: 0, title: 'Episode 7+1' };
        nodes.push(tnode); byNode.set(turboId, tnode); report.created.push(turboId);
      }
      const teid = `e_${turboId}_${sh.shot_id}`;
      if (!edges.some((e) => e.id === teid) && !edges.some((e) => e.source === turboId && e.target === gid)) edges.push({ id: teid, source: turboId, sourceHandle: turboOut.id, target: gid, targetHandle: turboIn.id });
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
  const link: CanvasLink = { canvas_id: prev?.canvas_id ?? opt.canvasId ?? newId('cv'), canvas_file: canvasFile, purpose: 'episode', shots: linkShots, created_at: prev?.created_at ?? now, prompt_sent: sent, seed_sent: seedSent, ...(opt.episodeId ? { episode_id: opt.episodeId } : {}) };
  return { project, link, report };
}


// ------------------------------------------------------------------ casting canvas
export interface CastingReport { created: string[]; updated: string[]; keptUserText: string[]; recreated: string[]; missing: { ref_id: string; reason: string }[] }
export const refTextNodeId = (refId: string) => `n_${refId}_text`;
export const refGenNodeId = (refId: string) => `n_${refId}_gen`;

/**
 * The canvas that makes the cast images: one Prompt card + one Image Generate card per cast entry (not the rejected ones).
 * Same rules as the episode canvas: fixed card ids, nothing duplicated, the user's moves / settings / own prompt text are kept.
 */
export function buildCastingCanvas(p: DirectorProject, reg: RegistryLike, existing: Project | null, prev: CanvasLink | null, canvasFile: string, opt: { now?: () => string } = {}): { project: Project; link: CanvasLink; report: CastingReport } {
  const now = (opt.now ?? (() => new Date().toISOString()))();
  const report: CastingReport = { created: [], updated: [], keptUserText: [], recreated: [], missing: [] };
  const promptDef = reg.get('prompt'), genDef = reg.get('image-generate');
  const nodes: GraphNode[] = existing ? JSON.parse(JSON.stringify(existing.nodes)) : [];
  const edges: GraphEdge[] = existing ? JSON.parse(JSON.stringify(existing.edges)) : [];
  const byNode = new Map(nodes.map((n) => [n.id, n]));
  const prevSent = prev?.prompt_sent ?? {}; const sent: Record<string, string> = { ...prevSent };
  const refs: NonNullable<CanvasLink['refs']> = [];
  const wired = promptDef && genDef ? { out: textOut(promptDef), inn: textIn(genDef, reg, 'text') } : null;
  let y = 0;
  for (const r of p.references.filter((x) => x.status !== 'rejected')) {
    if (!promptDef || !genDef || !wired?.out || !wired.inn) { report.missing.push({ ref_id: r.ref_id, reason: !promptDef ? 'card "prompt" is not in the registry' : !genDef ? 'card "image-generate" is not in the registry' : 'no text port to connect' }); continue; }
    const text = r.prompt_en.trim() || r.description.trim();
    const tid = refTextNodeId(r.ref_id), gid = refGenNodeId(r.ref_id);
    let tn = byNode.get(tid);
    if (!tn) {
      tn = { id: tid, defId: 'prompt', x: 0, y, params: { ...promptDef.defaults, text }, results: [], activeResult: 0, title: `${r.name} prompt` };
      nodes.push(tn); byNode.set(tid, tn); (prevSent[r.ref_id] !== undefined ? report.recreated : report.created).push(tid); sent[r.ref_id] = text;
    } else if (String(tn.params.text ?? '') === text) sent[r.ref_id] = text;
    else if (prevSent[r.ref_id] !== undefined && String(tn.params.text ?? '') === prevSent[r.ref_id]) { tn.params = { ...tn.params, text }; report.updated.push(tid); sent[r.ref_id] = text; }
    else report.keptUserText.push(tid);
    if (!byNode.get(gid)) {
      const params: Record<string, Primitive> = { ...genDef.defaults };
      const asp = genDef.params.aspect;   // a person is shown full-body (tall), a place wide, a prop square
      const want = r.kind === 'character' ? '3:4' : r.kind === 'location' ? p.series.aspect : '1:1';
      if (asp?.options?.includes(want)) params.aspect = want;
      const gn: GraphNode = { id: gid, defId: 'image-generate', x: COL_GEN_X, y, params, engineId: genDef.engineId, results: [], activeResult: 0, title: r.name };
      nodes.push(gn); byNode.set(gid, gn); (prev?.refs?.some((x) => x.ref_id === r.ref_id) ? report.recreated : report.created).push(gid);
    }
    const eid = `e_${r.ref_id}`;
    if (!edges.some((e) => e.id === eid) && !edges.some((e) => e.source === tid && e.target === gid)) edges.push({ id: eid, source: tid, sourceHandle: wired.out.id, target: gid, targetHandle: wired.inn.id });
    refs.push({ ref_id: r.ref_id, node_ids: [tid, gid] });
    y += 420;
  }
  const project: Project = { app: 'ai-one-studio-canvers', version: 1, id: existing?.id ?? p.project_id, name: existing?.name ?? `${p.name} casting`, nodes, edges, updatedAt: now };
  const link: CanvasLink = { canvas_id: prev?.canvas_id ?? newId('cv'), canvas_file: canvasFile, shots: [], purpose: 'casting', refs, created_at: prev?.created_at ?? now, prompt_sent: sent };
  return { project, link, report };
}
