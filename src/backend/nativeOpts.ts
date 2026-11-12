// ComfyUI native "Generate Text" details (node SPEC_RELAY_H3_IMAGE_OFFICIAL, section 3). One set for every tool, kept in this browser.
// Canvers asks the node server for its LLM work (Enhance / Write / Refine / Translate), and that route takes the length, the temperature and the seed today;
// the other options are saved here so they are ready when the server passes them on to ComfyUI's Generate Text node (TextGenerate / TextGenerateV2).
import { create } from 'zustand';

export interface NativeOpts {
  max_length: number; sampling: boolean; temperature: number; top_k: number; top_p: number; min_p: number;
  repetition_penalty: number; presence_penalty: number; seed: number; thinking: boolean; use_default_template: boolean; mtp: string;
}
export const NATIVE_DEFAULTS: NativeOpts = {
  max_length: 2048, sampling: true, temperature: 0.7, top_k: 64, top_p: 0.95, min_p: 0.05,
  repetition_penalty: 1.05, presence_penalty: 0, seed: 0, thinking: false, use_default_template: true, mtp: 'auto',
};
export const MTP_CHOICES = ['auto', 'on', 'off'];
const KEY = 'canvers.nativeLlm.v1';

function read(): NativeOpts {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<NativeOpts> | null; return { ...NATIVE_DEFAULTS, ...(v ?? {}) }; } catch { return { ...NATIVE_DEFAULTS }; }
}
interface State { opts: NativeOpts; set(p: Partial<NativeOpts>): void; reset(): void }
export const useNativeOpts = create<State>((set, get) => ({
  opts: read(),
  set: (p) => { const opts = { ...get().opts, ...p }; set({ opts }); try { localStorage.setItem(KEY, JSON.stringify(opts)); } catch { /* ignore */ } },
  reset: () => { set({ opts: { ...NATIVE_DEFAULTS } }); try { localStorage.removeItem(KEY); } catch { /* ignore */ } },
}));
export const nativeOpts = (): NativeOpts => useNativeOpts.getState().opts;

/** what a ComfyUI-native request sends: length, temperature (0 when sampling is off) and seed, plus the full set for a server that understands it */
export function nativeRequest(): { max_tokens: number; temperature: number; seed: number; native: NativeOpts } {
  const o = nativeOpts();
  return { max_tokens: Math.max(1, Math.round(o.max_length)), temperature: o.sampling ? o.temperature : 0, seed: Math.max(0, Math.round(o.seed)), native: o };
}
