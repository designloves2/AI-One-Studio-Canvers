// H3 Face Refine: take a finished clip, track the face, re-generate only the face crop with H3 (img2img through
// H3InjectVideoLatent), then stitch it back. Needs the ComfyUI-H3-FaceRefine pack (H3FaceTrackCrop & friends).
import { hasNode, addVideoLoad, addVideoSave } from './post';
import { effectiveTurbo, h3Availability, h3ModelLists, h3ModelChain, resolveH3Models, type H3Options, type L } from './h3';
import { FPS } from './ltx';
import { getJson, postJson } from './http';

export const FACE_SELECT = ['largest_face', 'smallest_face', 'left_most', 'right_most', 'top_most', 'bottom_most', 'centre_most', 'detector_score', 'manual'];

export interface FaceRefineJob {
  file: string; prompt: string; refs: string[];
  detector: string; fallback: string; confidence: number;
  select: string; confirmedPick: string; cutDetection: boolean; cutThreshold: number;
  identityTrack: boolean; identityThreshold: number; identityModel: string;
  cropFactor: number; canvasMode: string; canvasW: number; canvasH: number; smooth: number;
  denoise: number; mulSmall: number; mulLarge: number; pxSmall: number; pxLarge: number;
  steps: number; sampler: string; scheduler: string;
  paste: string; feather: number; colour: number; blend: number; undetected: string;
  opt: H3Options; loras: { name: string; strength: number }[];
  models: Record<string, string>; seed: number; saveSubfolder: string; stem: string;
}

export async function faceDetectors(): Promise<string[]> {
  try { const l = await getJson<{ face_detectors?: string[] }>('/minimax_h3_one/models'); return ['none', ...(l.face_detectors ?? []).filter((x) => x && x !== 'none')]; } catch { return ['none']; }
}

export async function buildFaceRefineGraph(job: FaceRefineJob): Promise<{ graph: Record<string, any>; save: string }> {
  const g: Record<string, any> = {};
  for (const [n, why] of [['H3FaceTrackCrop', 'Face tracking'], ['H3InjectVideoLatent', 'Face re-generation'], ['H3PerFrameDenoise', 'Per-frame denoise'], ['H3FaceStitch', 'Face stitch']] as const)
    if (!(await hasNode(n))) throw new Error(`${why} needs the ${n} node — install ComfyUI-H3-FaceRefine.`);
  if (!job.detector || job.detector === 'none') throw new Error('Pick a face detector on the Face Refine card (models/ultralytics/bbox/*.pt)');
  const manual = job.select === 'manual';
  if (manual && !job.confirmedPick.trim()) throw new Error('Select = manual: press "Pick faces" on the card first');
  const avail = await h3Availability();
  const has = (n: string) => !!avail[n];
  const m = await resolveH3Models(job.models, 'reference');
  if (!m.unet || !m.clip || !m.vaeVideo || !m.vaeAudio) throw new Error('Pick the MiniMax H3 reference model, text encoder and VAEs in Settings → Video models.');
  const cut = job.cutDetection ? 'auto (pyscenedetect)' : 'none';

  let images: L, audio: L, facePick: L | null = null;
  if (manual && (await hasNode('H3FaceSelect'))) {
    g.sel = { class_type: 'H3FaceSelect', inputs: { video: job.file, detector: job.detector, confidence: job.confidence, select: 'manual', select_index: 0, confirmed_pick: job.confirmedPick, cut_detection: cut, cut_threshold: job.cutThreshold, skip_first_frames: 0, frame_load_cap: 0, select_every_nth: 1 } };
    images = ['sel', 0]; audio = ['sel', 1]; facePick = ['sel', 2];
  } else {
    await addVideoLoad(g, job.file, 'load');
    images = ['load', 0]; audio = ['load', 2];
  }
  const track: Record<string, any> = {
    images, detector: job.detector, confidence: job.confidence, crop_factor: job.cropFactor,
    canvas_width: job.canvasW, canvas_height: job.canvasH, canvas_mode: job.canvasMode,
    smooth_window: job.smooth, size_smooth_window: 51, smooth_method: 'gaussian', size_mode: 'per_frame',
    identity_track: job.identityTrack, identity_threshold: job.identityThreshold, fallback_detector: job.fallback || 'none',
    identity_model: job.identityModel,
  };
  if (facePick) track.face_pick = facePick; else { track.select = manual ? 'largest_face' : job.select; track.cut_detection = cut; track.cut_threshold = job.cutThreshold; }
  g.track = { class_type: 'H3FaceTrackCrop', inputs: track };

  const turbo = effectiveTurbo(job.opt, has);
  g.unet = m.unet.toLowerCase().endsWith('.gguf') ? { class_type: 'UnetLoaderGGUF', inputs: { unet_name: m.unet } } : { class_type: 'UNETLoader', inputs: { unet_name: m.unet, weight_dtype: 'default' } };
  const model = h3ModelChain(g, ['unet', 0], { ...job.opt, hires: false }, turbo, job.loras, has);
  g.clip = { class_type: 'CLIPLoader', inputs: { clip_name: m.clip, type: 'minimax', device: 'default' } };
  g.vaeV = { class_type: 'VAELoader', inputs: { vae_name: m.vaeVideo } };
  g.vaeA = { class_type: 'VAELoader', inputs: { vae_name: m.vaeAudio } };

  // width / height / length come from the tracker (links): "auto" canvas modes only know the real size after cropping
  const cond: Record<string, any> = { clip: ['clip', 0], vae: ['vaeV', 0], audio_vae: ['vaeA', 0], prompt: job.prompt.trim(), width: ['track', 4], height: ['track', 5], length: ['track', 6], ref_image_size: 'match' };
  job.refs.slice(0, 9).forEach((f, i) => { g[`ref${i}`] = { class_type: 'LoadImage', inputs: { image: f } }; cond[`ref_images.ref_image_${i}`] = [`ref${i}`, 0]; });
  g.cond = { class_type: 'MiniMaxH3ReferenceToVideo', inputs: cond };
  g.inject = { class_type: 'H3InjectVideoLatent', inputs: { av_latent: ['cond', 1], images: ['track', 0], vae: ['vaeV', 0] } };
  if (!has('TJ_H3_AudioLock')) throw new Error('Face Refine keeps the original sound with the TJ_H3_AudioLock node (ComfyUI-TJ_NODE) — it is not installed.');
  g.lock = { class_type: 'TJ_H3_AudioLock', inputs: { av_latent: ['inject', 0], audio, audio_vae: ['vaeA', 0], mode: 'lock', strength: 0.5, fit: 'pad_silence', get_name_av_latent: '(none)', get_name_audio: '(none)', get_name_audio_vae: '(none)', auto_set: false } };
  g.den = { class_type: 'H3PerFrameDenoise', inputs: { model, av_latent: ['lock', 0], transform: ['track', 1], denoise_multiplier_small_face: job.mulSmall, denoise_multiplier_large_face: job.mulLarge, scale_mode: 'absolute_px', face_px_small: job.pxSmall, face_px_large: job.pxLarge, gamma: 1.0, smooth_frames: 9 } };
  const dm: L = ['den', 2];

  const steps = turbo === 'none' ? Math.max(1, Math.round(job.steps)) : Math.max(1, Math.round(job.opt.turboSteps));
  g.noise = { class_type: 'RandomNoise', inputs: { noise_seed: job.seed } };
  g.samp0 = turbo === 'larryvrh' && has('MiniMaxH3TurboSampler') ? { class_type: 'MiniMaxH3TurboSampler', inputs: {} } : { class_type: 'KSamplerSelect', inputs: { sampler_name: turbo === 'pdd' ? 'euler' : job.sampler } };
  g.sched = { class_type: 'BasicScheduler', inputs: { model: dm, scheduler: job.scheduler, steps, denoise: job.denoise } };
  let condLink: L = ['cond', 0];
  if (has('TJ_FreeTextEncoderVRAM')) { g.free = { class_type: 'TJ_FreeTextEncoderVRAM', inputs: { clip: ['clip', 0], trigger: condLink } }; condLink = ['free', 0]; }
  g.guider = { class_type: 'BasicGuider', inputs: { model: dm, conditioning: condLink } };
  g.samp = { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: ['guider', 0], sampler: ['samp0', 0], sigmas: ['sched', 0], latent_image: ['den', 0] } };
  g.dec = { class_type: 'VAEDecode', inputs: { samples: ['samp', 0], vae: ['vaeV', 0] } };
  g.stitch = { class_type: 'H3FaceStitch', inputs: { base_images: images, refined_crops: ['dec', 0], transform: ['track', 1], paste_region: job.paste, mask_dilation: 16, feather: job.feather, colour_match: job.colour, blend: job.blend, undetected_frames: job.undetected } };
  const save = await addVideoSave(g, ['stitch', 0], ['lock', 1], FPS, `${job.saveSubfolder}/${job.stem}_FACEREFINE`, 'F');
  return { graph: g, save };
}

// ---- Pick Faces (FaceRefine pack's own scan route)
export interface FaceShot { segment: number; frame: number; faces: number; boxes: number[][]; jpg: string }
export const scanFaces = (body: Record<string, unknown>) =>
  postJson<{ ok?: boolean; shots?: FaceShot[]; error?: string; frames?: number; width?: number; height?: number }>('/h3_facerefine/scan', body);
export { h3ModelLists };
