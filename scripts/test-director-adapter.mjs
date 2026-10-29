// Director -> Canvas adapter checks. Run: node scripts/test-director-adapter.mjs  (no ComfyUI, no GPU, nothing written outside a temp folder)
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvers-adapter-'));
const bundle = async (entry, out) => { await build({ entryPoints: [path.join(root, entry)], outfile: path.join(tmp, out), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' }); return import(pathToFileURL(path.join(tmp, out)).href); };
const M = await bundle('src/director/model.ts', 'model.mjs');
const A = await bundle('src/director/adapter.ts', 'adapter.mjs');
let real = null; try { real = await bundle('src/director/adapterRegistry.ts', 'realreg.mjs'); } catch (e) { console.log('note: real registry could not be loaded in node:', e.message.split('\n')[0]); }

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

// a small fake registry (the rules, not the cards)
const T = (id, ...r) => ({ id, type: id === 'x' ? 'x' : r[0] ?? 'text' });
const fake = (over = {}) => {
  const defs = {
    prompt: { id: 'prompt', inputs: [{ id: 'vars', type: 'text', optional: true, multi: true }], outputs: [{ id: 'text', type: 'text' }], params: {}, defaults: { text: '' } },
    'image-generate': { id: 'image-generate', inputs: [{ id: 'text', type: 'text' }, { id: 'lora', type: 'lora', optional: true }], outputs: [{ id: 'image', type: 'image' }], engineId: 'krea2', params: { aspect: { options: ['1:1', '16:9', '9:16'] } }, defaults: { aspect: '1:1', steps: 8 } },
    'video-generate': { id: 'video-generate', inputs: [{ id: 'prompt', type: 'text' }, { id: 'image', type: 'image', optional: true }], outputs: [{ id: 'video', type: 'video' }], engineId: 'h3', params: { aspect: { options: ['16:9', '9:16'] }, seconds: { min: 2, max: 20 } }, defaults: { aspect: '16:9', seconds: 5 } },
    ...over,
  };
  return { get: (id) => defs[id], compatible: (a, b) => a === b || a === 'any' || b === 'any' };
};

const mk = () => {
  const p = M.newDirectorProject('Film'); p.brief.aspect = '16:9';
  const s1 = M.newScene(p, 'A'); const s2 = M.newScene(p, 'B');
  const a = M.newShot(p, s1.scene_id), b = M.newShot(p, s1.scene_id), c = M.newShot(p, s2.scene_id);
  a.prompt_en = 'fox runs'; b.prompt_en = 'fox jumps'; c.prompt_en = 'fox sleeps'; b.duration_sec = 30;
  return { p, a, b, c };
};
const NOW = () => '2026-01-01T00:00:00.000Z';
const { p, a, b, c } = mk();

// ---- first build
const r1 = A.buildCanvasFromDirector(p, fake(), null, null, 'Film - director', { now: NOW });
ok(r1.project.version === 1 && r1.project.app === 'ai-one-studio-canvers' && r1.project.id === p.project_id, 'result is an ordinary Project v1 sharing the Director project id');
ok(r1.project.nodes.length === 6 && r1.project.edges.length === 3, '3 shots -> 6 cards and 3 wires');
ok(r1.project.nodes.find((n) => n.id === A.textNodeId(a.shot_id)).params.text === 'fox runs', 'prompt card carries the English prompt');
ok(r1.project.nodes.find((n) => n.id === A.genNodeId(a.shot_id)).params.aspect === '16:9', 'generator takes the brief aspect when the card offers it');
ok(r1.project.nodes.find((n) => n.id === A.genNodeId(a.shot_id)).engineId === 'krea2', 'generator starts on the registry default engine');
const e0 = r1.project.edges[0]; ok(e0.sourceHandle === 'text' && e0.targetHandle === 'text', 'wire goes from the text output to the text input');
ok(r1.link.shots.length === 3 && r1.link.shots[0].node_ids.length === 2 && M.isId(r1.link.canvas_id, 'cv'), 'link lists the cards of each shot');
const ys = r1.project.nodes.filter((n) => n.defId === 'prompt').map((n) => n.y); ok(ys[0] < ys[1] && ys[1] < ys[2], 'shots are laid out top to bottom in scene/shot order');
ok(JSON.parse(JSON.stringify(r1.project)).nodes.length === 6, 'result is plain JSON');

// ---- building again changes nothing
const r2 = A.buildCanvasFromDirector(p, fake(), r1.project, r1.link, 'Film - director', { now: NOW });
ok(r2.project.nodes.length === 6 && r2.project.edges.length === 3, 'building twice does not add cards or wires');
ok(r2.report.created.length === 0 && r2.report.updated.length === 0 && r2.link.canvas_id === r1.link.canvas_id, 'second build reports no change and keeps the canvas id');

// ---- user moved a card, changed a parameter, produced a result
const mod = JSON.parse(JSON.stringify(r1.project));
const g = mod.nodes.find((n) => n.id === A.genNodeId(a.shot_id)); g.x = 999; g.params.steps = 30; g.results = [{ id: 'r', type: 'image', url: '/x' }];
const t = mod.nodes.find((n) => n.id === A.textNodeId(b.shot_id)); t.params.text = 'MY OWN WORDS';
p.shots.find((s) => s.shot_id === a.shot_id).prompt_en = 'fox runs fast';
p.shots.find((s) => s.shot_id === b.shot_id).prompt_en = 'fox jumps high';
const r3 = A.buildCanvasFromDirector(p, fake(), mod, r1.link, 'Film - director', { now: NOW });
const g3 = r3.project.nodes.find((n) => n.id === A.genNodeId(a.shot_id));
ok(g3.x === 999 && g3.params.steps === 30 && g3.results.length === 1, 'moved card, changed parameter and its result are kept');
ok(r3.project.nodes.find((n) => n.id === A.textNodeId(a.shot_id)).params.text === 'fox runs fast', 'untouched prompt card follows the Director text');
ok(r3.project.nodes.find((n) => n.id === A.textNodeId(b.shot_id)).params.text === 'MY OWN WORDS' && r3.report.keptUserText.length === 1, 'a prompt the user rewrote in the canvas is kept and reported');
ok(r3.link.prompt_sent[b.shot_id] === 'fox jumps', 'the kept card is still seen as the user\'s on the next build');
const r3b = A.buildCanvasFromDirector(p, fake(), r3.project, r3.link, 'Film - director', { now: NOW });
ok(r3b.project.nodes.find((n) => n.id === A.textNodeId(b.shot_id)).params.text === 'MY OWN WORDS', 'and stays kept on later builds');
ok(!mod.nodes.some((n) => n === r3.project.nodes[0]), 'the canvas passed in is not mutated');

// ---- user deleted cards / wire
const del = JSON.parse(JSON.stringify(r1.project)); del.nodes = del.nodes.filter((n) => n.id !== A.genNodeId(c.shot_id)); del.edges = del.edges.filter((e) => e.id !== A.edgeId(c.shot_id));
const r4 = A.buildCanvasFromDirector(p, fake(), del, r1.link, 'Film - director', { now: NOW });
ok(r4.report.recreated.length === 1 && r4.project.nodes.length === 6 && r4.project.edges.length === 3, 'a deleted card and wire are made again');

// ---- a shot removed from the Director project: cards stay
const p2 = JSON.parse(JSON.stringify(p)); p2.shots = p2.shots.filter((s) => s.shot_id !== c.shot_id); p2.scenes[1].shot_ids = [];
const r5 = A.buildCanvasFromDirector(p2, fake(), r1.project, r1.link, 'Film - director', { now: NOW });
ok(r5.report.orphaned.length === 1 && r5.project.nodes.length === 6, 'cards of a removed shot are never deleted, only reported');

// ---- registry missing / no port: no substitution
const noGen = A.buildCanvasFromDirector(p, fake({ 'image-generate': undefined }), null, null, 'f', { now: NOW });
ok(noGen.project.nodes.length === 0 && noGen.report.missing.length === 3, 'missing generator card: shots skipped and listed, nothing substituted');
const noPort = A.buildCanvasFromDirector(p, fake({ 'image-generate': { id: 'image-generate', inputs: [{ id: 'lora', type: 'lora' }], outputs: [], params: {}, defaults: {} } }), null, null, 'f', { now: NOW });
ok(noPort.project.nodes.length === 0 && noPort.report.missing[0].reason.includes('no text port'), 'no text input: reported, not forced');

// ---- video + notes
const vid = A.buildCanvasFromDirector(p, fake(), null, null, 'f', { generator: 'video-generate', now: NOW });
const vb = vid.project.nodes.find((n) => n.id === A.genNodeId(b.shot_id));
ok(vb.defId === 'video-generate' && vb.params.seconds === 20 && vid.project.nodes.find((n) => n.id === A.genNodeId(a.shot_id)).params.seconds === 4, 'video length follows the shot, clamped to the card range');
ok(vid.project.edges[0].targetHandle === 'prompt', 'video card is wired to its own text port');
const withAsset = JSON.parse(JSON.stringify(p)); const asset = M.newAsset(withAsset, { name: 'hero', role: 'character', source: { kind: 'library', id: 3 }, note: '' }); withAsset.shots[0].asset_ids.push(asset.asset_id); withAsset.shots[2].prompt_en = '';
const rn = A.buildCanvasFromDirector(withAsset, fake(), null, null, 'f', { now: NOW });
ok(rn.report.assetsNotWired.length === 1 && rn.report.emptyPrompt.length === 1, 'assets not wired and empty prompts are reported, not hidden');
const ro = JSON.stringify(p); A.buildCanvasFromDirector(p, fake(), r1.project, r1.link, 'f', { now: NOW }); ok(JSON.stringify(p) === ro, 'the Director project is not changed by building');

// ---- the real registry
if (real) {
  const rr = real.appRegistry;
  ok(!!rr.get('prompt') && !!rr.get('image-generate') && !!rr.get('video-generate'), 'real registry has prompt, image-generate and video-generate');
  const out = A.buildCanvasFromDirector(p, rr, null, null, 'f', { now: NOW });
  ok(out.report.missing.length === 0 && out.project.nodes.length === 6, 'real registry: every shot builds');
  const ed = out.project.edges[0]; const gd = rr.get('image-generate'), pd = rr.get('prompt');
  ok(pd.outputs.some((o) => o.id === ed.sourceHandle && o.type === 'text') && gd.inputs.some((i) => i.id === ed.targetHandle && i.type === 'text'), 'real registry: the wire uses real port ids of matching type');
  ok(out.project.nodes.find((n) => n.defId === 'image-generate').params.aspect === '16:9', 'real registry: aspect from the brief is accepted by Image Generate');
  const vv = A.buildCanvasFromDirector(p, rr, null, null, 'f', { generator: 'video-generate', now: NOW });
  const vn = vv.project.nodes.find((n) => n.id === A.genNodeId(b.shot_id));
  ok(vv.report.missing.length === 0 && typeof vn.params.seconds === 'number', 'real registry: Video Generate builds with a length');
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
