// A small log of the LLM calls the app makes (the ComfyUI console does not show them): how much went in, how much came out, how long it took.
// Token numbers are an estimate from the characters (about 2.5 characters per token for Korean + English text) unless the server reports its own.
import { create } from 'zustand';

export interface LlmLogEntry {
  id: number; at: string; tag: string; backend: string; model: string;
  inChars: number; outChars: number; ms: number; ok: boolean; error?: string;
  /** numbers the server reported (OpenRouter and some backends), when there are any */
  usage?: { input?: number; output?: number };
}

export const estTokens = (chars: number) => Math.round(chars / 2.5);

let seq = 0;
interface LlmLogState { entries: LlmLogEntry[]; add(e: Omit<LlmLogEntry, 'id' | 'at'>): void; clear(): void }
export const useLlmLog = create<LlmLogState>((set) => ({
  entries: [],
  add: (e) => {
    const entry: LlmLogEntry = { ...e, id: ++seq, at: new Date().toISOString() };
    set((s) => ({ entries: [...s.entries, entry].slice(-60) }));
    const tokOut = e.usage?.output ?? estTokens(e.outChars);
    console.info(`[LLM] ${e.tag || 'call'} ${e.backend} ${e.model} in ${e.inChars} chars, out ${e.outChars} chars (~${tokOut} tokens), ${(e.ms / 1000).toFixed(1)} s${e.ms > 0 ? `, ~${(tokOut / (e.ms / 1000)).toFixed(1)} tok/s` : ''}${e.ok ? '' : ` FAILED: ${e.error}`}`);
  },
  clear: () => set({ entries: [] }),
}));
