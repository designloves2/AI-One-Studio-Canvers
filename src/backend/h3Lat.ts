// Postprocess → Latent Upscale (Use H3): a finished 8-step H3 clip goes back through the last sigma interval (relay spec 2b, node v1.47.0).
// H3 Latent Upscaler: encode → latent upscale → last step at the final size.
// H3 Kimchy Up Scaler: encode → one step at the clip's own size → KimchyH3ZeroSplitMP (upscale, then its tile step on the prompt alone).
import { FPS } from './ltx';
import { h3Availability, resolveH3Models, type L } from './h3';
import { addVideoLoad, addVideoSave } from './post';

export interface H3LatJob {
  file: string; frames: number; fps: number; srcW: number; srcH: number; finalMp: number; prompt: string; kind: 'fl' | 'ref'; hasAudio: boolean; seed: number;
  turbo: 'pdd' | 'none'; pddFile: string; pddStrength: number; lastFixed: boolean; lastModel: string;
  upscaler: 'h3' | 'kimchy'; kimUp: 'neural' | 'bicubic' | 'trilinear'; noOpt: boolean; chunkRows: number;
  models: Record<string, string>; saveSubfolder: string; stem: string;
  skip?: number;   // Split mode: this piece starts at frame `skip` of the source (frames = the piece length)
}
export interface H3LatGraph { graph: Record<string, any>; save: string; start: { w: number; h: number }; final: { w: number; h: number } }

/** H3 only takes 17n+5 frames: the most frames of `total` that fit (0 = too short) */
export const h3LatFrames = (total: number) => (total >= 22 ? Math.floor((total - 5) / 17) * 17 + 5 : 0);

export async function buildH3LatGraph(j: H3LatJob): Promise<H3LatGraph> {
  const kim = j.upscaler === 'kimchy';
  const m = await resolveH3Models(j.models, j.kind === 'ref' ? 'reference' : 'firstlast');
  const avail = await h3Availability(); const has = (n: string) => !!avail[n];
  const unetName = j.lastFixed ? (j.lastModel && j.lastModel !== 'none' ? j.lastModel : '') : m.unet;
  const miss = ([['H3 diffusion model', unetName], ['text encoder', m.clip], ['video VAE', m.vaeVideo], ['audio VAE', m.vaeAudio]] as const).filter(([, v]) => !v).map(([k]) => k);
  if (miss.length) throw new Error(`Pick the MiniMax H3 ${miss.join(', ')} in Settings → Video models.`);
  if (j.turbo === 'pdd' && (!j.pddFile || j.pddFile === 'none')) throw new Error('Latent Upscale (Use H3) needs an 8-step model: pick the Turbo LoRA, or set Turbo to None with an 8-step checkpoint.');
  if (!j.prompt.trim()) throw new Error('Latent Upscale (Use H3): the prompt is empty.');
  if (!j.frames) throw new Error('Latent Upscale (Use H3): the clip is too short (H3 needs at least 22 frames).');
  if (kim && !has('KimchyH3ZeroSplitMP')) throw new Error('H3 Kimchy Up Scaler needs the ComfyUI-Kimchy-Minimax-H3-Suite pack — install it (github.com/AI-KIMCHY/ComfyUI-Kimchy-Minimax-H3-Suite), or pick H3 Latent Upscaler.');
  if (!kim && !has('MinimaxH3LatentUpscaler3D')) throw new Error('Latent Upscale (Use H3) needs MinimaxH3LatentUpscaler3D — install it.');
  if (!has('BlockSparseAttention')) throw new Error('Latent Upscale (Use H3) needs BlockSparseAttention — install it.');
  if (!j.noOpt && !has('H3MemoryOptimization')) throw new Error('Latent Upscale (Use H3) needs H3MemoryOptimization — install it, or tick "Bypass H3 Memory Optimization".');
  if (j.hasAudio && !has('TJ_H3_AudioLock')) throw new Error("Latent Upscale (Use H3) needs the TJ_H3_AudioLock node (TJ_NODE pack) to carry the clip's audio.");
  if (kim && (j.srcW % 32 || j.srcH % 32)) throw new Error(`H3 Kimchy Up Scaler needs the clip's width and height to be multiples of 32 (this clip is ${j.srcW}×${j.srcH}).`);
  if (kim && !(j.finalMp >= 1 && j.finalMp <= 8.5)) throw new Error('H3 Kimchy Up Scaler supports Final MP 1.0 – 8.5.');
  const snap = (v: number) => Math.max(32, Math.round(v / 32) * 32);
  const ratio = j.srcW / j.srcH, fh = Math.sqrt((j.finalMp * 1_000_000) / ratio);
  const final = { width: snap(fh * ratio), height: snap(fh) }, src = { width: j.srcW, height: j.srcH };

  const g: Record<string, any> = {};
  await addVideoLoad(g, j.file, 'P:load', j.skip ?? 0, j.frames);
  const images: L = ['P:load', 0], audio: L = ['P:load', 2];
  g.unet = unetName.toLowerCase().endsWith('.gguf') ? { class_type: 'UnetLoaderGGUF', inputs: { unet_name: unetName } } : { class_type: 'UNETLoader', inputs: { unet_name: unetName, weight_dtype: 'default' } };
  g.clip = { class_type: 'CLIPLoader', inputs: { clip_name: m.clip, type: 'minimax', device: 'default' } };
  g.vaeV = { class_type: 'VAELoader', inputs: { vae_name: m.vaeVideo } };
  g.vaeA = { class_type: 'VAELoader', inputs: { vae_name: m.vaeAudio } };
  // keyframes are encoded at the canvas size inside the conditioning, so each size has its own
  const cond = (key: string, size: { width: number; height: number }, keyframes: boolean) => {
    g[key] = j.kind === 'ref'
      ? { class_type: 'MiniMaxH3ReferenceToVideo', inputs: { clip: ['clip', 0], vae: ['vaeV', 0], audio_vae: ['vaeA', 0], prompt: j.prompt, width: size.width, height: size.height, length: j.frames, ref_image_size: 'match' } }
      : { class_type: 'MiniMaxH3ImageToVideo', inputs: { clip: ['clip', 0], vae: ['vaeV', 0], prompt: j.prompt, width: size.width, height: size.height, length: j.frames } };
    if (j.kind !== 'ref' && keyframes) { g[key].inputs.first_frame = ['hrFirst', 0]; g[key].inputs.last_frame = ['hrLast', 0]; }
  };
  g.hrFirst = { class_type: 'ImageFromBatch', inputs: { image: images, batch_index: 0, length: 1 } };
  g.hrLast = { class_type: 'ImageFromBatch', inputs: { image: images, batch_index: 4095, length: 1 } };   // ImageFromBatch clamps to the last frame
  cond('hrCond', kim ? src : final, true);
  g.hrEnc = { class_type: 'VAEEncode', inputs: { pixels: images, vae: ['vaeV', 0] } };
  let avSource: L = ['hrCond', 1];
  const lockInputs = { audio, audio_vae: ['vaeA', 0], mode: 'lock', strength: 0.5, fit: 'pad_silence', get_name_av_latent: '(none)', get_name_audio: '(none)', get_name_audio_vae: '(none)', auto_set: false };
  if (j.hasAudio) { g.audioLock = { class_type: 'TJ_H3_AudioLock', inputs: { av_latent: avSource, ...lockInputs } }; avSource = ['audioLock', 0]; }
  g.hrAudSep = { class_type: 'LTXVSeparateAVLatent', inputs: { av_latent: avSource } };
  g.hrAv0 = { class_type: 'LTXVConcatAVLatent', inputs: { video_latent: ['hrEnc', 0], audio_latent: ['hrAudSep', 1] } };
  // model: (fixed) UNET → Turbo LoRA → shift 12/3 → Memory Optimization → Sol-Attn
  let model: L = ['unet', 0];
  if (j.turbo === 'pdd') { g.hrPdd = { class_type: 'LoraLoaderModelOnly', inputs: { model, lora_name: j.pddFile, strength_model: j.pddStrength } }; model = ['hrPdd', 0]; }
  g.hrShift = { class_type: 'MiniMaxH3SigmaShift', inputs: { model, shift_video: 12, shift_audio: 3 } }; model = ['hrShift', 0];
  if (!j.noOpt) { g.hrMem = { class_type: 'H3MemoryOptimization', inputs: { model, fused_qkv: 'auto', preserve_precision: true, embedding_memory_mode: 'Auto', mlp_memory: 'auto', chunk_rows: Math.round(j.chunkRows || 2048), precision_mode: 'Preserve native', qkv_streaming_mode: 'Forced', kitchen_v_memory_mode: 'Lower VRAM (slower)' } }; model = ['hrMem', 0]; }
  const memModel = model;   // Kimchy takes the memory-optimised model without Sol-Attn
  g.hrSparse = { class_type: 'BlockSparseAttention', inputs: { model, selection: 'sol-attn', 'selection.tau': 1.3, start_percent: 0.2, end_percent: 1, dense_blocks: '', min_tokens: 12288, extra_tokens: 256, sink_conditioning: 'exact_kv_and_rows', verbose: true } };
  g.sched = { class_type: 'BasicScheduler', inputs: { model: ['hrShift', 0], scheduler: 'simple', steps: 8, denoise: 1 } };
  g.split = { class_type: 'SplitSigmas', inputs: { sigmas: ['sched', 0], step: 7 } };
  g.noise = { class_type: 'RandomNoise', inputs: { noise_seed: j.seed } };
  g.sel = { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler' } };
  const step = (key: string, condLink: L, latent: L): L => {
    g[`${key}G`] = { class_type: 'BasicGuider', inputs: { model: ['hrSparse', 0], conditioning: condLink } };
    g[key] = { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: [`${key}G`, 0], sampler: ['sel', 0], sigmas: ['split', 1], latent_image: latent } };
    return [key, 0];
  };
  let samples: L;
  if (!kim) {
    g.hrSep = { class_type: 'LTXVSeparateAVLatent', inputs: { av_latent: ['hrAv0', 0] } };
    g.hrUp = { class_type: 'MinimaxH3LatentUpscaler3D', inputs: { latent: ['hrSep', 0], model_name: 'minimax_h3_latent_upscaler_3d_bf16.safetensors', mode: 'target dimensions', 'mode.width': final.width, 'mode.height': final.height, align: 32, enable_temporal_chunking: true, force_unload: true, device: 'cuda', precision: 'fp16' } };
    g.hrCat = { class_type: 'LTXVConcatAVLatent', inputs: { video_latent: ['hrUp', 0], audio_latent: ['hrSep', 1] } };
    let hl: L = ['hrCat', 0];
    if (j.hasAudio) { g.hrLock = { class_type: 'TJ_H3_AudioLock', inputs: { av_latent: hl, ...lockInputs } }; hl = ['hrLock', 0]; }
    samples = step('hrSamp', ['hrCond', 0], hl);
  } else {
    const s1 = step('hrSamp1', ['hrCond', 0], ['hrAv0', 0]);
    cond('hrCond2', final, false);   // the tile step takes the prompt alone: a keyframe block cannot be cut into tiles
    g.hrNeg = { class_type: 'ConditioningZeroOut', inputs: { conditioning: ['hrCond2', 0] } };
    g.hrKim = { class_type: 'KimchyH3ZeroSplitMP', inputs: { model: memModel, conditioning: ['hrCond2', 0], latent: s1, noise: ['noise', 0], sampler: ['sel', 0], sigmas: ['split', 1], negative: ['hrNeg', 0], model_name: j.kimUp === 'neural' ? 'minimax_h3_latent_upscaler_3d_bf16.safetensors' : j.kimUp === 'bicubic' ? 'None (Bicubic)' : 'None (Trilinear)', upscale_by: 'megapixels', target_megapixels: j.finalMp, scale: 2, align: 32, precision: 'fp16', cfg: 1, color_match: true } };
    samples = ['hrKim', 0];
  }
  g.hrDecode = { class_type: 'VAEDecode', inputs: { samples, vae: ['vaeV', 0] } };
  const save = await addVideoSave(g, ['hrDecode', 0], j.hasAudio ? audio : undefined, j.fps || FPS, `${j.saveSubfolder}/${j.stem}_h3lat`, 'U');
  return { graph: g, save, start: { w: src.width, h: src.height }, final: { w: final.width, h: final.height } };
}

/** Split mode (spec 1, node h3SegmentPasses): an H3 piece is 17k+5 frames; pieces overlap by `overlap` frames and the join trims that stretch off the later piece */
export function h3SegmentPlan(mode: 'seconds' | 'count', seconds: number, count: number, total: number, fps: number): { passes: { skip: number; cap: number }[]; overlap: number } {
  const sSec = Math.max(0, Number(seconds) || 0), segCount = Math.max(1, Math.round(Number(count) || 1));
  const maxPieces = Math.max(1, Math.floor((total - 5) / 22));
  let n = 1;
  if (mode === 'count') n = Math.min(segCount, maxPieces);
  else if (sSec > 0) n = Math.min(maxPieces, Math.max(1, Math.round(total / Math.max(22, sSec * fps))));
  if (n < 2) return { passes: [], overlap: 0 };
  let blocks = Math.max(n, Math.ceil((total - 5 * n) / 17));
  while ((17 * blocks + 5 * n - total) % (n - 1)) blocks++;
  const overlap = (17 * blocks + 5 * n - total) / (n - 1);
  const passes: { skip: number; cap: number }[] = [];
  let skip = 0;
  for (let k = 0; k < n; k++) { const cap = 17 * (Math.floor(blocks / n) + (k < blocks % n ? 1 : 0)) + 5; passes.push({ skip, cap }); skip += cap - overlap; }
  return { passes, overlap };
}
