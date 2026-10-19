// MusicMaker engines of STUDIO_ONE: Ace-Step 1.5 and MiniMax Music 3 (YuE2 is not wired yet).
import { getJson } from './http';

export interface MusicJob {
  engine: 'acestep' | 'minimax';
  caption: string; lyrics: string; seconds: number; seed: number;
  bpm: number; keyscale: string; timesignature: string; language: string;
  format: 'flac' | 'mp3' | 'opus';
  stageSteps: number[]; cfg: number;
  models: Record<string, string>;
  saveSubfolder: string;
}

export interface MusicModels { diffusion_models: string[]; text_encoders: string[]; vaes: string[]; loras: string[] }
let cache: Promise<{ models: MusicModels; cfg: Record<string, any> }> | null = null;
export function musicBackend() {
  cache ??= Promise.all([getJson<MusicModels>('/music_one/models'), getJson<Record<string, any>>('/music_one/config').catch(() => ({}))])
    .then(([models, cfg]) => ({ models, cfg })).catch((e) => { cache = null; throw e; });
  return cache;
}

const real = (a?: string[]) => (a ?? []).filter((x) => x && x !== 'none');
const unet = (name: string) => (name.toLowerCase().endsWith('.gguf')
  ? { class_type: 'UnetLoaderGGUF', inputs: { unet_name: name } }
  : { class_type: 'UNETLoader', inputs: { unet_name: name, weight_dtype: 'default' } });

/** user choice → STUDIO_ONE's saved choice (if installed) → name match */
export async function resolveMusicModels(user: Record<string, string>) {
  const { models, cfg } = await musicBackend();
  const pick = (key: string, cfgKey: string, list: string[], re: RegExp) => {
    const have = real(list);
    const saved = cfg[cfgKey] as string | undefined;
    return user[key] || (saved && have.includes(saved) ? saved : '') || have.find((x) => re.test(x)) || '';
  };
  return {
    ace_unet: pick('ace_unet', 'ace_unet', models.diffusion_models, /ace/i),
    ace_clip1: pick('ace_clip1', 'ace_clip1', models.text_encoders, /qwen.*0\.6|0\.6b/i),
    ace_clip2: pick('ace_clip2', 'ace_clip2', models.text_encoders, /qwen.*4b|ace/i),
    ace_vae: pick('ace_vae', 'ace_vae', models.vaes, /ace/i),
    dit: pick('dit', 'dit', models.diffusion_models, /minimax.*music|music/i),
    clip: pick('clip', 'clip', models.text_encoders, /minimax|music/i),
    dav: pick('dav', 'dav', models.vaes, /audio|music/i),
    sampler: (cfg.ace_sampler_name as string) || 'jkass_quality',
    scheduler: (cfg.ace_scheduler as string) || 'sgm_uniform',
    shift: Number(cfg.ace_shift ?? 3),
  };
}

function saveAudio(link: [string, number], prefix: string, format: string) {
  const inputs: Record<string, unknown> = { audio: link, filename_prefix: prefix, format };
  if (format === 'mp3') inputs['format.quality'] = 'V0';
  if (format === 'opus') inputs['format.quality'] = '128k';
  return { class_type: 'SaveAudioAdvanced', inputs };
}

export async function buildMusicGraph(job: MusicJob): Promise<Record<string, any>> {
  if (!job.caption.trim()) throw new Error('Style (prompt) is empty');
  const m = await resolveMusicModels(job.models);
  const g: Record<string, any> = {};
  const prefix = `${job.saveSubfolder}/${job.engine === 'acestep' ? 'ACE' : 'MMM'}`;

  if (job.engine === 'minimax') {
    if (!m.dit || !m.clip || !m.dav) throw new Error('Pick the MiniMax Music models (DiT / text encoder / audio VAE) in Settings → Music models.');
    g['M:clip'] = { class_type: 'CLIPLoader', inputs: { clip_name: m.clip, type: 'minimax', device: 'default' } };
    g['M:unet'] = unet(m.dit);
    g['M:vae'] = { class_type: 'VAELoader', inputs: { vae_name: m.dav } };
    g['M:te'] = { class_type: 'MiniMaxMusic3TextEncode', inputs: { clip: ['M:clip', 0], caption: job.caption, lyrics: job.lyrics, seed: job.seed, max_duration: job.seconds, cfg_scale: 1.7, top_k: 50 } };
    g['M:zero'] = { class_type: 'ConditioningZeroOut', inputs: { conditioning: ['M:te', 0] } };
    g['M:lat'] = { class_type: 'EmptyMiniMaxMusic3LatentAudio', inputs: { seconds: ['M:te', 1], batch_size: 1 } };
    g['M:samp'] = { class_type: 'KSampler', inputs: { model: ['M:unet', 0], positive: ['M:te', 0], negative: ['M:zero', 0], latent_image: ['M:lat', 0], seed: job.seed, steps: job.stageSteps[0] ?? 30, cfg: job.cfg, sampler_name: 'euler', scheduler: 'simple', denoise: 1 } };
    g['M:dec'] = { class_type: 'VAEDecodeAudio', inputs: { samples: ['M:samp', 0], vae: ['M:vae', 0] } };
    g['M:save'] = saveAudio(['M:dec', 0], prefix, job.format);
    return g;
  }

  if (!m.ace_unet || !m.ace_clip1 || !m.ace_clip2 || !m.ace_vae) throw new Error('Pick the Ace-Step models (diffusion / CLIP ×2 / VAE) in Settings → Music models.');
  g['A:unet'] = unet(m.ace_unet);
  g['A:shift'] = { class_type: 'ModelSamplingAuraFlow', inputs: { model: ['A:unet', 0], shift: m.shift } };
  g['A:clip'] = { class_type: 'DualCLIPLoader', inputs: { clip_name1: m.ace_clip1, clip_name2: m.ace_clip2, type: 'ace', device: 'default' } };
  g['A:vae'] = { class_type: 'VAELoader', inputs: { vae_name: m.ace_vae } };
  g['A:pos'] = { class_type: 'TextEncodeAceStepAudio1.5', inputs: {
    clip: ['A:clip', 0], tags: job.caption, lyrics: job.lyrics, seed: job.seed, bpm: Math.round(job.bpm), duration: job.seconds,
    timesignature: job.timesignature, language: job.language, keyscale: job.keyscale, generate_audio_codes: true,
    cfg_scale: 2.5, temperature: 0.75, top_p: 0.9, top_k: 0, min_p: 0,
  } };
  g['A:neg'] = { class_type: 'CLIPTextEncode', inputs: { clip: ['A:clip', 0], text: '' } };
  g['A:lat'] = { class_type: 'EmptyAceStep1.5LatentAudio', inputs: { seconds: job.seconds, batch_size: 1 } };
  g['A:sel'] = { class_type: 'KSamplerSelect', inputs: { sampler_name: m.sampler } };
  let lat: [string, number] = ['A:lat', 0];
  job.stageSteps.filter((n) => n > 0).forEach((steps, i) => {
    g[`A:sched${i}`] = { class_type: 'BasicScheduler', inputs: { model: ['A:shift', 0], scheduler: m.scheduler, steps, denoise: 1 } };
    g[`A:s${i}`] = { class_type: 'SamplerCustom', inputs: { model: ['A:shift', 0], add_noise: true, noise_seed: job.seed, cfg: job.cfg, positive: ['A:pos', 0], negative: ['A:neg', 0], sampler: ['A:sel', 0], sigmas: [`A:sched${i}`, 0], latent_image: lat } };
    lat = [`A:s${i}`, 0];
  });
  g['A:dec'] = { class_type: 'VAEDecodeAudio', inputs: { samples: lat, vae: ['A:vae', 0] } };
  g['A:save'] = saveAudio(['A:dec', 0], prefix, job.format);
  return g;
}
