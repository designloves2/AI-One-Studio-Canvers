import type { ComposerRun } from '../store/graph';

/** A project is the top level: its Director project, its canvases and the Simple-mode feed all belong to it (server-lib/projects.mjs). */
export type ProjectMode = 'director' | 'canvas' | 'simple';
export interface ProjectManifest {
  kind: 'canvers-project'; schema: 1;
  name: string; created: string; updated: string;
  /** the tab that was open last */
  mode: ProjectMode;
  /** file name in director/ (without .json) */
  director: string | null;
  /** file names in canvases/ that belong to this project, and the one that was open last */
  canvases: string[]; canvas: string | null;
  /** the Simple-mode feed */
  simple: ComposerRun[];
}
export interface ProjectEntry { name: string; mtime: number; mode: ProjectMode; hasDirector: boolean; canvases: number; simple: number }

const BASE = '/canvers/projects';
const path = (name: string) => `${BASE}/${encodeURIComponent(name)}`;

async function ok(r: Response): Promise<Response> {
  if (r.ok) return r;
  let msg = `HTTP ${r.status}`;
  try { const j = await r.json(); if (j?.error) msg = j.error; } catch { /* no body */ }
  throw new Error(msg);
}

export const newManifest = (name: string, mode: ProjectMode = 'canvas'): ProjectManifest => { const now = new Date().toISOString(); return { kind: 'canvers-project', schema: 1, name, created: now, updated: now, mode, director: null, canvases: [], canvas: null, simple: [] }; };
export const listProjects = async (): Promise<ProjectEntry[]> => (await (await ok(await fetch(BASE))).json()).projects ?? [];
export const loadManifest = async (name: string): Promise<ProjectManifest> => { const m = await (await ok(await fetch(path(name)))).json(); return { ...newManifest(name), ...m, name }; };
export const saveManifest = async (m: ProjectManifest): Promise<void> => { await ok(await fetch(path(m.name), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...m, updated: new Date().toISOString() }) })); };
export const deleteManifest = async (name: string): Promise<void> => { await ok(await fetch(path(name), { method: 'DELETE' })); };
