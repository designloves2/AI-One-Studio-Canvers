// App-side actions of the Director screen: build the episode canvas / the casting canvas, run cards through the normal engine, pull results back,
// register the cast images as assets. Building never runs a card. A card only runs from runFromDirector / generateCast, after a button press and a "yes".
import { useDirector } from '../store/director';
import { useGraph } from '../store/graph';
import type { BatchItemState } from '../store/director';
import { askConfirm, notify } from '../ui/dialog';
import { t as tr } from '../i18n';
import { canvasFileName, listCanvases, loadCanvas, saveCanvas } from '../backend/canvases';
import { download, openSavedCanvas, runNode } from '../engine/actions';
import { registerAsset } from '../backend/assetlib';
import { assetOfResult, resultUrl } from './media';
import { buildEpisodePackage, type PackageResult } from './exportPackage';
import { buildZip } from './zip';
import { buildCanvasFromDirector, buildCastingCanvas, refGenNodeId, type AdapterReport } from './adapter';
import { pickedAudio } from './music';
import { assetFromFile } from '../backend/comfy';
import { appRegistry } from './adapterRegistry';
import { applyCanvasResults, applyReferenceResults, planBatch, requeueClips, reseed, reseedRefs, runShots, staleShots, type RunPlan, type RunSummary } from './execution';
import { byId } from '../registry';
import { demoClipResult, demoRefResult, pushPicked } from './demoMedia';
import { newSeed } from './execution';
import { castOf, episodeByNo, findReference, newAsset, shotsOfEpisode, syncShotAssets } from './model';
import { turboSettings } from './series';
import type { CanvasLink, DirectorProject } from './types';
import type { Asset, Project } from '../types';

const pad2 = (n: number) => String(n).padStart(2, '0');
/** DEMO: nothing is generated, no canvas file is written, no asset is registered: stand-in pictures take the place of results */
export const isDemo = () => useDirector.getState().demo;
export const DEMO_FILE = '(demo) ';
const isDemoLink = (l: CanvasLink) => l.canvas_file.startsWith(DEMO_FILE);
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const linkOfEpisode = (p: DirectorProject, no = p.workflow.episode_no): CanvasLink | null => { const e = episodeByNo(p, no); return (e && p.canvas_links.find((l) => l.episode_id === e.episode_id && !l.aspect)) || null; };
export const linkOfCasting = (p: DirectorProject): CanvasLink | null => p.canvas_links.find((l) => l.purpose === 'casting') ?? null;

export const setLink = (link: CanvasLink) => useDirector.getState().edit((x) => { x.canvas_links = [link, ...x.canvas_links.filter((l) => l.canvas_id !== link.canvas_id)]; });

/** a one-line-per-fact summary of what the adapter did, in the UI language */
export function describeReport(r: AdapterReport): string {
  const n = (k: string, a: unknown[]) => (a.length ? `${tr(k)}: ${a.length}` : '');
  return [
    n('Cards made', r.created), n('Cards updated', r.updated), n('Cards made again (deleted in the canvas)', r.recreated),
    n('Prompts you changed in the canvas were kept (shots)', r.keptUserText), n('Shots that are no longer in the project (their cards were left alone)', r.orphaned),
    n('Shots with an empty prompt', r.emptyPrompt), r.refsWired ? `${tr('Reference images connected')}: ${r.refsWired}` : '', ...r.warnings,
    ...r.missing.map((m) => `${tr('Not built')}: ${m.reason}`),
  ].filter(Boolean).join('\n') || tr('Nothing to change.');
}

export async function existingCanvas(file: string, known: boolean): Promise<Project | null> {
  const saved = await listCanvases();
  if (!saved.some((c) => c.name === file)) return null;
  if (known) { try { return await loadCanvas(file); } catch { return null; } }
  if (!(await askConfirm(`${file} — ${tr('Replace the saved canvas with this name?')}`))) throw new Error(tr('Cancelled.'));
  return null;
}

/** Build (or update) the canvas of the current episode: one Prompt + one Video Generate card per clip, and the shared 7+1 card set for the series' resolution. */
export async function makeEpisodeCanvas(no?: number): Promise<{ file: string; report: AdapterReport }> {
  const d = useDirector.getState(); const p = d.project;
  if (!p) throw new Error('no project');
  const ep = episodeByNo(p, no ?? p.workflow.episode_no);
  if (!ep || !shotsOfEpisode(p, ep.episode_id).length) throw new Error(tr('Add at least one shot first.'));
  let prev = linkOfEpisode(p, ep.no);
  if (prev && isDemoLink(prev) !== isDemo()) prev = null;   // a demo canvas and a real one are never mixed
  const demo = isDemo();
  const file = prev?.canvas_file ?? `${demo ? DEMO_FILE : ''}${canvasFileName(p.name)} - ep${pad2(ep.no)}`;
  const existing = demo ? null : await existingCanvas(file, !!prev);
  const turbo = turboSettings(p.series);
  // the picked image of every cast entry the clips use: connected to each clip as a reference image, in the order of its prompt
  const refAssets: Record<string, Asset> = {};
  for (const s of shotsOfEpisode(p, ep.episode_id)) for (const r of castOf(p, s)) { const pick = r.results.find((x) => x.picked); if (pick && !refAssets[r.ref_id]) refAssets[r.ref_id] = assetOfResult(pick, `ra_${r.ref_id}`); }
  // a music video: the clips are joined and the song is laid on top in the same canvas (the card whose result is the finished episode)
  const song = p.series.format === 'musicvideo' ? pickedAudio(p.music) : undefined;
  const finish = { stitch: true, audio: song && !song.data_url ? assetFromFile(song.file, 'audio', 'audio') : undefined };   // every kind: the passed clips are joined (a music video also gets the song)
  const res = buildCanvasFromDirector(p, appRegistry, existing, prev, file, { generator: 'video-generate', episodeId: ep.episode_id, turbo: turbo.params, refAssets, finish });
  res.report.warnings.push(...turbo.warnings);
  if (!demo) await saveCanvas(file, res.project);
  setLink(res.link);
  return { file, report: res.report };
}

async function canvasNodes(file: string) {
  const g = useGraph.getState();
  if (g.canvasFile === file) return { nodes: g.nodes, runtime: g.runtime as Record<string, { status: string }> };
  return { nodes: (await loadCanvas(file)).nodes, runtime: {} as Record<string, { status: string }> };
}

/** Pull results (and running / failed state) of the episode canvas into its clips. Returns how many results were added. */
export async function syncResultsFromCanvas(no?: number): Promise<number> {
  const d = useDirector.getState(); const p = d.project; const link = p && linkOfEpisode(p, no);
  if (!p || !link || d.readOnly || isDemoLink(link)) return 0;
  const { nodes, runtime } = await canvasNodes(link.canvas_file);
  const dry = applyCanvasResults(JSON.parse(JSON.stringify(p)) as DirectorProject, link, nodes, runtime);
  if (!dry.added.length && !dry.statusChanged.length) return 0;
  d.edit((x) => { applyCanvasResults(x, link, nodes, runtime); });
  return dry.added.length;
}

/**
 * Run the clips of a plan one after another through the episode canvas' generator cards (runNode, the same as pressing the card's own Run).
 * Never called without a button press; asks once before anything starts.
 */
export async function runFromDirector(plan: RunPlan, no?: number, opt: { skipConfirm?: boolean } = {}): Promise<RunSummary> {
  const d = useDirector.getState(); const p = d.project; const link = p && linkOfEpisode(p, no);
  const epNo = no ?? p?.workflow.episode_no ?? 1;
  if (!p || !link) throw new Error(tr('Make the Canvers canvas first.'));
  if (d.readOnly) throw new Error(tr('Read-only (saved by a newer version)'));
  const ids = plan.shots.map((s) => s.shot_id);
  if (staleShots(p, link, ids).length) throw new Error(tr('The prompts changed after the canvas was made. Press "Update Canvers canvas" first.'));
  const genOf = (id: string) => link.shots.find((s) => s.shot_id === id)?.node_ids[1] ?? '';
  if (useGraph.getState().canvasFile !== link.canvas_file) await openSavedCanvas(link.canvas_file);
  const g0 = useGraph.getState();
  if (g0.canvasFile !== link.canvas_file) throw new Error(tr('The linked canvas is not open.'));
  for (const id of ids) {
    if (!g0.nodes.some((n) => n.id === genOf(id))) throw new Error(tr('A card of this shot is missing in the canvas. Press "Update Canvers canvas".'));
    if (g0.runtime[genOf(id)]?.status === 'running') throw new Error(tr('This shot is already running.'));
  }
  const label = (s: { shot_id: string }) => { const pr = useDirector.getState().project!; const i = shotsOfEpisode(pr, episodeByNo(pr, epNo)!.episode_id).findIndex((x) => x.shot_id === s.shot_id); return `${epNo}-${i + 1}`; };
  // a clip with its own seed generates with it (the card in the open canvas is set to it just before the run)
  for (const sh of plan.shots) if (sh.seed !== undefined && sh.seed >= 0) useGraph.getState().setParam(genOf(sh.shot_id), 'seed', sh.seed);
  const sum = await runShots({
    shots: plan.shots,
    confirm: (shots) => (opt.skipConfirm ? Promise.resolve(true) : askConfirm(`${tr('Run these shots now? Generating uses the GPU and takes time.')}\n\n${shots.map(label).join(', ')} (${shots.length})`)),
    run: async (s) => {
      await runNode(genOf(s.shot_id));
      const rt = useGraph.getState().runtime[genOf(s.shot_id)];
      return rt?.status === 'error' ? (rt.error === 'cancelled' ? 'cancelled' : 'error') : 'ok';
    },
    setStatus: (id, status) => useDirector.getState().edit((x) => { const s = x.shots.find((q) => q.shot_id === id); if (s) s.status = status; }),
    collect: () => { const g = useGraph.getState(); useDirector.getState().edit((x) => { applyCanvasResults(x, link, g.nodes, g.runtime as Record<string, { status: string }>); }); },
  });
  if (sum.asked && (sum.ran.length || sum.failed || sum.cancelled)) {
    try { const g = useGraph.getState(); await saveCanvas(link.canvas_file, g.toProject()); g.markSaved(link.canvas_file); } catch { /* shown by the unsaved mark */ }
    try { await useDirector.getState().save(); } catch { /* stays marked unsaved */ }
  }
  return sum;
}

// ------------------------------------------------------------------ casting
/** the image models the cast can be generated with (the engines of the Image Generate card: Krea 2, Qwen Image, Z-Image, ...) */
export const castEngines = (): { id: string; label: string }[] => (byId.get('image-generate')?.engines ?? []).map((e) => ({ id: e.id, label: e.label }));
const engineLabel = (id?: string) => castEngines().find((e) => e.id === id)?.label ?? id ?? '';

/**
 * Casting: build the casting canvas (a Prompt + Image Generate card per cast entry, with the chosen image model) and, after a yes, make the images one after another.
 *  - no `refIds`: every cast entry that has no image yet (generate all);
 *  - `refIds`: exactly these entries, even when they already have an image (make one, or make it again; `newSeed` = a different take).
 * A new image becomes the picked one; the older ones stay as candidates.
 */
export async function generateCast(opt: { refIds?: string[]; engine?: string; newSeed?: boolean } = {}): Promise<{ made: number; failed?: string; cancelled: boolean }> {
  const d = useDirector.getState();
  if (!d.project) throw new Error('no project');
  if (d.readOnly) throw new Error(tr('Read-only (saved by a newer version)'));
  // the model belongs to the project (it is remembered); a new seed belongs to the entries that are made again
  d.edit((x) => { if (opt.engine) x.settings.cast_engine = opt.engine; if (opt.newSeed && opt.refIds) reseedRefs(x, opt.refIds); });
  const p = useDirector.getState().project!;
  if (isDemo()) {   // stand-in pictures: tall for a person, wide for a place, square for a prop; the model name and the seed are on the picture
    const ids = opt.refIds ?? p.references.filter((r) => r.status !== 'rejected' && !r.results.some((x) => x.picked)).map((r) => r.ref_id);
    let made = 0;
    for (const id of ids) {
      await sleep(220);
      useDirector.getState().edit((x) => { const r = x.references.find((q) => q.ref_id === id); if (!r) return; pushPicked(r.results, demoRefResult(r, engineLabel(x.settings.cast_engine) || 'demo', r.seed ?? newSeed(), x.series.aspect)); r.asset_id = undefined; });
      made++;
    }
    return { made, cancelled: false };
  }
  let prev = linkOfCasting(p);
  if (prev && isDemoLink(prev)) prev = null;
  const file = prev?.canvas_file ?? `${canvasFileName(p.name)} - casting`;
  const existing = await existingCanvas(file, !!prev);
  // a new look is edited from the picked image of the entry it is a look of (the same face)
  const baseAssets: Record<string, Asset> = {};
  for (const r of p.references) { const pick = r.results.find((x) => x.picked); if (pick && !pick.data_url) baseAssets[r.ref_id] = assetOfResult(pick, `ba_${r.ref_id}`); }
  const res = buildCastingCanvas(p, appRegistry, existing, prev, file, { engineId: opt.engine, baseAssets });
  if (res.report.missing.length) throw new Error(`${tr('Not built')}: ${res.report.missing[0].reason}`);
  await saveCanvas(file, res.project);
  setLink(res.link);
  if (useGraph.getState().canvasFile !== file) await openSavedCanvas(file); else await refreshOpenCanvas(file);
  if (useGraph.getState().canvasFile !== file) throw new Error(tr('The linked canvas is not open.'));
  const nameOf = (id: string) => p.references.find((x) => x.ref_id === id)?.name ?? id;
  const todo = opt.refIds ? res.link.refs!.filter((r) => opt.refIds!.includes(r.ref_id)) : res.link.refs!.filter((r) => !p.references.find((x) => x.ref_id === r.ref_id)?.results.some((q) => q.picked));
  if (!todo.length) return { made: 0, cancelled: false };
  const model = engineLabel(p.settings.cast_engine ?? res.project.nodes.find((n) => n.id === refGenNodeId(todo[0].ref_id))?.engineId);
  if (!(await askConfirm(`${tr('Make the cast images now? Generating uses the GPU and takes time.')}\n\n${tr('Image model')}: ${model}\n${todo.map((r) => nameOf(r.ref_id)).join(', ')} (${todo.length})`))) return { made: 0, cancelled: true };
  let made = 0, failed: string | undefined;
  for (const r of todo) {
    await runNode(refGenNodeId(r.ref_id));
    const g = useGraph.getState();
    const rt = g.runtime[refGenNodeId(r.ref_id)];
    useDirector.getState().edit((x) => { applyReferenceResults(x, res.link, g.nodes); });
    if (rt?.status === 'error') { failed = nameOf(r.ref_id); break; }
    made++;
  }
  try { const g = useGraph.getState(); await saveCanvas(file, g.toProject()); g.markSaved(file); } catch { /* shown by the unsaved mark */ }
  return { made, failed, cancelled: false };
}

/** Pull the cast images of the casting canvas into the cast entries. */
export async function syncCastFromCanvas(): Promise<number> {
  const d = useDirector.getState(); const p = d.project; const link = p && linkOfCasting(p);
  if (!p || !link || d.readOnly || isDemoLink(link)) return 0;
  const { nodes } = await canvasNodes(link.canvas_file);
  const dry = applyReferenceResults(JSON.parse(JSON.stringify(p)) as DirectorProject, link, nodes);
  if (!dry.added.length) return 0;
  d.edit((x) => { applyReferenceResults(x, link, nodes); });
  return dry.added.length;
}

const CATEGORY = { character: 'character', location: 'background', prop: 'prop' } as const;
/**
 * Register the picked image of every approved cast entry in the Asset Library (so it can be used again, in this series and others)
 * and remember it as a project asset. Entries already registered are skipped. Needs the Asset Library of the node pack.
 */
export async function registerCast(opt: { refIds?: string[] } = {}): Promise<number> {
  const d = useDirector.getState(); const p = d.project;
  if (!p || d.readOnly) return 0;
  let n = 0;
  if (isDemo()) {   // the demo makes a project asset (no Asset Library entry): the screens show "Asset" and the clips follow the cast
    for (const ref of p.references.filter((r) => r.status !== 'rejected' && !r.asset_id && r.results.some((x) => x.picked) && (!opt.refIds || opt.refIds.includes(r.ref_id)))) {
      d.edit((x) => { const r = x.references.find((q) => q.ref_id === ref.ref_id)!; const a = newAsset(x, { name: r.name, role: r.kind === 'character' ? 'character' : r.kind === 'location' ? 'background' : 'prop', source: { kind: 'upload', name: r.name }, note: r.description }); r.asset_id = a.asset_id; syncShotAssets(x); });
      n++;
    }
    return n;
  }
  for (const ref of p.references.filter((r) => r.status !== 'rejected' && !r.asset_id && (!opt.refIds || opt.refIds.includes(r.ref_id)))) {
    const pick = ref.results.find((r) => r.picked); if (!pick || pick.lib_id) continue;   // a library pick is already an asset
    const blob = await (await fetch(resultUrl(pick))).blob();
    const lib = await registerAsset(new File([blob], `${pick.file.filename}`, { type: blob.type || 'image/png' }), CATEGORY[ref.kind], ref.name);
    d.edit((x) => {
      const r = x.references.find((q) => q.ref_id === ref.ref_id)!;
      const a = x.assets.find((q) => q.source.kind === 'library' && q.source.id === lib.id) ?? newAsset(x, { name: lib.name, role: ref.kind === 'character' ? 'character' : ref.kind === 'location' ? 'background' : 'prop', source: { kind: 'library', id: lib.id }, note: ref.description });
      r.asset_id = a.asset_id; syncShotAssets(x);
    });
    n++;
  }
  return n;
}

// ------------------------------------------------------------------ generating: automatic batches
/** the canvas that is open in the app, when it is this file and nothing in it is unsaved, is read again (so it holds the latest prompts, seeds and images) */
export async function refreshOpenCanvas(file: string) {
  const g = useGraph.getState();
  if (g.canvasFile === file && !g.dirty) { try { g.loadProject(await loadCanvas(file), file, false); } catch { /* the run will say what is wrong */ } }
}

export interface BatchResult { items: { no: number; clips: number; state: BatchItemState; note?: string }[]; cancelled: boolean }

/**
 * AUTOMATIC generation of a batch: several episodes (one after another) and/or the clips the producer chose.
 *  - `nos`: the episodes. Without `clipIds` every approved clip of an episode at the generate step runs; with `clipIds` exactly those clips run (in any of the episodes).
 *  - `newSeeds`: the chosen clips get a new random seed first (a different take).
 *  - `onFail`: 'stop' = the batch stops at the first failure; 'skip' = the failed episode is left and the next one is made.
 * For every episode the cast images, prompts and seeds are connected into its canvas first (the same idempotent build). ONE question is asked for the whole batch.
 * Progress is shown in the store (`batch`); results come back into the clips of each episode.
 */
export async function generateBatch(opt: { nos: number[]; clipIds?: string[]; newSeeds?: boolean; onFail?: 'stop' | 'skip' }): Promise<BatchResult> {
  const d = useDirector.getState();
  if (!d.project) throw new Error('no project');
  if (d.readOnly) throw new Error(tr('Read-only (saved by a newer version)'));
  const first = planBatch(d.project, opt.nos, { clipIds: opt.clipIds });
  if (!first.batches.length) throw new Error(first.skipped.length ? first.skipped.map((s) => `${s.no}: ${tr(s.reason === 'no-canvas' ? 'Make the Canvers canvas first.' : s.reason === 'not-in-generate-step' ? 'This episode is not at the generate step.' : 'No approved shot is waiting to run.')}`).join('\n') : tr('No approved shot is waiting to run.'));
  const ids = first.batches.flatMap((b) => b.shots.map((s) => s.shot_id));
  // the question comes first: nothing is changed or started before the producer said yes
  const lines = first.batches.map((b) => `${b.no}${tr(' ep')}: ${b.shots.length} ${tr('clips')}`);
  const demo = isDemo();
  if (!demo && !(await askConfirm(`${tr('Generate these now? Generating uses the GPU and takes time.')}\n\n${lines.join('\n')}\n(${first.clips} ${tr('clips')}${opt.newSeeds ? `, ${tr('with new seeds')}` : ''})`))) return { items: [], cancelled: true };
  d.edit((x) => { for (const b of first.batches) requeueClips(x, b.requeue); if (opt.newSeeds && opt.clipIds) reseed(x, ids); });
  const items: BatchResult['items'] = [...first.batches.map((b) => ({ no: b.no, clips: b.shots.length, state: 'waiting' as BatchItemState })), ...first.skipped.map((s) => ({ no: s.no, clips: 0, state: 'skipped' as BatchItemState, note: s.reason }))];
  const show = (running: boolean) => useDirector.getState().setBatch({ running, items: items.map((i) => ({ ...i })), finishedAt: running ? undefined : new Date().toISOString() });
  show(true);
  let cancelled = false;
  for (const b of first.batches) {
    const it = items.find((i) => i.no === b.no)!;
    it.state = 'running'; show(true);
    if (demo) {   // stand-in results, one clip after another, so the progress and the review screens can be tried
      try {
        await makeEpisodeCanvas(b.no);
        for (const sh of b.shots) {
          useDirector.getState().edit((x) => { const q = x.shots.find((z) => z.shot_id === sh.shot_id); if (q) q.status = 'generating'; });
          await sleep(200);
          useDirector.getState().edit((x) => {
            const q = x.shots.find((z) => z.shot_id === sh.shot_id); if (!q) return;
            const ep = x.episodes.find((e) => e.no === b.no); const idx = ep ? shotsOfEpisode(x, ep.episode_id).findIndex((z) => z.shot_id === q.shot_id) + 1 : 0;
            pushPicked(q.results, demoClipResult(`${b.no}-${idx}`, q, q.seed ?? newSeed(), x.series.aspect)); q.status = 'review';
          });
        }
        it.state = 'done';
      } catch (e) { it.state = 'failed'; it.note = (e as Error).message; if (opt.onFail !== 'skip') { for (const r of items) if (r.state === 'waiting') { r.state = 'skipped'; r.note = 'not started'; } show(false); break; } }
      show(true); continue;
    }
    try {
      await makeEpisodeCanvas(b.no);                                           // connect the cast images / prompts / seeds
      const link = linkOfEpisode(useDirector.getState().project!, b.no);
      if (link) await refreshOpenCanvas(link.canvas_file);
      const shots = useDirector.getState().project!.shots.filter((s) => b.shots.some((x) => x.shot_id === s.shot_id));   // read again: seeds / status changed above
      const sum = await runFromDirector({ shots }, b.no, { skipConfirm: true });
      it.state = sum.failed ? 'failed' : sum.cancelled ? 'cancelled' : 'done';
      if (sum.failed) it.note = 'a clip failed';
      if (sum.cancelled) cancelled = true;
      if ((sum.failed && opt.onFail !== 'skip') || sum.cancelled) { for (const r of items) if (r.state === 'waiting') { r.state = 'skipped'; r.note = 'not started'; } show(false); break; }
    } catch (e) {
      it.state = 'failed'; it.note = (e as Error).message;
      if (opt.onFail !== 'skip') { for (const r of items) if (r.state === 'waiting') { r.state = 'skipped'; r.note = 'not started'; } show(false); break; }
    }
    show(true);
  }
  show(false);
  return { items, cancelled };
}

/** MANUAL, "take it as a file": the episode package (canvas + prompts + the cast images) as one ZIP download per episode. */
export async function downloadEpisodePackage(no?: number): Promise<PackageResult> {
  const p = useDirector.getState().project;
  if (!p) throw new Error('no project');
  const link = linkOfEpisode(p, no);
  let canvas: Project | null = null;
  if (link) { const g = useGraph.getState(); canvas = g.canvasFile === link.canvas_file ? g.toProject() : await loadCanvas(link.canvas_file).catch(() => null); }
  const res = await buildEpisodePackage(p, canvas, async (ref) => {
    const r = findReference(p, ref.name); const pick = r?.results.find((x) => x.picked); if (!pick) return null;
    const resp = await fetch(resultUrl(pick)); if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const ext = /\.([a-z0-9]{2,4})$/i.exec(pick.file.filename)?.[1] ?? (blob.type.split('/')[1] || 'png');
    return { data: new Uint8Array(await blob.arrayBuffer()), ext };
  }, undefined, no);
  const url = URL.createObjectURL(new Blob([buildZip(res.files) as BlobPart], { type: 'application/zip' }));
  download(url, res.zipName);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return res;
}
export async function downloadEpisodePackages(nos: number[]): Promise<PackageResult[]> {
  const out: PackageResult[] = [];
  for (const no of nos) out.push(await downloadEpisodePackage(no));
  return out;
}

export async function openLinkedCanvas(file: string): Promise<void> {
  if (file.startsWith(DEMO_FILE)) { await notify(tr('The demo does not make canvas files. Turn the demo off to build the real canvas.')); return; }
  await openSavedCanvas(file);
  useGraph.getState().setMode('canvas');
}

/** the other screen ratios of the series (not the main one) that this build can make */
export const extraAspects = (p: DirectorProject): string[] => (p.series.versions ?? []).filter((a) => a !== p.series.aspect);
export const versionLinks = (p: DirectorProject, no = p.workflow.episode_no): CanvasLink[] => { const e = episodeByNo(p, no); return e ? p.canvas_links.filter((l) => l.episode_id === e.episode_id && l.aspect) : []; };

/**
 * One extra canvas per other screen ratio (an ad in 9:16 and 1:1 as well): the same prompts, cast images and seeds, only the ratio differs.
 * The versions are made by hand in the Canvas (open the file and run the cards); their results stay in that canvas.
 */
export async function makeVersionCanvases(no?: number): Promise<{ files: string[] }> {
  const d = useDirector.getState(); const p = d.project;
  if (!p) throw new Error('no project');
  if (isDemo()) throw new Error(tr('The demo does not make canvas files. Turn the demo off to build the real canvas.'));
  const ep = episodeByNo(p, no ?? p.workflow.episode_no);
  if (!ep || !shotsOfEpisode(p, ep.episode_id).length) throw new Error(tr('Add at least one shot first.'));
  const files: string[] = [];
  for (const asp of extraAspects(p)) {
    const clone = JSON.parse(JSON.stringify(useDirector.getState().project)) as DirectorProject; clone.series.aspect = asp;
    const prev = clone.canvas_links.find((l) => l.episode_id === ep.episode_id && l.aspect === asp) ?? null;
    const file = prev?.canvas_file ?? `${canvasFileName(p.name)} - ep${pad2(ep.no)} - ${asp.replace(':', 'x')}`;
    const existing = await existingCanvas(file, !!prev);
    const turbo = turboSettings(clone.series);
    const refAssets: Record<string, Asset> = {};
    for (const s of shotsOfEpisode(clone, ep.episode_id)) for (const r of castOf(clone, s)) { const pick = r.results.find((x) => x.picked); if (pick && !refAssets[r.ref_id]) refAssets[r.ref_id] = assetOfResult(pick, `ra_${r.ref_id}`); }
    const res = buildCanvasFromDirector(clone, appRegistry, existing, prev, file, { generator: 'video-generate', episodeId: ep.episode_id, turbo: turbo.params, refAssets });
    await saveCanvas(file, res.project);
    setLink({ ...res.link, aspect: asp });
    files.push(file);
  }
  return { files };
}
