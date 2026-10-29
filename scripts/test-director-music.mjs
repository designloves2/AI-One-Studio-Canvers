// The song of a music video, the song step, the finished episode (pure logic, no LLM / ComfyUI). Run: node scripts/test-director-music.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvers-music-'));
const bundle = async (entry, out) => { await build({ entryPoints: [path.join(root, entry)], outfile: path.join(tmp, out), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' }); return import(pathToFileURL(path.join(tmp, out)).href); };
const M = await bundle('src/director/model.ts', 'model.mjs');
const MU = await bundle('src/director/music.ts', 'music.mjs');
const W = await bundle('src/director/workflow.ts', 'workflow.mjs');
const AI = await bundle('src/director/ai.ts', 'ai.mjs');
const A = await bundle('src/director/adapter.ts', 'adapter.mjs');
const X = await bundle('src/director/execution.ts', 'exec.mjs');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const NOW = () => '2026-01-01T00:00:00.000Z';

// ---- sections
const ds = MU.defaultSections(180);
ok(ds.length === 9 && ds[0].start_sec === 0 && ds.at(-1).end_sec === 180 && ds.every((s, i) => s.end_sec > s.start_sec && (i === 0 || s.start_sec === ds[i - 1].end_sec)), 'the default song shape is one unbroken run from 0 to the end');
ok(ds.filter((s) => s.name === 'chorus').length === 2 && ds[0].name === 'intro' && ds.at(-1).name === 'outro', 'intro, verses, two choruses, bridge, outro');
ok(MU.defaultSections(5).length === 0, 'a song shorter than 10 s gets no shape');
const messy = MU.normalizeSections([{ name: 'chorus', start_sec: 50, end_sec: 90 }, { name: 'nonsense', start_sec: 0, end_sec: 10 }, { name: 'intro', start_sec: 0, end_sec: 20 }, { name: 'verse', start_sec: 15, end_sec: 50 }], 100);
ok(messy.map((s) => s.name).join() === 'intro,verse,chorus' && messy[0].start_sec === 0 && messy[1].start_sec === 20 && messy.at(-1).end_sec === 100, 'sections are sorted, unknown names dropped, overlaps and gaps closed, the last one reaches the end');
ok(MU.normalizeSections('x', 100).length === 0 && MU.normalizeSections([], 100).length === 0, 'garbage gives no sections');

// ---- patch
const m = MU.newMusic(); const notes = [];
MU.applyMusicPatch(m, { source: 'generate', title: ' Night ', duration_sec: 9999, bpm: 500, language: 'en', style: 'k-pop' }, notes);
ok(m.source === 'generate' && m.title === 'Night' && m.duration_sec === 600 && notes.length === 1 && m.bpm === 240 && m.language === 'en', 'the song data is limited to sensible values and the producer is told');
ok(m.sections.length === 9 && m.sections.at(-1).end_sec === 600, 'a song with a length but no sections gets the default shape');
MU.applyMusicPatch(m, { source: 'wrong', bpm: 10, duration_sec: 120 }, []); ok(m.source === 'generate' && m.bpm === 0 && m.duration_sec === 120 && m.sections.at(-1).end_sec === 120, 'an unknown source is ignored; a BPM outside 40-240 clears it; a new length rescales the sections');
MU.applyMusicPatch(m, { sections: [{ name: 'intro', start_sec: 0, end_sec: 30 }, { name: 'chorus', start_sec: 30, end_sec: 120 }] }, []);
ok(m.sections.length === 2 && m.sections[1].end_sec === 120, 'the crew\'s own sections are taken');

// ---- which part of the song every clip covers
const sm = MU.songMap(180, 10, MU.defaultSections(180));
ok(sm.length === 18 && sm[0].from === 0 && sm[0].to === 10 && sm.at(-1).to === 180 && sm[0].section === 'intro' && sm.at(-1).section === 'outro', 'a 3:00 song is 18 clips of 10 s; the first is the intro, the last the outro');
ok(MU.songMap(95, 10, MU.defaultSections(95)).reduce((a, c) => a + (c.to - c.from), 0) === 95, 'an odd length keeps its total');

// ---- the song step of the line (music videos only)
const mv = M.newDirectorProject('MV'); mv.series.format = 'musicvideo'; mv.series.total_episodes = 1;
mv.workflow.stage = 'references'; mv.workflow.status.references = 'review_required';
const r1 = M.newReference(mv, 'character', 'Haerin', 'singer', 'a singer'); r1.results.push({ result_id: 'rs_1', file: { filename: 'a.png', subfolder: '', type: 'output' }, kind: 'image', created_at: '', picked: true });
let a = W.approveStage(mv);
ok(a.ok && a.to === 'music' && a.kickoff === null && mv.workflow.status.music === 'review_required', 'after the casting a music video goes to the SONG step, waiting for the producer (no automatic job)');
ok(W.approveStage(mv).ok === false && /where the song comes from/.test(W.approveStage(mv).reason), 'the song cannot be approved before a source is chosen');
mv.music = MU.newMusic(); mv.music.source = 'upload';
ok(/uploaded/.test(W.approveStage(mv).reason), 'an upload without a file is refused');
MU.applyMusicPatch(mv.music, { title: 'My song', duration_sec: 200 });
mv.music.candidates.push({ result_id: 'rs_s', file: { filename: 's.mp3', subfolder: '', type: 'input' }, kind: 'audio', created_at: '', picked: true, source: 'upload' });
ok(W.blockers(mv, 'music').length === 0, 'a picked song file with a length and sections can be approved');
a = W.approveStage(mv);
ok(a.ok && a.to === 'series' && a.kickoff === 'series' && mv.series.episode_seconds === 200 && mv.series.total_episodes === 1 && mv.music.status === 'approved', 'approving the song fixes the length of the piece to the song and goes on to the scenario');
const dr = M.newDirectorProject('D'); dr.workflow.stage = 'references'; dr.workflow.status.references = 'review_required'; const d1 = M.newReference(dr, 'character', 'X', '', ''); d1.results.push({ result_id: 'rs_2', file: { filename: 'a.png', subfolder: '', type: 'output' }, kind: 'image', created_at: '', picked: true });
ok(W.approveStage(dr).to === 'series' && dr.workflow.status.music === 'idle', 'a drama has no song step: casting goes straight to the scenario');
ok(W.reopenStage(mv, 'music') && mv.workflow.stage === 'music' && mv.workflow.status.series === 'idle', 'the producer can go back to the song');

// ---- the crew
mv.workflow.stage = 'music'; mv.music.source = 'generate'; mv.music.candidates = []; mv.music.title = '';
const sys = AI.buildSystem(mv); ok(sys.includes('SONG: ') && sys.includes('sections:') && sys.includes('clips:') && sys.includes('"music": {'), 'the crew is shown the song, its sections and the clip map');
const gi = AI.kickoffInstruction(mv, 'music'); ok(/Write the song/.test(gi) && /lyrics/.test(gi), 'for a generated song the crew writes style, lyrics, length, sections');
const mu2 = M.newDirectorProject('U'); mu2.series.format = 'musicvideo'; mu2.music = MU.newMusic(); mu2.music.source = 'upload'; MU.applyMusicPatch(mu2.music, { duration_sec: 150, title: 'Own' });
ok(/uploaded their own song/.test(AI.kickoffInstruction(mu2, 'music')) && /cannot hear/.test(AI.kickoffInstruction(mu2, 'music')), 'for an uploaded song the crew proposes the structure (it cannot hear the file)');
mu2.workflow.episode_no = 1; M.newEpisode(mu2, 1, 't'); const ei = AI.kickoffInstruction(mu2, 'episode');
ok(/THE SONG MAP/.test(ei) && /clip 1 = 0-10s intro/.test(ei) && /lyric line/.test(ei), 'writing the clips of a music video: each clip is told which part of the song it covers');
// a song reply without sections is sent back; with them it is applied; `generate` is a command, not data
const seen = []; const llm = async (system) => { seen.push(system); return JSON.stringify(seen.length === 1 ? { say: 'x', music: { title: 'T', style: 'pop', lyrics: 'la', duration_sec: 120 } } : { say: 'ok', music: { source: 'generate', title: 'T', style: 'pop', lyrics: 'la la', language: 'ko', duration_sec: 120, bpm: 100, sections: [{ name: 'intro', start_sec: 0, end_sec: 20 }, { name: 'chorus', start_sec: 20, end_sec: 120 }], generate: true } }); };
const g = M.newDirectorProject('G'); g.series.format = 'musicvideo'; g.music = MU.newMusic(); g.music.source = 'generate';
const res = await AI.directorTurn(g, AI.kickoffInstruction(g, 'music'), llm, { kickoff: 'music' });
ok(res.attempts === 2 && seen[1].includes('REJECTED') && g.music.title === 'T' && g.music.sections.length === 2 && g.music.duration_sec === 120 && g.music.bpm === 100 && !('generate' in g.music), 'a song without sections is sent back once; the accepted one is applied and the "generate" command is not stored as data');
ok(res.reply.music.generate === true, 'the command to make the song now is kept on the reply for the app');
const chat = M.newDirectorProject('C'); chat.series.format = 'musicvideo';
AI.applyReply(chat, { say: '', music: { source: 'upload' } }); ok(chat.music.source === 'upload', 'the producer can choose the source by chat ("my own song")');

// ---- the music canvas
const reg = { compatible: (x, y) => x === y, get: (id) => ({
  prompt: { id, inputs: [], outputs: [{ id: 'text', type: 'text' }], params: {}, defaults: { text: '' } },
  'music-generate': { id, inputs: [{ id: 'prompt', type: 'text' }, { id: 'lyrics', type: 'text', optional: true }], outputs: [{ id: 'audio', type: 'audio' }], engineId: 'acestep', engines: ['acestep', 'yue2', 'minimax'],
    params: { seconds: { min: 5, max: 300 }, bpm: { min: 40, max: 240 }, language: { options: ['en', 'ko'] }, seed: {} }, defaults: { seconds: 60, bpm: 120, language: 'en', seed: -1 },
    perEngine: { acestep: { params: { seconds: { min: 5, max: 300 }, bpm: { min: 40, max: 240 }, language: { options: ['en', 'ko'] }, seed: {} }, defaults: { seconds: 60, bpm: 120, language: 'en', seed: -1 } }, yue2: { params: { seconds: { min: 10, max: 300 }, seed: {} }, defaults: { seconds: 60, seed: -1 } }, minimax: { params: { seconds: { min: 5, max: 300 }, seed: {} }, defaults: { seconds: 60, seed: -1 } } } },
})[id] };
const song = M.newDirectorProject('S'); song.music = MU.newMusic(); MU.applyMusicPatch(song.music, { source: 'generate', title: 'T', style: 'k-pop, 110 bpm', lyrics: 'la la', language: 'ko', duration_sec: 200, bpm: 110 });
const mc = A.buildMusicCanvas(song, reg, null, null, 'song', { now: NOW });
const node = (r, id) => r.project.nodes.find((n) => n.id === id);
ok(mc.project.nodes.length === 3 && mc.project.edges.length === 2 && node(mc, A.MUSIC_GEN_ID).params.seconds === 200 && node(mc, A.MUSIC_GEN_ID).params.bpm === 110 && node(mc, A.MUSIC_GEN_ID).params.language === 'ko' && node(mc, A.MUSIC_STYLE_ID).params.text === 'k-pop, 110 bpm', 'style + lyrics + generator with the song length, BPM and language');
ok(mc.link.purpose === 'music' && mc.link.music_nodes.length === 3, 'the link says it is the music canvas');
const mc2 = A.buildMusicCanvas(song, reg, mc.project, mc.link, 'song', { now: NOW }); ok(mc2.project.nodes.length === 3 && mc2.report.updated.length === 0, 'building again changes nothing');
song.music.duration_sec = 240; song.music.style = 'ballad'; const mc3 = A.buildMusicCanvas(song, reg, mc.project, mc.link, 'song', { now: NOW });
ok(node(mc3, A.MUSIC_GEN_ID).params.seconds === 240 && node(mc3, A.MUSIC_STYLE_ID).params.text === 'ballad', 'a new length and style reach the untouched cards');
const typed = JSON.parse(JSON.stringify(mc3.project)); node({ project: typed }, A.MUSIC_GEN_ID).params.seconds = 99; node({ project: typed }, A.MUSIC_STYLE_ID).params.text = 'MY STYLE'; song.music.duration_sec = 260; song.music.style = 'rock';
const mc4 = A.buildMusicCanvas(song, reg, typed, mc3.link, 'song', { now: NOW });
ok(node(mc4, A.MUSIC_GEN_ID).params.seconds === 99 && node(mc4, A.MUSIC_STYLE_ID).params.text === 'MY STYLE' && mc4.report.keptUserText.length === 1, 'a length and a style the producer typed in the canvas are kept');
const mc5 = A.buildMusicCanvas(song, reg, mc.project, mc.link, 'song', { now: NOW, engineId: 'yue2' }); ok(node(mc5, A.MUSIC_GEN_ID).engineId === 'yue2' && !('bpm' in node(mc5, A.MUSIC_GEN_ID).params), 'another music engine: the card follows with that engine\'s own settings');
ok(A.buildMusicCanvas(M.newDirectorProject('N'), reg, null, null, 'f').report.missing.length === 1, 'no song: nothing is built, and it says so');

// ---- reading the song back
const gen = (id, results) => ({ id, results });
const sg = { ...mc.link }; const n1 = [gen(A.MUSIC_GEN_ID, [{ id: 'a1', type: 'audio', url: '/v', file: { filename: 's.flac', subfolder: '', type: 'output' } }])];
ok(X.applyMusicResult(song, sg, n1, NOW) === 1 && song.music.candidates.length === 1 && song.music.candidates[0].picked && song.music.candidates[0].kind === 'audio', 'the generated song comes back as the picked candidate');
ok(X.applyMusicResult(song, sg, n1, NOW) === 0, 'reading it again adds nothing');
n1[0].results.push({ id: 'a2', type: 'audio', url: '/v', file: { filename: 's2.flac', subfolder: '', type: 'output' } }); X.applyMusicResult(song, sg, n1, NOW);
ok(song.music.candidates.length === 2 && song.music.candidates.filter((c) => c.picked).length === 1 && song.music.candidates[1].picked, 'a new take becomes the picked one; the old one stays as a candidate');

// ---- the finished episode: the clips joined in order, the song on top
const fin = M.newDirectorProject('F'); fin.series.format = 'musicvideo'; const ep = M.newEpisode(fin, 1, 'a'); const sc = M.newScene(fin, ep.episode_id); const shots = [0, 1, 2].map(() => { const s = M.newShot(fin, sc.scene_id); s.prompt_en = 'x'; return s; });
const reg2 = { compatible: (x, y) => x === y, get: (id) => ({
  prompt: { id, inputs: [], outputs: [{ id: 'text', type: 'text' }], params: {}, defaults: { text: '' } },
  'video-generate': { id, inputs: [{ id: 'prompt', type: 'text' }], outputs: [{ id: 'video', type: 'video' }], engineId: 'h3', params: { seconds: { min: 5, max: 15 } }, defaults: { seconds: 8 } },
  'video-stitch': { id, inputs: [{ id: 'videos', type: 'video', multi: true }], outputs: [{ id: 'video', type: 'video' }], params: {}, defaults: { mode: 'concat' } },
  'video-audio': { id, inputs: [{ id: 'video', type: 'video' }, { id: 'audio', type: 'audio' }], outputs: [{ id: 'video', type: 'video' }], params: {}, defaults: { start: 0 } },
  'import-audio': { id, inputs: [], outputs: [{ id: 'audio', type: 'audio' }], params: {}, defaults: {} },
})[id] };
const songAsset = { id: 'sa', type: 'audio', url: '/view?filename=s.mp3', file: { filename: 's.mp3', subfolder: '', type: 'input' } };
const f1 = A.buildCanvasFromDirector(fin, reg2, null, null, 'f', { generator: 'video-generate', episodeId: ep.episode_id, now: NOW, finish: { stitch: true, audio: songAsset } });
const st = f1.project.nodes.find((n) => n.defId === 'video-stitch'), va = f1.project.nodes.find((n) => n.defId === 'video-audio'), au = f1.project.nodes.find((n) => n.defId === 'import-audio');
ok(!!st && !!va && !!au && au.results.length === 1 && f1.link.final_node_id === va.id, 'a stitch card, a song card and an Add Audio card; the last one is the finished episode');
ok(f1.project.edges.filter((e) => e.target === st.id).map((e) => e.source).join() === shots.map((s) => A.genNodeId(s.shot_id)).join(), 'the clips are wired into the stitch card in clip order');
ok(f1.project.edges.some((e) => e.source === st.id && e.target === va.id) && f1.project.edges.some((e) => e.source === au.id && e.target === va.id && e.targetHandle === 'audio'), 'joined video + song go into Add Audio');
const f2 = A.buildCanvasFromDirector(fin, reg2, f1.project, f1.link, 'f', { generator: 'video-generate', episodeId: ep.episode_id, now: NOW, finish: { stitch: true, audio: songAsset } });
ok(f2.project.nodes.length === f1.project.nodes.length && f2.project.edges.length === f1.project.edges.length, 'building again adds no card and no wire');
// a clip left out is not in the joined video; put back, it returns IN ITS PLACE (clip order)
shots[1].excluded = true;
const fx = A.buildCanvasFromDirector(fin, reg2, f1.project, f1.link, 'f', { generator: 'video-generate', episodeId: ep.episode_id, now: NOW, finish: { stitch: true, audio: songAsset } });
ok(fx.project.edges.filter((e) => e.target === st.id).map((e) => e.source).join() === [shots[0], shots[2]].map((s) => A.genNodeId(s.shot_id)).join(), 'a clip that is left out is taken out of the joined video');
shots[1].excluded = undefined;
const fy = A.buildCanvasFromDirector(fin, reg2, fx.project, fx.link, 'f', { generator: 'video-generate', episodeId: ep.episode_id, now: NOW, finish: { stitch: true, audio: songAsset } });
ok(fy.project.edges.filter((e) => e.target === st.id).map((e) => e.source).join() === shots.map((s) => A.genNodeId(s.shot_id)).join(), 'put back, the clip is joined in its own place again (not at the end)');
const f3 = A.buildCanvasFromDirector(fin, reg2, null, null, 'f', { generator: 'video-generate', episodeId: ep.episode_id, now: NOW, finish: { stitch: true } });
ok(f3.project.nodes.some((n) => n.defId === 'video-stitch') && !f3.project.nodes.some((n) => n.defId === 'video-audio') && f3.link.final_node_id === f3.project.nodes.find((n) => n.defId === 'video-stitch').id, 'a drama episode: the clips joined, no song');
const noStitch = A.buildCanvasFromDirector(fin, { ...reg2, get: (id) => (id === 'video-stitch' ? undefined : reg2.get(id)) }, null, null, 'f', { generator: 'video-generate', episodeId: ep.episode_id, now: NOW, finish: { stitch: true } });
ok(noStitch.report.warnings.some((w) => /joined/.test(w)) && !noStitch.link.final_node_id, 'no Video Stitch card: the clips are made, and the producer is told there is no joined video');
const noAudio = A.buildCanvasFromDirector(fin, { ...reg2, get: (id) => (id === 'video-audio' ? undefined : reg2.get(id)) }, null, null, 'f', { generator: 'video-generate', episodeId: ep.episode_id, now: NOW, finish: { stitch: true, audio: songAsset } });
ok(noAudio.report.warnings.some((w) => /song/.test(w)) && noAudio.link.final_node_id === noAudio.project.nodes.find((n) => n.defId === 'video-stitch').id, 'no Add Audio card: the joined video is the finished episode, and the producer is told it has no song');
const nodes = [gen(va.id, [{ id: 'v1', type: 'video', url: '/v', file: { filename: 'final.mp4', subfolder: 'o', type: 'output' } }])];
ok(X.applyEpisodeFinal(fin, f1.link, nodes, NOW) === 1 && fin.episodes[0].final.kind === 'video' && fin.episodes[0].final.picked, 'the finished episode comes back into the episode');
ok(X.applyEpisodeFinal(fin, f1.link, nodes, NOW) === 0 && X.applyEpisodeFinal(fin, f1.link, [], NOW) === 0, 'reading it again, or a canvas without the card, adds nothing');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
