// Director Mode: ids, new project, validation and migration. Pure functions (no DOM, no network) so scripts/test-director*.mjs can run them.
import {
  DIRECTOR_SCHEMA_VERSION, type ChatMsg, type DirectorAsset, type DirectorEpisode, type DirectorProject, type DirectorReference, type DirectorScene, type DirectorShot,
  type ReferenceKind, type StageId, type StageStatus,
} from './types';

export type IdKind = 'dp' | 'sc' | 'sh' | 'as' | 'cv' | 'jb' | 'ep' | 'rf' | 'ms';
/** `<kind>_<12 chars base36>`; never changes once made (order, name and file paths may change) */
export function newId(kind: IdKind): string {
  let s = '';
  while (s.length < 12) s += Math.random().toString(36).slice(2);
  return `${kind}_${s.slice(0, 12)}`;
}
const ID_RE = /^(dp|sc|sh|as|cv|jb|ep|rf|ms)_[a-z0-9]{12}$/;
export const isId = (v: unknown, kind?: IdKind): v is string => typeof v === 'string' && ID_RE.test(v) && (!kind || v.startsWith(kind + '_'));

const now = () => new Date().toISOString();

export const STAGES: StageId[] = ['intake', 'brief', 'references', 'series', 'episode', 'canvas', 'execute', 'review'];
export const freshStatus = (): Record<StageId, StageStatus> => Object.fromEntries(STAGES.map((s) => [s, 'idle'])) as Record<StageId, StageStatus>;

export function newDirectorProject(name: string): DirectorProject {
  const t = now();
  return {
    app: 'ai-one-studio-canvers', kind: 'director-project', schema_version: DIRECTOR_SCHEMA_VERSION,
    project_id: newId('dp'), name: name.trim() || 'untitled', created_at: t, updated_at: t,
    series: { title: '', genre: '', tone: '', logline: '', synopsis: '', language: 'ko', total_episodes: 1, episode_seconds: 90, clip_seconds: 10, aspect: '16:9', resolution: '1080p', preset: 'h3_7plus1_kimchy', sound_direction: '', music_direction: '' },
    brief: { text: '', assumptions: [], status: 'draft' },
    episodes: [], references: [], scenes: [], shots: [], assets: [], canvas_links: [],
    workflow: { stage: 'intake', status: { ...freshStatus(), intake: 'review_required' }, episode_no: 1 },
    chat: [],
    settings: { execution_mode: 'manual' },   // never starts a generation by itself
  };
}

export function newEpisode(p: DirectorProject, no: number, title = '', logline = ''): DirectorEpisode {
  const e: DirectorEpisode = { episode_id: newId('ep'), no, title, logline, status: 'planned', stage: 'idle', stage_status: 'idle' };
  p.episodes.push(e); return e;
}
export function newScene(p: DirectorProject, episode_id: string, title = ''): DirectorScene {
  const s: DirectorScene = { scene_id: newId('sc'), episode_id, order: p.scenes.filter((x) => x.episode_id === episode_id).length + 1, title, summary: '', status: 'draft', shot_ids: [] };
  p.scenes.push(s); return s;
}
export function newShot(p: DirectorProject, scene_id: string): DirectorShot {
  const sc = p.scenes.find((x) => x.scene_id === scene_id);
  if (!sc) throw new Error(`unknown scene ${scene_id}`);
  const s: DirectorShot = { shot_id: newId('sh'), scene_id, order: sc.shot_ids.length + 1, status: 'draft', duration_sec: p.series.clip_seconds, prompt_en: '', prompt_ko: '', camera: '', notes: '', dialogue: '', sound: '', music: '', cast: [], location: '', asset_ids: [], results: [] };
  p.shots.push(s); sc.shot_ids.push(s.shot_id); return s;
}
export function newAsset(p: DirectorProject, a: Omit<DirectorAsset, 'asset_id'>): DirectorAsset {
  const x: DirectorAsset = { ...a, asset_id: newId('as') };
  p.assets.push(x); return x;
}
export function newReference(p: DirectorProject, kind: ReferenceKind, name: string, description = '', prompt_en = '', prompt_ko = ''): DirectorReference {
  const r: DirectorReference = { ref_id: newId('rf'), kind, name, description, prompt_en, ...(prompt_ko ? { prompt_ko } : {}), status: 'proposed', results: [] };
  p.references.push(r); return r;
}
export function addChat(p: DirectorProject, role: ChatMsg['role'], text: string, extra: Partial<ChatMsg> = {}): ChatMsg {
  const m: ChatMsg = { id: newId('ms'), role, text, at: now(), stage: p.workflow.stage, ...extra };
  p.chat.push(m); if (p.chat.length > 400) p.chat.splice(0, p.chat.length - 400); return m;
}

/** the cast entry a clip names (case-insensitive) */
export const findReference = (p: DirectorProject, name: string) => p.references.find((r) => r.name.trim().toLowerCase() === name.trim().toLowerCase());

/** The cast entries a clip uses, in the order they are shown to the model (cast first, then the location): approved, with a picked image. */
export function castOf(p: DirectorProject, s: Pick<DirectorShot, 'cast' | 'location'>): DirectorReference[] {
  const out: DirectorReference[] = [];
  for (const n of [...s.cast, ...(s.location ? [s.location] : [])]) {
    const r = findReference(p, n);
    if (r && r.status !== 'rejected' && r.results.some((x) => x.picked) && !out.includes(r)) out.push(r);
  }
  return out;
}

/** Fill each clip's asset_ids from its cast and location: the registered assets of the approved cast entries. Returns how many clips changed. */
export function syncShotAssets(p: DirectorProject): number {
  let changed = 0;
  for (const s of p.shots) {
    const names = [...s.cast, ...(s.location ? [s.location] : [])];
    const ids = names.map((n) => findReference(p, n)).filter((r): r is DirectorReference => !!r && r.status === 'approved' && !!r.asset_id).map((r) => r.asset_id!);
    const uniq = [...new Set(ids)];
    if (uniq.join() !== s.asset_ids.join()) { s.asset_ids = uniq; changed++; }
  }
  return changed;
}

/** shots of one episode in play order (scene order, then clip order) */
export function shotsOfEpisode(p: DirectorProject, episode_id: string): DirectorShot[] {
  const scenes = p.scenes.filter((s) => s.episode_id === episode_id).sort((a, b) => a.order - b.order);
  return scenes.flatMap((sc) => p.shots.filter((s) => s.scene_id === sc.scene_id).sort((a, b) => a.order - b.order));
}
export const episodeByNo = (p: DirectorProject, no: number) => p.episodes.find((e) => e.no === no);

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
  const lists = (o.schema_version ?? 0) >= 2 ? ['scenes', 'shots', 'assets', 'canvas_links', 'episodes', 'references', 'chat'] as const : ['scenes', 'shots', 'assets', 'canvas_links'] as const;
  for (const k of lists) if (!Array.isArray(o[k])) errors.push(`${k} is not a list`);
  if (errors.length) return { errors, warnings };
  const v2 = (o.schema_version ?? 0) >= 2;
  const seen = new Set<string>();
  const dup = (id: string, what: string) => { if (seen.has(id)) errors.push(`duplicate id ${id} (${what})`); seen.add(id); };
  const scenes = o.scenes!, shots = o.shots!, assets = o.assets!;
  for (const s of scenes) { if (!isId(s.scene_id, 'sc')) errors.push(`bad scene_id ${String(s.scene_id)}`); else dup(s.scene_id, 'scene'); }
  for (const s of shots) { if (!isId(s.shot_id, 'sh')) errors.push(`bad shot_id ${String(s.shot_id)}`); else dup(s.shot_id, 'shot'); }
  for (const a of assets) { if (!isId(a.asset_id, 'as')) errors.push(`bad asset_id ${String(a.asset_id)}`); else dup(a.asset_id, 'asset'); }
  const sceneIds = new Set(scenes.map((s) => s.scene_id)), shotIds = new Set(shots.map((s) => s.shot_id)), assetIds = new Set(assets.map((a) => a.asset_id));
  if (v2) {
    for (const e of o.episodes!) { if (!isId(e.episode_id, 'ep')) errors.push(`bad episode_id ${String(e.episode_id)}`); else dup(e.episode_id, 'episode'); }
    for (const r of o.references!) { if (!isId(r.ref_id, 'rf')) errors.push(`bad ref_id ${String(r.ref_id)}`); else dup(r.ref_id, 'reference'); }
    const epIds = new Set(o.episodes!.map((e) => e.episode_id));
    for (const s of scenes) if (!epIds.has(s.episode_id)) errors.push(`scene ${s.scene_id} points to missing episode ${s.episode_id}`);
    if (!o.workflow || !(STAGES as string[]).includes(o.workflow.stage)) errors.push('workflow.stage is missing or unknown');
    if (!o.series || typeof o.series.total_episodes !== 'number') errors.push('series is missing');
  }
  for (const s of shots) {
    if (!sceneIds.has(s.scene_id)) errors.push(`shot ${s.shot_id} points to missing scene ${s.scene_id}`);
    for (const a of s.asset_ids ?? []) if (!assetIds.has(a)) warnings.push(`shot ${s.shot_id} uses missing asset ${a}`);
  }
  for (const sc of scenes) for (const id of sc.shot_ids ?? []) if (!shotIds.has(id)) warnings.push(`scene ${sc.scene_id} lists missing shot ${id}`);
  for (const l of o.canvas_links!) for (const e of l.shots ?? []) if (!shotIds.has(e.shot_id)) warnings.push(`canvas link ${l.canvas_id} points to missing shot ${e.shot_id}`);
  return { errors, warnings };
}

type Migration = (p: Record<string, unknown>) => Record<string, unknown>;
/** MIGRATIONS[n] turns schema n into schema n+1. */
export const MIGRATIONS: Record<number, Migration> = {
  // 1 -> 2: the one-film project becomes episode 1 of a series; the chat and the production line start empty
  1: (p) => {
    const o = p as unknown as { brief?: Record<string, unknown>; story?: Record<string, unknown>; scenes: Record<string, unknown>[]; shots: unknown[]; name?: string };
    const b = o.brief ?? {}, st = o.story ?? {};
    const ep = newId('ep');
    const text = [b.purpose, b.audience && `Audience: ${String(b.audience)}`, b.notes].filter((x) => typeof x === 'string' && x).join('\n');
    const { story: _s, ...rest } = p as Record<string, unknown> & { story?: unknown };
    void _s;
    return {
      ...rest,
      series: { title: String(b.title ?? ''), genre: '', tone: String(b.tone ?? ''), logline: String(st.logline ?? ''), synopsis: String(st.synopsis ?? ''), language: String(b.language ?? 'ko'), total_episodes: 1,
        episode_seconds: Number(b.duration_sec) || 90, clip_seconds: 10, aspect: String(b.aspect ?? '16:9'), resolution: '1080p', preset: 'h3_7plus1_kimchy', sound_direction: '', music_direction: '' },
      brief: { text, assumptions: [], status: b.status === 'approved' ? 'approved' : 'draft' },
      episodes: [{ episode_id: ep, no: 1, title: String(o.name ?? ''), logline: '', status: o.shots.length ? 'drafted' : 'planned' }],
      references: [],
      scenes: o.scenes.map((s) => ({ ...s, episode_id: ep })),
      shots: (o.shots as Record<string, unknown>[]).map((s) => ({ dialogue: '', sound: '', music: '', cast: [], location: '', ...s })),
      workflow: { stage: o.shots.length ? 'episode' : 'intake', status: { ...freshStatus(), [o.shots.length ? 'episode' : 'intake']: 'review_required' }, episode_no: 1 },
      chat: [],
    };
  },
};

// 2 -> 3: every episode gets its own place in the line (it used to be one place for the whole series, workflow.episode_no)
MIGRATIONS[2] = (p) => {
  const o = p as unknown as { workflow: { stage: string; status: Record<string, string>; episode_no: number }; episodes: Record<string, unknown>[] };
  const w = o.workflow, inEp = ['episode', 'canvas', 'execute', 'review'].includes(w.stage);
  return {
    ...p,
    episodes: o.episodes.map((e) => {
      const no = Number(e.no);
      const state = !inEp ? ['idle', 'idle'] : no < w.episode_no ? ['done', 'completed'] : no === w.episode_no ? [w.stage, w.status[w.stage] ?? 'review_required'] : ['idle', 'idle'];
      return { stage: state[0], stage_status: state[1], ...e };
    }),
    workflow: { ...w, stage: inEp ? 'episode' : w.stage, status: { ...w.status, ...(inEp ? { episode: 'approved' } : {}) } },
  };
};

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
