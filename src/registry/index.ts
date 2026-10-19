import type { EngineDef, NodeDef, ParamDef, PortDef } from '../types';

// ---------------------------------------------------------------- param helpers
const sel = (id: string, label: string, options: string[], def: string, extra: Partial<ParamDef> = {}): ParamDef =>
  ({ id, label, control: { kind: 'select', options }, default: def, ...extra });
const dyn = (id: string, label: string, source: string, def = 'none', extra: Partial<ParamDef> = {}): ParamDef =>
  ({ id, label, control: { kind: 'select', options: [def], source }, default: def, ...extra });
const slider = (id: string, label: string, min: number, max: number, step: number, def: number, extra: Partial<ParamDef> = {}): ParamDef =>
  ({ id, label, control: { kind: 'slider', min, max, step }, default: def, ...extra });
const num = (id: string, label: string, def: number, extra: Partial<ParamDef> = {}, min?: number, max?: number, step?: number): ParamDef =>
  ({ id, label, control: { kind: 'number', min, max, step }, default: def, ...extra });
const text = (id: string, label: string, def = '', multiline = false, extra: Partial<ParamDef> = {}): ParamDef =>
  ({ id, label, control: { kind: 'text', multiline }, default: def, ...extra });
const toggle = (id: string, label: string, def = false, extra: Partial<ParamDef> = {}): ParamDef =>
  ({ id, label, control: { kind: 'toggle' }, default: def, ...extra });

const ASPECTS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'];
export const aspect = (def = '1:1'): ParamDef => sel('aspect', 'Aspect ratio', ASPECTS, def);
const seed: ParamDef = { id: 'seed', label: 'Seed', control: { kind: 'seed' }, default: -1, advanced: true };
const megapixels = (def = 1): ParamDef => slider('megapixels', 'Size (MP)', 0.25, 4, 0.25, def);

/** the sampler block every local image engine shares; per-engine defaults differ */
const sampler = (steps: number, cfg: number, smp: string, sch = 'simple'): ParamDef[] => [
  slider('steps', 'Steps', 1, 60, 1, steps, { advanced: true }),
  slider('cfg', 'Guidance', 0, 15, 0.1, cfg, { advanced: true }),
  dyn('sampler', 'Sampler', 'samplers', smp, { advanced: true }),
  dyn('scheduler', 'Scheduler', 'schedulers', sch, { advanced: true }),
];

const loras = (fam: string): ParamDef[] => [
  dyn('lora1', 'LoRA 1', `loras:${fam}`, 'none', { advanced: true }),
  slider('lora1_strength', 'LoRA 1 strength', 0, 2, 0.05, 1, { advanced: true, when: (p) => p.lora1 !== 'none' }),
  dyn('lora2', 'LoRA 2', `loras:${fam}`, 'none', { advanced: true }),
  slider('lora2_strength', 'LoRA 2 strength', 0, 2, 0.05, 1, { advanced: true, when: (p) => p.lora2 !== 'none' }),
];

const negative = text('negative', 'Negative prompt', '', true, { advanced: true });

const sizeParams = (on: boolean): ParamDef[] => (on ? [aspect(), megapixels()] : []);

const krea2 = (id: string, label: string, extra: ParamDef[] = [], size = false): EngineDef => ({
  id, label, family: 'krea2',
  params: [...sizeParams(size), ...extra, ...sampler(8, 1, 'euler'), negative, ...loras('krea2'), num('batch', 'Batch', 1, { advanced: true }, 1, 4, 1), seed],
});
const anima = (id: string, label: string, extra: ParamDef[] = [], size = false): EngineDef => ({
  id, label, family: 'anima',
  params: [...sizeParams(size), ...extra, ...sampler(30, 4, 'euler'), negative, ...loras('anima'), num('batch', 'Batch', 1, { advanced: true }, 1, 4, 1), seed],
});
const qwen = (id: string, label: string, extra: ParamDef[] = [], size = false): EngineDef => ({
  id, label, family: 'qwen',
  params: [...sizeParams(size), ...extra, ...sampler(20, 4, 'euler'), negative, ...loras('qwen'), num('batch', 'Batch', 1, { advanced: true }, 1, 4, 1), seed],
});
const qwen21 = (id: string, label: string, extra: ParamDef[] = [], size = false): EngineDef => ({
  id, label, family: 'qwen21',
  params: [...sizeParams(size), ...extra, ...sampler(20, 1, 'euler'), negative, ...loras('qwen21'), num('batch', 'Batch', 1, { advanced: true }, 1, 4, 1), seed],
});
const sdxl = (id: string, label: string, extra: ParamDef[] = [], size = false): EngineDef => ({
  id, label, family: 'sdxl',
  params: [...sizeParams(size), ...extra, ...sampler(20, 7, 'euler_ancestral', 'karras'), { ...negative, default: 'low quality, blurry, deformed, watermark' }, ...loras('sdxl'), num('batch', 'Batch', 1, { advanced: true }, 1, 4, 1), seed],
});

// The H3 node keeps only the basics. Turbo / 7+1 hi-res, speed & attention, Audio Lock and LoRAs are separate cards
// that plug into its "Option cards" / "LoRA cards" inputs.
const h3Params = (ref: boolean): ParamDef[] => [
  sel('aspect', 'Aspect ratio', [...ASPECTS, 'auto'], '16:9'), megapixels(0.9), slider('seconds', 'Clip length (s)', 5.2, 15, 0.5, 8),
  ...(ref ? [] : [sel('continuity', 'Several clips (separate prompts with ---)', ['none', 'lastframe', 'onetake'], 'lastframe'), toggle('stitch', 'Stitch clips into one video', true)]),
  slider('steps', 'Steps (no turbo)', 1, 60, 1, 20, { advanced: true }), dyn('sampler', 'Sampler', 'samplers', 'er_sde', { advanced: true }), dyn('scheduler', 'Scheduler', 'schedulers', 'simple', { advanced: true }),
  dyn('upscale_model', 'Upscale model (after render)', 'upscalers', 'none', { advanced: true }),
  seed,
];

const klein = (id: string, label: string, extra: ParamDef[] = [], size = false): EngineDef => ({
  id, label, family: 'klein',
  params: [...sizeParams(size), ...extra, ...sampler(4, 1, 'euler'), negative, ...loras('klein'), num('batch', 'Batch', 1, { advanced: true }, 1, 4, 1), seed],
});
const zimage = (id: string, label: string, extra: ParamDef[] = [], size = false): EngineDef => ({
  id, label, family: 'zimage',
  params: [...sizeParams(size), ...extra, ...sampler(8, 1, 'euler'), negative, ...loras('zimage'), num('batch', 'Batch', 1, { advanced: true }, 1, 4, 1), seed],
});

// ---------------------------------------------------------------- ports
const P = {
  textIn: (id = 'prompt', label = 'Prompt', optional = false): PortDef => ({ id, label, type: 'text', optional }),
  textOut: (id = 'text', label = 'Text'): PortDef => ({ id, label, type: 'text' }),
  imgIn: (id = 'image', label = 'Image', optional = false, multi = false): PortDef => ({ id, label, type: 'image', optional, multi }),
  imgOut: (id = 'image', label = 'Image'): PortDef => ({ id, label, type: 'image' }),
  maskIn: (id = 'mask', label = 'Mask', optional = false): PortDef => ({ id, label, type: 'mask', optional }),
  maskOut: (id = 'mask', label = 'Mask'): PortDef => ({ id, label, type: 'mask' }),
  loraIn: (): PortDef => ({ id: 'loras', label: 'LoRA cards', type: 'lora', optional: true, multi: true }),
  cardIn: (label = 'Option cards'): PortDef => ({ id: 'cards', label, type: 'pipe', optional: true, multi: true }),
  seedIn: (): PortDef => ({ id: 'seed_in', label: 'Seed', type: 'number', optional: true }),
};

const edit = (id: string, title: string, params: ParamDef[], description: string, inputs: PortDef[] = [P.imgIn()], outputs: PortDef[] = [P.imgOut()]): NodeDef =>
  ({ id, title, category: 'Edit', kind: 'edit', inputs, outputs, params, description });

export const REGISTRY: NodeDef[] = [
  // ============================================================ Text / LLM
  { id: 'prompt', title: 'Prompt', category: 'Text / LLM', kind: 'source', inputs: [{ id: 'vars', label: 'Add-ons', type: 'text', optional: true, multi: true }], outputs: [P.textOut()],
    params: [text('text', 'Prompt', '', true)], description: 'Free text. Anything wired into Add-ons is appended.' },
  { id: 'concat', title: 'Prompt Concatenator', category: 'Text / LLM', kind: 'source', inputs: [{ id: 'texts', label: 'Texts', type: 'text', multi: true }], outputs: [P.textOut()],
    params: [text('separator', 'Separator', ', ')], description: 'Join several texts into one.' },
  { id: 'llm-tj', title: 'LLM (TJ)', category: 'Text / LLM', kind: 'llm',
    inputs: [P.textIn('text', 'Text', true), P.imgIn('image', 'Image', true)], outputs: [P.textOut()],
    params: [text('system', 'System prompt', 'You are a helpful assistant. Answer concisely.', true), text('prompt', 'Prompt', '', true), slider('temperature', 'Temperature (0 = settings)', 0, 2, 0.05, 0, { advanced: true })],
    description: 'Ask any model. Backend (Local GGUF · ComfyUI TextGenerate · OpenRouter · Connect Custom) is chosen in Settings.' },
  { id: 'prompt-enhancer', title: 'Prompt Enhancer', category: 'Text / LLM', kind: 'llm',
    inputs: [P.textIn('text', 'Text')], outputs: [P.textOut()],
    params: [sel('purpose', 'For', ['Image', 'Video'], 'Image'), text('style', 'Guidelines', 'Rewrite as a rich, detailed generation prompt. Keep the core idea.', true), toggle('english', 'Write in English', true, { advanced: true })],
    description: 'Rewrites a short idea into a detailed prompt.' },
  { id: 'music-writer', title: 'Music Writer (LLM)', category: 'Text / LLM', kind: 'llm',
    inputs: [P.textIn('text', 'Idea / theme / lyrics')], outputs: [P.textOut()],
    params: [sel('task', 'Write', ['lyrics from theme', 'lyrics from title', 'enhance lyrics', 'style caption — Ace-Step', 'style caption — MiniMax Music', 'style caption — YuE2', 'cover prompt', 'song title'], 'lyrics from theme')],
    description: 'Uses your LLM and the MusicMaker prompt library to write lyrics, a style caption, a cover prompt or a title. Wire the result into Music Generate.' },
  { id: 'image-describer', title: 'Image Describer', category: 'Text / LLM', kind: 'llm',
    inputs: [P.imgIn()], outputs: [P.textOut()],
    params: [sel('task', 'Describe as', ['Plain description', 'Generation prompt', 'Booru-style tags', 'Pose & anatomy'], 'Generation prompt'), text('guidelines', 'Extra guidelines', '', true)],
    description: 'Turns an image into text with a vision model.' },

  // ============================================================ Image generation
  { id: 'image-generate', title: 'Image Generate', category: 'Image', kind: 'generate',
    inputs: [P.textIn(), P.loraIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [
      { ...zimage('zimage', 'Z-Image Turbo (local)', [], true), default: true },
      klein('klein', 'Flux.2 Klein (local)', [], true),
      krea2('krea2', 'Krea 2 (local)', [], true),
      sdxl('sdxl', 'SDXL (local)', [], true),
      anima('anima', 'Anima (local)', [], true),
      qwen('qwen', 'Qwen Image Edit 2511 (local)', [], true),
      qwen21('qwen21', 'Qwen Image 2.1 (local)', [], true),
    ], description: 'Text to image on your own ComfyUI.' },
  { id: 'image-edit', title: 'Image Edit', category: 'Image', kind: 'generate',
    inputs: [P.textIn(), P.imgIn('image', 'Images', false, true), P.loraIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [
      { ...klein('klein-edit', 'Flux.2 Klein — edit with references (local)'), default: true },
      qwen21('qwen21-edit', 'Qwen Image 2.1 — up to 10 references (local)'),
      { ...qwen('qwen-edit', 'Qwen Image Edit 2511 — up to 3 references (local)') },
      klein('klein-i2i', 'Flux.2 Klein — img2img (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 0.75)]),
      zimage('zimage-i2i', 'Z-Image Turbo — img2img (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 0.75)]),
      krea2('krea2-i2i', 'Krea 2 — img2img (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 0.75)]),
      anima('anima-i2i', 'Anima — img2img (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 0.75)]),
      sdxl('sdxl-i2i', 'SDXL — img2img (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 0.6)]),
    ], description: 'Edit or restyle images. The first image sets the output size.' },
  { id: 'controlnet', title: 'ControlNet Generate (Z-Image)', category: 'Image', kind: 'generate',
    inputs: [P.textIn(), P.imgIn('image', 'Control image'), P.loraIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [{ ...zimage('zimage-cn', 'Z-Image Turbo Fun ControlNet (local)', [dyn('cn_patch', 'ControlNet model', 'modelpatches', 'none'), dyn('cn_pre', 'Preprocessor', 'preprocessors', 'DepthAnythingPreprocessor'), slider('cn_strength', 'Control strength', 0, 2, 0.05, 1), num('cn_res', 'Preprocess resolution', 1024, { advanced: true }, 256, 2048, 64)]), default: true }],
    description: 'Generate following the pose / depth / edges of a control image (preprocessor + Z-Image Fun ControlNet).' },
  { id: 'krea2-control', title: 'ControlNet Generate (Krea 2)', category: 'Image', kind: 'generate',
    inputs: [P.textIn(), P.imgIn('image', 'Control image'), P.loraIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [{ ...krea2('krea2-ctrl', 'Krea 2 depth / canny control (local)', [sel('kc_type', 'Control type', ['depth', 'canny'], 'depth'), dyn('kc_lora', 'Control LoRA', 'loras:krea2', 'none'), slider('kc_strength', 'Control strength', 0, 2, 0.05, 1), num('kc_res', 'Preprocess resolution', 512, { advanced: true }, 256, 2048, 64), num('canny_low', 'Canny low', 100, { advanced: true, when: (p) => p.kc_type === 'canny' }, 0, 255, 1), num('canny_high', 'Canny high', 200, { advanced: true, when: (p) => p.kc_type === 'canny' }, 0, 255, 1)], true), default: true }],
    description: 'Krea 2 following a depth map or canny edges of a control image (Control LoRA).' },
  { id: 'krea2-identity', title: 'Identity Edit (Krea 2)', category: 'Image', kind: 'generate',
    inputs: [P.textIn('prompt', 'Edit instruction'), P.imgIn('image', 'Image (+ optional 2nd)', false, true), P.loraIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [{ ...krea2('krea2-id', 'Krea 2 identity edit (local)', [dyn('id_lora', 'Identity-edit LoRA', 'loras:krea2', 'none'), slider('id_strength', 'LoRA strength', 0, 2, 0.05, 1), sel('id_fit', 'Fit', ['fit', 'crop (legacy)'], 'fit', { advanced: true }), slider('id_boost', 'Reference boost', 0, 3, 0.05, 1, { advanced: true }), num('id_ground', 'Grounding px', 768, { advanced: true }, 256, 2048, 64)], true), default: true }],
    description: 'Edit an image by instruction while keeping the subject (Krea 2 identity-edit LoRA). A second image can be a reference.' },
  { id: 'anima-control', title: 'Control / Inpaint (Anima)', category: 'Image', kind: 'generate',
    inputs: [P.textIn(), P.imgIn('image', 'Image'), P.maskIn('mask', 'Mask (inpaint)', true), P.loraIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [{ ...anima('anima-ctrl', 'Anima LLLite control (local)', [sel('an_type', 'Mode', ['anycontrol', 'depthcontrol', 'inpaint'], 'anycontrol'), dyn('an_patch', 'LLLite model', 'modelpatches', 'none'), slider('an_strength', 'Strength', 0, 2, 0.05, 1), slider('an_start', 'Start', 0, 1, 0.05, 0, { advanced: true }), slider('an_end', 'End', 0, 1, 0.05, 1, { advanced: true }), num('an_res', 'Depth preprocess resolution', 512, { advanced: true, when: (p) => p.an_type === 'depthcontrol' }, 256, 2048, 64)], true), default: true }],
    description: 'Anima with LLLite control: any-control, depth-control or inpainting.' },
  { id: 'face-redraw', title: 'Face Redraw (Z-Image)', category: 'Image', kind: 'generate',
    inputs: [P.textIn(), P.imgIn('image', 'Portrait'), P.loraIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [{ ...zimage('zimage-fr', 'Z-Image Turbo — face redraw (local)', [dyn('fr_detector', 'Face detector', 'bboxdetectors', 'none'), dyn('cn_patch', 'ControlNet model', 'modelpatches', 'none'), dyn('cn_pre', 'Preprocessor', 'preprocessors', 'DepthAnythingPreprocessor'), slider('cn_strength', 'Control strength', 0, 2, 0.05, 1), slider('denoise', 'Redraw strength', 0.05, 1, 0.05, 0.55), slider('fr_threshold', 'Detect threshold', 0.1, 1, 0.05, 0.5, { advanced: true }), num('fr_dilation', 'Mask dilation', 4, { advanced: true }, 0, 64, 1), slider('fr_context', 'Context around the face', 1, 4, 0.1, 1.8, { advanced: true }), num('fr_size', 'Working size px', 1024, { advanced: true }, 512, 2048, 64), num('cn_res', 'Preprocess resolution', 1024, { advanced: true }, 256, 2048, 64)]), default: true }],
    description: 'Detect the face in an image and redraw only that area (with your face LoRA) using ControlNet depth, then paste it back.' },
  { id: 'camera-angle', title: 'Camera Angle (Qwen)', category: 'Image', kind: 'generate',
    inputs: [P.imgIn('image', 'Image'), P.textIn('prompt', 'Extra prompt (optional)', true), P.loraIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [{ ...qwen('qwen-angle', 'Qwen Image Edit 2511 — multi-angle (local)', [slider('angle_h', 'Horizontal angle (°)', 0, 359, 1, 0), slider('angle_v', 'Vertical angle (°)', -30, 60, 1, 0), slider('angle_zoom', 'Distance (close 0 … wide 10)', 0, 10, 0.5, 4), dyn('angle_lora', 'Angle LoRA', 'loras:qwen', 'none'), slider('angle_strength', 'Angle LoRA strength', 0, 2, 0.05, 1)]), default: true }],
    description: 'View the same subject from another camera angle (needs a multi-angle LoRA).' },
  { id: 'inpaint', title: 'Inpaint', category: 'Image', kind: 'generate',
    inputs: [P.textIn(), P.imgIn(), P.maskIn(), P.loraIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [
      { ...zimage('zimage', 'Z-Image Turbo (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 0.85)]), default: true },
      klein('klein', 'Flux.2 Klein (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 1)]),
      sdxl('sdxl', 'SDXL (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 0.85)]),
      qwen('qwen', 'Qwen Image Edit 2511 (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 0.85)]),
    ], description: 'Repaint the white area of a mask.' },
  { id: 'outpaint', title: 'Outpaint', category: 'Image', kind: 'generate',
    inputs: [P.textIn('prompt', 'Prompt', true), P.imgIn(), P.loraIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [
      { ...zimage('zimage', 'Z-Image Turbo (local)', [num('left', 'Left px', 0, {}, 0, 2048, 64), num('top', 'Top px', 0, {}, 0, 2048, 64), num('right', 'Right px', 256, {}, 0, 2048, 64), num('bottom', 'Bottom px', 0, {}, 0, 2048, 64)]), default: true },
      klein('klein', 'Flux.2 Klein (local, needs KJNodes)', [num('left', 'Left px', 0, {}, 0, 2048, 64), num('top', 'Top px', 0, {}, 0, 2048, 64), num('right', 'Right px', 256, {}, 0, 2048, 64), num('bottom', 'Bottom px', 0, {}, 0, 2048, 64)]),
      sdxl('sdxl', 'SDXL (local)', [num('left', 'Left px', 0, {}, 0, 2048, 64), num('top', 'Top px', 0, {}, 0, 2048, 64), num('right', 'Right px', 256, {}, 0, 2048, 64), num('bottom', 'Bottom px', 0, {}, 0, 2048, 64)]),
    ], description: 'Extend the canvas around an image.' },
  { id: 'face-swap', title: 'Face Swap', category: 'Image', kind: 'generate',
    inputs: [P.textIn('prompt', 'Prompt', true), P.imgIn('image', 'Target'), P.imgIn('face', 'Face source'), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [{ ...klein('klein', 'Flux.2 Klein (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 1)]), default: true }],
    description: 'Put the face/head of the second image on the first.' },
  { id: 'remove-bg', title: 'Remove Background', category: 'Image', kind: 'generate',
    inputs: [P.imgIn()], outputs: [P.imgOut()], params: [],
    engines: [{ id: 'rmbg', label: 'BiRefNet (local)', family: 'klein', default: true, params: [dyn('bg_model', 'Model', 'bgmodels', 'birefnet.safetensors')] }],
    description: 'Cut the subject out (transparent PNG).' },
  { id: 'upscale', title: 'Upscale', category: 'Image', kind: 'generate',
    inputs: [P.imgIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [{ id: 'seedvr2', label: 'SeedVR2 (local)', family: 'core', params: [dyn('sv_dit', 'DiT model', 'seedvr2dit', 'none'), dyn('sv_vae', 'VAE model', 'seedvr2vae', 'none'), num('sv_res', 'Target resolution (short edge)', 2048, {}, 256, 8192, 64), num('sv_max', 'Max resolution', 4096, { advanced: true }, 512, 16384, 64), sel('sv_color', 'Colour correction', ['lab', 'wavelet', 'wavelet_adaptive', 'hsv', 'adain', 'none'], 'lab', { advanced: true }), sel('sv_offload', 'Offload device', ['cpu', 'none'], 'cpu', { advanced: true }), num('sv_swap', 'Blocks to swap', 0, { advanced: true }, 0, 36, 1), sel('sv_attn', 'Attention', ['sdpa', 'flash_attn_2', 'sageattn_2'], 'sdpa', { advanced: true }), num('seed', 'Seed', 42, { advanced: true })] },
      { id: 'esrgan', label: 'Upscale model (ComfyUI core)', family: 'core', default: true, params: [dyn('upscale_model', 'Model', 'upscalers', 'none'), slider('scale_by', 'Final scale', 0.25, 4, 0.25, 1, { advanced: true })] }],
    description: 'Enlarge with an ESRGAN-type model from ComfyUI/models/upscale_models.' },
  { id: 'music-generate', title: 'Music Generate', category: 'Audio', kind: 'generate',
    inputs: [P.textIn('prompt', 'Style', false), P.textIn('lyrics', 'Lyrics', true), { id: 'cover', label: 'Cover source', type: 'audio', optional: true }, P.textIn('melody', 'Melody (ABC)', true), P.seedIn()], outputs: [{ id: 'audio', label: 'Audio', type: 'audio' }],
    params: [], engines: [
      { id: 'acestep', label: 'Ace-Step 1.5 (local)', family: 'music', default: true, params: [slider('seconds', 'Length (s)', 5, 300, 1, 60), num('bpm', 'BPM', 120, {}, 40, 240, 1), text('keyscale', 'Key', 'A minor'), sel('timesignature', 'Time signature', ['2', '3', '4', '6'], '4', { advanced: true }), sel('language', 'Language', ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de'], 'en', { advanced: true }), sel('format', 'Format', ['flac', 'mp3', 'opus'], 'flac', { advanced: true }), slider('steps1', 'Stage 1 steps', 1, 60, 1, 30, { advanced: true }), slider('steps2', 'Stage 2 steps (0 = off)', 0, 60, 1, 20, { advanced: true }), slider('steps3', 'Stage 3 steps (0 = off)', 0, 60, 1, 15, { advanced: true }), slider('cfg', 'Guidance', 0, 10, 0.1, 1, { advanced: true }), seed] },
      { id: 'yue2', label: 'YuE2 — text / cover music (local)', family: 'music', params: [slider('seconds', 'Length (s)', 10, 300, 1, 60), sel('format', 'Format', ['flac', 'mp3', 'opus'], 'flac', { advanced: true }), slider('temperature', 'Temperature', 0.1, 2, 0.05, 1, { advanced: true }), slider('top_p', 'Top-p', 0.1, 1, 0.01, 0.95, { advanced: true }), num('top_k', 'Top-k', 100, { advanced: true }, 1, 500, 1), slider('repetition', 'Repetition penalty', 1, 2, 0.01, 1.2, { advanced: true }), seed] },
      { id: 'minimax', label: 'MiniMax Music 3 (local)', family: 'music', params: [slider('seconds', 'Length (s)', 5, 300, 1, 60), sel('format', 'Format', ['flac', 'mp3', 'opus'], 'flac', { advanced: true }), slider('steps1', 'Steps', 1, 80, 1, 30, { advanced: true }), slider('cfg', 'Guidance', 0, 10, 0.1, 1.7, { advanced: true }), seed] },
    ], description: 'Songs and instrumentals. Style prompt (+ optional lyrics) in, audio out. Models: Settings → Music models.' },
  { id: 'melody-editor', title: 'Melody Editor', category: 'Audio', kind: 'source', inputs: [], outputs: [P.textOut('abc', 'Melody (ABC)')],
    params: [text('melody', 'melody', '', false, { advanced: true }), text('abc', 'abc', '', false, { advanced: true })], description: 'Draw a melody on a piano roll, or record it from a MIDI keyboard. Wire it into YuE2 (Melody) — YuE2 then sings and arranges around your tune.' },
  { id: 'comfy-workflow', title: 'ComfyUI Workflow', category: 'Workflow', kind: 'generate',
    inputs: [P.textIn('prompt', 'Prompt', true), P.imgIn('image', 'Images', true, true), { id: 'video', label: 'Video', type: 'video', optional: true }, P.seedIn()],
    outputs: [P.imgOut('image', 'Image'), { id: 'video', label: 'Video', type: 'video' }],
    params: [text('workflow', 'Workflow JSON', '', true, { advanced: true }), text('prompt_target', 'Prompt field', '', false, { advanced: true }), text('image_target', 'Image 1 field', '', false, { advanced: true }), text('image2_target', 'Image 2 field', '', false, { advanced: true }), text('video_target', 'Video field', '', false, { advanced: true }), text('seed_target', 'Seed field', '', false, { advanced: true }), { id: 'seed', label: 'Seed', control: { kind: 'seed' }, default: -1, advanced: true }],
    description: 'Run any API-format ComfyUI workflow (video, LTX, H3, Wan…). Load the JSON, pick which fields take the prompt / images / seed.' },
  { id: 'video-generate', title: 'Video Generate', category: 'Video', kind: 'generate',
    inputs: [P.textIn('prompt', 'Prompt', false), P.imgIn('image', 'First frame / references', true, true), P.imgIn('last', 'Last frame', true), P.cardIn('H3 option cards'), P.loraIn(), { id: 'assets', label: 'Asset Library', type: 'pipe', optional: true }, P.seedIn()], outputs: [{ id: 'video', label: 'Video', type: 'video' }], params: [],
    engines: [
      { id: 'h3', label: 'MiniMax H3 — text / first-last frame (local)', family: 'h3', default: true, params: h3Params(false) },
      { id: 'h3-ref', label: 'MiniMax H3 — multi-reference (local)', family: 'h3', params: h3Params(true) },
      { id: 'ltx25', label: 'LTX 2.5 (local, with audio)', family: 'ltx25', params: [sel('aspect', 'Aspect ratio', [...ASPECTS, 'auto'], '16:9'), megapixels(1), slider('seconds', 'Length (s)', 2, 20, 1, 5), slider('steps', 'Steps', 1, 40, 1, 12, { advanced: true }), slider('cfg', 'Guidance', 0, 10, 0.1, 1, { advanced: true }), dyn('sampler', 'Sampler', 'samplers', 'euler_ancestral', { advanced: true }), dyn('scheduler', 'Scheduler', 'schedulers', 'linear_quadratic', { advanced: true }), text('stage2', 'Stage-2 sigmas', '0.85, 0.7250, 0.4219, 0.0', false, { advanced: true }), ...loras('ltx25'), seed] }],
    description: 'Text → video, or first/last frame → video (LTX 2.5). LTX 2.5 or MiniMax H3. Other models: ComfyUI Workflow node.' },

  // ============================================================ Edit (runs in the browser)
  edit('crop', 'Crop', [num('x', 'X %', 0, {}, 0, 100, 1), num('y', 'Y %', 0, {}, 0, 100, 1), num('w', 'Width %', 100, {}, 1, 100, 1), num('h', 'Height %', 100, {}, 1, 100, 1)], 'Cut out a rectangle (percent of the image).'),
  edit('resize', 'Resize', [sel('mode', 'Mode', ['scale', 'fit width', 'fit height', 'exact'], 'scale'), slider('scale', 'Scale', 0.1, 4, 0.05, 1, { when: (p) => p.mode === 'scale' }), num('width', 'Width', 1024, { when: (p) => p.mode === 'fit width' || p.mode === 'exact' }, 1, 8192, 1), num('height', 'Height', 1024, { when: (p) => p.mode === 'fit height' || p.mode === 'exact' }, 1, 8192, 1)], 'Change the pixel size.'),
  edit('blur', 'Blur', [slider('radius', 'Radius', 0, 50, 0.5, 4)], 'Gaussian blur.'),
  edit('levels', 'Levels', [slider('black', 'Black point', 0, 254, 1, 0), slider('white', 'White point', 1, 255, 1, 255), slider('gamma', 'Gamma', 0.1, 3, 0.05, 1)], 'Black / white point and gamma.'),
  edit('rotate-flip', 'Rotate and flip', [sel('rotate', 'Rotate', ['0', '90', '180', '270'], '0'), toggle('flip_h', 'Flip horizontal'), toggle('flip_v', 'Flip vertical')], 'Rotate in 90° steps and mirror.'),
  edit('color-correct', 'Color correction', [slider('brightness', 'Brightness', 0, 2, 0.01, 1), slider('contrast', 'Contrast', 0, 2, 0.01, 1), slider('saturation', 'Saturation', 0, 3, 0.01, 1), slider('temperature', 'Warmth', -100, 100, 1, 0)], 'Brightness, contrast, saturation, warmth.'),
  edit('sharpen', 'Sharpen', [slider('amount', 'Amount', 0, 3, 0.05, 0.8)], 'Unsharp-style sharpening.'),
  edit('grayscale', 'Grayscale', [slider('amount', 'Amount', 0, 1, 0.05, 1)], 'Remove colour.'),
  edit('threshold', 'Threshold', [slider('level', 'Level', 0, 255, 1, 128)], 'Pure black / white by brightness.'),
  edit('posterize', 'Posterize', [slider('levels', 'Levels', 2, 32, 1, 6)], 'Reduce the number of tones.'),
  edit('hue-rotate', 'Hue Rotate', [slider('degrees', 'Degrees', -180, 180, 1, 30)], 'Shift all colours around the wheel.'),
  edit('vignette', 'Vignette', [slider('strength', 'Strength', 0, 1, 0.05, 0.5), slider('softness', 'Softness', 0.1, 1, 0.05, 0.6)], 'Darken the corners.'),
  edit('pixelate', 'Pixelate', [slider('size', 'Block size', 2, 128, 1, 12)], 'Blocky mosaic.'),
  edit('invert', 'Invert', [], 'Negative of the image.'),
  edit('channels', 'Channels', [sel('channel', 'Channel', ['red', 'green', 'blue', 'alpha', 'luminance'], 'luminance')], 'Pull one channel out as grayscale image + mask.', [P.imgIn()], [P.imgOut(), P.maskOut()]),
  edit('blend', 'Blend', [sel('mode', 'Mode', ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'difference', 'soft-light'], 'normal'), slider('opacity', 'Opacity', 0, 1, 0.05, 1)], 'Put one image over another.', [P.imgIn('base', 'Base'), P.imgIn('top', 'Top'), P.maskIn('mask', 'Mask', true)]),
  edit('mask-grow', 'Matte Grow/Shrink', [slider('amount', 'Pixels (− shrink)', -64, 64, 1, 8), slider('feather', 'Feather', 0, 64, 1, 0)], 'Grow, shrink or soften a mask.', [P.maskIn()], [P.maskOut()]),
  edit('invert-mask', 'Invert Mask', [], 'Swap black and white in a mask.', [P.maskIn()], [P.maskOut()]),
  { id: 'color-palette', title: 'Color palette', category: 'Edit', kind: 'edit', inputs: [P.imgIn()], outputs: [P.textOut('text', 'Colors')],
    params: [slider('count', 'Colors', 2, 12, 1, 5)], description: 'Dominant colours as hex text.' },
  { id: 'extract-frame', title: 'Extract Video Frame', category: 'Edit', kind: 'edit', inputs: [{ id: 'video', label: 'Video', type: 'video' }], outputs: [P.imgOut()],
    params: [slider('position', 'Position %', 0, 100, 1, 100)], description: 'Grab one frame (default: last).' },
  { id: 'painter', title: 'Painter', category: 'Edit', kind: 'edit', inputs: [P.imgIn('image', 'Image', true)], outputs: [P.imgOut('image', 'Result'), P.maskOut()],
    params: [num('width', 'Canvas width', 1024, {}, 64, 4096, 8), num('height', 'Canvas height', 1024, {}, 64, 4096, 8)], description: 'Draw on an image or paint a mask. Double-click the preview to open the editor.' },

  // ============================================================ Utility
  // ---------------------------------------------------------------- cards (small settings blocks you wire in)
  { id: 'lora-card', title: 'LoRA', category: 'Cards', kind: 'source',
    inputs: [{ id: 'lora_in', label: 'More LoRAs', type: 'lora', optional: true, multi: true }], outputs: [{ id: 'lora', label: 'LoRA', type: 'lora' }],
    params: [dyn('lora', 'LoRA', 'loras:all', 'none'), slider('strength', 'Strength', -2, 2, 0.05, 1)],
    description: 'One LoRA. Wire it into any image or video node — chain several cards to stack LoRAs.' },
  { id: 'h3-turbo', title: 'H3 Turbo · 7+1', category: 'Cards', kind: 'source', inputs: [], outputs: [{ id: 'card', label: 'Turbo', type: 'pipe' }],
    params: [
      sel('turbo', 'Turbo', ['pdd', 'larryvrh', 'lightx2v', 'none'], 'pdd'), dyn('turbo_lora', 'Turbo LoRA', 'loras:h3', 'none', { when: (p) => p.turbo !== 'none' }),
      slider('turbo_strength', 'Turbo strength', 0, 2, 0.05, 1, { when: (p) => p.turbo !== 'none' }), slider('turbo_steps', 'Turbo steps', 1, 16, 1, 8, { advanced: true, when: (p) => p.turbo !== 'none' }),
      toggle('hires', '7+1 hi-res finish (7 steps small → upscale → 1 step big)', true, { when: (p) => p.turbo === 'pdd' }),
      slider('hires_start_mp', 'Start size (MP)', 0.2, 1, 0.05, 0.5, { when: (p) => p.turbo === 'pdd' && !!p.hires }), slider('hires_final_mp', 'Final size (MP)', 0.4, 3, 0.05, 0.9, { when: (p) => p.turbo === 'pdd' && !!p.hires }),
    ], description: 'H3 speed-up: Turbo LoRA and the 7+1 hi-res finish. Wire into Video Generate → H3 option cards.' },
  { id: 'h3-speed', title: 'H3 Speed & Attention', category: 'Cards', kind: 'source', inputs: [], outputs: [{ id: 'card', label: 'Speed', type: 'pipe' }],
    params: [
      sel('attn_backend', 'Attention backend', ['none', 'ck', 'sage', 'solattn_kijai', 'sla'], 'none'), sel('attn_forward', 'Attention forward patch', ['none', 'memeff_sage', 'solattn_sag'], 'none'),
      sel('optimizer', 'H3 optimizer', ['none', 'memory', 'memory_sparse'], 'none'), sel('block_cache', 'Block cache', ['none', 'fbcache'], 'none'),
      toggle('spectrum', 'Spectrum', false), toggle('fused_mod', 'Fused modulation', false),
      slider('shift_video', 'Shift (video)', 1, 20, 0.5, 12, { advanced: true }), slider('shift_audio', 'Shift (audio)', 1, 10, 0.5, 3, { advanced: true }),
    ], description: 'H3 attention backends, memory optimiser, block cache, Spectrum and sigma shift.' },
  { id: 'h3-audiolock', title: 'H3 Audio Lock', category: 'Cards', kind: 'source',
    inputs: [{ id: 'audio', label: 'Audio', type: 'audio' }], outputs: [{ id: 'card', label: 'Audio lock', type: 'pipe' }],
    params: [sel('lock_mode', 'Mode', ['lock', 'remix'], 'lock'), slider('lock_strength', 'Strength (remix)', 0, 1, 0.05, 0.5, { when: (p) => p.lock_mode === 'remix' }), sel('lock_fit', 'If the audio is shorter', ['pad_silence', 'loop', 'none'], 'pad_silence')],
    description: 'Make H3 use your audio (voice / music) instead of generating its own; each clip gets its own slice.' },
  { id: 'asset-library', title: 'Asset Library', category: 'Cards', kind: 'source', inputs: [],
    outputs: [P.imgOut('image', 'Images'), P.textOut('mentions', '@names'), { id: 'assets', label: 'For H3', type: 'pipe' }],
    params: [text('project', 'Project id', ''), text('ids', 'Asset ids', '')],
    description: 'Pick characters, places and props from your reference library. Write @name in the prompt; H3 Reference resolves it.' },

  // ---------------------------------------------------------------- post-processing (one card per step, video in → video out)
  ...((): NodeDef[] => {
    const vin = [{ id: 'video', label: 'Video', type: 'video' as const }], vout = [{ id: 'video', label: 'Video', type: 'video' as const }];
    const pp = (id: string, title: string, params: ParamDef[], description: string, engines?: EngineDef[]): NodeDef =>
      ({ id, title, category: 'Postprocess', kind: 'generate', inputs: vin, outputs: vout, params, engines, description });
    const rtxP = (pre: string, whenOk: (p: Record<string, any>) => boolean = () => true): ParamDef[] => [
      sel(`${pre}mode`, 'Size by', ['scale', 'short', 'long', 'wh'], 'scale', { when: whenOk }),
      slider(`${pre}scale`, 'Scale', 1, 4, 0.25, 2, { when: (p) => whenOk(p) && p[`${pre}mode`] === 'scale' }),
      num(`${pre}short`, 'Short edge px', 1080, { when: (p) => whenOk(p) && p[`${pre}mode`] === 'short' }, 8, 8192, 8), num(`${pre}long`, 'Long edge px', 1920, { when: (p) => whenOk(p) && p[`${pre}mode`] === 'long' }, 8, 8192, 8),
      num(`${pre}w`, 'Width', 1920, { when: (p) => whenOk(p) && p[`${pre}mode`] === 'wh' }, 8, 8192, 8), num(`${pre}h`, 'Height', 1080, { when: (p) => whenOk(p) && p[`${pre}mode`] === 'wh' }, 8, 8192, 8),
      sel(`${pre}anchor`, 'Crop anchor', ['center', 'left', 'right', 'top', 'bottom'], 'center', { advanced: true, when: (p) => whenOk(p) && p[`${pre}mode`] === 'wh' }),
      sel(`${pre}quality`, 'Quality', ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'], 'ULTRA', { when: whenOk }),
    ];
    return [
      pp('pp-deblur', 'Deblur (RTX)', [sel('strength', 'Strength', ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'], 'MEDIUM')], 'NVIDIA RTX Deblur on every frame.'),
      pp('pp-denoise', 'Denoise (RTX)', [sel('strength', 'Strength', ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'], 'MEDIUM')], 'NVIDIA RTX Denoise on every frame.'),
      pp('pp-upscale', 'Video Upscale', [], 'Enlarge a video: FlashVSR, RTX VSR or an upscale model; optional second RTX pass.', [
        { id: 'flashvsr', label: 'FlashVSR', family: 'post', default: true, params: [
          sel('fv_model', 'Model', ['FlashVSR-v1.1', 'FlashVSR'], 'FlashVSR-v1.1'), sel('fv_mode', 'Mode', ['tiny', 'tiny-long', 'full'], 'tiny'), slider('fv_scale', 'Scale', 2, 4, 1, 2), toggle('fv_color', 'Colour fix', true),
          num('fv_tile', 'Tile size', 384, { advanced: true }, 64, 2048, 32), num('fv_overlap', 'Tile overlap', 32, { advanced: true }, 0, 512, 8), num('fv_seed', 'Seed', 42, { advanced: true }),
          toggle('two_pass', '2nd pass with RTX VSR', false), ...rtxP('p2_', (p) => !!p.two_pass)] },
        { id: 'rtx', label: 'RTX VSR (TJ)', family: 'post', params: rtxP('rtx_') },
        { id: 'model', label: 'Upscale model (ESRGAN…)', family: 'post', params: [dyn('model_name', 'Model', 'upscalers', 'none'), toggle('two_pass', '2nd pass with RTX VSR', false), ...rtxP('p2_', (p) => !!p.two_pass)] },
      ]),
      pp('pp-skin', 'Skin Retouch', [slider('evenness', 'Evenness', 0, 1, 0.01, 0.3), slider('smoothing', 'Smoothing', 0, 1, 0.01, 0.2), slider('redness', 'Redness', 0, 1, 0.01, 0), slider('shine', 'Shine', 0, 1, 0.01, 0), sel('blemish', 'Blemish fix', ['off', 'subtle', 'strong'], 'off'), toggle('preserve', 'Keep moles / scars', true, { advanced: true }), slider('microtexture', 'Micro-texture', 0, 3, 0.05, 0, { advanced: true })], 'Non-generative skin evening, de-shine and blemish fix.'),
      pp('pp-grain', 'Film Grain', [slider('amount', 'Amount', 0, 1, 0.01, 0.25), slider('size', 'Size', 0.3, 3, 0.05, 1), slider('color', 'Colour grain', 0, 1, 0.01, 0), slider('lum_bias', 'Shadow bias', 0, 1, 0.01, 0), sel('noise', 'Noise', ['smooth', 'grainy'], 'smooth')], 'Add film grain (ComfyUI core GLSL shader).'),
      pp('pp-interpolate', 'Frame Interpolation', [slider('target_fps', 'Target FPS', 24, 120, 1, 48), slider('scale', 'Flow scale', 0.25, 2, 0.25, 1, { advanced: true }), text('model_name', 'RIFE model', 'flownet.pkl', false, { advanced: true }), num('batch', 'Batch size', 8, { advanced: true }, 1, 64, 1), toggle('fp16', 'FP16', true, { advanced: true })], 'RIFE: smooth motion by adding in-between frames.'),
      pp('pp-resize', 'Video Resize', [sel('mode', 'Mode', ['Long side', 'Short side', 'Ratio', 'Mega Pixel', 'Width x Height'], 'Long side'), num('target_px', 'Target px', 1920, { when: (p) => p.mode === 'Long side' || p.mode === 'Short side' }, 8, 16384, 2), num('ratio_w', 'Ratio W', 16, { when: (p) => p.mode === 'Ratio' }, 1, 64, 1), num('ratio_h', 'Ratio H', 9, { when: (p) => p.mode === 'Ratio' }, 1, 64, 1), slider('megapixels', 'Megapixels', 0.1, 8, 0.1, 1, { when: (p) => p.mode === 'Mega Pixel' }), num('width', 'Width', 1280, { when: (p) => p.mode === 'Width x Height' }, 8, 16384, 2), num('height', 'Height', 720, { when: (p) => p.mode === 'Width x Height' }, 8, 16384, 2), sel('crop', 'Fit', ['crop', 'stretch'], 'crop', { when: (p) => p.mode === 'Width x Height' }), sel('method', 'Resampling', ['lanczos', 'bilinear', 'bicubic', 'area', 'nearest-exact'], 'lanczos', { advanced: true })], 'Change the video size or aspect ratio.'),
      { id: 'face-refine', title: 'Face Refine (H3)', category: 'Postprocess', kind: 'generate',
        inputs: [{ id: 'video', label: 'Video', type: 'video' }, P.textIn('prompt', 'Prompt', true), P.imgIn('image', 'Face references', true, true), P.cardIn('H3 option cards'), P.loraIn(), P.seedIn()], outputs: vout,
        params: [
          dyn('detector', 'Face detector', 'facedetectors', 'none'), dyn('fallback', 'Fallback detector', 'facedetectors', 'none', { advanced: true }),
          sel('select', 'Which face', ['largest_face', 'smallest_face', 'left_most', 'right_most', 'top_most', 'bottom_most', 'centre_most', 'detector_score', 'manual'], 'largest_face'), text('picks', 'Picked faces (manual)', '', false, { when: (p) => p.select === 'manual' }), text('pick_mode', 'Pick mode', 'shots', false, { advanced: true, when: () => false }),
          slider('denoise', 'Redraw strength', 0.05, 1, 0.05, 0.4), slider('confidence', 'Detect confidence', 0.05, 1, 0.05, 0.35, { advanced: true }),
          slider('crop_factor', 'Crop factor', 1, 6, 0.1, 2.5, { advanced: true }), sel('canvas_mode', 'Canvas', ['auto_capped_768', 'auto_no_downscale', 'manual'], 'auto_capped_768', { advanced: true }),
          num('canvas_w', 'Canvas W', 768, { advanced: true, when: (p) => p.canvas_mode === 'manual' }, 64, 2048, 32), num('canvas_h', 'Canvas H', 768, { advanced: true, when: (p) => p.canvas_mode === 'manual' }, 64, 2048, 32),
          num('smooth', 'Smooth window', 21, { advanced: true }, 1, 99, 2), toggle('cuts', 'Detect scene cuts', false, { advanced: true }), slider('cut_threshold', 'Cut threshold', 1, 10, 0.5, 3, { advanced: true, when: (p) => !!p.cuts }),
          toggle('identity', 'Follow the same person', true, { advanced: true }), slider('identity_threshold', 'Identity threshold', 0.1, 0.9, 0.01, 0.45, { advanced: true }), sel('identity_model', 'Identity model', ['insightface', 'clip_vision', 'ccip'], 'insightface', { advanced: true }),
          slider('mul_small', 'Small face ×', 0, 2, 0.05, 1, { advanced: true }), slider('mul_large', 'Large face ×', 0, 2, 0.05, 0.35, { advanced: true }), slider('px_small', 'Small face px', 8, 200, 1, 30, { advanced: true }), slider('px_large', 'Large face px', 20, 600, 1, 120, { advanced: true }),
          slider('steps', 'Steps (no turbo)', 1, 30, 1, 8, { advanced: true }), dyn('sampler', 'Sampler', 'samplers', 'euler', { advanced: true }), dyn('scheduler', 'Scheduler', 'schedulers', 'simple', { advanced: true }),
          sel('paste', 'Paste back', ['face_only', 'face_ellipse', 'full_crop'], 'face_only', { advanced: true }), slider('feather', 'Feather', 0, 64, 1, 6, { advanced: true }), slider('colour', 'Colour match', 0, 1, 0.05, 1, { advanced: true }), slider('blend', 'Blend', 0, 1, 0.05, 1, { advanced: true }),
          sel('undetected', 'Frames without a face', ['fade_out', 'skip', 'composite_anyway'], 'fade_out', { advanced: true }), seed,
        ], description: 'Redraw small faces in a finished H3 clip: track → crop → H3 redraw → stitch back. Needs ComfyUI-H3-FaceRefine.' },
      { id: 'h3-image', title: 'Image Generate (H3)', category: 'Image', kind: 'generate',
    inputs: [P.textIn(), P.imgIn('image', 'Reference images (optional)', true, true), P.cardIn('H3 option cards'), P.loraIn(), P.seedIn()], outputs: [P.imgOut()],
    params: [
      sel('aspect', 'Aspect ratio', ASPECTS, '1:1'), slider('final_mp', 'Final size (MP)', 0.25, 4, 0.25, 1.5), toggle('final', 'High quality 2nd pass (latent upscale)', true),
      slider('preview_mp', 'First pass size (MP)', 0.1, 1.5, 0.05, 0.5, { advanced: true }), slider('steps', 'Steps (no turbo)', 1, 60, 1, 20, { advanced: true }), slider('pass2', '2nd pass steps', 3, 5, 1, 3, { advanced: true, when: (p) => !!p.final }),
      toggle('fizgig', 'Fizgig single-frame latent', false, { advanced: true }), sel('ref_size', 'Reference size', ['max', 'match'], 'max', { advanced: true }), seed,
    ], description: 'A still image from the MiniMax H3 model — text to image, or add reference images (up to 9).' },
  { id: 'character-sheet', title: 'Character Sheet', category: 'Image', kind: 'generate',
        inputs: [P.imgIn('image', 'Character reference', false, true), P.textIn('prompt', 'Prompt (optional)', true), P.loraIn(), P.seedIn()],
        outputs: [P.imgOut('image', 'Sheet'), { id: 'video', label: 'Turnaround video', type: 'video' }],
        params: [
          sel('aspect', 'Aspect ratio', ['3:4', '9:16', '1:1', '16:9', '4:3'], '3:4'), megapixels(0.9),
          text('frames', 'Frames for the 8 cells', '7, 22, 37, 52, 67, 82, 107, 118'), toggle('save_frames', 'Also save each frame', false, { advanced: true }),
          toggle('latent_up', 'Cheap first pass + latent upscale', false, { advanced: true }), slider('first_mp', 'First pass size (MP)', 0.2, 1, 0.05, 0.36, { advanced: true, when: (p) => !!p.latent_up }), slider('pass2', 'Second pass steps', 3, 5, 1, 3, { advanced: true, when: (p) => !!p.latent_up }),
          sel('deblur', 'RTX Deblur', ['none', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'], 'none', { advanced: true }), toggle('rtx', 'RTX VSR', false, { advanced: true }), toggle('supersample', 'Scale back down (supersample)', false, { advanced: true, when: (p) => !!p.rtx }),
          sel('ref_size', 'Reference size', ['max', 'match'], 'max', { advanced: true }), num('max_dim', 'Sheet max size px', 2048, { advanced: true }, 512, 8192, 64), seed,
        ], description: 'H3 reference-to-video turnaround (front / back / profile / ¾ / expressions) assembled into a model sheet.' },
    ];
  })(),

  { id: 'ltx-director', title: 'LTX Director (timeline)', category: 'Video', kind: 'generate',
    inputs: [P.textIn('prompt', 'Overall prompt', false), P.imgIn('image', 'Images (in time order)', true, true), P.loraIn(), P.seedIn()], outputs: [{ id: 'video', label: 'Video', type: 'video' }],
    params: [
      text('beats', 'Beats — one per line:  start-end: prompt  (seconds)', '', true), text('image_times', 'Image times (s), in the order connected', '0'), toggle('last_at_end', 'Pin the last image to the end', false),
      sel('aspect', 'Aspect ratio', [...ASPECTS, 'auto'], '16:9'), megapixels(1), slider('seconds', 'Length (s)', 2, 20, 1, 8),
      slider('steps', 'Steps', 1, 40, 1, 12, { advanced: true }), slider('cfg', 'Guidance', 0, 10, 0.1, 1, { advanced: true }), dyn('sampler', 'Sampler', 'samplers', 'euler_ancestral', { advanced: true }), dyn('scheduler', 'Scheduler', 'schedulers', 'linear_quadratic', { advanced: true }), text('stage2', 'Stage-2 sigmas', '0.85, 0.7250, 0.4219, 0.0', false, { advanced: true }), seed,
    ], description: 'LTX 2.5 with a timeline: a different prompt for each moment, and images pinned at chosen times.' },
  { id: 'video-refine', title: 'Video Edit (LTX 2.5 refine)', category: 'Video', kind: 'generate',
    inputs: [{ id: 'video', label: 'Video', type: 'video' }, P.textIn('prompt', 'Prompt', true), P.loraIn(), P.seedIn()], outputs: [{ id: 'video', label: 'Video', type: 'video' }],
    params: [slider('steps', 'Steps', 1, 20, 1, 4), slider('denoise', 'Change amount', 0.05, 1, 0.05, 0.15), text('negative', 'Negative prompt', 'bad anatomy, inconsistent look, low resolution,', true, { advanced: true }), dyn('sampler', 'Sampler', 'samplers', 'euler_ancestral', { advanced: true }), dyn('scheduler', 'Scheduler', 'schedulers', 'simple', { advanced: true }), seed],
    description: 'Re-render an existing clip with LTX 2.5: 2× latent upscale + a light, prompt-guided refine (keeps the sound).' },
  { id: 'video-stitch', title: 'Video Stitch', category: 'Video', kind: 'generate',
    inputs: [{ id: 'videos', label: 'Videos (in order)', type: 'video', multi: true }], outputs: [{ id: 'video', label: 'Video', type: 'video' }],
    params: [slider('overlap', 'Trim overlap (s)', 0, 3, 0.05, 0, { advanced: true })],
    description: 'Join several videos into one, in the order they are connected.' },
  { id: 'import-audio', title: 'Import Audio', category: 'Utility', kind: 'source', inputs: [], outputs: [{ id: 'audio', label: 'Audio', type: 'audio' }], params: [], description: 'Load an audio file (e.g. a recording for YuE2 Cover Music).' },
  { id: 'import', title: 'Load Image', category: 'Utility', kind: 'source', inputs: [], outputs: [{ id: 'image', label: 'Image', type: 'image' }], params: [], description: 'Load an image from your computer, or drop one on the canvas.' },
  { id: 'import-video', title: 'Load Video', category: 'Utility', kind: 'source', inputs: [], outputs: [{ id: 'video', label: 'Video', type: 'video' }], params: [], description: 'Load a video from your computer, or drop one on the canvas.' },
  { id: 'export', title: 'Export', category: 'Utility', kind: 'output', inputs: [{ id: 'image', label: 'Media', type: 'any' }], outputs: [], params: [text('name', 'File name', 'canvers')], description: 'Download the connected result.' },
  { id: 'preview', title: 'Result Viewer', category: 'Utility', kind: 'output', inputs: [{ id: 'image', label: 'Image / video / audio / text', type: 'any', optional: true }], outputs: [{ id: 'out', label: 'Pass through', type: 'any' }], params: [], description: 'Look at any image or text.' },
  { id: 'router', title: 'Router', category: 'Utility', kind: 'edit', inputs: [P.imgIn('image', 'In', false)], outputs: [P.imgOut('image', 'Out')], params: [], description: 'A pass-through to tidy wires.' },
  { id: 'compare', title: 'Compare', category: 'Utility', kind: 'output', inputs: [{ id: 'a', label: 'A', type: 'any' }, { id: 'b', label: 'B', type: 'any' }], outputs: [], params: [], description: 'Drag a slider between two images.' },
  { id: 'note', title: 'Sticky Note', category: 'Utility', kind: 'note', inputs: [], outputs: [], params: [text('text', 'Note', '', true)], description: 'A memo on the canvas.' },
  { id: 'number', title: 'Number', category: 'Data', kind: 'source', inputs: [], outputs: [{ id: 'value', label: 'Value', type: 'number' }], params: [num('value', 'Value', 0, {}, undefined, undefined, 1)], description: 'A number to wire into other nodes.' },
  { id: 'text-data', title: 'Text', category: 'Data', kind: 'source', inputs: [], outputs: [P.textOut()], params: [text('text', 'Text', '', true)], description: 'A fixed piece of text.' },
  { id: 'toggle', title: 'Toggle', category: 'Data', kind: 'source', inputs: [], outputs: [{ id: 'value', label: 'On', type: 'boolean' }], params: [toggle('value', 'On', true)], description: 'On / off switch.' },
  { id: 'seed-node', title: 'Seed', category: 'Data', kind: 'source', inputs: [], outputs: [{ id: 'value', label: 'Seed', type: 'number' }], params: [{ id: 'value', label: 'Seed', control: { kind: 'seed' }, default: 12345 }], description: 'One seed shared by several nodes.' },
];

export const byId = new Map(REGISTRY.map((n) => [n.id, n]));
export const CATEGORIES = ['Cards', 'Text / LLM', 'Image', 'Video', 'Postprocess', 'Audio', 'Workflow', 'Edit', 'Utility', 'Data', 'STUDIO ONE', 'TJ NODE'];

/** the params a node shows: the engine's own set when it has one, else the node's. */
export function paramsFor(def: NodeDef, engineId?: string): ParamDef[] {
  const eng = engineFor(def, engineId);
  return eng?.params ?? def.params;
}
export function engineFor(def: NodeDef, engineId?: string): EngineDef | undefined {
  return def.engines?.find((e) => e.id === engineId) ?? def.engines?.find((e) => e.default) ?? def.engines?.[0];
}

export function defaultParams(def: NodeDef, engineId?: string): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const p of paramsFor(def, engineId)) out[p.id] = p.default;
  return out;
}

/** Can an output of type `a` feed an input of type `b`? */
export function compatible(a: string, b: string): boolean {
  if (a === b || a === 'any' || b === 'any') return true;
  const imageLike = (t: string) => t === 'image' || t === 'mask';
  return imageLike(a) && imageLike(b);
}

/** called by the host once the STUDIO_ONE node panels are loaded: adds one catalogue entry per ONE STUDIO node */
export function registerHostDefs(defs: NodeDef[]) {
  for (const d of defs) { if (!byId.has(d.id)) { REGISTRY.push(d); byId.set(d.id, d); } }
}
