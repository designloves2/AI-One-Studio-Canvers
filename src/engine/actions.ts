import type { Asset, GraphEdge, GraphNode, Project } from '../types';
import { askConfirm, askText, notify } from '../ui/dialog';
import { t as tr } from '../i18n';
import { canvasFileName, listCanvases, loadCanvas, saveCanvas } from '../backend/canvases';
import { useGraph, type ComposerRun } from '../store/graph';
import { executeGraph, importFile } from './run';
import { byId, defaultParams, engineFor } from '../registry';
import { cancelPrompt, interrupt, readInflight, recoverPrompt, runContext, forgetInflight, assetFromFile, uid, viewUrl } from '../backend/comfy';

const controllers = new Map<string, AbortController>();

export async function runNode(id: string): Promise<void> {
  const s = useGraph.getState();
  if (controllers.has(id)) return;
  const ac = new AbortController(); controllers.set(id, ac);
  s.setRuntime(id, { status: 'running', pct: 0, error: undefined, label: undefined, preview: undefined });
  try {
    await executeGraph({ nodes: s.nodes, edges: s.edges }, id, {
      start: (nid) => { runContext.set(ac.signal, { node: nid }); useGraph.getState().setRuntime(nid, { status: 'running', pct: 0, error: undefined }); },
      progress: (nid, pct, label) => useGraph.getState().setRuntime(nid, { status: 'running', pct, label }),
      preview: (nid, u) => { const g = useGraph.getState(); for (const e of g.edges) if (e.source === nid && e.sourceHandle === 'preview') g.setRuntime(e.target, { preview: u }); },
      done: (nid, assets, mode) => { const g = useGraph.getState(); g.setResults(nid, assets, mode); g.setRuntime(nid, { status: 'idle', pct: 100, label: undefined, preview: undefined }); },
      error: (nid, message) => useGraph.getState().setRuntime(nid, { status: 'error', error: message === 'cancelled' ? 'cancelled' : message }),
    }, ac.signal);
    useGraph.getState().setRuntime(id, { status: 'idle', pct: 100 });
  } catch { /* reported through hooks.error */ } finally {
    controllers.delete(id);
  }
}

/** Stop only this card's job: the aborted run cancels its own prompt (running -> interrupt, waiting -> removed from the queue). */
export function stopNode(id: string): void {
  const ac = controllers.get(id);
  if (ac) { ac.abort(); return; }
  // a job resumed after a refresh has no controller here: cancel it by its queue id
  const j = readInflight()[id];
  if (j) { void cancelPrompt(j.promptId); forgetInflight(j.promptId); useGraph.getState().setRuntime(id, { status: 'idle', pct: 0, error: 'cancelled' }); }
}

/** After a refresh: attach the results of jobs that finished while the page was away, and keep following the ones still running. */
export async function resumeInflight(): Promise<void> {
  for (const [nodeId, j] of Object.entries(readInflight())) {
    const g = useGraph.getState();
    const node = g.nodes.find((n) => n.id === nodeId);
    const def = node ? byId.get(node.defId) : undefined;
    if (!node || !def) { forgetInflight(j.promptId); continue; }
    g.setRuntime(nodeId, { status: 'running', pct: 0, label: 'resuming…' });
    void (async () => {
      for (;;) {
        const r = await recoverPrompt(j.promptId);
        if (r === 'pending') { await new Promise((res) => setTimeout(res, 3000)); if (!readInflight()[nodeId]) return; continue; }
        forgetInflight(j.promptId);
        const st = useGraph.getState();
        if (r === null || r === 'failed') { st.setRuntime(nodeId, { status: r === 'failed' ? 'error' : 'idle', pct: 0, error: r === 'failed' ? 'failed while the page was closed' : undefined, label: undefined }); return; }
        const kind = def.outputs[0]?.type;
        let files = kind === 'video' ? r.videos : kind === 'audio' ? r.audios : kind === 'text' ? [] : r.images;
        if (kind === 'video' && files.some((f) => /-audio\.\w+$/i.test(f.filename))) files = files.filter((f) => /-audio\.\w+$/i.test(f.filename));
        const assets = kind === 'text' ? r.texts.map((x) => ({ id: uid('a'), type: 'text' as const, url: '', text: x })) : files.map((f) => assetFromFile(f, (kind === 'video' || kind === 'audio' ? kind : 'image')));
        if (assets.length) st.setResults(nodeId, assets, 'replace');
        st.setRuntime(nodeId, { status: 'idle', pct: 100, label: undefined });
        return;
      }
    })();
  }
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
/** An image / video from the gallery becomes a Load Image / Load Video card (at a drop position, or near the middle). */
export function addGalleryCard(f: { filename: string; subfolder: string; type?: 'output' | 'input' | 'temp' }, at?: { x: number; y: number }): string {
  const g = useGraph.getState();
  const file = { filename: f.filename, subfolder: f.subfolder, type: f.type ?? ('output' as const) };
  const vid = /\.(mp4|webm|mov|mkv|gif)$/i.test(file.filename);
  const id = g.addNode(vid ? 'import-video' : 'import', at?.x ?? 120 + Math.random() * 160, at?.y ?? 120 + Math.random() * 160);
  g.setResults(id, [{ id: uid(), type: vid ? 'video' : 'image', url: viewUrl(file), file }]);
  if (g.mode === 'simple') g.setMode('canvas');
  return id;
}

export function download(url: string, name: string) {
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

/** Export the open canvas as a .canvers.json file (download). */
export function exportProjectFile() {
  const p = useGraph.getState().toProject();
  const blob = new Blob([JSON.stringify(p, null, 1)], { type: 'application/json' });
  const u = URL.createObjectURL(blob);
  download(u, `${canvasFileName(p.name || 'canvas')}.canvers.json`);
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}

/** Import a .canvers.json file: it opens as an unsaved canvas (save it to keep it in the list). */
export function importProjectFile() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = async () => {
    const f = i.files?.[0]; if (!f) return;
    try {
      const p = JSON.parse(await f.text()) as Project;
      if (!Array.isArray(p.nodes) || !Array.isArray(p.edges)) throw new Error('not a canvas file');
      if (useGraph.getState().dirty && useGraph.getState().nodes.length && !(await askConfirm(tr('This canvas has unsaved changes. Open anyway?')))) return;
      useGraph.getState().loadProject(p, null, true);
    } catch (e) { void notify(`Cannot open: ${(e as Error).message}`); }
  };
  i.click();
}

/** Save the open canvas into the canvases list (Ctrl+S). Same name as the canvas title; asks before replacing a different canvas. */
export async function saveCanvasToList(opts: { as?: boolean } = {}): Promise<boolean> {
  const g = useGraph.getState();
  let title = g.projectName;
  if (opts.as) { const t = await askText(tr('Save as')); if (t === null) return false; title = t; }
  const file = canvasFileName(title);
  try {
    if (file !== g.canvasFile) {
      const exists = (await listCanvases()).some((c) => c.name === file);
      if (exists && !(await askConfirm(`${file} — ${tr('Replace the saved canvas with this name?')}`))) return false;
    }
    if (opts.as || title !== g.projectName) g.setName(title);
    await saveCanvas(file, useGraph.getState().toProject());
    useGraph.getState().markSaved(file);
    return true;
  } catch (e) { void notify(`${tr('Could not save')}: ${(e as Error).message}`); return false; }
}

/** Open a saved canvas; asks first when the open one has unsaved changes. */
export async function openSavedCanvas(name: string): Promise<void> {
  const g = useGraph.getState();
  if (g.dirty && g.nodes.length && !(await askConfirm(tr('This canvas has unsaved changes. Open anyway?')))) return;
  try { useGraph.getState().loadProject(await loadCanvas(name), name, false); } catch (e) { void notify(`${tr('Could not open')}: ${(e as Error).message}`); }
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
