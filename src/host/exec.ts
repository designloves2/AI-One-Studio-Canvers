// Run one hosted ComfyUI node through the normal /prompt API (used for ComfyUI-TJ_NODE nodes such as LLM (TJ) and
// PromptDBSave): its widget values + whatever is wired into it become the API graph, and its outputs come back as results.
import type { Asset } from '../types';
import { assetFromFile, ensureInput, runPrompt, uid } from '../backend/comfy';
import { useGraph } from '../store/graph';
import { ensureHostNode } from './index';
import { getJson } from '../backend/http';

let previewAny: Promise<boolean> | null = null;
const hasPreviewAny = () => (previewAny ??= getJson<any>('/object_info/PreviewAny').then((j) => !!j?.PreviewAny).catch(() => false));

export async function runHostNode(id: string, onProgress?: (pct: number, label?: string) => void): Promise<Asset[]> {
  const st = useGraph.getState();
  const gn = st.nodes.find((n) => n.id === id); if (!gn) throw new Error('node not found');
  const inst = ensureHostNode(gn); if (!inst) throw new Error('node type not loaded');
  const g: Record<string, any> = {}; const inputs: Record<string, any> = {};

  for (const w of inst.widgets) {
    if (w.element || w.hidden || w.serialize === false || ['button', 'hidden', 'converted-widget'].includes(w.type)) continue;
    if (w.name === 'tj_state') continue;
    if (w.value !== undefined) inputs[w.name] = w.value;
  }
  // wired inputs: text → literal, image/audio → a Load node on the uploaded file
  let helper = 0;
  for (const slot of inst.inputs) {
    if (slot.link == null) continue;
    const link = inst.graph.links[slot.link]; if (!link) continue;
    const src = st.nodes.find((n) => n.id === link.origin_id); if (!src) continue;
    const port = (src.defId.startsWith('host:') ? inst.graph.getNodeById(src.id)?.outputs?.[link.origin_slot]?.name : undefined) ?? undefined;
    const results = src.results.filter((a) => !port || (a.port ?? 'image') === port || src.results.length === 1);
    const a = results[Math.min(src.activeResult, results.length - 1)] ?? results[0];
    if (!a) continue;
    if (a.type === 'text') inputs[slot.name] = a.text ?? '';
    else if (a.type === 'image') { const k = `h${++helper}`; g[k] = { class_type: 'LoadImage', inputs: { image: await ensureInput(a) } }; inputs[slot.name] = [k, 0]; }
    else if (a.type === 'audio') { const k = `h${++helper}`; g[k] = { class_type: 'LoadAudio', inputs: { audio: await ensureInput(a) } }; inputs[slot.name] = [k, 0]; }
  }
  g.node = { class_type: inst.type, inputs };

  // return values of non-output nodes are read through preview nodes
  const outs = inst.outputs; const textSlots: number[] = []; const imageSlots: number[] = [];
  const isOutputNode = !!inst.nodeData.output_node;
  if (!isOutputNode) {
    outs.forEach((o, i) => { if (o.type === 'STRING') textSlots.push(i); else if (o.type === 'IMAGE') imageSlots.push(i); });
    if (textSlots.length && await hasPreviewAny()) textSlots.forEach((i) => { g[`t${i}`] = { class_type: 'PreviewAny', inputs: { source: ['node', i] } }; });
    imageSlots.forEach((i) => { g[`i${i}`] = { class_type: 'PreviewImage', inputs: { images: ['node', i] } }; });
  }
  const res = await runPrompt(g, { onProgress });
  const out: Asset[] = [];
  for (const i of textSlots) { const o = res.raw[`t${i}`]; const txt = (o?.text ?? [])[0]; if (txt !== undefined) out.push({ id: uid(), type: 'text', url: '', text: String(txt), port: outs[i].name }); }
  for (const i of imageSlots) { const o = res.raw[`i${i}`]; const im = (o?.images ?? [])[0]; if (im) out.push({ ...assetFromFile({ filename: im.filename, subfolder: im.subfolder ?? '', type: im.type ?? 'temp' }, 'image', outs[i].name) }); }
  if (isOutputNode) for (const im of res.images) out.push(assetFromFile(im, 'image', outs[0]?.name));
  return out;
}
