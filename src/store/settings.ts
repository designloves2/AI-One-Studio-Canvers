import { create } from 'zustand';

export type LlmBackend = 'local' | 'comfy' | 'openrouter' | 'custom';

export interface LlmSettings {
  backend: LlmBackend;
  // 1) Local GGUF (llama.cpp)
  gguf_model: string;
  mmproj_file: string;
  n_ctx: number;
  n_gpu_layers: number;
  // 2) ComfyUI TextGenerate
  text_encoder_name: string;
  clip_loader_type: string;
  // 3) OpenRouter
  or_model_text: string;
  or_model_vision: string;
  // 4) Connect Custom (OpenAI-compatible)
  custom_base: string;
  custom_model: string;
  custom_ctx: number;
  // shared
  temperature: number;
  max_tokens: number;
}

export const DEFAULT_LLM: LlmSettings = {
  backend: 'custom',
  gguf_model: '', mmproj_file: 'none', n_ctx: 4096, n_gpu_layers: -1,
  text_encoder_name: '', clip_loader_type: 'Auto',
  or_model_text: '', or_model_vision: '',   // OpenRouter has no default model: the user picks one
  custom_base: 'http://localhost:3000/v1', custom_model: '', custom_ctx: 0,
  temperature: 0.7, max_tokens: 1000,
};

/** the LLM settings keys the user changed since the last save: only those are saved to the server (an old copy must not overwrite what another page saved) */
export const llmDirty = { main: new Set<string>(), vision: new Set<string>(), same: false };

export interface ModelChoice { model: string; textEncoder: string; vae: string }

export interface Settings {
  /** '' = same origin (dev/prod proxy). Otherwise e.g. http://127.0.0.1:8188 (needs --enable-cors-header) */
  comfyUrl: string;
  llm: LlmSettings;
  /** Live Canvas chat LLM: same = follow the main LLM above, otherwise use `llm` here */
  live: { same: boolean; llm: LlmSettings };
  /** Director mode crew: its own LLM (the same four backends). same = follow the main LLM above. A copy of the main LLM is the starting point the first time. */
  director: { same: boolean; llm: LlmSettings };
  /** LLM (Vision): describes images; same = follow the Brief LLM. Canvers' own setting, separate from the ONE STUDIO nodes. */
  vision: { same: boolean; llm: LlmSettings };
  /** API keys live in memory only; they are sent to the backend once (never persisted here). */
  keys: { custom: string; openrouter: string };
  /** per image family overrides picked in Settings → Image models (blank = backend default) */
  models: Record<string, ModelChoice>;
  /** MusicMaker model files (ace_unet, ace_clip1, ace_clip2, ace_vae, dit, clip, dav); blank = backend default */
  music: Record<string, string>;
  /** LTX 2.5 model files (ltx_unet, ltx_clip, ltx_vae_video, ltx_vae_audio, ltx_upscaler) */
  video: Record<string, string>;
  /** the 7+1 Turbo LoRAs picked last: `fl` for first/last-frame videos, `ref` for multi-reference videos (kept until changed) */
  h3Turbo: { fl: string; ref: string };
  /** advanced settings of some cards, as the user last changed them: new cards start with these (defId → param → value) */
  lastParams: Record<string, Record<string, string | number | boolean>>;
  rememberParam: (defId: string, key: string, v: string | number | boolean) => void;
  setH3Turbo: (patch: Partial<{ fl: string; ref: string }>) => void;
  setVideo: (k: string, v: string) => void;
  saveSubfolder: string;
  /** load the original STUDIO_ONE panels as extra (legacy) nodes; off = card nodes only */
  hostPanels: boolean;
  setMusic: (k: string, v: string) => void;
  set: (patch: Partial<Pick<Settings, 'comfyUrl' | 'saveSubfolder' | 'hostPanels'>>) => void;
  setLlm: (patch: Partial<LlmSettings>) => void;
  setVision: (patch: Partial<{ same: boolean }>) => void;
  setVisionLlm: (patch: Partial<LlmSettings>) => void;
  setDirector: (patch: Partial<{ same: boolean }>) => void;
  setDirectorLlm: (patch: Partial<LlmSettings>) => void;
  setLive: (patch: Partial<{ same: boolean }>) => void;
  setLiveLlm: (patch: Partial<LlmSettings>) => void;
  setKey: (which: 'custom' | 'openrouter', v: string) => void;
  setModel: (family: string, patch: Partial<ModelChoice>) => void;
}

const KEY = 'canvers.settings.v1';

function load(): Partial<Settings> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}

export const useSettings = create<Settings>((set, get) => {
  const saved = load();
  const persist = () => {
    const { comfyUrl, llm, live, vision, director, models, saveSubfolder, music, video, hostPanels, h3Turbo, lastParams } = get();
    try { localStorage.setItem(KEY, JSON.stringify({ comfyUrl, llm, live, vision, director, models, saveSubfolder, music, video, hostPanels, h3Turbo, lastParams })); } catch { /* ignore */ }
  };
  return {
    comfyUrl: saved.comfyUrl ?? '',
    llm: { ...DEFAULT_LLM, ...(saved.llm ?? {}) },
    vision: { same: saved.vision?.same ?? true, llm: { ...DEFAULT_LLM, ...(saved.vision?.llm ?? {}) } },
    live: { same: saved.live?.same ?? true, llm: { ...DEFAULT_LLM, temperature: 0.5, max_tokens: 3500, ...(saved.live?.llm ?? {}) } },
    director: { same: saved.director?.same ?? false, llm: { ...DEFAULT_LLM, ...(saved.llm ?? {}), temperature: 0.6, max_tokens: 7000, ...(saved.director?.llm ?? {}) } },
    keys: { custom: '', openrouter: '' },
    models: saved.models ?? {},
    saveSubfolder: saved.saveSubfolder ?? 'ai-one-canvers',
    hostPanels: saved.hostPanels ?? false,
    music: saved.music ?? {},
    video: saved.video ?? {},
    h3Turbo: { fl: saved.h3Turbo?.fl ?? '', ref: saved.h3Turbo?.ref ?? '' },
    lastParams: saved.lastParams ?? {},
    rememberParam: (defId, key, v) => { set({ lastParams: { ...get().lastParams, [defId]: { ...get().lastParams[defId], [key]: v } } }); persist(); },
    setH3Turbo: (patch) => { set({ h3Turbo: { ...get().h3Turbo, ...patch } }); persist(); },
    setVideo: (k, v) => { set({ video: { ...get().video, [k]: v } }); persist(); },
    setMusic: (k, v) => { set({ music: { ...get().music, [k]: v } }); persist(); },
    set: (patch) => { set(patch); persist(); },
    setLlm: (patch) => { for (const k of Object.keys(patch)) llmDirty.main.add(k); set({ llm: { ...get().llm, ...patch } }); persist(); },
    setVision: (patch) => { if ('same' in patch) llmDirty.same = true; set({ vision: { ...get().vision, ...patch } }); persist(); },
    setVisionLlm: (patch) => { for (const k of Object.keys(patch)) llmDirty.vision.add(k); set({ vision: { ...get().vision, llm: { ...get().vision.llm, ...patch } } }); persist(); },
    setDirector: (patch) => { set({ director: { ...get().director, ...patch } }); persist(); },
    setDirectorLlm: (patch) => { set({ director: { ...get().director, llm: { ...get().director.llm, ...patch } } }); persist(); },
    setLive: (patch) => { set({ live: { ...get().live, ...patch } }); persist(); },
    setLiveLlm: (patch) => { set({ live: { ...get().live, llm: { ...get().live.llm, ...patch } } }); persist(); },
    setKey: (which, v) => set({ keys: { ...get().keys, [which]: v } }),
    setModel: (family, patch) => {
      const cur = get().models[family] ?? { model: '', textEncoder: '', vae: '' };
      set({ models: { ...get().models, [family]: { ...cur, ...patch } } });
      persist();
    },
  };
});
