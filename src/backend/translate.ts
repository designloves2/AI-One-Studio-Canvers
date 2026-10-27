// The one Korean <-> English model setting every TJ node shares (node v1.49.0, SPEC_RELAY_V1_49_0 section 1), and the
// helpers the prompt fields use for the KO / EN button and the generate guard (section 2).
import { getJson, postJson } from './http';
import { runLlm } from './llm';
import { DEFAULT_LLM } from '../store/settings';
import { useGraph } from '../store/graph';
import { byId } from '../registry';
import { ensureEnglish, koKey, newestKey, viewKey, fieldNeedsEnglish, translateText } from './bilingual';

export interface TranslateConfig {
  backend: 'native' | 'openrouter' | 'llamagguf' | 'custom'; native_clip: string; or_model: string; llama_model: string;
  llama_n_ctx: number; llama_max_tokens: number; custom_base: string; custom_model: string; custom_ctx: number;
}
export const TRANSLATE_DEFAULTS: TranslateConfig = { backend: 'native', native_clip: '', or_model: '', llama_model: '', llama_n_ctx: 16384, llama_max_tokens: 4096, custom_base: '', custom_model: '', custom_ctx: 0 };

let cfg: TranslateConfig = { ...TRANSLATE_DEFAULTS };
let loaded: Promise<TranslateConfig> | null = null;

export function loadTranslateConfig(force = false): Promise<TranslateConfig> {
  if (!loaded || force) loaded = getJson<TranslateConfig>('/tj_shared/translate_config').then((d) => (cfg = { ...TRANSLATE_DEFAULTS, ...d })).catch(() => cfg);
  return loaded;
}
/** the server stores it and every other node's page gets it too */
export async function saveTranslateConfig(patch: Partial<TranslateConfig>): Promise<TranslateConfig> {
  cfg = { ...cfg, ...patch };
  const d = await postJson<{ config?: TranslateConfig }>('/tj_shared/translate_config', patch);
  if (d?.config) cfg = { ...TRANSLATE_DEFAULTS, ...d.config };
  return cfg;
}

/** `(system, user) => text` for the shared translate backend */
export const translateLlm = () => async (system: string, user: string): Promise<string> => {
  const c = await loadTranslateConfig();
  if (c.backend === 'native') {
    if (!c.native_clip) throw new Error('No translate CLIP set - pick one in Settings -> Translation LLM.');
    return runLlm({ system, prompt: user, max_tokens: 4096, temperature: 0.2, llm: { ...DEFAULT_LLM, backend: 'comfy', text_encoder_name: c.native_clip, max_tokens: 4096, temperature: 0.2 } });
  }
  const d = await postJson<{ ok: boolean; text?: string; error?: string }>('/tj_shared/translate_llm', { system, user });
  if (!d.ok) throw new Error(d.error || 'Translate failed');
  return d.text ?? '';
};

/** the keys a card's long text fields keep their Korean view in */
export const koParams = (key: string) => ({ ko: koKey(key), newest: newestKey(key), view: viewKey(key) });

/**
 * Generate guard: before a run, every long text field that needs English (Korean edited after the English, or Korean
 * typed into the English box) is translated first; a failed translation stops the run with the error.
 */
export async function ensureGraphEnglish(report?: (text: string) => void): Promise<void> {
  const todo: { id: string; key: string }[] = [];
  for (const n of useGraph.getState().nodes) {
    const def = byId.get(n.defId); if (!def) continue;
    for (const p of def.params) if (p.control.kind === 'text' && p.control.multiline && fieldNeedsEnglish(n.params, p.id)) todo.push({ id: n.id, key: p.id });
  }
  if (!todo.length) return;
  const llm = translateLlm();
  let i = 0;
  for (const t of todo) {
    report?.(`Translating Korean prompt ${++i}/${todo.length} to English…`);
    const node = useGraph.getState().nodes.find((x) => x.id === t.id); if (!node) continue;
    const obj: Record<string, any> = { ...node.params, [t.key]: node.params[t.key] ?? '' };
    if (await ensureEnglish(obj, t.key, llm)) for (const k of [t.key, koKey(t.key), newestKey(t.key)]) useGraph.getState().setParam(t.id, k, obj[k] ?? '');
  }
}

export { translateText };
