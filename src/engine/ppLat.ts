// Postprocess → Video Upscale methods that need a prompt: "Latent Upscale (Use H3)" (h3lat) and "LTX 2.5 Upscale" (ltx, with Split mode).
import type { Asset } from '../types';
import type { Ctx } from './run';
import { assetFromFile, clearPlan, ensureInput, recoverPrompt, runPrompt, takeResume, writePlan } from '../backend/comfy';
import { getJson } from '../backend/http';
import { buildH3LatGraph, h3LatFrames } from '../backend/h3Lat';
import { clipLastFrame, copyToInput, stitchClips } from '../backend/h3';
import { buildRefineGraph } from '../backend/ltxRefine';
import { buildPostGraph, type RtxSize } from '../backend/post';
import { useSettings } from '../store/settings';
import { need, num, str } from './util';
import { cardLoras } from './more';

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

/** An H3 brief (as opposed to an LTX prompt) is told by its section names; a base brief has no reference tags (spec 2b prompt rule) */
const isH3Brief = (t: string) => /\[Shot|<Picture|subject_definitions|technical_settings|integrated_multimodal_description/.test(t);
const isBaseBrief = (t: string) => /integrated_multimodal_description|\[Shot 1\]/.test(t) && !/<Picture|<Video|<Audio|@\w/.test(t);

/** Latent Upscale (Use H3): re-run the last step of a finished 8-step H3 clip at a bigger size */
export async function runH3Lat(c: Ctx): Promise<Asset[]> {
  const p = c.p; const s = useSettings.getState();
  const v = need(c.inputs('video')[0], 'Video');
  const metaPrompt = String((v.meta as { prompt?: string } | undefined)?.prompt ?? '');
  const prompt = c.text('prompt').trim() || (isBaseBrief(metaPrompt) ? metaPrompt : '');
  // shortcut: no per-clip meta for frames → vision → H3 brief yet; connect a Prompt card (or use a clip made by Video Generate), same as the node would write
  if (!prompt) throw new Error('Latent Upscale (Use H3): connect the clip\'s H3 prompt to the Prompt input (this clip carries no usable prompt of its own).');
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
  const upscaler = str(p.h3_upscaler, 'h3') === 'kimchy' ? 'kimchy' : 'h3';
  const finalMp = upscaler === 'kimchy' ? num(p.h3_kim_final_mp, 2) : num(p.h3_final_mp, 1.6);
  const sv = num(p.seed, -1);
  // non-blocking notices (the run goes on): they prevent runs that can take over an hour
  const ratio = Math.sqrt((finalMp * 1e6) / (info.w * info.h));
  if (ratio < 1.3 && (upscaler === 'h3' || str(p.h3_kim_up, 'neural') === 'neural')) c.progress(3, `This is a ×${ratio.toFixed(2)} upscale. The neural upscaler is made for about ×2 and leaves a diagonal grid on fine textures (hair, fabric) near ×1. Raise Final MP, or use the Kimchy upscaler with Bicubic for a small ratio.`);
  if (upscaler === 'h3' && finalMp > 1.6) c.progress(3, 'On a 16 GB VRAM card, above 1.6 MP the H3 Latent Upscaler can run out of VRAM and spill to the CPU (an hour or more). 1.6 is its sweet spot; the Kimchy upscaler handles 2.0.');
  const g = await buildH3LatGraph({
    file, frames: h3LatFrames(info.total), fps: info.fps, srcW: info.w, srcH: info.h, finalMp, prompt, kind, hasAudio: p.h3_audio !== false, seed: sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv,
    turbo, pddFile, pddStrength: num(p.h3_pdd_strength, 1), lastFixed, lastModel, upscaler, kimUp: (['neural', 'bicubic', 'trilinear'].includes(str(p.h3_kim_up)) ? str(p.h3_kim_up) : 'neural') as 'neural',
    noOpt: !!p.h3_no_opt, chunkRows: num(p.h3_chunk_rows, 2048), models: s.video, saveSubfolder: s.saveSubfolder, stem: 'canvers',
  });
  // marked like a 7+1 clip (hires border / badge) and as a postprocess result; never hiresFinish (Reuse would switch 7+1 on)
  const meta = { ...v.meta, postProcess: true, postUpscale: { method: 'h3lat', upscaler, finalMp }, postPrompt: prompt, hires: { startW: g.start.w, startH: g.start.h, scale: g.final.w / g.start.w } };
  const res = await runPrompt(g.graph, { onProgress: c.progress, signal: c.signal, meta });
  const f = (res.raw[g.save]?.gifs ?? res.raw[g.save]?.images ?? res.raw[g.save]?.videos ?? [])[0];
  if (!f) throw new Error('ComfyUI returned no video');
  const out = assetFromFile({ filename: f.filename, subfolder: f.subfolder ?? '', type: 'output' }, 'video', 'video');
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
