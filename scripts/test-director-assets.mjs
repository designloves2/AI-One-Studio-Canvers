// Cast images that follow every clip to the end, and the package of an episode (pure logic). Run: node scripts/test-director-assets.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvers-assets-'));
const bundle = async (entry, out) => { await build({ entryPoints: [path.join(root, entry)], outfile: path.join(tmp, out), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' }); return import(pathToFileURL(path.join(tmp, out)).href); };
const M = await bundle('src/director/model.ts', 'model.mjs');
const A = await bundle('src/director/adapter.ts', 'adapter.mjs');
const C = await bundle('src/director/compose.ts', 'compose.mjs');
const Z = await bundle('src/director/zip.ts', 'zip.mjs');
const P = await bundle('src/director/exportPackage.ts', 'pkg.mjs');
let real = null; try { real = await bundle('src/director/adapterRegistry.ts', 'realreg.mjs'); } catch (e) { console.log('note: real registry not loadable in node:', e.message.split('\n')[0]); }

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const throws = (f) => { try { f(); return false; } catch { return true; } };

// ---- zip
ok(Z.crc32(new TextEncoder().encode('123456789')) === 0xCBF43926, 'crc32 matches the standard check value');
const zip = Z.buildZip([{ path: 'a.txt', data: Z.utf8('hello') }, { path: 'assets/서연.png', data: new Uint8Array([1, 2, 3]) }, { path: 'x/b.json', data: Z.utf8('{"a":1}') }]);
// read it back with a tiny unzipper (STORE): central directory -> names + data
const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
const eocd = zip.length - 22; ok(dv.getUint32(eocd, true) === 0x06054b50 && dv.getUint16(eocd + 10, true) === 3, 'the ZIP ends with a valid directory of 3 entries');
let off = dv.getUint32(eocd + 16, true); const got = [];
for (let i = 0; i < 3; i++) { const nl = dv.getUint16(off + 28, true); const lo = dv.getUint32(off + 42, true); const name = new TextDecoder().decode(zip.subarray(off + 46, off + 46 + nl)); const size = dv.getUint32(off + 24, true); const crc = dv.getUint32(off + 16, true);
  const lnl = dv.getUint16(lo + 26, true); const data = zip.subarray(lo + 30 + lnl, lo + 30 + lnl + size); got.push({ name, data: Buffer.from(data).toString('utf8'), crcOk: Z.crc32(data) === crc }); off += 46 + nl; }
ok(got[0].name === 'a.txt' && got[0].data === 'hello' && got.every((g) => g.crcOk) && got[1].name === 'assets/서연.png', 'names (Korean kept), contents and checksums read back correctly');
fs.writeFileSync(path.join(tmp, 't.zip'), zip);
try { const { execFileSync } = await import('node:child_process'); const out = execFileSync('tar', ['-tf', 't.zip'], { cwd: tmp }).toString(); ok(out.includes('a.txt') && out.includes('x/b.json'), 'an independent unzip tool (tar) lists the files'); } catch { console.log('note: no tar to cross-check'); }
for (const bad of ['../x', '/abs', 'a/../b', 'C:/x', 'a\\b', '', 'a//b', 'x'.repeat(200), 'a\u0000b', './a']) ok(!Z.isSafeZipPath(bad) && throws(() => Z.buildZip([{ path: bad, data: new Uint8Array() }])), `unsafe path refused: ${JSON.stringify(bad).slice(0, 30)}`);
ok(Z.isSafeZipPath('a') && Z.isSafeZipPath('assets/서연.png'), 'ordinary and Korean paths are fine');
ok(throws(() => Z.buildZip([{ path: 'a', data: new Uint8Array() }, { path: 'a', data: new Uint8Array() }])), 'a duplicate path is refused');
ok(Z.safeName('../a/b:c*?.png') === 'a b c .png' || !Z.safeName('../a/b:c*?.png').includes('/'), 'file names are made safe, not trusted');

// ---- a project with cast
const mk = () => {
  const p = M.newDirectorProject('용의 눈동자'); p.series.title = '용의 눈동자'; p.series.aspect = '16:9';
  const ep = M.newEpisode(p, 1, '눈을 뜨다', 'x'); const sc = M.newScene(p, ep.episode_id, 'A');
  const hana = M.newReference(p, 'character', 'Hana', 'girl'); const villa = M.newReference(p, 'location', 'Villa', 'house'); const ghost = M.newReference(p, 'prop', 'Ghost', 'no image');
  for (const r of [hana, villa]) { r.status = 'approved'; r.results.push({ result_id: 'rs_' + r.name, file: { filename: r.name + '.png', subfolder: 'o', type: 'output' }, kind: 'image', created_at: '', picked: true }); }
  const shots = [0, 1, 2].map((i) => { const s = M.newShot(p, sc.scene_id); s.prompt_en = 'clip ' + i; s.dialogue = i === 0 ? 'Hana: hi' : ''; return s; });
  shots[0].cast = ['Hana']; shots[0].location = 'Villa'; shots[1].cast = ['Hana']; shots[2].cast = []; shots[2].location = '';
  return { p, ep, hana, villa, ghost, shots };
};
const { p, ep, hana, villa, ghost, shots } = mk();
ok(M.castOf(p, shots[0]).map((r) => r.name).join() === 'Hana,Villa' && M.castOf(p, shots[2]).length === 0, 'castOf: cast first, then the place; a clip without cast has none');
const ghostShot = { cast: ['Ghost', 'Nobody'], location: '' }; ok(M.castOf(p, ghostShot).length === 0, 'cast without an image, or unknown, is skipped');
ok(C.composeClipPrompt(shots[0]).includes('References: @image1 = Hana, @image2 = Villa') && !C.composeClipPrompt(shots[2]).includes('References'), 'the prompt names the reference order (@image1 = Hana ...); no cast, no line');

// ---- adapter: connect the images
const reg = { get: (id) => ({
  prompt: { id, inputs: [], outputs: [{ id: 'text', type: 'text' }], params: {}, defaults: { text: '' } },
  import: { id, inputs: [], outputs: [{ id: 'image', type: 'image' }], params: {}, defaults: {} },
  'video-generate': { id, inputs: [{ id: 'prompt', type: 'text' }, { id: 'image', type: 'image', optional: true, multi: true }], outputs: [{ id: 'video', type: 'video' }], engineId: 'h3', engines: ['h3', 'h3-ref', 'ltx25'], params: { seconds: { min: 5.2, max: 15 } }, defaults: { seconds: 8 } },
})[id], compatible: (a, b) => a === b };
const assets = { [hana.ref_id]: { id: 'a_hana', type: 'image', url: '/view?filename=Hana.png', file: { filename: 'Hana.png', subfolder: 'o', type: 'output' } }, [villa.ref_id]: { id: 'a_villa', type: 'image', url: '/view?filename=Villa.png', file: { filename: 'Villa.png', subfolder: 'o', type: 'output' } } };
const r1 = A.buildCanvasFromDirector(p, reg, null, null, 'f', { generator: 'video-generate', episodeId: ep.episode_id, refAssets: assets });
const imp = r1.project.nodes.filter((n) => n.defId === 'import');
ok(imp.length === 2 && imp.every((n) => n.results.length === 1), 'one Load Image card per cast entry, shared by all clips, holding the image');
const g0 = r1.project.nodes.find((n) => n.id === A.genNodeId(shots[0].shot_id)), g1 = r1.project.nodes.find((n) => n.id === A.genNodeId(shots[1].shot_id)), g2 = r1.project.nodes.find((n) => n.id === A.genNodeId(shots[2].shot_id));
ok(g0.engineId === 'h3-ref' && g1.engineId === 'h3-ref' && g2.engineId === 'h3', 'clips with cast use the multi-reference engine; a clip without cast stays on the plain one');
const into = (g) => r1.project.edges.filter((e) => e.target === g.id && e.targetHandle === 'image').map((e) => e.source);
ok(into(g0).join() === `n_ref_${hana.ref_id},n_ref_${villa.ref_id}` && into(g1).join() === `n_ref_${hana.ref_id}` && into(g2).length === 0, 'images are wired in prompt order (@image1 = Hana, @image2 = Villa)');
ok(r1.report.refsWired === 3, 'three reference wires are reported');
const r2 = A.buildCanvasFromDirector(p, reg, r1.project, r1.link, 'f', { generator: 'video-generate', episodeId: ep.episode_id, refAssets: assets });
ok(r2.project.nodes.length === r1.project.nodes.length && r2.project.edges.length === r1.project.edges.length, 'building again adds no card and no wire');
const keep = JSON.parse(JSON.stringify(r1.project)); keep.nodes.find((n) => n.id === `n_ref_${hana.ref_id}`).results = [];
const r3 = A.buildCanvasFromDirector(p, reg, keep, r1.link, 'f', { generator: 'video-generate', episodeId: ep.episode_id, refAssets: assets });
ok(r3.project.nodes.find((n) => n.id === `n_ref_${hana.ref_id}`).results.length === 1, 'an image card that lost its image gets it back');
const noEngine = A.buildCanvasFromDirector(p, { ...reg, get: (id) => (id === 'video-generate' ? { ...reg.get(id), engines: ['h3'] } : reg.get(id)) }, null, null, 'f', { generator: 'video-generate', episodeId: ep.episode_id, refAssets: assets });
ok(noEngine.project.nodes.filter((n) => n.defId === 'import').length === 0 && noEngine.report.warnings.some((w) => /text only/.test(w)), 'no multi-reference engine: no wires, and the producer is told the clips are text only');
const r4 = A.buildCanvasFromDirector(p, reg, null, null, 'f', { generator: 'video-generate', episodeId: ep.episode_id, refAssets: { [hana.ref_id]: assets[hana.ref_id] } });
ok(into(r4.project.nodes.find((n) => n.id === A.genNodeId(shots[0].shot_id))).length === 0 || r4.project.edges.filter((e) => e.target === A.genNodeId(shots[0].shot_id) && e.targetHandle === 'image').length === 1, 'a cast entry without a prepared image is not wired');
if (real) {
  const rr = real.appRegistry; const out = A.buildCanvasFromDirector(p, rr, null, null, 'f', { generator: 'video-generate', episodeId: ep.episode_id, refAssets: assets });
  ok(rr.get('import') && rr.get('video-generate').engines.includes('h3-ref') && out.report.refsWired === 3 && out.report.missing.length === 0, 'real registry: Load Image + multi-reference engine exist and the wires are made');
  const e = out.project.edges.find((x) => x.target === A.genNodeId(shots[0].shot_id) && x.targetHandle === 'image');
  ok(!!e && rr.get('video-generate').inputs.some((i) => i.id === e.targetHandle && i.type === 'image'), 'real registry: the wire goes to a real image input of Video Generate');
}

// ---- casting canvas: the image model and the seed of each cast entry
{
  const reg3 = { compatible: (a, b) => a === b, get: (id) => ({
    prompt: { id, inputs: [], outputs: [{ id: 'text', type: 'text' }], params: {}, defaults: { text: '' } },
    'image-generate': { id, inputs: [{ id: 'text', type: 'text' }], outputs: [{ id: 'image', type: 'image' }], engineId: 'krea2', engines: ['krea2', 'qwen21', 'zimage'], params: { aspect: { options: ['1:1', '3:4', '16:9'] }, seed: {} }, defaults: { aspect: '1:1', seed: -1, steps: 8 },
      perEngine: { krea2: { params: { aspect: { options: ['1:1', '3:4', '16:9'] }, seed: {} }, defaults: { aspect: '1:1', seed: -1, steps: 8 } }, qwen21: { params: { aspect: { options: ['1:1', '3:4'] }, seed: {} }, defaults: { aspect: '1:1', seed: -1, steps: 20, cfg: 4 } }, zimage: { params: { size: {}, seed: {} }, defaults: { size: 1024, seed: -1 } } } },
  })[id] };
  const p2 = M.newDirectorProject('C'); p2.series.aspect = '16:9';
  const a1 = M.newReference(p2, 'character', 'Aya', 'girl', 'a girl'), a2 = M.newReference(p2, 'location', 'Hall', 'hall', 'a hall');
  const NOW = () => '2026-01-01T00:00:00.000Z';
  const bc = (proj, ex, pv, o = {}) => A.buildCastingCanvas(proj, reg3, ex, pv, 'cast', { now: NOW, ...o });
  const gen = (r, ref) => r.project.nodes.find((n) => n.id === A.refGenNodeId(ref.ref_id));
  const c1 = bc(p2, null, null);
  ok(gen(c1, a1).engineId === 'krea2' && gen(c1, a1).params.aspect === '3:4' && gen(c1, a2).params.aspect === '16:9', 'default model; a person is tall (3:4), a place takes the series aspect');
  const c2 = bc(p2, null, null, { engineId: 'qwen21' });
  ok(gen(c2, a1).engineId === 'qwen21' && gen(c2, a1).params.cfg === 4 && gen(c2, a1).params.steps === 20, 'a chosen model starts with ITS OWN defaults (not the default model\'s)');
  ok(gen(bc(p2, null, null, { engineId: 'nonexistent' }), a1).engineId === 'krea2', 'an unknown model falls back to the default');
  p2.settings.cast_engine = 'zimage'; const c3 = bc(p2, null, null);
  ok(gen(c3, a1).engineId === 'zimage' && gen(c3, a1).params.size === 1024 && !('aspect' in gen(c3, a1).params), 'the project\'s model choice is used; a model without an aspect setting gets none');
  p2.settings.cast_engine = undefined;
  // the model is changed later: untouched cards follow, a model picked in the canvas stays
  const sw = bc(p2, c1.project, c1.link, { engineId: 'qwen21' });
  ok(gen(sw, a1).engineId === 'qwen21' && gen(sw, a1).params.cfg === 4 && sw.report.updated.includes(A.refGenNodeId(a1.ref_id)) && sw.link.engine_sent[a1.ref_id] === 'qwen21', 'switching the model moves the cards that still hold the model the adapter gave them');
  const own = JSON.parse(JSON.stringify(c1.project)); own.nodes.find((n) => n.id === A.refGenNodeId(a1.ref_id)).engineId = 'zimage';
  ok(gen(bc(p2, own, c1.link, { engineId: 'qwen21' }), a1).engineId === 'zimage', 'a model the producer picked in the canvas is kept');
  const keepSeed = JSON.parse(JSON.stringify(c1.project)); keepSeed.nodes.find((n) => n.id === A.refGenNodeId(a1.ref_id)).params.seed = 55;
  ok(gen(bc(p2, keepSeed, c1.link, { engineId: 'qwen21' }), a1).params.seed === 55, 'switching the model keeps the seed that is on the card');
  // seeds: a new take of one cast entry
  a1.seed = 321; const s1 = bc(p2, c1.project, c1.link);
  ok(gen(s1, a1).params.seed === 321 && gen(s1, a2).params.seed === -1 && s1.link.seed_sent[a1.ref_id] === 321, 'a cast entry with a seed gets it on its card; the others stay random');
  const typed = JSON.parse(JSON.stringify(s1.project)); typed.nodes.find((n) => n.id === A.refGenNodeId(a1.ref_id)).params.seed = 9; a1.seed = 500;
  ok(gen(bc(p2, typed, s1.link), a1).params.seed === 9, 'a seed typed in the canvas is kept');
  a1.seed = 321; const again = bc(p2, s1.project, s1.link); ok(again.report.updated.length === 0 && again.project.nodes.length === s1.project.nodes.length, 'building again with the same choices changes nothing');
}

// ---- the package
const fetcher = async (r) => (r.name === 'Hana' ? { data: new Uint8Array([9, 9, 9]), ext: 'png' } : null);
const canvas = r1.project;
const res = await P.buildEpisodePackage(p, canvas, fetcher, () => '2026-01-01T00:00:00Z');
const names = res.files.map((f) => f.path);
ok(['manifest.json', 'README.md', 'prompts.md', 'clips.json', 'canvas.canvers.json', 'assets/Hana.png'].every((n) => names.includes(n)), 'the package has manifest, README, prompts, clips, the canvas and the fetched cast image');
ok(res.missing.length === 1 && res.missing[0].name === 'Villa' && !names.some((n) => /Villa/.test(n)), 'an image that could not be fetched is listed as missing and is NOT pretended to be inside');
const man = JSON.parse(Buffer.from(res.files.find((f) => f.path === 'manifest.json').data).toString()); ok(man.missing.length === 1 && man.files.includes('assets/Hana.png') && man.episode === 1 && man.clips === 3, 'the manifest says what is inside and what is missing');
const md = Buffer.from(res.files.find((f) => f.path === 'prompts.md').data).toString(); ok(md.includes('@image1 = Hana (assets/Hana.png)') && md.includes('@image2 = Villa (file not included)'), 'prompts.md maps @imageN to the files, and says when a file is not included');
const noCanvas = await P.buildEpisodePackage(p, null, fetcher); ok(!noCanvas.files.some((f) => f.path === 'canvas.canvers.json') && noCanvas.missing.some((m) => m.name === 'canvas.canvers.json'), 'no canvas yet: it is reported missing, not faked');
ok(throws(() => Z.buildZip(res.files)) === false && Z.buildZip(res.files).length > 100 && /ep01\.zip$/.test(res.zipName), 'the whole package builds into a ZIP named after the episode');
const weird = M.newDirectorProject('x'); weird.series.title = '../../evil'; const e2 = M.newEpisode(weird, 1, 't'); const s2 = M.newScene(weird, e2.episode_id); M.newShot(weird, s2.scene_id).prompt_en = 'p';
const w = await P.buildEpisodePackage(weird, null, fetcher); ok(!throws(() => Z.buildZip(w.files)) && !/\.\./.test(w.zipName.replace(/\.zip$/, '')) , 'a hostile project title cannot produce an unsafe file name');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
