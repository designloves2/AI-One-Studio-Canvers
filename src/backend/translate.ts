// The one Korean <-> English model setting every TJ node shares (node v1.49.0, SPEC_RELAY_V1_49_0 section 1), and the
// helpers the prompt fields use for the KO / EN button and the generate guard (section 2).
import { useSyncExternalStore } from 'react';
import { getJson, postJson } from './http';
import { runLlm } from './llm';
import { notify } from '../ui/dialog';
import { DEFAULT_LLM } from '../store/settings';
import { useGraph } from '../store/graph';
import { byId } from '../registry';
import { ensureEnglish, fieldFill, koKey, newestKey, viewKey, fieldNeedsEnglish, translateText } from './bilingual';

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

// "Use Korean translation" (node ko_setting.js): off = no AUTOMATIC translation (before a run, the Korean view after Enhance / Refine,
// the Korean side of the Refine result); the EN / 한 button still translates once each time it is pressed.
const KO_KEY = 'tj_use_ko_canvers';
export const getUseKo = (): boolean => { try { return localStorage.getItem(KO_KEY) !== '0'; } catch { return true; } };
export function setUseKo(on: boolean) { try { localStorage.setItem(KO_KEY, on ? '1' : '0'); } catch { /* private window: the choice just is not remembered */ } }

/** `(system, user) => text` for the shared translate backend */
export const translateLlm = () => async (system: string, user: string): Promise<string> => {
  const c = await loadTranslateConfig();
  if (c.backend === 'native') {
    if (!c.native_clip) throw new Error('No translate CLIP set - pick one in Settings -> Translation LLM.');
    return runLlm({ system, prompt: user, max_tokens: 4096, temperature: 0.2, llm: { ...DEFAULT_LLM, backend: 'comfy', text_encoder_name: c.native_clip, max_tokens: 4096, temperature: 0.2 } });
  }
  if (c.backend === 'openrouter' && !c.or_model.trim()) {
    const msg = 'OpenRouter 모델이 선택되지 않았습니다. 설정 > 번역 LLM 에서 모델을 선택하세요.';
    void notify(msg); throw new Error(msg);
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
  if (!getUseKo()) return;
  const todo: { id: string; key: string }[] = [];
  for (const n of useGraph.getState().nodes) {
    const def = byId.get(n.defId); if (!def) continue;
    for (const p of def.params) if (p.control.kind === 'text' && p.control.multiline && fieldNeedsEnglish(n.params, p.id)) todo.push({ id: n.id, key: p.id });
  }
  if (!todo.length) return;
  const llm = translateLlm(); const protect = await protectWords();
  let i = 0;
  for (const t of todo) {
    report?.(`Translating Korean prompt ${++i}/${todo.length} to English…`);
    const node = useGraph.getState().nodes.find((x) => x.id === t.id); if (!node) continue;
    const obj: Record<string, any> = { ...node.params, [t.key]: node.params[t.key] ?? '' };
    if (await whileTranslating(t.id, t.key, 'en', () => ensureEnglish(obj, t.key, llm, { protect }))) for (const k of [t.key, koKey(t.key), newestKey(t.key)]) useGraph.getState().setParam(t.id, k, obj[k] ?? '');
  }
}

// Which field is being translated right now and into which language (node: translatingTo / onTranslating / whileTranslating).
// A field is told apart by its card id + key (a card's params object is a new object on every render).
const translating = new Map<string, 'ko' | 'en'>();
const subs = new Set<() => void>();
let rev = 0;
const note = () => { rev++; subs.forEach((f) => f()); };
export const translatingTo = (id: string, key: string): 'ko' | 'en' | undefined => translating.get(`${id}:${key}`);
export function onTranslating(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; }
export async function whileTranslating<T>(id: string, key: string, to: 'ko' | 'en', run: () => Promise<T>): Promise<T> {
  translating.set(`${id}:${key}`, to); note();
  try { return await run(); } finally { translating.delete(`${id}:${key}`); note(); }
}
/** re-renders the caller whenever a translation starts or ends */
export const useTranslating = (id: string, key: string) => { useSyncExternalStore(onTranslating, () => rev); return translatingTo(id, key); };

const triggerCache = new Map<string, Promise<string[]>>();
/** Trigger words of the LoRAs on the canvas (the node's h3ProtectWords): a translation must keep them as they are. */
export async function protectWords(): Promise<string[]> {
  const names = [...new Set(useGraph.getState().nodes.filter((n) => n.defId === 'lora').map((n) => String(n.params.lora ?? '')).filter((x) => x && x !== 'none'))];
  const lists = await Promise.all(names.map((name) => {
    let r = triggerCache.get(name);
    if (!r) { r = getJson<{ triggers?: string[] }>(`/flux_klein/lora_triggers?name=${encodeURIComponent(name)}`).then((d) => d.triggers ?? []).catch(() => [] as string[]); triggerCache.set(name, r); }
    return r;
  }));
  return lists.flat().flatMap((w) => String(w).split(/[,\n]/)).map((w) => w.trim()).filter(Boolean);
}

/** English was written into a field by a model (Enhance / Refine): the Korean slot is cleared, then filled in the background (node fillKoLater) */
export function putEnglish(id: string, key: string, text: string, ko = '') {
  const g = useGraph.getState();
  g.setParam(id, key, text); g.setParam(id, koKey(key), ko); g.setParam(id, newestKey(key), '');
}
export async function fillKoLater(id: string, key: string): Promise<void> {
  if (!getUseKo()) return;
  const g = useGraph.getState();
  const node = g.nodes.find((n) => n.id === id); if (!node) return;
  const obj: Record<string, any> = { ...node.params };
  if (!String(obj[key] ?? '').trim() || String(obj[koKey(key)] ?? '').trim()) return;
  g.setRuntime(id, { status: 'running', pct: 0, label: 'writing the Korean view 1/1…' });
  try {
    await whileTranslating(id, key, 'ko', async () => fieldFill(obj, key, 'ko', translateLlm(), { protect: await protectWords() }));
    useGraph.getState().setParam(id, koKey(key), String(obj[koKey(key)] ?? '')); useGraph.getState().setParam(id, newestKey(key), '');
    useGraph.getState().setRuntime(id, { status: 'idle', pct: 100, label: undefined });
  } catch (e) { useGraph.getState().setRuntime(id, { status: 'idle', pct: 0, label: `⚠ Korean view not written: ${String((e as Error).message).slice(0, 80)}` }); }
}

export { translateText };
