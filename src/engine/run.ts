// Graph executor: walks the nodes upstream of a target and runs each one.
// Generators/LLMs run on the backend (ComfyUI + STUDIO_ONE); edit nodes run in the browser.
import type { Asset, GraphEdge, GraphNode, NodeDef, Primitive } from '../types';
import { byId, engineFor } from '../registry';
import { assetFromFile, ensureInput, fetchBlob, runPrompt, uid, uploadToInput } from '../backend/comfy';
import { buildImageGraph, type ImageJob, type ImageMode } from '../backend/imageGen';
import { FAMILIES, pickModels, type Family } from '../backend/studio';
import { runLlm } from '../backend/llm';
import { loadOptions } from '../backend/options';
import { buildMusicGraph } from '../backend/music';
import { buildLtxGraph, ltxSize } from '../backend/ltx';
import { buildH3Graph, h3Size, h3Frames, pickChainFrame, copyToInput, stitchClips, ONE_TAKE_OVERLAP_FRAMES } from '../backend/h3';
import { parseWorkflow, setField, VIDEO_EXT } from '../backend/workflow';
import { useSettings } from '../store/settings';
import { textAsset, num, str, need } from './util';
import { EXTRA_RUNNERS, cardLoras, h3Cards, optFromCards } from './more';
import { applyOp, blendOp, canvasToAsset, channelOp, invertMask, loadBitmap, maskGrow, palette, videoFrame } from '../editing/ops';

export interface GraphLike { nodes: GraphNode[]; edges: GraphEdge[] }

export interface Hooks {
  start?(id: string): void;
  progress?(id: string, pct: number, label?: string): void;
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
          const a = nodeAssets(src, e.sourceHandle, local); if (a) out.push(a);
        }
        return out;
      };
      const ctx: Ctx = {
        node, def, p: node.params, engineId: node.engineId, inputs, signal,
        text: (h) => inputs(h).map((a) => a.text ?? '').filter(Boolean).join(', '),
        progress: (pct, label) => hooks.progress?.(node.id, pct, label),
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


function sizeFrom(aspect: string, mp: number): { w: number; h: number } {
  const [a, b] = aspect.split(':').map(Number);
  const r = a && b ? a / b : 1;
  const px = mp * 1_000_000;
  const round16 = (v: number) => Math.max(256, Math.round(v / 16) * 16);
  return { w: round16(Math.sqrt(px * r)), h: round16(Math.sqrt(px / r)) };
}

async function runGraph(c: Ctx, graph: Record<string, unknown>): Promise<Asset[]> {
  const res = await runPrompt(graph, { onProgress: c.progress, signal: c.signal });
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

    const { w, h } = typeof p.aspect === 'string' && m === 't2i' ? sizeFrom(String(p.aspect), num(p.megapixels, 1)) : { w: 0, h: 0 };
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
      face: { detector: str(p.fr_detector, 'none'), threshold: num(p.fr_threshold, 0.5), dilation: num(p.fr_dilation, 4), context: num(p.fr_context, 1.8), size: num(p.fr_size, 1024) },
    };
    if ((m === 't2i' || m === 'edit' || m === 'i2i' || m === 'inpaint' || m === 'outpaint') && !job.prompt && m !== 'outpaint') throw new Error('Prompt is empty');
    const built = await buildImageGraph(job);
    c.progress(2, built.hint);
    return runGraph(c, built.graph);
  };
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

async function runH3(c: Ctx): Promise<Asset[]> {
  const p = c.p;
  const assetCard = parseCard(c.inputs('assets')[0]);
  const assetRef = assetCard?.kind === 'assetlib' ? { project: assetCard.project as string | undefined, ids: (assetCard.ids ?? []) as string[] } : undefined;
  const ref = c.engineId === 'h3-ref' || !!assetRef;
  const si = c.inputs('seed_in')[0]; const sv = si ? num(si.text, -1) : num(p.seed, -1);
  const seed0 = sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv;
  const settings = useSettings.getState();
  const prompts = c.text('prompt').split(/\n\s*-{3,}\s*\n/).map((x) => x.trim()).filter(Boolean);
  if (!prompts.length) throw new Error('Prompt is empty');
  const imgs = c.inputs('image'), lastA = c.inputs('last')[0];
  const cards = h3Cards(c);
  let size: { width: number; height: number } | undefined;
  if (str(p.aspect) === 'auto' && imgs[0]) { const bm = await loadBitmap(imgs[0]); size = h3Size(`${bm.width}:${bm.height}`, num(p.megapixels, 0.9)); }
  const refFiles: string[] = []; if (ref) for (const a of imgs.slice(0, 9)) refFiles.push(await ensureInput(a));
  let first = !ref && imgs[0] ? await ensureInput(imgs[0]) : undefined;
  const lastFile = !ref && lastA ? await ensureInput(lastA) : undefined;
  const lockFile: string | undefined = cards.lock?.file;
  const continuity: string = ref ? 'none' : str(p.continuity, 'lastframe');
  const lora = (n: string, s2: string) => ({ name: str(p[n], 'none'), strength: num(p[s2], 1) });
  const seconds = num(p.seconds, 8);
  const runId = uid('ot').slice(0, 10);
  const opt = optFromCards(cards);
  const clips: { filename: string; subfolder: string }[] = [];
  let prevCheckpoint: string | undefined;
  for (let i = 0; i < prompts.length; i++) {
    if (c.signal?.aborted) throw new Error('cancelled');
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
      clipIndex: i, prevCheckpoint, checkpoint, saveLastFrame: continuity === 'lastframe' && i < prompts.length - 1, stem: 'MMH3',
    });
    const base = i / prompts.length;
    const res = await runPrompt(built.graph, { onProgress: (pct, label) => c.progress(Math.round((base + pct / 100 / prompts.length) * 100), `clip ${i + 1}/${prompts.length} ${label ?? ''}`), signal: c.signal });
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
  const assets = clips.map((f) => assetFromFile({ filename: f.filename, subfolder: f.subfolder, type: 'output' }, 'video', 'video'));
  if (clips.length > 1 && p.stitch !== false) {
    c.progress(98, 'stitching…');
    const st = await stitchClips(clips, `${settings.saveSubfolder}/MMH3_full`, continuity === 'onetake' ? (ONE_TAKE_OVERLAP_FRAMES + 4) / 24 : undefined);
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
    return [textAsset(await runLlm({ system: enhanceSystem(c), prompt: t }))];
  },
  'image-describer': async (c) => {
    const images = need(c.inputs('image'), 'Image');
    c.progress(10, 'looking at the image…');
    const system = ['You describe images.', TASKS[str(c.p.task)] ?? TASKS['Plain description'], 'Output ONLY the description, no preamble.', str(c.p.guidelines)].filter(Boolean).join('\n');
    return [textAsset(await runLlm({ system, prompt: 'Describe this image.', images }))];
  },

  // ---- image generation
  'image-generate': imageRunner(() => 't2i'),
  controlnet: imageRunner(() => 'controlnet'),
  'face-redraw': imageRunner(() => 'facedraw'),
  'image-edit': imageRunner((c) => (c.engineId === 'klein-edit' || c.engineId === 'qwen-edit' || c.engineId === 'qwen21-edit' || !c.engineId ? 'edit' : 'i2i')),
  inpaint: imageRunner(() => 'inpaint'),
  outpaint: imageRunner(() => 'outpaint'),
  'face-swap': imageRunner(() => 'faceswap'),
  'remove-bg': imageRunner(() => 'removebg'),
  upscale: async (c) => {
    const src = need(c.inputs('image')[0], 'Image');
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
    const p = c.p; const si = c.inputs('seed_in')[0]; const sv = si ? num(si.text, -1) : num(p.seed, -1);
    const first = c.inputs('image')[0], last = c.inputs('last')[0];
    let size: { width: number; height: number } | undefined;
    if (first && str(p.aspect) === 'auto') { const bm = await loadBitmap(first); size = ltxSize(`${bm.width}:${bm.height}`, num(p.megapixels, 1)); }
    const lora = (n: string, s2: string) => ({ name: str(p[n], 'none'), strength: num(p[s2], 1) });
    const graph = await buildLtxGraph({
      prompt: c.text('prompt'), seconds: num(p.seconds, 5), aspect: str(p.aspect, '16:9'), megapixels: num(p.megapixels, 1),
      first: first ? await ensureInput(first) : undefined, last: last ? await ensureInput(last) : undefined,
      seed: sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv, steps: num(p.steps, 12), cfg: num(p.cfg, 1),
      sampler: str(p.sampler, 'euler_ancestral'), scheduler: str(p.scheduler, 'linear_quadratic'), stage2Sigmas: str(p.stage2, '0.85, 0.7250, 0.4219, 0.0'),
      loras: [lora('lora1', 'lora1_strength'), lora('lora2', 'lora2_strength'), ...cardLoras(c)], models: useSettings.getState().video, saveSubfolder: useSettings.getState().saveSubfolder, size,
    });
    return runGraph(c, graph);
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
