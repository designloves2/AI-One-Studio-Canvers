// Run any API-format ComfyUI workflow (e.g. your MiniMax H3 / LTX 2.5 / Wan graphs) with values injected.
export type ApiGraph = Record<string, { class_type: string; inputs: Record<string, any>; _meta?: { title?: string } }>;

export interface Candidates { text: Field[]; image: Field[]; video: Field[]; seed: Field[] }
export interface Field { key: string; label: string }

export function parseWorkflow(src: string): { graph?: ApiGraph; error?: string } {
  if (!src.trim()) return {};
  try {
    const j = JSON.parse(src);
    if (Array.isArray(j?.nodes)) return { error: 'This is a UI-format workflow. In ComfyUI use "Save (API Format)" (enable Dev mode in settings).' };
    const g = (j?.prompt && typeof j.prompt === 'object' ? j.prompt : j) as ApiGraph;
    if (!g || typeof g !== 'object' || !Object.values(g).every((n: any) => n && typeof n.class_type === 'string')) return { error: 'Not an API-format workflow JSON.' };
    return { graph: g };
  } catch (e) { return { error: `Invalid JSON: ${(e as Error).message}` }; }
}

const lbl = (id: string, n: ApiGraph[string], input: string) => `${id} · ${n._meta?.title ?? n.class_type} · ${input}`;
export const fieldKey = (id: string, input: string) => `${id}::${input}`;

export function candidates(g: ApiGraph): Candidates {
  const c: Candidates = { text: [], image: [], video: [], seed: [] };
  for (const [id, n] of Object.entries(g)) {
    for (const [k, v] of Object.entries(n.inputs ?? {})) {
      if (Array.isArray(v)) continue; // a link
      const f = { key: fieldKey(id, k), label: lbl(id, n, k) };
      if (typeof v === 'string' && /^(text|prompt|positive_prompt|text_g|text_l|caption)$/i.test(k) && !/Negative/i.test(n._meta?.title ?? '')) c.text.push(f);
      else if (typeof v === 'string' && n.class_type.includes('LoadImage') && k === 'image') c.image.push(f);
      else if (typeof v === 'string' && /LoadVideo/i.test(n.class_type) && /^(video|file)$/.test(k)) c.video.push(f);
      else if (typeof v === 'number' && /^(seed|noise_seed)$/.test(k)) c.seed.push(f);
    }
  }
  return c;
}

export function setField(g: ApiGraph, key: string, value: unknown): void {
  const [id, input] = key.split('::');
  if (id && input && g[id]) g[id].inputs[input] = value;
}

export const VIDEO_EXT = /\.(mp4|webm|mov|mkv|gif|webp)$/i;
