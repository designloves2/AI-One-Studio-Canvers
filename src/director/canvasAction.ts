// "Make Canvers canvas" for the Director screen: builds (or updates) the canvas with the adapter and saves it in the canvases list.
// It never runs a card: generation stays a button the user presses in Canvas mode.
import { useDirector } from '../store/director';
import { useGraph } from '../store/graph';
import { askConfirm } from '../ui/dialog';
import { t as tr } from '../i18n';
import { canvasFileName, listCanvases, loadCanvas, saveCanvas } from '../backend/canvases';
import { openSavedCanvas } from '../engine/actions';
import { buildCanvasFromDirector, type AdapterReport, type Generator } from './adapter';
import { appRegistry } from './adapterRegistry';
import type { CanvasLink } from './types';
import type { Project } from '../types';

export const linkOf = (links: CanvasLink[]): CanvasLink | null => links[0] ?? null;

/** a one-line-per-fact summary of what the adapter did, in the UI language */
export function describeReport(r: AdapterReport): string {
  const n = (k: string, a: unknown[]) => (a.length ? `${tr(k)}: ${a.length}` : '');
  return [
    n('Cards made', r.created), n('Cards updated', r.updated), n('Cards made again (deleted in the canvas)', r.recreated),
    n('Prompts you changed in the canvas were kept (shots)', r.keptUserText), n('Shots that are no longer in the project (their cards were left alone)', r.orphaned),
    n('Shots with an empty prompt', r.emptyPrompt), n('Shots with assets (assets are not connected to cards yet)', r.assetsNotWired),
    ...r.missing.map((m) => `${tr('Not built')}: ${m.reason}`),
  ].filter(Boolean).join('\n') || tr('Nothing to change.');
}

export async function makeCanvasFromDirector(generator: Generator): Promise<{ file: string; report: AdapterReport } | null> {
  const d = useDirector.getState();
  const p = d.project;
  if (!p) return null;
  if (p.shots.length === 0) throw new Error(tr('Add at least one shot first.'));
  const prev = linkOf(p.canvas_links);
  const file = prev?.canvas_file ?? `${canvasFileName(p.name)} - director`;

  let existing: Project | null = null;
  const saved = await listCanvases();
  if (saved.some((c) => c.name === file)) {
    if (prev) { try { existing = await loadCanvas(file); } catch { existing = null; } }
    else if (!(await askConfirm(`${file} — ${tr('Replace the saved canvas with this name?')}`))) return null;
  }
  const res = buildCanvasFromDirector(p, appRegistry, existing, prev, file, { generator });
  await saveCanvas(file, res.project);
  // the link goes into the Director project (a read-only project is never changed)
  d.edit((x) => { x.canvas_links = [res.link, ...x.canvas_links.filter((l) => l.canvas_id !== res.link.canvas_id)]; });
  return { file, report: res.report };
}

export async function openLinkedCanvas(file: string): Promise<void> {
  await openSavedCanvas(file);
  useGraph.getState().setMode('canvas');
}
