// Graph executor: walks the nodes upstream of a target and runs each one.
// Generators/LLMs run on the backend (ComfyUI + STUDIO_ONE); edit nodes run in the browser.
import type { Asset, GraphEdge, GraphNode, NodeDef, Primitive } from '../types';
import { byId, engineFor } from '../registry';
import { assetFromFile, clearPlan, ensureInput, fetchBlob, recoverPrompt, runPrompt, takeResume, uid, uploadToInput, writePlan } from '../backend/comfy';
import { buildImageGraph, type ImageJob, type ImageMode, type MossBox } from '../backend/imageGen';
import { FAMILIES, pickModels, type Family } from '../backend/studio';
import { runLlm } from '../backend/llm';
import { loadOptions } from '../backend/options';
import { getJson } from '../backend/http';
import { buildMusicGraph } from '../backend/music';
import { buildLtxGraph, ltxSize } from '../backend/ltx';
import type { PreviewCfg } from '../backend/preview';
import { buildH3Graph, h3Size, h3Frames, pickChainFrame, copyToInput, clipLastFrame, stitchClips, ONE_TAKE_OVERLAP_FRAMES, ONE_TAKE_OVERLAP_SEC } from '../backend/h3';
import { parseWorkflow, setField, VIDEO_EXT } from '../backend/workflow';
import { useSettings } from '../store/settings';
import { textAsset, num, str, need } from './util';
import { EXTRA_RUNNERS, cardLoras, h3Cards, h3Opt } from './more';
import { downstreamImages, enhanceWithImages } from '../backend/refEnhance';
import { styleOf, formatFor, NO_AESTHETIC } from '../backend/promptStyle';
import { autoPromptH3, autoPromptLtx } from '../backend/autoPrompt';
import { deleteAsset, listAssets, registerAsset } from '../backend/assetlib';

const TEMP_MARK = 'canvers-temp';   // subcategory of the temporary library assets made for mixed image + asset references
import { applyOp, blendOp, canvasToAsset, channelOp, invertMask, loadBitmap, maskGrow, palette, videoFrame } from '../editing/ops';

export interface GraphLike { nodes: GraphNode[]; edges: GraphEdge[] }

export interface Hooks {
  start?(id: string): void;
  progress?(id: string, pct: number, label?: string): void;
  preview?(id: string, dataUrl: string): void;
  done?(id: string, assets: Asset[], mode: 'append' | 'replace'): void;
  error?(id: string, message: string): void;
}

export interface Ctx {
  node: GraphNode;
  def: NodeDef;
  p: Record<string, Primitive>;
  engineId?: string;
  inputs(handle: string): Asset[];
  text(handle: string): string;
  progress(pct: number, label?: string): void;
  preview(dataUrl: string): void;
  signal?: AbortSignal;
}


const portOf = (def: NodeDef, a: Asset) => a.port ?? def.outputs[0]?.id;

function nodeAssets(node: GraphNode, handle: string, local: Map<string, Asset[]>): Asset | undefined {
  const def = byId.get(node.defId);
  if (!def) return undefined;
  const all = local.get(node.id) ?? node.results;
  const mine = all.filter((a) => portOf(def, a) === handle || def.outputs.length === 1);
  if (!mine.length) return undefined;
  return mine[Math.min(node.activeResult, mine.length - 1)] ?? mine[0];
}

function upstream(g: GraphLike, targetId: string): GraphNode[] {
  const nodes = new Map(g.nodes.map((n) => [n.id, n]));
  const order: GraphNode[] = []; const seen = new Set<string>();
  const visit = (id: string, stack: Set<string>) => {
    if (seen.has(id)) return;
    if (stack.has(id)) throw new Error('The graph has a loop');
    stack.add(id);
    for (const e of g.edges) if (e.target === id) visit(e.source, stack);
    stack.delete(id); seen.add(id);
    const n = nodes.get(id); if (n) order.push(n);
  };
  visit(targetId, new Set());
  return order;
}

// edit-node results are cached by input identity + params so re-running a chain is instant
const editCache = new Map<string, { key: string; assets: Asset[] }>();

export async function executeGraph(g: GraphLike, targetId: string, hooks: Hooks, signal?: AbortSignal): Promise<void> {
  const local = new Map<string, Asset[]>();
  let failing = targetId;
  try {
    for (const node of upstream(g, targetId)) {
      if (signal?.aborted) throw new Error('cancelled');
      const def = byId.get(node.defId);
      if (!def) throw new Error(`Unknown node type ${node.defId}`);
      failing = node.id;
      const isTarget = node.id === targetId;
      const heavy = def.kind === 'generate' || def.kind === 'llm';

      if (heavy && !isTarget && node.results.length) { local.set(node.id, node.results); continue; }
      if (def.id === 'import' || def.id === 'import-audio' || def.id === 'import-video') { local.set(node.id, node.results); continue; }

      const inputs = (handle: string): Asset[] => {
        const out: Asset[] = [];
        for (const e of g.edges) {
          if (e.target !== node.id || e.targetHandle !== handle) continue;
          const src = g.nodes.find((n) => n.id === e.source); if (!src) continue;
          // a Video Stitch takes the clips picked on the video card (in the order picked); without a pick, only the shown clip
          if (node.defId === 'video-stitch' && src.pick?.length) {
            const all = local.get(src.id) ?? src.results;
            const list = src.pick.map((pid) => all.find((x) => x.id === pid)).filter((x): x is Asset => !!x);
            if (list.length) { out.push(...list); continue; }
          }
          const a = nodeAssets(src, e.sourceHandle, local); if (a) out.push(a);
        }
        return out;
      };
      const ctx: Ctx = {
        node, def, p: node.params, engineId: node.engineId, inputs, signal,
        text: (h) => inputs(h).map((a) => a.text ?? '').filter(Boolean).join(', '),
        progress: (pct, label) => hooks.progress?.(node.id, pct, label),
        preview: (u) => hooks.preview?.(node.id, u),
      };

      // cheap, deterministic nodes: reuse when nothing changed
      let cacheKey = '';
      if (def.kind === 'edit') {
        cacheKey = JSON.stringify([node.defId, node.params, def.inputs.map((i) => inputs(i.id).map((a) => a.id))]);
        const hit = editCache.get(node.id);
        if (hit && hit.key === cacheKey && node.results.length) { local.set(node.id, node.results); continue; }
      }

      if (heavy || def.kind === 'edit') hooks.start?.(node.id);
      const assets = await RUNNERS[def.id]?.(ctx) ?? [];
      local.set(node.id, assets.length || def.kind === 'generate' ? assets : node.results);
      if (cacheKey) editCache.set(node.id, { key: cacheKey, assets });
      if (heavy || def.kind === 'edit' || def.kind === 'source') hooks.done?.(node.id, assets, heavy ? 'append' : 'replace');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    hooks.error?.(failing, msg);
    throw err;
  }
}

// ------------------------------------------------------------------ runners
type Runner = (c: Ctx) => Promise<Asset[]>;


/** custom width x height (snapped to multiples of 16, 256..4096) */
function sizeCustom(w: number, h: number): { w: number; h: number } {
  const s = (v: number) => Math.max(256, Math.min(4096, Math.round(v / 16) * 16));
  return { w: s(w), h: s(h) };
}

function sizeFrom(aspect: string, mp: number): { w: number; h: number } {
  const [a, b] = aspect.split(':').map(Number);
  const r = a && b ? a / b : 1;
  const px = mp * 1_000_000;
  const round16 = (v: number) => Math.max(256, Math.round(v / 16) * 16);
  return { w: round16(Math.sqrt(px * r)), h: round16(Math.sqrt(px / r)) };
}

async function runGraph(c: Ctx, graph: Record<string, unknown>, previewKey?: string): Promise<Asset[]> {
  const res = await runPrompt(graph, { onProgress: c.progress, signal: c.signal, previewKey, onPreview: c.preview });
  const files = [...res.images, ...res.videos];
  if (!files.length && !res.audios.length) throw new Error('ComfyUI finished but returned no image, video or audio');
  // SaveVideo reports mp4 files under `images`; sort by extension
  const audios = res.audios.map((f) => assetFromFile(f, 'audio', 'audio'));
  if (audios.length && !files.length) return audios;
  return [...audios, ...files.map((f) => (VIDEO_EXT.test(f.filename) ? assetFromFile(f, 'video', 'video') : assetFromFile(f, 'image', 'image')))];
}

function imageRunner(mode: (c: Ctx) => ImageMode): Runner {
  return async (c) => {
    const eng = engineFor(c.def, c.engineId)!;
    const family = eng.family as Family;
    const m = mode(c);
    const p = c.p;
    const settings = useSettings.getState();
    const seedIn = c.inputs('seed_in')[0];
    const seedParam = seedIn ? num(seedIn.text, -1) : num(p.seed, -1);
    const seed = seedParam < 0 ? Math.floor(Math.random() * 2 ** 40) : seedParam;

    const imgs = c.inputs('image');
    const refs = m === 'faceswap' ? [...imgs, ...c.inputs('face')] : imgs;
    const inputFiles: string[] = [];
    for (const a of refs.slice(0, 10)) inputFiles.push(await ensureInput(a));
    const maskA = c.inputs('mask')[0];
    const maskFile = maskA ? await ensureInput(maskA) : undefined;

    let { w, h } = typeof p.aspect === 'string' && (m === 't2i' || m === 'r2i' || m === 'krea2control' || m === 'identity' || m === 'animactrl')
      ? (p.size_mode === 'wh' ? sizeCustom(num(p.width, 1024), num(p.height, 1024)) : sizeFrom(String(p.aspect), num(p.megapixels, 1))) : { w: 0, h: 0 };
    // Moss I2I / inpaint work at the source's own size (multiple of 16)
    if (family === 'moss' && (m === 'i2i' || m === 'inpaint') && imgs[0]) { const bm = await loadBitmap(imgs[0]); ({ w, h } = sizeCustom(bm.width, bm.height)); }
    // Moss R2I: the boxes were drawn on the card's own canvas; scale them to the size that is rendered
    let mossBoxes: MossBox[] = [];
    let mossChars = '';
    if (m === 'r2i') {
      const card = c.inputs('layout').map((a) => { try { return JSON.parse(a.text ?? ''); } catch { return null; } }).find((j) => j?.kind === 'mossboxes');
      if (!card) throw new Error('Wire a Moss Boxes card into this card (R2I)');
      let raw: MossBox[] = []; try { raw = JSON.parse(String(card.boxes || '[]')); } catch { throw new Error('Moss Boxes card: the boxes JSON is not valid'); }
      const sx = w / Math.max(16, num(card.width, 1024)), sy = h / Math.max(16, num(card.height, 1024));
      mossBoxes = raw.map((b) => ({ ...b, x: Math.round(b.x * sx), y: Math.round(b.y * sy), width: Math.round(b.width * sx), height: Math.round(b.height * sy) }));
      mossChars = String(card.characters ?? '');
    }
    const lora = (n: string, s: string) => ({ name: str(p[n], 'none'), strength: num(p[s], 1) });

    const job: ImageJob = {
      family, mode: m,
      prompt: [c.text('prompt') || c.text('text')].filter(Boolean).join(', '),
      negative: str(p.negative),
      width: w, height: h,
      steps: num(p.steps, 8), cfg: num(p.cfg, 1), sampler: str(p.sampler, 'euler'), scheduler: str(p.scheduler, 'simple'),
      seed, denoise: num(p.denoise, 1), batch: Math.max(1, num(p.batch, 1)),
      images: inputFiles, mask: maskFile,
      pad: { left: num(p.left), top: num(p.top), right: num(p.right), bottom: num(p.bottom) },
      loras: [lora('lora1', 'lora1_strength'), lora('lora2', 'lora2_strength'), ...cardLoras(c)],
      models: settings.models[family], saveSubfolder: settings.saveSubfolder,
      bgModel: str(p.bg_model),
      control: { preprocessor: str(p.cn_pre, 'DepthAnythingPreprocessor'), resolution: num(p.cn_res, 1024), strength: num(p.cn_strength, 1), patch: str(p.cn_patch, 'none') },
      kcontrol: { type: str(p.kc_type, 'depth') as 'depth', lora: str(p.kc_lora, 'none'), strength: num(p.kc_strength, 1), resolution: num(p.kc_res, 512), depthCkpt: '', cannyLow: num(p.canny_low, 100), cannyHigh: num(p.canny_high, 200) },
      identity: { lora: str(p.id_lora, 'none'), strength: num(p.id_strength, 1), fit: str(p.id_fit, 'fit'), refBoost: num(p.id_boost, 1), groundingPx: num(p.id_ground, 768), width: w || 1024, height: h || 1024 },
      anima: { type: str(p.an_type, 'anycontrol') as 'anycontrol', patch: str(p.an_patch, 'none'), strength: num(p.an_strength, 1), start: num(p.an_start, 0), end: num(p.an_end, 1), depthCkpt: '', resolution: num(p.an_res, 512) },
      face: { detector: str(p.fr_detector, 'none'), threshold: num(p.fr_threshold, 0.5), dilation: num(p.fr_dilation, 4), context: num(p.fr_context, 1.8), size: num(p.fr_size, 1024) },
      moss: { slg: !!p.slg, boxes: mossBoxes, characters: mossChars },
    };
    if ((m === 't2i' || m === 'edit' || m === 'i2i' || m === 'inpaint' || m === 'outpaint') && !job.prompt && m !== 'outpaint') throw new Error('Prompt is empty');
    if (p.auto_enhance && job.prompt && m !== 'outpaint' && m !== 'removebg') {
      c.progress(1, 'enhancing prompt…');
      const style = { ...formatFor(c.def.id, c.engineId), aesthetic: NO_AESTHETIC, extra_instructions: '' };
      job.prompt = (await runLlm({ system: '', prompt: job.prompt, style, where: 'bottom' })) || job.prompt;
    }
    const built = await buildImageGraph(job);
    c.progress(2, built.hint);
    return runGraph(c, built.graph);
  };
}

/** The Model Preview card wired into this video card (if any): the settings for ModelPreviewOverrideKJ, with a socket key made from the card's id. */
async function previewOf(c: Ctx, tiny: 'taeh3' | 'taeltx2_3'): Promise<PreviewCfg | undefined> {
  // the Model Preview card hangs off this card's Live preview output (it only holds the settings)
  let j: Record<string, any> | undefined;
  try {
    const { useGraph } = await import('../store/graph');
    const g = useGraph.getState();
    const to = g.edges.find((e) => e.source === c.node.id && e.sourceHandle === 'preview' && g.nodes.find((n) => n.id === e.target)?.defId === 'video-preview')?.target;
    j = g.nodes.find((n) => n.id === to)?.params;
  } catch { /* headless: no preview */ }
  // 'auto': the tiny decoder of the model family (without one the video latent has no colour preview)
  const have = await loadOptions('tinyvaes');
  const auto = have.find((x) => x.startsWith(tiny)) ?? 'none';
  return j ? { key: `cvprev_${c.node.id}`, maxResolution: num(j.max_resolution, 1024), quality: num(j.jpeg_quality, 85), frames: num(j.preview_frames, 243), fps: num(j.preview_fps, 12), tinyVae: str(j.tiny_vae, 'auto') === 'auto' ? auto : str(j.tiny_vae, 'none'), audio: !!j.with_audio } : undefined;
}

/** Auto Prompt: the written prompt goes back into the Prompt card wired to this card (when there is one). */
async function putIntoPromptCard(c: Ctx, text: string) {
  try {
    const { useGraph } = await import('../store/graph');
    const g = useGraph.getState();
    const e = g.edges.find((x) => x.target === c.node.id && x.targetHandle === 'prompt');
    const src = g.nodes.find((n) => n.id === e?.source);
    if (src?.defId === 'prompt') g.setParam(src.id, 'text', text);
  } catch { /* headless: nothing to update */ }
}

async function autoWrite(c: Ctx, write: () => Promise<string>, current: string): Promise<string> {
  c.progress(1, 'writing the prompt…');
  let out: string;
  try { out = await write(); } catch (e) { throw new Error(`Auto Prompt failed: ${e instanceof Error ? e.message : String(e)}`); }
  if (out && out !== current) await putIntoPromptCard(c, out);
  return out || current;
}

const textOnlySystem = (c: Ctx) => str(c.p.system);

export function enhanceInstruction(purpose: string, style: string, english = true): string {
  const forVideo = purpose === 'Video';
  return [
    `You rewrite a short idea into a richer text-to-${forVideo ? 'video' : 'image'} prompt.`,
    '- Output ONLY the rewritten prompt: no preamble, no quotes, no markdown.',
    '- Keep the user\'s subject and intent; add concrete detail (composition, light, materials, mood, lens, style).',
    forVideo ? '- Describe motion and camera movement across time.' : '',
    english ? '- Always write the result in English, even if the input is another language.' : '',
    style ? `- Guidelines: ${style}` : '',
  ].filter(Boolean).join('\n');
}

const enhanceSystem = (c: Ctx) => enhanceInstruction(str(c.p.purpose), str(c.p.style), !!c.p.english);

const TASKS: Record<string, string> = {
  'Plain description': 'Describe the image plainly and accurately in a few sentences.',
  'Generation prompt': 'Write a detailed text-to-image prompt that would recreate this image.',
  'Booru-style tags': 'List comma-separated booru-style tags for this image.',
  'Pose & anatomy': 'Describe the pose, body position and anatomy of the subject in detail.',
};

const parseCard = (a: Asset | undefined): any => { try { return a?.text ? JSON.parse(a.text) : null; } catch { return null; } };

/** Reference clips accept either Asset Library assets or image files, never both at once. To mix them (image 1, asset, asset, image 2 ...) the plain images are registered as temporary library assets for the run, in the order of the chips, and removed afterwards. */
async function runH3(c: Ctx): Promise<Asset[]> {
  const temp: number[] = [];
  try { return await runH3Core(c, temp); }
  finally { clearPlan(c.node.id); for (const id of temp) { try { await deleteAsset(id); } catch { /* the temporary asset stays in the library */ } } }
}

async function runH3Core(c: Ctx, temp: number[]): Promise<Asset[]> {
  const p = c.p;
  const resume = takeResume(c.node.id) as Record<string, any> | undefined;   // set when the page was reloaded in the middle of this run
  const assetCard = parseCard(c.inputs('assets')[0]);
  let assetRef = assetCard?.kind === 'assetlib' ? { project: assetCard.project as string | undefined, ids: (assetCard.ids ?? []) as string[] } : undefined;
  const ref = c.engineId === 'h3-ref' || !!assetRef;
  const si = c.inputs('seed_in')[0]; const sv = si ? num(si.text, -1) : num(p.seed, -1);
  const seed0 = typeof resume?.seed0 === 'number' ? resume.seed0 : sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv;
  const settings = useSettings.getState();
  let imgs = c.inputs('image'); const lastA = c.inputs('last')[0];
  const tempImages: Record<string, Asset> = {};   // temporary library id -> the plain image it stands for (described for the prompt writer)
  const libOf = (a: Asset) => (a.meta as { assetId?: number } | undefined)?.assetId;
  if (ref && imgs.some((a) => libOf(a) === undefined) && (imgs.some((a) => libOf(a) !== undefined) || assetRef)) {
    if (assetRef?.project) throw new Error('A library project cannot be mixed with image cards: pick the assets one by one, or remove the image cards');
    // temporary assets left by an earlier run that was cut short (page reload) are removed first
    for (const old of (await listAssets()).filter((x) => x.subcategory === TEMP_MARK)) { try { await deleteAsset(old.id); } catch { /* stays */ } }
    const ids: string[] = []; let k = 0;
    // a library card hands over only its shown image through the port: take every picked asset of it, in the order of the connections
    const { useGraph } = await import('../store/graph');
    const gs = useGraph.getState();
    const plainLeft = imgs.filter((a) => libOf(a) === undefined);
    const order: ({ lib: string[] } | { plain: Asset })[] = [];
    for (const e of gs.edges.filter((x) => x.target === c.node.id && x.targetHandle === 'image')) {
      const src = gs.nodes.find((n) => n.id === e.source);
      if (src?.defId === 'asset-library') order.push({ lib: String(src.params.ids ?? '').split(/[,\s]+/).filter(Boolean) });
      else { const a = plainLeft.shift(); if (a) order.push({ plain: a }); }
    }
    for (const item of order) {
      if ('lib' in item) { ids.push(...item.lib); continue; }
      const a = item.plain;
      k++;
      const blob = await fetchBlob(a);
      const reg = await registerAsset(new File([blob], `image${k}.png`, { type: blob.type || 'image/png' }), 'etc', `image${k}`, TEMP_MARK);   // named image1, image2 ... so @image1 works in the prompt
      temp.push(reg.id); tempImages[String(reg.id)] = a; ids.push(String(reg.id));
    }
    ids.push(...(assetRef?.ids ?? []));
    if (ids.length > 9) throw new Error('At most 9 references (images + library assets) fit in one reference clip');
    assetRef = { project: undefined, ids }; imgs = [];
  }
  let promptSrc = resume ? String(resume.promptSrc) : c.text('prompt');
  if (p.auto_prompt && !resume) promptSrc = await autoWrite(c, () => autoPromptH3({ prompt: promptSrc, seconds: num(p.seconds, 8), mode: ref ? 'reference' : (imgs[0] || lastA) ? 'firstlast' : 't2v', images: ref ? imgs : [imgs[0], lastA].filter((x): x is Asset => !!x), assetRef, tempImages, warn: (m) => c.progress(2, m), oneTake: !ref && str(p.continuity, 'lastframe') === 'onetake', clips: promptSrc.split(/\n\s*-{3,}\s*\n/).filter((x) => x.trim()).length }), promptSrc);
  const prompts = promptSrc.split(/\n\s*-{3,}\s*\n/).map((x) => x.trim()).filter(Boolean);
  if (!prompts.length) throw new Error('Prompt is empty');
  const cards = h3Cards(c);
  let size: { width: number; height: number } | undefined;
  if (str(p.aspect) === 'auto' && imgs[0]) { const bm = await loadBitmap(imgs[0]); size = h3Size(`${bm.width}:${bm.height}`, num(p.megapixels, 0.9)); }
  const refFiles: string[] = []; if (ref) for (const a of imgs.slice(0, 9)) refFiles.push(await ensureInput(a));
  let first = !ref && imgs[0] ? await ensureInput(imgs[0]) : undefined;
  const lastFile = !ref && lastA ? await ensureInput(lastA) : undefined;
  const lockFile: string | undefined = cards.lock?.file;
  // "Continuity between clips" card: carry on from the previous Video Generate card (a reference clip has no first frame, so only the latent route applies)
  const cont = ref && cards.cont?.mode !== 'latent' ? undefined : cards.cont;
  // when this card's Video output feeds a Continuity card set to Latent, the latent of its last clip is saved automatically (= One-Take)
  const { useGraph: ug } = await import('../store/graph');
  const gs0 = ug.getState();
  const feedsLatent = gs0.edges.some((e) => e.source === c.node.id && e.sourceHandle === 'video' && gs0.nodes.some((n) => n.id === e.target && n.defId === 'clip-continuity' && n.params.mode === 'latent'));
  const chosen = cont ? (cont.mode === 'latent' ? 'onetake' : 'lastframe') : str(p.continuity, 'lastframe');
  const continuity: string = feedsLatent ? 'onetake' : ref && chosen === 'lastframe' ? 'none' : chosen;
  let prevCheckpoint: string | undefined;
  if (cont?.mode === 'latent') { if (!cont.checkpoint) throw new Error('Continuity (latent): the previous card has no saved latent. Run it first in this session, or pick "Last frame"'); prevCheckpoint = cont.checkpoint; }
  else if (cont) { const lf = await clipLastFrame(cont.filename, cont.subfolder); if (!lf.ok || !lf.filename) throw new Error(`Continuity: could not take the last frame (${lf.error ?? 'unknown'})`); first = lf.filename; }
  const startAt = resume ? Number(resume.startAt ?? 0) : prevCheckpoint ? 1 : 0;
  if (resume) { if (resume.first) first = String(resume.first); prevCheckpoint = resume.prevCheckpoint ? String(resume.prevCheckpoint) : undefined; }
  const lora = (n: string, s2: string) => ({ name: str(p[n], 'none'), strength: num(p[s2], 1) });
  const seconds = num(p.seconds, 8);
  const runId = resume ? String(resume.runId) : uid('ot').slice(0, 10);
  const opt = await h3Opt(cards, ref);
  const pvCfg = await previewOf(c, 'taeh3');
  const clips: { filename: string; subfolder: string }[] = resume?.clips ?? [];
  const plan = (i: number, promptId?: string) => writePlan(c.node.id, { kind: 'h3', promptSrc, seed0, runId, startAt, i, clips, first, prevCheckpoint, promptId });
  for (let i = Number(resume?.i ?? 0); i < prompts.length; i++) {
    if (c.signal?.aborted) throw new Error('cancelled');
    // after a reload: follow the clip that was in flight (queued or already finished) instead of making it again
    let attach: string | undefined;
    if (resume && i === Number(resume.i) && resume.promptId) { const r = await recoverPrompt(String(resume.promptId)); if (r === 'failed') throw new Error(`clip ${i + 1} failed while the page was closed`); attach = r === null ? undefined : String(resume.promptId); }
    plan(i);
    const checkpoint = continuity === 'onetake' ? `canvers_${runId}_${i}` : undefined;
    const mode = ref ? 'reference' : (first || (i === prompts.length - 1 && lastFile) ? 'firstlast' : 't2v');
    const built = await buildH3Graph({
      mode, prompt: prompts[i], seconds, aspect: str(p.aspect, '16:9'), megapixels: num(p.megapixels, 0.9),
      first: first, last: i === prompts.length - 1 ? lastFile : undefined, refs: refFiles,
      seed: seed0 + i, steps: num(p.steps, 20), sampler: str(p.sampler, 'er_sde'), scheduler: str(p.scheduler, 'simple'),
      loras: [lora('lora1', 'lora1_strength'), lora('lora2', 'lora2_strength'), ...cardLoras(c)].filter((l) => l.name && l.name !== 'none'),
      assetRef,
      opt: { ...opt, audioLock: lockFile ? { file: lockFile, startSec: i * (h3Frames(seconds) / 24), mode: str(cards.lock.mode, 'lock'), strength: num(cards.lock.strength, 0.5), fit: str(cards.lock.fit, 'pad_silence') } : undefined },
      models: settings.video, saveSubfolder: settings.saveSubfolder, size, upscaleModel: str(p.upscale_model, 'none'),
      clipIndex: i + startAt, prevCheckpoint, checkpoint, saveLastFrame: continuity === 'lastframe' && i < prompts.length - 1, stem: 'MMH3', preview: pvCfg,
    });
    const base = i / prompts.length;
    const res = await runPrompt(built.graph, { onProgress: (pct, label) => c.progress(Math.round((base + pct / 100 / prompts.length) * 100), `clip ${i + 1}/${prompts.length} ${label ?? ''}`), signal: c.signal, previewKey: pvCfg?.key, onPreview: c.preview, attach, onQueued: (pid) => plan(i, pid) }).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      throw /doesn't match the broadcast shape/.test(msg) && opt.hires ? new Error(`${msg}
If this happened on the last step of 7+1, H3 Memory Optimization does not work with this model: tick "Bypass H3 Memory Optimization on the last step" on the H3 Turbo card and run again.`) : e;
    });
    const vout = res.raw[built.videoNode]; const vf = (vout?.gifs ?? vout?.images ?? vout?.videos ?? [])[0];
    if (!vf) throw new Error(`clip ${i + 1}: ComfyUI returned no video`);
    clips.push({ filename: vf.filename, subfolder: vf.subfolder ?? '' });
    prevCheckpoint = checkpoint;
    if (built.lastFrameNode && i < prompts.length - 1) {
      // continue the next clip from this one's last frame that still has a picture in it
      const lf = (res.raw[built.lastFrameNode]?.images ?? [])[0];
      const tail = (res.raw[built.tailNode ?? '']?.images ?? []) as { filename: string; subfolder?: string; type?: string }[];
      let pick = lf ? { filename: lf.filename, subfolder: lf.subfolder ?? '', type: lf.type ?? 'output' } : undefined;
      try { const r = await pickChainFrame(tail.map((t) => ({ filename: t.filename, subfolder: t.subfolder ?? '', type: t.type ?? 'temp' }))); if (r.ok && r.picked) pick = r.picked; } catch { /* use the saved last frame */ }
      if (!pick) throw new Error('could not find a frame to continue from');
      first = (await copyToInput(pick)).filename;
    }
  }
  plan(prompts.length);   // every clip is done: a reload from here only has the stitch left
  const assets = clips.map((f) => assetFromFile({ filename: f.filename, subfolder: f.subfolder, type: 'output' }, 'video', 'video'));
  // the clip keeps its prompt (a later Latent Upscale (Use H3) reads it) and, for One-Take, its latent name
  const tag = (a: Asset[]) => { if (a[0]) a[0].meta = { ...a[0].meta, ...(prevCheckpoint ? { checkpoint: prevCheckpoint } : {}), ...(prompts.length === 1 && !ref ? { prompt: prompts[0] } : {}) }; return a; };   // lets a Continuity card pick up the latent
  if (clips.length > 1 && p.stitch !== false) {
    c.progress(98, 'stitching…');
    const st = await stitchClips(clips, `${settings.saveSubfolder}/MMH3_full`, continuity === 'onetake' ? ONE_TAKE_OVERLAP_SEC : undefined);
    if (!st.ok || !st.filename) throw new Error(`stitch failed: ${st.error ?? 'unknown'}`);
    return tag([assetFromFile({ filename: st.filename, subfolder: st.subfolder ?? '', type: 'output' }, 'video', 'video'), ...assets]);
  }
  return tag(assets);
}

/** LTX 2.5: one clip per `---` block of the prompt; each clip can start from the last frame of the one before; the clips are stitched at the end. */
async function runLtx(c: Ctx): Promise<Asset[]> {
  try { return await runLtxCore(c); } finally { clearPlan(c.node.id); }
}

async function runLtxCore(c: Ctx): Promise<Asset[]> {
  const resume = takeResume(c.node.id) as Record<string, any> | undefined;   // set when the page was reloaded in the middle of this run
  const p = c.p; const si = c.inputs('seed_in')[0]; const sv = si ? num(si.text, -1) : num(p.seed, -1);
  const seed0 = typeof resume?.seed0 === 'number' ? resume.seed0 : sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv;
  const settings = useSettings.getState();
  const first = c.inputs('image')[0], last = c.inputs('last')[0];
  const seconds = num(p.seconds, 5);
  const split = (t: string) => t.split(/\n\s*-{3,}\s*\n/).map((x) => x.trim()).filter(Boolean);
  let promptSrc = resume ? String(resume.promptSrc) : c.text('prompt');
  if (p.auto_prompt && !resume) {
    // one request per clip: each `---` block is written on its own
    promptSrc = await autoWrite(c, async () => {
      const out: string[] = [];
      for (const part of split(promptSrc).length ? split(promptSrc) : [promptSrc]) out.push(await autoPromptLtx({ prompt: part, seconds, images: out.length ? [] : [first, last].filter((x): x is Asset => !!x) }));
      return out.join('\n---\n');
    }, promptSrc);
  }
  const prompts = split(promptSrc);
  if (!prompts.length) throw new Error('Prompt is empty');
  let size: { width: number; height: number } | undefined;
  if (first && str(p.aspect) === 'auto') { const bm = await loadBitmap(first); size = ltxSize(`${bm.width}:${bm.height}`, num(p.megapixels, 1)); }
  const lora = (n: string, s2: string) => ({ name: str(p[n], 'none'), strength: num(p[s2], 1) });
  let firstFile = first ? await ensureInput(first) : undefined;
  const lastFile = last ? await ensureInput(last) : undefined;
  const cont = parseCard(c.inputs('cards').find((a) => parseCard(a)?.kind === 'cont'));   // Continuity card: LTX only continues from the last frame
  if (cont) { const lf = await clipLastFrame(cont.filename, cont.subfolder); if (!lf.ok || !lf.filename) throw new Error(`Continuity: could not take the last frame (${lf.error ?? 'unknown'})`); firstFile = lf.filename; }
  const chain = p.chain_last !== false;
  const pvCfg = await previewOf(c, 'taeltx2_3');
  const clips: { filename: string; subfolder: string }[] = resume?.clips ?? [];
  if (resume?.firstFile) firstFile = String(resume.firstFile);
  const plan = (i: number, promptId?: string) => { if (prompts.length > 1) writePlan(c.node.id, { kind: 'ltx', promptSrc, seed0, i, clips, firstFile, promptId }); };
  for (let i = Number(resume?.i ?? 0); i < prompts.length; i++) {
    if (c.signal?.aborted) throw new Error('cancelled');
    // after a reload: follow the clip that was in flight (queued or already finished) instead of making it again
    let attach: string | undefined;
    if (resume && i === Number(resume.i) && resume.promptId) { const r = await recoverPrompt(String(resume.promptId)); if (r === 'failed') throw new Error(`clip ${i + 1} failed while the page was closed`); attach = r === null ? undefined : String(resume.promptId); }
    plan(i);
    const graph = await buildLtxGraph({
      prompt: prompts[i], seconds, aspect: str(p.aspect, '16:9'), megapixels: num(p.megapixels, 1),
      first: firstFile, last: i === prompts.length - 1 ? lastFile : undefined,
      seed: seed0 + i, steps: num(p.steps, 12), cfg: num(p.cfg, 1),
      sampler: str(p.sampler, 'euler_ancestral'), scheduler: str(p.scheduler, 'linear_quadratic'), stage2Sigmas: str(p.stage2, '0.85, 0.7250, 0.4219, 0.0'),
      loras: [lora('lora1', 'lora1_strength'), lora('lora2', 'lora2_strength'), ...cardLoras(c)], models: settings.video, saveSubfolder: settings.saveSubfolder, size, preview: pvCfg,
    });
    if (prompts.length === 1) return runGraph(c, graph, pvCfg?.key);
    const base = i / prompts.length;
    const res = await runPrompt(graph, { onProgress: (pct, label) => c.progress(Math.round((base + pct / 100 / prompts.length) * 100), `clip ${i + 1}/${prompts.length} ${label ?? ''}`), signal: c.signal, previewKey: pvCfg?.key, onPreview: c.preview, attach, onQueued: (pid) => plan(i, pid) });
    const vf = [...res.videos, ...res.images].find((f) => VIDEO_EXT.test(f.filename));
    if (!vf) throw new Error(`clip ${i + 1}: ComfyUI returned no video`);
    clips.push({ filename: vf.filename, subfolder: vf.subfolder ?? '' });
    if (chain && i < prompts.length - 1) {
      // the next clip starts from this one's last frame
      const lf = await clipLastFrame(vf.filename, vf.subfolder ?? '');
      if (!lf.ok || !lf.filename) throw new Error(`clip ${i + 1}: could not take the last frame (${lf.error ?? 'unknown'})`);
      firstFile = lf.filename;
    }
  }
  plan(prompts.length);   // every clip is done: a reload from here only has the stitch left
  const assets = clips.map((f) => assetFromFile({ filename: f.filename, subfolder: f.subfolder, type: 'output' }, 'video', 'video'));
  if (p.stitch !== false) {
    c.progress(98, 'stitching…');
    const st = await stitchClips(clips, `${settings.saveSubfolder}/LTX25_full`);
    if (!st.ok || !st.filename) throw new Error(`stitch failed: ${st.error ?? 'unknown'}`);
    return [assetFromFile({ filename: st.filename, subfolder: st.subfolder ?? '', type: 'output' }, 'video', 'video'), ...assets];
  }
  return assets;
}

const RUNNERS: Record<string, Runner> = {
  ...EXTRA_RUNNERS,
  // ---- sources / data
  prompt: async (c) => {
    const extra = c.inputs('vars').map((a) => a.text ?? '').filter(Boolean);
    return [textAsset([str(c.p.text), ...extra].filter(Boolean).join('\n'))];
  },
  'melody-editor': async (c) => {
    const abc = str(c.p.abc);
    if (!abc.trim()) throw new Error('Open the editor (double-click the node) and play or draw a melody first');
    return [textAsset(abc, 'abc')];
  },
  'text-data': async (c) => [textAsset(str(c.p.text))],
  concat: async (c) => [textAsset(c.inputs('texts').map((a) => a.text ?? '').filter(Boolean).join(str(c.p.separator, ', ')))],
  number: async (c) => [textAsset(String(num(c.p.value)), 'value')],
  'seed-node': async (c) => [textAsset(String(num(c.p.value, 0)), 'value')],
  toggle: async (c) => [textAsset(c.p.value ? 'true' : 'false', 'value')],

  // ---- LLM (four backends, chosen in Settings)
  'llm-tj': async (c) => {
    const t = c.text('text');
    const prompt = [t, str(c.p.prompt)].filter(Boolean).join('\n\n');
    const images = c.inputs('image');
    if (!prompt && !images.length) throw new Error('Give the LLM some text or an image');
    c.progress(10, 'asking the model…');
    const temperature = num(c.p.temperature, 0);
    return [textAsset(await runLlm({ system: textOnlySystem(c), prompt, images, temperature: temperature > 0 ? temperature : undefined }))];
  },
  'prompt-enhancer': async (c) => {
    const t = need(c.text('text') || undefined, 'Text');
    c.progress(10, 'enhancing…');
    // reference images: connected straight to this card, or else the ones wired to the card this prompt feeds
    const own = c.inputs('image'); const down = own.length ? null : downstreamImages(c.node.id);
    const imgs = own.length ? own : down!.images.map((x) => x.asset);
    const ms = styleOf(c.node.id, { fmt: c.p.fmt, aes: c.p.aes, extra: c.p.style, purpose_sel: c.p.purpose }, { model_format: 'Universal Natural Language', purpose: str(c.p.purpose) || down?.purpose || 'Image' });
    if (imgs.length) return [textAsset(await enhanceWithImages({ idea: t, images: imgs, purpose: ms.purpose, modelStyle: ms, progress: c.progress }))];
    return [textAsset(await runLlm({ system: '', prompt: t, style: ms }))];
  },
  'music-writer': async (c) => {
    const t = need(c.text('text') || undefined, 'Text');
    const key = ({ 'lyrics from theme': 'lyrics_from_theme', 'lyrics from title': 'lyrics_from_title', 'enhance lyrics': 'lyrics_enhance', 'style caption — Ace-Step': 'caption_acestep', 'style caption — MiniMax Music': 'caption_minimax', 'style caption — YuE2': 'caption_yue2', 'cover prompt': 'cover_prompt', 'song title': 'title' } as Record<string, string>)[str(c.p.task)] ?? 'lyrics_from_theme';
    c.progress(10, 'loading prompt…');
    const lib = await getJson<{ prompts: Record<string, string> }>('/music_one/llm/prompts');
    const system = lib.prompts?.[key]; if (!system) throw new Error(`The MusicMaker prompt "${key}" was not found on the server`);
    c.progress(30, 'writing…');
    return [textAsset(await runLlm({ system, prompt: t }))];
  },
  'image-describer': async (c) => {
    const images = need(c.inputs('image'), 'Image');
    c.progress(10, 'looking at the image…');
    const system = ['You describe images.', TASKS[str(c.p.task)] ?? TASKS['Plain description'], 'Output ONLY the description, no preamble.', str(c.p.guidelines)].filter(Boolean).join('\n');
    return [textAsset(await runLlm({ system, prompt: 'Describe this image.', images }))];
  },

  // ---- image generation
  'image-generate': imageRunner((c) => (c.engineId === 'moss-r2i' ? 'r2i' : 't2i')),
  'camera-angle': (c) => {
    const h = num(c.p.angle_h), v = num(c.p.angle_v), z = num(c.p.angle_zoom, 4); const ha = ((h % 360) + 360) % 360;
    const hDir = ha < 22.5 || ha >= 337.5 ? 'front view' : ha < 67.5 ? 'front-right quarter view' : ha < 112.5 ? 'right side view' : ha < 157.5 ? 'back-right quarter view' : ha < 202.5 ? 'back view' : ha < 247.5 ? 'back-left quarter view' : ha < 292.5 ? 'left side view' : 'front-left quarter view';
    const angle = `<sks> ${hDir} ${v < -15 ? 'high-angle shot' : v < 15 ? 'eye-level shot' : v < 45 ? 'elevated shot' : 'low-angle shot'} ${z < 4 ? 'close-up' : z < 7 ? 'medium shot' : 'wide shot'}`;
    const extra = c.text('prompt');
    return imageRunner(() => 'edit')({ ...c, p: { ...c.p, lora2: c.p.angle_lora, lora2_strength: c.p.angle_strength }, text: (hd: string) => (hd === 'prompt' ? [angle, extra].filter(Boolean).join(', ') : c.text(hd)) });
  },
  controlnet: imageRunner(() => 'controlnet'),
  'krea2-control': imageRunner(() => 'krea2control'),
  'krea2-identity': imageRunner(() => 'identity'),
  'anima-control': imageRunner(() => 'animactrl'),
  'face-redraw': imageRunner(() => 'facedraw'),
  'image-edit': imageRunner((c) => (c.engineId === 'klein-edit' || c.engineId === 'qwen-edit' || c.engineId === 'qwen21-edit' || !c.engineId ? 'edit' : 'i2i')),
  inpaint: imageRunner(() => 'inpaint'),
  outpaint: imageRunner(() => 'outpaint'),
  'face-swap': imageRunner(() => 'faceswap'),
  'remove-bg': imageRunner(() => 'removebg'),
  upscale: async (c) => {
    const src = need(c.inputs('image')[0], 'Image');
    if (c.engineId === 'seedvr2') {
      const p = c.p; if (!str(p.sv_dit) || p.sv_dit === 'none' || !str(p.sv_vae) || p.sv_vae === 'none') throw new Error('Pick the SeedVR2 DiT and VAE models on the card');
      const off = str(p.sv_offload, 'cpu'); const file = await ensureInput(src); const sub = useSettings.getState().saveSubfolder; const si = c.inputs('seed_in')[0];
      return runGraph(c, {
        'UP:dit': { class_type: 'SeedVR2LoadDiTModel', inputs: { model: str(p.sv_dit), device: 'cuda:0', blocks_to_swap: num(p.sv_swap, 0), swap_io_components: false, offload_device: off, cache_model: off !== 'none', attention_mode: str(p.sv_attn, 'sdpa') } },
        'UP:vae': { class_type: 'SeedVR2LoadVAEModel', inputs: { model: str(p.sv_vae), device: 'cuda:0', encode_tiled: true, encode_tile_size: 1024, encode_tile_overlap: 128, decode_tiled: true, decode_tile_size: 1024, decode_tile_overlap: 128, tile_debug: 'false', offload_device: off, cache_model: false } },
        'UP:load': { class_type: 'LoadImage', inputs: { image: file } },
        'UP:run': { class_type: 'SeedVR2VideoUpscaler', inputs: { image: ['UP:load', 0], dit: ['UP:dit', 0], vae: ['UP:vae', 0], seed: (si ? num(si.text, 42) : num(p.seed, 42)) % 4294967295, resolution: num(p.sv_res, 2048), max_resolution: num(p.sv_max, 4096), batch_size: 1, uniform_batch_size: false, color_correction: str(p.sv_color, 'lab'), temporal_overlap: 0, prepend_frames: 0, input_noise_scale: 0, latent_noise_scale: 0, offload_device: off, enable_debug: false } },
        'UP:save': { class_type: 'SaveImage', inputs: { images: ['UP:run', 0], filename_prefix: `${sub}/seedvr2` } },
      });
    }
    let model = str(c.p.upscale_model);
    if (!model || model === 'none') model = (await loadOptions('upscalers')).find((x) => x !== 'none') ?? '';
    if (!model) throw new Error('No upscale model found in ComfyUI/models/upscale_models');
    const file = await ensureInput(src);
    const sub = useSettings.getState().saveSubfolder;
    const g: Record<string, any> = {
      u1: { class_type: 'LoadImage', inputs: { image: file } },
      u2: { class_type: 'UpscaleModelLoader', inputs: { model_name: model } },
      u3: { class_type: 'ImageUpscaleWithModel', inputs: { upscale_model: ['u2', 0], image: ['u1', 0] } },
    };
    let last: [string, number] = ['u3', 0];
    const by = num(c.p.scale_by, 1);
    if (by !== 1) { g.u4 = { class_type: 'ImageScaleBy', inputs: { image: last, upscale_method: 'lanczos', scale_by: by } }; last = ['u4', 0]; }
    g.u5 = { class_type: 'SaveImage', inputs: { images: last, filename_prefix: `${sub}/upscale` } };
    return runGraph(c, g);
  },
  'music-generate': async (c) => {
    const p = c.p; const si = c.inputs('seed_in')[0]; const sv = si ? num(si.text, -1) : num(p.seed, -1);
    const stages = c.engineId === 'minimax' || c.engineId === 'yue2' ? [num(p.steps1, 30)] : [num(p.steps1, 30), num(p.steps2, 20), num(p.steps3, 15)];
    const graph = await buildMusicGraph({
      engine: (c.engineId === 'minimax' ? 'minimax' : c.engineId === 'yue2' ? 'yue2' : 'acestep') as 'minimax',
      melodyAbc: c.text('melody') || undefined, coverAudio: c.inputs('cover')[0] ? await ensureInput(c.inputs('cover')[0]) : undefined, temperature: num(p.temperature, 1), topP: num(p.top_p, 0.95), topK: num(p.top_k, 100), repetition: num(p.repetition, 1.2), caption: c.text('prompt'), lyrics: c.text('lyrics'),
      seconds: num(p.seconds, 60), seed: sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv, bpm: num(p.bpm, 120), keyscale: str(p.keyscale, 'A minor'),
      timesignature: str(p.timesignature, '4'), language: str(p.language, 'en'), format: str(p.format, 'flac') as 'flac', stageSteps: stages, cfg: num(p.cfg, 1),
      models: useSettings.getState().music, saveSubfolder: useSettings.getState().saveSubfolder,
    });
    return runGraph(c, graph);
  },
  'comfy-workflow': async (c) => {
    const { graph, error } = parseWorkflow(str(c.p.workflow));
    if (error) throw new Error(error);
    if (!graph) throw new Error('Load a workflow JSON first (open the node\'s advanced section)');
    const g = JSON.parse(JSON.stringify(graph));
    const prompt = c.text('prompt');
    if (prompt && str(c.p.prompt_target)) setField(g, str(c.p.prompt_target), prompt);
    const imgs = c.inputs('image');
    if (imgs[0] && str(c.p.image_target)) setField(g, str(c.p.image_target), await ensureInput(imgs[0]));
    if (imgs[1] && str(c.p.image2_target)) setField(g, str(c.p.image2_target), await ensureInput(imgs[1]));
    const vid = c.inputs('video')[0];
    if (vid && str(c.p.video_target)) setField(g, str(c.p.video_target), await ensureInput(vid));
    if (str(c.p.seed_target)) {
      const si = c.inputs('seed_in')[0]; const sv = si ? num(si.text, -1) : num(c.p.seed, -1);
      setField(g, str(c.p.seed_target), sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv);
    }
    return runGraph(c, g);
  },
  'video-generate': async (c) => {
    if (c.engineId === 'h3' || c.engineId === 'h3-ref') return runH3(c);
    return runLtx(c);
  },

  // ---- browser-side edits
  crop: opRunner('crop'), resize: opRunner('resize'), blur: opRunner('blur'), levels: opRunner('levels'),
  'rotate-flip': opRunner('rotate-flip'), 'color-correct': opRunner('color-correct'), sharpen: opRunner('sharpen'),
  grayscale: opRunner('grayscale'), threshold: opRunner('threshold'), posterize: opRunner('posterize'),
  'hue-rotate': opRunner('hue-rotate'), vignette: opRunner('vignette'), pixelate: opRunner('pixelate'), invert: opRunner('invert'),
  channels: async (c) => {
    const img = await loadBitmap(need(c.inputs('image')[0], 'Image'));
    const { image, mask } = channelOp(img, str(c.p.channel));
    return [await canvasToAsset(image, 'image'), await canvasToAsset(mask, 'mask')];
  },
  blend: async (c) => {
    const base = await loadBitmap(need(c.inputs('base')[0], 'Base'));
    const top = await loadBitmap(need(c.inputs('top')[0], 'Top'));
    const m = c.inputs('mask')[0];
    return [await canvasToAsset(blendOp(base, top, m ? await loadBitmap(m) : null, c.p))];
  },
  'mask-grow': async (c) => {
    const img = await loadBitmap(need(c.inputs('mask')[0], 'Mask'));
    return [await canvasToAsset(maskGrow(img, num(c.p.amount, 8), num(c.p.feather)), 'mask')];
  },
  'invert-mask': async (c) => [await canvasToAsset(invertMask(await loadBitmap(need(c.inputs('mask')[0], 'Mask'))), 'mask')],
  'color-palette': async (c) => {
    const img = await loadBitmap(need(c.inputs('image')[0], 'Image'));
    return [textAsset(palette(img, num(c.p.count, 5)).join(', '))];
  },
  'extract-frame': async (c) => {
    const v = need(c.inputs('video')[0], 'Video');
    return [await canvasToAsset(await videoFrame(v, num(c.p.position, 100)))];
  },
  painter: async (c) => {
    // the Painter editor stores its drawing in node.results; the runner just hands it on
    if (!c.node.results.length) throw new Error('Open the Painter (double-click the preview) and draw first');
    return c.node.results;
  },
  router: async (c) => c.inputs('image').slice(0, 1).map((a) => ({ ...a, port: 'image' })),

  // ---- sinks: nothing to compute
  export: async () => [], preview: async (c) => c.inputs('image').slice(0, 1).map((a) => ({ ...a, port: 'out' })), compare: async () => [], note: async () => [],
};

function opRunner(op: string): Runner {
  return async (c) => {
    const img = await loadBitmap(need(c.inputs('image')[0], 'Image'));
    c.progress(30, op);
    return [await canvasToAsset(applyOp(op, img, c.p))];
  };
}

export async function importFile(file: File): Promise<Asset> {
  const isVideo = file.type.startsWith('video/');
  if (file.type.startsWith('audio/') || /\.(flac|mp3|wav|ogg|opus|m4a)$/i.test(file.name)) {
    return assetFromFile(await uploadToInput(file, `canvers_${uid('')}_${file.name.replace(/[^\w.\-]+/g, '_')}`), 'audio', 'audio');
  }
  const ref = await uploadToInput(file, `canvers_${uid('')}_${file.name.replace(/[^\w.\-]+/g, '_')}`);
  return assetFromFile(ref, isVideo ? 'video' : 'image');
}

export async function importBlob(blob: Blob): Promise<Asset> {
  return assetFromFile(await uploadToInput(blob), blob.type.startsWith('video/') ? 'video' : 'image');
}

export { fetchBlob, pickModels, FAMILIES };
