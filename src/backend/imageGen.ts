// Builds ComfyUI API graphs for the image families that STUDIO_ONE ships (Flux.2 Klein, Z-Image Turbo).
// Klein graphs start from the templates STUDIO_ONE serves; Z-Image graphs are assembled from core nodes.
import { getWorkflow, pickModels, type Family } from './studio';

export type ImageMode = 't2i' | 'i2i' | 'edit' | 'inpaint' | 'outpaint' | 'faceswap' | 'removebg' | 'controlnet' | 'facedraw';

export interface Lora { name: string; strength: number }

export interface ImageJob {
  family: Family;
  mode: ImageMode;
  prompt: string;
  negative: string;
  width: number;
  height: number;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
  seed: number;
  denoise: number;
  batch: number;
  /** ComfyUI input filenames: [0] = main image, [1] = second reference / face source */
  images: string[];
  mask?: string;
  pad: { left: number; top: number; right: number; bottom: number };
  loras: Lora[];
  models?: { model?: string; textEncoder?: string; vae?: string };
  saveSubfolder: string;
  /** background removal model file name (removebg) */
  bgModel?: string;
  /** Z-Image Fun ControlNet (controlnet / facedraw modes) */
  control?: { preprocessor: string; resolution: number; strength: number; patch: string };
  /** face redraw: detector + crop settings */
  face?: { detector: string; threshold: number; dilation: number; context: number; size: number };
}

export interface Built { graph: Record<string, any>; hint: string }

type G = Record<string, any>;
const set = (g: G, id: string, key: string, v: unknown) => { if (g[id]) g[id].inputs[key] = v; };
const isGguf = (n: string) => n.toLowerCase().endsWith('.gguf');

function unet(name: string): { class_type: string; inputs: G } {
  return isGguf(name)
    ? { class_type: 'UnetLoaderGGUF', inputs: { unet_name: name } }
    : { class_type: 'UNETLoader', inputs: { unet_name: name, weight_dtype: 'default' } };
}
function clip(name: string, type: string): { class_type: string; inputs: G } {
  return isGguf(name)
    ? { class_type: 'CLIPLoaderGGUF', inputs: { clip_name: name, type } }
    : { class_type: 'CLIPLoader', inputs: { clip_name: name, type, device: 'default' } };
}

/** Insert LoraLoaderModelOnly nodes; returns the final model link. */
function loraChain(g: G, src: [string, number], loras: Lora[], prefix: string): [string, number] {
  let prev = src;
  loras.forEach((l, i) => {
    if (!l.name || l.name === 'none' || !(l.strength > 0)) return;
    const id = `${prefix}lora${i}`;
    g[id] = { class_type: 'LoraLoaderModelOnly', inputs: { model: prev, lora_name: l.name, strength_model: l.strength } };
    prev = [id, 0];
  });
  return prev;
}

function saveNode(job: ImageJob, link: [string, number], tag: string) {
  return { class_type: 'SaveImage', inputs: { images: link, filename_prefix: `${job.saveSubfolder}/${tag}` } };
}

// ------------------------------------------------------------------------- Flux.2 Klein
const FK = { unet: 'FK:165', clip: 'FK:155', vae: 'FK:153', pos: 'FK:166', neg: 'FK:156', sampling: 'FK:169', latent: 'FK:170', sampler: 'FK:171', save: 'FK:86' };

function kleinCommon(g: G, job: ImageJob, m: { model: string; textEncoder: string; vae: string }, ids: { unet: string; clip: string; vae: string; sampling?: string; sampler: string; pos: string; neg?: string; save: string }, kvId?: string): [string, number] {
  g[ids.unet] = { ...g[ids.unet], ...unet(m.model), _meta: g[ids.unet]?._meta };
  g[ids.clip] = { ...g[ids.clip], ...clip(m.textEncoder, 'flux2'), _meta: g[ids.clip]?._meta };
  set(g, ids.vae, 'vae_name', m.vae);
  const useKv = /kv/i.test(m.model);
  let modelSrc: [string, number] = [ids.unet, 0];
  if (kvId) { if (useKv) { g[kvId].inputs.model = modelSrc; modelSrc = [kvId, 0]; } else { delete g[kvId]; } }
  else if (useKv) { g['FK:KV'] = { class_type: 'FluxKVCache', inputs: { model: modelSrc } }; modelSrc = ['FK:KV', 0]; }
  const out = loraChain(g, modelSrc, job.loras, 'FKL:');
  const sampling = ids.sampling ?? Object.keys(g).find((k) => g[k].class_type === 'ModelSamplingAuraFlow');
  if (sampling) set(g, sampling, 'model', out); else set(g, ids.sampler, 'model', out);
  set(g, ids.pos, 'text', job.prompt);
  if (ids.neg) set(g, ids.neg, 'text', job.negative);
  const s = ids.sampler;
  set(g, s, 'seed', job.seed); set(g, s, 'steps', job.steps); set(g, s, 'cfg', job.cfg);
  set(g, s, 'sampler_name', job.sampler); set(g, s, 'scheduler', job.scheduler);
  g[ids.save].inputs.filename_prefix = `${job.saveSubfolder}/FK`;
  return out;
}

async function buildKlein(job: ImageJob, m: { model: string; textEncoder: string; vae: string }): Promise<Built> {
  const f: Family = 'klein';
  const need = (n: number, what: string) => { if (job.images.length < n) throw new Error(`${what} is required`); };

  if (job.mode === 't2i') {
    const g = await getWorkflow(f, 't2i');
    kleinCommon(g, job, m, { ...FK, sampling: FK.sampling }, undefined);
    set(g, FK.latent, 'width', job.width); set(g, FK.latent, 'height', job.height); set(g, FK.latent, 'batch_size', job.batch);
    set(g, FK.sampler, 'denoise', 1);
    return { graph: g, hint: 'Klein T2I' };
  }
  if (job.mode === 'i2i') {
    need(1, 'Source image');
    const g = await getWorkflow(f, 'i2i');
    kleinCommon(g, job, m, { ...FK }, undefined);
    set(g, 'FKI2I:img', 'image', job.images[0]);
    if (job.width > 0 && job.height > 0) {
      g['FKI2I:scale'] = { class_type: 'ImageScale', inputs: { image: ['FKI2I:img', 0], width: job.width, height: job.height, upscale_method: 'lanczos', crop: 'disabled' } };
      set(g, 'FKI2I:vae', 'pixels', ['FKI2I:scale', 0]);
    }
    set(g, FK.sampler, 'denoise', job.denoise);
    return { graph: g, hint: 'Klein I2I' };
  }
  if (job.mode === 'edit' || job.mode === 'outpaint') {
    need(1, 'Image 1');
    const g = await getWorkflow(f, 'edit');
    kleinCommon(g, job, m, { ...FK }, undefined);
    set(g, 'FK:91', 'image', job.images[0]);
    set(g, FK.sampler, 'denoise', 1);
    if (job.mode === 'outpaint') {
      const { left, top, right, bottom } = job.pad;
      if (left + top + right + bottom <= 0) throw new Error('Set at least one expansion above 0 px');
      set(g, FK.pos, 'text', `Extend the composition of this image. Replace all black areas with a logical continuation of the background and foreground. Ensure the transition is invisible and the new elements match the perspective and color palette of the original. Scene description: ${job.prompt}`);
      g['FKO:pad'] = { class_type: 'ImagePadKJ', inputs: { image: ['FK:91', 0], left, top, right, bottom, extra_padding: 0, pad_mode: 'color', color: '0, 0, 0' } };
      set(g, 'FK:163', 'image', ['FKO:pad', 0]);
      set(g, 'FK:167', 'image', ['FK:163', 0]);
      for (const id of ['FK:88', 'FK:163b', 'FK:232', 'FK:233', 'FK:231']) delete g[id];
      set(g, FK.sampler, 'positive', ['FK:133', 0]); set(g, FK.sampler, 'negative', ['FK:131', 0]);
      return { graph: g, hint: 'Klein Outpaint (needs ComfyUI-KJNodes)' };
    }
    if (job.images[1]) {
      set(g, 'FK:88', 'image', job.images[1]);
    } else {
      for (const id of ['FK:88', 'FK:163b', 'FK:232', 'FK:233', 'FK:231']) delete g[id];
      set(g, FK.sampler, 'positive', ['FK:133', 0]); set(g, FK.sampler, 'negative', ['FK:131', 0]);
    }
    return { graph: g, hint: 'Klein Edit' };
  }
  if (job.mode === 'inpaint') {
    need(1, 'Source image');
    if (!job.mask) throw new Error('A mask is required');
    const g = await getWorkflow(f, 'inpaint');
    const I = { unet: 'FKI:194', clip: 'FKI:195', vae: 'FKI:196', pos: 'FKI:6', sampler: 'FKI:163', save: 'FKI:203' };
    const out = kleinCommon(g, job, m, { ...I, sampling: 'FKI:__none' }, 'FKI:216');
    set(g, 'FKI:163', 'model', out); // the template feeds the sampler from the KV node; follow the LoRA chain instead
    set(g, 'FKI:198', 'image', job.images[0]); set(g, 'FKI:199', 'image', job.mask);
    set(g, 'FKI:163', 'denoise', job.denoise);
    return { graph: g, hint: 'Klein Inpaint (needs Inpaint-CropAndStitch)' };
  }
  if (job.mode === 'faceswap') {
    need(2, 'Target image and face source');
    const g = await getWorkflow(f, 'faceswap');
    const W = { unet: 'FKF:225', clip: 'FKF:223', vae: 'FKF:235', sampling: 'FKF:239', sampler: 'FKF:228', pos: 'FKF:227', save: 'FKF:232' };
    g[W.unet] = { ...g[W.unet], ...unet(m.model) }; g[W.clip] = { ...g[W.clip], ...clip(m.textEncoder, 'flux2') };
    set(g, W.vae, 'vae_name', m.vae);
    set(g, 'FKF:234', 'image', job.images[0]); set(g, 'FKF:236', 'image', job.images[1]);
    const face = job.loras.find((l) => l.name && l.name !== 'none' && l.strength > 0);
    if (face) { set(g, 'FKF:226', 'lora_name', face.name); set(g, 'FKF:226', 'strength_model', face.strength); }
    else { delete g['FKF:226']; set(g, W.sampling, 'model', [W.unet, 0]); }
    if (job.prompt.trim()) set(g, W.pos, 'text', job.prompt);
    const s = W.sampler;
    set(g, s, 'seed', job.seed); set(g, s, 'steps', job.steps); set(g, s, 'cfg', job.cfg);
    set(g, s, 'sampler_name', job.sampler); set(g, s, 'scheduler', job.scheduler); set(g, s, 'denoise', job.denoise);
    g[W.save].inputs.filename_prefix = `${job.saveSubfolder}/FK`;
    return { graph: g, hint: 'Klein Face Swap' };
  }
  throw new Error(`Flux.2 Klein has no "${job.mode}" mode`);
}

// ------------------------------------------------------------------------- Z-Image Turbo
function zBase(job: ImageJob, m: { model: string; textEncoder: string; vae: string }, diffDiff = false) {
  const g: G = {};
  g['Z:unet'] = unet(m.model);
  g['Z:clip'] = clip(m.textEncoder, 'lumina2');
  g['Z:vae'] = { class_type: 'VAELoader', inputs: { vae_name: m.vae } };
  const model = loraChain(g, ['Z:unet', 0], job.loras, 'Z:');
  g['Z:sampling'] = { class_type: 'ModelSamplingAuraFlow', inputs: { model, shift: 3 } };
  let modelOut: [string, number] = ['Z:sampling', 0];
  if (diffDiff) { g['Z:dd'] = { class_type: 'DifferentialDiffusion', inputs: { model: modelOut } }; modelOut = ['Z:dd', 0]; }
  g['Z:pos'] = { class_type: 'CLIPTextEncode', inputs: { clip: ['Z:clip', 0], text: job.prompt } };
  g['Z:neg'] = job.negative.trim()
    ? { class_type: 'CLIPTextEncode', inputs: { clip: ['Z:clip', 0], text: job.negative } }
    : { class_type: 'ConditioningZeroOut', inputs: { conditioning: ['Z:pos', 0] } };
  return { g, modelOut };
}

function zSampler(job: ImageJob, modelOut: [string, number], latent: [string, number], denoise: number) {
  return {
    class_type: 'KSampler',
    inputs: {
      model: modelOut, positive: ['Z:pos', 0], negative: ['Z:neg', 0], latent_image: latent,
      seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise,
    },
  };
}

function buildZImage(job: ImageJob, m: { model: string; textEncoder: string; vae: string }): Built {
  const finish = (g: G, from: [string, number]) => {
    g['Z:decode'] = { class_type: 'VAEDecode', inputs: { samples: from, vae: ['Z:vae', 0] } };
    g['Z:save'] = saveNode(job, ['Z:decode', 0], 'ZIT');
    return g;
  };
  if (job.mode === 't2i') {
    const { g, modelOut } = zBase(job, m);
    g['Z:latent'] = { class_type: 'EmptySD3LatentImage', inputs: { width: job.width, height: job.height, batch_size: job.batch } };
    g['Z:sampler'] = zSampler(job, modelOut, ['Z:latent', 0], 1);
    return { graph: finish(g, ['Z:sampler', 0]), hint: 'Z-Image T2I' };
  }
  if (job.mode === 'i2i' || job.mode === 'edit') {
    if (!job.images[0]) throw new Error('Source image is required');
    const { g, modelOut } = zBase(job, m);
    g['Z:load'] = { class_type: 'LoadImage', inputs: { image: job.images[0] } };
    let pix: [string, number] = ['Z:load', 0];
    if (job.width > 0 && job.height > 0) { g['Z:scale'] = { class_type: 'ImageScale', inputs: { image: pix, width: job.width, height: job.height, upscale_method: 'lanczos', crop: 'disabled' } }; pix = ['Z:scale', 0]; }
    g['Z:enc'] = { class_type: 'VAEEncode', inputs: { pixels: pix, vae: ['Z:vae', 0] } };
    g['Z:sampler'] = zSampler(job, modelOut, ['Z:enc', 0], job.denoise);
    return { graph: finish(g, ['Z:sampler', 0]), hint: 'Z-Image I2I' };
  }
  if (job.mode === 'inpaint') {
    if (!job.images[0]) throw new Error('Source image is required');
    if (!job.mask) throw new Error('A mask is required');
    const { g, modelOut } = zBase(job, m, true);
    g['Z:load'] = { class_type: 'LoadImage', inputs: { image: job.images[0] } };
    g['Z:loadMask'] = { class_type: 'LoadImage', inputs: { image: job.mask } };
    g['Z:mask'] = { class_type: 'ImageToMask', inputs: { image: ['Z:loadMask', 0], channel: 'red' } };
    g['Z:enc'] = { class_type: 'VAEEncode', inputs: { pixels: ['Z:load', 0], vae: ['Z:vae', 0] } };
    g['Z:noise'] = { class_type: 'SetLatentNoiseMask', inputs: { samples: ['Z:enc', 0], mask: ['Z:mask', 0] } };
    g['Z:sampler'] = zSampler(job, modelOut, ['Z:noise', 0], job.denoise);
    return { graph: finish(g, ['Z:sampler', 0]), hint: 'Z-Image Inpaint' };
  }
  if (job.mode === 'outpaint') {
    if (!job.images[0]) throw new Error('Source image is required');
    const { left, top, right, bottom } = job.pad;
    if (left + top + right + bottom <= 0) throw new Error('Set at least one expansion above 0 px');
    const { g, modelOut } = zBase(job, m, true);
    g['Z:load'] = { class_type: 'LoadImage', inputs: { image: job.images[0] } };
    g['Z:pad'] = { class_type: 'ImagePadForOutpaint', inputs: { image: ['Z:load', 0], left, top, right, bottom, feathering: 32 } };
    g['Z:enc'] = { class_type: 'VAEEncode', inputs: { pixels: ['Z:pad', 0], vae: ['Z:vae', 0] } };
    g['Z:noise'] = { class_type: 'SetLatentNoiseMask', inputs: { samples: ['Z:enc', 0], mask: ['Z:pad', 1] } };
    g['Z:sampler'] = zSampler(job, modelOut, ['Z:noise', 0], 1);
    return { graph: finish(g, ['Z:sampler', 0]), hint: 'Z-Image Outpaint' };
  }
  if (job.mode === 'controlnet' || job.mode === 'facedraw') {
    const c = job.control; if (!c || !c.patch || c.patch === 'none') throw new Error('Pick the Z-Image ControlNet model patch (ModelPatchLoader) on the card');
    if (!job.images[0]) throw new Error('Source image is required');
    const { g } = zBase(job, m);
    // the ControlNet patch replaces the plain AuraFlow sampling chain; it patches the LoRA'd model
    const modelIn = g['Z:sampling'].inputs.model as [string, number];
    delete g['Z:sampling'];
    g['Z:load'] = { class_type: 'LoadImage', inputs: { image: job.images[0] } };
    let src: [string, number] = ['Z:load', 0];
    let crop = false;
    if (job.mode === 'facedraw') {
      const f = job.face!; if (!f.detector || f.detector === 'none') throw new Error('Pick a face detector on the card');
      g['Z:bbox'] = { class_type: 'UltralyticsDetectorProvider', inputs: { model_name: f.detector } };
      g['Z:faceMask'] = { class_type: 'BboxDetectorCombined_v2', inputs: { bbox_detector: ['Z:bbox', 0], image: src, threshold: f.threshold, dilation: f.dilation } };
      g['Z:crop'] = { class_type: 'InpaintCropImproved', inputs: { image: src, mask: ['Z:faceMask', 0], downscale_algorithm: 'bilinear', upscale_algorithm: 'bicubic', preresize: false, preresize_mode: 'ensure minimum resolution', preresize_min_width: 1024, preresize_min_height: 1024, preresize_max_width: 16384, preresize_max_height: 16384, mask_fill_holes: true, mask_expand_pixels: 0, mask_invert: false, mask_blend_pixels: 32, mask_hipass_filter: 0.1, extend_for_outpainting: false, extend_up_factor: 1, extend_down_factor: 1, extend_left_factor: 1, extend_right_factor: 1, context_from_mask_extend_factor: f.context, output_resize_to_target_size: true, output_target_width: f.size, output_target_height: f.size, output_padding: '32', device_mode: 'gpu (much faster)' } };
      src = ['Z:crop', 1]; crop = true;
    }
    g['Z:pre'] = { class_type: 'AIO_Preprocessor', inputs: { image: src, preprocessor: c.preprocessor, resolution: c.resolution } };
    g['Z:patch'] = { class_type: 'ModelPatchLoader', inputs: { name: c.patch } };
    g['Z:cn'] = { class_type: 'ZImageFunControlnet', inputs: { model: modelIn, model_patch: ['Z:patch', 0], vae: ['Z:vae', 0], positive: ['Z:pos', 0], negative: ['Z:neg', 0], strength: c.strength, image: ['Z:pre', 0] } };
    g['Z:sampling'] = { class_type: 'ModelSamplingAuraFlow', inputs: { model: ['Z:cn', 0], shift: 3 } };
    let latent: [string, number];
    if (crop) {
      g['Z:enc'] = { class_type: 'VAEEncode', inputs: { pixels: ['Z:crop', 1], vae: ['Z:vae', 0] } };
      g['Z:noise'] = { class_type: 'SetLatentNoiseMask', inputs: { samples: ['Z:enc', 0], mask: ['Z:crop', 2] } };
      latent = ['Z:noise', 0];
    } else {
      g['Z:size'] = { class_type: 'GetImageSize', inputs: { image: ['Z:pre', 0] } };
      g['Z:latent'] = { class_type: 'EmptySD3LatentImage', inputs: { width: ['Z:size', 0], height: ['Z:size', 1], batch_size: job.batch } };
      latent = ['Z:latent', 0];
    }
    g['Z:sampler'] = { class_type: 'KSampler', inputs: { model: ['Z:sampling', 0], positive: ['Z:cn', 1], negative: ['Z:cn', 2], latent_image: latent, seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise: crop ? job.denoise : 1 } };
    g['Z:decode'] = { class_type: 'VAEDecode', inputs: { samples: ['Z:sampler', 0], vae: ['Z:vae', 0] } };
    let out: [string, number] = ['Z:decode', 0];
    if (crop) { g['Z:stitch'] = { class_type: 'InpaintStitchImproved', inputs: { stitcher: ['Z:crop', 0], inpainted_image: out } }; out = ['Z:stitch', 0]; }
    g['Z:save'] = saveNode(job, out, 'ZIT');
    return { graph: g, hint: crop ? 'Z-Image Face Redraw' : 'Z-Image ControlNet' };
  }
  throw new Error(`Z-Image Turbo has no "${job.mode}" mode`);
}

// ------------------------------------------------------------------------- Krea 2
function buildKrea2(job: ImageJob, m: { model: string; textEncoder: string; vae: string }, anima = false): Built {
  const label = anima ? 'Anima' : 'Krea 2';
  if (job.mode !== 't2i' && job.mode !== 'i2i' && job.mode !== 'edit') throw new Error(`${label} has no "${job.mode}" mode`);
  const g: G = {};
  g['K:unet'] = isGguf(m.model) && !anima ? { class_type: 'TJ_NODE_Krea2UnetLoaderGGUF', inputs: { unet_name: m.model } } : unet(m.model);
  g['K:clip'] = isGguf(m.textEncoder) && !anima ? { class_type: 'TJ_NODE_Krea2ClipLoaderGGUF', inputs: { clip_name: m.textEncoder } } : clip(m.textEncoder, anima ? 'stable_diffusion' : 'krea2');
  g['K:vae'] = { class_type: 'VAELoader', inputs: { vae_name: m.vae } };
  const model = loraChain(g, ['K:unet', 0], job.loras, 'K:');
  g['K:pos'] = { class_type: 'CLIPTextEncode', inputs: { clip: ['K:clip', 0], text: job.prompt } };
  g['K:neg'] = job.negative.trim()
    ? { class_type: 'CLIPTextEncode', inputs: { clip: ['K:clip', 0], text: job.negative } }
    : { class_type: 'ConditioningZeroOut', inputs: { conditioning: ['K:pos', 0] } };
  let latent: [string, number];
  let denoise = 1;
  if (job.mode === 't2i') {
    g['K:latent'] = { class_type: 'EmptyLatentImage', inputs: { width: job.width, height: job.height, batch_size: job.batch } };
    latent = ['K:latent', 0];
  } else {
    if (!job.images[0]) throw new Error('Source image is required');
    g['K:load'] = { class_type: 'LoadImage', inputs: { image: job.images[0] } };
    let pix: [string, number] = ['K:load', 0];
    if (job.width > 0 && job.height > 0) { g['K:scale'] = { class_type: 'ImageScale', inputs: { image: pix, width: job.width, height: job.height, upscale_method: 'lanczos', crop: 'disabled' } }; pix = ['K:scale', 0]; }
    g['K:enc'] = { class_type: 'VAEEncode', inputs: { pixels: pix, vae: ['K:vae', 0] } };
    latent = ['K:enc', 0]; denoise = job.denoise;
  }
  g['K:sampler'] = {
    class_type: 'KSampler',
    inputs: { model, positive: ['K:pos', 0], negative: ['K:neg', 0], latent_image: latent, seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise },
  };
  g['K:decode'] = { class_type: 'VAEDecode', inputs: { samples: ['K:sampler', 0], vae: ['K:vae', 0] } };
  g['K:save'] = saveNode(job, ['K:decode', 0], anima ? 'Anima' : 'K2');
  return { graph: g, hint: `${label} ${job.mode.toUpperCase()}` };
}

// ------------------------------------------------------------------------- Qwen Image Edit 2511
function buildQwen(job: ImageJob, m: { model: string; textEncoder: string; vae: string }): Built {
  const g: G = {};
  g['QE:unet'] = unet(m.model);
  g['QE:clip'] = { class_type: 'CLIPLoader', inputs: { clip_name: m.textEncoder, type: 'qwen_image', device: 'default' } };
  g['QE:vae'] = { class_type: 'VAELoader', inputs: { vae_name: m.vae } };
  const model = loraChain(g, ['QE:unet', 0], job.loras, 'QE:');
  g['QE:samp'] = { class_type: 'ModelSamplingAuraFlow', inputs: { model, shift: 3.1 } };
  g['QE:cfgnorm'] = { class_type: 'CFGNorm', inputs: { model: ['QE:samp', 0], strength: 1.0 } };
  const vae: [string, number] = ['QE:vae', 0];

  const refs = job.mode === 't2i' ? [] : job.images.slice(0, 3);
  if (job.mode !== 't2i' && !refs.length) throw new Error('Source image is required');
  refs.forEach((img, i) => {
    g[`QE:load${i}`] = { class_type: 'LoadImage', inputs: { image: img } };
    g[`QE:scale${i}`] = { class_type: 'FluxKontextImageScale', inputs: { image: [`QE:load${i}`, 0] } };
  });
  if (refs.length) g['QE:enc'] = { class_type: 'VAEEncode', inputs: { pixels: ['QE:scale0', 0], vae } };
  const cond = (id: string, text: string, n: number) => {
    const inputs: G = { clip: ['QE:clip', 0], vae, prompt: text };
    for (let k = 0; k < n; k++) inputs[`image${k + 1}`] = [`QE:scale${k}`, 0];
    g[id] = { class_type: 'TextEncodeQwenImageEditPlus', inputs };
  };
  cond('QE:pos', job.prompt, refs.length); cond('QE:neg', job.negative, Math.min(1, refs.length));
  let pos: [string, number] = ['QE:pos', 0], neg: [string, number] = ['QE:neg', 0];
  if (refs.length) {
    g['QE:rpos'] = { class_type: 'FluxKontextMultiReferenceLatentMethod', inputs: { conditioning: pos, reference_latents_method: 'index_timestep_zero' } };
    g['QE:rneg'] = { class_type: 'FluxKontextMultiReferenceLatentMethod', inputs: { conditioning: neg, reference_latents_method: 'index_timestep_zero' } };
    pos = ['QE:rpos', 0]; neg = ['QE:rneg', 0];
  }
  let latent: [string, number], denoise = 1;
  if (job.mode === 't2i') {
    g['QE:latent'] = { class_type: 'EmptyLatentImage', inputs: { width: job.width, height: job.height, batch_size: job.batch } };
    latent = ['QE:latent', 0];
  } else if (job.mode === 'inpaint') {
    if (!job.mask) throw new Error('A mask is required');
    g['QE:maskImg'] = { class_type: 'LoadImage', inputs: { image: job.mask } };
    g['QE:mask'] = { class_type: 'ImageToMask', inputs: { image: ['QE:maskImg', 0], channel: 'red' } };
    g['QE:nm'] = { class_type: 'SetLatentNoiseMask', inputs: { samples: ['QE:enc', 0], mask: ['QE:mask', 0] } };
    latent = ['QE:nm', 0]; denoise = job.denoise;
  } else {
    latent = ['QE:enc', 0]; denoise = job.mode === 'i2i' ? job.denoise : 1;
  }
  g['QE:sampler'] = { class_type: 'KSampler', inputs: { model: ['QE:cfgnorm', 0], positive: pos, negative: neg, latent_image: latent, seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise } };
  g['QE:decode'] = { class_type: 'VAEDecode', inputs: { samples: ['QE:sampler', 0], vae } };
  g['QE:save'] = saveNode(job, ['QE:decode', 0], 'QE');
  return { graph: g, hint: `Qwen Edit ${job.mode.toUpperCase()}` };
}

// ------------------------------------------------------------------------- Qwen Image 2.1
function buildQwen21(job: ImageJob, m: { model: string; textEncoder: string; vae: string }): Built {
  if (!['t2i', 'i2i', 'edit'].includes(job.mode)) throw new Error(`Qwen Image 2.1 has no "${job.mode}" mode`);
  const g: G = {};
  g['Q21:unet'] = unet(m.model);
  g['Q21:clip'] = { class_type: 'CLIPLoader', inputs: { clip_name: m.textEncoder, type: 'qwen_image', device: 'default' } };
  g['Q21:vae'] = { class_type: 'VAELoader', inputs: { vae_name: m.vae } };
  const model = loraChain(g, ['Q21:unet', 0], job.loras, 'Q21:');
  const w = job.width > 0 ? job.width : 1024, h = job.height > 0 ? job.height : 1024;
  g['Q21:samp'] = { class_type: 'ModelSamplingFlux', inputs: { model, max_shift: 0.69, base_shift: 0.5, width: w, height: h } };
  g['Q21:cache'] = { class_type: 'QwenImage21Cache', inputs: { model: ['Q21:samp', 0], device: 'auto', dtype: 'default' } };
  const enc: G = { clip: ['Q21:clip', 0], vae: ['Q21:vae', 0], prompt: job.prompt, negative_prompt: job.negative, resolution: Math.max(w, h) };
  const refs = job.mode === 't2i' ? [] : job.images.slice(0, 10);
  if (job.mode !== 't2i' && !refs.length) throw new Error('Source image is required');
  refs.forEach((img, i) => { g[`Q21:img${i}`] = { class_type: 'LoadImage', inputs: { image: img } }; enc[`images.image_${i + 1}`] = [`Q21:img${i}`, 0]; });
  g['Q21:enc'] = { class_type: 'TextEncodeQwenImage21', inputs: enc };
  let latent: [string, number] = ['Q21:enc', 2], denoise = job.mode === 'i2i' ? job.denoise : 1;
  if (job.mode === 't2i') { g['Q21:latent'] = { class_type: 'EmptyLatentImage', inputs: { width: w, height: h, batch_size: job.batch } }; latent = ['Q21:latent', 0]; }
  g['Q21:sampler'] = { class_type: 'KSampler', inputs: { model: ['Q21:cache', 0], positive: ['Q21:enc', 0], negative: ['Q21:enc', 1], latent_image: latent, seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise } };
  g['Q21:decode'] = { class_type: 'VAEDecode', inputs: { samples: ['Q21:sampler', 0], vae: ['Q21:vae', 0] } };
  g['Q21:save'] = saveNode(job, ['Q21:decode', 0], 'Q21');
  return { graph: g, hint: `Qwen 2.1 ${job.mode.toUpperCase()}` };
}

// ------------------------------------------------------------------------- SDXL (checkpoint)
function buildSdxl(job: ImageJob, m: { model: string }): Built {
  const g: G = {};
  g['SX:ckpt'] = { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: m.model } };
  let mo: [string, number] = ['SX:ckpt', 0], co: [string, number] = ['SX:ckpt', 1];
  job.loras.forEach((l, i) => {
    if (!l.name || l.name === 'none' || !(l.strength > 0)) return;
    const id = `SX:lora${i}`;
    g[id] = { class_type: 'LoraLoader', inputs: { model: mo, clip: co, lora_name: l.name, strength_model: l.strength, strength_clip: l.strength } };
    mo = [id, 0]; co = [id, 1];
  });
  g['SX:pos'] = { class_type: 'CLIPTextEncode', inputs: { text: job.prompt, clip: co } };
  g['SX:neg'] = { class_type: 'CLIPTextEncode', inputs: { text: job.negative, clip: co } };
  const vae: [string, number] = ['SX:ckpt', 2];
  const sampler = (model: [string, number], latent: [string, number], denoise: number) => ({
    class_type: 'KSampler',
    inputs: { model, positive: ['SX:pos', 0], negative: ['SX:neg', 0], latent_image: latent, seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise },
  });
  const need = () => { if (!job.images[0]) throw new Error('Source image is required'); g['SX:load'] = { class_type: 'LoadImage', inputs: { image: job.images[0] } }; };
  let modelOut = mo, latent: [string, number], denoise = 1;

  if (job.mode === 't2i') {
    g['SX:latent'] = { class_type: 'EmptyLatentImage', inputs: { width: job.width, height: job.height, batch_size: job.batch } };
    latent = ['SX:latent', 0];
  } else if (job.mode === 'i2i' || job.mode === 'edit') {
    need();
    let pix: [string, number] = ['SX:load', 0];
    if (job.width > 0 && job.height > 0) { g['SX:scale'] = { class_type: 'ImageScale', inputs: { image: pix, width: job.width, height: job.height, upscale_method: 'lanczos', crop: 'disabled' } }; pix = ['SX:scale', 0]; }
    g['SX:enc'] = { class_type: 'VAEEncode', inputs: { pixels: pix, vae } };
    latent = ['SX:enc', 0]; denoise = job.denoise;
  } else if (job.mode === 'inpaint') {
    need();
    if (!job.mask) throw new Error('A mask is required');
    g['SX:dd'] = { class_type: 'DifferentialDiffusion', inputs: { model: mo } }; modelOut = ['SX:dd', 0];
    g['SX:maskImg'] = { class_type: 'LoadImage', inputs: { image: job.mask } };
    g['SX:mask'] = { class_type: 'ImageToMask', inputs: { image: ['SX:maskImg', 0], channel: 'red' } };
    g['SX:enc'] = { class_type: 'VAEEncodeForInpaint', inputs: { pixels: ['SX:load', 0], vae, mask: ['SX:mask', 0], grow_mask_by: 6 } };
    latent = ['SX:enc', 0]; denoise = job.denoise;
  } else if (job.mode === 'outpaint') {
    need();
    const { left, top, right, bottom } = job.pad;
    if (left + top + right + bottom <= 0) throw new Error('Set at least one expansion above 0 px');
    g['SX:dd'] = { class_type: 'DifferentialDiffusion', inputs: { model: mo } }; modelOut = ['SX:dd', 0];
    g['SX:pad'] = { class_type: 'ImagePadForOutpaint', inputs: { image: ['SX:load', 0], left, top, right, bottom, feathering: 32 } };
    g['SX:enc0'] = { class_type: 'VAEEncode', inputs: { pixels: ['SX:pad', 0], vae } };
    g['SX:enc'] = { class_type: 'SetLatentNoiseMask', inputs: { samples: ['SX:enc0', 0], mask: ['SX:pad', 1] } };
    latent = ['SX:enc', 0];
  } else throw new Error(`SDXL has no "${job.mode}" mode`);

  g['SX:sampler'] = sampler(modelOut, latent, denoise);
  g['SX:decode'] = { class_type: 'VAEDecode', inputs: { samples: ['SX:sampler', 0], vae } };
  g['SX:save'] = saveNode(job, ['SX:decode', 0], 'SX');
  return { graph: g, hint: `SDXL ${job.mode.toUpperCase()}` };
}

// ------------------------------------------------------------------------- background removal
async function buildRemoveBg(job: ImageJob): Promise<Built> {
  if (!job.images[0]) throw new Error('Source image is required');
  const g = await getWorkflow('klein', 'remove_bg');
  set(g, 'rmbg:img', 'image', job.images[0]);
  if (job.bgModel) set(g, 'rmbg:load', 'bg_removal_name', job.bgModel);
  g['rmbg:save'].inputs.filename_prefix = `${job.saveSubfolder}/rmbg`;
  return { graph: g, hint: 'Remove background' };
}

export async function buildImageGraph(job: ImageJob): Promise<Built> {
  if (job.mode === 'removebg') return buildRemoveBg(job);
  const picked = await pickModels(job.family, job.models);
  if (!picked.model) throw new Error(`No ${job.family} diffusion model found. Pick one in Settings → Image models.`);
  const m = { model: picked.model, textEncoder: picked.textEncoder, vae: picked.vae };
  const withDefaults = { ...job, negative: job.negative || picked.negative };
  if (job.family === 'klein') return buildKlein(withDefaults, m);
  if (job.family === 'krea2') return buildKrea2(withDefaults, m);
  if (job.family === 'qwen21') return buildQwen21(withDefaults, m);
  if (job.family === 'qwen') return buildQwen(withDefaults, m);
  if (job.family === 'anima') return buildKrea2(withDefaults, m, true);
  if (job.family === 'sdxl') return buildSdxl(withDefaults, m);
  return buildZImage(withDefaults, m);
}
