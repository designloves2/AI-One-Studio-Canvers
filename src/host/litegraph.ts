// A small LiteGraph/ComfyUI-frontend compatible host, so the node panels shipped by ComfyUI-TJ_NODE_STUDIO_ONE
// (they are ComfyUI extensions) run unchanged inside the Canvers canvas. Only the parts those extensions touch exist here.
export interface Slot { name: string; type: string; label?: string; link: number | null; links?: number[] | null; [k: string]: any }
export interface Widget {
  name: string; type: string; value: any; options: Record<string, any>;
  callback?: (...a: any[]) => void; element?: HTMLElement; hidden?: boolean; serialize?: boolean;
  computeSize?: (w?: number) => number[]; draw?: (...a: any[]) => void; [k: string]: any;
}
export interface NodeData { name: string; display_name?: string; description?: string; category?: string; input?: { required?: Record<string, any>; optional?: Record<string, any>; hidden?: Record<string, any> }; output?: string[]; output_name?: string[]; [k: string]: any }

export interface LinkInfo { id: number; origin_id: string; origin_slot: number; target_id: string; target_slot: number; type: string }

type Listener = () => void;

/** one ComfyUI node instance living in the canvas */
export class HostNode {
  id: string;
  type: string;
  comfyClass: string;
  title: string;
  properties: Record<string, any> = {};
  inputs: Slot[] = [];
  outputs: Slot[] = [];
  widgets: Widget[] = [];
  size: [number, number] = [320, 160];
  pos: [number, number] = [0, 0];
  flags: Record<string, any> = {};
  mode = 0;
  color?: string; bgcolor?: string; title_color?: string; resizable = true;
  graph!: HostGraph;
  isHostNode = true;
  [k: string]: any;
  private listeners = new Set<Listener>();

  constructor(public nodeData: NodeData, id: string) {
    this.id = id; this.type = nodeData.name; this.comfyClass = nodeData.name; this.title = nodeData.display_name ?? nodeData.name;
    const defs = { ...(nodeData.input?.required ?? {}), ...(nodeData.input?.optional ?? {}) };
    for (const [name, spec] of Object.entries<any>(defs)) {
      const t = spec?.[0]; const opts = spec?.[1] ?? {};
      if (Array.isArray(t)) this.widgets.push({ name, type: 'combo', value: opts.default ?? t[0], options: { ...opts, values: t } });
      else if (['INT', 'FLOAT', 'STRING', 'BOOLEAN'].includes(t) && !opts.forceInput) {
        this.widgets.push({ name, type: t === 'BOOLEAN' ? 'toggle' : t === 'STRING' ? 'text' : 'number', value: opts.default ?? (t === 'STRING' ? '' : t === 'BOOLEAN' ? false : 0), options: opts });
        // like the ComfyUI frontend, a text widget can also be driven by a wire
        if (t === 'STRING') this.inputs.push({ name, type: 'STRING', link: null, widget: { name } });
      }
      else this.inputs.push({ name, type: t, link: null });
    }
    (nodeData.output ?? []).forEach((t, i) => this.outputs.push({ name: nodeData.output_name?.[i] ?? t, type: t, links: [], link: null }));
  }

  // ---- change notifications for the React card
  subscribe(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l); }
  changed() { for (const l of this.listeners) l(); }

  // ---- slots
  addInput(name: string, type: string, extra: Record<string, any> = {}) { const s: Slot = { name, type, link: null, ...extra }; this.inputs.push(s); this.changed(); return s; }
  removeInput(i: number) { const [s] = this.inputs.splice(i, 1); if (s?.link != null) this.graph?.disconnectLink(s.link); this.changed(); }
  addOutput(name: string, type: string, extra: Record<string, any> = {}) { const s: Slot = { name, type, links: [], link: null, ...extra }; this.outputs.push(s); this.changed(); return s; }
  removeOutput(i: number) { this.outputs.splice(i, 1); this.changed(); }
  findInputSlot(name: string) { return this.inputs.findIndex((s) => s.name === name); }
  findOutputSlot(name: string) { return this.outputs.findIndex((s) => s.name === name); }
  getInputLink(i: number): LinkInfo | null { const l = this.inputs[i]?.link; return l != null ? this.graph?.links[l] ?? null : null; }
  getInputNode(i: number) { const l = this.getInputLink(i); return l ? this.graph.getNodeById(l.origin_id) : null; }
  getOutputNodes(i: number) { return (this.outputs[i]?.links ?? []).map((id) => this.graph.getNodeById(this.graph.links[id]?.target_id)).filter(Boolean); }

  // ---- widgets
  addWidget(type: string, name: string, value: any, callback?: any, options: Record<string, any> = {}): Widget {
    const w: Widget = { type, name, value, options, callback }; this.widgets.push(w); this.changed(); return w;
  }
  addDOMWidget(name: string, type: string, element: HTMLElement, options: Record<string, any> = {}): Widget {
    const w: Widget = { type, name, value: undefined, options, element, serialize: options.serialize !== false && !!options.getValue };
    if (options.getValue) Object.defineProperty(w, 'value', { get: () => options.getValue(), set: (v) => options.setValue?.(v), enumerable: true, configurable: true });
    this.widgets.push(w); this.changed(); return w;
  }

  // ---- geometry / canvas (no-ops on our canvas)
  setSize(sz: number[]) { this.size = [sz[0], sz[1]]; this.changed(); }
  computeSize() { return [...this.size]; }
  setDirtyCanvas() { /* repaint is automatic */ }
  onResizeCall() { /* n/a */ }

  // ---- persistence (what ComfyUI stores in a workflow)
  serialize() {
    return {
      type: this.type, size: [...this.size], properties: JSON.parse(JSON.stringify(this.properties ?? {})),
      widgets_values: this.widgets.filter((w) => !w.element && w.serialize !== false).map((w) => w.value),
    };
  }
  configure(info: any) {
    if (!info) return;
    if (info.properties) this.properties = { ...this.properties, ...info.properties };
    if (Array.isArray(info.widgets_values)) { const ws = this.widgets.filter((w) => !w.element && w.serialize !== false); info.widgets_values.forEach((v: any, i: number) => { if (ws[i]) ws[i].value = v; }); }
    this.onConfigure?.(info);
    this.changed();
  }
}

/** facade for nodes that are not host nodes (our native canvas nodes) so extension code can read through links */
export class ProxyNode {
  isHostNode = false; mode = 0; flags = {}; properties = {};
  constructor(private read: () => { type: string; title: string; widgets: Widget[]; outputs: Slot[]; inputs: Slot[] }, public id: string, public graph: HostGraph) {}
  get type() { return this.read().type; } get comfyClass() { return this.read().type; }
  get title() { return this.read().title; } get widgets() { return this.read().widgets; }
  get outputs() { return this.read().outputs; } get inputs() { return this.read().inputs; }
}

export class HostGraph {
  links: Record<number, LinkInfo> = {};
  private nodes = new Map<string, HostNode | ProxyNode>();
  private seq = 1;
  get _nodes() { return [...this.nodes.values()]; }
  get nodesArray() { return this._nodes; }
  getNodeById(id: string | number) { return this.nodes.get(String(id)) ?? null; }
  setDirtyCanvas() { /* no-op */ }
  change() { /* no-op */ } onNodeChanged() { /* no-op */ } onStateChanged() { /* no-op */ }
  set(id: string, n: HostNode | ProxyNode | null) { if (n) this.nodes.set(id, n); else this.nodes.delete(id); }
  disconnectLink(id: number) { delete this.links[id]; }
  has(id: string) { return this.nodes.has(id); }

  /** rebuild link tables from canvas edges; notifies hosts whose connections changed */
  sync(edges: { id: string; source: string; sourceHandle: string; target: string; targetHandle: string }[]) {
    const prevByTarget = new Map<string, number | null>();
    for (const n of this.nodes.values()) if ((n as HostNode).isHostNode) (n as HostNode).inputs.forEach((s, i) => prevByTarget.set(`${n.id}:${i}`, s.link));
    this.links = {};
    for (const n of this.nodes.values()) if ((n as HostNode).isHostNode) { (n as HostNode).inputs.forEach((s) => { s.link = null; }); (n as HostNode).outputs.forEach((s) => { s.links = []; }); }
    for (const e of edges) {
      const src = this.nodes.get(e.source) as HostNode | undefined, dst = this.nodes.get(e.target) as HostNode | undefined;
      const oSlot = src?.isHostNode ? src.findOutputSlot(e.sourceHandle) : 0;
      const tSlot = dst?.isHostNode ? dst.findInputSlot(e.targetHandle) : -1;
      const id = this.seq++;
      const type = (src as HostNode)?.outputs?.[oSlot]?.type ?? '*';
      this.links[id] = { id, origin_id: e.source, origin_slot: Math.max(0, oSlot), target_id: e.target, target_slot: tSlot, type };
      if (src?.isHostNode && oSlot >= 0) (src.outputs[oSlot].links ??= []).push(id);
      if (dst?.isHostNode && tSlot >= 0) dst.inputs[tSlot].link = id;
    }
    for (const n of this.nodes.values()) {
      if (!(n as HostNode).isHostNode) continue; const h = n as HostNode; let any = false;
      h.inputs.forEach((s, i) => { const before = prevByTarget.get(`${h.id}:${i}`) ?? null; if ((before == null) !== (s.link == null)) { any = true; try { h.onConnectionsChange?.(1, i, s.link != null, s.link != null ? this.links[s.link] : null, s); } catch (e) { console.warn('[host] onConnectionsChange', e); } } });
      if (any) h.changed();
    }
  }
}
