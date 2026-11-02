// A small log of the LLM calls the app makes (the ComfyUI console does not show them): how much went in, how much came out, how long it took,
// plus the call that is running right now. The server tells about a call with the websocket event `tj_llm_progress` (call_id, phase, tokens, speed …)
// and with `usage` in its answer. The studio routes only send "prompt" (start) and "done" / "error" (end) with ESTIMATED token counts; a core LLM node
// may stream more. Token numbers are estimates (about 2.5 characters per token) unless the server reports its own.
import { create } from 'zustand';

export interface LlmUsage {
  input?: number; output?: number; tokPerSec?: number; elapsedMs?: number;
  /** stop | length | error (the studio routes do not detect "length") */
  finish?: string; thinkingChars?: number | null; answerChars?: number | null;
  /** true = the server estimated the token counts from the text */
  estimated?: boolean;
}

export interface LlmLogEntry {
  id: number; at: string; tag: string; backend: string; model: string;
  inChars: number; outChars: number; ms: number; ok: boolean; error?: string;
  usage?: LlmUsage;
}

/** the call that is running now (from the app's own start time, refined by the server's events) */
export interface LiveCall {
  callId: string; tag: string; backend: string; model: string; startedAt: number;
  phase: 'prompt' | 'thinking' | 'answer' | 'done' | 'error';
  inputTokens?: number; outputTokens?: number; chars?: number; tokPerSec?: number; estimated?: boolean; delta?: string;
}

export const estTokens = (chars: number) => Math.round(chars / 2.5);

/** the node's backend names -> the ids of the app's settings */
export function mapBackend(name: string): string {
  const n = String(name || '').toLowerCase();
  if (n.includes('gguf') || n.includes('llama')) return 'local';
  if (n.includes('textgenerate') || n.includes('comfy')) return 'comfy';
  if (n.includes('open router') || n.includes('openrouter')) return 'openrouter';
  if (n.includes('custom')) return 'custom';
  if (n.includes('ollama')) return 'ollama';
  return String(name || '');
}

let seq = 0;
export const newCallId = () => `cv-${Date.now().toString(36)}-${(++seq).toString(36)}`;

interface LlmLogState {
  entries: LlmLogEntry[]; live: Record<string, LiveCall>;
  add(e: Omit<LlmLogEntry, 'id' | 'at'>): void; clear(): void;
  begin(c: Pick<LiveCall, 'callId' | 'tag' | 'backend' | 'model'>): void;
  end(callId: string): void;
  /** a `tj_llm_progress` event from the server */
  event(d: Record<string, unknown>): void;
}
export const useLlmLog = create<LlmLogState>((set, get) => ({
  entries: [], live: {},
  add: (e) => {
    const entry: LlmLogEntry = { ...e, id: ++seq, at: new Date().toISOString() };
    set((s) => ({ entries: [...s.entries, entry].slice(-60) }));
    const tokOut = e.usage?.output ?? estTokens(e.outChars);
    const speed = e.usage?.tokPerSec ?? (e.ms > 0 ? tokOut / (e.ms / 1000) : 0);
    console.info(`[LLM] ${e.tag || 'call'} ${e.backend} ${e.model} in ${e.inChars} chars, out ${e.outChars} chars (~${tokOut} tokens), ${(e.ms / 1000).toFixed(1)} s${speed ? `, ~${speed.toFixed(1)} tok/s` : ''}${e.ok ? '' : ` FAILED: ${e.error}`}`);
  },
  clear: () => set({ entries: [] }),
  begin: (c) => set((s) => ({ live: { ...s.live, [c.callId]: { ...c, startedAt: Date.now(), phase: 'prompt' } } })),
  end: (callId) => set((s) => { if (!s.live[callId]) return s; const { [callId]: _gone, ...rest } = s.live; void _gone; return { live: rest }; }),
  event: (d) => {
    const id = String(d.call_id ?? ''); const cur = get().live[id]; if (!cur) return;   // an event of a call this page did not start
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
    const phase = ['prompt', 'thinking', 'answer', 'done', 'error'].includes(String(d.phase)) ? (String(d.phase) as LiveCall['phase']) : cur.phase;
    set((s) => ({ live: { ...s.live, [id]: { ...cur, phase, backend: d.backend ? mapBackend(String(d.backend)) : cur.backend, model: d.model ? String(d.model) : cur.model,
      inputTokens: num(d.input_tokens) ?? cur.inputTokens, outputTokens: num(d.output_tokens) ?? cur.outputTokens, chars: num(d.chars) ?? cur.chars, tokPerSec: num(d.tok_per_sec) ?? cur.tokPerSec,
      estimated: typeof d.estimated === 'boolean' ? d.estimated : cur.estimated,
      // each event carries only the new piece of text: keep the last part of what has come so far
      delta: typeof d.delta === 'string' && d.delta ? `${cur.delta ?? ''}${d.delta}`.slice(-400) : cur.delta } } }));
  },
}));
