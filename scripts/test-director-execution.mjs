// Director execution modes + results sync checks (pure logic, no ComfyUI). Run: node scripts/test-director-execution.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvers-exec-'));
const bundle = async (entry, out) => { await build({ entryPoints: [path.join(root, entry)], outfile: path.join(tmp, out), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' }); return import(pathToFileURL(path.join(tmp, out)).href); };
const M = await bundle('src/director/model.ts', 'model.mjs');
const A = await bundle('src/director/adapter.ts', 'adapter.mjs');
const X = await bundle('src/director/execution.ts', 'exec.mjs');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

const reg = { get: (id) => ({ prompt: { id, inputs: [], outputs: [{ id: 'text', type: 'text' }], params: {}, defaults: { text: '' } }, 'image-generate': { id, inputs: [{ id: 'text', type: 'text' }], outputs: [{ id: 'image', type: 'image' }], params: {}, defaults: {} } })[id], compatible: (a, b) => a === b };
const mk = () => {
  const p = M.newDirectorProject('Film'); const ep = M.newEpisode(p, 1, 'E1'); const sc = M.newScene(p, ep.episode_id, 'A');
  const s = [1, 2, 3].map((i) => { const x = M.newShot(p, sc.scene_id); x.prompt_en = 'p' + i; return x; });
  const r = A.buildCanvasFromDirector(p, reg, null, null, 'f');
  return { p, s, link: r.link, canvas: r.project };
};
const approve = (p, ...ids) => p.shots.forEach((x) => { if (ids.includes(x.shot_id)) x.status = 'approved'; });

// ---- planRun
{
  const { p, s, link } = mk(); approve(p, s[0].shot_id, s[2].shot_id);
  ok(X.planRun('manual', p, link).blocked === 'manual' && X.planRun('manual', p, link, s[0].shot_id).shots.length === 0, 'manual: nothing can be run from Director');
  ok(X.planRun('approval_required', p, null, s[0].shot_id).blocked === 'no-canvas', 'no linked canvas: blocked');
  ok(X.planRun('approval_required', p, link, s[0].shot_id).shots.length === 1, 'approval_required: an approved shot can be run');
  ok(X.planRun('approval_required', p, link, s[1].shot_id).blocked === 'not-approved', 'approval_required: a draft shot is refused');
  ok(X.planRun('approval_required', p, link).blocked === 'use-shot-run', 'approval_required: no batch run');
  ok(X.planRun('step_by_step', p, link).shots.map((x) => x.shot_id).join() === s[0].shot_id, 'step_by_step: the next approved shot only (one)');
  ok(X.planRun('step_by_step', p, link, s[0].shot_id).blocked === 'use-run-next', 'step_by_step: no per-shot run');
  const withResult = JSON.parse(JSON.stringify(p)); withResult.shots[0].results.push({ result_id: 'rs_x', file: { filename: 'a.png', subfolder: '', type: 'output' }, kind: 'image', created_at: '', picked: true });
  ok(X.planRun('step_by_step', withResult, link).shots[0].shot_id === s[2].shot_id, 'step_by_step: moves on after a shot has a picked result');
  ok(X.planRun('hybrid', p, link).shots.length === 2, 'hybrid: all approved shots, in order');
  ok(X.planRun('hybrid', p, link, s[2].shot_id).shots.length === 1, 'hybrid: a single shot can still be run');
  const none = JSON.parse(JSON.stringify(p)); none.shots.forEach((x) => { x.status = 'draft'; });
  ok(X.planRun('hybrid', none, link).blocked === 'nothing-to-run', 'nothing approved: nothing to run');
  const unlinked = { ...link, shots: link.shots.slice(0, 1) };
  ok(X.planRun('hybrid', p, unlinked).shots.length === 1, 'a shot without cards in the canvas is never planned');
}

// ---- staleShots
{
  const { p, s, link } = mk();
  ok(X.staleShots(p, link).length === 0, 'fresh canvas: no stale shot');
  p.shots[1].prompt_en = 'changed';
  ok(X.staleShots(p, link).join() === s[1].shot_id && X.staleShots(p, link, [s[0].shot_id]).length === 0, 'a shot edited after the build is stale (only counted when asked about)');
}

// ---- runShots
const deps = (over = {}) => {
  const log = []; const status = {};
  return { log, status, d: { shots: [], confirm: async (x) => { log.push('confirm:' + x.length); return true; }, run: async (x) => { log.push('run:' + x.shot_id); return 'ok'; }, setStatus: (id, st) => { status[id] = st; log.push(`${id.slice(3, 5)}=${st}`); }, collect: (x) => log.push('collect'), ...over } };
};
{
  const { p, s } = mk(); approve(p, ...s.map((x) => x.shot_id));
  const t = deps(); t.d.shots = p.shots; const r = await X.runShots(t.d);
  ok(r.ran.length === 3 && t.log.filter((l) => l.startsWith('confirm')).length === 1, 'batch: one question for the whole press, all shots run');
  ok(Object.values(t.status).every((v) => v === 'review'), 'finished shots go to review');
  ok(t.log.indexOf('run:' + s[1].shot_id) > t.log.indexOf('run:' + s[0].shot_id), 'shots run one after another in order');
}
{
  const { p, s } = mk(); approve(p, ...s.map((x) => x.shot_id));
  const t = deps({ confirm: async () => false }); t.d.shots = p.shots; const r = await X.runShots(t.d);
  ok(r.ran.length === 0 && !t.log.some((l) => l.startsWith('run')) && Object.keys(t.status).length === 0, 'answer no: nothing runs and no status changes');
}
{
  const { p, s } = mk(); approve(p, ...s.map((x) => x.shot_id));
  const t = deps({ run: async (x) => { t.log.push('run:' + x.shot_id); return x.shot_id === s[1].shot_id ? 'error' : 'ok'; } }); t.d.shots = p.shots; const r = await X.runShots(t.d);
  ok(r.failed === s[1].shot_id && r.ran.length === 1 && !t.log.includes('run:' + s[2].shot_id), 'a failure stops the batch; the next shot is not started');
  ok(t.status[s[1].shot_id] === 'failed' && t.status[s[2].shot_id] === 'approved' && t.status[s[0].shot_id] === 'review', 'failed shot = failed, never-started shot goes back to approved');
}
{
  const { p, s } = mk(); approve(p, ...s.map((x) => x.shot_id));
  const t = deps({ run: async (x) => { throw new Error('boom'); } }); t.d.shots = [p.shots[0]]; const r = await X.runShots(t.d);
  ok(r.failed === s[0].shot_id && t.status[s[0].shot_id] === 'failed', 'a runner that throws is a failed shot, not a crash');
  const c = deps({ run: async () => 'cancelled' }); c.d.shots = p.shots; const rc = await X.runShots(c.d);
  ok(rc.cancelled === s[0].shot_id && Object.values(c.status).every((v) => v === 'approved') && !rc.failed, 'cancelled: back to approved, rest not started');
}

// ---- applyCanvasResults
{
  const { p, s, link, canvas } = mk(); approve(p, s[0].shot_id); p.shots[0].status = 'generating';
  const gen = (i) => canvas.nodes.find((n) => n.id === A.genNodeId(s[i].shot_id));
  gen(0).results = [{ id: 'a1', type: 'image', url: '/v', file: { filename: 'x.png', subfolder: 'o', type: 'output' } }, { id: 't1', type: 'text', url: '', text: 'hi' }];
  gen(1).results = [{ id: 'a2', type: 'video', url: '/v', file: { filename: 'y.mp4', subfolder: '', type: 'output' } }];
  const rep = X.applyCanvasResults(p, link, canvas.nodes);
  ok(rep.added.length === 2 && p.shots[0].results.length === 1 && p.shots[0].results[0].kind === 'image', 'image result added, text result ignored');
  ok(p.shots[0].results[0].picked && p.shots[0].results[0].node_id === A.genNodeId(s[0].shot_id), 'first result is picked and remembers its card');
  ok(p.shots[0].status === 'review', 'a generating shot that got a result moves to review');
  ok(p.shots[1].status === 'draft' && p.shots[1].results.length === 1, 'a draft shot keeps its status but still lists the result');
  const rep2 = X.applyCanvasResults(p, link, canvas.nodes); ok(rep2.added.length === 0 && p.shots[0].results.length === 1, 'syncing again adds nothing');
  gen(0).results.push({ id: 'a3', type: 'image', url: '/v', file: { filename: 'z.png', subfolder: 'o', type: 'output' } });
  X.applyCanvasResults(p, link, canvas.nodes);
  ok(p.shots[0].results.length === 2 && p.shots[0].results.filter((r) => r.picked).length === 1 && p.shots[0].results[0].picked, 'a newer result does not take the pick away');
  gen(0).results = [];
  X.applyCanvasResults(p, link, canvas.nodes); ok(p.shots[0].results.length === 2, 'results removed from the canvas stay in the shot history');
  const q = JSON.parse(JSON.stringify(p)); q.shots[2].status = 'approved';
  const rr = X.applyCanvasResults(q, link, canvas.nodes, { [A.genNodeId(s[2].shot_id)]: { status: 'running' } });
  ok(q.shots[2].status === 'generating' && rr.statusChanged.includes(s[2].shot_id), 'a running card shows as generating');
  q.shots[2].status = 'generating'; X.applyCanvasResults(q, link, canvas.nodes, { [A.genNodeId(s[2].shot_id)]: { status: 'error' } });
  ok(q.shots[2].status === 'failed', 'a failed card shows as failed');
  q.shots[2].status = 'done'; X.applyCanvasResults(q, link, canvas.nodes, { [A.genNodeId(s[2].shot_id)]: { status: 'error' } });
  ok(q.shots[2].status === 'done', 'a finished shot is never moved back by a card error');
  const gone = canvas.nodes.filter((n) => n.id !== A.genNodeId(s[0].shot_id));
  ok(X.applyCanvasResults(p, link, gone).missingNodes.join() === s[0].shot_id, 'a card deleted from the canvas is reported, results kept');
}

// ---- batches: several episodes / chosen clips
{
  const p = M.newDirectorProject('B'); p.workflow.stage = 'episode';
  const eps = [1, 2, 3, 4].map((n) => M.newEpisode(p, n, 'e' + n));
  const shotsOf = eps.map((e) => { const sc = M.newScene(p, e.episode_id); return [0, 1, 2].map(() => { const s = M.newShot(p, sc.scene_id); s.prompt_en = 'x'; s.status = 'approved'; return s; }); });
  eps[0].stage = 'execute'; eps[1].stage = 'execute'; eps[2].stage = 'canvas'; eps[3].stage = 'execute';
  for (const e of [eps[0], eps[1], eps[2]]) p.canvas_links.push({ canvas_id: 'cv_' + e.no, canvas_file: 'f' + e.no, shots: [], created_at: '', episode_id: e.episode_id });   // episode 4 has no canvas
  const plan = X.planBatch(p, [1, 2, 3, 4, 9]);
  ok(plan.batches.map((b) => b.no).join() === '1,2' && plan.clips === 6, 'batch of episodes: the ones at the generate step with a canvas run (6 clips)');
  ok(plan.skipped.map((s) => `${s.no}:${s.reason}`).join() === '3:not-in-generate-step,4:no-canvas,9:unknown', 'the others are listed with the reason, never silently dropped');
  shotsOf[0][1].status = 'done'; shotsOf[1][0].status = 'generating';
  ok(X.planBatch(p, [1, 2]).clips === 4, 'without a choice only APPROVED clips run (done and running ones do not)');
  const ids = [shotsOf[0][1].shot_id, shotsOf[1][2].shot_id, shotsOf[2][0].shot_id];
  const chosen = X.planBatch(p, [1, 2, 3], { clipIds: ids });
  ok(chosen.clips === 3 && chosen.batches.map((b) => `${b.no}:${b.shots.length}`).join() === '1:1,2:1,3:1', 'chosen clips run in whatever episode they are in (episode 3 is at the canvas step but its clip was chosen)');
  ok(chosen.batches[0].requeue.length === 1 && chosen.batches[1].requeue.length === 0, 'a chosen clip that is "done" is marked for requeue; an approved one is not');
  ok(X.planBatch(p, [4], { clipIds: ids }).batches.length === 0 && X.planBatch(p, [4], { clipIds: [shotsOf[3][0].shot_id] }).skipped[0].reason === 'no-canvas', 'a chosen clip of an episode without a canvas is reported, a chosen list that does not touch an episode is not an error');
  const before = shotsOf[0][1].status;
  ok(X.requeueClips(p, [shotsOf[0][1].shot_id, shotsOf[0][0].shot_id]) === 1 && shotsOf[0][1].status === 'approved' && before === 'done', 'requeue puts only the clips that were not approved back to approved');
  const seen = new Set(); let k = 0;
  const n = X.reseed(p, [shotsOf[0][0].shot_id, shotsOf[0][1].shot_id], () => 1000 + k++);
  ok(n === 2 && shotsOf[0][0].seed === 1000 && shotsOf[0][1].seed === 1001 && shotsOf[0][2].seed === undefined, 'reseed changes only the chosen clips');
  for (let i = 0; i < 500; i++) seen.add(X.newSeed()); ok(seen.size > 490 && [...seen].every((v) => Number.isInteger(v) && v >= 1 && v < 2 ** 31), 'new seeds are positive integers and differ');
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
