// Model downloads into ComfyUI/models (needs COMFY_DIR). Shared by serve.mjs and the Vite dev server.
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const FOLDERS = new Set(['diffusion_models', 'text_encoders', 'vae', 'loras', 'upscale_models', 'checkpoints', 'latent_upscale_models', 'unet', 'clip']);
const HOSTS = new Set(['huggingface.co', 'hf.co', 'cdn-lfs.huggingface.co']);
const EXTRA = (process.env.DL_EXTRA_HOSTS ?? '').split(',').map((x) => x.trim()).filter(Boolean); // e.g. a mirror
const jobs = new Map(); // "folder/file" -> status

const modelsDir = () => (process.env.COMFY_DIR ? path.join(process.env.COMFY_DIR, 'models') : null);
const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => r(Buffer.concat(c).toString())); });

async function start({ url, folder, file }) {
  const base = modelsDir();
  if (!base) throw new Error('COMFY_DIR is not set — start the server with COMFY_DIR=<your ComfyUI folder>.');
  if (!FOLDERS.has(folder)) throw new Error(`folder "${folder}" is not allowed`);
  const u = new URL(url);
  if (!EXTRA.includes(u.host) && (u.protocol !== 'https:' || !HOSTS.has(u.hostname))) throw new Error('only https://huggingface.co links are allowed');
  if (!/^[\w.\-]+\.(safetensors|gguf|pth|pt|ckpt|bin)$/i.test(file)) throw new Error('unsafe file name');
  const dir = path.join(base, folder); fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, file); const key = `${folder}/${file}`;
  if (fs.existsSync(dest)) { jobs.set(key, { pct: 100, done: true, bytes: fs.statSync(dest).size }); return key; }
  if (jobs.get(key) && !jobs.get(key).done && !jobs.get(key).error) return key; // already running
  const st = { pct: 0, bytes: 0, total: 0, done: false };
  jobs.set(key, st);
  (async () => {
    try {
      const r = await fetch(url, { redirect: 'follow', headers: process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {} });
      if (!r.ok || !r.body) throw new Error(r.status === 401 || r.status === 403 ? 'HTTP ' + r.status + ' — accept the model license on huggingface.co (and set HF_TOKEN) first' : `HTTP ${r.status}`);
      st.total = Number(r.headers.get('content-length') ?? 0);
      const body = Readable.fromWeb(r.body);
      body.on('data', (c) => { st.bytes += c.length; if (st.total) st.pct = Math.min(99, Math.round((st.bytes / st.total) * 100)); });
      await pipeline(body, fs.createWriteStream(dest + '.part'));
      fs.renameSync(dest + '.part', dest);
      st.pct = 100; st.done = true;
    } catch (e) { st.error = e.message; try { fs.unlinkSync(dest + '.part'); } catch { /* none */ } }
  })();
  return key;
}

/** returns true when the request was handled */
export async function handleDownloads(req, res) {
  const p = new URL(req.url, 'http://x').pathname;
  if (!p.startsWith('/__canvers/')) return false;
  try {
    if (p === '/__canvers/capabilities') return json(res, 200, { download: !!modelsDir() }), true;
    if (p === '/__canvers/downloads') return json(res, 200, Object.fromEntries(jobs)), true;
    if (p === '/__canvers/installed') {
      const base = modelsDir(); const out = {};
      if (base) for (const f of FOLDERS) { try { out[f] = fs.readdirSync(path.join(base, f), { recursive: true }).map(String).filter((x) => !x.endsWith('.part')); } catch { out[f] = []; } }
      return json(res, 200, out), true;
    }
    if (p === '/__canvers/download' && req.method === 'POST') return json(res, 200, { key: await start(JSON.parse(await readBody(req))) }), true;
  } catch (e) { return json(res, 400, { error: e.message }), true; }
  return json(res, 404, { error: 'unknown route' }), true;
}
