import { create } from 'zustand';
import type { Asset, GraphEdge, GraphNode, NodeRuntime, Primitive, Project } from '../types';
import { byId, compatible, defaultParams, engineFor } from '../registry';
import { uid } from '../backend/comfy';

export type AppMode = 'canvas' | 'simple';
export type PanelId = null | 'nodes' | 'decks' | 'assets' | 'library' | 'settings' | 'models';

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
  melody: string | null;
  assetPicker: string | null;
  facePicker: string | null;
  fitTick: number;
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
  connect(e: Omit<GraphEdge, 'id'>): boolean;
  removeEdges(ids: string[]): void;
  /** swap an edge with its neighbour feeding the same input port (changes the @imageN order) */
  moveEdge(id: string, delta: -1 | 1): void;
  setRuntime(id: string, rt: Partial<NodeRuntime>): void;
  select(ids: string[]): void;
  group(ids: string[]): void;
  ungroup(id: string): void;
  openViewer(nodeId: string | null): void;
  openPainter(nodeId: string | null): void;
  openMelody(nodeId: string | null): void;
  openAssetPicker(nodeId: string | null): void;
  openFacePicker(nodeId: string | null): void;
  toProject(): Project;
  loadProject(p: Project): void;
  newProject(): void;
  requestFit(): void;
  addComposerRun(r: ComposerRun): void;
  patchComposerRun(id: string, patch: Partial<ComposerRun>): void;
  removeComposerRun(id: string): void;
}

const MODE_KEY = 'canvers.mode';
const RUNS_KEY = 'canvers.runs.v1';

const readMode = (): AppMode => { try { return localStorage.getItem(MODE_KEY) === 'simple' ? 'simple' : 'canvas'; } catch { return 'canvas'; } };
const readRuns = (): ComposerRun[] => { try { return JSON.parse(localStorage.getItem(RUNS_KEY) ?? '[]'); } catch { return []; } };
const writeRuns = (r: ComposerRun[]) => { try { localStorage.setItem(RUNS_KEY, JSON.stringify(r.slice(0, 150).map((x) => (x.status === 'running' ? { ...x, status: 'error', error: 'interrupted' } : x)))); } catch { /* full */ } };

/** set by the host so ONE STUDIO nodes save their own panel state into the project */
let hostSerializer: ((n: GraphNode) => GraphNode) | null = null;
export const setHostSerializer = (f: (n: GraphNode) => GraphNode) => { hostSerializer = f; };

export const useGraph = create<State>((set, get) => ({
  projectId: uid('p'),
  projectName: 'untitled',
  nodes: [], edges: [], runtime: {}, selected: [], past: [], future: [],
  mode: readMode(), panel: null, viewer: null, painter: null, melody: null, assetPicker: null, facePicker: null, fitTick: 0,
  composerRuns: readRuns(),

  setMode: (mode) => { try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ } set({ mode, ...(mode === 'simple' && (get().panel === 'decks' || get().panel === 'nodes') ? { panel: null } : {}) }); },
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
      engineId: engine?.id, params: defaultParams(def, engine?.id),
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
  setParam: (id, key, v) => set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, params: { ...n.params, [key]: v } } : n)) }),
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
        return { ...n, results, activeResult: mode === 'append' ? n.results.length : 0 };
      }),
    }),
  clearResults: (id) => set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, results: [], activeResult: 0 } : n)) }),
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
    const pad = 40;
    const x = Math.min(...members.map((n) => n.x)) - pad, y = Math.min(...members.map((n) => n.y)) - pad - 20;
    const x2 = Math.max(...members.map((n) => n.x + (n.w ?? 300))) + pad, y2 = Math.max(...members.map((n) => n.y + (n.h ?? 260))) + pad;
    const g: GraphNode = { id: uid('g'), defId: 'group', x, y, w: x2 - x, h: y2 - y, params: {}, results: [], activeResult: 0, title: 'Group', members: members.map((m) => m.id) };
    set({ nodes: [g, ...get().nodes], selected: [g.id] });
  },
  ungroup: (id) => { get().snapshot(); set({ nodes: get().nodes.filter((n) => n.id !== id), selected: [] }); },

  openViewer: (nodeId) => set({ viewer: nodeId ? { nodeId } : null }),
  openPainter: (nodeId) => set({ painter: nodeId }),
  openMelody: (nodeId) => set({ melody: nodeId }),
  openAssetPicker: (nodeId) => set({ assetPicker: nodeId }),
  openFacePicker: (nodeId) => set({ facePicker: nodeId }),

  toProject: () => ({ app: 'ai-one-studio-canvers', version: 1, id: get().projectId, name: get().projectName, nodes: hostSerializer ? get().nodes.map(hostSerializer) : get().nodes, edges: get().edges, updatedAt: new Date().toISOString() }),
  loadProject: (p) => set({ projectId: p.id ?? uid('p'), projectName: p.name || 'untitled', nodes: p.nodes ?? [], edges: p.edges ?? [], runtime: {}, selected: [], past: [], future: [], fitTick: get().fitTick + 1 }),
  newProject: () => set({ projectId: uid('p'), projectName: 'untitled', nodes: [], edges: [], runtime: {}, selected: [], past: [], future: [] }),
  requestFit: () => set({ fitTick: get().fitTick + 1 }),

  addComposerRun: (r) => { const runs = [r, ...get().composerRuns]; writeRuns(runs); set({ composerRuns: runs }); },
  patchComposerRun: (id, patch) => { const runs = get().composerRuns.map((r) => (r.id === id ? { ...r, ...patch } : r)); writeRuns(runs); set({ composerRuns: runs }); },
  removeComposerRun: (id) => { const runs = get().composerRuns.filter((r) => r.id !== id); writeRuns(runs); set({ composerRuns: runs }); },
}));

// autosave the canvas so a refresh never loses work
const AUTO_KEY = 'canvers.autosave.v1';
let timer: ReturnType<typeof setTimeout> | undefined;
export function startAutosave() {
  useGraph.subscribe((s, prev) => {
    if (s.nodes === prev.nodes && s.edges === prev.edges && s.projectName === prev.projectName) return;
    clearTimeout(timer);
    timer = setTimeout(() => { try { localStorage.setItem(AUTO_KEY, JSON.stringify(useGraph.getState().toProject())); } catch { /* quota */ } }, 600);
  });
}
export function restoreAutosave(): boolean {
  try {
    const raw = localStorage.getItem(AUTO_KEY); if (!raw) return false;
    const p = JSON.parse(raw) as Project; if (p?.app !== 'ai-one-studio-canvers') return false;
    useGraph.getState().loadProject(p); return true;
  } catch { return false; }
}
