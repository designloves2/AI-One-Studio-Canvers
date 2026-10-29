import { create } from 'zustand';
import type { Asset, GraphEdge, GraphNode, NodeRuntime, Primitive, Project } from '../types';
import { byId, compatible, defaultParams, engineFor } from '../registry';
import { uid } from '../backend/comfy';
import { useSettings } from './settings';
import { saveTurboPick } from '../backend/turboMemory';

export type AppMode = 'director' | 'canvas' | 'simple';
export type PanelId = null | 'canvases' | 'nodes' | 'decks' | 'assets' | 'library' | 'live' | 'settings' | 'models';

export interface ComposerRun {
  id: string;
  defId: string;
  engineId: string;
  engineLabel: string;
  prompt: string;
  params: Record<string, Primitive>;
  refs: Asset[];
  status: 'running' | 'done' | 'error';
  pct: number;
  results: Asset[];
  active: number;
  error?: string;
  createdAt: string;
}

interface Snapshot { nodes: GraphNode[]; edges: GraphEdge[] }

interface State {
  projectId: string;
  projectName: string;
  /** name of the saved canvas (file in the canvases list) this canvas belongs to; null = never saved */
  canvasFile: string | null;
  /** edited since it was last saved / opened */
  dirty: boolean;
  markSaved(file: string): void;
  nodes: GraphNode[];
  edges: GraphEdge[];
  runtime: Record<string, NodeRuntime>;
  selected: string[];
  past: Snapshot[];
  future: Snapshot[];
  mode: AppMode;
  panel: PanelId;
  viewer: { nodeId: string } | null;
  painter: string | null;
  /** Moss Boxes card whose box editor is open */
  boxEditor: string | null;
  openBoxEditor(nodeId: string | null): void;
  melody: string | null;
  assetPicker: string | null;
  facePicker: string | null;
  fitTick: number;
  /** bring a card to the middle of the screen and select it (the canvas reacts to focusTick) */
  focusId: string | null; focusTick: number;
  focusNode(id: string): void;
  composerRuns: ComposerRun[];

  setMode(m: AppMode): void;
  setPanel(p: PanelId): void;
  setName(n: string): void;
  snapshot(): void;
  undo(): void;
  redo(): void;
  addNode(defId: string, x: number, y: number, init?: Partial<GraphNode>): string;
  removeNodes(ids: string[]): void;
  duplicateNodes(ids: string[]): void;
  moveNode(id: string, x: number, y: number): void;
  moveMany(deltas: { id: string; x: number; y: number }[]): void;
  setSize(id: string, w: number, h: number): void;
  setParam(id: string, key: string, v: Primitive): void;
  setEngine(id: string, engineId: string): void;
  setTitle(id: string, title: string): void;
  setColor(ids: string[], color: string | undefined): void;
  /** background and text colour together (custom colour popup) */
  setCardColors(ids: string[], color: string | undefined, textColor: string | undefined): void;
  setLocked(ids: string[], locked: boolean): void;
  setResults(id: string, assets: Asset[], mode?: 'append' | 'replace'): void;
  clearResults(id: string): void;
  setActive(id: string, idx: number): void;
  setPick(id: string, ids: string[]): void;
  connect(e: Omit<GraphEdge, 'id'>): boolean;
  removeEdges(ids: string[]): void;
  /** swap an edge with its neighbour feeding the same input port (changes the @imageN order) */
  moveEdge(id: string, delta: -1 | 1): void;
  setRuntime(id: string, rt: Partial<NodeRuntime>): void;
  select(ids: string[]): void;
  group(ids: string[]): void;
  /** re-size a group frame around its members (uses the measured card sizes) */
  fitGroup(id: string): void;
  /** after a card was dropped: leave the group whose frame it left, join the one it was dropped into */
  reassignMembership(ids: string[]): void;
  ungroup(id: string): void;
  openViewer(nodeId: string | null): void;
  openPainter(nodeId: string | null): void;
  openMelody(nodeId: string | null): void;
  openAssetPicker(nodeId: string | null): void;
  openFacePicker(nodeId: string | null): void;
  toProject(): Project;
  loadProject(p: Project, file?: string | null, dirty?: boolean): void;
  newProject(): void;
  requestFit(): void;
  addComposerRun(r: ComposerRun): void;
  patchComposerRun(id: string, patch: Partial<ComposerRun>): void;
  removeComposerRun(id: string): void;
}

const MODE_KEY = 'canvers.mode';
/** size of a card on screen (CSS px) when it is drawn, else its stored / estimated size */
function measure(n: GraphNode): { w: number; h: number } {
  const el = typeof document !== 'undefined' ? (document.querySelector(`.react-flow__node[data-id="${n.id}"]`) as HTMLElement | null) : null;
  return { w: n.w ?? (el?.offsetWidth || 300), h: n.h ?? (el?.offsetHeight || 260) };
}

const RUNS_KEY = 'canvers.runs.v1';

const readMode = (): AppMode => { try { const m = localStorage.getItem(MODE_KEY); return m === 'simple' || m === 'director' ? m : 'canvas'; } catch { return 'canvas'; } };
const readRuns = (): ComposerRun[] => { try { return JSON.parse(localStorage.getItem(RUNS_KEY) ?? '[]'); } catch { return []; } };
const writeRuns = (r: ComposerRun[]) => { try { localStorage.setItem(RUNS_KEY, JSON.stringify(r.slice(0, 150).map((x) => (x.status === 'running' ? { ...x, status: 'error', error: 'interrupted' } : x)))); } catch { /* full */ } };

/** set by the host so ONE STUDIO nodes save their own panel state into the project */
let hostSerializer: ((n: GraphNode) => GraphNode) | null = null;
export const setHostSerializer = (f: (n: GraphNode) => GraphNode) => { hostSerializer = f; };

export const useGraph = create<State>((set, get) => ({
  projectId: uid('p'),
  projectName: 'untitled',
  canvasFile: null,
  dirty: false,
  nodes: [], edges: [], runtime: {}, selected: [], past: [], future: [],
  mode: readMode(), panel: null, viewer: null, painter: null, boxEditor: null, melody: null, assetPicker: null, facePicker: null, fitTick: 0, focusId: null, focusTick: 0,
  composerRuns: readRuns(),

  setMode: (mode) => { try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ } set({ mode, ...(mode !== 'canvas' && (get().panel === 'decks' || get().panel === 'nodes') ? { panel: null } : {}) }); },
  setPanel: (panel) => set({ panel }),
  setName: (projectName) => set({ projectName }),

  snapshot: () => { const { nodes, edges, past } = get(); set({ past: [...past.slice(-59), { nodes, edges }], future: [] }); },
  undo: () => {
    const { past, future, nodes, edges } = get(); const prev = past[past.length - 1]; if (!prev) return;
    set({ ...prev, past: past.slice(0, -1), future: [{ nodes, edges }, ...future] });
  },
  redo: () => {
    const { past, future, nodes, edges } = get(); const next = future[0]; if (!next) return;
    set({ ...next, past: [...past, { nodes, edges }], future: future.slice(1) });
  },

  addNode: (defId, x, y, init) => {
    const def = byId.get(defId); if (!def) throw new Error(`unknown node ${defId}`);
    get().snapshot();
    const engine = engineFor(def);
    const node: GraphNode = {
      id: uid('n'), defId, x, y, results: [], activeResult: 0,
      engineId: engine?.id, params: { ...defaultParams(def, engine?.id), ...(defId === 'h3-turbo' ? rememberedTurbo() : {}), ...(REMEMBER_ADVANCED.has(defId) ? useSettings.getState().lastParams[defId] : {}) },
      ...(defId === 'note' ? { w: 240, h: 160 } : {}), ...init,
    };
    set({ nodes: [...get().nodes, node], selected: [node.id] });
    return node.id;
  },
  removeNodes: (ids) => {
    const set_ = new Set(ids); get().snapshot();
    set({
      nodes: get().nodes.filter((n) => !set_.has(n.id)).map((n) => (n.members ? { ...n, members: n.members.filter((m) => !set_.has(m)) } : n)),
      edges: get().edges.filter((e) => !set_.has(e.source) && !set_.has(e.target)),
      selected: get().selected.filter((s) => !set_.has(s)),
    });
  },
  duplicateNodes: (ids) => {
    get().snapshot();
    const map = new Map<string, string>(); const copies: GraphNode[] = [];
    for (const n of get().nodes) if (ids.includes(n.id)) {
      const id = uid('n'); map.set(n.id, id);
      copies.push({ ...n, id, x: n.x + 40, y: n.y + 40, params: { ...n.params }, results: [], activeResult: 0, locked: false, members: undefined });
    }
    const edges = get().edges.filter((e) => map.has(e.source) && map.has(e.target)).map((e) => ({ ...e, id: uid('e'), source: map.get(e.source)!, target: map.get(e.target)! }));
    set({ nodes: [...get().nodes, ...copies], edges: [...get().edges, ...edges], selected: copies.map((c) => c.id) });
  },
  moveNode: (id, x, y) => set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) }),
  moveMany: (deltas) => { const m = new Map(deltas.map((d) => [d.id, d])); set({ nodes: get().nodes.map((n) => (m.has(n.id) ? { ...n, x: m.get(n.id)!.x, y: m.get(n.id)!.y } : n)) }); },
  setSize: (id, w, h) => set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, w, h } : n)) }),
  setParam: (id, key, v) => {
    const defId = get().nodes.find((n) => n.id === id)?.defId;
    if (defId && REMEMBER_ADVANCED.has(defId) && byId.get(defId)?.params.find((p) => p.id === key)?.advanced) useSettings.getState().rememberParam(defId, key, v);
    set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, params: { ...n.params, [key]: v } } : n)) });
    // a 7+1 Turbo LoRA picked once stays the choice until it is changed again
    if (get().nodes.find((n) => n.id === id)?.defId === 'h3-turbo' && typeof v === 'string' && v !== 'none' && v !== '') {
      if (key === 'turbo_lora') { useSettings.getState().setH3Turbo({ fl: v }); saveTurboPick('fl', v); }
      else if (key === 'turbo_lora_ref') { useSettings.getState().setH3Turbo({ ref: v }); saveTurboPick('ref', v); }
      const filled = fillTurbo(get().nodes); if (filled !== get().nodes) set({ nodes: filled });
    }
  },
  setEngine: (id, engineId) => {
    get().snapshot();
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== id) return n;
        const def = byId.get(n.defId)!; const fresh = defaultParams(def, engineId);
        // keep values the new engine also has (prompt-ish settings carry over)
        const params = { ...fresh }; for (const k of Object.keys(fresh)) if (k in n.params && typeof n.params[k] === typeof fresh[k]) params[k] = n.params[k];
        return { ...n, engineId, params };
      }),
    });
  },
  setColor: (ids, color) => { get().snapshot(); set({ nodes: get().nodes.map((n) => (ids.includes(n.id) ? { ...n, color, ...(color === undefined ? { textColor: undefined } : {}) } : n)) }); },
  setCardColors: (ids, color, textColor) => { get().snapshot(); set({ nodes: get().nodes.map((n) => (ids.includes(n.id) ? { ...n, color, textColor } : n)) }); },
  setTitle: (id, title) => set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, title } : n)) }),
  setLocked: (ids, locked) => set({ nodes: get().nodes.map((n) => (ids.includes(n.id) ? { ...n, locked } : n)) }),
  setResults: (id, assets, mode = 'replace') =>
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== id) return n;
        const results = mode === 'append' ? [...n.results, ...assets] : assets;
        return { ...n, results, activeResult: mode === 'append' ? n.results.length : 0, ...(mode === 'append' ? {} : { pick: undefined }) };
      }),
    }),
  clearResults: (id) => set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, results: [], activeResult: 0, pick: undefined } : n)) }),
  setPick: (id, ids) => set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, pick: ids.length ? ids : undefined } : n)) }),
  setActive: (id, idx) => set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, activeResult: Math.max(0, Math.min(idx, Math.max(0, n.results.length - 1))) } : n)) }),

  connect: (e) => {
    const { nodes, edges } = get();
    const s = nodes.find((n) => n.id === e.source), t = nodes.find((n) => n.id === e.target);
    if (!s || !t || s.id === t.id) return false;
    const sp = byId.get(s.defId)?.outputs.find((o) => o.id === e.sourceHandle);
    const tp = byId.get(t.defId)?.inputs.find((i) => i.id === e.targetHandle);
    if (!sp || !tp || !compatible(sp.type, tp.type)) return false;
    // a single-input port holds one wire: replace it
    const keep = tp.multi ? edges : edges.filter((x) => !(x.target === e.target && x.targetHandle === e.targetHandle));
    if (keep.some((x) => x.source === e.source && x.sourceHandle === e.sourceHandle && x.target === e.target && x.targetHandle === e.targetHandle)) return false;
    get().snapshot();
    set({ edges: [...keep, { ...e, id: uid('e') }] });
    return true;
  },
  moveEdge: (id, delta) => {
    const es = get().edges; const e = es.find((x) => x.id === id); if (!e) return;
    const group = es.filter((x) => x.target === e.target && x.targetHandle === e.targetHandle);
    const k = group.findIndex((x) => x.id === id), other = group[k + delta]; if (!other) return;
    get().snapshot();
    set({ edges: es.map((x) => (x.id === id ? other : x.id === other.id ? e : x)) });
  },
  removeEdges: (ids) => { get().snapshot(); set({ edges: get().edges.filter((e) => !ids.includes(e.id)) }); },
  setRuntime: (id, rt) => set({ runtime: { ...get().runtime, [id]: { ...({ status: 'idle', pct: 0 } as NodeRuntime), ...get().runtime[id], ...rt } } }),
  select: (selected) => set({ selected }),

  group: (ids) => {
    const members = get().nodes.filter((n) => ids.includes(n.id) && !n.members);
    if (members.length < 1) return;
    get().snapshot();
    const g: GraphNode = { id: uid('g'), defId: 'group', x: 0, y: 0, w: 240, h: 160, params: {}, results: [], activeResult: 0, title: 'Group', members: members.map((m) => m.id) };
    // a card can belong to one group only: take the members out of any other group
    const taken = new Set(g.members);
    // the group frame goes first in the list so it is always drawn under every card
    set({ nodes: [g, ...get().nodes.map((n) => (n.members ? { ...n, members: n.members.filter((m) => !taken.has(m)) } : n))], selected: [g.id] });
    get().fitGroup(g.id);
    // the cards may not be measured yet (just added): fit again after they were drawn
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => requestAnimationFrame(() => get().fitGroup(g.id)));
  },
  fitGroup: (id) => {
    const grp = get().nodes.find((n) => n.id === id && n.members); if (!grp) return;
    const mem = get().nodes.filter((n) => grp.members!.includes(n.id));
    if (!mem.length) return;
    const pad = 40, top = 64;
    const rects = mem.map((m) => { const s = measure(m); return { x: m.x, y: m.y, w: s.w, h: s.h }; });
    const x = Math.min(...rects.map((r) => r.x)) - pad, y = Math.min(...rects.map((r) => r.y)) - top;
    const x2 = Math.max(...rects.map((r) => r.x + r.w)) + pad, y2 = Math.max(...rects.map((r) => r.y + r.h)) + pad;
    set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, x, y, w: x2 - x, h: y2 - y } : n)) });
  },
  reassignMembership: (ids) => {
    const st = get(); const groups = st.nodes.filter((n) => n.members);
    if (!groups.length) return;
    let changed = false; let nodes = st.nodes;
    for (const id of ids) {
      const c = nodes.find((n) => n.id === id); if (!c || c.members) continue;
      const s = measure(c), cx = c.x + s.w / 2, cy = c.y + s.h / 2;
      const inside = groups.find((gr) => { const cur = nodes.find((n) => n.id === gr.id)!; return cx >= cur.x && cx <= cur.x + (cur.w ?? 0) && cy >= cur.y && cy <= cur.y + (cur.h ?? 0); });
      const was = nodes.find((n) => n.members?.includes(id));
      if (was?.id === inside?.id) continue;
      nodes = nodes.map((n) => (n.id === was?.id ? { ...n, members: n.members!.filter((m) => m !== id) } : n.id === inside?.id ? { ...n, members: [...n.members!, id] } : n));
      changed = true;
    }
    if (changed) set({ nodes });
  },
  ungroup: (id) => { get().snapshot(); set({ nodes: get().nodes.filter((n) => n.id !== id), selected: [] }); },

  openViewer: (nodeId) => set({ viewer: nodeId ? { nodeId } : null }),
  openPainter: (nodeId) => set({ painter: nodeId }),
  openBoxEditor: (nodeId) => set({ boxEditor: nodeId }),
  openMelody: (nodeId) => set({ melody: nodeId }),
  openAssetPicker: (nodeId) => set({ assetPicker: nodeId }),
  openFacePicker: (nodeId) => set({ facePicker: nodeId }),

  toProject: () => ({ app: 'ai-one-studio-canvers', version: 1, id: get().projectId, name: get().projectName, nodes: hostSerializer ? get().nodes.map(hostSerializer) : get().nodes, edges: get().edges, updatedAt: new Date().toISOString() }),
  markSaved: (file) => set({ canvasFile: file, dirty: false }),
  loadProject: (p, file = null, dirty = false) => quietly(() => set({ canvasFile: file, dirty, projectId: p.id ?? uid('p'), projectName: p.name || 'untitled', nodes: fillTurbo(p.nodes ?? []), edges: p.edges ?? [], runtime: {}, selected: [], past: [], future: [], fitTick: get().fitTick + 1 })),
  newProject: () => quietly(() => set({ canvasFile: null, dirty: false, projectId: uid('p'), projectName: 'untitled', nodes: [], edges: [], runtime: {}, selected: [], past: [], future: [] })),
  requestFit: () => set({ fitTick: get().fitTick + 1 }),
  focusNode: (id) => set({ selected: [id], focusId: id, focusTick: get().focusTick + 1 }),

  addComposerRun: (r) => { const runs = [r, ...get().composerRuns]; writeRuns(runs); set({ composerRuns: runs }); },
  patchComposerRun: (id, patch) => { const runs = get().composerRuns.map((r) => (r.id === id ? { ...r, ...patch } : r)); writeRuns(runs); set({ composerRuns: runs }); },
  removeComposerRun: (id) => { const runs = get().composerRuns.filter((r) => r.id !== id); writeRuns(runs); set({ composerRuns: runs }); },
}));

/** Turbo cards whose LoRA is still empty show (and use) the remembered one; the array is returned untouched when nothing needs filling. */
function fillTurbo(nodes: GraphNode[]): GraphNode[] {
  const t = useSettings.getState().h3Turbo; let changed = false;
  const out = nodes.map((n) => {
    if (n.defId !== 'h3-turbo') return n;
    const patch: Record<string, string> = {};
    if ((!n.params.turbo_lora || n.params.turbo_lora === 'none') && t.fl) patch.turbo_lora = t.fl;
    if ((!n.params.turbo_lora_ref || n.params.turbo_lora_ref === 'none') && t.ref) patch.turbo_lora_ref = t.ref;
    if (!Object.keys(patch).length) return n;
    changed = true; return { ...n, params: { ...n.params, ...patch } };
  });
  return changed ? out : nodes;
}

/** cards whose advanced settings keep the value the user changed last (new cards start with it) */
const REMEMBER_ADVANCED = new Set(['video-preview']);

function rememberedTurbo(): Record<string, string> {
  const t = useSettings.getState().h3Turbo; const out: Record<string, string> = {};
  if (t.fl) out.turbo_lora = t.fl; if (t.ref) out.turbo_lora_ref = t.ref;
  return out;
}

// whichever way a Turbo card appears (menu, deck, Live Canvas, load), an empty LoRA is filled with the last pick
useGraph.subscribe((s) => { const f = fillTurbo(s.nodes); if (f !== s.nodes) useGraph.setState({ nodes: f }); });

// loading / clearing a canvas replaces nodes and edges - that must not count as an edit
let quiet = false;
function quietly(fn: () => void) { quiet = true; try { fn(); } finally { quiet = false; } }

// autosave the canvas so a refresh never loses work
const AUTO_KEY = 'canvers.autosave.v1';
let timer: ReturnType<typeof setTimeout> | undefined;
export function startAutosave() {
  useGraph.subscribe((s, prev) => {
    const edited = s.nodes !== prev.nodes || s.edges !== prev.edges || s.projectName !== prev.projectName;
    if (!edited && s.canvasFile === prev.canvasFile && s.dirty === prev.dirty) return;
    if (edited && !quiet && !s.dirty) { useGraph.setState({ dirty: true }); return; } // the follow-up update below saves the autosave
    clearTimeout(timer);
    timer = setTimeout(() => { try { const g = useGraph.getState(); localStorage.setItem(AUTO_KEY, JSON.stringify({ ...g.toProject(), savedAs: g.canvasFile, dirty: g.dirty })); } catch { /* quota */ } }, 600);
  });
}
/** The last autosave has cards that were never saved to the list (or were changed after the last save). */
export function hasUnsavedAutosave(): boolean {
  try {
    const p = JSON.parse(localStorage.getItem(AUTO_KEY) ?? 'null') as (Project & { savedAs?: string | null; dirty?: boolean }) | null;
    if (!p || p.app !== 'ai-one-studio-canvers' || !(p.nodes?.length)) return false;
    return p.dirty ?? !p.savedAs;
  } catch { return false; }
}
export function restoreAutosave(): boolean {
  try {
    const raw = localStorage.getItem(AUTO_KEY); if (!raw) return false;
    const p = JSON.parse(raw) as Project; if (p?.app !== 'ai-one-studio-canvers') return false;
    const x = p as Project & { savedAs?: string | null; dirty?: boolean };
    useGraph.getState().loadProject(p, x.savedAs ?? null, x.dirty ?? false); return true;
  } catch { return false; }
}
