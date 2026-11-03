import { useEffect, useState } from 'react';
import { useDirector } from '../store/director';
import { useGraph } from '../store/graph';
import { listCanvases } from '../backend/canvases';
import { canvasOfFocus } from './pairing';
import type { DirectorProject } from './types';

/** told by the actions that make or remove a canvas file, so the buttons below change colour without a reload */
export const canvasListChanged = () => window.dispatchEvent(new Event('canvers-canvas-list'));

/**
 * true when the episode's paired canvas does not exist as a saved file (never made, or deleted in the Canvas).
 * Unknown (list not read yet / server error) and the demo count as "not missing", so a button is never red by mistake.
 */
export function useCanvasMissing(p: DirectorProject, no: number): boolean {
  const demo = useDirector((s) => s.demo);
  const openFile = useGraph((s) => s.canvasFile); const dirty = useGraph((s) => s.dirty);
  const file = canvasOfFocus(p, no)?.canvas_file ?? '';
  const [saved, setSaved] = useState<string[] | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { const f = () => setTick((n) => n + 1); window.addEventListener('canvers-canvas-list', f); return () => window.removeEventListener('canvers-canvas-list', f); }, []);
  useEffect(() => {
    let off = false;
    listCanvases().then((l) => { if (!off) setSaved(l.map((c) => c.name)); }).catch(() => { if (!off) setSaved(null); });
    return () => { off = true; };
  }, [file, openFile, dirty, tick]);
  if (demo || saved === null) return false;
  return !file || !saved.includes(file);
}
