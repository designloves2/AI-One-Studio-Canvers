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
  { id: 'image-describer', title: 'Image Describer', category: 'Text / LLM', kind: 'llm',
    inputs: [P.imgIn()], outputs: [P.textOut()],
    params: [sel('task', 'Describe as', ['Plain description', 'Generation prompt', 'Booru-style tags', 'Pose & anatomy'], 'Generation prompt'), text('guidelines', 'Extra guidelines', '', true)],
    description: 'Turns an image into text with a vision model.' },

  // ============================================================ Image generation
  { id: 'image-generate', title: 'Image Generate', category: 'Image', kind: 'generate',
    inputs: [P.textIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
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
    inputs: [P.textIn(), P.imgIn('image', 'Images', false, true), P.seedIn()], outputs: [P.imgOut()], params: [],
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
  { id: 'inpaint', title: 'Inpaint', category: 'Image', kind: 'generate',
    inputs: [P.textIn(), P.imgIn(), P.maskIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
    engines: [
      { ...zimage('zimage', 'Z-Image Turbo (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 0.85)]), default: true },
      klein('klein', 'Flux.2 Klein (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 1)]),
      sdxl('sdxl', 'SDXL (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 0.85)]),
      qwen('qwen', 'Qwen Image Edit 2511 (local)', [slider('denoise', 'Denoise', 0.05, 1, 0.05, 0.85)]),
    ], description: 'Repaint the white area of a mask.' },
  { id: 'outpaint', title: 'Outpaint', category: 'Image', kind: 'generate',
    inputs: [P.textIn('prompt', 'Prompt', true), P.imgIn(), P.seedIn()], outputs: [P.imgOut()], params: [],
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
    inputs: [P.imgIn()], outputs: [P.imgOut()], params: [],
    engines: [{ id: 'esrgan', label: 'Upscale model (ComfyUI core)', family: 'core', default: true, params: [dyn('upscale_model', 'Model', 'upscalers', 'none'), slider('scale_by', 'Final scale', 0.25, 4, 0.25, 1, { advanced: true })] }],
    description: 'Enlarge with an ESRGAN-type model from ComfyUI/models/upscale_models.' },
  { id: 'music-generate', title: 'Music Generate', category: 'Audio', kind: 'generate',
    inputs: [P.textIn('prompt', 'Style', false), P.textIn('lyrics', 'Lyrics', true), { id: 'cover', label: 'Cover source', type: 'audio', optional: true }, P.seedIn()], outputs: [{ id: 'audio', label: 'Audio', type: 'audio' }],
    params: [], engines: [
      { id: 'acestep', label: 'Ace-Step 1.5 (local)', family: 'music', default: true, params: [slider('seconds', 'Length (s)', 5, 300, 1, 60), num('bpm', 'BPM', 120, {}, 40, 240, 1), text('keyscale', 'Key', 'A minor'), sel('timesignature', 'Time signature', ['2', '3', '4', '6'], '4', { advanced: true }), sel('language', 'Language', ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de'], 'en', { advanced: true }), sel('format', 'Format', ['flac', 'mp3', 'opus'], 'flac', { advanced: true }), slider('steps1', 'Stage 1 steps', 1, 60, 1, 30, { advanced: true }), slider('steps2', 'Stage 2 steps (0 = off)', 0, 60, 1, 20, { advanced: true }), slider('steps3', 'Stage 3 steps (0 = off)', 0, 60, 1, 15, { advanced: true }), slider('cfg', 'Guidance', 0, 10, 0.1, 1, { advanced: true }), seed] },
      { id: 'yue2', label: 'YuE2 — text / cover music (local)', family: 'music', params: [slider('seconds', 'Length (s)', 10, 300, 1, 60), sel('format', 'Format', ['flac', 'mp3', 'opus'], 'flac', { advanced: true }), slider('temperature', 'Temperature', 0.1, 2, 0.05, 1, { advanced: true }), slider('top_p', 'Top-p', 0.1, 1, 0.01, 0.95, { advanced: true }), num('top_k', 'Top-k', 100, { advanced: true }, 1, 500, 1), slider('repetition', 'Repetition penalty', 1, 2, 0.01, 1.2, { advanced: true }), seed] },
      { id: 'minimax', label: 'MiniMax Music 3 (local)', family: 'music', params: [slider('seconds', 'Length (s)', 5, 300, 1, 60), sel('format', 'Format', ['flac', 'mp3', 'opus'], 'flac', { advanced: true }), slider('steps1', 'Steps', 1, 80, 1, 30, { advanced: true }), slider('cfg', 'Guidance', 0, 10, 0.1, 1.7, { advanced: true }), seed] },
    ], description: 'Songs and instrumentals. Style prompt (+ optional lyrics) in, audio out. Models: Settings → Music models.' },
  { id: 'comfy-workflow', title: 'ComfyUI Workflow', category: 'Workflow', kind: 'generate',
    inputs: [P.textIn('prompt', 'Prompt', true), P.imgIn('image', 'Images', true, true), { id: 'video', label: 'Video', type: 'video', optional: true }, P.seedIn()],
    outputs: [P.imgOut('image', 'Image'), { id: 'video', label: 'Video', type: 'video' }],
    params: [text('workflow', 'Workflow JSON', '', true, { advanced: true }), text('prompt_target', 'Prompt field', '', false, { advanced: true }), text('image_target', 'Image 1 field', '', false, { advanced: true }), text('image2_target', 'Image 2 field', '', false, { advanced: true }), text('video_target', 'Video field', '', false, { advanced: true }), text('seed_target', 'Seed field', '', false, { advanced: true }), { id: 'seed', label: 'Seed', control: { kind: 'seed' }, default: -1, advanced: true }],
    description: 'Run any API-format ComfyUI workflow (video, LTX, H3, Wan…). Load the JSON, pick which fields take the prompt / images / seed.' },
  { id: 'video-generate', title: 'Video Generate', category: 'Video', kind: 'generate',
    inputs: [P.textIn('prompt', 'Prompt', false), P.imgIn('image', 'First frame / references', true, true), P.imgIn('last', 'Last frame', true), P.seedIn()], outputs: [{ id: 'video', label: 'Video', type: 'video' }], params: [],
    engines: [
      { id: 'h3', label: 'MiniMax H3 — text / first-last frame (local)', family: 'h3', default: true, params: [sel('aspect', 'Aspect ratio', [...ASPECTS, 'auto'], '16:9'), megapixels(0.9), slider('seconds', 'Length (s)', 5.2, 15, 0.5, 8), slider('steps', 'Steps (lower with a Turbo LoRA)', 1, 60, 1, 20, { advanced: true }), dyn('sampler', 'Sampler', 'samplers', 'er_sde', { advanced: true }), dyn('scheduler', 'Scheduler', 'schedulers', 'simple', { advanced: true }), dyn('turbo_lora', 'Turbo LoRA', 'loras:h3', 'none', { advanced: true }), ...loras('h3'), seed] },
      { id: 'h3-ref', label: 'MiniMax H3 — multi-reference (local)', family: 'h3', params: [sel('aspect', 'Aspect ratio', [...ASPECTS, 'auto'], '16:9'), megapixels(0.9), slider('seconds', 'Length (s)', 5.2, 15, 0.5, 8), slider('steps', 'Steps (lower with a Turbo LoRA)', 1, 60, 1, 20, { advanced: true }), dyn('sampler', 'Sampler', 'samplers', 'er_sde', { advanced: true }), dyn('scheduler', 'Scheduler', 'schedulers', 'simple', { advanced: true }), dyn('turbo_lora', 'Turbo LoRA', 'loras:h3', 'none', { advanced: true }), ...loras('h3'), seed] },
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
  { id: 'import-audio', title: 'Import Audio', category: 'Utility', kind: 'source', inputs: [], outputs: [{ id: 'audio', label: 'Audio', type: 'audio' }], params: [], description: 'Load an audio file (e.g. a recording for YuE2 Cover Music).' },
  { id: 'import', title: 'Import', category: 'Utility', kind: 'source', inputs: [], outputs: [{ id: 'image', label: 'Media', type: 'image' }], params: [], description: 'Load an image or video from your computer, or drop one on the canvas.' },
  { id: 'export', title: 'Export', category: 'Utility', kind: 'output', inputs: [P.imgIn('image', 'Media')], outputs: [], params: [text('name', 'File name', 'canvers')], description: 'Download the connected result.' },
  { id: 'preview', title: 'Preview', category: 'Utility', kind: 'output', inputs: [P.imgIn('image', 'Media', true)], outputs: [], params: [], description: 'Look at any image or text.' },
  { id: 'router', title: 'Router', category: 'Utility', kind: 'edit', inputs: [P.imgIn('image', 'In', false)], outputs: [P.imgOut('image', 'Out')], params: [], description: 'A pass-through to tidy wires.' },
  { id: 'compare', title: 'Compare', category: 'Utility', kind: 'output', inputs: [P.imgIn('a', 'A'), P.imgIn('b', 'B')], outputs: [], params: [], description: 'Drag a slider between two images.' },
  { id: 'note', title: 'Sticky Note', category: 'Utility', kind: 'note', inputs: [], outputs: [], params: [text('text', 'Note', '', true)], description: 'A memo on the canvas.' },
  { id: 'number', title: 'Number', category: 'Data', kind: 'source', inputs: [], outputs: [{ id: 'value', label: 'Value', type: 'number' }], params: [num('value', 'Value', 0, {}, undefined, undefined, 1)], description: 'A number to wire into other nodes.' },
  { id: 'text-data', title: 'Text', category: 'Data', kind: 'source', inputs: [], outputs: [P.textOut()], params: [text('text', 'Text', '', true)], description: 'A fixed piece of text.' },
  { id: 'toggle', title: 'Toggle', category: 'Data', kind: 'source', inputs: [], outputs: [{ id: 'value', label: 'On', type: 'boolean' }], params: [toggle('value', 'On', true)], description: 'On / off switch.' },
  { id: 'seed-node', title: 'Seed', category: 'Data', kind: 'source', inputs: [], outputs: [{ id: 'value', label: 'Seed', type: 'number' }], params: [{ id: 'value', label: 'Seed', control: { kind: 'seed' }, default: 12345 }], description: 'One seed shared by several nodes.' },
];

export const byId = new Map(REGISTRY.map((n) => [n.id, n]));
export const CATEGORIES = ['Text / LLM', 'Image', 'Video', 'Audio', 'Workflow', 'Edit', 'Utility', 'Data'];

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
  if (a === b) return true;
  const imageLike = (t: string) => t === 'image' || t === 'mask';
  return imageLike(a) && imageLike(b);
}
