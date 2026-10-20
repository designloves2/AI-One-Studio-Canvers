// Saved canvases: one JSON file per canvas in <project>/canvases (override with CANVERS_DIR).
// Shared by serve.mjs and the Vite dev server. Routes: GET /canvers/canvases, GET|PUT|DELETE /canvers/canvases/<name>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = () => process.env.CANVERS_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'canvases');
const MAX_BYTES = 200 * 1024 * 1024;
const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const BAD = /[\\/:*?"<>|\u0000-\u001f]/;
const safeName = (n) => { const s = (n ?? '').trim(); return s && s.length <= 100 && !BAD.test(s) && !s.startsWith('.') ? s : null; };
const fileOf = (n) => path.join(dir(), `${n}.json`);
const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = []; let size = 0;
  req.on('data', (c) => { size += c.length; if (size > MAX_BYTES) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

function list() {
  let names = [];
  try { names = fs.readdirSync(dir()).filter((f) => f.endsWith('.json')); } catch { return []; }
  return names.map((f) => {
    const full = path.join(dir(), f); const st = fs.statSync(full);
    let nodes = 0;
    try { const p = JSON.parse(fs.readFileSync(full, 'utf8')); nodes = Array.isArray(p.nodes) ? p.nodes.length : 0; } catch { /* unreadable */ }
    return { name: f.slice(0, -5), mtime: st.mtimeMs, size: st.size, nodes };
  }).sort((a, b) => b.mtime - a.mtime);
}

/** true when the request was handled */
export async function handleCanvases(req, res) {
  const u = new URL(req.url ?? '/', 'http://x');
  if (u.pathname !== '/canvers/canvases' && !u.pathname.startsWith('/canvers/canvases/')) return false;
  try {
    if (u.pathname === '/canvers/canvases') { if (req.method !== 'GET') return json(res, 405, { error: 'method' }), true; return json(res, 200, { canvases: list() }), true; }
    const name = safeName(decodeURIComponent(u.pathname.slice('/canvers/canvases/'.length)));
    if (!name) return json(res, 400, { error: 'invalid name' }), true;
    const file = fileOf(name);
    if (req.method === 'GET') {
      if (!fs.existsSync(file)) return json(res, 404, { error: 'not found' }), true;
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(fs.readFileSync(file)); return true;
    }
    if (req.method === 'PUT') {
      const body = await readBody(req);
      const p = JSON.parse(body);
      if (!Array.isArray(p.nodes) || !Array.isArray(p.edges)) return json(res, 400, { error: 'not a canvas' }), true;
      fs.mkdirSync(dir(), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, body); fs.renameSync(tmp, file); // never leaves a half-written canvas behind
      return json(res, 200, { ok: true, name, mtime: fs.statSync(file).mtimeMs }), true;
    }
    if (req.method === 'DELETE') {
      if (!fs.existsSync(file)) return json(res, 404, { error: 'not found' }), true;
      fs.unlinkSync(file); return json(res, 200, { ok: true }), true;
    }
    return json(res, 405, { error: 'method' }), true;
  } catch (e) { return json(res, 500, { error: e.message }), true; }
}
