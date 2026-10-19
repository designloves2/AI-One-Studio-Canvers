// Prompt enhance that looks at the reference images wired to the card the prompt feeds.
// The vision route takes one image at a time, so each image is described on its own, then a text pass writes the final
// prompt and refers to the images as @image1, @image2 … in the same order they are connected (the MiniMax H3 convention).
import { runLlm } from './llm';
import { enhanceInstruction } from '../engine/run';
import type { PromptStyle } from './promptStyle';
import { useGraph } from '../store/graph';
import { byId } from '../registry';
import { activeAsset } from '../canvas/helpers';
import type { Asset } from '../types';

export interface RefImage { asset: Asset; from: string }

/** Images that reach the cards fed by `nodeId`'s output, in connection order (what the generator will receive). */
export function downstreamImages(nodeId: string): { images: RefImage[]; purpose: 'Image' | 'Video' } {
  const { nodes, edges } = useGraph.getState();
  const images: RefImage[] = []; let purpose: 'Image' | 'Video' = 'Image';
  const seen = new Set<string>();
  for (const e of edges.filter((x) => x.source === nodeId)) {
    const target = nodes.find((n) => n.id === e.target); const def = target && byId.get(target.defId);
    if (!target || !def) continue;
    if (def.category === 'Video') purpose = 'Video';
    for (const inp of def.inputs.filter((i) => i.type === 'image')) {
      for (const ie of edges.filter((x) => x.target === target.id && x.targetHandle === inp.id)) {
        const src = nodes.find((n) => n.id === ie.source); const a = src && activeAsset(src, ie.sourceHandle);
        if (src && a && a.type === 'image' && !seen.has(a.id)) { seen.add(a.id); images.push({ asset: a, from: src.id }); }
      }
    }
  }
  return { images, purpose };
}

const DESCRIBE = 'Describe this image for a reference-based video/image prompt in 1-2 short sentences: who or what it shows (appearance, hair, clothing, colours), pose, setting. Output ONLY the description.';

export async function enhanceWithImages(o: { idea: string; images: Asset[]; purpose: string; style?: string; english?: boolean; modelStyle?: PromptStyle; progress?: (pct: number, label: string) => void }): Promise<string> {
  const imgs = o.images.slice(0, 9);
  const descs: string[] = [];
  for (let i = 0; i < imgs.length; i++) {
    o.progress?.(10 + Math.round((i / imgs.length) * 60), `looking at @image${i + 1}…`);
    descs.push(await runLlm({ system: DESCRIBE, prompt: 'Describe this image.', images: [imgs[i]] }));
  }
  o.progress?.(80, 'writing…');
  const refRules = [
    `The generator receives ${imgs.length} reference image${imgs.length > 1 ? 's' : ''}. They are numbered in the order they are connected and MUST be referred to by these exact tokens in the prompt:`,
    ...descs.map((d, i) => `@image${i + 1}: ${d}`),
    '- Use the @imageN tokens (not "the first image") wherever the prompt talks about those subjects, e.g. "@image1 walks toward @image2".',
    '- Do not re-describe what each image already shows in detail; say what they DO, how they move/interact, camera and light.',
  ].join('\n');
  if (o.modelStyle) {
    // the server builds the system prompt from the model format; the image notes ride along as extra instructions
    return runLlm({ system: '', prompt: o.idea, style: { ...o.modelStyle, extra_instructions: [o.modelStyle.extra_instructions, refRules].filter(Boolean).join('\n') } });
  }
  const system = [enhanceInstruction(o.purpose, o.style ?? '', o.english ?? true), refRules].join('\n');
  return runLlm({ system, prompt: o.idea });
}
