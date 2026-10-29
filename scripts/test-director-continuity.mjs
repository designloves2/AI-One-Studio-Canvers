// Continuing an earlier project (pure logic, no LLM). Run: node scripts/test-director-continuity.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvers-cont-'));
const bundle = async (entry, out) => { await build({ entryPoints: [path.join(root, entry)], outfile: path.join(tmp, out), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' }); return import(pathToFileURL(path.join(tmp, out)).href); };
const M = await bundle('src/director/model.ts', 'model.mjs');
const K = await bundle('src/director/continuity.ts', 'cont.mjs');
const AI = await bundle('src/director/ai.ts', 'ai.mjs');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

// ---- which project does the sentence name?
const list = [{ name: '용의 눈동자 1편' }, { name: '용의 눈동자 2편 초안' }, { name: '막장 인생' }, { name: 'drama', title: 'Dragon Eye' }];
ok(K.matchProjects('용의 눈동자 1편내용에 이어지는 2편의 내용을 만들자.', list).join() === '용의 눈동자 1편', 'the exact name in the sentence picks that project (spaces do not matter)');
ok(K.matchProjects('용의눈동자 1편 이어서 만들어줘', list).join() === '용의 눈동자 1편', 'a name typed without spaces still matches');
ok(K.matchProjects('용의 눈동자 후속편을 만들자', list).length === 2, 'only the series name: every part of it is a candidate (the producer is asked)');
ok(K.matchProjects('새 드라마를 만들자', list).length === 0, 'no project named: nothing is attached');
ok(K.matchProjects('dragon eye part 2 please', list).join() === 'drama', 'the series title of a project also matches');
ok(K.matchProjects('용의 눈동자 1편 이어서', list, ['용의 눈동자 1편']).join() !== '용의 눈동자 1편', 'the project being worked on is never attached to itself');

// ---- a finished episode 1
const q = M.newDirectorProject('용의 눈동자 1편');
Object.assign(q.series, { title: '용의 눈동자', genre: '판타지', tone: '웅장', logline: '용의 눈을 가진 소녀', synopsis: '소녀가 용의 눈의 비밀을 알게 된다.', total_episodes: 2, episode_seconds: 60, clip_seconds: 10, aspect: '9:16', resolution: '720p', preset: 'h3_plain', sound_direction: '바람 소리', music_direction: '북소리' });
const e1 = M.newEpisode(q, 1, '눈을 뜨다', '소녀의 눈이 금빛으로 변한다'); const e2 = M.newEpisode(q, 2, '불길', '마을이 불탄다');
const sc = M.newScene(q, e1.episode_id, '산'); sc.summary = '산 정상';
const s1 = M.newShot(q, sc.scene_id); s1.prompt_en = 'A girl opens golden eyes on a mountain'; s1.dialogue = 'Hana: 이게 뭐지?'; s1.cast = ['Hana'];
const hana = M.newReference(q, 'character', 'Hana', 'girl, 16, black hair', 'full body girl'); hana.status = 'approved';
hana.results.push({ result_id: 'rs_a', file: { filename: 'hana.png', subfolder: '', type: 'output' }, kind: 'image', created_at: '', picked: true });
const outfit = M.newReference(q, 'character', 'Hana armor', 'same girl in armor', 'girl in armor'); outfit.variant_of = 'Hana'; outfit.status = 'approved';
const rej = M.newReference(q, 'prop', 'Unused', 'x', 'x'); rej.status = 'rejected';
const asset = M.newAsset(q, { name: 'Hana', role: 'character', source: { kind: 'library', id: 21 }, note: '' }); hana.asset_id = asset.asset_id;
e1.status = 'approved';

// ---- what the crew reads
const sum = K.summarizePrevious(q);
ok(sum.includes('용의 눈동자') && sum.includes('판타지') && sum.includes('9:16') && sum.includes('Hana armor (look of Hana)') && !sum.includes('Unused'), 'the summary has the series, the settings and the cast (rejected cast left out)');
ok(sum.includes('A girl opens golden eyes') && sum.includes('Hana: 이게 뭐지?') && sum.includes('episode 2 "불길"'), 'it holds the clips and dialogue of the finished episode and the planned ones');
const big = M.newDirectorProject('big'); for (let i = 1; i <= 30; i++) { const e = M.newEpisode(big, i, 'T' + i, 'L'.repeat(150)); const x = M.newScene(big, e.episode_id, 's'); for (let j = 0; j < 9; j++) { const h = M.newShot(big, x.scene_id); h.prompt_en = 'p'.repeat(150) + i; h.dialogue = 'd'.repeat(100); } }
const bs = K.summarizePrevious(big, 14000);
ok(bs.length <= 14500 && bs.includes('episode 30 "T30"') && bs.includes(`${'p'.repeat(150)}30`) && bs.includes('episode 1 "T1"'), '30 long episodes stay within the budget: the newest keep their clips, the oldest shrink to one line, none is dropped');

// ---- the new project takes over the cast
const p = M.newDirectorProject('용의 눈동자 2편');
const r = K.inheritFrom(p, q, '용의 눈동자 1편');
ok(r.cast === 2 && r.assets === 1 && p.references.length === 2 && p.references.every((x) => x.status === 'approved'), 'the two cast entries come over approved (the rejected one does not)');
ok(p.references[0].results.length === 1 && p.references[0].results[0].picked && p.references[0].ref_id !== hana.ref_id, 'their images come over, so nothing is generated again; ids are new');
ok(p.references[0].asset_id && p.references[0].asset_id !== asset.asset_id && p.assets.find((a) => a.asset_id === p.references[0].asset_id)?.source.id === 21, 'the registered Asset Library entry is shared (same library id, new project asset id)');
ok(p.references[1].variant_of === 'Hana', 'the costume variant keeps pointing at its base');
q.series.format = 'musicvideo'; const pk = M.newDirectorProject('K'); K.inheritFrom(pk, q, 'f'); ok(pk.series.format === 'musicvideo', 'the kind of work is taken over from the earlier project');
ok(p.series.aspect === '9:16' && p.series.resolution === '720p' && p.series.preset === 'h3_plain' && p.series.music_direction === '북소리' && p.series.title === '' && p.series.total_episodes === 1, 'look and sound settings come over; the title and the number of episodes are the new work\'s own');
ok(p.episodes.length === 0 && p.scenes.length === 0 && p.shots.length === 0 && p.continues[0].name === '용의 눈동자 1편', 'episodes and clips are not copied; the link to the earlier project is kept');
ok(M.validateDirectorProject(p).errors.length === 0, 'the new project is valid');
q.references[0].description = 'CHANGED'; ok(p.references[0].description === 'girl, 16, black hair', 'the copy is independent of the old project');

// ---- the crew is told
const sys = AI.buildSystem(p, [sum]);
ok(sys.includes('CONTINUES EARLIER WORK') && sys.includes('PREVIOUS WORK: "용의 눈동자 1편"') && sys.includes('CAST') && sys.includes('Hana armor (look of Hana)'), 'the system prompt carries the earlier work and the cast');
ok(!AI.buildSystem(p).includes('CONTINUES EARLIER WORK'), 'a project that continues nothing gets no such block');
const q2 = M.newDirectorProject('Q'); K.attachContext(q2, q, 'f'); K.attachContext(q2, q, 'f');
ok(q2.continues.length === 1 && q2.references.length === 0, 'attaching as reading material copies no cast and does not repeat');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
