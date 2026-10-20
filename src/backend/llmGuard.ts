import { create } from 'zustand';
import { getJson } from './http';
import { t } from '../i18n';

/**
 * A local LLM (GGUF, ComfyUI TextGenerate, Ollama, Custom) loads onto the same GPU / pinned memory as a running image or video job.
 * Run together they crash: the job fails with HostBuffer.truncate and ComfyUI can exit (two local LLMs at once do the same).
 * Only OpenRouter (cloud) is safe while ComfyUI is generating, so every other backend
 *   - runs one at a time,
 *   - waits until ComfyUI has been idle for a moment, and the user is told why (yellow notice),
 * and a new generation waits for a running local LLM.
 */
export type NoticePlace = 'live' | 'bottom';

export const useLlmNotice = create<{ live: string | null; bottom: string | null }>(() => ({ live: null, bottom: null }));

export const isLocalBackend = (backend: string) => backend !== 'openrouter';

const IDLE_CHECKS = 2;          // consecutive idle polls (2 s apart) before a local LLM may start - ComfyUI frees models just after a job
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const waiting = new Set<{ place: NoticePlace; cancel: () => void }>();
let chain: Promise<void> = Promise.resolve();   // local LLM requests take turns
let activeLocal = 0;                            // local LLM requests running right now

/** true while ComfyUI has a job running or waiting (unknown = false, so a broken status call never blocks the chat) */
export async function comfyGenerating(): Promise<boolean> {
  try {
    const q = await getJson<{ queue_running?: unknown[]; queue_pending?: unknown[] }>('/queue');
    return (q.queue_running?.length ?? 0) + (q.queue_pending?.length ?? 0) > 0;
  } catch { return false; }
}

/** Cancel the waiting local-LLM request(s) shown in this place (the request fails with a short message). */
export function cancelWaiting(place: NoticePlace) { for (const w of [...waiting]) if (w.place === place) w.cancel(); }

function show(place: NoticePlace, text: string | null) { useLlmNotice.setState({ [place]: text }); }

/**
 * Get permission to run an LLM request. OpenRouter returns at once. A local backend waits for its turn and for ComfyUI to be idle;
 * the returned function must be called when the request is over (it is safe to call twice).
 */
export async function acquireLocalLlm(backend: string, place: NoticePlace = 'bottom'): Promise<() => void> {
  if (!isLocalBackend(backend)) return () => {};
  let done = false, free!: () => void;
  const mine = new Promise<void>((r) => { free = r; });
  const prev = chain; chain = chain.then(() => mine);
  const release = () => { if (done) return; done = true; if (activeLocal > 0 && started) activeLocal--; free(); };
  let started = false;
  await prev;                                    // another local LLM request is still running: wait for it
  let cancelled = false;
  const entry = { place, cancel: () => { cancelled = true; } };
  try {
    let idle = 0, shown = false, sawBusy = false;
    while (!cancelled) {
      if (await comfyGenerating()) { sawBusy = true; idle = 0; } else if (!sawBusy || ++idle >= IDLE_CHECKS) break;   // no extra wait when it was idle all along
      if (!shown) { shown = true; waiting.add(entry); show(place, t('Generating now — the local LLM waits until it is done (a local LLM running together with a generation can make it fail and stop ComfyUI). To use the AI right away, switch the LLM to OpenRouter.')); }
      await sleep(2000);
    }
  } catch (e) { cleanup(); release(); throw e; }
  cleanup();
  if (cancelled) { release(); throw new Error(t('Cancelled while waiting for the generation to finish')); }
  started = true; activeLocal++;
  return release;

  function cleanup() {
    waiting.delete(entry);
    if (![...waiting].some((w) => w.place === place)) show(place, null);
  }
}

/** A new generation waits while a local LLM request is running (shown above the bottom toolbar). */
export async function waitForLocalLlmIdle(): Promise<void> {
  if (activeLocal === 0) return;
  show('bottom', t('A local LLM is running — the generation starts as soon as it is done (they must not run together).'));
  try { while (activeLocal > 0) await sleep(1000); } finally { show('bottom', null); }
}
