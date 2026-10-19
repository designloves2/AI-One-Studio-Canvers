// ITDA ONE STUDIO helpers (video / audio analysis through its server routes).
import { postJson, url } from './http';
import { fetchBlob } from './comfy';
import type { Asset } from '../types';

const PROJECT = 'canvers';
/** copy an asset into the ITDA media folder; returns the server-side path */
export async function itdaUpload(a: Asset): Promise<string> {
  const blob = await fetchBlob(a);
  const ext = a.type === 'audio' ? 'flac' : 'mp4';
  const fd = new FormData(); fd.append('project', PROJECT); fd.append('files', blob, `canvers_${a.id}.${ext}`);
  const r = await fetch(url('/itda_studio_one/api/media/upload'), { method: 'POST', body: fd });
  const j = await r.json(); const p = j.items?.[0];
  if (!r.ok || !p) throw new Error('ITDA could not take the file (is ITDA ONE STUDIO installed?)');
  return p as string;
}
export const sceneDetect = (path: string, threshold: number, fps = 24) => postJson<{ ok: boolean; frames?: number[]; error?: string }>('/itda_studio_one/api/scene_detect', { project: PROJECT, path, fps, threshold });
export const beatDetect = (path: string, fps = 24) => postJson<{ ok: boolean; frames?: number[]; bpm?: number; error?: string }>('/itda_studio_one/api/beat_detect', { project: PROJECT, path, fps });

export const itdaProbe = (path: string) => postJson<{ ok: boolean; meta?: { fps?: number; duration?: number; total_frames?: number; width?: number; height?: number } }>('/itda_studio_one/api/probe', { project: PROJECT, path });
export const itdaFileUrl = (path: string) => url(`/itda_studio_one/api/file?project=${PROJECT}&path=${encodeURIComponent(path)}`);
/** a short transition clip between the end of A and the start of B */
export async function bridgeClip(pathA: string, pathB: string, mode: 'interpolate' | 'crossfade', numFrames: number) {
  const meta = (await itdaProbe(pathA)).meta;
  const frameA = Math.max(0, (meta?.total_frames ?? 1) - 1);
  return postJson<{ ok: boolean; path?: string; frames?: number; error?: string }>('/itda_studio_one/api/stitch_bridge', { project: PROJECT, path_a: pathA, path_b: pathB, frame_a: frameA, frame_b: 0, fps: meta?.fps ?? 24, mode, num_frames: numFrames });
}
