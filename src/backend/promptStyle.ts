// Model-aware prompt writing, taken from ONE STUDIO: the server (ComfyUI-TJ_NODE) ships a phrasing instruction per target model
// ("model format"), an aesthetic list and a purpose framing; /tj_studio_one/llm/enhance builds the system prompt from them.
import { getJson } from './http';
import { byId, engineFor } from '../registry';
import { useGraph } from '../store/graph';

export interface PromptStyle { model_format: string; aesthetic: string; purpose: string; extra_instructions: string }
export const AUTO = 'auto';
export const NO_AESTHETIC = 'None (no aesthetic injection)';

/** engine family / engine id → server model-format name */
const FORMAT_BY_FAMILY: Record<string, string> = {
  zimage: 'Z-Image & Lumina-2 (LLM text encoder)', klein: 'Flux & Chroma (natural language)', krea2: 'KREA2 (Prompt Enhance)',
  sdxl: 'SDXL (tags + weights)', anima: 'Anima (anime illustration prose)', qwen: 'Qwen Image 2.1 (Edit)', qwen21: 'Qwen Image 2.1 (T2I)',
};
const FORMAT_BY_ENGINE: Record<string, string> = { h3: 'Minimax H3 (Video)', 'h3-ref': 'Minimax H3 (Video)', ltx25: 'LTX Video (motion-focused prose)' };
const FORMAT_BY_DEF: Record<string, string> = { 'h3-image': 'Minimax H3 (Video)', 'ltx-director': 'LTX Video (motion-focused prose)', 'character-sheet': 'Minimax H3 (Video)', 'face-refine': 'Minimax H3 (Video)', 'video-refine': 'LTX Video (motion-focused prose)' };

export interface StyleCatalog { formats: string[]; aesthetics: string[]; purposes: string[] }
let catalog: Promise<StyleCatalog> | null = null;
export function styleCatalog(): Promise<StyleCatalog> {
  catalog ??= getJson<any>('/tj_studio_one/llm/models').then((d) => ({
    formats: d.model_formats ?? ['Universal Natural Language'], aesthetics: d.aesthetics ?? [NO_AESTHETIC], purposes: d.purposes ?? ['Image', 'Video'],
  })).catch((e) => { catalog = null; throw e; });
  return catalog;
}

export function formatFor(defId: string, engineId?: string): { model_format: string; purpose: string } {
  const def = byId.get(defId);
  const eng = def ? engineFor(def, engineId) : undefined;
  const video = def?.category === 'Video' || defId === 'h3-image' && false;
  const fmt = (engineId && FORMAT_BY_ENGINE[engineId]) || FORMAT_BY_DEF[defId] || (eng?.family && FORMAT_BY_FAMILY[eng.family]) || (eng && FORMAT_BY_ENGINE[eng.id]) || 'Universal Natural Language';
  return { model_format: fmt, purpose: video ? 'Video' : (defId === 'image-edit' ? 'Edit (Inpainting/I2V)' : 'Image') };
}

/** The phrasing target implied by the cards a prompt node feeds (first connected generator that has a known model). */
export function downstreamTarget(nodeId: string): { model_format: string; purpose: string } | null {
  const { nodes, edges } = useGraph.getState();
  for (const e of edges.filter((x) => x.source === nodeId)) {
    const t = nodes.find((n) => n.id === e.target); if (!t) continue;
    const def = byId.get(t.defId); if (!def || (def.kind !== 'generate')) continue;
    return formatFor(t.defId, t.engineId);
  }
  return null;
}

/** Node-level choices stored on a Prompt / Prompt Enhancer card (fmt/aes/extra); 'auto' follows the connected generator. */
export function styleOf(nodeId: string, p: Record<string, any>, fallback: { model_format: string; purpose: string } = { model_format: 'Universal Natural Language', purpose: 'Image' }): PromptStyle {
  const auto = downstreamTarget(nodeId) ?? fallback;
  const fmt = p.fmt && p.fmt !== AUTO ? String(p.fmt) : auto.model_format;
  return { model_format: fmt, purpose: p.purpose_sel && p.purpose_sel !== AUTO ? String(p.purpose_sel) : auto.purpose, aesthetic: p.aes ? String(p.aes) : NO_AESTHETIC, extra_instructions: String(p.extra ?? '') };
}
