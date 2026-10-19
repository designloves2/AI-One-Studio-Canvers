// Asset Library (TJ_NODE reference library): categories, projects and registered assets that prompts can mention as @name / @12.
import { getJson, postJson, url } from './http';

export interface LibAsset { id: number; kind: 'image' | 'video' | 'audio' | 'set'; name: string; category: string; subcategory?: string; tags?: string; width?: number; height?: number; duration?: number; settings?: Record<string, unknown>; mention?: string | null }
export interface LibProject { id: number; name: string; note?: string; items?: { asset_id: number; alias?: string; order?: number }[]; count?: number }

const BASE = '/tj_node/reflib';
export const libThumb = (id: number | string) => url(`${BASE}/thumb/${id}`);
export const libFile = (id: number | string) => url(`${BASE}/file/${id}`);
export const libPreview = (id: number | string, mp = 1) => url(`${BASE}/preview/${id}?max_mp=${mp}&fmt=jpeg`);

export const libInfo = () => getJson<Record<string, any>>(`${BASE}/info`);
export async function listAssets(q: { category?: string; kind?: string; q?: string } = {}): Promise<LibAsset[]> {
  const p = new URLSearchParams(); for (const [k, v] of Object.entries(q)) if (v) p.set(k, v); p.set('limit', '500');
  const r = await getJson<{ assets: LibAsset[] }>(`${BASE}/assets?${p}`);
  return r.assets ?? [];
}
export async function listProjects(): Promise<LibProject[]> {
  const r = await getJson<{ projects: LibProject[] }>(`${BASE}/projects`);
  return r.projects ?? [];
}
export interface Resolved { ok: boolean; errors?: { code: string; message: string }[]; warnings?: { code: string; message: string }[]; attached?: { id: number; alias?: string; kind: string; name: string; label: string; mention?: string | null }[]; resolved_prompt?: string }
export const resolveRefs = (mode: 'project' | 'assets', project: string | undefined, assets: string[], prompt = '') =>
  postJson<Resolved>(`${BASE}/resolve`, { mode, project: project ? Number(project) : undefined, assets: assets.map(Number), prompt });

export async function registerAsset(file: File, category: string, name?: string): Promise<LibAsset> {
  const fd = new FormData();
  fd.append('file', file, file.name); fd.append('category', category); fd.append('name', name || file.name.replace(/\.[^.]+$/, ''));
  const r = await fetch(url(`${BASE}/assets`), { method: 'POST', body: fd });
  const j = await r.json();
  if (!j.ok) throw new Error(j.detail ?? j.code ?? 'register failed');
  return j.asset as LibAsset;
}
export const deleteAsset = (id: number) => postJson(`${BASE}/assets/${id}/delete`, { force: false });
