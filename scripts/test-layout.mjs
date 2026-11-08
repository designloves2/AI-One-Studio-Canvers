// Card layout checks. Run: node scripts/test-layout.mjs  (pure functions, no ComfyUI, nothing written outside a temp folder)
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvers-layout-'));
await build({ entryPoints: [path.join(root, 'src/canvas/layout.ts')], outfile: path.join(tmp, 'layout.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' });
const L = await import(pathToFileURL(path.join(tmp, 'layout.mjs')).href);

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const node = (id, defId, extra = {}) => ({ id, defId, x: 0, y: 0, params: { aspect: '9:16', ...(extra.params ?? {}) }, results: [], activeResult: 0, ...extra });
const edge = (a, b) => ({ id: `e_${a}_${b}`, source: a, sourceHandle: 'o', target: b, targetHandle: 'i' });
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const boxes = (nodes, pos) => nodes.map((n) => ({ id: n.id, ...pos.get(n.id), ...L.estimateBox(n) }));
const anyOverlap = (bs) => { for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) if (overlap(bs[i], bs[j])) return `${bs[i].id} / ${bs[j].id}`; return null; };

// a drama episode: 9 clips (prompt -> video), 5 reference images + 7+1 feeding every video, stitch -> final, a song into the final
const nodes = [], edges = [];
for (let i = 1; i <= 9; i++) { nodes.push(node(`t${i}`, 'prompt', { params: { text: 'x'.repeat(900) } }), node(`g${i}`, 'video-generate')); edges.push(edge(`t${i}`, `g${i}`)); }
for (let r = 1; r <= 5; r++) { nodes.push(node(`r${r}`, 'import')); for (let i = 1; i <= 9; i++) edges.push(edge(`r${r}`, `g${i}`)); }
nodes.push(node('turbo', 'h3-turbo')); for (let i = 1; i <= 9; i++) edges.push(edge('turbo', `g${i}`));
nodes.push(node('stitch', 'video-stitch'), node('song', 'import-audio'), node('final', 'video-audio'));
for (let i = 1; i <= 9; i++) edges.push(edge(`g${i}`, 'stitch'));
edges.push(edge('stitch', 'final'), edge('song', 'final'));

const pos = L.layoutCards(nodes, edges);
ok(pos.size === nodes.length, 'every card gets a place');
ok(anyOverlap(boxes(nodes, pos)) === null, `no two cards overlap (${anyOverlap(boxes(nodes, pos)) ?? 'clean'})`);
const gx = [...new Set(nodes.filter((n) => n.id.startsWith('g')).map((n) => Math.round(pos.get(n.id).x)))];
const gy = [...new Set(nodes.filter((n) => n.id.startsWith('g')).map((n) => Math.round(pos.get(n.id).y)))];
ok(gx.length === 3 && gy.length === 3, `9 clips are a 3 x 3 grid (${gx.length} columns, ${gy.length} rows)`);
ok(nodes.filter((n) => /^t\d$/.test(n.id)).every((n) => pos.get(n.id).x < pos.get('g' + n.id.slice(1)).x), 'each prompt stands left of its video');
ok(['r1', 'r5', 'turbo'].every((id) => pos.get(id).x < Math.min(...nodes.filter((n) => /^t\d$/.test(n.id)).map((n) => pos.get(n.id).x))), 'shared reference cards stand left of the grid');
ok(pos.get('stitch').x > Math.max(...nodes.filter((n) => n.id.startsWith('g')).map((n) => pos.get(n.id).x)), 'the joined video stands right of the grid');
ok(pos.get('final').x > pos.get('stitch').x, 'the final video follows the joined video');

// 4 chains -> 2 x 2 ; 2 chains -> 2 across ; loose cards go below
const few = [], fe = [];
for (let i = 1; i <= 4; i++) { few.push(node(`a${i}`, 'prompt'), node(`b${i}`, 'image-generate')); fe.push(edge(`a${i}`, `b${i}`)); }
const p4 = L.layoutCards(few, fe);
ok(new Set(few.filter((n) => n.id[0] === 'b').map((n) => Math.round(p4.get(n.id).x))).size === 2, '4 chains make 2 columns');
const mix = [...few, node('lone1', 'note'), node('lone2', 'note')];
const pm = L.layoutCards(mix, fe);
const bottom = Math.max(...few.map((n) => pm.get(n.id).y + L.estimateBox(n).h));
ok(pm.get('lone1').y >= bottom, 'cards without wires go below the chains');
ok(anyOverlap(boxes(mix, pm)) === null, 'no overlap with loose cards');

// a long single chain stays one row (left to right), taller results do not overlap
const chain = [node('p', 'prompt'), node('v', 'video-generate'), node('u', 'video-stitch')]; const ce = [edge('p', 'v'), edge('v', 'u')];
const pc = L.layoutCards(chain, ce);
ok(pc.get('p').x < pc.get('v').x && pc.get('v').x < pc.get('u').x, 'a chain runs left to right');
ok(L.estimateBox(node('v', 'video-generate')).h > 900, 'a video card reserves room for its result');

// measured size is kept, but a card without results still keeps the result room free
const m = L.reserveBox(node('v', 'video-generate'), { w: 300, h: 560 });
ok(m.h > 900, 'a measured card that has no result yet still reserves the result room');
const m2 = L.reserveBox(node('v', 'video-generate'), { w: 300, h: 1300 });
ok(m2.h === 1300, 'a taller measured card is trusted');

console.log(fails ? `\n${fails} failed` : '\nall passed');
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fails ? 1 : 0);
