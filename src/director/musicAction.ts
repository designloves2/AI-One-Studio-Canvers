// App-side actions of the music-video song and of the finished episode: upload the producer's own song, make a song with the Music Generate card,
// join the clips of an episode and lay the song on top. Same rules as the other actions: building never runs a card; a card only runs after a button
// press and a "yes"; in the DEMO nothing is generated (a short tone and a labelled card stand in).
import { useDirector } from '../store/director';
import { useGraph } from '../store/graph';
import { askConfirm } from '../ui/dialog';
import { t as tr } from '../i18n';
import { canvasFileName, loadCanvas, saveCanvas } from '../backend/canvases';
import { openSavedCanvas, runNode } from '../engine/actions';
import { importFile } from '../engine/run';
import { viewUrl } from '../backend/comfy';
import { buildMusicCanvas, MUSIC_GEN_ID } from './adapter';
import { appRegistry } from './adapterRegistry';
import { applyEpisodeFinal, applyMusicResult, newSeed } from './execution';
import { defaultSections } from './music';
import { demoFinalResult, demoSongResult, pushPicked } from './demoMedia';
import { DEMO_FILE, existingCanvas, isDemo, linkOfEpisode, makeEpisodeCanvas, refreshOpenCanvas, setLink, sleep } from './canvasAction';
import { episodeByNo, shotsOfEpisode } from './model';
import type { CanvasLink, DirectorProject } from './types';

export const linkOfMusic = (p: DirectorProject): CanvasLink | null => p.canvas_links.find((l) => l.purpose === 'music') ?? null;

/** the length of an audio file (s), read in the browser; 0 when it cannot be told */
function audioSeconds(url: string): Promise<number> {
  return new Promise((resolve) => {
    const a = new Audio(); a.preload = 'metadata';
    const done = (d = 0) => { a.removeAttribute('src'); resolve(Number.isFinite(d) ? d : 0); };
    a.onloadedmetadata = () => done(a.duration); a.onerror = () => done(); setTimeout(() => done(), 8000); a.src = url;
  });
}
const stem = (n: string) => n.replace(/\.[^.]+$/, '');

/** The producer's own song: the file becomes the picked take, its length and a default structure are taken, the source is "upload". */
export async function uploadSong(file: File): Promise<void> {
  const d = useDirector.getState();
  if (!d.project) throw new Error('no project');
  if (d.readOnly) throw new Error(tr('Read-only (saved by a newer version)'));
  if (!(file.type.startsWith('audio/') || /\.(flac|mp3|wav|ogg|opus|m4a)$/i.test(file.name))) throw new Error(tr('Choose an audio file (mp3, wav, flac, m4a, ogg).'));
  let take: import('./types').ResultRef; let seconds: number;
  if (isDemo()) {   // the demo does not upload: a short tone stands in, the real length of the chosen file is used
    const o = URL.createObjectURL(file);
    try { seconds = await audioSeconds(o); } finally { URL.revokeObjectURL(o); }
    take = { ...demoSongResult(file.name, 0), source: 'demo' };
  } else {
    const a = await importFile(file);
    if (!a.file) throw new Error(tr('The song could not be uploaded.'));
    seconds = await audioSeconds(viewUrl(a.file));
    take = { result_id: `rs_${a.id}`, file: a.file, kind: 'audio', created_at: new Date().toISOString(), picked: true, source: 'upload' };
  }
  d.edit((x) => {
    const m = x.music ?? (x.music = { source: null, title: '', style: '', lyrics: '', language: 'ko', duration_sec: 0, bpm: 0, sections: [], candidates: [], status: 'draft' });
    m.source = 'upload';
    pushPicked(m.candidates, take);
    if (!m.title) m.title = stem(file.name);
    if (seconds >= 10) { m.duration_sec = Math.min(600, Math.round(seconds)); m.sections = defaultSections(m.duration_sec); }
  });
}

/**
 * Make the song with the Music Generate card (style + lyrics + engine from the song data). A new take every time; `newSeedNow` = a different one.
 * Builds the music canvas, asks once, runs the card, takes the result into the song.
 */
export async function generateSong(opt: { newSeedNow?: boolean } = {}): Promise<{ made: boolean; cancelled: boolean }> {
  const d = useDirector.getState();
  if (!d.project) throw new Error('no project');
  if (d.readOnly) throw new Error(tr('Read-only (saved by a newer version)'));
  const m0 = d.project.music;
  if (!m0 || m0.source !== 'generate') throw new Error(tr('Choose "Make with the AI" first.'));
  if (!m0.style.trim() || !m0.lyrics.trim()) throw new Error(tr('The song needs a style and lyrics first. Ask the crew to write them, or type them.'));
  if (opt.newSeedNow || m0.seed === undefined) d.edit((x) => { if (x.music) x.music.seed = newSeed(); });
  const p = useDirector.getState().project!;
  if (isDemo()) {
    await sleep(500);
    useDirector.getState().edit((x) => { if (x.music) pushPicked(x.music.candidates, demoSongResult(x.music.title || 'song', x.music.seed ?? 0)); });
    return { made: true, cancelled: false };
  }
  let prev = linkOfMusic(p); if (prev && prev.canvas_file.startsWith(DEMO_FILE)) prev = null;
  const file = prev?.canvas_file ?? `${canvasFileName(p.name)} - song`;
  const existing = await existingCanvas(file, !!prev);
  const res = buildMusicCanvas(p, appRegistry, existing, prev, file);
  if (res.report.missing.length) throw new Error(`${tr('Not built')}: ${res.report.missing[0]}`);
  await saveCanvas(file, res.project);
  setLink(res.link);
  if (useGraph.getState().canvasFile !== file) await openSavedCanvas(file); else await refreshOpenCanvas(file);
  if (useGraph.getState().canvasFile !== file) throw new Error(tr('The linked canvas is not open.'));
  if (!(await askConfirm(`${tr('Make the song now? Generating uses the GPU and takes time.')}\n\n${p.music!.title || ''} (${p.music!.duration_sec}s)`))) return { made: false, cancelled: true };
  await runNode(MUSIC_GEN_ID);
  const g = useGraph.getState();
  let added = 0;
  useDirector.getState().edit((x) => { added = applyMusicResult(x, res.link, g.nodes); });
  try { await saveCanvas(file, g.toProject()); g.markSaved(file); } catch { /* shown by the unsaved mark */ }
  if (g.runtime[MUSIC_GEN_ID]?.status === 'error') throw new Error(String(g.runtime[MUSIC_GEN_ID].error ?? 'the song failed'));
  return { made: added > 0, cancelled: false };
}

/** the picked take of the song is another one */
export function pickSong(resultId: string): void {
  useDirector.getState().edit((x) => { x.music?.candidates.forEach((c) => { c.picked = c.result_id === resultId; }); });
}

/**
 * The finished episode: the clips joined in order (and, for a music video, the song laid on top). The episode canvas is built (or updated) with the
 * finishing cards, the card whose result is the finished episode runs after a "yes", and its video is taken into the episode.
 */
export async function finishEpisode(no?: number): Promise<{ made: boolean; cancelled: boolean }> {
  const d = useDirector.getState(); const p = d.project;
  if (!p) throw new Error('no project');
  if (d.readOnly) throw new Error(tr('Read-only (saved by a newer version)'));
  const ep = episodeByNo(p, no ?? p.workflow.episode_no); if (!ep) throw new Error('no episode');
  const shots = shotsOfEpisode(p, ep.episode_id);
  if (!shots.length || shots.some((s) => !s.results.some((r) => r.picked))) throw new Error(tr('Every clip needs a result before the clips can be joined.'));
  if (isDemo()) {
    await sleep(400);
    d.edit((x) => { const e = x.episodes.find((q) => q.episode_id === ep.episode_id); if (e) e.final = demoFinalResult(`${ep.no}: ${ep.title || x.series.title}`, x.series.aspect); });
    return { made: true, cancelled: false };
  }
  await makeEpisodeCanvas(ep.no);
  const link = linkOfEpisode(useDirector.getState().project!, ep.no);
  if (!link?.final_node_id) throw new Error(tr('The canvas has no card for the finished episode (Video Stitch). Press "Update Canvers canvas".'));
  if (useGraph.getState().canvasFile !== link.canvas_file) await openSavedCanvas(link.canvas_file); else await refreshOpenCanvas(link.canvas_file);
  if (useGraph.getState().canvasFile !== link.canvas_file) throw new Error(tr('The linked canvas is not open.'));
  if (!(await askConfirm(`${tr('Join the clips into one video now?')}\n\n${ep.no}: ${ep.title}`))) return { made: false, cancelled: true };
  await runNode(link.final_node_id);
  const g = useGraph.getState(); let added = 0;
  useDirector.getState().edit((x) => { added = applyEpisodeFinal(x, link, g.nodes); });
  try { await saveCanvas(link.canvas_file, g.toProject()); g.markSaved(link.canvas_file); } catch { /* shown by the unsaved mark */ }
  if (g.runtime[link.final_node_id]?.status === 'error') throw new Error(String(g.runtime[link.final_node_id].error ?? 'joining failed'));
  return { made: added > 0, cancelled: false };
}

/** pull a finished episode / song that was made by hand in the linked canvas */
export async function syncFinalFromCanvas(no?: number): Promise<number> {
  const d = useDirector.getState(); const p = d.project; const link = p && linkOfEpisode(p, no);
  if (!p || !link || d.readOnly || link.canvas_file.startsWith(DEMO_FILE) || !link.final_node_id) return 0;
  const g = useGraph.getState();
  const nodes = g.canvasFile === link.canvas_file ? g.nodes : (await loadCanvas(link.canvas_file)).nodes;
  let n = 0; d.edit((x) => { n = applyEpisodeFinal(x, link, nodes); });
  return n;
}
