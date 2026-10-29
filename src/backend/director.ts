import type { DirectorProject } from '../director/types';
import { loadDirectorProject, touch, type LoadResult } from '../director/model';

/** Saved Director projects live in the app's director/ folder (server-lib/director.mjs), apart from the canvases list. */
export interface DirectorEntry { name: string; mtime: number; size: number; scenes: number; shots: number; schema: number }

const BASE = '/canvers/director';
const path = (name: string) => `${BASE}/${encodeURIComponent(name)}`;

async function ok(r: Response): Promise<Response> {
  if (r.ok) return r;
  let msg = `HTTP ${r.status}`;
  try { const j = await r.json(); if (j?.error) msg = j.error; } catch { /* no body */ }
  throw new Error(msg);
}

export const listDirectorProjects = async (): Promise<DirectorEntry[]> => (await (await ok(await fetch(BASE))).json()).projects ?? [];
/** opens a saved project: migrated in memory when old, read-only when saved by a newer version */
export const openDirectorProject = async (name: string): Promise<LoadResult> => loadDirectorProject(await (await ok(await fetch(path(name)))).json());
export const saveDirectorProject = async (name: string, p: DirectorProject): Promise<void> => { await ok(await fetch(path(name), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(touch(p)) })); };
export const deleteDirectorProject = async (name: string): Promise<void> => { await ok(await fetch(path(name), { method: 'DELETE' })); };
