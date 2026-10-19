// H3 Image Generator: a still from the H3 video model (8-frame clip, one frame read back).
// T2I (MiniMaxH3ImageToVideo) or Reference-to-Image (MiniMaxH3ReferenceToVideo); optional second pass through the
// latent upscaler; optional Fizgig single-frame latent.
import { hasNode } from './post';
import { effectiveTurbo, h3Availability, h3ModelChain, h3Size, resolveH3Models, DEFAULT_OPT, type H3Options, type L } from './h3';
import { PASS2_SIGMAS } from './charSheet';

const LENGTH = 8;
export interface H3ImageJob {
  refs: string[]; prompt: string; aspect: string; previewMp: number; finalMp: number; final: boolean;
  steps: number; secondPassSteps: number; fizgig: boolean; refImageSize: string;
  opt: H3Options; loras: { name: string; strength: number }[];
  seed: number; models: Record<string, string>; saveSubfolder: string; stem: string;
}

export async function buildH3ImageGraph(j: H3ImageJob): Promise<{ graph: Record<string, any>; save: string }> {
  const ref = j.refs.length > 0;
  const m = await resolveH3Models(j.models, ref ? 'reference' : 'firstlast');
  if (!m.unet || !m.clip || !m.vaeVideo) throw new Error('Pick the MiniMax H3 model, text encoder and video VAE in Settings → Video models.');
  if (!j.prompt.trim()) throw new Error('Prompt is empty');
  const avail = await h3Availability();
  const has = (n: string) => !!avail[n];
  if (j.fizgig && !((await hasNode('FizgigH3StillLatent')) && (await hasNode('FizgigH3StillDecode')))) throw new Error('Fizgig latent needs ComfyUI-Fizgig-H3-Still — install it or switch Fizgig off.');
  const preview = h3Size(j.aspect, j.previewMp), fin = h3Size(j.aspect, j.finalMp);
  const render = j.fizgig && j.final ? fin : preview;
  const turbo = effectiveTurbo({ ...DEFAULT_OPT, ...j.opt, hires: false }, has);
  const g: Record<string, any> = {};
  g.unet = { class_type: 'UNETLoader', inputs: { unet_name: m.unet, weight_dtype: 'default' } };
  const model = h3ModelChain(g, ['unet', 0], { ...DEFAULT_OPT, ...j.opt, hires: false }, turbo, j.loras, has);
  g.clip = { class_type: 'CLIPLoader', inputs: { clip_name: m.clip, type: 'minimax', device: 'default' } };
  g.vaeV = { class_type: 'VAELoader', inputs: { vae_name: m.vaeVideo } };
  const cond: Record<string, any> = { clip: ['clip', 0], vae: ['vaeV', 0], prompt: j.prompt, width: render.width, height: render.height, length: LENGTH };
  if (ref) {
    cond.ref_image_size = j.refImageSize;
    j.refs.slice(0, 9).forEach((f, i) => { g[`ref${i}`] = { class_type: 'LoadImage', inputs: { image: f } }; cond[`ref_images.ref_image_${i}`] = [`ref${i}`, 0]; });
    g.cond = { class_type: 'MiniMaxH3ReferenceToVideo', inputs: cond };
  } else g.cond = { class_type: 'MiniMaxH3ImageToVideo', inputs: cond };
  let start: L = ['cond', 1];
  if (j.fizgig) { g.fiz = { class_type: 'FizgigH3StillLatent', inputs: { width: render.width, height: render.height, batch_size: 1 } }; start = ['fiz', 0]; }
  const steps = turbo === 'none' ? Math.max(1, Math.round(j.steps)) : Math.max(1, Math.round(j.opt.turboSteps));
  g.noise = { class_type: 'RandomNoise', inputs: { noise_seed: j.seed } };
  g.s1 = { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler' } };
  g.sched = { class_type: 'BasicScheduler', inputs: { scheduler: 'simple', steps, denoise: 1, model } };
  g.guider = { class_type: 'BasicGuider', inputs: { model, conditioning: ['cond', 0] } };
  g.samp = { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: ['guider', 0], sampler: ['s1', 0], sigmas: ['sched', 0], latent_image: start } };
  let samples: L = ['samp', 0];
  if (j.final && !j.fizgig) {
    if (!has('MinimaxH3LatentUpscaler3D')) throw new Error('The 2nd pass needs the MinimaxH3LatentUpscaler3D node — or turn "High quality 2nd pass" off.');
    g.sep = { class_type: 'LTXVSeparateAVLatent', inputs: { av_latent: ['samp', 1] } };
    g.up = { class_type: 'MinimaxH3LatentUpscaler3D', inputs: { model_name: 'minimax_h3_latent_upscaler_3d_bf16.safetensors', mode: 'target dimensions', 'mode.width': fin.width, 'mode.height': fin.height, align: 32, enable_temporal_chunking: true, force_unload: true, device: 'cuda', precision: 'fp16', latent: ['sep', 0] } };
    g.cat = { class_type: 'LTXVConcatAVLatent', inputs: { video_latent: ['up', 0], audio_latent: ['sep', 1] } };
    g.s2 = { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler' } };
    g.guider2 = { class_type: 'BasicGuider', inputs: { model, conditioning: ['cond', 0] } };
    g.sig2 = { class_type: 'ManualSigmas', inputs: { sigmas: PASS2_SIGMAS[j.secondPassSteps] ?? PASS2_SIGMAS[3] } };
    g.samp2 = { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: ['guider2', 0], sampler: ['s2', 0], sigmas: ['sig2', 0], latent_image: ['cat', 0] } };
    samples = ['samp2', 0];
  }
  let still: L;
  if (j.fizgig) { g.dec = { class_type: 'FizgigH3StillDecode', inputs: { samples, vae: ['vaeV', 0] } }; still = ['dec', 0]; }
  else { g.dec = { class_type: 'VAEDecode', inputs: { samples, vae: ['vaeV', 0] } }; g.frame = { class_type: 'ImageFromBatch', inputs: { batch_index: LENGTH, length: 1, image: ['dec', 0] } }; still = ['frame', 0]; }
  g.save = { class_type: 'SaveImage', inputs: { filename_prefix: `${j.saveSubfolder}/${j.stem}_h3img`, images: still } };
  return { graph: g, save: 'save' };
}
