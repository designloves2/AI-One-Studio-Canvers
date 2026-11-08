// Saved projects: one small JSON "manifest" per project in <app>/projects (override with CANVERS_PROJECTS_DIR).
// A project is the top level: it lists its Director project file (director/), its canvases (canvases/) and keeps the Simple-mode feed.
// Routes: GET /canvers/projects, GET|PUT|DELETE /canvers/projects/<name>
// The first time the folder is used, every existing Director project and canvas is wrapped into a project (a Director project with the canvases that
// belong to it, every other canvas on its own), so nothing saved earlier is lost or hidden.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = () => path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = () => process.env.CANVERS_PROJECTS_DIR ?? path.join(root(), 'projects');
const dirDirector = () => process.env.CANVERS_DIRECTOR_DIR ?? path.join(root(), 'director');
const dirCanvases = () => process.env.CANVERS_DIR ?? path.join(root(), 'canvases');
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
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const jsonFiles = (d) => { try { return fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)); } catch { return []; } };

function write(name, m) {
  fs.mkdirSync(dir(), { recursive: true });
  const tmp = `${fileOf(name)}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(m)); fs.renameSync(tmp, fileOf(name));
}
function uniqueName(base) {
  let n = base, i = 2;
  while (fs.existsSync(fileOf(n))) n = `${base} ${i++}`;
  return n;
}

/** once: wrap what was saved before projects existed */
function backfill() {
  const marker = path.join(dir(), '.migrated');
  if (fs.existsSync(marker)) return;
  fs.mkdirSync(dir(), { recursive: true });
  const now = new Date().toISOString();
  const canvases = jsonFiles(dirCanvases()).map((name) => ({ name, p: readJson(path.join(dirCanvases(), `${name}.json`)) }));
  const claimed = new Set();
  for (const d of jsonFiles(dirDirector())) {
    const mine = canvases.filter((c) => c.p?.director?.file === d).map((c) => c.name);
    mine.forEach((n) => claimed.add(n));
    const name = uniqueName(safeName(d) ?? 'project');
    write(name, { kind: 'canvers-project', schema: 1, name, created: now, updated: now, mode: 'director', director: d, canvases: mine, canvas: mine[0] ?? null, simple: [] });
  }
  for (const c of canvases) {
    if (claimed.has(c.name)) continue;
    const name = uniqueName(safeName(c.name) ?? 'project');
    write(name, { kind: 'canvers-project', schema: 1, name, created: now, updated: now, mode: 'canvas', director: null, canvases: [c.name], canvas: c.name, simple: [] });
  }
  fs.writeFileSync(marker, now);
}

function list() {
  backfill();
  return jsonFiles(dir()).map((name) => {
    const full = fileOf(name); const st = fs.statSync(full); const m = readJson(full);
    if (!m || m.kind !== 'canvers-project') return null;
    return { name, mtime: st.mtimeMs, mode: m.mode ?? 'canvas', hasDirector: !!m.director, canvases: Array.isArray(m.canvases) ? m.canvases.length : 0, simple: Array.isArray(m.simple) ? m.simple.length : 0 };
  }).filter(Boolean).sort((a, b) => b.mtime - a.mtime);
}

/** true when the request was handled */
export async function handleProjects(req, res) {
  const u = new URL(req.url ?? '/', 'http://x');
  if (u.pathname !== '/canvers/projects' && !u.pathname.startsWith('/canvers/projects/')) return false;
  try {
    if (u.pathname === '/canvers/projects') { if (req.method !== 'GET') return json(res, 405, { error: 'method' }), true; return json(res, 200, { projects: list() }), true; }
    backfill();
    const name = safeName(decodeURIComponent(u.pathname.slice('/canvers/projects/'.length)));
    if (!name) return json(res, 400, { error: 'invalid name' }), true;
    const file = fileOf(name);
    if (req.method === 'GET') {
      if (!fs.existsSync(file)) return json(res, 404, { error: 'not found' }), true;
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(fs.readFileSync(file)); return true;
    }
    if (req.method === 'PUT') {
      const m = JSON.parse(await readBody(req));
      if (m?.kind !== 'canvers-project' || !Array.isArray(m.canvases)) return json(res, 400, { error: 'not a project' }), true;
      write(name, m);
      return json(res, 200, { ok: true, name, mtime: fs.statSync(file).mtimeMs }), true;
    }
    if (req.method === 'DELETE') {
      if (!fs.existsSync(file)) return json(res, 404, { error: 'not found' }), true;
      fs.unlinkSync(file); return json(res, 200, { ok: true }), true;   // the contents are removed by the app (it knows which files are shared)
    }
    return json(res, 405, { error: 'method' }), true;
  } catch (e) { return json(res, 500, { error: e.message }), true; }
}
