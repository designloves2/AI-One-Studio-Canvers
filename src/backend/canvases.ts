import type { Project } from '../types';

/** Saved canvases live as JSON files in the project's canvases/ folder, served by the dev server (server-lib/canvases.mjs). */
export interface CanvasEntry { name: string; mtime: number; size: number; nodes: number }

const BASE = '/canvers/canvases';
const path = (name: string) => `${BASE}/${encodeURIComponent(name)}`;

async function ok(r: Response): Promise<Response> {
  if (r.ok) return r;
  let msg = `HTTP ${r.status}`;
  try { const j = await r.json(); if (j?.error) msg = j.error; } catch { /* no body */ }
  throw new Error(msg);
}

export const listCanvases = async (): Promise<CanvasEntry[]> => (await (await ok(await fetch(BASE))).json()).canvases ?? [];
export const loadCanvas = async (name: string): Promise<Project> => (await ok(await fetch(path(name)))).json();
export const saveCanvas = async (name: string, project: Project): Promise<void> => { await ok(await fetch(path(name), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(project) })); };
export const deleteCanvas = async (name: string): Promise<void> => { await ok(await fetch(path(name), { method: 'DELETE' })); };

/** File-name safe version of a canvas title (the server rejects / \ : * ? " < > | and a leading dot). */
export const canvasFileName = (title: string) => (title.replace(/[\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 100)) || 'untitled';
