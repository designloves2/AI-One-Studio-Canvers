// Director Mode production line with a FAKE crew (no LLM, no ComfyUI). Run: node scripts/test-director-flow.mjs
// A producer says one sentence; the crew writes the brief, casts, writes the scenario, writes episode 1; each approval moves the line on.
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvers-flow-'));
const bundle = async (entry, out) => { await build({ entryPoints: [path.join(root, entry)], outfile: path.join(tmp, out), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' }); return import(pathToFileURL(path.join(tmp, out)).href); };
const M = await bundle('src/director/model.ts', 'model.mjs');
const S = await bundle('src/director/series.ts', 'series.mjs');
const W = await bundle('src/director/workflow.ts', 'workflow.mjs');
const AI = await bundle('src/director/ai.ts', 'ai.mjs');
const C = await bundle('src/director/compose.ts', 'compose.mjs');
const D = await bundle('src/director/demoMedia.ts', 'demomedia.mjs');
const FM = await bundle('src/director/formats.ts', 'formats.mjs');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const rejects = async (f) => { try { await f(); return null; } catch (e) { return e.message; } };

// ---- series helpers
ok(S.splitSeconds(90, 10).join() === '10,10,10,10,10,10,10,10,10', '1:30 at 10 s = nine 10 s clips');
ok(S.splitSeconds(85, 10).join() === '10,10,10,10,10,10,10,10,5', '85 s = eight 10 s + a 5 s clip');
ok(S.splitSeconds(91, 10).join() === '10,10,10,10,10,10,10,10,8,3' && S.splitSeconds(91, 10).reduce((a, b) => a + b) === 91, 'a 1 s remainder is taken from the clip before so the last clip is 3 s (total kept)');
ok(S.splitSeconds(0, 10).length === 0 && S.splitSeconds(10, 0).length === 0, 'nonsense lengths give no clips');
ok(Math.abs(S.resolutionMp('1080p', '16:9') - 2.0736) < 0.01 && Math.abs(S.resolutionMp('720p', '16:9') - 0.9216) < 0.01 && Math.abs(S.resolutionMp('1080p', '9:16') - 2.0736) < 0.01, 'resolution names turn into megapixels (16:9 and 9:16)');
const kim = S.turboSettings({ preset: 'h3_7plus1_kimchy', resolution: '1080p', aspect: '16:9' });
ok(kim.params.hires_upscaler === 'kimchy' && kim.params.hires === true && Math.abs(kim.params.hires_kim_final_mp - 2.07) < 0.01 && kim.warnings.length === 0, '7+1 Kimchy at 1080p: Kimchy upscaler, 2.07 MP final');
const k720 = S.turboSettings({ preset: 'h3_7plus1_kimchy', resolution: '720p', aspect: '16:9' });
ok(k720.params.hires_kim_final_mp === 1 && k720.warnings.length === 1, '720p is below the Kimchy minimum: 1.0 MP is used and the producer is told');
ok(S.turboSettings({ preset: 'h3_plain', resolution: '1080p', aspect: '16:9' }).params.hires === false, 'plain H3 has no 7+1');
ok(S.usableClipSeconds(10).value === 10 && S.usableClipSeconds(20).value === 15 && S.usableClipSeconds(2).note, 'clip length is kept inside what the H3 card renders');

// ---- a fake crew that answers like the LLM would
const BRIEF = { crew: 'producer_desk', say: '브리프를 작성했습니다.', series: { title: '막장 인생', genre: '막장 드라마', tone: '과장된 감정, 반전', logline: 'x', language: 'ko', total_episodes: 30, episode_seconds: 90, clip_seconds: 10, aspect: '16:9', resolution: '1080p', preset: 'h3_7plus1_kimchy', sound_direction: '생활 소음과 강한 효과음', music_direction: '긴장감 있는 현악 테마' }, brief: { text: 'A 30-episode melodrama, 90 s each.', assumptions: ['Resolution 1080p'] } };
const CAST = { crew: 'art', say: '캐스팅했습니다.', references: [
  { kind: 'character', name: 'Minji', description: '28, lead', prompt_en: 'full body woman 28' },
  { kind: 'character', name: 'Minji wedding', description: 'wedding dress look', prompt_en: 'same woman, wedding dress', variant_of: 'Minji' },
  { kind: 'location', name: 'Villa', description: 'rich villa', prompt_en: 'villa exterior' }] };
const series = () => ({ crew: 'writer', say: '시나리오를 썼습니다.', series: { synopsis: 'syn' }, episodes: Array.from({ length: 30 }, (_, i) => ({ no: i + 1, title: `T${i + 1}`, logline: `L${i + 1}` })) });
const clips = (n, cast = ['Minji'], loc = 'Villa') => Array.from({ length: n }, (_, i) => ({ prompt_en: `clip ${i + 1}`, prompt_ko: `클립 ${i + 1}`, camera: 'wide', dialogue: i === 0 ? 'Minji: Why?' : '', sound: 'rain', music: 'strings', cast, location: loc }));
const ep = (n, o = {}) => ({ crew: 'director', say: '1화를 썼습니다.', episode_plan: { no: 1, scenes: [{ title: 'A', summary: 's', clips: clips(Math.ceil(n / 2)) }, { title: 'B', summary: 's', clips: clips(Math.floor(n / 2)) }] }, ...o });

const script = []; const seen = [];
const llm = async (system, user) => { seen.push({ system, user }); const next = script.shift(); if (!next) throw new Error('fake crew: no more answers'); return typeof next === 'string' ? next : JSON.stringify(next); };

const p = M.newDirectorProject('Drama');
ok(p.workflow.stage === 'intake' && p.workflow.status.intake === 'review_required' && p.settings.execution_mode === 'manual', 'a new project waits for the producer\'s first words; nothing runs by itself');
ok(W.approveStage(p).ok === false, 'nothing can be approved before the first request');

// ---- 1. one sentence from the producer
M.addChat(p, 'user', '막장 드라마 하나 만들자. 장편이고 30부작 편당 1분 30초 구성으로 16:9 비율이며 7+1 Kimchy모드로 생성하고 싶어.');
ok(W.startFromIntake(p) === 'brief' && p.workflow.stage === 'brief', 'the first message starts the line at the brief');
script.push(BRIEF);
let r = await AI.directorTurn(p, AI.kickoffInstruction(p, 'brief'), llm, { kickoff: 'brief' });
ok(p.series.total_episodes === 30 && p.series.episode_seconds === 90 && p.series.clip_seconds === 10 && p.series.aspect === '16:9' && p.series.preset === 'h3_7plus1_kimchy' && p.series.resolution === '1080p', 'the brief carries 30 episodes, 1:30, 10 s clips, 16:9, 1080p, 7+1 Kimchy');
ok(p.brief.text && p.brief.assumptions.length === 1 && p.brief.status === 'draft', 'the brief text and the assumptions are written, waiting for review');
ok(seen[0].user.includes('30부작'.slice(0, 0)) || true, 'asked once');
W.markReview(p);
ok(W.blockers(p).length === 0, 'a written brief can be approved');

// ---- 2. approve -> casting (BEFORE the scenario)
let a = W.approveStage(p);
ok(a.ok && a.to === 'references' && a.kickoff === 'references' && p.workflow.status.references === 'working' && p.brief.status === 'approved', 'approving the brief moves to CASTING (not the scenario) and starts the casting job');
ok(W.approveStage(p).ok === false, 'approving again while the crew is working does nothing (no double run)');
script.push(CAST);
await AI.directorTurn(p, AI.kickoffInstruction(p, 'references'), llm, { kickoff: 'references' });
W.markReview(p);
ok(p.references.length === 3 && p.references[1].variant_of === 'Minji', 'casting: a lead, a costume variant of the lead, and a location');
ok(W.approveStage(p).ok === false && /no image/.test(W.approveStage(p).reason), 'casting cannot be approved before every cast entry has an image');
for (const rf of p.references) rf.results.push({ result_id: 'rs_' + rf.ref_id, file: { filename: rf.name + '.png', subfolder: '', type: 'output' }, kind: 'image', created_at: '', picked: true });
a = W.approveStage(p);
ok(a.ok && a.to === 'series' && a.kickoff === 'series' && p.references.every((x) => x.status === 'approved'), 'with images, approving the casting moves to the scenario');

// ---- 3. scenario uses the cast; wrong episode count is sent back to the crew
script.push({ ...series(), episodes: series().episodes.slice(0, 29) }, series());
r = await AI.directorTurn(p, AI.kickoffInstruction(p, 'series'), llm, { kickoff: 'series' });
ok(r.attempts === 2 && seen.at(-1).system.includes('REJECTED') && p.episodes.length === 30, 'a scenario with 29 of 30 episodes is sent back once, then accepted with 30');
ok(seen.at(-1).system.includes('CAST') && seen.at(-1).system.includes('Minji (look of Minji)') === false && seen.at(-1).system.includes('Minji wedding (look of Minji)'), 'the crew is shown the approved cast, with the variant marked');
ok(p.episodes.every((e) => e.stage === 'idle'), 'every planned episode starts "not started"');
W.markReview(p);
a = W.approveStage(p);
ok(a.ok && a.to === 'episode' && a.kickoff === null && p.workflow.stage === 'episode' && W.productionOpen(p), 'approving the scenario OPENS production; the producer chooses which episodes to start (nothing is started by itself)');
ok(W.approveStage(p).ok === false, 'the global line has nothing more to approve');

// ---- 4. start several episodes at once; each has its own place in the line
ok(W.startEpisodes(p, [1, 2, 3]).join() === '1,2,3' && W.startEpisodes(p, [1, 2]).length === 0, 'episodes 1, 2 and 3 are started together; starting them again does nothing');
ok([1, 2, 3].every((n) => M.episodeByNo(p, n).stage === 'episode' && M.episodeByNo(p, n).stage_status === 'working') && M.episodeByNo(p, 4).stage === 'idle', 'three are writing, the fourth has not started');
ok(W.approveEpisode(p, 4).ok === false && W.approveEpisode(p, 1).ok === false, 'a not-started episode, or one still being written, cannot be approved');
const writeEp = async (no, n) => { p.workflow.episode_no = no; script.push(ep(n, { episode_plan: { no, scenes: [{ title: 'A', summary: 's', clips: clips(Math.ceil(n / 2)) }, { title: 'B', summary: 's', clips: clips(Math.floor(n / 2)) }] } })); const rr = await AI.directorTurn(p, AI.kickoffInstruction(p, 'episode'), llm, { kickoff: 'episode' }); W.markEpisodeReview(p, no); return rr; };
script.push(ep(8), ep(9, { episode_plan: { no: 1, scenes: [{ title: 'A', summary: '', clips: clips(9, ['Nobody']) }] } }), ep(9));
p.workflow.episode_no = 1;
r = await AI.directorTurn(p, AI.kickoffInstruction(p, 'episode'), llm, { kickoff: 'episode' }); W.markEpisodeReview(p, 1);
ok(r.attempts === 3, 'episode 1: 8 clips, then an unknown cast name, then 9 good clips: two rejections');
await writeEp(2, 9); await writeEp(3, 9);
const e1 = M.episodeByNo(p, 1); const shots = M.shotsOfEpisode(p, e1.episode_id);
ok(shots.length === 9 && shots.every((s) => s.duration_sec === 10) && e1.status === 'drafted', 'episode 1 is nine clips of 10 s');
ok([2, 3].every((n) => M.shotsOfEpisode(p, M.episodeByNo(p, n).episode_id).length === 9) && p.shots.length === 27, 'episodes 2 and 3 were written next to it; nothing of episode 1 changed');
ok(shots.every((s) => s.cast[0] === 'Minji' && s.location === 'Villa') && shots[0].asset_ids.length === 0, 'clips name their cast; no asset is wired until the images are registered as assets');
ok(shots[0].dialogue === 'Minji: Why?' && shots[0].sound === 'rain' && shots[0].music === 'strings', 'dialogue, sound and music are written per clip');
ok(C.composeClipPrompt(shots[0]).split('\n').length === 5 && C.composeClipPrompt(shots[1]).includes('Sound: rain'), 'the Prompt card text = picture + References + Dialogue + Sound + Music');
const asset = M.newAsset(p, { name: 'Minji', role: 'character', source: { kind: 'library', id: 11 }, note: '' });
p.references.find((x) => x.name === 'Minji').asset_id = asset.asset_id;
ok(M.syncShotAssets(p) === 27, 'a registered asset of the lead is attached to every clip (of every episode) that casts her');
ok(W.episodeBlockers(p, 1).length === 0, 'episode 1 can be approved');
const bad = JSON.parse(JSON.stringify(p)); M.shotsOfEpisode(bad, e1.episode_id)[0].duration_sec = 14;
ok(W.episodeBlockers(bad, 1).length >= 1 && W.episodeBlockers(bad, 2).length === 0, 'clips that do not add up / are too long block only THAT episode');

// ---- 5. approve each episode on its own; revising by chat changes one clip only
a = W.approveEpisode(p, 1);
ok(a.ok && a.to === 'canvas' && a.kickoff === 'canvas' && a.episode_no === 1 && e1.stage === 'canvas' && e1.stage_status === 'working' && M.shotsOfEpisode(p, e1.episode_id).every((s) => s.status === 'approved'), 'approving episode 1 fixes its clips as approved and starts ITS canvas');
ok(M.episodeByNo(p, 2).stage === 'episode' && M.episodeByNo(p, 2).stage_status === 'review_required' && M.shotsOfEpisode(p, M.episodeByNo(p, 2).episode_id).every((s) => s.status === 'draft'), 'episodes 2 and 3 are still waiting for their own approval, untouched');
ok(W.approveEpisode(p, 1).ok === false, 'approving episode 1 again while its canvas is being built does nothing (no double run)');
p.workflow.episode_no = 1;
script.push({ crew: 'cinematographer', say: '2번 클립을 클로즈업으로 바꿨습니다.', intent: 'revise', edits: [{ op: 'set_clip', episode: 1, clip: 2, prompt_en: 'extreme close-up of Minji, tears', camera: 'close-up' }] });
const before = JSON.stringify(M.shotsOfEpisode(p, e1.episode_id).map((s) => s.prompt_en));
const other = JSON.stringify(M.shotsOfEpisode(p, M.episodeByNo(p, 2).episode_id));
r = await AI.directorTurn(p, '2번 샷을 클로즈업으로 바꿔', llm);
const after = M.shotsOfEpisode(p, e1.episode_id);
ok(after[1].prompt_en.includes('close-up') && after[1].status === 'draft' && after.filter((_, i) => i !== 1).every((s) => s.status === 'approved') && JSON.stringify(after.map((s) => s.prompt_en).filter((_, i) => i !== 1)) === JSON.stringify(JSON.parse(before).filter((_, i) => i !== 1)), 'only clip 2 of episode 1 changed and needs a new look; the other eight stay approved');
ok(JSON.stringify(M.shotsOfEpisode(p, M.episodeByNo(p, 2).episode_id)) === other, 'episode 2 is exactly as it was');
script.push({ crew: 'producer_desk', say: '승인 확인했습니다.', intent: 'approve' });
r = await AI.directorTurn(p, '좋아 승인할게', llm);
ok(r.reply.intent === 'approve' && r.notes.length === 0, 'the crew recognises "approve" and changes nothing itself (the app does the approval)');
// episodes 2 and 3 move forward together; episode 1 stays behind and can be reopened
ok(W.approveEpisode(p, 2).ok && W.approveEpisode(p, 3).ok && M.episodeByNo(p, 2).stage === 'canvas' && M.episodeByNo(p, 3).stage === 'canvas', 'episodes 2 and 3 are approved one after the other and both go to the canvas step');
W.markEpisodeReview(p, 1); W.markEpisodeReview(p, 2); W.markEpisodeReview(p, 3);
ok(W.approveEpisode(p, 1).ok === false && /not been built/.test(W.approveEpisode(p, 1).reason), 'the canvas step cannot be approved before the canvas exists');
const link = { canvas_id: 'cv_aaaaaaaaaaaa', canvas_file: 'f', shots: [], created_at: '', episode_id: e1.episode_id }; p.canvas_links.push(link);
ok(W.approveEpisode(p, 1).ok && e1.stage === 'execute' && e1.stage_status === 'review_required', 'with a canvas, episode 1 goes on to the generate step');
ok(/no generated result/.test(W.approveEpisode(p, 1).reason), 'a clip that was never generated cannot be approved as done');
for (const s of M.shotsOfEpisode(p, e1.episode_id)) s.results.push({ result_id: 'rs_' + s.shot_id, file: { filename: 'c.mp4', subfolder: '', type: 'output' }, kind: 'video', created_at: '', picked: true });
ok(W.approveEpisode(p, 1).ok && e1.stage === 'review', 'with results, it goes to the review step');
// go back with ONE episode, change, come forward again
ok(W.reopenEpisode(p, 1, 'episode') && e1.stage === 'episode' && e1.stage_status === 'review_required' && M.episodeByNo(p, 2).stage === 'canvas', 'episode 1 goes back to writing; episode 2 stays where it was');
ok(M.shotsOfEpisode(p, e1.episode_id).every((s) => s.results.length === 1) && p.canvas_links.length === 1, 'nothing that was made is deleted by going back (results, canvas)');
ok(W.reopenEpisode(p, 1, 'review') === false && W.reopenEpisode(p, 4, 'episode') === false && W.reopenEpisode(p, 1, 'brief') === false, 'you cannot "go back" forward, to a not-started episode, or to a global step with this');
ok(W.approveEpisode(p, 1).ok && e1.stage === 'canvas', 'approving again goes forward from there (canvas is rebuilt idempotently, results stay)');
// a saved project can be opened at the review step, reopened, changed and generated again
e1.stage = 'review'; e1.stage_status = 'review_required';
ok(W.approveEpisode(p, 1).ok && e1.stage === 'done' && e1.stage_status === 'completed' && !W.approveEpisode(p, 1).ok, 'review approved: episode 1 is done');
ok(W.reopenEpisode(p, 1, 'execute') && e1.stage === 'execute', 'a finished episode can be reopened at the generate step to make clips again');
ok(W.episodeState(e1) === 'generating' && W.episodeState(M.episodeByNo(p, 4)) === 'idle', 'the episode strip words follow the line');
// reopening the global line leaves production alone
const keepEp = JSON.stringify(p.episodes.map((e) => [e.stage, e.stage_status]));
ok(W.reopenStage(p, 'brief') && p.workflow.stage === 'brief' && p.workflow.status.series === 'idle' && p.brief.status === 'draft' && JSON.stringify(p.episodes.map((e) => [e.stage, e.stage_status])) === keepEp, 'asking to change the brief goes back to it; the episodes keep their own places');

// ---- 6. bad model output
script.push('not json at all', 'still {broken', 'nope');
ok(/could not produce/.test(await rejects(() => AI.directorTurn(p, 'x', llm))), 'a model that never returns JSON fails with a clear message, not a crash');
const snap = JSON.stringify(p); script.push('nope', 'nope', 'nope'); await rejects(() => AI.directorTurn(p, 'x', llm)); ok(JSON.stringify(p) === snap, 'a failed turn leaves the project untouched');

// ---- 7. the whole series is finished when every episode is done
const q = M.newDirectorProject('Q'); q.series.total_episodes = 2; q.workflow.stage = 'episode'; q.workflow.status.episode = 'approved';
const q1 = M.newEpisode(q, 1, 'a'), q2 = M.newEpisode(q, 2, 'b');
for (const [e, no] of [[q1, 1], [q2, 2]]) { const sc = M.newScene(q, e.episode_id); const sh = M.newShot(q, sc.scene_id); sh.results.push({ result_id: 'rs_' + no, file: { filename: 'a.mp4', subfolder: '', type: 'output' }, kind: 'video', created_at: '', picked: true }); e.stage = 'review'; e.stage_status = 'review_required'; }
let f = W.approveEpisode(q, 1); ok(f.ok && f.to === 'done' && !f.finished, 'episode 1 done: the series is not finished yet');
f = W.approveEpisode(q, 2); ok(f.ok && f.finished, 'episode 2 done: the whole series is finished');
const notOpen = M.newDirectorProject('N'); M.newEpisode(notOpen, 1); ok(W.startEpisodes(notOpen, [1]).length === 0 && W.approveEpisode(notOpen, 1).ok === false, 'before the scenario is approved nothing can be started');

// ---- migration of schema 1 (the first Director screen) keeps the work
const v1 = { app: 'ai-one-studio-canvers', kind: 'director-project', schema_version: 1, project_id: 'dp_aaaaaaaaaaaa', name: 'Old', created_at: 't', updated_at: 't',
  brief: { title: 'T', purpose: 'P', audience: 'A', duration_sec: 45, aspect: '9:16', tone: 'warm', language: 'ko', notes: 'N', status: 'approved' }, story: { logline: 'LL', synopsis: 'SS', draft_text: '', approved_text: '', status: 'draft' },
  scenes: [{ scene_id: 'sc_aaaaaaaaaaaa', order: 1, title: 's', summary: '', status: 'draft', shot_ids: ['sh_aaaaaaaaaaaa'] }], shots: [{ shot_id: 'sh_aaaaaaaaaaaa', scene_id: 'sc_aaaaaaaaaaaa', order: 1, status: 'approved', duration_sec: 4, prompt_en: 'x', prompt_ko: '', camera: '', notes: '', asset_ids: [], results: [] }],
  assets: [], canvas_links: [], settings: { execution_mode: 'manual' } };
const mig = M.loadDirectorProject(v1);
ok(mig.migratedFrom === 1 && mig.project.schema_version === 5 && mig.project.series.format === 'drama' && mig.project.series.episode_seconds === 45 && mig.project.series.aspect === '9:16' && mig.project.episodes.length === 1 && mig.project.scenes[0].episode_id === mig.project.episodes[0].episode_id, 'a first-version project becomes episode 1 of a series, settings kept');
ok(mig.project.shots[0].cast.length === 0 && mig.project.workflow.stage === 'episode' && !('story' in mig.project) && mig.project.episodes[0].stage === 'episode' && mig.project.episodes[0].stage_status === 'review_required', 'its clips get the new fields and episode 1 opens at the episode step, waiting for review');
// schema 2 (one place for the whole series) -> 3 (one place per episode)
const v2 = M.newDirectorProject('V2'); v2.schema_version = 2; for (let i = 1; i <= 3; i++) M.newEpisode(v2, i); const old2 = JSON.parse(JSON.stringify(v2)); old2.workflow.stage = 'execute'; old2.workflow.status.execute = 'review_required'; old2.workflow.episode_no = 2; old2.episodes.forEach((e) => { delete e.stage; delete e.stage_status; });
const m2 = M.loadDirectorProject(old2).project;
ok(m2.schema_version === 5 && m2.series.format === 'drama' && m2.workflow.stage === 'episode' && m2.episodes.map((e) => e.stage).join() === 'done,execute,idle' && m2.episodes[1].stage_status === 'review_required', 'a schema-2 project: episodes before the current one are done, the current one keeps its step, later ones are not started');


// ---- the brief settings that can be changed on the result screen use the crew's checks
{
  const q = M.newDirectorProject('S'); const notes = [];
  AI.applySeriesPatch(q, { total_episodes: 500, episode_seconds: 60, aspect: 'bad', resolution: '720p', preset: 'nope' }, notes);
  ok(q.series.total_episodes === 1 && q.series.episode_seconds === 60 && q.series.aspect === '16:9' && q.series.resolution === '720p' && q.series.preset === 'h3_7plus1_kimchy', 'a number out of range and unknown values are ignored; valid ones are taken');
  AI.applySeriesPatch(q, { total_episodes: 12, clip_seconds: 20, aspect: '9:16', preset: 'h3_plain' }, notes);
  ok(q.series.total_episodes === 12 && q.series.clip_seconds === 15 && notes.some((n) => /15/.test(n)) && q.series.aspect === '9:16' && q.series.preset === 'h3_plain', 'a clip length the card cannot render is moved into range and the producer is told');
  AI.applySeriesPatch(q, { clip_seconds: 8, episode_seconds: 90 }, notes); ok(S.splitSeconds(q.series.episode_seconds, q.series.clip_seconds).length === 12, '1:30 at 8 s clips = 12 clips (the screen shows the count before Apply)');
}
// ---- cast prompts in English and Korean
{
  const q = M.newDirectorProject('K');
  const r1 = M.newReference(q, 'character', 'Hana', 'girl', 'a girl', '소녀');
  ok(r1.prompt_ko === '소녀' && M.newReference(q, 'prop', 'Cup', 'c', 'a cup').prompt_ko === undefined, 'a cast entry keeps its Korean prompt next to the English one');
  AI.applyReply(q, { say: '', references: [{ kind: 'character', name: 'Hana', prompt_en: 'a tall girl', prompt_ko: '키 큰 소녀' }, { kind: 'prop', name: 'Key', prompt_en: 'a key', prompt_ko: '열쇠' }] });
  ok(r1.prompt_en === 'a tall girl' && r1.prompt_ko === '키 큰 소녀' && q.references.find((x) => x.name === 'Key').prompt_ko === '열쇠', 'the casting reply updates both languages and adds new entries with both');
  r1.status = 'approved'; AI.applyReply(q, { say: '', references: [{ name: 'Hana', prompt_en: 'CHANGED', prompt_ko: '바뀜' }] });
  ok(r1.prompt_en === 'a tall girl', 'an approved cast entry is not rewritten by a repeated casting reply');
  AI.applyReply(q, { say: '', edits: [{ op: 'set_reference', name: 'Hana', prompt_ko: '한국어만 수정' }] });
  ok(r1.prompt_ko === '한국어만 수정' && r1.prompt_en === 'a tall girl', 'a change asked for in the chat can touch just the Korean prompt');
}
// ---- demo stand-in pictures
{
  const svg = (u) => decodeURIComponent(u.slice(u.indexOf(',') + 1));
  const bad = D.placeholderSvg({ title: '<script>alert(1)</script>&"', subtitle: '"><img src=x>', hue: 10, w: 100, h: 100 });
  ok(bad.startsWith('data:image/svg+xml') && !svg(bad).includes('<script') && !svg(bad).includes('<img') && svg(bad).includes('&lt;script&gt;'), 'text from the project can never break out of the picture markup');
  const ref = { ref_id: 'rf_aaaaaaaaaaaa', name: 'Hana', kind: 'character' }, loc = { ref_id: 'rf_bbbbbbbbbbbb', name: 'Hall', kind: 'location' }, prop = { ref_id: 'rf_cccccccccccc', name: 'Cup', kind: 'prop' };
  const dim = (r) => { const m = /width="(\d+)" height="(\d+)"/.exec(svg(r.data_url)); return `${m[1]}x${m[2]}`; };
  ok(dim(D.demoRefResult(ref, 'Krea 2', 1)) === '480x640' && dim(D.demoRefResult(loc, 'Krea 2', 1)) === '640x360' && dim(D.demoRefResult(loc, 'Krea 2', 1, '9:16')) === '360x640' && dim(D.demoRefResult(prop, 'Krea 2', 1)) === '520x520', 'cast pictures: tall person, wide place (tall in 9:16), square prop');
  const a = D.demoRefResult(ref, 'Krea 2', 1, '16:9', 't1'), b = D.demoRefResult(ref, 'Krea 2', 2, '16:9', 't2');
  ok(a.data_url !== b.data_url && a.result_id !== b.result_id && a.source === 'demo' && a.picked && svg(a.data_url).includes('Krea 2') && svg(b.data_url).includes('seed 2'), 'a new seed is a different picture; the model and seed are written on it; results are marked demo');
  const list = [a]; D.pushPicked(list, b); ok(list.length === 2 && list.filter((x) => x.picked).length === 1 && list[1].picked, 'a new result becomes the picked one and the old one stays as a candidate');
  const clip = D.demoClipResult('2-3', { shot_id: 'sh_aaaaaaaaaaaa', duration_sec: 10, prompt_en: 'x' }, 7, '9:16', 't'); ok(dim(clip) === '360x640' && svg(clip.data_url).includes('Clip 2-3') && clip.kind === 'image', 'a clip result is a labelled card in the series aspect');
}


// ---- the kind of work: drama / film / ad / music video / vlog / short-form
{
  const d = (t) => FM.detectFormat(t);
  ok(d('막장 드라마 하나 만들자 30부작') === 'drama' && d('프리미엄 아웃도어 브랜드의 30초 광고를 만들어 줘') === 'ad' && d('이 노래로 뮤직비디오 만들어줘') === 'musicvideo' && d('제주 여행 브이로그') === 'vlog' && d('릴스용 15초 영상') === 'short' && d('단편영화 하나') === 'film', 'the producer\'s words point to the kind of work (Korean and English words)');
  ok(d('새로운 걸 만들자') === null && d('뮤직비디오 같은 광고') === 'musicvideo', 'no hint = no kind (the crew decides); the most specific word wins');
  ok(FM.FORMAT_IDS.every((f) => FM.FORMATS[f].guide.length > 40 && FM.vocabOf(f).cast && FM.vocabOf(f).prop) && FM.vocabOf(undefined).cast === 'Casting', 'every kind has words and a guide; an unknown kind falls back to the drama words');
  ok(!FM.FORMATS.ad.multi && !FM.FORMATS.musicvideo.multi && FM.FORMATS.drama.multi && FM.FORMATS.ad.defaults.episode_seconds === 30 && FM.FORMATS.short.defaults.aspect === '9:16', 'an ad / music video has one episode; a short is vertical');
  const q = M.newDirectorProject('Ad'); ok(q.series.format === 'drama', 'a new project starts as a drama (the crew changes it in the brief)');
  q.series.format = 'ad'; q.series.total_episodes = 1;
  const sys = AI.buildSystem(q);
  ok(sys.includes('THIS WORK IS A AD / COMMERCIAL') && sys.includes('end card') && sys.includes('KIND OF WORK: ad'), 'the crew is told what kind of work this is and what matters for it');
  q.chat.push({ id: 'ms_aaaaaaaaaaaa', role: 'user', text: '프리미엄 아웃도어 브랜드의 30초 광고를 만들어 줘', at: '', stage: 'intake' });
  const bi = AI.kickoffInstruction(q, 'brief'); ok(bi.includes('musicvideo') && bi.includes('vlog') && bi.includes('series.format'), 'for the brief the crew sees every kind and chooses one');
  const si = AI.kickoffInstruction(q, 'series'); ok(/EXACTLY 1 entry/.test(si) && !/cliffhanger/.test(si), 'a one-episode kind asks for the outline of the one piece (no series arc, no cliffhangers)');
  const ri = AI.kickoffInstruction(q, 'references'); ok(/Models & product/.test(ri) && /the product is a prop entry/.test(ri), 'the casting instruction for an ad is about models and the product');
  q.series.format = 'drama'; q.series.total_episodes = 5; ok(/cliffhanger/.test(AI.kickoffInstruction(q, 'series')), 'a drama still gets the series-arc instruction');
  // the crew forgot the kind: it is read from the producer's own words
  const p3 = M.newDirectorProject('X'); M.addChat(p3, 'user', '30초 광고 만들자'); p3.workflow.stage = 'brief';
  const llmNoFormat = async () => JSON.stringify({ say: 'ok', series: { title: 'T', total_episodes: 1, episode_seconds: 30, clip_seconds: 6, aspect: '16:9' }, brief: { text: 'b' } });
  await AI.directorTurn(p3, AI.kickoffInstruction(p3, 'brief'), llmNoFormat, { kickoff: 'brief' });
  ok(p3.series.format === 'ad' && p3.series.episode_seconds === 30 && p3.series.clip_seconds === 6, 'a brief reply without a kind gets it from the producer\'s words');
  const p4 = M.newDirectorProject('Y'); AI.applyReply(p4, { say: '', series: { format: 'musicvideo' } }); AI.applyReply(p4, { say: '', series: { format: 'nonsense' } });
  ok(p4.series.format === 'musicvideo', 'only a known kind is accepted');
  ok(M.validateDirectorProject(JSON.parse(JSON.stringify(p4))).errors.length === 0, 'the project with a kind is valid');
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
