import type { Asset, GraphEdge, GraphNode, Project } from '../types';
import { notify } from '../ui/dialog';
import { useGraph, type ComposerRun } from '../store/graph';
import { executeGraph, importFile } from './run';
import { byId, defaultParams, engineFor } from '../registry';
import { interrupt, uid } from '../backend/comfy';

const controllers = new Map<string, AbortController>();

export async function runNode(id: string): Promise<void> {
  const s = useGraph.getState();
  if (controllers.has(id)) return;
  const ac = new AbortController(); controllers.set(id, ac);
  s.setRuntime(id, { status: 'running', pct: 0, error: undefined, label: undefined });
  try {
    await executeGraph({ nodes: s.nodes, edges: s.edges }, id, {
      start: (nid) => useGraph.getState().setRuntime(nid, { status: 'running', pct: 0, error: undefined }),
      progress: (nid, pct, label) => useGraph.getState().setRuntime(nid, { status: 'running', pct, label }),
      done: (nid, assets, mode) => { const g = useGraph.getState(); g.setResults(nid, assets, mode); g.setRuntime(nid, { status: 'idle', pct: 100, label: undefined }); },
      error: (nid, message) => useGraph.getState().setRuntime(nid, { status: 'error', error: message === 'cancelled' ? 'cancelled' : message }),
    }, ac.signal);
    useGraph.getState().setRuntime(id, { status: 'idle', pct: 100 });
  } catch { /* reported through hooks.error */ } finally {
    controllers.delete(id);
  }
}

export function stopNode(id: string): void {
  controllers.get(id)?.abort();
  void interrupt();
}

export function stopAll(): void {
  for (const ac of controllers.values()) ac.abort();
  void interrupt();
}

/** Run every output node (Export / Preview / Compare / generators that nothing consumes). */
export async function runAll(): Promise<void> {
  const { nodes, edges } = useGraph.getState();
  const fed = new Set(edges.map((e) => e.source));
  const leaves = nodes.filter((n) => byId.get(n.defId) && !fed.has(n.id) && byId.get(n.defId)!.kind !== 'note' && byId.get(n.defId)!.kind !== 'source');
  for (const n of leaves) await runNode(n.id);
}

// ------------------------------------------------------------------ files
export function download(url: string, name: string) {
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

export function saveProjectFile() {
  const p = useGraph.getState().toProject();
  const blob = new Blob([JSON.stringify(p, null, 1)], { type: 'application/json' });
  const u = URL.createObjectURL(blob);
  download(u, `${(p.name || 'canvas').replace(/[^\w\-]+/g, '_')}.canvers.json`);
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}

export function openProjectFile() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = async () => {
    const f = i.files?.[0]; if (!f) return;
    try {
      const p = JSON.parse(await f.text()) as Project;
      if (!Array.isArray(p.nodes) || !Array.isArray(p.edges)) throw new Error('not a canvas file');
      useGraph.getState().loadProject(p);
    } catch (e) { void notify(`Cannot open: ${(e as Error).message}`); }
  };
  i.click();
}

/** drop / paste / pick files → Import nodes */
export async function addImports(files: File[], at: { x: number; y: number }) {
  let k = 0;
  for (const f of files) {
    const isAudio = f.type.startsWith('audio/') || /\.(flac|mp3|wav|ogg|opus|m4a)$/i.test(f.name);
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/') && !isAudio) continue;
    const id = useGraph.getState().addNode(f.type.startsWith('video/') ? 'import-video' : isAudio ? 'import-audio' : 'import', at.x + k * 40, at.y + k * 40);
    k++;
    try { useGraph.getState().setResults(id, [await importFile(f)]); }
    catch (e) { useGraph.getState().setRuntime(id, { status: 'error', error: (e as Error).message }); }
  }
}

// ------------------------------------------------------------------ Simple mode
export interface ComposerInput {
  defId: string; engineId: string; prompt: string; params: Record<string, string | number | boolean>; refs: Asset[];
  /** option cards (e.g. H3 Turbo) wired into the throw-away graph */
  cards?: { def: string; params: Record<string, string | number | boolean> }[];
}

/** Simple mode runs a throw-away graph (prompt → generator) without touching the canvas. */
export async function runComposer(input: ComposerInput): Promise<void> {
  const def = byId.get(input.defId); if (!def) throw new Error('unknown node');
  const eng = engineFor(def, input.engineId);
  const id = uid('run');
  const run: ComposerRun = {
    id, defId: input.defId, engineId: input.engineId, engineLabel: eng?.label ?? input.engineId, prompt: input.prompt,
    params: input.params, refs: input.refs, status: 'running', pct: 0, results: [], active: 0, createdAt: new Date().toISOString(),
  };
  const g = useGraph.getState(); g.addComposerRun(run);

  const target: GraphNode = { id: 'target', defId: input.defId, x: 0, y: 0, params: input.params, engineId: input.engineId, results: [] as Asset[], activeResult: 0 };
  const nodes: GraphNode[] = [target, { id: 'prompt', defId: 'prompt', x: 0, y: 0, params: { text: input.prompt }, results: [], activeResult: 0 }];
  const edges: GraphEdge[] = [{ id: 'e0', source: 'prompt', sourceHandle: 'text', target: 'target', targetHandle: def.inputs.find((i) => i.type === 'text')?.id ?? 'prompt' }];
  const imgPort = def.inputs.find((i) => i.type === 'image')?.id;
  input.refs.forEach((a, i) => {
    if (!imgPort) return;
    nodes.push({ id: `ref${i}`, defId: 'import', x: 0, y: 0, params: {}, results: [a], activeResult: 0 });
    edges.push({ id: `er${i}`, source: `ref${i}`, sourceHandle: 'image', target: 'target', targetHandle: imgPort });
  });
  (input.cards ?? []).forEach((cd, i) => {
    const cdef = byId.get(cd.def); const port = def.inputs.find((p) => p.type === 'pipe')?.id; if (!cdef || !port) return;
    nodes.push({ id: `card${i}`, defId: cd.def, x: 0, y: 0, params: { ...defaultParams(cdef), ...cd.params }, results: [], activeResult: 0 });
    edges.push({ id: `ec${i}`, source: `card${i}`, sourceHandle: cdef.outputs[0].id, target: 'target', targetHandle: port });
  });
  try {
    await executeGraph({ nodes, edges }, 'target', {
      progress: (nid, pct) => { if (nid === 'target') useGraph.getState().patchComposerRun(id, { pct }); },
      done: (nid, assets) => { if (nid === 'target') useGraph.getState().patchComposerRun(id, { results: assets, status: 'done', pct: 100 }); },
    });
  } catch (e) {
    useGraph.getState().patchComposerRun(id, { status: 'error', error: (e as Error).message });
  }
}
