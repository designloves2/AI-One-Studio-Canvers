// Director Mode: ids, new project, validation and migration. Pure functions (no DOM, no network) so scripts/test-director.mjs can run them.
import { DIRECTOR_SCHEMA_VERSION, type DirectorProject, type DirectorShot, type DirectorScene, type DirectorAsset } from './types';

export type IdKind = 'dp' | 'sc' | 'sh' | 'as' | 'cv' | 'jb';
/** `<kind>_<12 chars base36>`; never changes once made (order, name and file paths may change) */
export function newId(kind: IdKind): string {
  let s = '';
  while (s.length < 12) s += Math.random().toString(36).slice(2);
  return `${kind}_${s.slice(0, 12)}`;
}
const ID_RE = /^(dp|sc|sh|as|cv|jb)_[a-z0-9]{12}$/;
export const isId = (v: unknown, kind?: IdKind): v is string => typeof v === 'string' && ID_RE.test(v) && (!kind || v.startsWith(kind + '_'));

const now = () => new Date().toISOString();

export function newDirectorProject(name: string): DirectorProject {
  const t = now();
  return {
    app: 'ai-one-studio-canvers', kind: 'director-project', schema_version: DIRECTOR_SCHEMA_VERSION,
    project_id: newId('dp'), name: name.trim() || 'untitled', created_at: t, updated_at: t,
    brief: { title: '', purpose: '', audience: '', duration_sec: 30, aspect: '16:9', tone: '', language: 'ko', notes: '', status: 'draft' },
    story: { logline: '', synopsis: '', draft_text: '', approved_text: '', status: 'draft' },
    scenes: [], shots: [], assets: [], canvas_links: [],
    settings: { execution_mode: 'manual' },   // never starts a generation by itself
  };
}

export function newScene(p: DirectorProject, title = ''): DirectorScene {
  const s: DirectorScene = { scene_id: newId('sc'), order: p.scenes.length + 1, title, summary: '', status: 'draft', shot_ids: [] };
  p.scenes.push(s); return s;
}
export function newShot(p: DirectorProject, scene_id: string): DirectorShot {
  const sc = p.scenes.find((x) => x.scene_id === scene_id);
  if (!sc) throw new Error(`unknown scene ${scene_id}`);
  const s: DirectorShot = { shot_id: newId('sh'), scene_id, order: sc.shot_ids.length + 1, status: 'draft', duration_sec: 4, prompt_en: '', prompt_ko: '', camera: '', notes: '', asset_ids: [], results: [] };
  p.shots.push(s); sc.shot_ids.push(s.shot_id); return s;
}
export function newAsset(p: DirectorProject, a: Omit<DirectorAsset, 'asset_id'>): DirectorAsset {
  const x: DirectorAsset = { ...a, asset_id: newId('as') };
  p.assets.push(x); return x;
}

/** A name that is safe as a file name (same rule as server-lib/director.mjs). */
export const BAD_NAME = /[\\/:*?"<>|\u0000-\u001f]/;
export const safeProjectName = (n: unknown): string | null => {
  const s = typeof n === 'string' ? n.trim() : '';
  return s && s.length <= 100 && !BAD_NAME.test(s) && !s.startsWith('.') ? s : null;
};

/** Problems that make a project unusable (errors) or suspicious (warnings). Never throws. */
export function validateDirectorProject(p: unknown): { errors: string[]; warnings: string[] } {
  const errors: string[] = [], warnings: string[] = [];
  const o = p as Partial<DirectorProject> | null;
  if (!o || typeof o !== 'object') return { errors: ['not an object'], warnings };
  if (o.kind !== 'director-project') errors.push('kind is not "director-project"');
  if (typeof o.schema_version !== 'number') errors.push('schema_version is missing');
  if (!isId(o.project_id, 'dp')) errors.push('project_id is not a valid id');
  for (const k of ['scenes', 'shots', 'assets', 'canvas_links'] as const) if (!Array.isArray(o[k])) errors.push(`${k} is not a list`);
  if (errors.length) return { errors, warnings };
  const seen = new Set<string>();
  const dup = (id: string, what: string) => { if (seen.has(id)) errors.push(`duplicate id ${id} (${what})`); seen.add(id); };
  const scenes = o.scenes!, shots = o.shots!, assets = o.assets!;
  for (const s of scenes) { if (!isId(s.scene_id, 'sc')) errors.push(`bad scene_id ${String(s.scene_id)}`); else dup(s.scene_id, 'scene'); }
  for (const s of shots) { if (!isId(s.shot_id, 'sh')) errors.push(`bad shot_id ${String(s.shot_id)}`); else dup(s.shot_id, 'shot'); }
  for (const a of assets) { if (!isId(a.asset_id, 'as')) errors.push(`bad asset_id ${String(a.asset_id)}`); else dup(a.asset_id, 'asset'); }
  const sceneIds = new Set(scenes.map((s) => s.scene_id)), shotIds = new Set(shots.map((s) => s.shot_id)), assetIds = new Set(assets.map((a) => a.asset_id));
  for (const s of shots) {
    if (!sceneIds.has(s.scene_id)) errors.push(`shot ${s.shot_id} points to missing scene ${s.scene_id}`);
    for (const a of s.asset_ids ?? []) if (!assetIds.has(a)) warnings.push(`shot ${s.shot_id} uses missing asset ${a}`);
  }
  for (const sc of scenes) for (const id of sc.shot_ids ?? []) if (!shotIds.has(id)) warnings.push(`scene ${sc.scene_id} lists missing shot ${id}`);
  for (const l of o.canvas_links!) for (const e of l.shots ?? []) if (!shotIds.has(e.shot_id)) warnings.push(`canvas link ${l.canvas_id} points to missing shot ${e.shot_id}`);
  return { errors, warnings };
}

type Migration = (p: Record<string, unknown>) => Record<string, unknown>;
/** MIGRATIONS[n] turns schema n into schema n+1. Empty while the current schema is 1. */
export const MIGRATIONS: Record<number, Migration> = {};

export interface LoadResult { project: DirectorProject; readOnly: boolean; migratedFrom?: number; errors: string[]; warnings: string[] }

/**
 * Older files are migrated in a copy; unknown fields are kept. A file written by a NEWER app opens read-only
 * (saving it would drop what this version does not know). Throws only when the file is not a Director project at all.
 */
export function loadDirectorProject(raw: unknown): LoadResult {
  const first = validateDirectorProject(raw);
  if (first.errors.length) throw new Error(`Not a usable Director project: ${first.errors[0]}`);
  let p = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  const from = p.schema_version as number;
  if (from > DIRECTOR_SCHEMA_VERSION) {
    return { project: p as unknown as DirectorProject, readOnly: true, errors: [], warnings: [...first.warnings, `saved by a newer version (schema ${from}); opened read-only`] };
  }
  let v = from;
  while (v < DIRECTOR_SCHEMA_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`No migration from schema ${v}`);
    p = m(p); v += 1; p.schema_version = v;
  }
  const again = validateDirectorProject(p);
  if (again.errors.length) throw new Error(`Migration produced an invalid project: ${again.errors[0]}`);
  return { project: p as unknown as DirectorProject, readOnly: false, migratedFrom: from < DIRECTOR_SCHEMA_VERSION ? from : undefined, errors: [], warnings: again.warnings };
}

export const touch = (p: DirectorProject): DirectorProject => { p.updated_at = new Date().toISOString(); return p; };
