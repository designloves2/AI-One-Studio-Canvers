// A tiny stand-in for ComfyUI + the STUDIO_ONE routes, for trying the canvas without a GPU.
//   node mock/mock-comfy.mjs            (listens on :8188)
// It validates the API graphs the canvas builds (unknown links = error) and "renders" a coloured PNG.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.MOCK_PORT ?? 8188);
const S1 = process.env.STUDIO_ONE_DIR ?? '/home/user/ref/ComfyUI-TJ_NODE_STUDIO_ONE';
const files = new Map(); // "type/subfolder/filename" -> Buffer
const history = {};
const sockets = new Set();
const log = [];
let llmSettings = {};
let orKey = '';

// ---------------------------------------------------------------- PNG
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(w, h, seed) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = (seed * 37 + x * 255 / w) & 255; raw[o + 1] = (seed * 91 + y * 255 / h) & 255; raw[o + 2] = (seed * 13 + (x + y) * 120 / (w + h)) & 255; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- helpers
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type, 'access-control-allow-origin': '*' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });
const broadcast = (msg) => { for (const s of sockets) if (s.readyState === 1) s.send(JSON.stringify(msg)); };
const readJson = async (req) => { try { return JSON.parse((await readBody(req)).toString() || '{}'); } catch { return {}; } };
const tryFile = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

const KNOWN = new Set(['UNETLoader', 'UnetLoaderGGUF', 'CLIPLoader', 'CLIPLoaderGGUF', 'VAELoader', 'LoraLoaderModelOnly', 'ModelSamplingAuraFlow', 'DifferentialDiffusion', 'CLIPTextEncode', 'ConditioningZeroOut', 'EmptySD3LatentImage', 'EmptyFlux2LatentImage', 'KSampler', 'VAEDecode', 'VAEEncode', 'SaveImage', 'PreviewImage', 'LoadImage', 'ImageScale', 'ImageScaleBy', 'ImageToMask', 'SetLatentNoiseMask', 'ImagePadForOutpaint', 'ImagePadKJ', 'ImageScaleToTotalPixels', 'GetImageSize', 'ReferenceLatent', 'FluxKVCache', 'InpaintCropImproved', 'InpaintStitchImproved', 'InpaintModelConditioning', 'LoadBackgroundRemovalModel', 'RemoveBackground', 'InvertMask', 'JoinImageWithAlpha', 'UpscaleModelLoader', 'ImageUpscaleWithModel', 'CheckpointLoaderSimple', 'LoraLoader', 'EmptyLatentImage', 'VAEEncodeForInpaint', 'CFGNorm', 'FluxKontextImageScale', 'TextEncodeQwenImageEditPlus', 'FluxKontextMultiReferenceLatentMethod', 'TJ_NODE_Krea2UnetLoaderGGUF', 'TJ_NODE_Krea2ClipLoaderGGUF']);

function validate(graph) {
  const errs = {};
  for (const [id, n] of Object.entries(graph)) {
    if (!KNOWN.has(n.class_type)) errs[id] = { errors: [{ message: `unknown class_type ${n.class_type}` }] };
    for (const [k, v] of Object.entries(n.inputs ?? {})) if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && !graph[v[0]]) errs[id] = { errors: [{ message: `input ${k} links to missing node ${v[0]}` }] };
    if (n.class_type === 'LoadImage') { const f = n.inputs.image; if (![...files.keys()].some((k) => k.endsWith('/' + f) || k.endsWith(f))) errs[id] = { errors: [{ message: `LoadImage: ${f} not in input folder` }] }; }
  }
  return errs;
}

function execute(graph, promptId) {
  const save = Object.entries(graph).filter(([, n]) => n.class_type === 'SaveImage' || n.class_type === 'PreviewImage');
  const lat = Object.values(graph).find((n) => /Empty.*Latent/.test(n.class_type));
  const w = typeof lat?.inputs?.width === 'number' ? lat.inputs.width : 512, h = typeof lat?.inputs?.height === 'number' ? lat.inputs.height : 512;
  const ks = Object.values(graph).find((n) => n.class_type === 'KSampler');
  const steps = ks?.inputs?.steps ?? 4;
  let i = 0;
  const tick = () => {
    i++;
    broadcast({ type: 'progress', data: { value: i, max: steps, prompt_id: promptId } });
    if (i < steps) return setTimeout(tick, 120);
    const outputs = {};
    for (const [id, n] of save) {
      const prefix = (n.inputs.filename_prefix ?? 'mock/out').toString(); const sub = path.dirname(prefix) === '.' ? '' : path.dirname(prefix);
      const name = `${path.basename(prefix)}_${String(Date.now()).slice(-6)}_.png`;
      const buf = png(Math.min(w, 512), Math.min(h, 512), (ks?.inputs?.seed ?? 1) % 997);
      files.set(`output/${sub}/${name}`, buf);
      outputs[id] = { images: [{ filename: name, subfolder: sub, type: 'output' }] };
      broadcast({ type: 'executed', data: { node: id, output: outputs[id], prompt_id: promptId } });
    }
    history[promptId] = { outputs, status: { status_str: 'success', completed: true, messages: [] } };
    broadcast({ type: 'execution_success', data: { prompt_id: promptId } });
  };
  broadcast({ type: 'execution_start', data: { prompt_id: promptId } });
  setTimeout(tick, 150);
}

function multipart(buf, ct) {
  const b = Buffer.from('--' + /boundary=(.+)$/.exec(ct)[1]); const out = {}; let pos = buf.indexOf(b);
  while (pos >= 0) {
    const next = buf.indexOf(b, pos + b.length); if (next < 0) break;
    const part = buf.subarray(pos + b.length + 2, next - 2); const split = part.indexOf('\r\n\r\n');
    const head = part.subarray(0, split).toString(); const body = part.subarray(split + 4);
    const name = /name="([^"]+)"/.exec(head)?.[1]; const fn = /filename="([^"]*)"/.exec(head)?.[1];
    out[name] = fn !== undefined ? { filename: fn, data: body } : body.toString(); pos = next;
  }
  return out;
}

const familyRoutes = (prefix, kind) => ({
  [`${prefix}/models`]: () => ({ diffusion_models: kind === 'klein' ? ['flux-2-klein-9b.safetensors', 'flux-2-klein-9b-kv.safetensors'] : kind === 'krea2' ? ['krea2_turbo_fp8_scaled.safetensors'] : ['z_image_turbo_bf16.safetensors'], checkpoints: kind === 'sdxl' ? ['juggernautXL.safetensors'] : undefined, text_encoders: kind === 'klein' ? ['qwen_3_8b_fp8mixed.safetensors'] : kind === 'krea2' ? ['qwen3vl_4b_fp8_scaled.safetensors'] : ['qwen_3_4b.safetensors'], vaes: kind === 'klein' ? ['flux2-vae.safetensors'] : kind === 'krea2' ? ['qwen_image_vae.safetensors'] : ['ae.safetensors'], loras: ['none', 'detail_v1.safetensors'] }),
  [`${prefix}/config`]: () => ({ selected_model: '', selected_text_encoder: '', selected_vae: '', negative_prompt: '', prompt_suffix: '' }),
  [`${prefix}/bgremoval_models`]: () => ({ models: ['birefnet.safetensors'] }),
});

const routes = {
  '/system_stats': () => ({ system: { comfyui_version: '0.mock' }, devices: [{ name: 'Mock GPU' }] }),
  '/object_info/KSampler': () => ({ KSampler: { input: { required: { sampler_name: [['euler', 'res_multistep', 'er_sde', 'dpmpp_2m']], scheduler: [['simple', 'normal', 'karras']] } } } }),
  '/object_info/UpscaleModelLoader': () => ({ UpscaleModelLoader: { input: { required: { model_name: [['4x-UltraSharp.pth']] } } } }),
  ...familyRoutes('/flux_klein', 'klein'), ...familyRoutes('/z_image_turbo', 'zimage'), ...familyRoutes('/krea2_one', 'krea2'), ...familyRoutes('/anima_one', 'anima'), ...familyRoutes('/qwen2511_one', 'qwen'), ...familyRoutes('/sdxl_one', 'sdxl'),
  '/tj_studio_one/llm/models': () => ({ ok: true, gguf: ['qwen3.5-4B.gguf'], mmproj: ['mmproj-qwen3.5.gguf'], text_encoders: ['gemma4_e4b_it_fp8_scaled.safetensors'], clip_loader_types: ['Auto', 'flux2', 'lumina2'], local_available: true, openrouter_key_set: !!orKey, openrouter_key_hint: orKey ? '…' + orKey.slice(-4) : '', or_model_text: 'google/gemini-2.5-flash', or_model_vision: 'google/gemini-2.5-flash' }),
  '/tj_shared/llm_settings': () => ({ ok: true, settings: llmSettings }),
};

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const p = u.pathname;
  // same loopback origin check as real ComfyUI
  const oh = req.headers.origin && new URL(req.headers.origin).hostname, hh = (req.headers.host ?? '').split(':')[0];
  if (oh && oh !== hh && /^(localhost|127\.0\.0\.1)$/.test(oh) && /^(localhost|127\.0\.0\.1)$/.test(hh)) return send(res, 403, 'origin mismatch');
  if (req.method === 'OPTIONS') return send(res, 204, '');
  log.push(`${req.method} ${p}`);

  if (p === '/__log') return send(res, 200, log.slice(-400));
  if (routes[p] && req.method === 'GET') return send(res, 200, routes[p]());
  let m;
  if ((m = /^\/(flux_klein|z_image_turbo)\/workflow_(\w+)$/.exec(p))) {
    const dir = m[1] === 'flux_klein' ? 'klein' : 'zimage'; const wf = tryFile(path.join(S1, 'workflows', dir, `${m[2]}_workflow.json`));
    return wf ? send(res, 200, wf) : send(res, 404, 'workflow not found');
  }
  if (/\/gallery$/.test(p)) return send(res, 200, { images: [...files.keys()].filter((k) => k.startsWith('output/')).map((k) => { const [, ...rest] = k.split('/'); const fn = rest.pop(); return { filename: fn, subfolder: rest.join('/'), mtime: Date.now(), key: k }; }), total: files.size, offset: 0, limit: 40 });
  if (/\/delete$/.test(p)) return send(res, 200, { ok: true });
  if (p === '/upload/image' && req.method === 'POST') {
    const f = multipart(await readBody(req), req.headers['content-type']);
    const name = f.image.filename || 'upload.png'; files.set(`input//${name}`, f.image.data); return send(res, 200, { name, subfolder: '', type: 'input' });
  }
  if (p === '/view') {
    const fn = u.searchParams.get('filename'), sub = u.searchParams.get('subfolder') ?? '', type = u.searchParams.get('type') ?? 'output';
    const b = files.get(`${type}/${sub}/${fn}`); return b ? send(res, 200, b, 'image/png') : send(res, 404, 'nf');
  }
  if (p === '/prompt' && req.method === 'POST') {
    const body = await readJson(req); const errs = validate(body.prompt ?? {});
    if (Object.keys(errs).length) return send(res, 400, { error: { message: 'Prompt outputs failed validation' }, node_errors: errs });
    const id = `p${Date.now()}`; history[id] = { outputs: {}, status: { status_str: 'running', completed: false } }; execute(body.prompt, id);
    return send(res, 200, { prompt_id: id, number: 1, node_errors: {} });
  }
  if ((m = /^\/history\/(.+)$/.exec(p))) return send(res, 200, history[m[1]] ? { [m[1]]: history[m[1]] } : {});
  if (p === '/interrupt') return send(res, 200, {});
  if (p === '/tj_shared/llm_settings' && req.method === 'POST') { Object.assign(llmSettings, (await readJson(req)).settings ?? {}); return send(res, 200, { ok: true }); }
  if (p === '/tj_studio_one/llm/config') { const b = await readJson(req); if (b.openrouter_key) orKey = b.openrouter_key; return send(res, 200, { ok: true, openrouter_key_set: !!orKey, openrouter_key_hint: orKey ? '…' + orKey.slice(-4) : '', or_model_text: b.or_model_text, or_model_vision: b.or_model_vision }); }
  if (p === '/tj_shared/custom_llm/connect') { const b = await readJson(req); return send(res, 200, { ok: true, models: ['mock-model-1', 'mock-model-2'], modelFound: true, ms: 12, keyStored: !!b.api_key }); }
  if (p === '/tj_studio_one/llm/enhance') { const b = await readJson(req); return send(res, 200, { ok: true, result: `[${b.backend}] ${b.prompt}, cinematic lighting, highly detailed` }); }
  if (p === '/tj_studio_one/llm/image_to_prompt') { const b = await readJson(req); return send(res, 200, { ok: true, result: `[${b.backend}] a photo (${(b.image_b64 ?? '').length} b64 chars)` }); }
  send(res, 404, { error: `mock: no route ${p}` });
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (s) => { sockets.add(s); s.send(JSON.stringify({ type: 'status', data: { status: { exec_info: { queue_remaining: 0 } } } })); s.on('close', () => sockets.delete(s)); });
server.listen(PORT, () => console.log(`mock ComfyUI+STUDIO_ONE on :${PORT} (templates from ${S1})`));
