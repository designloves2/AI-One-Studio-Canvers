// Postprocess steps for a finished video (STUDIO_ONE "Postprocess" chain, one card per step):
// Deblur · Denoise · Upscale (FlashVSR / RTX VSR / model, optional 2nd RTX pass) · Skin Retouch · Film Grain ·
// Frame Interpolation · Resize.  Every card runs the same small graph: load video -> one step -> save video.
import { objectInfo } from './comfy';
import { FPS } from './ltx';

const nodeCache = new Map<string, Promise<boolean>>();
/** Is this ComfyUI class installed? (cached) */
export function hasNode(cls: string): Promise<boolean> {
  if (!nodeCache.has(cls)) nodeCache.set(cls, objectInfo(cls).then((r) => !!r?.[cls]).catch(() => false));
  return nodeCache.get(cls)!;
}
async function need(cls: string, label: string, pack?: string) {
  if (!(await hasNode(cls))) throw new Error(`${label} (${cls}) is not installed${pack ? ` — it comes with ${pack}` : ''}.`);
}

type L = [string, number];
export type PostStep =
  | { kind: 'deblur'; strength: string }
  | { kind: 'denoise'; strength: string }
  | { kind: 'upscale'; method: 'flashvsr' | 'rtx' | 'model'; srcW: number; srcH: number;
      flashvsr: { model: string; mode: string; scale: number; colorFix: boolean; tileSize: number; tileOverlap: number; seed: number };
      rtx: RtxSize; modelName: string; twoPass: boolean; pass2: RtxSize }
  | { kind: 'skin'; evenness: number; smoothing: number; redness: number; shine: number; blemish: string; preserveMarks: boolean; microtexture: number }
  | { kind: 'grain'; amount: number; size: number; color: number; lumBias: number; noise: 'smooth' | 'grainy' }
  | { kind: 'interpolate'; targetFps: number; scale: number; modelName: string; batchSize: number; fp16: boolean }
  | { kind: 'resize'; mode: string; method: string; targetPx: number; ratioW: number; ratioH: number; megapixels: number; width: number; height: number; crop: string };

export interface RtxSize { mode: string; scale: number; short: number; long: number; w: number; h: number; anchor: string; quality: string }

/** how the RTX VSR node should be sized for a source of srcW x srcH (+ an optional pre-crop for "exact size") */
export function rtxTarget(r: RtxSize, srcW: number, srcH: number) {
  const round8 = (v: number) => Math.max(8, Math.round(v / 8) * 8);
  if (r.mode === 'short' || r.mode === 'long') {
    const short = Math.min(srcW, srcH), long = Math.max(srcW, srcH);
    const target = Math.max(8, Math.round(r.mode === 'short' ? r.short : r.long));
    const other = r.mode === 'short' ? target * (long / short) : target * (short / long);
    const wSide = srcW <= srcH;
    const width = r.mode === 'short' ? (wSide ? target : round8(other)) : (wSide ? round8(other) : target);
    const height = r.mode === 'short' ? (wSide ? round8(other) : target) : (wSide ? target : round8(other));
    return { type: 'dims' as const, width: round8(width), height: round8(height), crop: null as null | { x: number; y: number; width: number; height: number } };
  }
  if (r.mode === 'wh') {
    const width = round8(r.w), height = round8(r.h);
    const ta = width / height, sa = srcW / srcH;
    let cw = srcW, ch = srcH;
    if (sa > ta) cw = Math.round(srcH * ta); else if (sa < ta) ch = Math.round(srcW / ta);
    const x = r.anchor === 'left' ? 0 : r.anchor === 'right' ? srcW - cw : Math.round((srcW - cw) / 2);
    const y = r.anchor === 'top' ? 0 : r.anchor === 'bottom' ? srcH - ch : Math.round((srcH - ch) / 2);
    return { type: 'dims' as const, width, height, crop: cw < srcW || ch < srcH ? { x, y, width: cw, height: ch } : null };
  }
  return { type: 'scale' as const, scale: r.scale, width: 0, height: 0, crop: null };
}

/** film grain fragment shader for ComfyUI core's GLSLShader (smooth or grainy noise, luminance weighted, optional colour grain) */
const GRAIN_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_image0;
uniform vec2 u_resolution;
uniform float u_float0; // amount
uniform float u_float1; // size
uniform float u_float2; // colour
uniform float u_float3; // luminance bias
uniform int   u_int0;   // 0 smooth, 1 grainy
in vec2 v_texCoord;
layout(location = 0) out vec4 fragColor0;
uint pcg(uint v){uint s=v*747796405u+2891336453u;uint w=((s>>((s>>28u)+4u))^s)*277803737u;return (w>>22u)^w;}
uint hash2d(uvec2 p){return pcg(p.x+pcg(p.y));}
float hashf(uvec2 p,uint o){return float(pcg(hash2d(p)+o))/float(0xffffffffu);}
float gauss(uvec2 p,uint o){return (hashf(p,o)+hashf(p,o+1u)+hashf(p,o+2u)+hashf(p,o+3u)-2.0)*0.7;}
float smoothNoise(vec2 p,uint o){
  vec2 i=floor(p);vec2 f=fract(p);f=f*f*f*(f*(f*6.0-15.0)+10.0);uvec2 u=uvec2(i);
  return mix(mix(gauss(u,o),gauss(u+uvec2(1u,0u),o),f.x),mix(gauss(u+uvec2(0u,1u),o),gauss(u+uvec2(1u,1u),o),f.x),f.y);
}
void main(){
  vec4 c=texture(u_image0,v_texCoord);
  float luma=dot(c.rgb,vec3(0.2126,0.7152,0.0722));
  vec2 uv=v_texCoord*u_resolution/max(u_float1,0.01);
  uvec2 gp=uvec2(uv);
  float g; vec3 rgb;
  if(u_int0==1){g=gauss(gp,0u);rgb=vec3(gauss(gp,100u),gauss(gp,200u),gauss(gp,300u));}
  else{g=smoothNoise(uv,0u);rgb=vec3(smoothNoise(uv,100u),smoothNoise(uv,200u),smoothNoise(uv,300u));}
  float lw=mix(1.0,1.0-luma,clamp(u_float3,0.0,1.0));
  vec3 gc=mix(vec3(g),rgb,clamp(u_float2,0.0,1.0));
  c.rgb+=gc*(u_float0*0.15)*lw;
  fragColor0=vec4(clamp(c.rgb,0.0,1.0),c.a);
}
`;

export interface PostJob { fps?: number; file: string; step: PostStep; folder: string; stem: string; skip?: number; cap?: number }
export interface PostGraph { graph: Record<string, any>; save: string; label: string }

/** Add the save-video node (NVENC through VHS when present, core CreateVideo+SaveVideo otherwise). */
export async function addVideoSave(g: Record<string, any>, images: L, audio: L | undefined, fps: number, prefix: string, pfx = 'S'): Promise<string> {
  if (await hasNode('VHS_VideoCombine')) {
    g[`${pfx}:save`] = { class_type: 'VHS_VideoCombine', inputs: { images, ...(audio ? { audio } : {}), frame_rate: fps, loop_count: 0, filename_prefix: prefix, format: 'video/nvenc_h264-mp4', pingpong: false, save_output: true } };
  } else {
    g[`${pfx}:video`] = { class_type: 'CreateVideo', inputs: { images, fps, ...(audio ? { audio } : {}) } };
    g[`${pfx}:save`] = { class_type: 'SaveVideo', inputs: { video: [`${pfx}:video`, 0], filename_prefix: prefix, format: 'auto', codec: 'auto' } };
  }
  return `${pfx}:save`;
}

export async function addVideoLoad(g: Record<string, any>, file: string, id = 'P:load', skip = 0, cap = 0) {
  await need('VHS_LoadVideo', 'Video loader', 'ComfyUI-VideoHelperSuite');
  g[id] = { class_type: 'VHS_LoadVideo', inputs: { video: file, force_rate: 0, custom_width: 0, custom_height: 0, frame_load_cap: cap, skip_first_frames: skip, select_every_nth: 1, format: 'AnimateDiff' } };
}

export async function buildPostGraph(job: PostJob): Promise<PostGraph> {
  const g: Record<string, any> = {};
  await addVideoLoad(g, job.file, 'P:load', job.skip ?? 0, job.cap ?? 0);
  let images: L = ['P:load', 0];
  let fps = job.fps && job.fps > 0 ? job.fps : FPS;
  const s = job.step;
  let label: string = s.kind;

  if (s.kind === 'deblur') {
    await need('TJ_RTXDeblur', 'RTX Deblur', 'ComfyUI-TJ_NODE_STUDIO_ONE (NVIDIA RTX GPU)');
    g['P:step'] = { class_type: 'TJ_RTXDeblur', inputs: { images, strength: s.strength } };
    images = ['P:step', 0];
  } else if (s.kind === 'denoise') {
    await need('TJ_NODE_RTXDenoise', 'RTX Denoise', 'ComfyUI-TJ_NODE (NVIDIA RTX GPU)');
    g['P:step'] = { class_type: 'TJ_NODE_RTXDenoise', inputs: { images, strength: s.strength } };
    images = ['P:step', 0];
  } else if (s.kind === 'upscale') {
    label = `upscale (${s.method}${s.twoPass && s.method !== 'rtx' ? ' + RTX' : ''})`;
    if (s.method === 'flashvsr') {
      await need('FlashVSRNodeAdv', 'FlashVSR', 'ComfyUI-FlashVSR_Ultra_Fast');
      const f = s.flashvsr;
      g['P:pipe'] = { class_type: 'FlashVSRInitPipe', inputs: { model: f.model, mode: f.mode, alt_vae: 'none', force_offload: true, precision: 'bf16', device: 'cuda:0', attention_mode: 'sparse_sage_attention' } };
      g['P:step'] = { class_type: 'FlashVSRNodeAdv', inputs: { pipe: ['P:pipe', 0], frames: images, scale: Math.min(4, Math.max(2, Math.round(f.scale))), color_fix: f.colorFix, tiled_vae: true, tiled_dit: true, tile_size: f.tileSize, tile_overlap: f.tileOverlap, unload_dit: false, sparse_ratio: 2, kv_ratio: 3, local_range: 11, seed: f.seed } };
      images = ['P:step', 0];
    } else if (s.method === 'rtx') {
      await need('TJ_NODE_RTXVSR', 'RTX VSR', 'ComfyUI-TJ_NODE (NVIDIA RTX GPU)');
      const t = rtxTarget(s.rtx, s.srcW, s.srcH);
      if (t.crop) { g['P:crop'] = { class_type: 'ImageCrop', inputs: { image: images, ...t.crop } }; images = ['P:crop', 0]; }
      g['P:step'] = { class_type: 'TJ_NODE_RTXVSR', inputs: { images, resize_type: t.type === 'scale' ? 'scale by multiplier' : 'target dimensions', scale: t.type === 'scale' ? t.scale : 2, width: t.width || 1920, height: t.height || 1080, quality: s.rtx.quality } };
      images = ['P:step', 0];
    } else {
      if (!s.modelName || s.modelName === 'none') throw new Error('Pick an upscale model first');
      g['P:model'] = { class_type: 'UpscaleModelLoader', inputs: { model_name: s.modelName } };
      g['P:step'] = { class_type: 'ImageUpscaleWithModel', inputs: { upscale_model: ['P:model', 0], image: images } };
      images = ['P:step', 0];
    }
    if (s.twoPass && s.method !== 'rtx') {
      await need('TJ_NODE_RTXVSR', '2-pass upscale (RTX VSR)', 'ComfyUI-TJ_NODE (NVIDIA RTX GPU)');
      const p = s.pass2;
      const inp: Record<string, any> = { images, resize_type: 'scale by multiplier', scale: Math.max(1, p.scale), width: 1920, height: 1080, quality: p.quality };
      if (p.mode === 'short' || p.mode === 'long') { inp.resize_type = p.mode === 'short' ? 'short edge' : 'long edge'; inp.edge = Math.max(8, Math.round(p.mode === 'short' ? p.short : p.long)); }
      else if (p.mode === 'wh') { inp.resize_type = 'target dimensions (crop to fit)'; inp.width = Math.max(8, Math.round(p.w)); inp.height = Math.max(8, Math.round(p.h)); inp.crop_anchor = p.anchor; }
      g['P:rtx2'] = { class_type: 'TJ_NODE_RTXVSR', inputs: inp };
      images = ['P:rtx2', 0];
    }
  } else if (s.kind === 'skin') {
    await need('TJ_SkinRetouch', 'Skin Retouch', 'ComfyUI-TJ_NODE');
    g['P:step'] = { class_type: 'TJ_SkinRetouch', inputs: { images, evenness: s.evenness, smoothing: s.smoothing, redness: s.redness, shine: s.shine, blemish_mode: s.blemish, preserve_marks: s.preserveMarks, microtexture_strength: s.microtexture } };
    images = ['P:step', 0];
  } else if (s.kind === 'grain') {
    await need('GLSLShader', 'Film grain (GLSLShader)', 'a newer ComfyUI core');
    await need('SplitImageWithAlpha', 'SplitImageWithAlpha', 'a newer ComfyUI core');
    g['P:step'] = { class_type: 'GLSLShader', inputs: { fragment_shader: GRAIN_SHADER, size_mode: 'from_input', 'images.image0': images, 'floats.u_float0': s.amount, 'floats.u_float1': s.size, 'floats.u_float2': s.color, 'floats.u_float3': s.lumBias, 'ints.u_int0': s.noise === 'grainy' ? 1 : 0 } };
    // the shader answers with RGBA; every later video node wants RGB
    g['P:dealpha'] = { class_type: 'SplitImageWithAlpha', inputs: { image: ['P:step', 0] } };
    images = ['P:dealpha', 0];
  } else if (s.kind === 'interpolate') {
    await need('RIFEInterpolation', 'RIFE frame interpolation', 'ComfyUI-Frame-Interpolation');
    const dst = Math.max(fps, s.targetFps || fps * 2);
    g['P:step'] = { class_type: 'RIFEInterpolation', inputs: { images, source_fps: fps, target_fps: dst, scale: s.scale, model_name: s.modelName || 'flownet.pkl', batch_size: Math.max(1, Math.round(s.batchSize)), use_fp16: s.fp16 } };
    images = ['P:step', 0]; fps = dst;
  } else if (s.kind === 'resize') {
    await need('TJ_VideoResize', 'Video Resize', 'ComfyUI-TJ_NODE');
    g['P:step'] = { class_type: 'TJ_VideoResize', inputs: { images, mode: s.mode, upscale_method: s.method, target_px: Math.max(8, Math.round(s.targetPx)), ratio_w: Math.max(1, Math.round(s.ratioW)), ratio_h: Math.max(1, Math.round(s.ratioH)), megapixels: Math.max(0.01, s.megapixels), target_width: Math.max(8, Math.round(s.width)), target_height: Math.max(8, Math.round(s.height)), crop_mode: s.crop } };
    images = ['P:step', 0];
  }
  const save = await addVideoSave(g, images, ['P:load', 2], fps, `${job.folder}/${job.stem}_${s.kind}`, 'P');
  return { graph: g, save, label };
}
