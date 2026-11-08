// The project is the top level. Its Director project, its canvases and its Simple-mode feed belong to it; the three modes are just three views of the open project.
// This store keeps the manifest of the open project in step with the three stores (director / graph) and holds every project-level action:
// open, new, save, rename, copy, export / import, send a part to another project, clear a part, delete.
import { create } from 'zustand';
import { useGraph, type AppMode, type ComposerRun } from './graph';
import { useDirector } from './director';
import { deleteCanvas, listCanvases, loadCanvas, saveCanvas } from '../backend/canvases';
import { deleteDirectorProject, listDirectorProjects, openDirectorProject, saveDirectorProject } from '../backend/director';
import { deleteManifest, listProjects, loadManifest, newManifest, saveManifest, type ProjectEntry, type ProjectManifest, type ProjectMode } from '../backend/projects';
import { askConfirm, askText, notify } from '../ui/dialog';
import { t as tr } from '../i18n';
import { uid } from '../backend/comfy';
import { saveCanvasToList } from '../engine/actions';
import type { DirectorProject } from '../director/types';
import type { Project } from '../types';

const BAD = /[\\/:*?"<>|\u0000-\u001f]/g;
export const projectFileName = (n: string): string => (n.replace(BAD, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 100)) || 'project';

export type Part = 'director' | 'canvas' | 'simple';
/** what a project hands over / receives (a copy, an export file, "send to another project") */
export interface Bundle { kind: 'canvers-project-bundle'; schema: 1; name: string; mode: ProjectMode; director: { file: string; project: DirectorProject } | null; canvases: Record<string, Project>; simple: ComposerRun[] }

/** an open project tab (the projects you work in side by side); `name` is the project's name ('' = nothing saved in it yet) */
export interface Tab { id: string; name: string; /** the mode this tab was in when it was left */ mode?: AppMode }
const TABS_KEY = 'canvers.tabs.v1';
function readTabs(): { tabs: Tab[]; active: string } {
  try {
    const v = JSON.parse(localStorage.getItem(TABS_KEY) ?? 'null') as { tabs?: Tab[]; active?: string } | null;
    if (v?.tabs?.length) return { tabs: v.tabs.filter((t) => t && typeof t.id === 'string'), active: v.tabs.some((t) => t.id === v.active) ? v.active! : v.tabs[0].id };
  } catch { /* ignore */ }
  const id = uid('tab'); return { tabs: [{ id, name: '' }], active: id };
}
const initTabs = readTabs();

interface WorkspaceState {
  manifest: ProjectManifest | null;
  list: ProjectEntry[];
  busy: boolean;
  tabs: Tab[];
  activeId: string;
  refreshList(): Promise<void>;
}
export const useWorkspace = create<WorkspaceState>((set) => ({
  manifest: null, list: [], busy: false, tabs: initTabs.tabs, activeId: initTabs.active,
  refreshList: async () => { try { set({ list: await listProjects() }); } catch { /* a server without the route: the list stays as it was */ } },
}));
const saveTabs = () => { const { tabs, activeId } = useWorkspace.getState(); try { localStorage.setItem(TABS_KEY, JSON.stringify({ tabs, active: activeId })); } catch { /* ignore */ } };
/** the active tab shows the open project's name */
function nameActiveTab() {
  const { tabs, activeId, manifest } = useWorkspace.getState();
  useWorkspace.setState({ tabs: tabs.map((t) => (t.id === activeId ? { ...t, name: manifest?.name ?? '' } : t)) }); saveTabs();
}

/** what a tab keeps while it is in the background: the three modes exactly as they were, saved or not */
interface Snap {
  manifest: ProjectManifest | null;
  director: { project: DirectorProject | null; file: string | null; dirty: boolean; readOnly: boolean; notes: string[]; view: ReturnType<typeof useDirector.getState>['view']; focus: number; selClips: string[] };
  canvas: { project: Project; file: string | null; dirty: boolean };
  runs: ComposerRun[]; mode: AppMode;
}
const snaps = new Map<string, Snap>();
function capture(): Snap {
  const d = useDirector.getState(); const g = useGraph.getState();
  return { manifest: useWorkspace.getState().manifest, director: { project: d.project, file: d.file, dirty: d.dirty, readOnly: d.readOnly, notes: d.notes, view: d.view, focus: d.focus, selClips: d.selClips }, canvas: { project: g.toProject(), file: g.canvasFile, dirty: g.dirty }, runs: g.composerRuns, mode: g.mode };
}
function blankStores() {
  const g = useGraph.getState(); const d = useDirector.getState();
  g.newProject(); g.setComposerRuns([]); d.close();
}
function restore(sn: Snap) {
  const g = useGraph.getState();
  useDirector.setState({ project: sn.director.project, file: sn.director.file, dirty: sn.director.dirty, readOnly: sn.director.readOnly, notes: sn.director.notes, view: sn.director.view, focus: sn.director.focus, selClips: sn.director.selClips, batch: null });
  g.loadProject(sn.canvas.project, sn.canvas.file, sn.canvas.dirty); g.setComposerRuns(sn.runs); g.setMode(sn.mode);
  useWorkspace.setState({ manifest: sn.manifest });
}
const tabIsBlank = (): boolean => { const g = useGraph.getState(); return !useWorkspace.getState().manifest && !useDirector.getState().project && !g.nodes.length && !g.composerRuns.length; };

let applying = false;   // true while a project is being opened: the stores change, the manifest must not be rewritten from that
let saveTimer: ReturnType<typeof setTimeout> | undefined;

const ws = () => useWorkspace.getState();

/** every canvas file that belongs to the open project: the ones listed + the ones the Director made for its episodes */
export function canvasesOf(m: ProjectManifest, d: DirectorProject | null = useDirector.getState().project): string[] {
  return [...new Set([...m.canvases, ...(d?.canvas_links ?? []).map((l) => l.canvas_file)])];
}

function schedule() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { const m = ws().manifest; if (m) void saveManifest(m).then(() => ws().refreshList()).catch(() => undefined); }, 800);
}
function patch(p: Partial<ProjectManifest>) {
  const m = ws().manifest; if (!m) return;
  useWorkspace.setState({ manifest: { ...m, ...p } }); schedule();
}

/** a project name that is free (not used by another saved project) */
async function freeName(base: string): Promise<string> {
  const names = new Set((await listProjects().catch(() => [] as ProjectEntry[])).map((p) => p.name));
  const b = projectFileName(base); let n = b, i = 2; while (names.has(n)) n = `${b} ${i++}`;
  return n;
}

/** the open project; made now (named after `hint`) when the first thing worth keeping appears and no project is open yet */
async function ensureProject(hint: string): Promise<ProjectManifest> {
  const cur = ws().manifest; if (cur) return cur;
  const name = await freeName(hint || tr('New project'));
  const m = { ...newManifest(name, useGraph.getState().mode) };
  useWorkspace.setState({ manifest: m }); nameActiveTab();
  await saveManifest(m).catch(() => undefined); void ws().refreshList();
  return m;
}

// ------------------------------------------------------------------ keeping the manifest up to date
export function startWorkspaceSync(): void {
  // Director project saved under a file name -> it belongs to the open project
  let dirFile: string | null = useDirector.getState().file; let links = '';
  useDirector.subscribe((s) => {
    if (applying) { dirFile = s.file; links = (s.project?.canvas_links ?? []).map((l) => l.canvas_file).join('|'); return; }
    if (s.file !== dirFile) {
      dirFile = s.file;
      if (s.file) void ensureProject(s.file).then((m) => { if (m.director !== s.file) patch({ director: s.file }); });
    }
    const now = (s.project?.canvas_links ?? []).map((l) => l.canvas_file).join('|');
    if (now !== links) {
      links = now;
      const m = ws().manifest;
      if (m && s.project) { const all = canvasesOf(m, s.project); if (all.length !== m.canvases.length) patch({ canvases: all }); }
    }
  });
  // canvas saved / opened, the open tab, the Simple feed
  let cf = useGraph.getState().canvasFile; let mode = useGraph.getState().mode; let runs = useGraph.getState().composerRuns;
  useGraph.subscribe((g) => {
    if (applying) { cf = g.canvasFile; mode = g.mode; runs = g.composerRuns; return; }
    if (g.canvasFile !== cf) {
      cf = g.canvasFile;
      if (g.canvasFile) { const f = g.canvasFile; void ensureProject(g.projectName || f).then((m) => patch({ canvases: m.canvases.includes(f) ? m.canvases : [...m.canvases, f], canvas: f })); }
    }
    if (g.mode !== mode) { mode = g.mode; if (ws().manifest) patch({ mode }); }
    if (g.composerRuns !== runs) {
      runs = g.composerRuns;
      const done = runs.filter((r) => r.status !== 'running').slice(0, 150);
      if (ws().manifest) patch({ simple: done });
      else if (done.length) void ensureProject(tr('New project')).then(() => patch({ simple: done }));
    }
  });
  void restoreLast();
}

/** after a reload: the tabs come back; the open one loads its project (its Director project opens again; the canvas and the feed are restored by their own stores) */
async function restoreLast(): Promise<void> {
  void ws().refreshList();
  const tab = ws().tabs.find((t) => t.id === ws().activeId);
  if (!tab?.name) return;
  try {
    const m = await loadManifest(tab.name);
    applying = true;
    useWorkspace.setState({ manifest: m });
    if (m.director && !useDirector.getState().project) { try { await useDirector.getState().open(m.director); } catch { /* the file is gone: the project keeps its other parts */ } }
  } catch { nameActiveTab(); } finally { applying = false; }
}

// ------------------------------------------------------------------ opening / new / save
/** something is running: the tabs are kept as they are until it is done (a run belongs to the cards on screen) */
function unsavedWork(): string | null {
  const d = useDirector.getState(); const g = useGraph.getState();
  if (d.busy || d.batch?.running) return tr('The crew is working. Wait until it is done.');
  if (Object.values(g.runtime).some((r) => r.status === 'running') || g.composerRuns.some((r) => r.status === 'running')) return tr('A generation is running. Wait until it is done, or stop it.');
  return null;
}
async function confirmLeave(): Promise<boolean> {
  const d = useDirector.getState(); const g = useGraph.getState();
  const bits: string[] = [];
  if (d.project && d.dirty && !d.file) bits.push(tr('Director'));
  if (g.dirty && g.nodes.length) bits.push(tr('Canvas'));
  return !bits.length || askConfirm(`${bits.join(' · ')}: ${tr('has unsaved changes. Continue?')}`);
}

/** save everything of the open project: the Director project, the open canvas, the manifest */
export async function saveAll(): Promise<boolean> {
  const d = useDirector.getState(); const g = useGraph.getState();
  try {
    if (d.project && !d.readOnly && !d.demo && (d.dirty || !d.file)) await d.save();   // an untouched project is not rewritten (its saved time stays)
    if (g.nodes.length && (g.dirty || !g.canvasFile)) { if (!(await saveCanvasToList())) return false; }
    const m = ws().manifest;
    if (m) { await saveManifest({ ...m, canvases: canvasesOf(m) }); await ws().refreshList(); }
    return true;
  } catch (e) { void notify(`${tr('Could not save')}: ${(e as Error).message}`); return false; }
}

/** read a project's files into the three modes (the stores must be blank or about to be replaced) */
async function loadInto(m: ProjectManifest): Promise<void> {
  applying = true;
  try {
    const g = useGraph.getState(); const d = useDirector.getState();
    useWorkspace.setState({ manifest: m });
    g.newProject(); g.setComposerRuns(m.simple ?? []);
    if (m.director) { try { await d.open(m.director); } catch (e) { void notify(`${tr('Could not open')}: ${(e as Error).message}`); d.close(); } } else d.close();
    if (m.director && useDirector.getState().project) { const { openCanvasOfProject } = await import('../director/pairing'); await openCanvasOfProject(); }
    else if (m.canvas) { try { g.loadProject(await loadCanvas(m.canvas), m.canvas, false); } catch { /* the canvas file is gone */ } }
    g.setMode(m.mode);
  } finally { applying = false; }
}

/** make `id` the open tab: the one that was open keeps its state in memory, the new one gets its own back (or its files are read) */
async function activateTab(id: string, fresh?: () => Promise<void>): Promise<boolean> {
  const cur = ws().activeId; if (id === cur) return true;
  const busy = unsavedWork(); if (busy) { void notify(busy); return false; }
  if (cur) { snaps.set(cur, capture()); useWorkspace.setState({ tabs: ws().tabs.map((t) => (t.id === cur ? { ...t, mode: useGraph.getState().mode } : t)) }); }
  applying = true;
  try {
    useWorkspace.setState({ activeId: id }); saveTabs();
    const sn = snaps.get(id);
    if (fresh) { await fresh(); }
    else if (sn) { restore(sn); snaps.delete(id); }
    else {
      const tab = ws().tabs.find((t) => t.id === id);
      if (tab?.name) { try { await loadInto(await loadManifest(tab.name)); } catch { blankStores(); useWorkspace.setState({ manifest: null }); } }
      else { blankStores(); useWorkspace.setState({ manifest: null }); }
    }
  } finally { applying = false; }
  void ws().refreshList();
  return true;
}

/** a tab that has nothing in it yet is reused for the next project, otherwise a new tab is added */
function tabForNew(): string {
  const { tabs, activeId } = ws();
  if (tabIsBlank()) return activeId;
  const id = uid('tab'); useWorkspace.setState({ tabs: [...tabs, { id, name: '' }] }); saveTabs();
  return id;
}

export const switchTab = (id: string): Promise<boolean> => activateTab(id);

export async function openProject(name: string): Promise<boolean> {
  const open = ws().tabs.find((t) => t.name === name);
  if (open) return activateTab(open.id);
  let m: ProjectManifest;
  try { m = await loadManifest(name); } catch (e) { void notify(`${tr('Could not open')}: ${(e as Error).message}`); return false; }
  const reuse = tabIsBlank();
  const id = tabForNew();
  if (reuse) { await loadInto(m); }   // the open tab has nothing in it: it becomes this project
  else if (!(await activateTab(id, () => loadInto(m)))) { useWorkspace.setState({ tabs: ws().tabs.filter((t) => t.id !== id) }); saveTabs(); return false; }
  nameActiveTab(); void ws().refreshList();
  return true;
}

/** an empty project in a tab of its own. Without a name it gets one from the first thing that is made in it */
export async function newProjectFlow(): Promise<boolean> {
  const typed = await askText(tr('Project name'));
  if (typed === null) return false;
  const reuse = tabIsBlank();
  const id = tabForNew();
  const make = async () => {
    applying = true;
    try {
      blankStores();
      if (typed.trim()) { const name = await freeName(typed); const m = newManifest(name, useGraph.getState().mode); useWorkspace.setState({ manifest: m }); await saveManifest(m).catch(() => undefined); }
      else useWorkspace.setState({ manifest: null });
    } finally { applying = false; }
  };
  if (reuse) await make();
  else if (!(await activateTab(id, make))) { useWorkspace.setState({ tabs: ws().tabs.filter((t) => t.id !== id) }); saveTabs(); return false; }
  nameActiveTab(); void ws().refreshList();
  return true;
}

/** close a tab; a tab with unsaved work asks first. The last tab is never removed: it becomes a blank one. */
export async function closeTab(id: string): Promise<void> {
  const { tabs, activeId } = ws();
  const tab = tabs.find((t) => t.id === id); if (!tab) return;
  let unsaved = false;
  if (id === activeId) { const d = useDirector.getState(), g = useGraph.getState(); unsaved = (!!d.project && d.dirty) || (g.dirty && g.nodes.length > 0); }
  else { const sn = snaps.get(id); unsaved = !!sn && ((!!sn.director.project && sn.director.dirty) || (sn.canvas.dirty && sn.canvas.project.nodes.length > 0)); }
  if (unsaved && !(await askConfirm(`${tab.name || tr('New project')}: ${tr('has unsaved changes. Continue?')}`))) return;
  if (id === activeId) {
    const busy = unsavedWork(); if (busy) { void notify(busy); return; }
    const rest = tabs.filter((t) => t.id !== id);
    snaps.delete(id);
    if (!rest.length) {
      const nid = uid('tab'); applying = true;
      try { blankStores(); useWorkspace.setState({ manifest: null, tabs: [{ id: nid, name: '' }], activeId: nid }); } finally { applying = false; }
      saveTabs(); return;
    }
    const idx = tabs.findIndex((t) => t.id === id); const next = rest[Math.min(idx, rest.length - 1)];
    useWorkspace.setState({ tabs: rest, activeId: '' });   // the closed tab is gone: its stores are replaced by the neighbour's
    await activateTab(next.id);
    return;
  }
  snaps.delete(id); useWorkspace.setState({ tabs: tabs.filter((t) => t.id !== id) }); saveTabs();
}

export async function renameProject(): Promise<void> {
  const m = ws().manifest; if (!m) return;
  const typed = await askText(tr('Project name')); if (typed === null || !typed.trim() || projectFileName(typed) === m.name) return;
  const name = await freeName(typed);
  try { await saveManifest({ ...m, name }); await deleteManifest(m.name); useWorkspace.setState({ manifest: { ...m, name } }); nameActiveTab(); await ws().refreshList(); }
  catch (e) { void notify((e as Error).message); }
}

// ------------------------------------------------------------------ bundles: copy, export / import, send
const unique = (base: string, taken: Set<string>): string => { let n = base, i = 2; while (taken.has(n)) n = `${base} ${i++}`; taken.add(n); return n; };

/** gather the parts of the open project (the Director project and its canvases are read from the files, so save first) */
export async function collect(parts: Part[]): Promise<Bundle> {
  const m = ws().manifest; const name = m?.name ?? 'project';
  const b: Bundle = { kind: 'canvers-project-bundle', schema: 1, name, mode: m?.mode ?? 'canvas', director: null, canvases: {}, simple: [] };
  const dirFile = m?.director ?? useDirector.getState().file;
  const links = new Set<string>();
  if (parts.includes('director') && dirFile) {
    const r = await openDirectorProject(dirFile); b.director = { file: dirFile, project: r.project };
    for (const l of r.project.canvas_links) links.add(l.canvas_file);
  }
  const want = new Set<string>(links);
  if (parts.includes('canvas') && m) for (const c of canvasesOf(m)) want.add(c);
  for (const c of want) { try { b.canvases[c] = await loadCanvas(c); } catch { /* a missing canvas is skipped */ } }
  if (parts.includes('simple')) b.simple = [...(useGraph.getState().composerRuns)];
  return b;
}

/** write a bundle's files under new, free names; the Director <-> canvas pairs are re-pointed at the copies */
export async function install(b: Bundle, base: string): Promise<{ director: string | null; canvases: string[]; canvasOf: Record<string, string> }> {
  const canvasNames = new Set((await listCanvases().catch(() => [])).map((c) => c.name));
  const dirNames = new Set((await listDirectorProjects().catch(() => [])).map((d) => d.name));
  const oldDir = b.director?.file ?? null;
  const newDir = b.director ? unique(projectFileName(base), dirNames) : null;
  const map: Record<string, string> = {};
  for (const old of Object.keys(b.canvases)) {
    const stem = oldDir && old.startsWith(oldDir) && newDir ? `${newDir}${old.slice(oldDir.length)}` : old;
    map[old] = unique(projectFileName(stem), canvasNames);
  }
  for (const [old, p] of Object.entries(b.canvases)) {
    const copy: Project = JSON.parse(JSON.stringify(p));
    copy.name = map[old];
    if (copy.director) { if (newDir) copy.director = { ...copy.director, file: newDir, name: newDir }; else delete copy.director; }
    await saveCanvas(map[old], copy);
  }
  if (b.director && newDir) {
    const dp: DirectorProject = JSON.parse(JSON.stringify(b.director.project));
    dp.name = newDir;
    for (const l of dp.canvas_links) if (map[l.canvas_file]) l.canvas_file = map[l.canvas_file];
    await saveDirectorProject(newDir, dp);
  }
  return { director: newDir, canvases: Object.values(map), canvasOf: map };
}

/** a copy of the whole open project under a new name */
export async function duplicateProject(): Promise<void> {
  const m = ws().manifest; if (!m) { void notify(tr('Nothing to copy yet.')); return; }
  const typed = await askText(`${tr('Name of the copy')}`); if (typed === null || !typed.trim()) return;
  if (!(await saveAll())) return;
  useWorkspace.setState({ busy: true });
  try {
    const name = await freeName(typed);
    const b = await collect(['director', 'canvas', 'simple']);
    const r = await install(b, name);
    const cur = ws().manifest!;
    const nm: ProjectManifest = { ...newManifest(name, cur.mode), director: r.director, canvases: r.canvases, canvas: cur.canvas ? (r.canvasOf[cur.canvas] ?? r.canvases[0] ?? null) : null, simple: b.simple };
    await saveManifest(nm); await ws().refreshList();
    void notify(`${tr('Copied as')}: ${name}`);
  } catch (e) { void notify(`${tr('Could not copy')}: ${(e as Error).message}`); } finally { useWorkspace.setState({ busy: false }); }
}

/** the whole project (or one part) as one file */
export async function exportProject(parts: Part[] = ['director', 'canvas', 'simple']): Promise<void> {
  if (!(await saveAll())) return;
  try {
    const b = await collect(parts);
    const u = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = u; a.download = `${projectFileName(b.name)}.canvers-project.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  } catch (e) { void notify((e as Error).message); }
}
export function importProject(): void {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = async () => {
    const f = i.files?.[0]; if (!f) return;
    try {
      const b = JSON.parse(await f.text()) as Bundle;
      if (b?.kind !== 'canvers-project-bundle') throw new Error(tr('Not a project file.'));
      const name = await freeName(b.name || f.name.replace(/\.canvers-project\.json$|\.json$/i, ''));
      const r = await install(b, name);
      const m: ProjectManifest = { ...newManifest(name, b.mode), director: r.director, canvases: r.canvases, canvas: r.canvases[0] ?? null, simple: b.simple ?? [] };
      await saveManifest(m); await ws().refreshList();
      await openProject(name);
    } catch (e) { void notify(`${tr('Could not open')}: ${(e as Error).message}`); }
  };
  i.click();
}

/** hand a part of the open project to another project (copy, or move = copy then clear it here) */
export async function sendPart(part: Part, target: string, move: boolean, canvasFile?: string): Promise<void> {
  const m = ws().manifest; if (!m || target === m.name) return;
  if (!(await saveAll())) return;
  useWorkspace.setState({ busy: true });
  try {
    const t = await loadManifest(target);
    if (part === 'director') {
      if (!m.director) return;
      if (t.director && !(await askConfirm(`${target}: ${tr('already has a Director project. Add this one next to it (the old one stays as a file)?')}`))) return;
      const b = await collect(['director']); const r = await install(b, `${m.director}`);
      t.director = r.director; t.canvases = [...new Set([...t.canvases, ...r.canvases])]; t.canvas ??= r.canvases[0] ?? null;
    } else if (part === 'canvas') {
      const files = canvasFile ? [canvasFile] : canvasesOf(m);
      const b: Bundle = { kind: 'canvers-project-bundle', schema: 1, name: m.name, mode: 'canvas', director: null, canvases: {}, simple: [] };
      for (const c of files) b.canvases[c] = await loadCanvas(c);
      const r = await install(b, '');
      t.canvases = [...new Set([...t.canvases, ...r.canvases])]; t.canvas ??= r.canvases[0] ?? null;
    } else {
      t.simple = [...useGraph.getState().composerRuns, ...(t.simple ?? [])].slice(0, 150);
    }
    await saveManifest(t);
    if (move) await clearPart(part, canvasFile, true);
    await ws().refreshList();
    void notify(`${tr('Sent to')}: ${target}`);
  } catch (e) { void notify(`${tr('Could not send')}: ${(e as Error).message}`); } finally { useWorkspace.setState({ busy: false }); }
}

/** empty a part of the open project (its files are deleted; a Director project can still be found in director/.backup) */
export async function clearPart(part: Part, canvasFile?: string, silent = false): Promise<void> {
  const m = ws().manifest; if (!m) return;
  const g = useGraph.getState(); const d = useDirector.getState();
  if (!silent) {
    const what = part === 'director' ? tr('the Director project and its canvases') : part === 'canvas' ? (canvasFile ?? tr('all canvases')) : tr('the Simple feed');
    if (!(await askConfirm(`${tr('Remove from this project')}: ${what}\n${tr('This cannot be undone.')}`))) return;
  }
  applying = true;
  try {
    if (part === 'director') {
      const links = (d.project?.canvas_links ?? []).map((l) => l.canvas_file);
      const file = m.director;
      d.close();
      if (file) await deleteDirectorProject(file).catch(() => undefined);
      for (const c of links) { await deleteCanvas(c).catch(() => undefined); if (g.canvasFile === c) g.newProject(); }
      patch({ director: null, canvases: m.canvases.filter((c) => !links.includes(c)), canvas: m.canvas && links.includes(m.canvas) ? null : m.canvas });
    } else if (part === 'canvas') {
      const files = canvasFile ? [canvasFile] : m.canvases;
      for (const c of files) { await deleteCanvas(c).catch(() => undefined); if (g.canvasFile === c) g.newProject(); }
      patch({ canvases: m.canvases.filter((c) => !files.includes(c)), canvas: m.canvas && files.includes(m.canvas) ? null : m.canvas });
    } else { g.setComposerRuns([]); patch({ simple: [] }); }
  } finally { applying = false; }
  const mm = ws().manifest; if (mm) await saveManifest(mm).catch(() => undefined);
  void ws().refreshList();
}

export async function deleteProject(name: string): Promise<void> {
  if (!(await askConfirm(`${name}\n${tr('Delete this project with everything in it (Director project, canvases, Simple feed)?')}\n${tr('This cannot be undone.')}`))) return;
  try {
    const m = await loadManifest(name);
    const cur = ws().manifest?.name === name;
    applying = true;
    try {
      const dp = m.director ? await openDirectorProject(m.director).then((r) => r.project).catch(() => null) : null;
      const files = new Set<string>([...m.canvases, ...(dp?.canvas_links ?? []).map((l) => l.canvas_file)]);
      if (cur) { useDirector.getState().close(); useGraph.getState().newProject(); useGraph.getState().setComposerRuns([]); }
      if (m.director) await deleteDirectorProject(m.director).catch(() => undefined);
      for (const c of files) await deleteCanvas(c).catch(() => undefined);
      await deleteManifest(name);
      if (cur) useWorkspace.setState({ manifest: null });
      // the tabs of the deleted project go with it (the open one stays as an empty tab)
      const { tabs, activeId } = ws();
      for (const t of tabs) if (t.name === name && t.id !== activeId) snaps.delete(t.id);
      useWorkspace.setState({ tabs: tabs.filter((t) => t.name !== name || t.id === activeId) });
      nameActiveTab();
    } finally { applying = false; }
    await ws().refreshList();
  } catch (e) { void notify((e as Error).message); }
}
