// Director Mode phase 1 checks: model (ids, validate, migrate) + the /canvers/director server routes.
// Run: node scripts/test-director.mjs   (no ComfyUI, no GPU; uses a temp folder, never the real director/ or canvases/)
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvers-director-'));
process.env.CANVERS_DIRECTOR_DIR = path.join(tmp, 'director');
process.env.CANVERS_DIR = path.join(tmp, 'canvases');

await build({ entryPoints: [path.join(root, 'src/director/model.ts')], outfile: path.join(tmp, 'model.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' });
const M = await import(pathToFileURL(path.join(tmp, 'model.mjs')).href);
const { handleDirector } = await import(pathToFileURL(path.join(root, 'server-lib/director.mjs')).href);
const { handleCanvases } = await import(pathToFileURL(path.join(root, 'server-lib/canvases.mjs')).href);

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const throws = (f) => { try { f(); return false; } catch { return true; } };

// ---- model
const p = M.newDirectorProject('Demo');
const sc = M.newScene(p, 'Opening'); const sh = M.newShot(p, sc.scene_id); const as = M.newAsset(p, { name: 'hero', role: 'character', source: { kind: 'library', id: 7 }, note: '' });
sh.asset_ids.push(as.asset_id);
ok(M.isId(p.project_id, 'dp') && M.isId(sh.shot_id, 'sh') && !M.isId('sh_short'), 'ids have the fixed shape');
ok(new Set(Array.from({ length: 2000 }, () => M.newId('sh'))).size === 2000, '2000 ids are all different');
ok(p.settings.execution_mode === 'manual', 'default execution mode is manual (no automatic generation)');
ok(M.validateDirectorProject(p).errors.length === 0, 'a new project validates');
const bad = JSON.parse(JSON.stringify(p)); bad.shots[0].scene_id = 'sc_000000000000';
ok(M.validateDirectorProject(bad).errors.length === 1, 'shot with a missing scene is an error');
const dupe = JSON.parse(JSON.stringify(p)); dupe.shots.push({ ...dupe.shots[0] });
ok(M.validateDirectorProject(dupe).errors.some((e) => e.startsWith('duplicate')), 'duplicate shot id is an error');
const missingAsset = JSON.parse(JSON.stringify(p)); missingAsset.shots[0].asset_ids.push('as_000000000000');
ok(M.validateDirectorProject(missingAsset).warnings.length === 1, 'missing asset is a warning');
ok(throws(() => M.loadDirectorProject({ nodes: [], edges: [] })), 'a canvas file is not a Director project');
ok(throws(() => M.loadDirectorProject(null)), 'null is rejected');
const r1 = M.loadDirectorProject(p); ok(!r1.readOnly && !r1.migratedFrom && r1.project !== p, 'current schema loads as a copy, editable');
const fut = JSON.parse(JSON.stringify(p)); fut.schema_version = 99; fut.future_field = { keep: 1 };
const r2 = M.loadDirectorProject(fut); ok(r2.readOnly && r2.project.future_field?.keep === 1, 'newer schema opens read-only and keeps unknown fields');
const old = JSON.parse(JSON.stringify(p)); old.schema_version = 0;
ok(throws(() => M.loadDirectorProject(old)), 'schema without a migration is refused, not guessed');
ok(M.safeProjectName('a/b') === null && M.safeProjectName('..x') === null && M.safeProjectName(' ok ') === 'ok' && M.safeProjectName('x'.repeat(101)) === null, 'project names: path tricks refused');

// ---- server
const srv = http.createServer(async (q, s) => { if (await handleDirector(q, s)) return; if (await handleCanvases(q, s)) return; s.writeHead(404).end(); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const call = async (m, u, body) => { const r = await fetch(base + u, { method: m, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch { /* none */ } return { s: r.status, j }; };

ok((await call('GET', '/canvers/director')).j.projects.length === 0, 'empty list at first');
ok((await call('PUT', '/canvers/director/Demo', p)).s === 200, 'save works');
const got = await call('GET', '/canvers/director/Demo'); ok(got.j.project_id === p.project_id, 'load returns what was saved');
ok((await call('PUT', '/canvers/director/Demo', { ...p, name: 'v2' })).s === 200, 'second save works');
ok(fs.readdirSync(path.join(tmp, 'director', '.backup')).length === 1, 'second save backed up the first');
for (let i = 0; i < 14; i++) await call('PUT', '/canvers/director/Demo', { ...p, name: 'n' + i });
ok(fs.readdirSync(path.join(tmp, 'director', '.backup')).length === 10, 'only the newest 10 backups are kept');
ok((await call('PUT', '/canvers/director/Demo', { nodes: [], edges: [] })).s === 400, 'a canvas is refused as a Director project');
ok((await call('PUT', '/canvers/director/Demo', '{broken')).s === 500, 'broken JSON is refused and the saved file is untouched');
ok((await call('GET', '/canvers/director/Demo')).j.project_id === p.project_id, 'file still intact after the refused saves');
ok((await call('PUT', '/canvers/director/..%2Fevil', p)).s === 400 && (await call('PUT', '/canvers/director/a%5Cb', p)).s === 400 && (await call('PUT', '/canvers/director/.hid', p)).s === 400, 'bad names are refused (path traversal)');
ok(!fs.existsSync(path.join(tmp, 'evil.json')), 'nothing was written outside director/');
const l = (await call('GET', '/canvers/director')).j.projects; ok(l.length === 1 && l[0].name === 'Demo' && l[0].shots === 1 && l[0].scenes === 1, 'list shows the project with counts');
ok(fs.readdirSync(path.join(tmp, 'director')).every((f) => f === '.backup' || f === 'Demo.json'), 'no temp files left behind');
// canvases are unaffected
ok((await call('GET', '/canvers/canvases')).j.canvases.length === 0, 'Director files do not show up in the canvases list');
ok((await call('PUT', '/canvers/canvases/c1', { nodes: [], edges: [] })).s === 200 && (await call('GET', '/canvers/director')).j.projects.length === 1, 'a saved canvas does not show up in the Director list');
ok((await call('DELETE', '/canvers/director/Demo')).s === 200 && (await call('GET', '/canvers/director/Demo')).s === 404, 'delete works');
ok(fs.readdirSync(path.join(tmp, 'director', '.backup')).length === 10, 'deleting also leaves a backup (still capped at 10)');

srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
