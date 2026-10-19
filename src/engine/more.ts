// Runners for the card-style nodes: LoRA / H3 option cards / Asset Library, the Postprocess steps,
// Face Refine and Character Sheet.  Every node here talks to ComfyUI through the STUDIO_ONE / TJ_NODE API.
import type { Asset } from '../types';
import type { Ctx } from './run';
import { assetFromFile, ensureInput, runPrompt } from '../backend/comfy';
import { DEFAULT_OPT, copyToInput, type H3Options } from '../backend/h3';
import { buildPostGraph, type PostStep, type RtxSize } from '../backend/post';
import { buildH3ImageGraph } from '../backend/h3Image';
import { buildLtxGraph, ltxSize } from '../backend/ltx';
import { loadBitmap } from '../editing/ops';
import { beatDetect, bridgeClip, itdaFileUrl, itdaUpload, sceneDetect } from '../backend/itda';
import { buildRefineGraph } from '../backend/ltxRefine';
import { stitchClips } from '../backend/h3';
import { addVideoLoad, addVideoSave } from '../backend/post';
import { buildFaceRefineGraph } from '../backend/faceRefine';
import { CHARSHEET_PROMPT, CHARSHEET_DEFAULT_FRAMES, buildSheetGridGraph, buildSheetVideoGraph } from '../backend/charSheet';
import { libFile, listAssets, resolveRefs, type LibAsset } from '../backend/assetlib';
import { useSettings } from '../store/settings';
import { need, num, str, textAsset } from './util';
import { uid } from '../backend/comfy';

type Runner = (c: Ctx) => Promise<Asset[]>;
type Lora = { name: string; strength: number };

const parse = (a: Asset | undefined): any => { try { return a?.text ? JSON.parse(a.text) : null; } catch { return null; } };
const real = (l: Lora) => !!l.name && l.name !== 'none' && l.strength !== 0;

/** every LoRA delivered by LoRA cards wired into this node (cards can be chained) */
export function cardLoras(c: Ctx): Lora[] {
  return c.inputs('loras').flatMap((a) => (parse(a)?.items ?? []) as Lora[]).filter(real);
}

export interface H3Cards { turbo?: any; speed?: any; lock?: any }
/** the H3 option cards wired into this node, merged by kind */
export function h3Cards(c: Ctx): H3Cards {
  const out: H3Cards = {};
  for (const a of c.inputs('cards')) { const j = parse(a); if (j?.kind === 'turbo') out.turbo = j; else if (j?.kind === 'speed') out.speed = j; else if (j?.kind === 'lock') out.lock = j; }
  return out;
}

export function optFromCards(cards: H3Cards): H3Options {
  const t = cards.turbo, s = cards.speed;
  return {
    ...DEFAULT_OPT,
    ...(s ? { attnBackend: s.attn_backend, attnForward: s.attn_forward, optimizer: s.optimizer, blockCache: s.block_cache, spectrum: !!s.spectrum, fusedModulation: !!s.fused_mod, shiftVideo: s.shift_video, shiftAudio: s.shift_audio } : {}),
    ...(t ? { turbo: t.turbo, turboLora: t.turbo_lora, turboStrength: t.turbo_strength, turboSteps: t.turbo_steps, hires: !!t.hires, hiresStartMp: t.hires_start_mp, hiresFinalMp: t.hires_final_mp } : {}),
  };
}

// ---- helpers
/** the stitcher reads ComfyUI's output folder: bring a video there first when it lives elsewhere */
async function asOutputClip(a: Asset, c: Ctx): Promise<{ filename: string; subfolder: string }> {
  if (a.file?.type === 'output') return { filename: a.file.filename, subfolder: a.file.subfolder };
  const g: Record<string, any> = {}; await addVideoLoad(g, await ensureInput(a), 'L');
  const save = await addVideoSave(g, ['L', 0], ['L', 2], 24, `${useSettings.getState().saveSubfolder}/stitch_src`, 'T');
  const r = await runPrompt(g, { signal: c.signal }); const f = outFile(r.raw, save);
  return { filename: f.filename, subfolder: f.subfolder };
}

async function videoSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    const done = (w = 1280, h = 720) => { v.removeAttribute('src'); resolve({ w: w || 1280, h: h || 720 }); };
    v.preload = 'metadata'; v.muted = true;
    v.onloadedmetadata = () => done(v.videoWidth, v.videoHeight);
    v.onerror = () => done();
    setTimeout(() => done(), 6000);
    v.src = url;
  });
}

/** estimate the frame rate of a video by timing a few decoded frames (browser); null when it cannot be told */
async function videoFps(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video') as HTMLVideoElement & { requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => void };
    if (!v.requestVideoFrameCallback) return resolve(null);
    const times: number[] = []; let ended = false;
    const finish = () => {
      if (ended) return; ended = true; v.pause(); v.removeAttribute('src');
      const d = times.slice(1).map((t, i) => t - times[i]).filter((x) => x > 0.001);
      if (d.length < 3) return resolve(null);
      d.sort((a, b) => a - b); const med = d[Math.floor(d.length / 2)];
      const fps = 1 / med; const common = [8, 12, 15, 16, 20, 24, 25, 30, 48, 50, 60];
      const near = common.find((c) => Math.abs(c - fps) < 0.6); resolve(near ?? Math.round(fps * 100) / 100);
    };
    const tick = (_: number, m: { mediaTime: number }) => { times.push(m.mediaTime); if (times.length >= 14) finish(); else v.requestVideoFrameCallback!(tick); };
    v.muted = true; v.playsInline = true; v.onerror = () => finish();
    v.onloadeddata = () => { v.requestVideoFrameCallback!(tick); void v.play().catch(finish); };
    setTimeout(finish, 5000); v.src = url;
  });
}

const outFile = (raw: Record<string, any>, node: string) => {
  const o = raw[node] ?? {};
  const f = (o.gifs ?? o.images ?? o.videos ?? [])[0];
  if (!f) throw new Error('ComfyUI returned no file');
  return { filename: f.filename as string, subfolder: (f.subfolder ?? '') as string, type: (f.type ?? 'output') as 'output' };
};

const rtxOf = (p: Record<string, any>, pre: string): RtxSize => ({
  mode: str(p[`${pre}mode`], 'scale'), scale: num(p[`${pre}scale`], 2), short: num(p[`${pre}short`], 1080), long: num(p[`${pre}long`], 1920),
  w: num(p[`${pre}w`], 1920), h: num(p[`${pre}h`], 1080), anchor: str(p[`${pre}anchor`], 'center'), quality: str(p[`${pre}quality`], 'ULTRA'),
});

function post(stepOf: (c: Ctx, size: { w: number; h: number }) => PostStep): Runner {
  return async (c) => {
    const v = need(c.inputs('video')[0], 'Video');
    c.progress(2, 'uploading video…');
    const file = await ensureInput(v);
    const size = await videoSize(v.url);
    const step = stepOf(c, size);
    const fps = num(c.p.fps, 0) > 0 ? num(c.p.fps, 24) : (await videoFps(v.url)) ?? 24;
    const g = await buildPostGraph({ fps, cap: Math.max(0, Math.round(num(c.p.preview_frames, 0))), file, step, folder: useSettings.getState().saveSubfolder, stem: 'canvers' });
    const res = await runPrompt(g.graph, { onProgress: c.progress, signal: c.signal });
    return [assetFromFile(outFile(res.raw, g.save), 'video', 'video')];
  };
}

const withLegacySeed = (c: Ctx) => { const si = c.inputs('seed_in')[0]; const sv = si ? num(si.text, -1) : num(c.p.seed, -1); return sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv; };

export const EXTRA_RUNNERS: Record<string, Runner> = {
  // ---------------- cards
  'lora-card': async (c) => {
    const upstream = c.inputs('lora_in').flatMap((a) => (parse(a)?.items ?? []) as Lora[]);
    const mine: Lora = { name: str(c.p.lora, 'none'), strength: num(c.p.strength, 1) };
    return [textAsset(JSON.stringify({ kind: 'lora', items: [...upstream, ...(real(mine) ? [mine] : [])] }), 'lora')];
  },
  'h3-turbo': async (c) => [textAsset(JSON.stringify({ kind: 'turbo', ...c.p }), 'card')],
  'h3-speed': async (c) => [textAsset(JSON.stringify({ kind: 'speed', ...c.p }), 'card')],
  'h3-audiolock': async (c) => {
    const a = need(c.inputs('audio')[0], 'Audio');
    return [textAsset(JSON.stringify({ kind: 'lock', file: await ensureInput(a), mode: str(c.p.lock_mode, 'lock'), strength: num(c.p.lock_strength, 0.5), fit: str(c.p.lock_fit, 'pad_silence') }), 'card')];
  },
  'asset-library': async (c) => {
    const project = str(c.p.project).trim();
    const ids = str(c.p.ids).split(/[,\s]+/).filter(Boolean);
    if (!project && !ids.length) throw new Error('Pick assets or a project on the Asset Library card first');
    const r = await resolveRefs(project ? 'project' : 'assets', project || undefined, ids);
    if (r.errors?.length) throw new Error(r.errors.map((e) => e.message).join('; '));
    const all: LibAsset[] = await listAssets().catch(() => []);
    const byId = new Map(all.map((a) => [String(a.id), a]));
    const attached: { id: number; alias?: string; kind: string; name: string; label: string; mention?: string | null }[] = r.attached ?? ids.map((id) => ({ id: Number(id), kind: byId.get(id)?.kind ?? 'image', name: byId.get(id)?.name ?? id, label: '', mention: null }));
    const images: Asset[] = attached.filter((a) => a.kind === 'image' || a.kind === 'set').map((a) => ({ id: uid(), type: 'image' as const, url: libFile(a.id), port: 'image', meta: { assetId: a.id, name: a.name } }));
    const mentions = attached.map((a) => `@${a.mention || a.alias || a.id}`).join(' ');
    const sel = project ? { project, ids: attached.map((a) => String(a.id)) } : { ids: attached.map((a) => String(a.id)) };
    return [...images, textAsset(mentions, 'mentions'), textAsset(JSON.stringify({ kind: 'assetlib', ...sel }), 'assets')];
  },

  // ---------------- postprocess steps
  'pp-deblur': post((c) => ({ kind: 'deblur', strength: str(c.p.strength, 'MEDIUM') })),
  'pp-denoise': post((c) => ({ kind: 'denoise', strength: str(c.p.strength, 'MEDIUM') })),
  'pp-upscale': post((c, s) => {
    const p = c.p; const method = (c.engineId ?? 'flashvsr') as 'flashvsr' | 'rtx' | 'model';
    return { kind: 'upscale', method, srcW: s.w, srcH: s.h,
      flashvsr: { model: str(p.fv_model, 'FlashVSR-v1.1'), mode: str(p.fv_mode, 'tiny'), scale: num(p.fv_scale, 2), colorFix: p.fv_color !== false, tileSize: num(p.fv_tile, 384), tileOverlap: num(p.fv_overlap, 32), seed: num(p.fv_seed, 42) },
      rtx: rtxOf(p, 'rtx_'), modelName: str(p.model_name, 'none'), twoPass: !!p.two_pass, pass2: rtxOf(p, 'p2_') };
  }),
  'pp-skin': post((c) => ({ kind: 'skin', evenness: num(c.p.evenness), smoothing: num(c.p.smoothing), redness: num(c.p.redness), shine: num(c.p.shine), blemish: str(c.p.blemish, 'off'), preserveMarks: c.p.preserve !== false, microtexture: num(c.p.microtexture) })),
  'pp-grain': post((c) => ({ kind: 'grain', amount: num(c.p.amount, 0.25), size: num(c.p.size, 1), color: num(c.p.color), lumBias: num(c.p.lum_bias), noise: str(c.p.noise, 'smooth') as 'smooth' })),
  'pp-interpolate': post((c) => ({ kind: 'interpolate', targetFps: num(c.p.target_fps, 48), scale: num(c.p.scale, 1), modelName: str(c.p.model_name, 'flownet.pkl'), batchSize: num(c.p.batch, 8), fp16: c.p.fp16 !== false })),
  'pp-resize': post((c) => ({ kind: 'resize', mode: str(c.p.mode, 'Long side'), method: str(c.p.method, 'lanczos'), targetPx: num(c.p.target_px, 1920), ratioW: num(c.p.ratio_w, 16), ratioH: num(c.p.ratio_h, 9), megapixels: num(c.p.megapixels, 1), width: num(c.p.width, 1280), height: num(c.p.height, 720), crop: str(c.p.crop, 'crop') })),

  // ---------------- H3 still image
  'h3-image': async (c) => {
    const p = c.p; const s = useSettings.getState();
    const refs: string[] = []; for (const a of c.inputs('image').slice(0, 9)) refs.push(await ensureInput(a));
    const g = await buildH3ImageGraph({
      refs, prompt: c.text('prompt'), aspect: str(p.aspect, '1:1'), previewMp: num(p.preview_mp, 0.5), finalMp: num(p.final_mp, 1.5), final: p.final !== false,
      steps: num(p.steps, 20), secondPassSteps: num(p.pass2, 3), fizgig: !!p.fizgig, refImageSize: str(p.ref_size, 'max'),
      opt: optFromCards(h3Cards(c)), loras: cardLoras(c), seed: withLegacySeed(c), models: s.video, saveSubfolder: s.saveSubfolder, stem: 'MMH3',
    });
    const res = await runPrompt(g.graph, { onProgress: c.progress, signal: c.signal });
    return [assetFromFile(outFile(res.raw, g.save), 'image', 'image')];
  },

  // ---------------- LTX Director (timeline)
  'ltx-director': async (c) => {
    const p = c.p; const s = useSettings.getState();
    const imgs = c.inputs('image');
    const times = str(p.image_times, '0').split(/[,\s]+/).filter(Boolean).map(Number);
    const files: string[] = []; for (const a of imgs) files.push(await ensureInput(a));
    const beats = str(p.beats).split('\n').map((l) => l.trim()).filter(Boolean).map((l, i) => {
      const m = /^\s*([\d.]+)\s*[-–~]\s*([\d.]+)\s*[:：]\s*(.+)$/.exec(l);
      if (!m) throw new Error(`Beat ${i + 1}: write it as  start-end: prompt  (for example  0-4: a man walks in)`);
      return { startSec: Number(m[1]), endSec: Number(m[2]), prompt: m[3].trim() };
    });
    let size: { width: number; height: number } | undefined;
    if (imgs[0] && str(p.aspect) === 'auto') { const bm = await loadBitmap(imgs[0]); size = ltxSize(`${bm.width}:${bm.height}`, num(p.megapixels, 1)); }
    const seconds = num(p.seconds, 8);
    const aud = c.inputs('audio')[0], mot = c.inputs('video')[0];
    const audio = aud ? { file: await ensureInput(aud), startSec: num(p.audio_start, 0) } : undefined;
    const motion = mot ? { file: await ensureInput(mot), startSec: num(p.motion_start, 0), strength: num(p.motion_strength, 1) } : undefined;
    const graph = await buildLtxGraph({
      prompt: c.text('prompt'), seconds, aspect: str(p.aspect, '16:9'), megapixels: num(p.megapixels, 1), seed: withLegacySeed(c),
      steps: num(p.steps, 12), cfg: num(p.cfg, 1), sampler: str(p.sampler, 'euler_ancestral'), scheduler: str(p.scheduler, 'linear_quadratic'), stage2Sigmas: str(p.stage2, '0.85, 0.7250, 0.4219, 0.0'),
      loras: cardLoras(c), models: s.video, saveSubfolder: s.saveSubfolder, size,
      timeline: { texts: beats, images: files.map((file, i) => ({ file, startSec: i === files.length - 1 && p.last_at_end ? seconds : (times[i] ?? 0), end: i === files.length - 1 && !!p.last_at_end })), audio, motion },
    });
    const res = await runPrompt(graph, { onProgress: c.progress, signal: c.signal });
    const f = res.videos[0] ?? res.images[0]; if (!f) throw new Error('ComfyUI returned no video');
    return [assetFromFile(f, 'video', 'video')];
  },

  // ---------------- Video edit (LTX 2.5 refine) and stitch
  'video-refine': async (c) => {
    const p = c.p; const s = useSettings.getState();
    const v = need(c.inputs('video')[0], 'Video'); c.progress(2, 'uploading video…');
    const g = await buildRefineGraph({ file: await ensureInput(v), prompt: c.text('prompt'), negative: str(p.negative, 'bad anatomy, inconsistent look, low resolution,'), steps: num(p.steps, 4), denoise: num(p.denoise, 0.15), sampler: str(p.sampler, 'euler_ancestral'), scheduler: str(p.scheduler, 'simple'), seed: withLegacySeed(c), loras: cardLoras(c), models: s.video, saveSubfolder: s.saveSubfolder, stem: 'MMH3' });
    const res = await runPrompt(g.graph, { onProgress: c.progress, signal: c.signal });
    return [assetFromFile(outFile(res.raw, g.save), 'video', 'video')];
  },
  'video-stitch': async (c) => {
    const vids = c.inputs('videos'); if (vids.length < 2) throw new Error('Connect at least two videos to stitch');
    const s = useSettings.getState();
    const clips: { filename: string; subfolder: string }[] = [];
    for (let i = 0; i < vids.length; i++) { c.progress(Math.round((i / vids.length) * 40), `preparing clip ${i + 1}…`); clips.push(await asOutputClip(vids[i], c)); }
    c.progress(60, 'stitching…');
    const ov = num(c.p.overlap, 0);
    const st = await stitchClips(clips, `${s.saveSubfolder}/stitch`, ov > 0 ? ov : undefined);
    if (!st.ok || !st.filename) throw new Error(`stitch failed: ${st.error ?? 'unknown'}`);
    return [assetFromFile({ filename: st.filename, subfolder: st.subfolder ?? '', type: 'output' }, 'video', 'video')];
  },
  'video-audio': async (c) => {
    const v = need(c.inputs('video')[0], 'Video'); const a = need(c.inputs('audio')[0], 'Audio');
    const s = useSettings.getState();
    c.progress(10, 'preparing…');
    const clip = await asOutputClip(v, c);
    const audioFile = await ensureInput(a);
    c.progress(50, 'mixing…');
    const st = await stitchClips([clip], `${s.saveSubfolder}/withaudio`, undefined, { filename: audioFile, type: 'input', start: num(c.p.start, 0) });
    if (!st.ok || !st.filename) throw new Error(`could not add the audio: ${st.error ?? 'unknown'}`);
    return [assetFromFile({ filename: st.filename, subfolder: st.subfolder ?? '', type: 'output' }, 'video', 'video')];
  },

  // ---------------- ITDA analysis
  'scene-detect': async (c) => {
    const v = need(c.inputs('video')[0], 'Video'); c.progress(10, 'uploading…');
    const r = await sceneDetect(await itdaUpload(v), num(c.p.threshold, 0.3));
    if (!r.ok) throw new Error(r.error ?? 'scene detection failed');
    const secs = (r.frames ?? []).map((f) => +(f / 24).toFixed(2));
    return [textAsset(secs.length ? `cuts at (s): ${secs.join(', ')}\nframes: ${(r.frames ?? []).join(', ')}` : 'no cuts found')];
  },
  'beat-detect': async (c) => {
    const a = c.inputs('media')[0]; if (!a) throw new Error('Media is not connected'); c.progress(10, 'uploading…');
    const r = await beatDetect(await itdaUpload(a));
    if (!r.ok) throw new Error(r.error ?? 'beat detection failed');
    const secs = (r.frames ?? []).map((f) => +(f / 24).toFixed(2));
    return [textAsset(`BPM ${r.bpm ?? '?'}\nbeats at (s): ${secs.join(', ')}`)];
  },

  'video-bridge': async (c) => {
    const a = need(c.inputs('a')[0], 'Clip A (before)'); const b = need(c.inputs('b')[0], 'Clip B (after)');
    c.progress(10, 'uploading…'); const pa = await itdaUpload(a); const pb = await itdaUpload(b);
    c.progress(50, 'building the transition…');
    const r = await bridgeClip(pa, pb, str(c.p.mode, 'interpolate') as 'interpolate', num(c.p.frames, 8));
    if (!r.ok || !r.path) throw new Error(r.error ?? 'could not build the transition');
    return [{ id: uid(), type: 'video', url: itdaFileUrl(r.path), port: 'video' }];
  },

  // ---------------- Face Refine
  'face-refine': async (c) => {
    const p = c.p; const s = useSettings.getState();
    const v = need(c.inputs('video')[0], 'Video');
    c.progress(2, 'uploading video…');
    const file = await ensureInput(v);
    const refs: string[] = []; for (const a of c.inputs('image').slice(0, 9)) refs.push(await ensureInput(a));
    const cards = h3Cards(c);
    const seed = withLegacySeed(c);
    // several faces picked in one shot = refine them one after another, each pass on the previous result
    const picks = str(p.picks).split(',').map((x) => x.trim()).filter(Boolean);
    const passes = p.select === 'manual' && p.pick_mode === 'chain' && picks.length > 1 ? picks : [str(p.picks)];
    let cur = file; let out: ReturnType<typeof outFile> | undefined;
    for (let i = 0; i < passes.length; i++) {
      const g = await buildFaceRefineGraph({
        file: cur, prompt: c.text('prompt'), refs, detector: str(p.detector, 'none'), fallback: str(p.fallback, 'none'), confidence: num(p.confidence, 0.35),
        select: str(p.select, 'largest_face'), confirmedPick: passes[i], cutDetection: !!p.cuts, cutThreshold: num(p.cut_threshold, 3),
        identityTrack: p.identity !== false, identityThreshold: num(p.identity_threshold, 0.45), identityModel: str(p.identity_model, 'insightface'),
        cropFactor: num(p.crop_factor, 2.5), canvasMode: str(p.canvas_mode, 'auto_capped_768'), canvasW: num(p.canvas_w, 768), canvasH: num(p.canvas_h, 768), smooth: num(p.smooth, 21),
        denoise: num(p.denoise, 0.4), mulSmall: num(p.mul_small, 1), mulLarge: num(p.mul_large, 0.35), pxSmall: num(p.px_small, 30), pxLarge: num(p.px_large, 120),
        steps: num(p.steps, 8), sampler: str(p.sampler, 'euler'), scheduler: str(p.scheduler, 'simple'),
        paste: str(p.paste, 'face_only'), feather: num(p.feather, 6), colour: num(p.colour, 1), blend: num(p.blend, 1), undetected: str(p.undetected, 'fade_out'),
        opt: optFromCards(cards), loras: cardLoras(c), models: s.video, seed: seed + i, saveSubfolder: s.saveSubfolder, stem: 'MMH3',
      });
      const res = await runPrompt(g.graph, { onProgress: (pct, l) => c.progress(Math.round((i + pct / 100) / passes.length * 100), `face ${i + 1}/${passes.length} ${l ?? ''}`), signal: c.signal });
      out = outFile(res.raw, g.save);
      if (i < passes.length - 1) cur = (await copyToInput(out)).filename;
    }
    return [assetFromFile(out!, 'video', 'video')];
  },

  // ---------------- Character Sheet
  'character-sheet': async (c) => {
    const p = c.p; const s = useSettings.getState();
    const refs: string[] = []; for (const a of need(c.inputs('image'), 'Character reference').slice(0, 9)) refs.push(await ensureInput(a));
    const frames = str(p.frames).split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n) && n >= 0);
    const v = await buildSheetVideoGraph({
      refs, refImageSize: str(p.ref_size, 'max'), prompt: c.text('prompt') || CHARSHEET_PROMPT, aspect: str(p.aspect, '3:4'), megapixels: num(p.megapixels, 0.9),
      firstPassMp: num(p.first_mp, 0.36), latentUpscale: !!p.latent_up, secondPassSteps: num(p.pass2, 3),
      deblur: str(p.deblur, 'none'), rtx: !!p.rtx, rtxSupersample: !!p.supersample, loras: cardLoras(c), seed: withLegacySeed(c),
      models: s.video, saveSubfolder: s.saveSubfolder, stem: 'MMH3',
    });
    const r1 = await runPrompt(v.graph, { onProgress: (pct, l) => c.progress(Math.round(pct * 0.85), l), signal: c.signal });
    const vf = outFile(r1.raw, v.save);
    c.progress(88, 'assembling the sheet…');
    const inName = (await copyToInput(vf)).filename;
    const gg = await buildSheetGridGraph({ video: inName, ref: refs[0], frames: frames.length ? frames : CHARSHEET_DEFAULT_FRAMES, cellW: v.width, cellH: v.height, maxDim: num(p.max_dim, 2048), saveEach: !!p.save_frames, folder: s.saveSubfolder, stem: 'MMH3' });
    const r2 = await runPrompt(gg.graph, { onProgress: (pct, l) => c.progress(88 + Math.round(pct * 0.12), l), signal: c.signal });
    return [assetFromFile(outFile(r2.raw, gg.save), 'image', 'image'), assetFromFile(vf, 'video', 'video')];
  },
};
