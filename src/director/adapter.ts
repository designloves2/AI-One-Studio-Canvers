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
  /** the parameters and defaults of each engine (they differ per engine: Krea 2, Qwen Image, Z-Image ...) */
  perEngine?: Record<string, { params: Record<string, { options?: string[]; min?: number; max?: number }>; defaults: Record<string, Primitive> }>;
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
  /** the finished episode: join the clips in order (`stitch`) and lay the song on top (`audio`, a music video) */
  finish?: { stitch?: boolean; audio?: Asset };
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
export const stitchNodeId = (episodeId: string) => `n_stitch_${episodeId}`;
export const songNodeId = (episodeId: string) => `n_song_${episodeId}`;
export const finalNodeId = (episodeId: string) => `n_final_${episodeId}`;

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

  // --- the finished episode: the clips joined in order, and the song laid on top (a music video)
  let finalId: string | undefined;
  if (opt.finish?.stitch && linkShots.length && opt.episodeId) {
    const stDef = reg.get('video-stitch'); const stIn = stDef?.inputs.find((i) => i.multi && i.type === 'video'); const stOut = stDef?.outputs.find((o) => o.type === 'video'); const genOut = genDef?.outputs.find((o) => o.type === 'video');
    if (!stDef || !stIn || !stOut || !genOut) report.warnings.push('the clips cannot be joined into one video here (no Video Stitch card): only the single clips are made');
    else {
      const sid = stitchNodeId(opt.episodeId);
      if (!byNode.get(sid)) { const sn: GraphNode = { id: sid, defId: 'video-stitch', x: COL_GEN_X + 460, y: Math.max(0, Math.round((y - ROW_H) / 2)), params: { ...stDef.defaults }, results: [], activeResult: 0, title: 'Episode (clips joined)' }; nodes.push(sn); byNode.set(sid, sn); report.created.push(sid); }
      for (const l of linkShots) {   // in clip order: that is the order of the joined video
        const eid = `e_st_${l.shot_id}`;
        if (!edges.some((e) => e.id === eid) && !edges.some((e) => e.source === l.node_ids[1] && e.target === sid)) edges.push({ id: eid, source: l.node_ids[1], sourceHandle: genOut.id, target: sid, targetHandle: stIn.id });
      }
      finalId = sid;
      if (opt.finish.audio) {
        const vaDef = reg.get('video-audio'), auDef = reg.get('import-audio');
        const vaV = vaDef?.inputs.find((i) => i.type === 'video'), vaA = vaDef?.inputs.find((i) => i.type === 'audio'), vaOut = vaDef?.outputs.find((o) => o.type === 'video'), auOut = auDef?.outputs.find((o) => o.type === 'audio');
        if (!vaDef || !auDef || !vaV || !vaA || !vaOut || !auOut) report.warnings.push('the song cannot be laid on the video here (no Add Audio card): the joined clips have no song');
        else {
          const aid = songNodeId(opt.episodeId), vid = finalNodeId(opt.episodeId);
          if (!byNode.get(aid)) { const an: GraphNode = { id: aid, defId: 'import-audio', x: COL_GEN_X + 460, y: Math.max(0, Math.round((y - ROW_H) / 2)) + 360, params: {}, results: [opt.finish.audio], activeResult: 0, title: 'Song' }; nodes.push(an); byNode.set(aid, an); report.created.push(aid); }
          else if (!byNode.get(aid)!.results.length) byNode.get(aid)!.results = [opt.finish.audio];
          if (!byNode.get(vid)) { const vn: GraphNode = { id: vid, defId: 'video-audio', x: COL_GEN_X + 920, y: Math.max(0, Math.round((y - ROW_H) / 2)), params: { ...vaDef.defaults }, results: [], activeResult: 0, title: 'Episode + song' }; nodes.push(vn); byNode.set(vid, vn); report.created.push(vid); }
          if (!edges.some((e) => e.source === sid && e.target === vid)) edges.push({ id: `e_va_${vid}`, source: sid, sourceHandle: stOut.id, target: vid, targetHandle: vaV.id });
          if (!edges.some((e) => e.source === aid && e.target === vid)) edges.push({ id: `e_au_${vid}`, source: aid, sourceHandle: auOut.id, target: vid, targetHandle: vaA.id });
          finalId = vid;
        }
      }
    }
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
  const link: CanvasLink = { canvas_id: prev?.canvas_id ?? opt.canvasId ?? newId('cv'), canvas_file: canvasFile, purpose: 'episode', shots: linkShots, created_at: prev?.created_at ?? now, prompt_sent: sent, seed_sent: seedSent, ...(finalId ? { final_node_id: finalId } : {}), ...(opt.episodeId ? { episode_id: opt.episodeId } : {}) };
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
export function buildCastingCanvas(p: DirectorProject, reg: RegistryLike, existing: Project | null, prev: CanvasLink | null, canvasFile: string, opt: { now?: () => string; engineId?: string; baseAssets?: Record<string, Asset> } = {}): { project: Project; link: CanvasLink; report: CastingReport } {
  const now = (opt.now ?? (() => new Date().toISOString()))();
  const report: CastingReport = { created: [], updated: [], keptUserText: [], recreated: [], missing: [] };
  const promptDef = reg.get('prompt'), genDef = reg.get('image-generate');
  const nodes: GraphNode[] = existing ? JSON.parse(JSON.stringify(existing.nodes)) : [];
  const edges: GraphEdge[] = existing ? JSON.parse(JSON.stringify(existing.edges)) : [];
  const byNode = new Map(nodes.map((n) => [n.id, n]));
  const prevSent = prev?.prompt_sent ?? {}; const sent: Record<string, string> = { ...prevSent };
  const refs: NonNullable<CanvasLink['refs']> = [];
  // the image model: the one asked for, else the producer's choice for this project, else the card's default; unknown ids fall back to the default
  const wantEngine = opt.engineId ?? p.settings.cast_engine;
  const engine = wantEngine && genDef?.engines?.includes(wantEngine) ? wantEngine : genDef?.engineId;
  const pe = (engine && genDef?.perEngine?.[engine]) || (genDef ? { params: genDef.params, defaults: genDef.defaults } : { params: {}, defaults: {} });
  const engineSent: Record<string, string> = { ...(prev?.engine_sent ?? {}) };
  const prevSeed = prev?.seed_sent ?? {}; const seedSent: Record<string, number> = { ...prevSeed };
  const castParams = (r: DirectorProject['references'][number]): Record<string, Primitive> => {
    const params: Record<string, Primitive> = { ...pe.defaults };
    const want = r.kind === 'character' ? '3:4' : r.kind === 'location' ? p.series.aspect : '1:1';   // a person is shown full-body (tall), a place wide, a prop square
    if (pe.params.aspect?.options?.includes(want)) params.aspect = want;
    if (pe.params.seed && r.seed !== undefined && r.seed >= 0) params.seed = r.seed;
    return params;
  };
  const wired = promptDef && genDef ? { out: textOut(promptDef), inn: textIn(genDef, reg, 'text') } : null;
  const editDef = reg.get('image-edit'), importDef = reg.get('import');
  const editIn = editDef?.inputs.find((i) => i.id === 'image' && reg.compatible('image', i.type)), editText = editDef ? textIn(editDef, reg, 'text') : undefined, impOut = importDef?.outputs.find((o) => o.type === 'image');
  let y = 0;
  for (const r of p.references.filter((x) => x.status !== 'rejected')) {
    // a new look of a cast entry whose base image exists is made by EDITING that image (the same face), not by a new text-only generation
    const base = r.variant_of ? p.references.find((x) => x.name === r.variant_of) : undefined;
    const baseAsset = base ? opt.baseAssets?.[base.ref_id] : undefined;
    if (baseAsset && editDef && editIn && editText && impOut && promptDef) {
      const what = r.description.includes(' — ') ? r.description.slice(r.description.lastIndexOf(' — ') + 3) : r.description;
      const text = `Keep exactly the same person (face, body, identity). Change only: ${what}`;
      const tid = refTextNodeId(r.ref_id), gid = refGenNodeId(r.ref_id), bid = `n_${r.ref_id}_base`;
      const old = byNode.get(gid);
      if (old && old.defId !== 'image-edit') { nodes.splice(nodes.indexOf(old), 1); byNode.delete(gid); for (let i = edges.length - 1; i >= 0; i--) if (edges[i].target === gid) edges.splice(i, 1); report.recreated.push(gid); }
      let tn = byNode.get(tid);
      if (!tn) { tn = { id: tid, defId: 'prompt', x: 0, y, params: { ...promptDef.defaults, text }, results: [], activeResult: 0, title: `${r.name} prompt` }; nodes.push(tn); byNode.set(tid, tn); report.created.push(tid); sent[r.ref_id] = text; }
      else if (String(tn.params.text ?? '') === text) sent[r.ref_id] = text;
      else if (prevSent[r.ref_id] !== undefined && String(tn.params.text ?? '') === prevSent[r.ref_id]) { tn.params = { ...tn.params, text }; report.updated.push(tid); sent[r.ref_id] = text; }
      else report.keptUserText.push(tid);
      let bn = byNode.get(bid);
      if (!bn) { bn = { id: bid, defId: 'import', x: 0, y: y + 200, params: {}, results: [baseAsset], activeResult: 0, title: `${base!.name} (base image)` }; nodes.push(bn); byNode.set(bid, bn); report.created.push(bid); } else bn.results = [baseAsset];
      let gn = byNode.get(gid);
      if (!gn) { gn = { id: gid, defId: 'image-edit', x: COL_GEN_X, y, params: { ...editDef.defaults }, engineId: editDef.engineId, results: [], activeResult: 0, title: r.name }; nodes.push(gn); byNode.set(gid, gn); report.created.push(gid); }
      const et = `e_${r.ref_id}`, ei = `e_${r.ref_id}_img`;
      if (!edges.some((e) => e.id === et) && !edges.some((e) => e.source === tid && e.target === gid)) edges.push({ id: et, source: tid, sourceHandle: textOut(promptDef)!.id, target: gid, targetHandle: editText.id });
      if (!edges.some((e) => e.id === ei) && !edges.some((e) => e.source === bid && e.target === gid)) edges.push({ id: ei, source: bid, sourceHandle: impOut.id, target: gid, targetHandle: editIn.id });
      refs.push({ ref_id: r.ref_id, node_ids: [tid, gid] });
      y += 420; continue;
    }
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
    let gn = byNode.get(gid);
    if (!gn) {
      gn = { id: gid, defId: 'image-generate', x: COL_GEN_X, y, params: castParams(r), engineId: engine, results: [], activeResult: 0, title: r.name };
      nodes.push(gn); byNode.set(gid, gn); (prev?.refs?.some((x) => x.ref_id === r.ref_id) ? report.recreated : report.created).push(gid);
      engineSent[r.ref_id] = engine ?? ''; if (pe.params.seed) seedSent[r.ref_id] = Number(gn.params.seed ?? -1);
    } else {
      // another model was chosen: the card follows while it still holds the model the adapter gave it (a model picked in the canvas is the producer's)
      const was = engineSent[r.ref_id] ?? genDef.engineId;
      if (engine && gn.engineId === was && was !== engine) {
        const keepSeed = gn.params.seed; gn.engineId = engine; gn.params = { ...castParams(r), ...(keepSeed !== undefined ? { seed: keepSeed } : {}) }; engineSent[r.ref_id] = engine; report.updated.push(gid);
      } else if (engineSent[r.ref_id] === undefined) engineSent[r.ref_id] = gn.engineId ?? '';
      // the seed of this cast entry (a new take): same rule as the clips
      if (pe.params.seed) {
        const wantSeed = r.seed !== undefined && r.seed >= 0 ? r.seed : -1; const wasSeed = prevSeed[r.ref_id] ?? -1;
        if (Number(gn.params.seed ?? -1) === wasSeed && wasSeed !== wantSeed) { gn.params = { ...gn.params, seed: wantSeed }; if (!report.updated.includes(gid)) report.updated.push(gid); seedSent[r.ref_id] = wantSeed; }
        else if (seedSent[r.ref_id] === undefined) seedSent[r.ref_id] = Number(gn.params.seed ?? -1);
      }
    }
    const eid = `e_${r.ref_id}`;
    if (!edges.some((e) => e.id === eid) && !edges.some((e) => e.source === tid && e.target === gid)) edges.push({ id: eid, source: tid, sourceHandle: wired.out.id, target: gid, targetHandle: wired.inn.id });
    refs.push({ ref_id: r.ref_id, node_ids: [tid, gid] });
    y += 420;
  }
  const project: Project = { app: 'ai-one-studio-canvers', version: 1, id: existing?.id ?? p.project_id, name: existing?.name ?? `${p.name} casting`, nodes, edges, updatedAt: now };
  const link: CanvasLink = { canvas_id: prev?.canvas_id ?? newId('cv'), canvas_file: canvasFile, shots: [], purpose: 'casting', refs, created_at: prev?.created_at ?? now, prompt_sent: sent, engine_sent: engineSent, seed_sent: seedSent };
  return { project, link, report };
}


// ------------------------------------------------------------------ music canvas (the song of a music video, made by the AI)
export interface MusicReport { created: string[]; updated: string[]; keptUserText: string[]; missing: string[] }
export const MUSIC_STYLE_ID = 'n_music_style', MUSIC_LYRICS_ID = 'n_music_lyrics', MUSIC_GEN_ID = 'n_music_gen';

/**
 * One Prompt card (style) + one Prompt card (lyrics) + the Music Generate card with the chosen engine, the song length, BPM and language.
 * Same rules as the other canvases: fixed ids, nothing duplicated, a text / engine / number the producer changed in the canvas is kept.
 */
export function buildMusicCanvas(p: DirectorProject, reg: RegistryLike, existing: Project | null, prev: CanvasLink | null, canvasFile: string, opt: { now?: () => string; engineId?: string } = {}): { project: Project; link: CanvasLink; report: MusicReport } {
  const now = (opt.now ?? (() => new Date().toISOString()))();
  const report: MusicReport = { created: [], updated: [], keptUserText: [], missing: [] };
  const m = p.music; const promptDef = reg.get('prompt'), genDef = reg.get('music-generate');
  const nodes: GraphNode[] = existing ? JSON.parse(JSON.stringify(existing.nodes)) : [];
  const edges: GraphEdge[] = existing ? JSON.parse(JSON.stringify(existing.edges)) : [];
  const project: Project = { app: 'ai-one-studio-canvers', version: 1, id: existing?.id ?? p.project_id, name: existing?.name ?? `${p.name} song`, nodes, edges, updatedAt: now };
  const link: CanvasLink = { canvas_id: prev?.canvas_id ?? newId('cv'), canvas_file: canvasFile, shots: [], purpose: 'music', created_at: prev?.created_at ?? now, music_nodes: [MUSIC_STYLE_ID, MUSIC_LYRICS_ID, MUSIC_GEN_ID], prompt_sent: { ...(prev?.prompt_sent ?? {}) }, engine_sent: { ...(prev?.engine_sent ?? {}) }, seed_sent: { ...(prev?.seed_sent ?? {}) } };
  if (!m) { report.missing.push('there is no song yet'); return { project, link, report }; }
  if (!promptDef || !genDef) { report.missing.push(!promptDef ? 'card "prompt" is not in the registry' : 'card "music-generate" is not in the registry'); return { project, link, report }; }
  const styleIn = genDef.inputs.find((i) => i.id === 'prompt' && reg.compatible('text', i.type)), lyricsIn = genDef.inputs.find((i) => i.id === 'lyrics' && reg.compatible('text', i.type)), out = promptDef.outputs.find((o) => o.type === 'text');
  if (!styleIn || !out) { report.missing.push('no text port to connect the style to the generator'); return { project, link, report }; }
  const byNode = new Map(nodes.map((n) => [n.id, n]));
  const want = opt.engineId ?? m.engine;
  const engine = want && genDef.engines?.includes(want) ? want : genDef.engineId;
  const pe = (engine && genDef.perEngine?.[engine]) || { params: genDef.params, defaults: genDef.defaults };
  const sec = pe.params.seconds; const seconds = Math.min(sec?.max ?? 300, Math.max(sec?.min ?? 5, m.duration_sec || 60));
  const params = (): Record<string, Primitive> => {
    const x: Record<string, Primitive> = { ...pe.defaults };
    if (pe.params.seconds) x.seconds = seconds;
    if (pe.params.bpm && m.bpm >= 40) x.bpm = m.bpm;
    if (pe.params.language?.options?.includes(m.language)) x.language = m.language;
    if (pe.params.seed && m.seed !== undefined && m.seed >= 0) x.seed = m.seed;
    return x;
  };
  const text = (id: string, key: string, title: string, value: string, y: number) => {
    let n = byNode.get(id);
    if (!n) { n = { id, defId: 'prompt', x: 0, y, params: { ...promptDef.defaults, text: value }, results: [], activeResult: 0, title }; nodes.push(n); byNode.set(id, n); report.created.push(id); link.prompt_sent![key] = value; return n; }
    const cur = String(n.params.text ?? ''), was = prev?.prompt_sent?.[key];
    if (cur === value) link.prompt_sent![key] = value;
    else if (was !== undefined && cur === was) { n.params = { ...n.params, text: value }; report.updated.push(id); link.prompt_sent![key] = value; }
    else report.keptUserText.push(id);
    return n;
  };
  text(MUSIC_STYLE_ID, 'style', 'Song style', m.style, 0);
  if (lyricsIn) text(MUSIC_LYRICS_ID, 'lyrics', 'Lyrics', m.lyrics, 420);
  let gn = byNode.get(MUSIC_GEN_ID);
  if (!gn) { gn = { id: MUSIC_GEN_ID, defId: 'music-generate', x: COL_GEN_X, y: 0, params: params(), engineId: engine, results: [], activeResult: 0, title: 'Song' }; nodes.push(gn); byNode.set(MUSIC_GEN_ID, gn); report.created.push(MUSIC_GEN_ID); link.engine_sent![MUSIC_GEN_ID] = engine ?? ''; link.seed_sent!.seconds = Number(gn.params.seconds ?? 0); link.seed_sent!.bpm = Number(gn.params.bpm ?? 0); link.seed_sent!.seed = Number(gn.params.seed ?? -1); }
  else {
    const was = prev?.engine_sent?.[MUSIC_GEN_ID] ?? genDef.engineId;
    if (engine && gn.engineId === was && was !== engine) { gn.engineId = engine; gn.params = params(); link.engine_sent![MUSIC_GEN_ID] = engine; report.updated.push(MUSIC_GEN_ID); }
    else {   // numbers follow the song while the card still holds what the adapter gave it
      const next = params();
      for (const k of ['seconds', 'bpm', 'seed'] as const) {
        if (next[k] === undefined) continue;
        const sentV = prev?.seed_sent?.[k] ?? (k === 'seed' ? -1 : undefined);
        if (sentV !== undefined && Number(gn.params[k] ?? (k === 'seed' ? -1 : 0)) === sentV && sentV !== next[k]) { gn.params = { ...gn.params, [k]: next[k] }; link.seed_sent![k] = Number(next[k]); if (!report.updated.includes(MUSIC_GEN_ID)) report.updated.push(MUSIC_GEN_ID); }
      }
    }
    if (link.engine_sent![MUSIC_GEN_ID] === undefined) link.engine_sent![MUSIC_GEN_ID] = gn.engineId ?? '';
  }
  const wire = (from: string, to: string, handle: string, id: string) => { if (!edges.some((e) => e.id === id) && !edges.some((e) => e.source === from && e.target === to && e.targetHandle === handle)) edges.push({ id, source: from, sourceHandle: out.id, target: to, targetHandle: handle }); };
  wire(MUSIC_STYLE_ID, MUSIC_GEN_ID, styleIn.id, 'e_music_style');
  if (lyricsIn) wire(MUSIC_LYRICS_ID, MUSIC_GEN_ID, lyricsIn.id, 'e_music_lyrics');
  return { project, link, report };
}
