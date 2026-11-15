// Postprocess → Video Upscale methods that need a prompt: "Latent Upscale (Use H3)" (h3lat) and "LTX 2.5 Upscale" (ltx, with Split mode).
import type { Asset } from '../types';
import type { Ctx } from './run';
import { assetFromFile, clearPlan, ensureInput, freeModels, recoverPrompt, runPrompt, takeResume, writePlan } from '../backend/comfy';
import { getJson } from '../backend/http';
import { buildH3LatGraph, h3LatFrames, h3SegmentPlan } from '../backend/h3Lat';
import { clipLastFrame, copyToInput, deleteOutput, stitchClips } from '../backend/h3';
import { buildRefineGraph } from '../backend/ltxRefine';
import { buildPostGraph, type RtxSize } from '../backend/post';
import { useSettings } from '../store/settings';
import { need, num, str } from './util';
import { cardLoras } from './more';
import { migrateTiledParams } from '../backend/tiledMigrate';
import { runLlm } from '../backend/llm';
import { formatFor, NO_AESTHETIC } from '../backend/promptStyle';

/** duration (s) of a video, from the browser; 0 when it cannot be told */
function videoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
    const done = (d = 0) => { v.removeAttribute('src'); resolve(Number.isFinite(d) ? d : 0); };
    v.onloadedmetadata = () => done(v.duration); v.onerror = () => done(); setTimeout(() => done(), 6000); v.src = url;
  });
}
const sizeAndFps = async (url: string): Promise<{ w: number; h: number; fps: number; total: number }> => {
  const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
  const wh = await new Promise<{ w: number; h: number }>((res) => { v.onloadedmetadata = () => res({ w: v.videoWidth || 1280, h: v.videoHeight || 720 }); v.onerror = () => res({ w: 1280, h: 720 }); setTimeout(() => res({ w: 1280, h: 720 }), 6000); v.src = url; });
  const dur = await videoDuration(url);
  return { ...wh, fps: 24, total: Math.floor(dur * 24) };
};

/** a frame of a video at time t (s), as a data URL (long edge ≤ 640); null when the browser cannot read it */
async function grabFrame(url: string, t: number): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video'); v.preload = 'auto'; v.muted = true; v.crossOrigin = 'anonymous';
    let done = false; const end = (c: HTMLCanvasElement | null) => { if (done) return; done = true; v.removeAttribute('src'); resolve(c); };
    v.onloadedmetadata = () => { v.currentTime = Math.min(Math.max(0, t), Math.max(0, (v.duration || t) - 0.001)); };
    v.onseeked = () => {
      const k = Math.min(1, 640 / Math.max(v.videoWidth || 1, v.videoHeight || 1)); const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round((v.videoWidth || 640) * k)); c.height = Math.max(1, Math.round((v.videoHeight || 360) * k));
      try { c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height); end(c); } catch { end(null); }
    };
    v.onerror = () => end(null); setTimeout(() => end(null), 8000); v.src = url;
  });
}

/**
 * Last resort (node v1.53.1 spec 4): a clip with no usable prompt gets a First/Last-frame brief written from its first and last frame
 * (put side by side in one picture: the vision step takes one image). An existing prompt that is for another mode (reference tags, an LTX prompt) is revised, not thrown away.
 */
async function writeFirstLastBrief(url: string, duration: number, base: string, c: Ctx): Promise<string> {
  const a = await grabFrame(url, 0.05), b = await grabFrame(url, Math.max(0.05, duration - 0.05));
  if (!a || !b) return '';
  const both = document.createElement('canvas'); both.width = a.width + b.width + 8; both.height = Math.max(a.height, b.height);
  const g = both.getContext('2d')!; g.fillStyle = '#000'; g.fillRect(0, 0, both.width, both.height); g.drawImage(a, 0, 0); g.drawImage(b, a.width + 8, 0);
  const asset: Asset = { id: 'ppframes', type: 'image', url: both.toDataURL('image/jpeg', 0.9) };
  c.progress(1, 'reading the first and last frame…');
  const seen = await runLlm({ system: '', prompt: 'The left picture is the first frame of a short video and the right picture is its last frame. Describe who or what is in them, the setting, the look, and what changes from the first frame to the last (movement, camera, expressions).', images: [asset], where: 'bottom' });
  if (!seen.trim()) return '';
  c.progress(1, 'writing the First/Last frame prompt…');
  const note = base.trim() ? `\n\n(This is the clip's existing prompt, written for another mode or model (reference tags like <Picture N> / @name, or an LTX-style prompt). Revise it into a First/Last-frame brief: keep its story, actions, camera, dialogue, sound and style, and replace every reference tag with what the starting and ending frames actually show.)\n${base}` : '\n\n(no text supplied — base the brief on the frame analysis above)';
  const style = { ...formatFor('video-generate', 'h3'), aesthetic: NO_AESTHETIC, extra_instructions: 'Write a First/Last-frame video brief (the clip starts on the first frame and ends on the last). Dialogue wrapped in <d> </d> stays exactly as it is.' };
  return (await runLlm({ system: '', prompt: `Frame analysis of the first and last frame:\n${seen}${note}`, style, where: 'bottom' })).trim();
}

/** An H3 brief (as opposed to an LTX prompt) is told by its section names; a base brief has no reference tags (spec 2b prompt rule) */
const isH3Brief = (t: string) => /\[Shot|<Picture|subject_definitions|technical_settings|integrated_multimodal_description/.test(t);
const isBaseBrief = (t: string) => /integrated_multimodal_description|\[Shot 1\]/.test(t) && !/<Picture|<Video|<Audio|@\w/.test(t);

/** Latent Upscale (Use H3): re-run the last step of a finished 8-step H3 clip at a bigger size; Split mode does it piece by piece (spec 1) */
export async function runH3Lat(c: Ctx): Promise<Asset[]> {
  try { return await runH3LatCore(c); } finally { clearPlan(c.node.id); }
}

async function runH3LatCore(c: Ctx): Promise<Asset[]> {
  const resume = takeResume(c.node.id) as Record<string, any> | undefined;   // set when the page was reloaded in the middle of this run
  const p = migrateTiledParams(c.p); const s = useSettings.getState();
  const v = need(c.inputs('video')[0], 'Video');
  const metaPrompt = String((v.meta as { prompt?: string } | undefined)?.prompt ?? '');
  let prompt = resume ? String(resume.prompt) : c.text('prompt').trim() || (isBaseBrief(metaPrompt) ? metaPrompt : '');
  // order: the Prompt input, then the clip's own H3 prompt (no LLM), and only then a First/Last-frame brief written from the first and last frame
  if (!prompt) {
    const dur = await videoDuration(v.url);
    try { prompt = dur > 0 ? await writeFirstLastBrief(v.url, dur, c.text('prompt').trim() || metaPrompt, c) : ''; } catch (e) { throw new Error(`Latent Upscale (Use H3): could not write a prompt from the first and last frame (${(e as Error).message}). Connect the clip's H3 prompt to the Prompt input.`); }
  }
  if (!prompt) throw new Error("Latent Upscale (Use H3): connect the clip's H3 prompt to the Prompt input (this clip carries no usable prompt of its own).");
  c.progress(2, 'uploading video…');
  const file = await ensureInput(v);
  const info = await sizeAndFps(v.url);
  const kind = str(p.h3_kind, 'fl') === 'ref' ? 'ref' : 'fl';
  const cfg = await getJson<Record<string, any>>('/minimax_h3_one/config').catch(() => ({} as Record<string, any>));
  const turbo = str(p.h3_turbo, 'pdd') === 'none' ? 'none' : 'pdd';
  const own = str(kind === 'ref' ? p.h3_pdd_file_ref : p.h3_pdd_file, 'none');
  const pddFile = own !== 'none' ? own : (s.h3Turbo[kind] || String((kind === 'ref' ? cfg.pdd_file_reference || cfg.pdd_file : cfg.pdd_file) ?? ''));
  const lastFixed = str(p.h3_last, 'same') === 'fixed';
  const lastModel = str(p.h3_last_model, 'none') !== 'none' ? str(p.h3_last_model) : String(cfg.hires_last_model ?? '');
  const upscaler = str(p.h3_upscaler, 'h3') === 'tiled' ? 'tiled' : 'h3';
  const finalMp = upscaler === 'tiled' ? num(p.h3_tiled_final_mp, 2) : num(p.h3_final_mp, 1.6);
  const sv = num(p.seed, -1);
  const seed = typeof resume?.seed === 'number' ? resume.seed : sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv;
  // non-blocking notices (the run goes on): they prevent runs that can take over an hour
  const ratio = Math.sqrt((finalMp * 1e6) / (info.w * info.h));
  if (ratio < 1.3 && (upscaler === 'h3' || str(p.h3_tiled_up, 'neural') === 'neural')) c.progress(3, `This is a ×${ratio.toFixed(2)} upscale. The neural upscaler is made for about ×2 and leaves a diagonal grid on fine textures (hair, fabric) near ×1. Raise Final MP, or use the Tiled upscaler with Bicubic for a small ratio.`);
  if (upscaler === 'h3' && finalMp > 1.6) c.progress(3, 'On a 16 GB VRAM card, above 1.6 MP the H3 Latent Upscaler can run out of VRAM and spill to the CPU (an hour or more). 1.6 is its sweet spot; the Tiled upscaler handles 2.0.');
  const job = {
    file, fps: info.fps, srcW: info.w, srcH: info.h, finalMp, prompt, kind, hasAudio: p.h3_audio !== false, seed,
    turbo, pddFile, pddStrength: num(p.h3_pdd_strength, 1), lastFixed, lastModel, upscaler, tiledUp: (['neural', 'bicubic', 'trilinear'].includes(str(p.h3_tiled_up)) ? str(p.h3_tiled_up) : 'neural') as 'neural',
    noOpt: !!p.h3_no_opt, chunkRows: num(p.h3_chunk_rows, 2048), models: s.video, saveSubfolder: s.saveSubfolder,
    totalSteps: Math.max(2, Math.round(num(p.h3_steps, 8))), highSteps: Math.max(1, Math.round(num(p.h3_high_steps, 1))),
  } as const;
  const plan = p.h3_split && info.total > 0 ? h3SegmentPlan(str(p.h3_split_mode, 'seconds') === 'count' ? 'count' : 'seconds', num(p.h3_split_sec, 5), num(p.h3_split_cnt, 2), info.total, info.fps) : { passes: [], overlap: 0 };
  // marked like a 7+1 clip (hires border / badge) and as a postprocess result; never hiresFinish (Reuse would switch 7+1 on)
  const runOne = async (frames: number, skip: number, suffix: string, label: string, pid?: { attach?: string; onQueued?: (id: string) => void }) => {
    const g = await buildH3LatGraph({ ...job, frames, skip, stem: `canvers${suffix}` });
    const meta = { ...v.meta, postProcess: true, postUpscale: { method: 'h3lat', upscaler, finalMp }, postPrompt: prompt, hires: { startW: g.start.w, startH: g.start.h, scale: g.final.w / g.start.w } };
    const res = await runPrompt(g.graph, { onProgress: (pct, l) => c.progress(pct, `${label}${l ?? ''}`), signal: c.signal, meta, ...pid });
    const f = (res.raw[g.save]?.gifs ?? res.raw[g.save]?.images ?? res.raw[g.save]?.videos ?? [])[0];
    if (!f) throw new Error('ComfyUI returned no video');
    return { file: { filename: f.filename as string, subfolder: (f.subfolder ?? '') as string }, meta };
  };
  let result: { filename: string; subfolder: string }; let meta: Record<string, any>;
  if (plan.passes.length < 2) {
    ({ file: result, meta } = await runOne(h3LatFrames(info.total), 0, '', ''));
  } else {
    const N = plan.passes.length; const parts: { filename: string; subfolder: string }[] = resume?.parts ?? [];
    const save = (promptId?: string) => writePlan(c.node.id, { kind: 'h3latseg', prompt, seed, parts, promptId });
    let m0: Record<string, any> = {};
    let follow = resume?.promptId ? String(resume.promptId) : '';
    for (let i = parts.length; i < N; i++) {
      if (c.signal?.aborted) throw new Error('cancelled');
      const w = plan.passes[i];
      // after a reload: follow the piece that was in flight (queued or already finished) instead of making it again
      let attach: string | undefined;
      if (follow) { const r = await recoverPrompt(follow); if (r === 'failed') throw new Error(`piece ${i + 1} failed while the page was closed`); attach = r === null ? undefined : follow; follow = ''; }
      save();
      const label = `H3 segment ${i + 1}/${N} (frames ${w.skip}–${w.skip + w.cap}) `;
      c.progress(2 + Math.round((96 * i) / N), label);
      const r = await runOne(w.cap, w.skip, `_seg${String(i).padStart(2, '0')}`, label, { attach, onQueued: (id) => save(id) });
      parts.push(r.file); m0 = r.meta; save();
      await freeModels();   // VRAM is freed between pieces
    }
    if (!Object.keys(m0).length) m0 = { ...v.meta, postProcess: true, postUpscale: { method: 'h3lat', upscaler, finalMp }, postPrompt: prompt };
    c.progress(98, `joining ${N} segments with ffmpeg…`);
    // the pieces are cut from the source, so its own soundtrack goes under the joined clip (joining the pieces' sound leaves AAC padding at every join)
    const st = await stitchClips(parts, `${s.saveSubfolder}/canvers_h3lat_full`, plan.overlap / info.fps, { filename: file, subfolder: '', type: 'input', start: 0 });
    if (!st.ok || !st.filename) throw new Error(`stitch failed: ${st.error ?? 'unknown'}`);
    result = { filename: st.filename, subfolder: st.subfolder ?? '' }; meta = m0;
    for (const q of parts) { try { await deleteOutput(q.filename, q.subfolder); } catch { /* the piece stays in the gallery */ } }
  }
  const out = assetFromFile({ filename: result.filename, subfolder: result.subfolder, type: 'output' }, 'video', 'video');
  out.meta = meta;
  return [out];
}

const rtx2 = (p: Record<string, any>): RtxSize => ({ mode: str(p.p2_mode, 'scale'), scale: num(p.p2_scale, 2), short: num(p.p2_short, 1080), long: num(p.p2_long, 1920), w: num(p.p2_w, 1920), h: num(p.p2_h, 1080), anchor: str(p.p2_anchor, 'center'), quality: str(p.p2_quality, 'ULTRA') });

/** LTX 2.5 Upscale: 2× latent upscale + a light refine; Split mode cuts a long clip into 8n+1-frame pieces, each anchored on the last frame of the one before, then joins them */
export async function runLtxUpscale(c: Ctx): Promise<Asset[]> {
  try { return await runLtxUpscaleCore(c); } finally { clearPlan(c.node.id); }
}

async function runLtxUpscaleCore(c: Ctx): Promise<Asset[]> {
  const resume = takeResume(c.node.id) as Record<string, any> | undefined;   // set when the page was reloaded in the middle of this run
  const p = c.p; const s = useSettings.getState();
  const v = need(c.inputs('video')[0], 'Video');
  const metaPrompt = String((v.meta as { prompt?: string } | undefined)?.prompt ?? '');
  const prompt = resume ? String(resume.prompt) : c.text('prompt').trim() || (metaPrompt && !isH3Brief(metaPrompt) ? metaPrompt : '');
  // shortcut: an H3 brief is not rewritten as an LTX prompt here and there is no frames → vision step; give an LTX prompt
  if (!prompt) throw new Error('LTX 2.5 Upscale: connect an LTX prompt to the Prompt input (this clip carries none).');
  c.progress(2, 'uploading video…');
  const file = await ensureInput(v);
  const info = await sizeAndFps(v.url);
  const sv = num(p.seed, -1); const seed = typeof resume?.seed === 'number' ? resume.seed : sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv;
  const job = { prompt, negative: 'bad anatomy, inconsistent look, low resolution,', steps: num(p.ltx_steps, 4), denoise: num(p.ltx_denoise, 0.15), sampler: str(p.ltx_sampler, 'euler_ancestral'), scheduler: str(p.ltx_scheduler, 'simple'), seed, loras: cardLoras(c), models: s.video, saveSubfolder: s.saveSubfolder, stem: 'canvers' };
  const mode = str(p.split_mode, 'off'), value = Math.max(1, num(p.split_value, 5));
  let pieces = info.total;   // frames per piece; 0 total = unknown length, run whole
  if (mode !== 'off' && info.total > 0) { const want = mode === 'seconds' ? Math.round(value * info.fps) : Math.ceil(info.total / value); pieces = Math.max(9, Math.floor((want - 1) / 8) * 8 + 1); }
  let result: { filename: string; subfolder: string };
  const runOne = async (extra: { skip?: number; cap?: number; anchor?: string }, label: string, pid?: { attach?: string; onQueued?: (id: string) => void }) => {
    const g = await buildRefineGraph({ file, ...job, ...extra });
    const res = await runPrompt(g.graph, { onProgress: (pct, l) => c.progress(pct, `${label} ${l ?? ''}`), signal: c.signal, ...pid });
    const f = (res.raw[g.save]?.gifs ?? res.raw[g.save]?.images ?? res.raw[g.save]?.videos ?? [])[0];
    if (!f) throw new Error('ComfyUI returned no video');
    return { filename: f.filename as string, subfolder: (f.subfolder ?? '') as string };
  };
  if (mode === 'off' || info.total <= 0 || pieces >= info.total) result = await runOne({}, '');
  else {
    const outs: { filename: string; subfolder: string }[] = resume?.outs ?? []; let anchor: string | undefined = resume?.anchor ? String(resume.anchor) : undefined;
    const plan = (at: number, promptId?: string) => writePlan(c.node.id, { kind: 'ltxup', prompt, seed, outs, anchor, at, promptId });
    for (let at = Number(resume?.at ?? 0), i = outs.length + 1; at < info.total; at += pieces, i++) {
      if (c.signal?.aborted) throw new Error('cancelled');
      const n = Math.ceil(info.total / pieces);
      // after a reload: follow the piece that was in flight (queued or already finished) instead of making it again
      let attach: string | undefined;
      if (resume && at === Number(resume.at) && resume.promptId) { const r = await recoverPrompt(String(resume.promptId)); if (r === 'failed') throw new Error(`piece ${i} failed while the page was closed`); attach = r === null ? undefined : String(resume.promptId); }
      plan(at);
      outs.push(await runOne({ skip: at, cap: Math.min(pieces, info.total - at), anchor }, `piece ${i}/${n}`, { attach, onQueued: (id) => plan(at, id) }));
      const lf = await clipLastFrame(outs[outs.length - 1].filename, outs[outs.length - 1].subfolder);
      if (!lf.ok || !lf.filename) throw new Error(`piece ${i}: could not take the last frame (${lf.error ?? 'unknown'})`);
      anchor = lf.filename;
    }
    c.progress(98, 'joining the pieces…');
    const st = await stitchClips(outs, `${s.saveSubfolder}/canvers_LTXUP_full`);
    if (!st.ok || !st.filename) throw new Error(`stitch failed: ${st.error ?? 'unknown'}`);
    result = { filename: st.filename, subfolder: st.subfolder ?? '' };
  }
  if (p.two_pass) {
    const inName = (await copyToInput({ filename: result.filename, subfolder: result.subfolder, type: 'output' })).filename;
    const g = await buildPostGraph({ fps: info.fps, file: inName, step: { kind: 'upscale', method: 'rtx', srcW: info.w * 2, srcH: info.h * 2, flashvsr: { model: '', mode: '', scale: 2, colorFix: true, tileSize: 384, tileOverlap: 32, seed: 42 }, rtx: rtx2(p), modelName: 'none', twoPass: false, pass2: rtx2(p) }, folder: s.saveSubfolder, stem: 'canvers' });
    const res = await runPrompt(g.graph, { onProgress: c.progress, signal: c.signal });
    const f = (res.raw[g.save]?.gifs ?? res.raw[g.save]?.images ?? res.raw[g.save]?.videos ?? [])[0];
    if (f) result = { filename: f.filename, subfolder: f.subfolder ?? '' };
  }
  const out = assetFromFile({ filename: result.filename, subfolder: result.subfolder, type: 'output' }, 'video', 'video');
  out.meta = { ...v.meta, postProcess: true, postUpscale: { method: 'ltx', split: mode }, postPrompt: prompt };
  return [out];
}
