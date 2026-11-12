// H3 Image Generator on the official MiniMax H3 Image nodes (node SPEC_RELAY_H3_IMAGE_OFFICIAL, section 1):
// UNETLoader -> (LoRAs) -> KSampler, CLIPLoader(minimax) + VAELoader -> MiniMaxH3ImageConditioning (+ ConditioningZeroOut as the negative) -> VAEDecode -> SaveImage.
// Text to image, or Reference to image (up to 9 references). Character Sheet does NOT use this: it keeps its own video-pipeline route (charSheet.ts).
import { hasNode } from './post';
import { h3ModelLists, h3Size, real, resolveH3Models, type L } from './h3';

export interface H3ImageJob {
  refs: string[]; prompt: string; aspect: string; megapixels: number;
  /** megapixels each reference image is scaled to first (0 = as uploaded) */
  refMp: number; steps: number;
  loras: { name: string; strength: number }[];
  seed: number; models: Record<string, string>; saveSubfolder: string; stem: string;
}

/** The image-only MODEL / CLIP / VAE (Settings → Video models → H3). A blank slot uses the matching file found by name, else the video model. */
export async function resolveH3ImageModels(user: Record<string, string>, ref: boolean) {
  const l = await h3ModelLists();
  const video = await resolveH3Models(user, ref ? 'reference' : 'firstlast');
  const find = (list: string[] | undefined, ...res: RegExp[]) => { for (const re of res) { const hit = real(list).find((x) => re.test(x)); if (hit) return hit; } return ''; };
  const own = ref ? user.h3_img_unet_ref2i : user.h3_img_unet_t2i;
  return {
    unet: own || find(l.diffusion_models, /minimax_h3_image/i, /h3.?image/i) || video.unet,
    clip: user.h3_img_clip || video.clip,
    vae: user.h3_img_vae || find(l.vaes, /h3.*image.*vae|image.*vae/i) || video.vaeVideo,
  };
}

export async function buildH3ImageGraph(j: H3ImageJob): Promise<{ graph: Record<string, any>; save: string }> {
  const ref = j.refs.length > 0;
  const m = await resolveH3ImageModels(j.models, ref);
  if (!m.unet) throw new Error('Image MODEL is not set — pick it in Settings → Video models → MiniMax H3 (Image).');
  if (!m.clip) throw new Error('Image CLIP is not set — pick the text encoder in Settings → Video models → MiniMax H3.');
  if (!m.vae) throw new Error('Image VAE is not set — pick it in Settings → Video models → MiniMax H3 (Image).');
  if (!j.prompt.trim()) throw new Error('Prompt is empty');
  for (const n of ['MiniMaxH3ImageConditioning', 'ConditioningZeroOut']) if (!(await hasNode(n))) throw new Error(`${n} is not available — update ComfyUI to a version with the official MiniMax H3 Image nodes, then restart.`);
  if (ref && !(await hasNode('ResizeImageMaskNode'))) throw new Error('ResizeImageMaskNode is not available — update ComfyUI.');
  const size = h3Size(j.aspect, j.megapixels);   // multiples of 32
  const g: Record<string, any> = {};
  g.unet = { class_type: 'UNETLoader', inputs: { unet_name: m.unet, weight_dtype: 'default' } };
  let model: L = ['unet', 0];
  j.loras.forEach((l, i) => {
    if (!l.name || l.name === 'none' || !(l.strength > 0)) return;
    g[`lora${i}`] = { class_type: 'LoraLoaderModelOnly', inputs: { model, lora_name: l.name, strength_model: l.strength } }; model = [`lora${i}`, 0];
  });
  g.clip = { class_type: 'CLIPLoader', inputs: { clip_name: m.clip, type: 'minimax', device: 'default' } };
  g.vae = { class_type: 'VAELoader', inputs: { vae_name: m.vae } };
  const cond: Record<string, any> = { clip: ['clip', 0], vae: ['vae', 0], prompt: j.prompt, width: size.width, height: size.height };
  j.refs.slice(0, 9).forEach((f, i) => {
    g[`ref${i}`] = { class_type: 'LoadImage', inputs: { image: f } };
    let link: L = [`ref${i}`, 0];
    if (j.refMp > 0) { g[`refmp${i}`] = { class_type: 'ResizeImageMaskNode', inputs: { input: link, resize_type: 'scale total pixels', 'resize_type.megapixels': j.refMp, scale_method: 'area' } }; link = [`refmp${i}`, 0]; }
    g[`refsnap${i}`] = { class_type: 'ResizeImageMaskNode', inputs: { input: link, resize_type: 'scale to multiple', 'resize_type.multiple': 32, scale_method: 'area' } };
    cond[`images.image_${i}`] = [`refsnap${i}`, 0];
  });
  g.cond = { class_type: 'MiniMaxH3ImageConditioning', inputs: cond };
  g.neg = { class_type: 'ConditioningZeroOut', inputs: { conditioning: ['cond', 0] } };
  g.samp = { class_type: 'KSampler', inputs: { model, positive: ['cond', 0], negative: ['neg', 0], latent_image: ['cond', 1], seed: j.seed, steps: Math.max(1, Math.round(j.steps)), cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise: 1 } };
  g.dec = { class_type: 'VAEDecode', inputs: { samples: ['samp', 0], vae: ['vae', 0] } };
  g.save = { class_type: 'SaveImage', inputs: { filename_prefix: `${j.saveSubfolder}/${j.stem}_h3img`, images: ['dec', 0] } };
  return { graph: g, save: 'save' };
}
