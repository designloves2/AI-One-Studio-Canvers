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
