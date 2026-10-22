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

/** An @name only works when it is letters / digits / _ (the library cannot read "girl-1"), so those characters are what a name may contain. */
export const safeAssetName = (n: string) => n.replace(/[^\wㄱ-힝]+/g, '_').replace(/^_+|_+$/g, '');

export async function registerAsset(file: File, category: string, name?: string, subcategory?: string): Promise<LibAsset> {
  const fd = new FormData();
  if (subcategory) fd.append('subcategory', subcategory);
  fd.append('file', file, file.name); fd.append('category', category); fd.append('name', safeAssetName(name || file.name.replace(/\.[^.]+$/, '')) || 'asset');
  const r = await fetch(url(`${BASE}/assets`), { method: 'POST', body: fd });
  const j = await r.json();
  if (!j.ok) throw new Error(j.detail ?? j.code ?? 'register failed');
  return j.asset as LibAsset;
}
export interface LibInfo { categories: string[]; asset_count: number }
export const libCategories = () => libInfo().then((i) => (Array.isArray(i.categories) ? (i.categories as string[]) : ['character', 'background', 'prop', 'etc']));
/** rename / move / retag; the server moves the file when name or category changes */
export const updateAsset = (id: number, fields: { name?: string; category?: string; tags?: string; note?: string }) =>
  postJson<{ ok: boolean; asset: LibAsset }>(`${BASE}/assets/${id}/update`, fields);
export async function replaceAssetMedia(id: number, file: File): Promise<LibAsset> {
  const fd = new FormData(); fd.append('file', file, file.name);
  const j = await (await fetch(url(`${BASE}/assets/${id}/replace`), { method: 'POST', body: fd })).json();
  if (!j.ok) throw new Error(j.detail ?? j.code ?? 'replace failed');
  return j.asset as LibAsset;
}
export const deleteAsset = (id: number) => postJson(`${BASE}/assets/${id}/delete`, { force: false });

let namesCache: Promise<string[]> | null = null;
/** library names that can be written as @name (cached; empty when the library is not installed) */
export function mentionNames(): Promise<string[]> {
  return (namesCache ??= listAssets().then((a) => [...new Set(a.filter((x) => x.kind !== 'audio').map((x) => x.name).filter((n) => /^[A-Za-z0-9_\u3131-\uD79D]+$/.test(n)))]).catch(() => { setTimeout(() => { namesCache = null; }, 60000); return [] as string[]; }));
}
export const resetMentionNames = () => { namesCache = null; };

export const saveProject = (name: string, ids: string[]) => postJson<{ ok: boolean; project?: LibProject; code?: string; detail?: string }>(`${BASE}/projects`, { name, items: ids.map((id, i) => ({ asset_id: Number(id), order: i })) });
export const deleteProject = (id: string) => postJson(`${BASE}/projects/${id}/delete`, {});
