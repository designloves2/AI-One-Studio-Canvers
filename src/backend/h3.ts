// MiniMax H3 video (STUDIO_ONE "MiniMax H3 ONE STUDIO"): text → video, first/last frame → video and
// multi-reference → video, with synchronized audio. Basic path: optional Turbo LoRA (plain LoRA + fewer steps).
import { getJson } from './http';
import { FPS } from './ltx';

export interface H3Job {
  mode: 't2v' | 'firstlast' | 'reference';
  prompt: string; seconds: number; aspect: string; megapixels: number;
  first?: string; last?: string; refs: string[];
  seed: number; steps: number; sampler: string; scheduler: string;
  loras: { name: string; strength: number }[];
  turbo?: { name: string; strength: number };
  models: Record<string, string>;
  saveSubfolder: string;
  size?: { width: number; height: number };
}

interface Lists { diffusion_models: string[]; text_encoders: string[]; text_encoders_all?: string[]; vaes: string[]; loras: string[] }
let cache: Promise<Lists> | null = null;
export const h3ModelLists = () => (cache ??= getJson<Lists>('/minimax_h3_one/models').catch((e) => { cache = null; throw e; }));
let availCache: Promise<Record<string, boolean>> | null = null;
const availability = () => (availCache ??= getJson<{ available?: Record<string, boolean> }>('/minimax_h3_one/node_availability').then((r) => r.available ?? (r as any)).catch(() => ({})));

const real = (a?: string[]) => (a ?? []).filter((x) => x && x !== 'none');
export async function resolveH3Models(user: Record<string, string>, mode: string) {
  const l = await h3ModelLists();
  const pick = (k: string, list: string[] | undefined, re: RegExp) => user[k] || real(list).find((x) => re.test(x)) || '';
  return {
    unet: mode === 'reference' ? pick('h3_unet_ref', l.diffusion_models, /h3.*ref/i) : pick('h3_unet_fl', l.diffusion_models, /h3.*(fl2va|first|fl)/i),
    clip: pick('h3_clip', l.text_encoders_all ?? l.text_encoders, /h3|minimax/i),
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

export async function buildH3Graph(job: H3Job): Promise<Record<string, any>> {
  const m = await resolveH3Models(job.models, job.mode);
  const miss = ([['H3 diffusion model', m.unet], ['text encoder', m.clip], ['video VAE', m.vaeVideo], ['audio VAE', m.vaeAudio]] as const).filter(([, v]) => !v).map(([k]) => k);
  if (miss.length) throw new Error(`Pick the MiniMax H3 ${miss.join(', ')} in Settings → Video models.`);
  if (!job.prompt.trim()) throw new Error('Prompt is empty');
  if (job.mode === 'reference' && !job.refs.length) throw new Error('Connect at least one reference image');
  const avail = await availability();
  const has = (n: string) => !!avail[n];
  const frames = h3Frames(job.seconds);
  const { width, height } = job.size ?? h3Size(job.aspect, job.megapixels);

  const g: Record<string, any> = {};
  g.unet = m.unet.toLowerCase().endsWith('.gguf') ? { class_type: 'UnetLoaderGGUF', inputs: { unet_name: m.unet } } : { class_type: 'UNETLoader', inputs: { unet_name: m.unet, weight_dtype: 'default' } };
  let model: [string, number] = ['unet', 0];
  g.shift = { class_type: 'MiniMaxH3SigmaShift', inputs: { model, shift_video: 12, shift_audio: 3 } }; model = ['shift', 0];
  [...job.loras, ...(job.turbo ? [job.turbo] : [])].forEach((l, i) => {
    if (!l.name || l.name === 'none' || !(l.strength > 0)) return;
    g[`lora${i}`] = { class_type: 'LoraLoaderModelOnly', inputs: { model, lora_name: l.name, strength_model: l.strength } }; model = [`lora${i}`, 0];
  });
  g.clip = { class_type: 'CLIPLoader', inputs: { clip_name: m.clip, type: 'minimax', device: 'default' } };
  g.vaeV = { class_type: 'VAELoader', inputs: { vae_name: m.vaeVideo } };
  g.vaeA = { class_type: 'VAELoader', inputs: { vae_name: m.vaeAudio } };

  if (job.mode === 'reference') {
    const inputs: Record<string, any> = { clip: ['clip', 0], vae: ['vaeV', 0], audio_vae: ['vaeA', 0], prompt: job.prompt, width, height, length: frames, ref_image_size: 'match' };
    job.refs.slice(0, 9).forEach((f, i) => { g[`ref${i}`] = { class_type: 'LoadImage', inputs: { image: f } }; inputs[`ref_images.ref_image_${i}`] = [`ref${i}`, 0]; });
    g.cond = { class_type: 'MiniMaxH3ReferenceToVideo', inputs };
  } else {
    const inputs: Record<string, any> = { clip: ['clip', 0], vae: ['vaeV', 0], prompt: job.prompt, width, height, length: frames };
    if (job.mode === 'firstlast') {
      if (job.first) { g.first = { class_type: 'LoadImage', inputs: { image: job.first } }; inputs.first_frame = ['first', 0]; }
      if (job.last) { g.last = { class_type: 'LoadImage', inputs: { image: job.last } }; inputs.last_frame = ['last', 0]; }
    }
    g.cond = { class_type: 'MiniMaxH3ImageToVideo', inputs };
  }

  g.noise = { class_type: 'RandomNoise', inputs: { noise_seed: job.seed } };
  g.sel = { class_type: 'KSamplerSelect', inputs: { sampler_name: job.sampler } };
  g.sched = { class_type: 'BasicScheduler', inputs: { model, scheduler: job.scheduler, steps: Math.max(1, Math.round(job.steps)), denoise: 1 } };
  let cond: [string, number] = ['cond', 0];
  if (has('TJ_FreeTextEncoderVRAM')) { g.free = { class_type: 'TJ_FreeTextEncoderVRAM', inputs: { clip: ['clip', 0], trigger: cond } }; cond = ['free', 0]; }
  g.guider = { class_type: 'BasicGuider', inputs: { model, conditioning: cond } };
  g.samp = { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: ['guider', 0], sampler: ['sel', 0], sigmas: ['sched', 0], latent_image: ['cond', 1] } };
  g.dec = { class_type: 'VAEDecode', inputs: { samples: ['samp', 0], vae: ['vaeV', 0] } };
  g.decA = { class_type: 'VAEDecodeAudio', inputs: { samples: ['samp', 0], vae: ['vaeA', 0] } };
  const prefix = `${job.saveSubfolder}/MMH3`;
  if (has('VHS_VideoCombine')) {
    g.save = { class_type: 'VHS_VideoCombine', inputs: { images: ['dec', 0], audio: ['decA', 0], frame_rate: FPS, loop_count: 0, filename_prefix: prefix, format: 'video/nvenc_h264-mp4', pingpong: false, save_output: true } };
  } else {
    g.video = { class_type: 'CreateVideo', inputs: { images: ['dec', 0], fps: FPS, audio: ['decA', 0] } };
    g.save = { class_type: 'SaveVideo', inputs: { video: ['video', 0], filename_prefix: prefix, format: 'auto', codec: 'auto' } };
  }
  return g;
}
