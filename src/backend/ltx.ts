// LTX 2.5 video (STUDIO_ONE "LTX 2.5 ONE STUDIO"): text-to-video and first/last-frame image-to-video,
// two stages (half size → 2x latent upscale → short refine) driven by the Director nodes.
import { getJson } from './http';

export const FPS = 24;
export interface LtxJob {
  prompt: string; seconds: number; aspect: string; megapixels: number;
  /** ComfyUI input filenames */
  first?: string; last?: string;
  seed: number; steps: number; cfg: number; sampler: string; scheduler: string; stage2Sigmas: string;
  loras: { name: string; strength: number }[];
  models: Record<string, string>;
  saveSubfolder: string;
  /** exact output size (overrides aspect/megapixels, e.g. taken from the first frame) */
  size?: { width: number; height: number };
  /** Director timeline: a prompt per beat (seconds) and images pinned in time */
  timeline?: { texts: { startSec: number; endSec: number; prompt: string }[]; images: { file: string; startSec: number; end?: boolean; strength?: number }[];
    /** custom audio / motion-guide video (ComfyUI input filenames) placed at startSec */
    audio?: { file: string; startSec: number; lengthSec?: number }; motion?: { file: string; startSec: number; lengthSec?: number; strength?: number; attention?: number } };
}

interface Lists { diffusion_models: string[]; text_encoders: string[]; text_encoders_all?: string[]; vaes: string[]; latent_upscale_models?: string[]; loras: string[] }
let cache: Promise<Lists> | null = null;
export function ltxModelLists(): Promise<Lists> {
  cache ??= getJson<Lists>('/ltx25_one/models').catch(() => getJson<Lists>('/minimax_h3_one/models')).catch((e) => { cache = null; throw e; });
  return cache;
}
let availCache: Promise<Record<string, boolean>> | null = null;
const availability = () => (availCache ??= getJson<{ available?: Record<string, boolean> }>('/ltx25_one/node_availability').then((r) => r.available ?? (r as any)).catch(() => ({})));

const real = (a?: string[]) => (a ?? []).filter((x) => x && x !== 'none');
export async function resolveLtxModels(user: Record<string, string>) {
  const l = await ltxModelLists();
  const pick = (k: string, list: string[] | undefined, re: RegExp) => user[k] || real(list).find((x) => re.test(x)) || '';
  return {
    unet: pick('ltx_unet', l.diffusion_models, /ltx/i),
    clip: pick('ltx_clip', l.text_encoders_all ?? l.text_encoders, /gemma|ltx/i),
    vaeVideo: pick('ltx_vae_video', l.vaes, /ltx.*video|ltx2?.*vae|video.*vae/i),
    vaeAudio: pick('ltx_vae_audio', l.vaes, /ltx.*audio|audio.*vae/i),
    upscaler: pick('ltx_upscaler', l.latent_upscale_models, /ltx|upscal/i),
  };
}

export const alignFrames = (n: number) => Math.max(9, 8 * Math.round((n - 1) / 8) + 1);

export function ltxSize(aspect: string, mp: number): { width: number; height: number } {
  const [a, b] = aspect.split(':').map(Number);
  const ratio = a && b ? a / b : 16 / 9;
  const target = Math.max(0.1, mp) * 1_000_000;
  const h = Math.sqrt(target / ratio), w = h * ratio;
  const snap = (v: number) => Math.max(64, Math.round(v / 64) * 64);
  return { width: snap(w), height: snap(h) };
}

const emptyTimeline = (prompt: string, frames: number) => ({
  mainTrackEnabled: true, audioTrackEnabled: true, motionTrackEnabled: true, propHeight: 90, globalPropHeight: 60,
  showFilenames: true, showPromptZones: true, overrideAudio: false, inpaint_audio: true, global_prompt: prompt,
  retake_global_prompt: '', retakeMode: false, retakeStart: 24, retakeLength: 48, retakePrompt: '', retakeStrength: 1,
  retakeVideo: null, normalStartFrame: 0, normalDurationFrames: frames, reference_mode: 'OFF', disable_prompt_relay: true,
  msr_prefix_frames: 41, analyzeProvider: 'ollama', analyzeBaseUrl: '', analyzeModel: '',
  characters: [{ images: [], description: '' }, { images: [], description: '' }, { images: [], description: '' }],
  segments: [] as any[], motionSegments: [], audioSegments: [],
});

export async function buildLtxGraph(job: LtxJob): Promise<Record<string, any>> {
  const m = await resolveLtxModels(job.models);
  const miss = ([['LTX diffusion model', m.unet], ['text encoder', m.clip], ['video VAE', m.vaeVideo], ['audio VAE', m.vaeAudio], ['latent upscaler', m.upscaler]] as const).filter(([, v]) => !v).map(([k]) => k);
  if (miss.length) throw new Error(`Pick the LTX 2.5 ${miss.join(', ')} in Settings → Video models.`);
  if (!job.prompt.trim()) throw new Error('Prompt is empty');
  const avail = await availability();
  const has = (n: string) => !!avail[n];
  const frames = alignFrames(job.seconds * FPS);
  const { width: W, height: H } = job.size ?? ltxSize(job.aspect, job.megapixels);
  const secs = frames / FPS;
  const gg = (s: string) => s.toLowerCase().endsWith('.gguf');

  const g: Record<string, any> = {};
  g.unet = gg(m.unet) ? { class_type: 'UnetLoaderGGUF', inputs: { unet_name: m.unet } } : { class_type: 'UNETLoader', inputs: { unet_name: m.unet, weight_dtype: 'default' } };
  let model: [string, number] = ['unet', 0];
  g.clip = gg(m.clip) ? { class_type: 'TJ_LTX25ClipLoaderGGUF', inputs: { clip_name: m.clip } } : { class_type: 'CLIPLoader', inputs: { clip_name: m.clip, type: 'ltxv', device: 'default' } };
  g.vaeV = { class_type: 'VAELoader', inputs: { vae_name: m.vaeVideo } };
  g.vaeA = { class_type: 'VAELoader', inputs: { vae_name: m.vaeAudio } };
  g.upModel = { class_type: 'LatentUpscaleModelLoader', inputs: { model_name: m.upscaler } };
  job.loras.forEach((l, i) => {
    if (!l.name || l.name === 'none' || !(l.strength > 0)) return;
    g[`lora${i}`] = { class_type: 'LoraLoaderModelOnly', inputs: { model, lora_name: l.name, strength_model: l.strength } }; model = [`lora${i}`, 0];
  });
  if (has('LTXVChunkFeedForward')) { g.chunkFF = { class_type: 'LTXVChunkFeedForward', inputs: { model, chunks: 2, dim_threshold: 4096 } }; model = ['chunkFF', 0]; }

  // first / last frame join the Director timeline as image segments
  const tl = emptyTimeline(job.prompt, frames);
  const ANCHOR = 24;
  const seg = (file: string, last: boolean, i: number) => ({ id: `cv-${i}`, start: last ? Math.max(0, frames - ANCHOR) : 0, length: ANCHOR, prompt: '', type: 'image', isAnchor: false, imageFile: file, imageB64: '', isEndFrame: last });
  if (job.first) tl.segments.push(seg(job.first, false, 0));
  if (job.last) tl.segments.push(seg(job.last, true, 1));
  let localPrompts = '', segLens = '', guideStrength = '', useAudio = false, useMotion = false;
  if (job.timeline) {
    const T = job.timeline;
    const fr = (sec: number) => Math.max(0, Math.min(frames - 1, Math.round(sec * FPS)));
    const texts = [...T.texts].sort((a, b) => a.startSec - b.startSec);
    texts.forEach((t, i) => { const st = i === 0 ? 0 : fr(t.startSec); const en = i === texts.length - 1 ? frames : Math.max(st + 1, fr(t.endSec)); (tl.segments as any[]).push({ id: `cvt-${i}`, start: st, length: en - st, prompt: t.prompt, type: 'text' }); });
    const imgs = [...T.images].sort((a, b) => a.startSec - b.startSec);
    imgs.forEach((im, i) => (tl.segments as any[]).push({ id: `cvi-${i}`, start: im.end ? Math.max(0, fr(im.startSec) - ANCHOR + 1) : fr(im.startSec), length: ANCHOR, prompt: '', type: 'image', isAnchor: false, imageFile: im.file, imageB64: '', isEndFrame: !!im.end }));
    if (texts.length) { tl.disable_prompt_relay = false; localPrompts = texts.map((t) => t.prompt).join(' | '); segLens = (tl.segments as any[]).filter((x) => x.type === 'text').map((x) => x.length).join(','); }
    if (T.audio) { const st = fr(T.audio.startSec); const len = Math.max(1, Math.min(frames - st, Math.round((T.audio.lengthSec ?? secs - T.audio.startSec) * FPS))); (tl.audioSegments as any[]).push({ id: 'cva-0', start: st, length: len, trimStart: 0, audioFile: T.audio.file }); useAudio = true; }
    if (T.motion) { const st = fr(T.motion.startSec); const len = Math.max(1, Math.min(frames - st, Math.round((T.motion.lengthSec ?? secs - T.motion.startSec) * FPS))); (tl.motionSegments as any[]).push({ id: 'cvm-0', type: 'motion_video', start: st, length: len, trimStart: 0, videoDurationFrames: len, videoFile: T.motion.file, fileName: T.motion.file, videoStrength: T.motion.strength ?? 1, videoAttentionStrength: T.motion.attention ?? 0.65, resampleMode: 'nearest' }); useMotion = true; }
    if (imgs.some((i) => i.strength !== undefined)) guideStrength = imgs.map((i) => (i.strength ?? 1).toFixed(2)).join(',');
  }

  g.dir = { class_type: 'LTXDirectorTJ25', inputs: {
    model, clip: ['clip', 0], audio_vae: ['vaeA', 0], vae: ['vaeV', 0],
    start_second: 0, end_second: secs, duration_seconds: secs, start_frame: 0, end_frame: frames, duration_frames: frames,
    timeline_data: JSON.stringify(tl), local_prompts: localPrompts, segment_lengths: segLens, epsilon: 0.001, guide_strength: guideStrength,
    global_prompt: job.prompt, use_custom_audio: useAudio, use_custom_motion: useMotion, inpaint_audio: true, frame_rate: FPS,
    display_mode: 'seconds', custom_width: W, custom_height: H, resize_method: 'stretch to fit',
    divisible_by: 32, img_compression: 18, override_audio: false, reference_strength: 1.0,
  } };
  g.dirZero = { class_type: 'ConditioningZeroOut', inputs: { conditioning: ['dir', 2] } };
  g.cond = { class_type: 'LTXVConditioning', inputs: { positive: ['dir', 1], negative: ['dirZero', 0], frame_rate: ['dir', 7] } };
  let pos: [string, number] = ['cond', 0], neg: [string, number] = ['cond', 1];
  if (has('TJ_FreeTextEncoderVRAM')) {
    g.freeP = { class_type: 'TJ_FreeTextEncoderVRAM', inputs: { clip: ['clip', 0], trigger: pos } };
    g.freeN = { class_type: 'TJ_FreeTextEncoderVRAM', inputs: { clip: ['clip', 0], trigger: neg } };
    pos = ['freeP', 0]; neg = ['freeN', 0];
  }
  const guide = (p: [string, number], n: [string, number], latent: [string, number], scale: number) => ({ class_type: 'LTXDirectorGuideTJ25', inputs: {
    positive: p, negative: n, vae: ['vaeV', 0], latent, guide_data: ['dir', 5], motion_guide_data: ['dir', 6], model: ['dir', 0],
    ic_lora_name: 'None', ic_lora_strength: 1, scale_by: scale, upscale_method: 'bicubic', image_attention_strength: 1,
    crop: 'center', auto_snap_ic_grid: true, use_tiled_encode: false, tile_size: 256, tile_overlap: 64, retake_mode: false, msr_strength: 0,
  } });

  // stage 1 (half size)
  g.g1 = guide(pos, neg, ['dir', 3], 0.5);
  g.cat1 = { class_type: 'LTXVConcatAVLatent', inputs: { video_latent: ['g1', 2], audio_latent: ['dir', 4] } };
  g.guider = { class_type: 'CFGGuider', inputs: { model: ['g1', 3], positive: ['g1', 0], negative: ['g1', 1], cfg: job.cfg } };
  g.sched = { class_type: 'BasicScheduler', inputs: { model: ['g1', 3], scheduler: job.scheduler, steps: Math.max(1, Math.round(job.steps)), denoise: 1 } };
  g.noise = { class_type: 'RandomNoise', inputs: { noise_seed: job.seed } };
  g.sel = { class_type: 'KSamplerSelect', inputs: { sampler_name: job.sampler } };
  g.samp1 = { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: ['guider', 0], sampler: ['sel', 0], sigmas: ['sched', 0], latent_image: ['cat1', 0] } };
  g.sep1 = { class_type: 'LTXVSeparateAVLatent', inputs: { av_latent: ['samp1', 0] } };
  g.crop1 = { class_type: 'LTXDirectorCropGuidesTJ25', inputs: { positive: ['g1', 0], negative: ['g1', 1], latent: ['sep1', 0] } };
  // stage 2 (2x latent upscale + short refine)
  g.up = { class_type: 'LTXVLatentUpsampler', inputs: { samples: ['crop1', 2], upscale_model: ['upModel', 0], vae: ['vaeV', 0] } };
  g.g2 = guide(['dir', 1], ['dir', 2], ['up', 0], 1);
  g.cat2 = { class_type: 'LTXVConcatAVLatent', inputs: { video_latent: ['g2', 2], audio_latent: ['sep1', 1] } };
  g.guider2 = { class_type: 'CFGGuider', inputs: { model: ['g2', 3], positive: ['g2', 0], negative: ['g2', 1], cfg: job.cfg } };
  g.sig2 = { class_type: 'ManualSigmas', inputs: { sigmas: job.stage2Sigmas } };
  g.samp2 = { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: ['guider2', 0], sampler: ['sel', 0], sigmas: ['sig2', 0], latent_image: ['cat2', 0] } };
  g.sep2 = { class_type: 'LTXVSeparateAVLatent', inputs: { av_latent: ['samp2', 0] } };
  g.crop2 = { class_type: 'LTXDirectorCropGuidesTJ25', inputs: { positive: ['g2', 0], negative: ['g2', 1], latent: ['sep2', 0] } };
  // decode + save
  g.dec = { class_type: 'VAEDecode', inputs: { samples: ['crop2', 2], vae: ['vaeV', 0] } };
  g.decA = { class_type: 'LTXVAudioVAEDecode', inputs: { samples: ['sep1', 1], audio_vae: ['vaeA', 0] } };
  const prefix = `${job.saveSubfolder}/LTX25`;
  if (has('VHS_VideoCombine')) {
    g.save = { class_type: 'VHS_VideoCombine', inputs: { images: ['dec', 0], audio: ['decA', 0], frame_rate: FPS, loop_count: 0, filename_prefix: prefix, format: 'video/nvenc_h264-mp4', pingpong: false, save_output: true } };
  } else {
    g.video = { class_type: 'CreateVideo', inputs: { images: ['dec', 0], fps: FPS, audio: ['decA', 0] } };
    g.save = { class_type: 'SaveVideo', inputs: { video: ['video', 0], filename_prefix: prefix, format: 'auto', codec: 'auto' } };
  }
  return g;
}
