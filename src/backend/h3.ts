// MiniMax H3 video (STUDIO_ONE "MiniMax H3 ONE STUDIO"): text → video, first/last frame → video and
// multi-reference → video with synchronized audio. Covers the studio's model chain (attention patches, caches,
// H3 memory optimiser, Spectrum), the three turbo routes, the 7+1 hi-res finish, Audio Lock and One-Take
// (latent continuation), plus clip chaining and stitching.
import { getJson, postJson } from './http';
import { FPS } from './ltx';

export type Continuity = 'none' | 'lastframe' | 'onetake';

export interface H3Options {
  attnBackend: 'none' | 'ck' | 'sage' | 'solattn_kijai' | 'sla';
  attnForward: 'none' | 'memeff_sage' | 'solattn_sag';
  optimizer: 'none' | 'memory' | 'memory_sparse';
  blockCache: 'none' | 'fbcache';
  spectrum: boolean;
  fusedModulation: boolean;
  /** none | larryvrh (turbo LoRA + turbo sampler) | pdd (Turbo LoRA Basic) | lightx2v (LoRA + SLA) */
  turbo: 'none' | 'larryvrh' | 'pdd' | 'lightx2v';
  turboLora: string; turboStrength: number; turboSteps: number;
  hires: boolean; hiresStartMp: number; hiresFinalMp: number;
  shiftVideo: number; shiftAudio: number;
  audioLock?: { file: string; startSec: number; mode: string; strength: number; fit: string };
}

export interface H3Job {
  mode: 't2v' | 'firstlast' | 'reference';
  prompt: string; seconds: number; aspect: string; megapixels: number;
  first?: string; last?: string; refs: string[];
  seed: number; steps: number; sampler: string; scheduler: string;
  loras: { name: string; strength: number }[];
  opt: H3Options;
  models: Record<string, string>;
  saveSubfolder: string;
  size?: { width: number; height: number };
  upscaleModel?: string;
  /** reference assets from the Asset Library card (TJ_H3Reference resolves @tokens in the prompt) */
  assetRef?: { project?: string; ids: string[] };
  /** clip bookkeeping for One-Take / Audio Lock */
  clipIndex: number; prevCheckpoint?: string; checkpoint?: string;
  saveLastFrame: boolean;
  stem: string;
}

export const DEFAULT_OPT: H3Options = {
  attnBackend: 'none', attnForward: 'none', optimizer: 'none', blockCache: 'none', spectrum: false, fusedModulation: false,
  turbo: 'none', turboLora: 'none', turboStrength: 1, turboSteps: 8, hires: false, hiresStartMp: 0.5, hiresFinalMp: 0.9,
  shiftVideo: 12, shiftAudio: 3,
};

export const ONE_TAKE_OVERLAP_FRAMES = 39;
export const TAIL_CANDIDATES = 8;

interface Lists { diffusion_models: string[]; text_encoders: string[]; text_encoders_all?: string[]; vaes: string[]; loras: string[]; upscale_models?: string[] }
let cache: Promise<Lists> | null = null;
export const h3ModelLists = () => (cache ??= getJson<Lists>('/minimax_h3_one/models').catch((e) => { cache = null; throw e; }));
let availCache: Promise<Record<string, boolean>> | null = null;
export const h3Availability = () => (availCache ??= getJson<{ available?: Record<string, boolean> }>('/minimax_h3_one/node_availability').then((r) => r.available ?? (r as any)).catch(() => ({})));

export const real = (a?: string[]) => (a ?? []).filter((x) => x && x !== 'none');
export async function resolveH3Models(user: Record<string, string>, mode: string) {
  const l = await h3ModelLists();
  const pick = (k: string, list: string[] | undefined, re: RegExp, not?: RegExp) => user[k] || real(list).find((x) => re.test(x) && !(not && not.test(x))) || '';
  return {
    unet: mode === 'reference' ? pick('h3_unet_ref', l.diffusion_models, /h3.*ref/i) : pick('h3_unet_fl', l.diffusion_models, /h3.*(fl2va|first|fl)/i),
    clip: pick('h3_clip', l.text_encoders_all ?? l.text_encoders, /h3/i, /music|ace15/i),
    vaeVideo: pick('h3_vae_video', l.vaes, /h3.*video/i),
    vaeAudio: pick('h3_vae_audio', l.vaes, /h3.*audio/i),
  };
}

/** H3 only takes frame counts n with n % 17 == 5 (trained range ~124-362) */
export function h3Frames(seconds: number): number {
  let n = Math.min(362, Math.max(124, Math.round(seconds * FPS)));
  while (n % 17 !== 5) n++;
  return n;
}

export function h3Size(aspect: string, mp: number) {
  const [a, b] = aspect.split(':').map(Number);
  const ratio = a && b ? a / b : 16 / 9;
  const t = Math.max(0.1, mp) * 1_000_000, h = Math.sqrt(t / ratio), w = h * ratio;
  const snap = (v: number) => Math.max(32, Math.round(v / 32) * 32);
  return { width: snap(w), height: snap(h) };
}

export type L = [string, number];

export interface H3Graph { graph: Record<string, any>; videoNode: string; lastFrameNode?: string; tailNode?: string; checkpoint?: string }

/** A turbo choice only counts when its LoRA is picked and its node pack is installed. */
export function effectiveTurbo(o: H3Options, has: (n: string) => boolean): H3Options['turbo'] {
  const lora = !!o.turboLora && o.turboLora !== 'none';
  if (o.turbo === 'larryvrh') return has('MiniMaxH3TurboLoRA') && lora ? 'larryvrh' : 'none';
  if (o.turbo === 'lightx2v') return has('H3SLAAttention') && lora ? 'lightx2v' : 'none';
  if (o.turbo === 'pdd') return lora ? 'pdd' : 'none';
  return o.turbo;
}

/** The H3 model chain shared by video, Face Refine and Character Sheet: attention patches, sigma shift, LoRAs, turbo, caches, optimisers. */
export function h3ModelChain(g: Record<string, any>, start: L, o: H3Options, turbo: H3Options['turbo'], loras: { name: string; strength: number }[], has: (n: string) => boolean): L {
  let model: L = start;
  // ── attention backend (one slot; last writer wins) ──
  if (o.attnBackend === 'ck' && has('ModelAttentionBackend')) { g.ck = { class_type: 'ModelAttentionBackend', inputs: { model, attention: 'comfy kitchen attention' } }; model = ['ck', 0]; }
  else if (o.attnBackend === 'sage' && has('PathchSageAttentionKJ')) { g.sage = { class_type: 'PathchSageAttentionKJ', inputs: { model, sage_attention: 'auto' } }; model = ['sage', 0]; }
  else if (o.attnBackend === 'solattn_kijai' && has('SolAttnPatch')) {
    g.sol = { class_type: 'SolAttnPatch', inputs: { model, tau: 1.3, start_percent: 0.2, end_percent: 0.9, min_tokens: 4096, int8_qk: true, sink_conditioning: 'exact_kv_and_rows', morton: false, morton_curve: '2d_frame', int8_pv: true, verbose: false, use_tma: false, dense_blocks: '' } }; model = ['sol', 0];
  }
  // ── H3 attention forward patches ──
  if ((o.attnForward === 'memeff_sage' || o.attnForward === 'solattn_sag') && has('MiniMaxH3MemoryEfficientSageAttentionPatch')) { g.memSage = { class_type: 'MiniMaxH3MemoryEfficientSageAttentionPatch', inputs: { model } }; model = ['memSage', 0]; }
  if (o.attnForward === 'solattn_sag' && has('MiniMaxH3ScheduledSolAttentionPatch')) {
    g.solSag = { class_type: 'MiniMaxH3ScheduledSolAttentionPatch', inputs: { model, enabled: true, tau_start: 1.3, tau_end: 0.8, curve: 'linear', min_tokens: 4096, strict: false, dense_percent: 0.0, thresh_type: 'diag', int8_qk: false, int8_pv: false, sink_conditioning: 'exact_kv', dense_blocks: '' } }; model = ['solSag', 0];
  }
  // PDD's heads are trained against a 12/3 shift
  g.shift = { class_type: 'MiniMaxH3SigmaShift', inputs: { model, shift_video: turbo === 'pdd' ? 12 : o.shiftVideo, shift_audio: turbo === 'pdd' ? 3 : o.shiftAudio } }; model = ['shift', 0];
  loras.forEach((l, i) => {
    if (!l.name || l.name === 'none' || !(l.strength > 0)) return;
    g[`lora${i}`] = { class_type: 'LoraLoaderModelOnly', inputs: { model, lora_name: l.name, strength_model: l.strength } }; model = [`lora${i}`, 0];
  });
  // ── turbo (weights) ──
  if (turbo === 'larryvrh') { g.turbo = { class_type: 'MiniMaxH3TurboLoRA', inputs: { model, lora_name: o.turboLora, strength: o.turboStrength, low_vram: false } }; model = ['turbo', 0]; }
  else if (turbo === 'lightx2v' || turbo === 'pdd') { g.turbo = { class_type: 'LoraLoaderModelOnly', inputs: { model, lora_name: o.turboLora, strength_model: o.turboStrength } }; model = ['turbo', 0]; }
  // ── caches / optimisers (not under a turbo schedule) ──
  if (o.blockCache === 'fbcache' && turbo === 'none' && has('ApplyMiniMaxH3FirstBlockCache')) {
    g.fbc = { class_type: 'ApplyMiniMaxH3FirstBlockCache', inputs: { model, mode: 'H3 Fast — 0.10 / max 2', threshold: 0.10, start_percent: 0.10, end_percent: 0.95, max_consecutive_hits: 2, temporal_guard: false } }; model = ['fbc', 0];
  }
  if ((o.optimizer === 'memory' || o.optimizer === 'memory_sparse') && has('H3MemoryOptimization')) {
    g.h3mem = { class_type: 'H3MemoryOptimization', inputs: { model, fused_qkv: 'auto', preserve_precision: true, embedding_memory_mode: 'Auto', mlp_memory: 'auto', chunk_rows: 4096, precision_mode: 'Auto', qkv_streaming_mode: 'Auto', kitchen_v_memory_mode: 'Standard' } }; model = ['h3mem', 0];
  }
  if (o.optimizer === 'memory_sparse' && turbo === 'none' && has('H3SparseAttention')) { g.h3sparse = { class_type: 'H3SparseAttention', inputs: { model, video_budget: 0.15, denser_early_late_steps: true, layer_video_budgets: '' } }; model = ['h3sparse', 0]; }
  if (o.spectrum && has('SpectrumApplyMiniMaxH3')) {
    g.spec = { class_type: 'SpectrumApplyMiniMaxH3', inputs: { model, enabled: true, blend_weight: 0.5, degree: 1, ridge_lambda: 0.1, window_size: 2.0, flex_window: 0.75, warmup_steps: 1, tail_actual_steps: 1, max_history: 8, debug: false, history_storage: 'system_ram', bootstrap_first_forecast: true } }; model = ['spec', 0];
  }
  if (o.fusedModulation && has('MiniMaxH3FusedModulation')) { g.fused = { class_type: 'MiniMaxH3FusedModulation', inputs: { model, enabled: true } }; model = ['fused', 0]; }
  // SLA wants to be last before the sampler
  if ((o.attnBackend === 'sla' || turbo === 'lightx2v') && has('H3SLAAttention')) {
    g.sla = { class_type: 'H3SLAAttention', inputs: { model, sparsity_ratio: 0.9, block_size: '64', min_seq_len: 8192, dense_last_steps: 0, protect_audio: true, enabled: true } }; model = ['sla', 0];
  }

  return model;
}

export async function buildH3Graph(job: H3Job): Promise<H3Graph> {
  const o = job.opt;
  const m = await resolveH3Models(job.models, job.mode);
  const miss = ([['H3 diffusion model', m.unet], ['text encoder', m.clip], ['video VAE', m.vaeVideo], ['audio VAE', m.vaeAudio]] as const).filter(([, v]) => !v).map(([k]) => k);
  if (miss.length) throw new Error(`Pick the MiniMax H3 ${miss.join(', ')} in Settings → Video models.`);
  if (!job.prompt.trim()) throw new Error('Prompt is empty');
  if (job.mode === 'reference' && !job.refs.length && !job.assetRef) throw new Error('Connect at least one reference image or an Asset Library card');
  const avail = await h3Availability();
  const has = (n: string) => !!avail[n];
  const needNode = (n: string, why: string) => { if (!has(n)) throw new Error(`${why} needs the ${n} node — install the ComfyUI pack that provides it, or switch the option off.`); };

  const frames = h3Frames(job.seconds);
  const turbo = effectiveTurbo(o, has);
  const hires = o.hires && turbo === 'pdd';
  const final = job.size ?? h3Size(job.aspect, hires ? o.hiresFinalMp : job.megapixels);
  const start = hires ? h3Size(job.aspect, o.hiresStartMp) : final;
  const steps = hires ? 8 : turbo === 'none' ? Math.max(1, Math.round(job.steps)) : Math.max(1, Math.round(o.turboSteps));

  const g: Record<string, any> = {};
  g.unet = m.unet.toLowerCase().endsWith('.gguf') ? { class_type: 'UnetLoaderGGUF', inputs: { unet_name: m.unet } } : { class_type: 'UNETLoader', inputs: { unet_name: m.unet, weight_dtype: 'default' } };
  let model: L = ['unet', 0];

  model = h3ModelChain(g, model, o, turbo, job.loras, has);

  g.clip = { class_type: 'CLIPLoader', inputs: { clip_name: m.clip, type: 'minimax', device: 'default' } };
  g.vaeV = { class_type: 'VAELoader', inputs: { vae_name: m.vaeVideo } };
  g.vaeA = { class_type: 'VAELoader', inputs: { vae_name: m.vaeAudio } };

  // ── conditioning (at stage-1 size; hires adds a second one at the final size when images are involved) ──
  const cond = (key: string, w: number, h: number) => {
    if (job.mode === 'reference' && job.assetRef) {
      needNode('TJ_H3Reference', 'Asset Library references');
      const lib: Record<string, any> = { clip: ['clip', 0], vae: ['vaeV', 0], audio_vae: ['vaeA', 0], prompt: job.prompt, width: w, height: h, length: frames, ref_image_size: 'match', match_check: 'warn' };
      if (job.assetRef.project) { lib.mode = 'project'; lib.project = String(job.assetRef.project); }
      else { const ids = job.assetRef.ids.slice(0, 15); lib.mode = 'assets'; lib.asset_count = ids.length; ids.forEach((id, i) => { lib[`asset_${i + 1}`] = String(id); }); }
      g[key] = { class_type: 'TJ_H3Reference', inputs: lib };
    } else if (job.mode === 'reference') {
      const inputs: Record<string, any> = { clip: ['clip', 0], vae: ['vaeV', 0], audio_vae: ['vaeA', 0], prompt: job.prompt, width: w, height: h, length: frames, ref_image_size: 'match' };
      job.refs.slice(0, 9).forEach((f, i) => { g[`ref${i}`] ??= { class_type: 'LoadImage', inputs: { image: f } }; inputs[`ref_images.ref_image_${i}`] = [`ref${i}`, 0]; });
      g[key] = { class_type: 'MiniMaxH3ReferenceToVideo', inputs };
    } else {
      const inputs: Record<string, any> = { clip: ['clip', 0], vae: ['vaeV', 0], prompt: job.prompt, width: w, height: h, length: frames };
      if (job.mode === 'firstlast') {
        if (job.first) { g.first ??= { class_type: 'LoadImage', inputs: { image: job.first } }; inputs.first_frame = ['first', 0]; }
        if (job.last) { g.last ??= { class_type: 'LoadImage', inputs: { image: job.last } }; inputs.last_frame = ['last', 0]; }
      }
      g[key] = { class_type: 'MiniMaxH3ImageToVideo', inputs };
    }
  };
  cond('cond', start.width, start.height);
  const imageCond = job.mode === 'reference' || (job.mode === 'firstlast' && (job.first || job.last));
  const hrCond = hires && imageCond;
  if (hrCond) cond('hrCond', final.width, final.height);

  g.noise = { class_type: 'RandomNoise', inputs: { noise_seed: job.seed } };
  g.sel = turbo === 'larryvrh' && has('MiniMaxH3TurboSampler') ? { class_type: 'MiniMaxH3TurboSampler', inputs: {} }
    : { class_type: 'KSamplerSelect', inputs: { sampler_name: turbo === 'pdd' ? 'euler' : job.sampler } };
  g.sched = { class_type: 'BasicScheduler', inputs: { model, scheduler: job.scheduler, steps, denoise: 1 } };
  let condLink: L = ['cond', 0], hrCondLink: L = hrCond ? ['hrCond', 0] : condLink;
  if (has('TJ_FreeTextEncoderVRAM')) {
    g.free = { class_type: 'TJ_FreeTextEncoderVRAM', inputs: { clip: ['clip', 0], trigger: hrCond ? hrCondLink : condLink } };
    if (hrCond) hrCondLink = ['free', 0]; else condLink = hrCondLink = ['free', 0];
  }
  g.guider = { class_type: 'BasicGuider', inputs: { model, conditioning: condLink } };

  // ── Audio Lock ──
  let latent: L = ['cond', 1];
  let locked = false;
  if (o.audioLock) {
    needNode('TJ_H3_AudioLock', 'Audio lock');
    g.lockAud = { class_type: 'LoadAudio', inputs: { audio: o.audioLock.file } };
    let aud: L = ['lockAud', 0];
    if (has('TrimAudioDuration')) { g.lockTrim = { class_type: 'TrimAudioDuration', inputs: { audio: aud, start_index: o.audioLock.startSec, duration: frames / FPS } }; aud = ['lockTrim', 0]; }
    g.audioLock = { class_type: 'TJ_H3_AudioLock', inputs: { av_latent: latent, audio: aud, audio_vae: ['vaeA', 0], mode: o.audioLock.mode, strength: o.audioLock.strength, fit: o.audioLock.fit, get_name_av_latent: '(none)', get_name_audio: '(none)', get_name_audio_vae: '(none)', auto_set: false } };
    latent = ['audioLock', 0]; locked = true;
  }
  // ── One-Take (continue from the previous clip's sampled latent) ──
  if (job.checkpoint !== undefined || job.prevCheckpoint) {
    needNode('TJ_H3_LatentContinuation', 'One-Take');
    if (job.clipIndex > 0 && job.prevCheckpoint) {
      needNode('TJ_H3_LoadLatentCheckpoint', 'One-Take');
      g.chkLoad = { class_type: 'TJ_H3_LoadLatentCheckpoint', inputs: { checkpoint_name: job.prevCheckpoint, strict: true } };
      g.cont = { class_type: 'TJ_H3_LatentContinuation', inputs: { overlap_frames: ONE_TAKE_OVERLAP_FRAMES, lock_audio: false, prev_latent: ['chkLoad', 0], target_latent: latent } };
      latent = ['cont', 0];
    }
  }

  let sigmas: L = ['sched', 0];
  if (hires) { g.split = { class_type: 'SplitSigmas', inputs: { sigmas, step: 7 } }; sigmas = ['split', 0]; }
  g.samp = { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: ['guider', 0], sampler: ['sel', 0], sigmas, latent_image: latent } };
  if (job.checkpoint && has('TJ_H3_SaveLatentCheckpoint')) g.chkSave = { class_type: 'TJ_H3_SaveLatentCheckpoint', inputs: { latent: hires ? ['samp', 1] : ['samp', 0], checkpoint_name: job.checkpoint } };

  let samples: L = ['samp', 0];
  if (hires) {
    for (const n of ['MinimaxH3LatentUpscaler3D', 'H3MemoryOptimization', 'BlockSparseAttention']) needNode(n, '7+1 hi-res finish');
    g.hrSep = { class_type: 'LTXVSeparateAVLatent', inputs: { av_latent: ['samp', 1] } };
    g.hrUp = { class_type: 'MinimaxH3LatentUpscaler3D', inputs: { latent: ['hrSep', 0], model_name: 'minimax_h3_latent_upscaler_3d_bf16.safetensors', mode: 'target dimensions', 'mode.width': final.width, 'mode.height': final.height, align: 32, enable_temporal_chunking: true, force_unload: true, device: 'cuda', precision: 'fp16' } };
    g.hrCat = { class_type: 'LTXVConcatAVLatent', inputs: { video_latent: ['hrUp', 0], audio_latent: ['hrSep', 1] } };
    let hl: L = ['hrCat', 0];
    if (locked) { g.hrLock = { class_type: 'TJ_H3_AudioLock', inputs: { ...g.audioLock.inputs, av_latent: hl } }; hl = ['hrLock', 0]; }
    let hm: L = ['unet', 0];
    job.loras.forEach((l, i) => { if (!l.name || l.name === 'none' || !(l.strength > 0)) return; g[`hrLora${i}`] = { class_type: 'LoraLoaderModelOnly', inputs: { model: hm, lora_name: l.name, strength_model: l.strength } }; hm = [`hrLora${i}`, 0]; });
    g.hrPdd = { class_type: 'LoraLoaderModelOnly', inputs: { model: hm, lora_name: o.turboLora, strength_model: o.turboStrength } };
    g.hrShift = { class_type: 'MiniMaxH3SigmaShift', inputs: { model: ['hrPdd', 0], shift_video: 12, shift_audio: 3 } };
    g.hrMem = { class_type: 'H3MemoryOptimization', inputs: { model: ['hrShift', 0], fused_qkv: 'auto', preserve_precision: true, embedding_memory_mode: 'Auto', mlp_memory: 'auto', chunk_rows: 2048, precision_mode: 'Preserve native', qkv_streaming_mode: 'Forced', kitchen_v_memory_mode: 'Lower VRAM (slower)' } };
    g.hrSparse = { class_type: 'BlockSparseAttention', inputs: { model: ['hrMem', 0], selection: 'sol-attn', 'selection.tau': 1.3, start_percent: 0.2, end_percent: 1, dense_blocks: '', min_tokens: 12288, extra_tokens: 256, sink_conditioning: 'exact_kv_and_rows', verbose: false } };
    g.hrGuider = { class_type: 'BasicGuider', inputs: { model: ['hrSparse', 0], conditioning: hrCondLink } };
    g.hrSamp = { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: ['hrGuider', 0], sampler: ['sel', 0], sigmas: ['split', 1], latent_image: hl } };
    samples = ['hrSamp', 0];
  }

  g.dec = { class_type: 'VAEDecode', inputs: { samples, vae: ['vaeV', 0] } };
  g.decA = { class_type: 'VAEDecodeAudio', inputs: { samples, vae: ['vaeA', 0] } };
  let images: L = ['dec', 0];
  if (job.upscaleModel && job.upscaleModel !== 'none') {
    g.upModel = { class_type: 'UpscaleModelLoader', inputs: { model_name: job.upscaleModel } };
    g.upApply = { class_type: 'ImageUpscaleWithModel', inputs: { upscale_model: ['upModel', 0], image: images } }; images = ['upApply', 0];
  }
  const audio: L = locked ? ['audioLock', 1] : ['decA', 0];
  const tag = String(job.clipIndex + 1).padStart(3, '0');
  const prefix = `${job.saveSubfolder}/${job.stem}_clip${tag}`;
  if (has('VHS_VideoCombine')) g.save = { class_type: 'VHS_VideoCombine', inputs: { images, audio, frame_rate: FPS, loop_count: 0, filename_prefix: prefix, format: 'video/nvenc_h264-mp4', pingpong: false, save_output: true } };
  else {
    g.video = { class_type: 'CreateVideo', inputs: { images, fps: FPS, audio } };
    g.save = { class_type: 'SaveVideo', inputs: { video: ['video', 0], filename_prefix: prefix, format: 'auto', codec: 'auto' } };
  }
  const out: H3Graph = { graph: g, videoNode: 'save', checkpoint: job.checkpoint };
  if (job.saveLastFrame) {
    g.lastF = { class_type: 'ImageFromBatch', inputs: { image: images, batch_index: Math.max(0, frames - 1), length: 1 } };
    g.saveLF = { class_type: 'SaveImage', inputs: { images: ['lastF', 0], filename_prefix: `${job.saveSubfolder}/frames/${job.stem}_clip${tag}_last` } };
    const tail = Math.min(TAIL_CANDIDATES, frames);
    g.tailF = { class_type: 'ImageFromBatch', inputs: { image: images, batch_index: Math.max(0, frames - tail), length: tail } };
    g.tailPrev = { class_type: 'PreviewImage', inputs: { images: ['tailF', 0] } };
    out.lastFrameNode = 'saveLF'; out.tailNode = 'tailPrev';
  }
  return out;
}

// ---- STUDIO_ONE helper routes used between clips
export interface FileRefLike { filename: string; subfolder: string; type: string }
export const pickChainFrame = (images: FileRefLike[]) => postJson<{ ok: boolean; picked?: FileRefLike; error?: string }>('/minimax_h3_one/pick_chain_frame', { images });
export const copyToInput = (f: FileRefLike) => postJson<{ ok: boolean; filename: string }>('/minimax_h3_one/copy_to_input', f);
export const clipLastFrame = (filename: string, subfolder: string) => postJson<{ ok: boolean; filename?: string; error?: string }>('/minimax_h3_one/clip_last_frame', { filename, subfolder });
export const stitchClips = (clips: { filename: string; subfolder: string }[], filenamePrefix: string, overlapSeconds?: number, overrideAudio?: { filename: string; subfolder?: string; type?: 'input' | 'output'; start?: number }) =>
  postJson<{ ok: boolean; filename?: string; subfolder?: string; error?: string }>('/minimax_h3_one/stitch', { clips, filename_prefix: filenamePrefix, ...(overlapSeconds ? { overlap_seconds: overlapSeconds } : {}), ...(overrideAudio ? { override_audio: { type: 'input', subfolder: '', start: 0, ...overrideAudio } } : {}) });
