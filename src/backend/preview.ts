// Live sampling preview for the video cards and Image Generate (H3) (the Model Preview card).
import { loadOptions } from './options';
export interface PreviewCfg { key: string; maxResolution: number; quality: number; frames: number; fps: number; tinyVae: string; audio: boolean }
/** Model Preview card: ModelPreviewOverrideKJ wraps the model and streams the decoded frames over the `kj_preview_override` socket event, tagged with this node's id (no colon: ComfyUI truncates those). */
export function addPreview(g: Record<string, any>, model: [string, number], pv: PreviewCfg | undefined, has: (n: string) => boolean, audioVae?: [string, number]): [string, number] {
  if (!pv || !has('ModelPreviewOverrideKJ')) return model;
  const inputs: Record<string, any> = { model, max_resolution: pv.maxResolution, jpeg_quality: pv.quality, suppress_default_preview: true, preview_frames: Math.max(1, pv.frames), preview_fps: pv.fps };
  if (pv.tinyVae && pv.tinyVae !== 'none') inputs.tiny_vae = pv.tinyVae;
  if (pv.audio && audioVae) inputs.audio_vae = audioVae;
  g[pv.key] = { class_type: 'ModelPreviewOverrideKJ', inputs };
  return [pv.key, 0];
}

/**
 * The Model Preview card wired into a card (if any): the settings for ModelPreviewOverrideKJ, with a socket key made from the card's id.
 * The card sits below this one and takes its "Live preview" output; it only holds the settings. `stillOnly` = one still frame (an image card).
 */
export async function previewFor(nodeId: string, tiny: 'taeh3' | 'taeltx2_3', stillOnly = false): Promise<PreviewCfg | undefined> {
  let j: Record<string, any> | undefined;
  try {
    const { useGraph } = await import('../store/graph');
    const g = useGraph.getState();
    const to = g.edges.find((e) => e.source === nodeId && e.sourceHandle === 'preview' && g.nodes.find((n) => n.id === e.target)?.defId === 'video-preview')?.target;
    j = g.nodes.find((n) => n.id === to)?.params;
  } catch { /* headless: no preview */ }
  if (!j) return undefined;
  // 'auto': the tiny decoder of the model family (without one the latent has no colour preview)
  const have = await loadOptions('tinyvaes');
  const auto = have.find((x) => x.startsWith(tiny)) ?? 'none';
  const n = (v: unknown, d: number) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : d);
  const tv = String(j.tiny_vae ?? 'auto');
  return { key: `cvprev_${nodeId}`, maxResolution: n(j.max_resolution, 1024), quality: n(j.jpeg_quality, 85), frames: stillOnly ? 1 : n(j.preview_frames, 243), fps: n(j.preview_fps, 12), tinyVae: tv === 'auto' ? auto : tv, audio: !stillOnly && !!j.with_audio };
}
