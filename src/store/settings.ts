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
  or_model_text: 'google/gemini-2.5-flash', or_model_vision: 'google/gemini-2.5-flash',
  custom_base: 'http://localhost:3000/v1', custom_model: '', custom_ctx: 0,
  temperature: 0.7, max_tokens: 1000,
};

export interface ModelChoice { model: string; textEncoder: string; vae: string }

export interface Settings {
  /** '' = same origin (dev/prod proxy). Otherwise e.g. http://127.0.0.1:8188 (needs --enable-cors-header) */
  comfyUrl: string;
  llm: LlmSettings;
  /** API keys live in memory only; they are sent to the backend once (never persisted here). */
  keys: { custom: string; openrouter: string };
  /** per image family overrides picked in Settings → Image models (blank = backend default) */
  models: Record<string, ModelChoice>;
  saveSubfolder: string;
  set: (patch: Partial<Pick<Settings, 'comfyUrl' | 'saveSubfolder'>>) => void;
  setLlm: (patch: Partial<LlmSettings>) => void;
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
    const { comfyUrl, llm, models, saveSubfolder } = get();
    try { localStorage.setItem(KEY, JSON.stringify({ comfyUrl, llm, models, saveSubfolder })); } catch { /* ignore */ }
  };
  return {
    comfyUrl: saved.comfyUrl ?? '',
    llm: { ...DEFAULT_LLM, ...(saved.llm ?? {}) },
    keys: { custom: '', openrouter: '' },
    models: saved.models ?? {},
    saveSubfolder: saved.saveSubfolder ?? 'ai-one-canvers',
    set: (patch) => { set(patch); persist(); },
    setLlm: (patch) => { set({ llm: { ...get().llm, ...patch } }); persist(); },
    setKey: (which, v) => set({ keys: { ...get().keys, [which]: v } }),
    setModel: (family, patch) => {
      const cur = get().models[family] ?? { model: '', textEncoder: '', vae: '' };
      set({ models: { ...get().models, [family]: { ...cur, ...patch } } });
      persist();
    },
  };
});
