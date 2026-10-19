// Character Sheet (H3 Reference-to-Video): one 124-frame turnaround render, then a cheap grid-assembly graph that
// picks 8 frames (+ the reference photo as cell 0) into a contact sheet.
import { hasNode, addVideoSave } from './post';
import { h3Availability, resolveH3Models, h3Size, type L } from './h3';
import { FPS } from './ltx';

export const CHARSHEET_FRAMES = 124;
export const CHARSHEET_DEFAULT_FRAMES = [7, 22, 37, 52, 67, 82, 107, 118];
/** the second pass sigma curves of the reference workflow, by step count */
export const PASS2_SIGMAS: Record<number, string> = {
  3: '0.9035, 0.6316, 0.3158, 0.0000',
  4: '0.9035, 0.8000, 0.6316, 0.3158, 0.0000',
  5: '0.9231, 0.8780, 0.8000, 0.6316, 0.3158, 0.0000',
};

export const CHARSHEET_PROMPT =
  'subject_definitions:\n@image1 is <Subject 1>, Protagonist.\n\nstyle_definitions:\n@style is <Style 1>, @image1 High quality and detailed 3d anime'
  + '\n\nretention_analysis:\n<Subject 1>: fully_preserved the exact facial identity, anatomy, clothing, skin color, skin texture, skin shade, skin radiance and proportions of <Subject 1>. Never render @image1 as a shot.\n'
  + '<Style 1>: fully_preserved the artistic medium, line weight, shading, and texture across all angles.\n\ndetailed_description:\n'
  + 'The scene is a character model sheet on a seamless neutral white studio backdrop with even lighting. No border. @style is applied throughout. Start directly at Shot 1. \n  \n'
  + '[Shot 1]: Static full-body shot, front view from head to toe. <Subject 1> maintains a neutral pose and expression, arms relaxed at sides with empty open hands.\n'
  + '[[Shot 2] At 00:00.625]: Static full-body shot, back view from head to toe. <Subject 1> maintains a neutral pose and expression, arms relaxed at sides with empty open hands.\n'
  + '[[Shot 3] At 00:01.250]: Static full-body shot of <Subject 1>, showing left and right profile views. <Subject 1> maintains a neutral pose and expression, arms relaxed at sides with empty open hands.\n'
  + '[[Shot 4] At 00:01.875]: Static front_three_quarter view (framed from mid-thigh to top of head) of <Subject 1>. <Subject 1> maintains a neutral pose and expression, arms relaxed at sides with empty open hands.\n'
  + '[[Shot 5] At 00:02.500]: Static Back_three_quarter (framed from mid-thigh to top of head) of <Subject 1>. <Subject 1> maintains a neutral pose and expression, arms relaxed at sides with empty open hands.\n'
  + '[[Shot 6] At 00:03.125]: Static tight close-up shot of <Subject 1>, framed directly on the face from shoulders to top of head, facing front. <Subject 1> has a neutral expression.\n'
  + '[[Shot 7] At 00:03.750]: Static tight close-up shot of <Subject 1>, framed directly on the face from shoulders to top of head, facing front. <Subject 1> has a happy smile expression.\n'
  + '[[Shot 8] At 00:04.375]: Static tight close-up shot of <Subject 1>, framed directly on the face from shoulders to top of head, facing front. <Subject 1> has an very angry expression.\n\n\n'
  + 'overall_soundscape: N/A\nnon_diegetic_music: N/A\n';

export interface SheetJob {
  refs: string[]; refImageSize: string; prompt: string; aspect: string; megapixels: number;
  firstPassMp: number; latentUpscale: boolean; secondPassSteps: number;
  deblur: string; rtx: boolean; rtxSupersample: boolean;
  loras: { name: string; strength: number }[]; seed: number;
  models: Record<string, string>; saveSubfolder: string; stem: string;
}

export async function buildSheetVideoGraph(j: SheetJob): Promise<{ graph: Record<string, any>; save: string; width: number; height: number }> {
  if (!j.refs.length) throw new Error('Character Sheet needs at least one reference image');
  const m = await resolveH3Models(j.models, 'reference');
  if (!m.unet || !m.clip || !m.vaeVideo) throw new Error('Pick the MiniMax H3 reference model, text encoder and video VAE in Settings → Video models.');
  const avail = await h3Availability();
  const has = (n: string) => !!avail[n];
  const { width, height } = h3Size(j.aspect, j.megapixels);
  const pass = j.latentUpscale ? h3Size(j.aspect, j.firstPassMp) : { width, height };
  const g: Record<string, any> = {};
  g.unet = { class_type: 'UNETLoader', inputs: { unet_name: m.unet, weight_dtype: 'default' } };
  let model: L = ['unet', 0];
  if (has('PathchSageAttentionKJ')) { g.sage = { class_type: 'PathchSageAttentionKJ', inputs: { sage_attention: 'auto', allow_compile: false, model } }; model = ['sage', 0]; }
  if (has('MiniMaxH3MemoryEfficientSageAttentionPatch')) { g.mem = { class_type: 'MiniMaxH3MemoryEfficientSageAttentionPatch', inputs: { model } }; model = ['mem', 0]; }
  j.loras.forEach((l, i) => { if (l.name && l.name !== 'none' && l.strength > 0) { g[`lora${i}`] = { class_type: 'LoraLoaderModelOnly', inputs: { model, lora_name: l.name, strength_model: l.strength } }; model = [`lora${i}`, 0]; } });
  g.shift = { class_type: 'MiniMaxH3SigmaShift', inputs: { model, shift_video: 12, shift_audio: 3 } }; model = ['shift', 0];
  g.clip = { class_type: 'CLIPLoader', inputs: { clip_name: m.clip, type: 'minimax', device: 'default' } };
  g.vaeV = { class_type: 'VAELoader', inputs: { vae_name: m.vaeVideo } };
  const cond: Record<string, any> = { clip: ['clip', 0], vae: ['vaeV', 0], prompt: j.prompt, width: pass.width, height: pass.height, length: CHARSHEET_FRAMES, ref_image_size: j.refImageSize };
  j.refs.slice(0, 9).forEach((f, i) => { g[`ref${i}`] = { class_type: 'LoadImage', inputs: { image: f } }; cond[`ref_images.ref_image_${i}`] = [`ref${i}`, 0]; });
  g.cond = { class_type: 'MiniMaxH3ReferenceToVideo', inputs: cond };
  g.noise = { class_type: 'RandomNoise', inputs: { noise_seed: j.seed } };
  g.s1 = { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler' } };
  g.sched = { class_type: 'BasicScheduler', inputs: { scheduler: 'simple', steps: 8, denoise: 1, model } };
  g.guider = { class_type: 'BasicGuider', inputs: { model, conditioning: ['cond', 0] } };
  g.samp = { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: ['guider', 0], sampler: ['s1', 0], sigmas: ['sched', 0], latent_image: ['cond', 1] } };
  let samples: L = ['samp', 0];
  if (j.latentUpscale) {
    if (!has('MinimaxH3LatentUpscaler3D')) throw new Error('Latent upscale needs the MinimaxH3LatentUpscaler3D node.');
    g.sep = { class_type: 'LTXVSeparateAVLatent', inputs: { av_latent: ['samp', 1] } };
    g.up = { class_type: 'MinimaxH3LatentUpscaler3D', inputs: { model_name: 'minimax_h3_latent_upscaler_3d_bf16.safetensors', mode: 'target dimensions', 'mode.width': width, 'mode.height': height, align: 32, enable_temporal_chunking: true, force_unload: true, device: 'cuda', precision: 'fp16', latent: ['sep', 0] } };
    g.cat = { class_type: 'LTXVConcatAVLatent', inputs: { video_latent: ['up', 0], audio_latent: ['sep', 1] } };
    g.s2 = { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler' } };
    g.guider2 = { class_type: 'BasicGuider', inputs: { model, conditioning: ['cond', 0] } };
    g.sig2 = { class_type: 'ManualSigmas', inputs: { sigmas: PASS2_SIGMAS[j.secondPassSteps] ?? PASS2_SIGMAS[3] } };
    g.samp2 = { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: ['guider2', 0], sampler: ['s2', 0], sigmas: ['sig2', 0], latent_image: ['cat', 0] } };
    samples = ['samp2', 0];
  }
  g.dec = { class_type: 'VAEDecode', inputs: { samples, vae: ['vaeV', 0] } };
  let images: L = ['dec', 0];
  if (j.deblur && j.deblur !== 'none') {
    if (!(await hasNode('TJ_RTXDeblur'))) throw new Error('RTX Deblur (TJ_RTXDeblur) is not installed.');
    g.deblur = { class_type: 'TJ_RTXDeblur', inputs: { images, strength: j.deblur } }; images = ['deblur', 0];
  }
  if (j.rtx) {
    if (!(await hasNode('RTXVideoSuperResolution'))) throw new Error('RTX Video Super Resolution is not installed.');
    g.rtx = { class_type: 'RTXVideoSuperResolution', inputs: { images, resize_type: 'scale by multiplier', 'resize_type.scale': 2, quality: 'ULTRA' } }; images = ['rtx', 0];
    if (j.rtxSupersample) { g.down = { class_type: 'ImageScale', inputs: { image: images, upscale_method: 'lanczos', width, height, crop: 'center' } }; images = ['down', 0]; }
  }
  const save = await addVideoSave(g, images, undefined, FPS, `${j.saveSubfolder}/${j.stem}_charsheet_video`, 'C');
  return { graph: g, save, width, height };
}

export async function buildSheetGridGraph(o: { video: string; ref: string; frames: number[]; cellW: number; cellH: number; maxDim: number; saveEach: boolean; folder: string; stem: string }) {
  for (const n of ['BatchImagesNode', 'ImageGrid', 'ImageScaleToMaxDimension']) if (!(await hasNode(n))) throw new Error(`${n} is not installed (ComfyUI core is out of date).`);
  const g: Record<string, any> = {};
  g.load = { class_type: 'VHS_LoadVideo', inputs: { video: o.video, force_rate: 0, custom_width: 0, custom_height: 0, frame_load_cap: 0, skip_first_frames: 0, select_every_nth: 1 } };
  g.ref = { class_type: 'LoadImage', inputs: { image: o.ref } };
  g.refS = { class_type: 'ImageScale', inputs: { image: ['ref', 0], upscale_method: 'lanczos', width: o.cellW, height: o.cellH, crop: 'center' } };
  const batch: Record<string, any> = { 'images.image0': ['refS', 0] };
  const idx = (o.frames.length ? o.frames : CHARSHEET_DEFAULT_FRAMES).slice(0, 8);
  idx.forEach((n, i) => {
    g[`f${i}`] = { class_type: 'ImageFromBatch', inputs: { batch_index: n, length: 1, image: ['load', 0] } };
    batch[`images.image${i + 1}`] = [`f${i}`, 0];
    if (o.saveEach) g[`fs${i}`] = { class_type: 'SaveImage', inputs: { filename_prefix: `${o.folder}/${o.stem}_charsheet_shot${i + 1}`, images: [`f${i}`, 0] } };
  });
  g.batch = { class_type: 'BatchImagesNode', inputs: batch };
  g.grid = { class_type: 'ImageGrid', inputs: { columns: 3, cell_width: o.cellW, cell_height: o.cellH, padding: 8, images: ['batch', 0] } };
  g.max = { class_type: 'ImageScaleToMaxDimension', inputs: { upscale_method: 'area', largest_size: o.maxDim, image: ['grid', 0] } };
  g.save = { class_type: 'SaveImage', inputs: { filename_prefix: `${o.folder}/${o.stem}_charsheet`, images: ['max', 0] } };
  return { graph: g, save: 'save' };
}
