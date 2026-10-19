// LTX 2.5 video refine ("Video Edit"): 2x latent upscale + light re-sampling of an existing clip, guided by a prompt.
import { hasNode, addVideoLoad, addVideoSave } from './post';
import { FPS, resolveLtxModels } from './ltx';
import type { L } from './h3';

export interface RefineJob { file: string; prompt: string; negative: string; steps: number; denoise: number; sampler: string; scheduler: string; seed: number; loras: { name: string; strength: number }[]; models: Record<string, string>; saveSubfolder: string; stem: string }

export async function buildRefineGraph(j: RefineJob): Promise<{ graph: Record<string, any>; save: string }> {
  const r = await resolveLtxModels(j.models);
  const m = { ltx_unet: r.unet, ltx_clip: r.clip, ltx_vae_video: r.vaeVideo, ltx_vae_audio: r.vaeAudio, ltx_upscaler: r.upscaler };
  const miss = ([['LTX unet', m.ltx_unet], ['text encoder', m.ltx_clip], ['video VAE', m.ltx_vae_video], ['audio VAE', m.ltx_vae_audio], ['latent upscaler', m.ltx_upscaler]] as const).filter(([, v]) => !v || v === 'none').map(([k]) => k);
  if (miss.length) throw new Error(`Pick the LTX 2.5 ${miss.join(', ')} in Settings → Video models.`);
  for (const n of ['LTXVLatentUpsampler', 'LTXVImgToVideoInplace', 'LTXVAudioVAEEncode', 'LTXVDualCFGGuider']) if (!(await hasNode(n))) throw new Error(`${n} is not installed (needs the LTX 2.5 nodes).`);
  const g: Record<string, any> = {};
  await addVideoLoad(g, j.file, 'load');
  const gguf = (s: string) => s.toLowerCase().endsWith('.gguf');
  g.unet = gguf(m.ltx_unet) ? { class_type: 'UnetLoaderGGUF', inputs: { unet_name: m.ltx_unet } } : { class_type: 'UNETLoader', inputs: { unet_name: m.ltx_unet, weight_dtype: 'default' } };
  let model: L = ['unet', 0];
  g.clip = gguf(m.ltx_clip) ? { class_type: 'TJ_LTX25ClipLoaderGGUF', inputs: { clip_name: m.ltx_clip } } : { class_type: 'CLIPLoader', inputs: { clip_name: m.ltx_clip, type: 'ltxv', device: 'default' } };
  g.vaeV = { class_type: 'VAELoader', inputs: { vae_name: m.ltx_vae_video } };
  g.vaeA = { class_type: 'VAELoader', inputs: { vae_name: m.ltx_vae_audio } };
  g.upm = { class_type: 'LatentUpscaleModelLoader', inputs: { model_name: m.ltx_upscaler } };
  j.loras.forEach((l, i) => { if (l.name && l.name !== 'none' && l.strength > 0) { g[`lora${i}`] = { class_type: 'LoraLoaderModelOnly', inputs: { model, lora_name: l.name, strength_model: l.strength } }; model = [`lora${i}`, 0]; } });
  if (await hasNode('ModelAttentionBackend')) { g.ck = { class_type: 'ModelAttentionBackend', inputs: { model, attention: 'comfy kitchen attention' } }; model = ['ck', 0]; }
  g.pos = { class_type: 'CLIPTextEncode', inputs: { text: j.prompt, clip: ['clip', 0] } };
  g.neg = { class_type: 'CLIPTextEncode', inputs: { text: j.negative, clip: ['clip', 0] } };
  g.cond = { class_type: 'LTXVConditioning', inputs: { frame_rate: FPS, positive: ['pos', 0], negative: ['neg', 0] } };
  g.guider = { class_type: 'LTXVDualCFGGuider', inputs: { video_cfg: 1, audio_cfg: 1, model, positive: ['cond', 0], negative: ['cond', 1] } };
  g.enc = { class_type: 'VAEEncode', inputs: { pixels: ['load', 0], vae: ['vaeV', 0] } };
  g.ups = { class_type: 'LTXVLatentUpsampler', inputs: { samples: ['enc', 0], upscale_model: ['upm', 0], vae: ['vaeV', 0] } };
  g.first = { class_type: 'ImageFromBatch', inputs: { image: ['load', 0], batch_index: 0, length: 1 } };
  g.i2v = { class_type: 'LTXVImgToVideoInplace', inputs: { strength: 1, bypass: false, vae: ['vaeV', 0], image: ['first', 0], latent: ['ups', 0] } };
  g.aenc = { class_type: 'LTXVAudioVAEEncode', inputs: { audio: ['load', 2], audio_vae: ['vaeA', 0] } };
  g.cat = { class_type: 'LTXVConcatAVLatent', inputs: { video_latent: ['i2v', 0], audio_latent: ['aenc', 0] } };
  g.noise = { class_type: 'RandomNoise', inputs: { noise_seed: j.seed } };
  g.sel = { class_type: 'KSamplerSelect', inputs: { sampler_name: j.sampler } };
  g.sched = { class_type: 'BasicScheduler', inputs: { model, scheduler: j.scheduler, steps: j.steps, denoise: j.denoise } };
  g.samp = { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: ['guider', 0], sampler: ['sel', 0], sigmas: ['sched', 0], latent_image: ['cat', 0] } };
  g.sep = { class_type: 'LTXVSeparateAVLatent', inputs: { av_latent: ['samp', 0] } };
  g.decV = { class_type: 'VAEDecodeTiled', inputs: { tile_size: 512, overlap: 64, temporal_size: 4096, temporal_overlap: 32, samples: ['sep', 0], vae: ['vaeV', 0] } };
  g.decA = { class_type: 'LTXVAudioVAEDecode', inputs: { samples: ['sep', 1], audio_vae: ['vaeA', 0] } };
  const save = await addVideoSave(g, ['decV', 0], ['decA', 0], FPS, `${j.saveSubfolder}/${j.stem}_LTXUP`, 'R');
  return { graph: g, save };
}
