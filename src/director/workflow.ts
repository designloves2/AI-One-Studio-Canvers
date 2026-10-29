// Director Mode production line. Pure (no DOM, no network). The store calls these, then starts the "kickoff" jobs they return.
//
//   GLOBAL (once):   intake -> brief -> references (casting) -> series (scenario, written with the approved cast)
//   PER EPISODE:     idle -> episode (write the clips) -> canvas -> execute (generate) -> review -> done
//
// Every episode has its OWN position in the line, so two or three episodes can be written, built, generated and reviewed at the same time,
// and the producer can go back with one episode without touching the others. What is *shown* (which step the producer is looking at) is not
// part of this file: looking at a step never changes anything.
//
// A step only moves on when it is waiting for review (`review_required`). Approving twice, or approving a step that is still working,
// does nothing: that is what stops double clicks and retried events from running a step twice.
import { episodeByNo, shotsOfEpisode, syncShotAssets } from './model';
import { musicBlockers } from './music';
import type { DirectorEpisode, DirectorProject, EpisodeStage, StageId, StageStatus } from './types';

export const GLOBAL_STAGES: StageId[] = ['intake', 'brief', 'references', 'music', 'series'];
export const EPISODE_STAGES: StageId[] = ['episode', 'canvas', 'execute', 'review'];
const EP_ORDER: EpisodeStage[] = ['idle', 'episode', 'canvas', 'execute', 'review', 'done'];
const GLOBAL_ORDER: StageId[] = ['intake', 'brief', 'references', 'music', 'series', 'episode'];   // 'episode' on the global line = production is open; 'music' only for a music video
export const epStageIndex = (s: EpisodeStage) => EP_ORDER.indexOf(s);
export const stageIndex = (s: StageId) => GLOBAL_ORDER.indexOf(s);

/** the automatic job that starts when a step is entered (LLM work or a deterministic build) */
export type Kickoff = 'brief' | 'references' | 'music' | 'series' | 'episode' | 'canvas' | null;

/** does this work have a song step? (a music video: the song is chosen before the scenario is written) */
export const hasMusicStep = (p: DirectorProject) => p.series.format === 'musicvideo';
/** the global step after `from` (the song step is skipped unless this is a music video) */
export function nextGlobal(p: DirectorProject, from: StageId): StageId {
  let i = stageIndex(from) + 1;
  if (GLOBAL_ORDER[i] === 'music' && !hasMusicStep(p)) i += 1;
  return GLOBAL_ORDER[i];
}

export interface ApproveResult {
  ok: boolean;
  /** why nothing happened */
  reason?: string;
  from?: StageId | 'done'; to?: StageId | 'done'; episode_no?: number;
  kickoff?: Kickoff;
  /** this was the last episode that was not done: the whole series is finished */
  finished?: boolean;
}

export const productionOpen = (p: DirectorProject) => p.workflow.stage === 'episode';

// ------------------------------------------------------------------ what is missing before a step can be approved
/** global steps (brief, references, series) */
export function blockers(p: DirectorProject, stage: StageId = p.workflow.stage): string[] {
  const out: string[] = [];
  if (stage === 'brief' && !p.brief.text.trim()) out.push('The brief is empty.');
  if (stage === 'series') {
    if (p.episodes.length !== p.series.total_episodes) out.push(`The series plan has ${p.episodes.length} episodes, the brief says ${p.series.total_episodes}.`);
    if (p.episodes.some((e) => !e.title.trim() && !e.logline.trim())) out.push('Some episodes have no title or story line yet.');
  }
  if (stage === 'music') out.push(...musicBlockers(p));
  if (stage === 'references') {
    const live = p.references.filter((r) => r.status !== 'rejected');
    if (!live.length) out.push('There is no cast yet. Ask for casting, or tell the crew to go without.');
    const noImage = live.filter((r) => !r.results.some((x) => x.picked));
    if (noImage.length) out.push(`${noImage.length} of ${live.length} cast entries have no image yet (${noImage.slice(0, 3).map((r) => r.name).join(', ')}${noImage.length > 3 ? ', ...' : ''}). Generate them first.`);
  }
  return out;
}

/** episode steps (episode, canvas, execute, review) of one episode */
export function episodeBlockers(p: DirectorProject, no: number, stage?: StageId): string[] {
  const out: string[] = [];
  const ep = episodeByNo(p, no); if (!ep) return ['That episode does not exist.'];
  const st = stage ?? (ep.stage === 'idle' || ep.stage === 'done' ? 'episode' : ep.stage);
  const shots = shotsOfEpisode(p, ep.episode_id);
  if (st === 'episode') {
    if (!shots.length) out.push(`Episode ${no} has no clips yet.`);
    else {
      const total = shots.reduce((a, s) => a + s.duration_sec, 0);
      if (Math.abs(total - p.series.episode_seconds) > 1) out.push(`The clips add up to ${Math.round(total * 10) / 10} s, the episode is ${p.series.episode_seconds} s.`);
      if (shots.some((s) => s.duration_sec > p.series.clip_seconds + 0.01)) out.push(`A clip is longer than ${p.series.clip_seconds} s.`);
      if (shots.some((s) => !s.prompt_en.trim())) out.push('A clip has no picture description yet.');
    }
  }
  if (st === 'canvas' && !p.canvas_links.find((l) => l.episode_id === ep.episode_id && !l.aspect)) out.push('The canvas for this episode has not been built yet.');
  if (st === 'execute') {   // generate + look at every clip: each clip that stays in the video has a result the producer passed, then the clips are joined
    const inc = shots.filter((s) => !s.excluded);
    const missing = inc.filter((s) => !s.results.some((r) => r.picked));
    if (!inc.length) out.push('Leave at least one clip in the video.');
    else if (missing.length) out.push(`${missing.length} of ${inc.length} clips have no generated result yet.`);
    else {
      const open = inc.filter((s) => s.passed !== s.results.find((r) => r.picked)?.result_id);
      if (open.length) out.push(`${open.length} of ${inc.length} clips are not passed yet. Look at each clip and pass it, or make it again.`);
      else if (!ep.final) out.push('Join the passed clips into one video first.');
    }
  }
  if (st === 'review' && !ep.final) out.push('The episode has no joined video yet.');
  return out;
}

// ------------------------------------------------------------------ global line
/** Approve the global step the line is waiting on and move to the next one. Mutates `p`. */
export function approveStage(p: DirectorProject): ApproveResult {
  const from = p.workflow.stage;
  if (from === 'intake') return { ok: false, reason: 'Tell the crew what to make first.' };
  if (from === 'episode') return { ok: false, reason: 'Nothing is waiting for approval.' };
  if (p.workflow.status[from] !== 'review_required') return { ok: false, reason: p.workflow.status[from] === 'working' ? 'The crew is still working on this step.' : 'Nothing is waiting for approval.' };
  const b = blockers(p, from);
  if (b.length) return { ok: false, reason: b[0] };
  if (from === 'brief') p.brief.status = 'approved';
  if (from === 'references') { p.references.forEach((r) => { if (r.status === 'proposed') r.status = 'approved'; }); syncShotAssets(p); }
  p.workflow.status[from] = 'approved';
  if (from === 'music' && p.music) {   // the song fixes the length of the one piece
    p.music.status = 'approved';
    if (p.music.duration_sec > 0) { p.series.total_episodes = 1; p.series.episode_seconds = p.music.duration_sec; }
  }
  const to = nextGlobal(p, from);
  p.workflow.stage = to;
  if (to === 'episode') { p.workflow.status.episode = 'approved'; return { ok: true, from, to, kickoff: null }; }   // production opens: the producer chooses which episodes to start
  if (to === 'music') { p.workflow.status.music = 'review_required'; return { ok: true, from, to, kickoff: null }; }   // the producer chooses the song (own file or made by the AI): no automatic job
  const kickoff: Kickoff = to === 'brief' || to === 'references' || to === 'series' ? to : null;
  p.workflow.status[to] = 'working';
  return { ok: true, from, to, kickoff };
}

/** The first message of a new project starts the line: intake is answered, the brief is written next. */
export function startFromIntake(p: DirectorProject): Kickoff {
  if (p.workflow.stage !== 'intake') return null;
  p.workflow.status.intake = 'approved';
  p.workflow.stage = 'brief'; p.workflow.status.brief = 'working';
  return 'brief';
}

export const markWorking = (p: DirectorProject, s: StageId = p.workflow.stage) => { p.workflow.status[s] = 'working'; };
export const markReview = (p: DirectorProject, s: StageId = p.workflow.stage) => { p.workflow.status[s] = 'review_required'; };
export const markFailed = (p: DirectorProject, s: StageId = p.workflow.stage) => { p.workflow.status[s] = 'failed'; };

// ------------------------------------------------------------------ episode lines
const setEp = (e: DirectorEpisode, stage: EpisodeStage, status: StageStatus) => { e.stage = stage; e.stage_status = status; };
export const markEpisodeWorking = (p: DirectorProject, no: number) => { const e = episodeByNo(p, no); if (e) e.stage_status = 'working'; };
export const markEpisodeReview = (p: DirectorProject, no: number) => { const e = episodeByNo(p, no); if (e) e.stage_status = 'review_required'; };
export const markEpisodeFailed = (p: DirectorProject, no: number) => { const e = episodeByNo(p, no); if (e) e.stage_status = 'failed'; };

/**
 * Start writing the clips of these episodes (the ones that have not started). Returns the numbers that were started, in order.
 * Several can be started at once; the crew writes them one after another, each keeps its own place in the line.
 */
export function startEpisodes(p: DirectorProject, nos: number[]): number[] {
  if (!productionOpen(p)) return [];
  const started: number[] = [];
  for (const no of [...new Set(nos)].sort((a, b) => a - b)) {
    const e = episodeByNo(p, no);
    if (!e || e.stage !== 'idle') continue;
    setEp(e, 'episode', 'working'); started.push(no);
  }
  return started;
}

/** Approve the step an episode is waiting on and move that episode to its next step. */
export function approveEpisode(p: DirectorProject, no: number): ApproveResult {
  const ep = episodeByNo(p, no);
  if (!ep) return { ok: false, reason: 'That episode does not exist.' };
  if (!productionOpen(p)) return { ok: false, reason: 'Approve the scenario first.' };
  if (ep.stage === 'idle') return { ok: false, reason: 'This episode has not been started yet.' };
  if (ep.stage === 'done') return { ok: false, reason: 'This episode is finished. Go back to a step to change it.' };
  if (ep.stage_status !== 'review_required') return { ok: false, reason: ep.stage_status === 'working' ? 'The crew is still working on this step.' : 'Nothing is waiting for approval.' };
  const from = ep.stage as StageId;
  const b = episodeBlockers(p, no, from);
  if (b.length) return { ok: false, reason: b[0] };
  if (from === 'episode') {   // what the approval fixes in place: the clips become the ones the run buttons accept
    ep.status = 'approved';
    p.scenes.filter((s) => s.episode_id === ep.episode_id).forEach((s) => { s.status = 'approved'; });
    shotsOfEpisode(p, ep.episode_id).forEach((s) => { if (s.status === 'draft' || s.status === 'ready') s.status = 'approved'; });
  }
  if (from === 'review') {
    setEp(ep, 'done', 'completed');
    const finished = p.episodes.length > 0 && p.episodes.every((e) => e.stage === 'done');
    return { ok: true, from, to: 'done', episode_no: no, kickoff: null, finished };
  }
  const to = EPISODE_STAGES[EPISODE_STAGES.indexOf(from) + 1];
  const kickoff: Kickoff = to === 'canvas' ? 'canvas' : null;
  setEp(ep, to as EpisodeStage, kickoff ? 'working' : 'review_required');
  return { ok: true, from, to, episode_no: no, kickoff };
}

/**
 * Go back with ONE episode to an earlier step (to change something, then approve forward again). The other episodes are not touched, and
 * nothing that was made is deleted (clips, canvas, results stay; changed clips only need a new look-over).
 */
export function reopenEpisode(p: DirectorProject, no: number, stage: StageId): boolean {
  const ep = episodeByNo(p, no);
  if (!ep || !productionOpen(p) || !EPISODE_STAGES.includes(stage)) return false;
  const target = stage as EpisodeStage;
  if (ep.stage === 'idle' || (ep.stage !== 'done' && epStageIndex(target) >= epStageIndex(ep.stage))) return false;
  setEp(ep, target, 'review_required');
  return true;
}

/** Go back in the global line (brief / casting / scenario) for a new review. Production that already exists is not touched. */
export function reopenStage(p: DirectorProject, stage: StageId): boolean {
  if (stage === 'intake' || !GLOBAL_STAGES.includes(stage) || stageIndex(stage) >= stageIndex(p.workflow.stage)) return false;
  for (const s of GLOBAL_STAGES) if (stageIndex(s) > stageIndex(stage)) p.workflow.status[s] = 'idle';
  p.workflow.status.episode = 'idle';
  p.workflow.stage = stage; p.workflow.status[stage] = 'review_required';
  if (stage === 'brief') p.brief.status = 'draft';
  return true;
}

/** one word for an episode's place in the line (for the episode strip) */
export function episodeState(e: DirectorEpisode): 'idle' | 'working' | 'review' | 'failed' | 'building' | 'generating' | 'checking' | 'done' {
  if (e.stage === 'idle') return 'idle';
  if (e.stage === 'done') return 'done';
  if (e.stage_status === 'failed') return 'failed';
  if (e.stage_status === 'working') return 'working';
  return ({ episode: 'review', canvas: 'building', execute: 'generating', review: 'checking' } as const)[e.stage as 'episode' | 'canvas' | 'execute' | 'review'];
}
