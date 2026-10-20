import { wsUrl } from './http';

/** What ComfyUI-Crystools broadcasts about the machine ComfyUI runs on (about twice a second, to every websocket client). */
export interface GpuStat { gpu_utilization: number; gpu_temperature: number; vram_total: number; vram_used: number; vram_used_percent: number }
export interface SystemStats { cpu_utilization: number; ram_used_percent: number; gpus?: GpuStat[] }

type Listener = (s: SystemStats) => void;
const listeners = new Set<Listener>();
let socket: WebSocket | null = null;
let retry: ReturnType<typeof setTimeout> | undefined;

// One shared socket for the monitor, separate from the run socket so it never disturbs job events.
function connect() {
  if (socket || !listeners.size) return;
  let ws: WebSocket;
  try { ws = new WebSocket(wsUrl(crypto.randomUUID())); } catch { retry = setTimeout(connect, 3000); return; }
  socket = ws;
  ws.addEventListener('message', (ev) => {
    if (typeof ev.data !== 'string') return;
    try { const m = JSON.parse(ev.data); if (m?.type === 'crystools.monitor') listeners.forEach((fn) => fn(m.data as SystemStats)); } catch { /* not json */ }
  });
  ws.addEventListener('close', () => { socket = null; if (listeners.size) retry = setTimeout(connect, 3000); });
  ws.addEventListener('error', () => { /* close follows */ });
}

/** Listen to the machine stats. Returns the unsubscribe function; the socket closes with the last listener. */
export function subscribeSystemStats(fn: Listener): () => void {
  listeners.add(fn); connect();
  return () => {
    listeners.delete(fn);
    if (!listeners.size) { clearTimeout(retry); const s = socket; socket = null; s?.close(); }
  };
}
