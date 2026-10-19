import { useSettings } from '../store/settings';

export const base = () => useSettings.getState().comfyUrl.replace(/\/+$/, '');
export const url = (path: string) => base() + path;

export function wsUrl(clientId: string): string {
  const b = base();
  if (b) return b.replace(/^http/, 'ws') + `/ws?clientId=${clientId}`;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws?clientId=${clientId}`;
}

export async function getJson<T = any>(path: string): Promise<T> {
  const r = await fetch(url(path));
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export async function postJson<T = any>(path: string, body: unknown): Promise<T> {
  const r = await fetch(url(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json() as Promise<T>;
}
