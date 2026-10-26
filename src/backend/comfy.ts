// Thin client for the stock ComfyUI HTTP/WebSocket API. Everything the canvas generates goes
// through here (ComfyUI is the engine behind ComfyUI-TJ_NODE_STUDIO_ONE).
import type { Asset, FileRef } from '../types';
import { getJson, postJson, url, wsUrl } from './http';
import { waitForLocalLlmIdle } from './llmGuard';

export const clientId: string = (globalThis.crypto?.randomUUID?.() ?? String(Math.random()).slice(2));

export const viewUrl = (f: FileRef) =>
  url(`/view?filename=${encodeURIComponent(f.filename)}&subfolder=${encodeURIComponent(f.subfolder)}&type=${f.type}`);

export const uid = (p = 'a') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export async function systemStats(): Promise<any> {
  return getJson('/system_stats');
}

export async function objectInfo(cls: string): Promise<any> {
  return getJson(`/object_info/${encodeURIComponent(cls)}`);
}

/** Turn known low-level ComfyUI failures into a message a person can act on. */
function friendlyError(m: string): string {
  if (/VHS failed to extract audio/i.test(m)) return 'This video has no sound track, and the video loader needs one. Add a sound track first (Add Audio to Video card), or use a clip that was generated here.';
  return m;
}

export async function interrupt(promptId?: string): Promise<void> {
  try {
    await fetch(url('/interrupt'), promptId
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt_id: promptId }) }
      : { method: 'POST' });
  } catch { /* ignore */ }
}

/** Cancel ONE job: stop it when it is running, take it out of the queue when it is still waiting. */
export async function cancelPrompt(promptId: string): Promise<void> {
  try {
    const q = await getJson<{ queue_running?: unknown[][]; queue_pending?: unknown[][] }>('/queue');
    if ((q.queue_running ?? []).some((j) => j[1] === promptId)) { await interrupt(promptId); return; }
    if ((q.queue_pending ?? []).some((j) => j[1] === promptId)) {
      await fetch(url('/queue'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delete: [promptId] }) });
    }
  } catch { /* ignore */ }
}

/** Upload bytes into ComfyUI's input folder; returns the file reference. */
export async function uploadToInput(blob: Blob, name?: string): Promise<FileRef> {
  const ext = blob.type.includes('jpeg') ? 'jpg' : blob.type.includes('webp') ? 'webp' : blob.type.includes('mp4') ? 'mp4' : blob.type.includes('webm') ? 'webm' : 'png';
  const fd = new FormData();
  fd.append('image', blob, name ?? `canvers_${uid('')}.${ext}`);
  fd.append('type', 'input');
  fd.append('overwrite', 'true');
  const r = await fetch(url('/upload/image'), { method: 'POST', body: fd });
  if (!r.ok) throw new Error(`upload failed: HTTP ${r.status}`);
  const j = await r.json();
  return { filename: j.name, subfolder: j.subfolder ?? '', type: 'input' };
}

export async function fetchBlob(a: Asset | string): Promise<Blob> {
  const u = typeof a === 'string' ? a : a.url;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`cannot read ${u}: HTTP ${r.status}`);
  return r.blob();
}

/** Make sure an asset lives in ComfyUI's input folder (LoadImage can only read from there). */
export async function ensureInput(a: Asset): Promise<string> {
  if (a.file?.type === 'input') return a.file.subfolder ? `${a.file.subfolder}/${a.file.filename}` : a.file.filename;
  const ref = await uploadToInput(await fetchBlob(a));
  return ref.filename;
}

export function assetFromFile(f: FileRef, type: Asset['type'] = 'image', port?: string): Asset {
  return { id: uid(), type, url: viewUrl(f), file: f, port };
}

// ---------------------------------------------------------------- websocket + job tracking
type Listener = (msg: any) => void;
let ws: WebSocket | null = null;
const listeners = new Set<Listener>();
let opening: Promise<void> | null = null;

function openSocket(): Promise<void> {
  if (ws && ws.readyState === WebSocket.OPEN) return Promise.resolve();
  if (opening) return opening;
  opening = new Promise<void>((resolve) => {
    const s = new WebSocket(wsUrl(clientId));
    ws = s;
    s.onopen = () => { opening = null; resolve(); };
    s.onerror = () => { opening = null; resolve(); }; // fall back to polling /history
    s.onclose = () => { ws = null; opening = null; };
    s.binaryType = 'blob';
    s.onmessage = (ev) => {
      if (typeof ev.data !== 'string') { // binary = live preview frames: [u32 type][u32 format][image bytes]
        void (ev.data as Blob).arrayBuffer().then((buf) => {
          const v = new DataView(buf); const kind = v.getUint32(0);
          if (kind === 1 || kind === 4) { const fmt = v.getUint32(4); const blob = new Blob([buf.slice(kind === 4 ? 8 + v.getUint32(4) : 8)], { type: fmt === 2 ? 'image/png' : 'image/jpeg' }); for (const l of listeners) l({ type: 'b_preview', data: blob }); }
        });
        return;
      }
      try { const m = JSON.parse(ev.data); for (const l of listeners) l(m); } catch { /* ignore */ }
    };
  });
  return opening;
}

export function onSocket(l: Listener): () => void {
  listeners.add(l);
  void openSocket();
  return () => listeners.delete(l);
}

export interface RunResult { promptId: string; images: FileRef[]; videos: FileRef[]; audios: FileRef[]; texts: string[]; raw: Record<string, any> }

// ---- jobs that are running when the page is closed or refreshed: remembered per card, picked up again on the next start
export const runContext = new WeakMap<AbortSignal, { node?: string }>();
const INFLIGHT_KEY = 'canvers.inflight.v1';
/** `meta` = what the result must carry when it is picked up again after a reload (prompt, upscale marks) */
export type Inflight = Record<string, { promptId: string; t: number; meta?: Record<string, unknown> }>;
export function readInflight(): Inflight { try { return JSON.parse(localStorage.getItem(INFLIGHT_KEY) ?? '{}'); } catch { return {}; } }
function writeInflight(v: Inflight) { try { localStorage.setItem(INFLIGHT_KEY, JSON.stringify(v)); } catch { /* quota */ } }
export function forgetInflight(promptId: string) {
  const v = readInflight(); let changed = false;
  for (const [k, e] of Object.entries(v)) if (e.promptId === promptId) { delete v[k]; changed = true; }
  if (changed) writeInflight(v);
}
export function clearInflight() { try { localStorage.removeItem(INFLIGHT_KEY); } catch { /* ignore */ } }

function collectOutput(out: RunResult, nodeId: string, output: any) {
  out.raw[nodeId] = output;
  for (const im of output?.images ?? []) out.images.push({ filename: im.filename, subfolder: im.subfolder ?? '', type: im.type ?? 'output' });
  for (const v of output?.gifs ?? output?.videos ?? []) out.videos.push({ filename: v.filename, subfolder: v.subfolder ?? '', type: v.type ?? 'output' });
  for (const a of output?.audio ?? []) out.audios.push({ filename: a.filename, subfolder: a.subfolder ?? '', type: a.type ?? 'output' });
  for (const tx of output?.text ?? []) out.texts.push(String(tx));
}

/** What became of a job we started before the page went away: its finished result, 'pending' (still queued / running) or null (gone). */
export async function recoverPrompt(promptId: string): Promise<RunResult | 'pending' | 'failed' | null> {
  try {
    const e = (await getJson<Record<string, any>>(`/history/${promptId}`))[promptId];
    if (e) {
      if (e.status?.status_str === 'error') return 'failed';
      if (!e.status?.completed && !Object.keys(e.outputs ?? {}).length) return 'pending';
      const out: RunResult = { promptId, images: [], videos: [], audios: [], texts: [], raw: {} };
      for (const [nid, o] of Object.entries(e.outputs ?? {})) collectOutput(out, nid, o);
      return out;
    }
    const q = await getJson<{ queue_running?: unknown[][]; queue_pending?: unknown[][] }>('/queue');
    if ([...(q.queue_running ?? []), ...(q.queue_pending ?? [])].some((j) => j[1] === promptId)) return 'pending';
  } catch { return 'pending'; }
  return null;
}

export interface RunOptions {
  /** Model Preview card: the node id of ModelPreviewOverrideKJ in the graph, and where its frames go */
  previewKey?: string; onPreview?: (dataUrl: string) => void;
  onProgress?: (pct: number, label?: string) => void;
  signal?: AbortSignal;
  /** stored with the in-flight record so a result re-attached after a reload gets the same meta */
  meta?: Record<string, unknown>;
}

/** Queue an API-format graph and resolve with everything its output nodes produced. */
export async function runPrompt(graph: Record<string, unknown>, opts: RunOptions = {}): Promise<RunResult> {
  await waitForLocalLlmIdle();   // a generation never starts while a local LLM is running
  await openSocket();
  const res = await fetch(url('/prompt'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    // VHS_VideoCombine reads these from the workflow extra: without them it leaves a silent video and a first-frame PNG next to the "-audio" file
    body: JSON.stringify({ prompt: graph, client_id: clientId, extra_data: { extra_pnginfo: { workflow: { extra: { VHS_KeepIntermediate: false, VHS_MetadataImage: false } } } } }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const nodeErr = data.node_errors ? Object.values<any>(data.node_errors).map((n) => (n.errors ?? []).map((e: any) => e.message + (e.details ? ` (${e.details})` : '')).join('; ')).filter(Boolean).join(' | ') : '';
    throw new Error([data.error?.message, nodeErr].filter(Boolean).join(' — ') || `queue failed: HTTP ${res.status}`);
  }
  const promptId: string = data.prompt_id;
  const runNodeId = opts.signal ? runContext.get(opts.signal)?.node : undefined;
  if (runNodeId) { const v = readInflight(); v[runNodeId] = { promptId, t: Date.now(), ...(opts.meta ? { meta: opts.meta } : {}) }; writeInflight(v); }

  return new Promise<RunResult>((resolve, reject) => {
    const out: RunResult = { promptId, images: [], videos: [], audios: [], texts: [], raw: {} };
    let settled = false;
    let poll: ReturnType<typeof setInterval> | undefined;

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      forgetInflight(promptId);
      off();
      if (poll) clearInterval(poll);
      opts.signal?.removeEventListener('abort', onAbort);
      if (err) return reject(err);
      if (out.images.length || out.videos.length || out.audios.length || out.texts.length) return resolve(out);
      // fully cached runs send no `executed` events — read the outputs from the history instead
      void (async () => {
        for (let i = 0; i < 6; i++) {
          try {
            const h = (await getJson(`/history/${promptId}`))[promptId];
            if (h?.outputs && Object.keys(h.outputs).length) { for (const [nid, o] of Object.entries(h.outputs)) collect(nid, o); break; }
          } catch { /* retry */ }
          await new Promise((r) => setTimeout(r, 400));
        }
        resolve(out);
      })();
    };
    const collect = (nodeId: string, output: any) => {
      out.raw[nodeId] = output;
      for (const im of output?.images ?? []) out.images.push({ filename: im.filename, subfolder: im.subfolder ?? '', type: im.type ?? 'output' });
      for (const v of output?.gifs ?? output?.videos ?? []) out.videos.push({ filename: v.filename, subfolder: v.subfolder ?? '', type: v.type ?? 'output' });
      for (const a of output?.audio ?? []) out.audios.push({ filename: a.filename, subfolder: a.subfolder ?? '', type: a.type ?? 'output' });
      for (const tx of output?.text ?? []) out.texts.push(String(tx));
    };
    let seen = false;   // this prompt has started executing
    const off = onSocket((m) => {
      const d = m.data ?? {};
      if (d.prompt_id && d.prompt_id !== promptId) return;
      // The preview frames carry the id of the preview node as ComfyUI first ran it: a cached model keeps the id of an earlier run, so the key cannot be matched.
      // Only one prompt runs at a time, so every preview frame that arrives while this prompt is executing is ours.
      if (d.prompt_id === promptId && m.type !== 'execution_success') seen = true;
      if (m.type === 'kj_preview_override') { if (opts.previewKey && seen && typeof d.image === 'string') opts.onPreview?.(`data:${d.mime ?? 'image/jpeg'};base64,${d.image}`); }
      else if (m.type === 'progress' && d.max) opts.onProgress?.(Math.round((d.value / d.max) * 100), `${d.value}/${d.max}`);
      else if (m.type === 'executing' && d.node === null) finish();          // finished (older servers)
      else if (m.type === 'executed') collect(String(d.node), d.output);
      else if (m.type === 'execution_success') finish();
      else if (m.type === 'execution_error') finish(new Error(friendlyError(d.exception_message || 'execution error')));
      else if (m.type === 'execution_interrupted') finish(new Error('cancelled'));
    });
    const onAbort = () => { void cancelPrompt(promptId); finish(new Error('cancelled')); };
    opts.signal?.addEventListener('abort', onAbort);

    // Safety net: if the socket is not delivering (proxy, CORS), poll the history instead.
    poll = setInterval(async () => {
      try {
        const h = await getJson(`/history/${promptId}`);
        const e = h[promptId];
        if (!e) return;
        if (e.status?.status_str === 'error') {
          const msg = (e.status.messages ?? []).find((x: any) => x[0] === 'execution_error')?.[1]?.exception_message;
          return finish(new Error(friendlyError(msg || 'execution error')));
        }
        if (e.outputs && (e.status?.completed || Object.keys(e.outputs).length)) {
          out.images = []; out.videos = []; out.audios = []; out.texts = [];
          for (const [nid, o] of Object.entries(e.outputs)) collect(nid, o);
          if (e.status?.completed) finish();
        }
      } catch { /* keep polling */ }
    }, 1500);
  });
}

export async function freeModels(): Promise<void> {
  try { await postJson('/free', { unload_models: true, free_memory: true }); } catch { /* ignore */ }
}
