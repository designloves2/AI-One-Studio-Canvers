// Client for the routes that ComfyUI-TJ_NODE_STUDIO_ONE adds to ComfyUI.
import { getJson, postJson } from './http';

export type Family = 'klein' | 'zimage' | 'krea2' | 'sdxl' | 'anima' | 'qwen' | 'qwen21';

export const FAMILIES: Record<Family, { prefix: string; label: string; match: RegExp }> = {
  klein: { prefix: '/flux_klein', label: 'Flux.2 Klein', match: /klein/i },
  zimage: { prefix: '/z_image_turbo', label: 'Z-Image Turbo', match: /z[_-]?image/i },
  krea2: { prefix: '/krea2_one', label: 'Krea 2', match: /krea/i },
  qwen: { prefix: '/qwen2511_one', label: 'Qwen Image Edit 2511', match: /qwen.*(image|edit)/i },
  qwen21: { prefix: '/qwenimage21_one', label: 'Qwen Image 2.1', match: /qwen.*(image|2\.?1)/i },
  anima: { prefix: '/anima_one', label: 'Anima', match: /anima/i },
  sdxl: { prefix: '/sdxl_one', label: 'SDXL', match: /xl|juggernaut|pony|illustrious/i },
};

export interface ModelLists {
  diffusion_models: string[];
  /** SDXL: all-in-one checkpoints */
  checkpoints?: string[];
  text_encoders: string[];
  vaes: string[];
  loras: string[];
}

const cache = new Map<string, Promise<any>>();
const memo = <T,>(key: string, fn: () => Promise<T>): Promise<T> => {
  if (!cache.has(key)) cache.set(key, fn().catch((e) => { cache.delete(key); throw e; }));
  return cache.get(key)!;
};
export const clearStudioCache = () => cache.clear();

export const getModels = (f: Family): Promise<ModelLists> => memo(`models:${f}`, () => getJson(`${FAMILIES[f].prefix}/models`));
export const getConfig = (f: Family): Promise<Record<string, any>> => memo(`config:${f}`, () => getJson(`${FAMILIES[f].prefix}/config`));

/** API-format workflow template served by STUDIO_ONE (deep-copied on every call). */
export async function getWorkflow(f: Family, name: string): Promise<Record<string, any>> {
  const wf = await memo(`wf:${f}:${name}`, () => getJson(`${FAMILIES[f].prefix}/workflow_${name}`));
  return JSON.parse(JSON.stringify(wf));
}

export interface GalleryItem { filename: string; subfolder: string; mtime: number; key: string; favorite?: boolean }
export const getGallery = (f: Family, subfolder: string, offset = 0, limit = 40): Promise<{ images: GalleryItem[]; total: number }> =>
  getJson(`${FAMILIES[f].prefix}/gallery?subfolder=${encodeURIComponent(subfolder)}&offset=${offset}&limit=${limit}`);

export const deleteOutput = (f: Family, filename: string, subfolder: string) =>
  postJson(`${FAMILIES[f].prefix}/delete`, { filename, subfolder });

export const copyToInput = (f: Family, filename: string, subfolder: string, type = 'output'): Promise<{ ok: boolean; filename: string }> =>
  postJson(`${FAMILIES[f].prefix}/copy_to_input`, { filename, subfolder, type });

/** Resolve the model files to use for a family: user override → STUDIO_ONE's saved choice (if installed) → best name match. */
export async function pickModels(f: Family, override?: { model?: string; textEncoder?: string; vae?: string }) {
  const [lists, cfg] = await Promise.all([getModels(f).catch(() => null), getConfig(f).catch(() => ({} as Record<string, any>))]);
  const real = (a?: string[]) => (a ?? []).filter((x) => x && x !== 'none');
  const pick = (given: string | undefined, saved: string | undefined, list: string[] | undefined, re?: RegExp) => {
    const have = real(list);
    // a saved choice only counts when the file is really installed (the default config names files you may not have)
    const savedOk = saved && (!have.length || have.includes(saved)) ? saved : '';
    return given || savedOk || (re ? have.find((x) => re.test(x)) : undefined) || have[0] || '';
  };
  const m = FAMILIES[f].match;
  const modelList = f === 'sdxl' ? lists?.checkpoints : lists?.diffusion_models;
  const savedModel = f === 'sdxl' ? (cfg.selected_checkpoint || cfg.checkpoint) : cfg.selected_model;
  return {
    model: pick(override?.model, savedModel, modelList, f === 'sdxl' ? undefined : m),
    textEncoder: pick(override?.textEncoder, cfg.selected_text_encoder, lists?.text_encoders, f === 'klein' ? /qwen.*8b/i : f === 'krea2' ? /qwen3vl/i : f === 'anima' ? /qwen_3_06b/i : f === 'qwen' || f === 'qwen21' ? /qwen_2\.5_vl|qwen.*vl|qwen3/i : /qwen.*4b/i),
    vae: pick(override?.vae, cfg.selected_vae, lists?.vaes, f === 'klein' ? /flux2/i : f === 'krea2' || f === 'anima' || f === 'qwen' || f === 'qwen21' ? /qwen_image/i : /^ae/i),
    negative: (cfg.negative_prompt as string) ?? '',
    suffix: (cfg.prompt_suffix as string) ?? '',
    lists,
  };
}
