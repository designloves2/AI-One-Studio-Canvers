// Restarting ComfyUI from the app: ComfyUI-Manager's reboot API (the only way the user allows; never kill the process).
import { getJson } from './http';

export async function queueCounts(): Promise<{ running: number; pending: number }> {
  const q = await getJson<{ queue_running: unknown[]; queue_pending: unknown[] }>('/queue');
  return { running: q.queue_running?.length ?? 0, pending: q.queue_pending?.length ?? 0 };
}

const alive = async (): Promise<boolean> => {
  try { const r = await fetch('/system_stats', { cache: 'no-store', signal: AbortSignal.timeout(3000) }); return r.ok; } catch { return false; }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST /api/manager/reboot, then wait until the server went down and came back. Resolves when the new process answers. */
export async function restartComfy(onStatus?: (s: string) => void): Promise<void> {
  onStatus?.('restarting…');
  // the connection is cut while it restarts, so a network error here is the normal outcome
  try { await fetch('/api/manager/reboot', { method: 'POST', signal: AbortSignal.timeout(8000) }); } catch { /* expected */ }
  // 1) it must go down (up to 60 s): otherwise the reboot did not start
  let down = false;
  for (let i = 0; i < 30 && !down; i++) { await sleep(2000); down = !(await alive()); }
  if (!down) throw new Error('ComfyUI did not restart (ComfyUI-Manager reboot is not available?)');
  // 2) then it must come back (up to 4 min)
  for (let i = 0; i < 120; i++) { await sleep(2000); if (await alive()) { onStatus?.('back'); return; } }
  throw new Error('ComfyUI did not come back within 4 minutes — check its window');
}
