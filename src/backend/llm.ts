// LLM access with the four backends of the "LLM (TJ)" node (ComfyUI-TJ_NODE):
//   local      → GGUF / llama.cpp
//   comfy      → ComfyUI TextGenerate
//   openrouter → OpenRouter cloud models
//   custom     → Connect Custom (any OpenAI-compatible server)
// All four are served by ComfyUI-TJ_NODE_STUDIO_ONE's /tj_studio_one/llm/* and /tj_shared/* routes.
import { useLlmLog } from './llmLog';
import { acquireLocalLlm, type NoticePlace } from './llmGuard';
import type { Asset } from '../types';
import { getJson, postJson } from './http';
import { fetchBlob } from './comfy';
import { notify } from '../ui/dialog';
import { DEFAULT_LLM, llmDirty, useSettings, type LlmBackend, type LlmSettings } from '../store/settings';

export const BACKENDS: { id: LlmBackend; label: string; hint: string }[] = [
  { id: 'local', label: 'Local GGUF (llama.cpp)', hint: 'Runs a .gguf model inside ComfyUI (needs ComfyUI-TJ_NODE + llama-cpp-python).' },
  { id: 'comfy', label: 'ComfyUI TextGenerate', hint: 'Uses ComfyUI\'s own text-encoder LLM (e.g. Gemma) — no extra install.' },
  { id: 'openrouter', label: 'OpenRouter', hint: 'Cloud models through one OpenRouter key.' },
  { id: 'custom', label: 'Connect Custom', hint: 'LM Studio, Ollama, llama.cpp server or any OpenAI-compatible gateway.' },
];

export interface LlmCatalog {
  ok: boolean;
  error?: string;
  gguf: string[];
  mmproj: string[];
  text_encoders: string[];
  clip_loader_types: string[];
  local_available?: boolean;
  openrouter_key_set?: boolean;
  openrouter_key_hint?: string;
  or_model_text?: string;
  or_model_vision?: string;
}

export const fetchCatalog = (): Promise<LlmCatalog> => getJson('/tj_studio_one/llm/models');

// ---- settings kept on the server so every browser sees the same ones (own key prefix; no secrets)
const PREFIX = 'canvers_llm_';
const VPREFIX = 'canvers_vision_';

export async function loadServerSettings(): Promise<void> {
  const was = { main: new Set(llmDirty.main), vision: new Set(llmDirty.vision), same: llmDirty.same };   // what the server sends is not a change of ours
  try {
    const { settings } = await getJson<{ settings: Record<string, any> }>('/tj_shared/llm_settings');
    const patch: Partial<LlmSettings> = {};
    for (const k of Object.keys(DEFAULT_LLM) as (keyof LlmSettings)[]) {
      const v = settings?.[PREFIX + k];
      if (v !== undefined && typeof v === typeof DEFAULT_LLM[k]) (patch as any)[k] = v;
    }
    if (Object.keys(patch).length) useSettings.getState().setLlm(patch);
    // LLM (Vision): kept on the server too, so every browser / port of this canvas shares it
    const vp: Partial<LlmSettings> = {};
    for (const k of Object.keys(DEFAULT_LLM) as (keyof LlmSettings)[]) {
      const v = settings?.[VPREFIX + k];
      if (v !== undefined && typeof v === typeof DEFAULT_LLM[k]) (vp as any)[k] = v;
    }
    if (Object.keys(vp).length) useSettings.getState().setVisionLlm(vp);
    if (typeof settings?.[VPREFIX + 'same'] === 'boolean') useSettings.getState().setVision({ same: settings[VPREFIX + 'same'] });
  } catch { /* backend without the route: browser copy is used */ }
  llmDirty.main = was.main; llmDirty.vision = was.vision; llmDirty.same = was.same;
}

export async function saveServerSettings(): Promise<void> {
  const llm = useSettings.getState().llm;
  const flat: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(llm)) if (llmDirty.main.has(k)) flat[PREFIX + k] = v as any;
  const { vision } = useSettings.getState();
  for (const [k, v] of Object.entries(vision.llm)) if (llmDirty.vision.has(k)) flat[VPREFIX + k] = v as any;
  if (llmDirty.same) flat[VPREFIX + 'same'] = vision.same;
  if (!Object.keys(flat).length) return;
  await postJson('/tj_shared/llm_settings', { settings: flat });
  llmDirty.main.clear(); llmDirty.vision.clear(); llmDirty.same = false;
}

export async function saveOpenRouter(keyOrUndefined?: string): Promise<{ openrouter_key_set: boolean; openrouter_key_hint: string }> {
  const { llm } = useSettings.getState();
  return postJson('/tj_studio_one/llm/config', {
    ...(keyOrUndefined ? { openrouter_key: keyOrUndefined } : {}),
    or_model_text: llm.or_model_text, or_model_vision: llm.or_model_vision,
  });
}

// ---- Connect Custom: the key goes to server memory once per role
const sentKeys = new Map<string, string>();
const ROLES = { text: 'img_enhance', vision: 'img_i2p' } as const;

export interface ConnectResult { ok: boolean; error?: string; models?: string[]; modelFound?: boolean | null; ms?: number; keyStored?: boolean; note?: string }

export async function connectCustom(role: string = ROLES.text, which?: LlmSettings): Promise<ConnectResult> {
  const { keys } = useSettings.getState(); const llm = which ?? useSettings.getState().llm;
  const res = await postJson<ConnectResult>('/tj_shared/custom_llm/connect', {
    role, base_url: llm.custom_base, api_key: keys.custom, model: llm.custom_model,
  });
  if (res.ok && keys.custom) sentKeys.set(role, `${llm.custom_base}|${keys.custom}`);
  return res;
}

async function ensureCustomKeys(roles: string[], which?: LlmSettings): Promise<void> {
  const { keys } = useSettings.getState(); const llm = which ?? useSettings.getState().llm;
  if (!keys.custom) return; // gateway without a key (or key already on the server)
  for (const r of roles) {
    if (sentKeys.get(r) !== `${llm.custom_base}|${keys.custom}`) await connectCustom(r, which);
  }
}

// ---- generation
export interface LlmRequest {
  /** where the 'waiting for the generation' notice is shown: inside the Live Canvas chat, or above the bottom toolbar (default) */
  where?: NoticePlace;
  /** full system prompt (used when `style` and `refine` are not given) */
  system: string;
  /** let the server build the system prompt from the target model format / aesthetic / purpose (ONE STUDIO style) */
  style?: { model_format: string; aesthetic: string; purpose: string; extra_instructions: string };
  /** revise `prompt` according to this instruction instead of enhancing it */
  refine?: string;
  prompt: string;
  images?: Asset[];
  /** override a few sampler knobs per call */
  temperature?: number;
  max_tokens?: number;
  /** use these LLM settings instead of the main ones (Live Canvas has its own) */
  llm?: LlmSettings;
  /** a short name for the call in the LLM log (for example 'director') */
  tag?: string;
}

const toDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(String(fr.result));
  fr.onerror = () => rej(fr.error);
  fr.readAsDataURL(b);
});

/** Downscale to keep the request small (long edge ≤ 1280) and return a JPEG data URL. */
async function imageDataUrl(a: Asset, maxEdge = 1280): Promise<string> {
  const blob = await fetchBlob(a);
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const out = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.9));
  return toDataUrl(out);
}

function common(l: LlmSettings, req: LlmRequest) {
  return {
    backend: l.backend,
    temperature: req.temperature ?? l.temperature,
    max_tokens: req.max_tokens ?? l.max_tokens,
    gguf_model: l.gguf_model, mmproj_file: l.mmproj_file,
    n_ctx: l.n_ctx, n_gpu_layers: l.n_gpu_layers,
    text_encoder_name: l.text_encoder_name, clip_loader_type: l.clip_loader_type,
    or_model: l.or_model_text,
    custom_base: l.custom_base, custom_model: l.custom_model, custom_ctx: l.custom_ctx || undefined,
  };
}

/** ComfyUI's progress hook reads `PromptServer.last_prompt_id`, which only exists after the first queued prompt since the server started.
 *  The ComfyUI-TextGenerate / local GGUF backends run the sampler outside a prompt, so right after a restart they fail with
 *  "'PromptServer' object has no attribute 'last_prompt_id'". One tiny no-op prompt sets it. */
let warmed = false;
async function warmUpServer(): Promise<void> {
  if (warmed) return; warmed = true;
  try {
    await postJson('/prompt', { prompt: { 1: { class_type: 'EmptyImage', inputs: { width: 64, height: 64, batch_size: 1, color: 0 } }, 2: { class_type: 'PreviewImage', inputs: { images: ['1', 0] } } } });
    await new Promise((r) => setTimeout(r, 2500));
  } catch { /* the retry below reports the real error */ }
}

/** A local LLM never runs together with a generation or another local LLM (that can crash ComfyUI): it waits its turn, with a yellow notice. */
/** the settings a request runs with: a request with images uses the LLM (Vision) when it is set apart from the Brief LLM */
function llmFor(req: LlmRequest): LlmSettings {
  if (req.llm) return req.llm;
  const { llm, vision } = useSettings.getState();
  return req.images?.length && !vision.same ? vision.llm : llm;
}

/** what the server reported for the call that just finished (read right after it) */
let lastUsage: { input?: number; output?: number } | undefined;

export async function runLlm(req: LlmRequest): Promise<string> {
  const l = llmFor(req);
  const release = await acquireLocalLlm(l.backend, req.where);
  const t0 = Date.now(); const inChars = (req.system?.length ?? 0) + (req.prompt?.length ?? 0) + (req.refine?.length ?? 0);
  const model = l.backend === 'local' ? l.gguf_model : l.backend === 'comfy' ? l.text_encoder_name : l.backend === 'openrouter' ? l.or_model_text : l.custom_model;
  try {
    const out = await runLlmNow({ ...req, llm: l }, false);
    useLlmLog.getState().add({ tag: req.tag ?? '', backend: l.backend, model: String(model ?? ''), inChars, outChars: out.length, ms: Date.now() - t0, ok: true, usage: lastUsage });
    return out;
  } catch (e) {
    useLlmLog.getState().add({ tag: req.tag ?? '', backend: l.backend, model: String(model ?? ''), inChars, outChars: 0, ms: Date.now() - t0, ok: false, error: (e as Error).message.slice(0, 200) });
    throw e;
  } finally { release(); }
}

async function runLlmNow(req: LlmRequest, retried: boolean): Promise<string> {
  const l = req.llm ?? useSettings.getState().llm;
  const images = req.images ?? [];
  if (l.backend === 'comfy' && !l.text_encoder_name) {
    const vis = !!images.length && l === useSettings.getState().vision.llm;
    throw new Error(`ComfyUI TextGenerate has no text encoder: pick one in Settings → ${vis ? 'LLM (Vision)' : 'LLM (Brief)'} backend and save.`);
  }

  // OpenRouter has no default model: nothing is sent until one is picked
  if (l.backend === 'openrouter' && !(images.length ? l.or_model_vision : l.or_model_text).trim()) {
    const msg = 'OpenRouter 모델이 선택되지 않았습니다. 설정 > LLM 에서 모델을 선택하세요.';
    void notify(msg); throw new Error(msg);
  }

  if (l.backend === 'custom') {
    if (!l.custom_base.trim()) throw new Error('Connect Custom: set the base URL in Settings → LLM');
    if (!l.custom_model.trim()) throw new Error('Connect Custom: pick a model in Settings → LLM');
    await ensureCustomKeys(images.length ? [ROLES.text, ROLES.vision] : [ROLES.text], req.llm);
  }

  let res: { ok: boolean; result?: string; error?: string };
  if (images.length) {
    const b64 = await imageDataUrl(images[0]);
    const instruction = [req.system, req.prompt].filter(Boolean).join('\n\n');
    res = await postJson('/tj_studio_one/llm/image_to_prompt', {
      ...common(l, req),
      or_model: l.or_model_vision,
      image_b64: b64,
      vision_task: 'Custom Instruction',
      custom_instruction: instruction,
      model_format: 'Universal Natural Language',
    });
  } else {
    res = await postJson('/tj_studio_one/llm/enhance', {
      ...common(l, req),
      ...(req.refine ? { refine_instruction: req.refine, ...(req.style ?? {}) }
        : req.style ? { ...req.style }
        : { system_override: req.system || 'You are a helpful assistant. Answer concisely.' }),
      prompt: req.prompt,
    });
  }
  if (!res.ok && !retried && /last_prompt_id/.test(res.error ?? '')) { await warmUpServer(); return runLlmNow(req, true); }
  if (!res.ok) throw new Error(res.error || 'LLM request failed');
  const u = (res as { usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number } }).usage;
  lastUsage = u ? { input: u.input_tokens ?? u.prompt_tokens, output: u.output_tokens ?? u.completion_tokens } : undefined;
  return (res.result ?? '').trim();
}

export async function connectOpenRouterKey(key: string) {
  const r = await saveOpenRouter(key);
  useSettings.getState().setKey('openrouter', '');
  return r;
}

/** LLM settings for the Live Canvas chat: its own when chosen in Settings, otherwise undefined (= the main LLM). */
/** the LLM settings of the Director crew (undefined = follow the main LLM) */
export const directorLlmSettings = (): LlmSettings | undefined => { const { director } = useSettings.getState(); return director.same ? undefined : director.llm; };
export const liveLlmSettings = (): LlmSettings | undefined => { const { live } = useSettings.getState(); return live.same ? undefined : live.llm; };
