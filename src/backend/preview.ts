// Live sampling preview for the video cards (the Model Preview card).
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
