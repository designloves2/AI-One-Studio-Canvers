// Saved Director projects: one JSON file per project in <app>/director (override with CANVERS_DIRECTOR_DIR).
// Kept apart from canvases/ on purpose: the canvases list counts every *.json there as a canvas.
// Routes: GET /canvers/director, GET|PUT|DELETE /canvers/director/<name>
// Every save first copies the file it replaces into director/.backup (newest 10 kept per project).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = () => process.env.CANVERS_DIRECTOR_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'director');
const MAX_BYTES = 200 * 1024 * 1024;
const KEEP = 10;
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
    let shots = 0, scenes = 0, schema = 0;
    try { const p = JSON.parse(fs.readFileSync(full, 'utf8')); shots = p.shots?.length ?? 0; scenes = p.scenes?.length ?? 0; schema = p.schema_version ?? 0; } catch { /* unreadable */ }
    return { name: f.slice(0, -5), mtime: st.mtimeMs, size: st.size, scenes, shots, schema };
  }).sort((a, b) => b.mtime - a.mtime);
}

function backup(name, file) {
  if (!fs.existsSync(file)) return;
  const b = path.join(dir(), '.backup'); fs.mkdirSync(b, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(file, path.join(b, `${name}.${stamp}.json`));
  const mine = fs.readdirSync(b).filter((f) => f.startsWith(`${name}.`) && f.endsWith('.json') && /^\d{4}-/.test(f.slice(name.length + 1))).sort();
  for (const old of mine.slice(0, Math.max(0, mine.length - KEEP))) fs.unlinkSync(path.join(b, old));
}

/** true when the request was handled */
export async function handleDirector(req, res) {
  const u = new URL(req.url ?? '/', 'http://x');
  if (u.pathname !== '/canvers/director' && !u.pathname.startsWith('/canvers/director/')) return false;
  try {
    if (u.pathname === '/canvers/director') { if (req.method !== 'GET') return json(res, 405, { error: 'method' }), true; return json(res, 200, { projects: list() }), true; }
    const name = safeName(decodeURIComponent(u.pathname.slice('/canvers/director/'.length)));
    if (!name) return json(res, 400, { error: 'invalid name' }), true;
    const file = fileOf(name);
    if (req.method === 'GET') {
      if (!fs.existsSync(file)) return json(res, 404, { error: 'not found' }), true;
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(fs.readFileSync(file)); return true;
    }
    if (req.method === 'PUT') {
      const body = await readBody(req);
      const p = JSON.parse(body);
      if (p?.kind !== 'director-project' || typeof p.schema_version !== 'number' || !Array.isArray(p.scenes) || !Array.isArray(p.shots)) return json(res, 400, { error: 'not a director project' }), true;
      fs.mkdirSync(dir(), { recursive: true });
      backup(name, file);
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, body); fs.renameSync(tmp, file); // never leaves a half-written project behind
      return json(res, 200, { ok: true, name, mtime: fs.statSync(file).mtimeMs }), true;
    }
    if (req.method === 'DELETE') {
      if (!fs.existsSync(file)) return json(res, 404, { error: 'not found' }), true;
      backup(name, file);   // a deleted project can still be restored from .backup
      fs.unlinkSync(file); return json(res, 200, { ok: true }), true;
    }
    return json(res, 405, { error: 'method' }), true;
  } catch (e) { return json(res, 500, { error: e.message }), true; }
}
