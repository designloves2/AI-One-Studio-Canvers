// The Studio host: loads ComfyUI-TJ_NODE_STUDIO_ONE's own node panels (served by ComfyUI at /extensions) and runs them
// against the ComfyUI + STUDIO_ONE backend, so every mode/option/gallery of those nodes is available on the Canvers canvas.
import { HostGraph, HostNode, ProxyNode, type NodeData, type Widget } from './litegraph';
import { base, getJson, url } from '../backend/http';
import { clientId, onSocket, uid, viewUrl } from '../backend/comfy';
import { registerHostDefs } from '../registry';
import type { Asset, GraphNode, NodeDef, PortDef, PortType } from '../types';
import { useGraph } from '../store/graph';
import { byId } from '../registry';

type Ext = { name?: string; init?(app: any): any; setup?(app: any): any; beforeRegisterNodeDef?(t: any, d: NodeData, app: any): any; nodeCreated?(n: any): any; loadedGraphNode?(n: any): any; [k: string]: any };

// ------------------------------------------------------------------ api (scripts/api.js)
const events = new EventTarget();
const dispatch = (type: string, detail: unknown) => events.dispatchEvent(new CustomEvent(type, { detail }));

async function hostFetch(path: string, opts?: RequestInit): Promise<Response> {
  const p = path.startsWith('http') ? path : url(path.startsWith('/') ? path : '/' + path);
  if (opts?.method === 'POST' && /\/set_last_[a-z]+$/.test(path)) { try { captureLastOutput(path, JSON.parse(String(opts.body ?? '{}'))); } catch { /* ignore */ } }
  return fetch(p, opts);
}

export const hostApi = {
  clientId,
  fetchApi: hostFetch,
  apiURL: (p: string) => url(p.startsWith('/') ? p : '/' + p),
  fileURL: (p: string) => url(p.startsWith('/') ? p : '/' + p),
  addEventListener: (t: string, cb: any, o?: any) => events.addEventListener(t, cb, o),
  removeEventListener: (t: string, cb: any, o?: any) => events.removeEventListener(t, cb, o),
  dispatchEvent: (e: Event) => events.dispatchEvent(e),
  getSystemStats: () => getJson('/system_stats'),
  interrupt: () => fetch(url('/interrupt'), { method: 'POST' }),
};

let socketOn = false;
function bridgeSocket() {
  if (socketOn) return; socketOn = true;
  onSocket((m) => { if (m?.type) dispatch(m.type, m.data); });
}

/** what a node publishes after a generation: the original nodes POST it to /<family>/set_last_image */
function captureLastOutput(path: string, body: any) {
  const id = String(body?.unique_id ?? ''); if (!id) return;
  const st = useGraph.getState(); const n = st.nodes.find((x) => x.id === id); if (!n) return;
  const out: Asset[] = [];
  if (body.image?.filename) {
    const f = { filename: body.image.filename, subfolder: body.image.subfolder ?? '', type: (body.image.type ?? 'output') as 'output' };
    out.push({ id: uid(), type: 'image', url: viewUrl(f), file: f, port: n.defId.includes('H3') || n.defId.includes('LTX') ? 'last_frame' : 'image' });
  }
  const run = body.run ?? {};
  if (typeof run.prompt === 'string' && run.prompt) out.push({ id: uid(), type: 'text', url: '', text: run.prompt, port: 'prompt' });
  const settings = run.settings ?? run.summary; if (settings) out.push({ id: uid(), type: 'text', url: '', text: typeof settings === 'string' ? settings : JSON.stringify(settings), port: 'settings' });
  if (body.audio?.filename) { const f = { filename: body.audio.filename, subfolder: body.audio.subfolder ?? '', type: (body.audio.type ?? 'output') as 'output' }; out.push({ id: uid(), type: 'audio', url: viewUrl(f), file: f, port: 'audio' }); }
  if (body.video_path || body.path) out.push({ id: uid(), type: 'text', url: '', text: String(body.video_path ?? body.path), port: 'video_path' });
  if (out.length) { st.setResults(id, out, 'replace'); st.setRuntime(id, { status: 'idle', pct: 100 }); }
}

// ------------------------------------------------------------------ app (scripts/app.js)
const extensions: Ext[] = [];
const nodeClasses = new Map<string, any>();
const graph = new HostGraph();
const canvasStub = new Proxy({ ds: { scale: 1, offset: [0, 0] }, canvas: null as HTMLElement | null, selected_nodes: {}, graph_mouse: [0, 0] } as Record<string, any>, {
  get: (t, k: string) => (k in t ? t[k] : (() => undefined)),
});

export const hostApp: any = {
  registerExtension(e: Ext) { extensions.push(e); },
  graph, canvas: canvasStub, canvasEl: null as HTMLElement | null,
  queuePrompt: async () => undefined, // the ONE nodes publish their result themselves; no ComfyUI workflow is queued
  ui: { settings: { getSettingValue: () => undefined, addSetting: () => undefined } },
  extensionManager: {}, api: hostApi,
  _ltxDirectorUnloadHookInstalled: false,
};

(window as any).LiteGraph ??= { vueNodesMode: false, NODE_TITLE_HEIGHT: 30, NODE_SLOT_HEIGHT: 20, registerNodeType() { /* n/a */ } };
/** a node that is created but not added to the canvas (the ONE panels use it to embed the LTX Director editor) */
(window as any).LiteGraph.createNode = (type: string) => {
  const Cls = nodeClasses.get(type); if (!Cls) return null;
  const n = new Cls(uid('free')) as HostNode; n.graph = graph;
  try { n.onNodeCreated?.(); } catch (e) { console.error('[host] createNode', type, e); }
  for (const e of extensions) { try { e.nodeCreated?.(n); } catch (err) { console.warn('[host] nodeCreated', err); } }
  return n;
};

const toPort = (t: string): PortType => (t === 'IMAGE' ? 'image' : t === 'STRING' ? 'text' : t === 'AUDIO' ? 'audio' : t === 'TJ_PROMPT_PIPE' ? 'pipe' : t === 'INT' || t === 'FLOAT' ? 'number' : t === 'BOOLEAN' ? 'boolean' : 'any');

const TJ_HOSTED = new Set(['TJ_PromptDBLoader', 'TJ_PromptDBSave', 'TJ_PromptDBBridge', 'TJ_CustomLLM']);
let loaded: Promise<void> | null = null;
export const hostStatus = { loaded: false, error: '', extensions: 0, nodes: [] as string[] };

export function loadStudio(): Promise<void> {
  loaded ??= (async () => {
    (window as any).__studio = { app: hostApp, api: hostApi }; (window as any).app = hostApp; (window as any).api = hostApi;
    (window as any).comfyAPI = { app: { app: hostApp }, api: { api: hostApi } }; // newer extensions read the frontend modules from here
    bridgeSocket();
    const info = await getJson<Record<string, any>>('/object_info');
    const ext = await getJson<string[]>('/extensions');
    // ComfyUI loads every .js of a node pack's web folder; the ONE panels, the LTX Director editor etc. all register themselves
    const entries = ext.filter((p) => /\/extensions\/[^/]*STUDIO_ONE[^/]*\//.test(p) && !/\/vendor\//.test(p) && !/\/itda_studio\/itda_app_original\.js$/.test(p));
    if (!entries.length) throw new Error('ComfyUI-TJ_NODE_STUDIO_ONE is not installed on this ComfyUI');
    // ComfyUI-TJ_NODE's PromptDB nodes (the `pipe` feature of the ONE panels) and LLM (TJ)
    const tj = ext.filter((p) => /\/extensions\/ComfyUI-TJ_NODE\/(promptdb_tj|promptdb_save_tj|custom_llm_tj)\.js$/.test(p));
    for (const e of [...entries, ...tj]) { try { await import(/* @vite-ignore */ base() + e); } catch (err) { console.error('[host] cannot load', e, err); } }
    hostStatus.extensions = extensions.length;

    const defs: NodeDef[] = [];
    for (const [name, raw] of Object.entries<any>(info)) {
      const studio = String(raw.python_module ?? '').includes('STUDIO_ONE');
      if (!studio && !TJ_HOSTED.has(name)) continue;
      const data: NodeData = { ...raw, name };
      class Cls extends HostNode { constructor(id: string) { super(data, id); } }
      (Cls as any).nodeData = data; (Cls as any).comfyClass = name; (Cls as any).title = data.display_name;
      for (const e of extensions) { try { await e.beforeRegisterNodeDef?.(Cls, data, hostApp); } catch (err) { console.warn('[host] beforeRegisterNodeDef', e.name, err); } }
      nodeClasses.set(name, Cls);
      const probe = new Cls('probe');
      const ins: PortDef[] = probe.inputs.map((s) => ({ id: s.name, label: s.name, type: toPort(s.type), optional: true }));
      const outs: PortDef[] = probe.outputs.map((s) => ({ id: s.name, label: s.name, type: toPort(s.type) }));
      defs.push({ id: `host:${name}`, title: data.display_name ?? name, category: studio ? 'STUDIO ONE' : 'TJ NODE', kind: 'host', runnable: !studio, inputs: ins, outputs: outs, params: [], description: data.description || 'ONE STUDIO panel (runs the original STUDIO_ONE interface)' });
      hostStatus.nodes.push(name);
    }
    registerHostDefs(defs);
    for (const e of extensions) { try { await e.init?.(hostApp); await e.setup?.(hostApp); } catch (err) { console.warn('[host] setup', e.name, err); } }
    hostStatus.loaded = true;
  })().catch((e) => { hostStatus.error = (e as Error).message; loaded = null; throw e; });
  return loaded;
}

// ------------------------------------------------------------------ node instances
const instances = new Map<string, HostNode>();
export const hostClassOf = (defId: string) => defId.replace(/^host:/, '');

export function ensureHostNode(gn: GraphNode): HostNode | null {
  let inst = instances.get(gn.id); if (inst) return inst;
  const Cls = nodeClasses.get(hostClassOf(gn.defId)); if (!Cls) return null;
  inst = new Cls(gn.id) as HostNode; inst.graph = graph; instances.set(gn.id, inst); graph.set(gn.id, inst);
  inst.pos = [gn.x, gn.y];
  try { inst.onNodeCreated?.(); } catch (e) { console.error('[host] onNodeCreated', gn.defId, e); }
  for (const e of extensions) { try { e.nodeCreated?.(inst); } catch (err) { console.warn('[host] nodeCreated', err); } }
  const saved = gn.params.__host; if (typeof saved === 'string' && saved) { try { inst.configure(JSON.parse(saved)); } catch (e) { console.warn('[host] restore', e); } for (const e of extensions) { try { e.loadedGraphNode?.(inst); } catch { /* ignore */ } } }
  syncLinks();
  return inst;
}

export function removeHostNode(id: string) {
  const inst = instances.get(id); if (!inst) return;
  try { inst.onRemoved?.(); } catch { /* ignore */ }
  instances.delete(id); graph.set(id, null);
}

export function serializeHost(gn: GraphNode): GraphNode {
  const inst = instances.get(gn.id); if (!inst) return gn;
  try { return { ...gn, params: { ...gn.params, __host: JSON.stringify(inst.serialize()) } }; } catch { return gn; }
}

/** keep proxies for native nodes + link tables in step with the canvas */
export function syncLinks() {
  const st = useGraph.getState();
  for (const n of st.nodes) {
    if (n.defId.startsWith('host:')) continue;
    if (!graph.has(n.id)) graph.set(n.id, new ProxyNode(() => proxyView(n.id), n.id, graph));
  }
  for (const id of [...instances.keys()]) if (!st.nodes.some((n) => n.id === id)) removeHostNode(id);
  graph.sync(st.edges);
}

function proxyView(id: string) {
  const n = useGraph.getState().nodes.find((x) => x.id === id);
  const def = n ? byId.get(n.defId) : undefined;
  const widgets: Widget[] = n ? Object.entries(n.params).map(([name, value]) => ({ name, type: 'text', value, options: {} })) : [];
  const type = n?.defId === 'prompt' || n?.defId === 'text-data' ? 'PrimitiveStringMultiline' : n?.defId ?? '';
  return { type, title: n?.title ?? def?.title ?? '', widgets, outputs: (def?.outputs ?? []).map((o) => ({ name: o.id, type: o.type.toUpperCase(), link: null })), inputs: [] };
}

let wired = false;
export function wireHostStore() {
  if (wired) return; wired = true;
  useGraph.subscribe((s, prev) => { if (s.edges !== prev.edges || s.nodes.length !== prev.nodes.length) syncLinks(); });
}
