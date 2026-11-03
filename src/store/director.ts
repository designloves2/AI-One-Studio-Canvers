import { create } from 'zustand';
import type { CrewRole, DirectorProject, ReferenceKind, StageId } from '../director/types';
import { addChat, dropReferences, episodeByNo, newDirectorProject, safeProjectName, shotsOfEpisode, syncShotAssets, touch } from '../director/model';
import { CREW_LABEL, defaultCrew, directorTurn, kickoffInstruction, planParts, plannedEpisodeClips, recastInstruction, unitProgress, type LlmFn } from '../director/ai';
import { approveEpisode, approveStage, blockers, EPISODE_STAGES, GLOBAL_STAGES, markEpisodeFailed, markEpisodeReview, markEpisodeWorking, markFailed, markReview, markWorking, productionOpen, reopenEpisode, startEpisodes, startFromIntake, type ApproveResult, type Kickoff } from '../director/workflow';
import { demoCrew } from '../director/demoCrew';
import { localizeMsg } from '../director/localize';
import { attachContext, inheritFrom, matchProjects, summarizePrevious } from '../director/continuity';
import { deleteDirectorProject, listDirectorProjects, openDirectorProject, saveDirectorProject, type DirectorEntry } from '../backend/director';
import { directorLlmSettings, runLlm } from '../backend/llm';

/** the real crew: the LLM chosen in Settings (same backends as the Live Canvas) */
const realCrew: LlmFn = (system, prompt) => runLlm({ system, prompt, max_tokens: 7000, temperature: 0.6, llm: directorLlmSettings(), tag: 'director' });

export type BatchItemState = 'waiting' | 'running' | 'done' | 'failed' | 'cancelled' | 'skipped';
/** progress of a batch generation (several episodes / chosen clips); shown in the generate step */
export interface BatchProgress { running: boolean; items: { no: number; clips: number; state: BatchItemState; note?: string }[]; finishedAt?: string }

/** which step the screen should show for a project: the global step the line waits on, or the focus episode's own step */
export function frontierView(p: DirectorProject, focus: number): StageId {
  if (!productionOpen(p)) return p.workflow.stage === 'intake' ? 'brief' : p.workflow.stage;
  const e = episodeByNo(p, focus);
  return e && e.stage !== 'idle' && e.stage !== 'done' ? (e.stage as StageId) : e?.stage === 'done' ? 'review' : 'episode';
}
/** the episode to start on when a project is opened: the last one worked on, else the first that is not done */
export const startFocus = (p: DirectorProject) => (episodeByNo(p, p.workflow.episode_no) ? p.workflow.episode_no : (p.episodes.find((e) => e.stage !== 'done')?.no ?? 1));

interface DirectorState {
  project: DirectorProject | null;
  file: string | null;
  dirty: boolean;
  readOnly: boolean;
  notes: string[];
  list: DirectorEntry[];
  /** the crew is working: the chat input waits and a second approval or message does nothing */
  busy: boolean;
  /** try the screen without an LLM (scripted crew) */
  demo: boolean;
  /** which step the producer is LOOKING at (looking never changes the project) and which episode the episode steps show */
  view: StageId;
  focus: number;
  /** clips ticked in the generate step */
  selClips: string[];
  batch: BatchProgress | null;
  setDemo(v: boolean): void;
  setView(s: StageId): void;
  setFocus(no: number): void;
  toggleClip(id: string): void;
  setSelClips(ids: string[]): void;
  setBatch(b: BatchProgress | null): void;
  refreshList(): Promise<void>;
  open(name: string): Promise<void>;
  save(): Promise<boolean>;
  remove(name: string): Promise<void>;
  close(): void;
  /** change the open project in place (a mutator on a copy), marks it unsaved and saves it a moment later */
  edit(fn: (p: DirectorProject) => void): void;
  /** the producer wrote something in the chat (the first message creates the project) */
  send(text: string): Promise<void>;
  /** approve the step being looked at, if the line is waiting on it (button or words) */
  approve(): Promise<void>;
  /** approve the same step of several episodes at once */
  approveEpisodes(nos: number[]): Promise<void>;
  /** start writing these episodes (several can be started at once; the crew writes them one after another) */
  startEpisodes(nos: number[]): Promise<void>;
  /** go back with one episode to an earlier step (nothing is deleted) */
  reopen(no: number, stage: StageId): void;
  /** run the automatic job of the step being looked at again (after a failure) */
  retry(): Promise<void>;
  /** the crew writes the song (style, lyrics, structure) or proposes the structure of the uploaded song */
  writeSong(): Promise<void>;
  /** cast these kinds again: the old entries of those kinds (and their images) are replaced by what the crew proposes */
  recast(kinds: ReferenceKind[]): Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** the demo choice survives a page reload / hot reload (it must never silently fall back to the real LLM in the middle of a try-out) */
const DEMO_KEY = 'canvers.director.demo';
const readDemo = () => { try { return sessionStorage.getItem(DEMO_KEY) === '1'; } catch { return false; } };
if (import.meta.env.DEV) (window as unknown as { __directorDemo?: LlmFn }).__directorDemo = demoCrew;   // for scripted browser tests: window.__directorLlm = window.__directorDemo

/** the whole content of every earlier project this one continues, as text for the crew (read fresh from disk each time) */
async function previousTexts(p: DirectorProject): Promise<string[]> {
  const out: string[] = [];
  for (const c of p.continues ?? []) {
    try { out.push(summarizePrevious((await openDirectorProject(c.file)).project)); } catch { /* the earlier project was deleted: the cast already taken over stays */ }
  }
  return out;
}

export const useDirector = create<DirectorState>((set, get) => {
  const crew = (): LlmFn => (import.meta.env.DEV && (window as unknown as { __directorLlm?: LlmFn }).__directorLlm) || (get().demo ? demoCrew : realCrew);
  const commit = (fn: (p: DirectorProject) => void) => get().edit(fn);
  const rawOf = (e: unknown) => (e as { raw?: string } | null)?.raw;   // the crew's original answer, kept for the producer to see / fix

  /** take over what the crew changed in the working copy (never the places of the episodes in their lines: those are the app's) */
  const takeOver = (x: DirectorProject, work: DirectorProject) => {
    Object.assign(x, { series: work.series, brief: work.brief, episodes: x.episodes.map((e) => ({ ...(work.episodes.find((w) => w.episode_id === e.episode_id) ?? e), stage: e.stage, stage_status: e.stage_status })), references: work.references, scenes: work.scenes, shots: work.shots });
    for (const w of work.episodes) if (!x.episodes.some((e) => e.episode_id === w.episode_id)) x.episodes.push(w);   // the scenario may add episodes
    x.episodes.sort((a, b) => a.no - b.no);
    if (work.music) x.music = work.music;   // the song (music video)
  };

  /** one automatic job: global (brief / casting / scenario) or of one episode (write its clips / build its canvas). A failure marks THAT unit failed and the next job still runs. */
  const runJob = async (k: Exclude<Kickoff, null>, no?: number) => {
    const p0 = get().project; if (!p0) return;
    const isEp = k === 'episode' || k === 'canvas';
    const stage = p0.workflow.stage;
    try {
      if (k === 'canvas') {
        const { makeEpisodeCanvas, describeReport, generateClipPrompts } = await import('../director/canvasAction');
        const r = await makeEpisodeCanvas(no!);   // the canvas step shows first (cards hold the clip source text)
        commit((x) => { addChat(x, 'assistant', `${r.file}\n${describeReport(r.report)}`, { crew: 'cinematographer' }); markEpisodeReview(x, no!); });
        // then the official Minimax H3 (Video) prompt of each clip is generated ONE clip at a time, filling the prompt grid as it goes
        try { await generateClipPrompts({ no }); } catch (e) { commit((x) => { addChat(x, 'assistant', (e as Error).message, { crew: 'cinematographer', error: true }); }); }
      } else {
        const work = structuredClone(get().project!);
        if (k === 'episode') work.workflow.episode_no = no!;   // the crew writes this episode (the instruction names it)
        // a long answer is where a model slips: the step is asked in small parts (casting by kind, the scenario as a frame + groups of episodes, an episode as groups of clips).
        // groups may under-deliver: what the crew DID write is kept, and only the missing part is asked again.
        const previous = await previousTexts(work);
        const says: string[] = [], notes: string[] = []; let crewRole: CrewRole | undefined, done = 0;
        try {
          if (k === 'series' || k === 'episode') {
            const target = k === 'episode' ? plannedEpisodeClips(work) : work.series.total_episodes + (work.series.synopsis.trim() ? 0 : 1);
            let guard = 0;
            while (guard++ < 80 && unitProgress(work, k, no) < target) {
              const part = planParts(work, k, no)[0];
              const before = unitProgress(work, k, no);
              const res = await directorTurn(work, kickoffInstruction(work, k, part), crew(), { kickoff: k, previous, part });
              says.push(res.reply.say); notes.push(...res.notes); crewRole = crewRole ?? res.reply.crew; done++;
              if (unitProgress(work, k, no) <= before) throw new Error('The crew wrote nothing new this time (the reply was rejected or only repeated what already exists). Change the model in Settings, or write this part by hand.');
            }
            if (unitProgress(work, k, no) < target) throw new Error('The crew did not finish the whole thing (some parts were rejected). What came through is kept: say "continue" or change the model, then try the step again.');
          } else {
            const parts = planParts(work, k, no);
            for (let i = 0; i < parts.length; i++) {
              const res = await directorTurn(work, kickoffInstruction(work, k, parts[i]), crew(), { kickoff: k, previous, part: parts[i] });
              says.push(res.reply.say); notes.push(...res.notes); crewRole = crewRole ?? res.reply.crew; done++;
            }
          }
        } catch (e) {
          // what was written before the failing part is kept; a retry only redoes the rest
          if (done) commit((x) => { takeOver(x, work); });
          throw new Error(done ? `${(e as Error).message}\n[${done} part(s) written and kept]` : (e as Error).message);
        }
        commit((x) => {
          takeOver(x, work);
          addChat(x, 'assistant', (k === 'episode' ? `${no}: ` : '') + says.filter(Boolean).join(' '), { crew: crewRole ?? defaultCrew(k === 'episode' ? 'episode' : stage), notes });
          if (isEp) markEpisodeReview(x, no!); else markReview(x, k as StageId);
        });
      }
    } catch (e) {
      commit((x) => { addChat(x, 'assistant', (isEp ? `${no}: ` : '') + (e as Error).message, { crew: 'producer_desk', error: true, ...(rawOf(e) ? { raw: rawOf(e) } : {}) }); if (isEp) markEpisodeFailed(x, no!); else markFailed(x, k as StageId); });
    }
  };
  const runJobs = async (jobs: { k: Exclude<Kickoff, null>; no?: number }[]) => {
    if (!jobs.length) return;
    set({ busy: true });
    try { for (const j of jobs) await runJob(j.k, j.no); } finally { set({ busy: false }); }
  };

  /** after a step was approved the screen follows to the next one (only for the episode / global step the producer is looking at) */
  const follow = (r: ApproveResult) => {
    const to = r.to === 'done' ? 'review' : (r.to as StageId | undefined);
    if (to) set({ view: to, ...(r.episode_no ? { focus: r.episode_no } : {}) });
  };

  return {
    project: null, file: null, dirty: false, readOnly: false, notes: [], list: [], busy: false, demo: readDemo(),
    view: 'brief', focus: 1, selClips: [], batch: null,
    setDemo: (demo) => { try { sessionStorage.setItem(DEMO_KEY, demo ? '1' : '0'); } catch { /* ignore */ } set({ demo }); },
    setView: (view) => set({ view }),
    setFocus: (focus) => set({ focus, selClips: [] }),
    toggleClip: (id) => set({ selClips: get().selClips.includes(id) ? get().selClips.filter((x) => x !== id) : [...get().selClips, id] }),
    setSelClips: (selClips) => set({ selClips }),
    setBatch: (batch) => set({ batch }),
    refreshList: async () => { try { set({ list: await listDirectorProjects() }); } catch { set({ list: [] }); } },
    open: async (name) => {
      const r = await openDirectorProject(name);
      const focus = startFocus(r.project);
      set({ project: r.project, file: name, dirty: false, readOnly: r.readOnly, notes: [...(r.migratedFrom !== undefined ? [`migrated from schema ${r.migratedFrom}`] : []), ...r.warnings], focus, view: frontierView(r.project, focus), selClips: [], batch: null });
    },
    save: async () => {
      const { project, readOnly } = get();
      if (!project || readOnly) return false;
      const file = get().file ?? safeProjectName(project.name);
      if (!file) throw new Error('The project name cannot be used as a file name');
      await saveDirectorProject(file, project);
      set({ file, dirty: false });
      void get().refreshList();
      return true;
    },
    remove: async (name) => {
      await deleteDirectorProject(name);
      if (get().file === name) set({ project: null, file: null, dirty: false, readOnly: false, notes: [] });
      await get().refreshList();
    },
    close: () => set({ project: null, file: null, dirty: false, readOnly: false, notes: [], view: 'brief', focus: 1, selClips: [], batch: null }),
    edit: (fn) => {
      const { project, readOnly } = get();
      if (!project || readOnly) return;
      const copy = JSON.parse(JSON.stringify(project)) as DirectorProject;
      fn(copy);
      set({ project: touch(copy), dirty: true });
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { if (get().file) void get().save().catch(() => undefined); }, 1200);   // saved projects keep themselves up to date
    },

    send: async (text) => {
      const t = text.trim();
      if (!t || get().busy) return;
      if (get().readOnly) return;
      if (!get().project) {
        // a canvas without a Director project is open: the new project replaces it with a canvas made for the Director (saved first, or cancelled)
        const { prepareCanvasForNewDirector } = await import('../director/pairing');
        if (!(await prepareCanvasForNewDirector())) return;
        const base =safeProjectName(t.replace(/[\\/:*?"<>|\n\r]+/g, ' ').slice(0, 24)) ?? 'drama';
        const names = new Set(get().list.map((e) => e.name));
        let name = base, i = 2; while (names.has(name)) name = `${base} ${i++}`;
        set({ project: newDirectorProject(name), file: null, dirty: true, view: 'brief', focus: 1 });
      }
      const p = get().project!;
      commit((x) => { addChat(x, 'user', t); });

      // "용의 눈동자 1편에 이어지는 2편": a saved project named in the sentence is read by the crew; at the very start its cast and look are taken over
      try {
        await get().refreshList();
        const own = get().file ? [get().file!] : [];
        const intake = p.workflow.stage === 'intake';
        const said = intake ? [...p.chat.filter((m) => m.role === 'user').map((m) => m.text), t].join(' ') : t;
        const names = matchProjects(said, get().list.map((e) => ({ name: e.name })), [...own, ...(p.continues ?? []).map((c) => c.file)]);
        if (names.length > 1) {
          commit((x) => { addChat(x, 'assistant', `${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n— 어느 프로젝트에 이어서 만들까요? 이름을 정확히 말씀해 주세요.`, { crew: 'producer_desk' }); });
          if (intake) return;
        } else if (names.length === 1) {
          const q = (await openDirectorProject(names[0])).project;
          if (intake) {
            let r = { cast: 0, assets: 0 };
            commit((x) => { r = inheritFrom(x, q, names[0]); addChat(x, 'assistant', `「${q.name}」에 이어서 만듭니다. 이전 내용을 모두 읽었고, 배우 ${r.cast}명과 에셋 ${r.assets}개, 화면 설정을 그대로 가져왔습니다.`, { crew: 'producer_desk' }); });
          } else {
            commit((x) => { attachContext(x, q, names[0]); addChat(x, 'assistant', `「${q.name}」의 내용을 참고 자료로 읽겠습니다.`, { crew: 'producer_desk' }); });
          }
        }
      } catch { /* the project list or the earlier project could not be read: continue without it */ }

      if (get().project!.workflow.stage === 'intake') {
        let k: Kickoff = null;
        commit((x) => { k = startFromIntake(x); });
        if (!get().file) { try { await get().save(); } catch { /* shown by the unsaved mark */ } }
        set({ view: 'brief' });
        if (k) await runJobs([{ k }]);
        return;
      }
      // a free message: the crew answers, may change things, may say "approve". Episode talk ("2번 샷") is about the episode being looked at.
      set({ busy: true });
      const stage = get().project!.workflow.stage;
      try {
        const work = structuredClone(get().project!);
        work.workflow.episode_no = get().focus;
        const res = await directorTurn(work, t, crew(), { kickoff: 'free', previous: await previousTexts(work) });
        // a change asked for during the final review sends the episode back to the clips (the changed clips have to be generated again)
        let back = 0;
        commit((x) => {
          takeOver(x, work); addChat(x, 'assistant', res.reply.say, { crew: res.reply.crew ?? defaultCrew(stage), notes: res.notes });
          const e = episodeByNo(x, get().focus);
          if (e && (e.stage === 'review' || e.stage === 'done') && shotsOfEpisode(x, e.episode_id).some((s) => s.status === 'draft') && reopenEpisode(x, e.no, 'execute')) back = e.no;
        });
        if (back) set({ focus: back, view: 'execute' });
        if (res.reply.intent === 'approve') { set({ busy: false }); await get().approve(); return; }
        // "make the song now": the crew set the song data and asked for the generation (still behind the button's "yes")
        if (res.reply.music?.generate && get().project?.music?.source === 'generate') {
          set({ busy: false });
          try { const { generateSong } = await import('../director/musicAction'); await generateSong(); } catch (e) { commit((x) => { addChat(x, 'assistant', (e as Error).message, { crew: 'music', error: true }); }); }
          return;
        }
      } catch (e) {
        commit((x) => { addChat(x, 'assistant', (e as Error).message, { crew: 'producer_desk', error: true, ...(rawOf(e) ? { raw: rawOf(e) } : {}) }); });
      } finally { set({ busy: false }); }
    },

    approve: async () => {
      const { project, busy, view, focus } = get();
      if (!project || busy || get().readOnly) return;
      if ((EPISODE_STAGES as StageId[]).includes(view)) { await get().approveEpisodes([focus]); return; }
      if (!(GLOBAL_STAGES as StageId[]).includes(view) || project.workflow.stage !== view) return;   // looking at a step that was already approved: nothing to approve
      // the casting images become assets the moment the cast is approved (so later clips can use them)
      if (view === 'references' && project.settings.cast_register !== 'manual' && !blockers(project, 'references').length) {
        try { const { registerCast } = await import('../director/canvasAction'); await registerCast(); } catch (e) { commit((x) => { addChat(x, 'assistant', `Asset Library: ${(e as Error).message}`, { crew: 'art', error: true }); }); }
      }
      // the song becomes an asset the moment it is approved (same rule as the cast: automatic unless the producer chose manual)
      if (view === 'music' && project.settings.cast_register !== 'manual' && !blockers(project, 'music').length) {
        try { const { registerSong } = await import('../director/musicAction'); await registerSong(); } catch (e) { commit((x) => { addChat(x, 'assistant', `Asset Library: ${(e as Error).message}`, { crew: 'music', error: true }); }); }
      }
      let result: ApproveResult | null = null;
      commit((x) => { result = approveStage(x); if (!result.ok) addChat(x, 'assistant', localizeMsg(result.reason ?? ''), { crew: 'producer_desk' }); });
      const r = result as ApproveResult | null;
      if (r?.ok) {
        // the casting canvas was a temporary workbench: its images are in the cast entries now, so it goes away
        if (r.from === 'references') {
          try { const { removeCastingCanvas } = await import('../director/canvasAction'); await removeCastingCanvas(); } catch { /* only the helper file: the approval stands */ }
        }
        follow(r);
        if (r.kickoff) await runJobs([{ k: r.kickoff }]);
        else if (r.to === 'episode' && get().project?.series.total_episodes === 1) await get().startEpisodes([1]);   // one piece: there is no episode to choose, the crew starts writing it
      }
    },

    approveEpisodes: async (nos) => {
      const { project, busy, focus } = get();
      if (!project || busy || get().readOnly) return;
      const jobs: { k: Exclude<Kickoff, null>; no: number }[] = [];
      let focusResult: ApproveResult | null = null;
      for (const no of [...new Set(nos)].sort((a, b) => a - b)) {
        let r: ApproveResult | null = null;
        commit((x) => { r = approveEpisode(x, no); if (!r.ok) addChat(x, 'assistant', `${no}: ${localizeMsg(r.reason ?? '')}`, { crew: 'producer_desk' }); else if (r.finished) addChat(x, 'assistant', localizeMsg('The whole series is finished.'), { crew: 'producer_desk' }); });
        const rr = r as ApproveResult | null;
        if (rr?.ok) { if (no === focus) focusResult = rr; if (rr.kickoff === 'canvas') jobs.push({ k: 'canvas', no }); }
      }
      if (focusResult) follow(focusResult);
      await runJobs(jobs);
    },

    startEpisodes: async (nos) => {
      if (!get().project || get().busy || get().readOnly) return;
      const p0 = get().project!;
      const asked = nos[0] ?? 1;
      const e = episodeByNo(p0, asked);
      const prev = e && asked > 1 ? episodeByNo(p0, asked - 1) : undefined;
      let started: number[] = [];
      commit((x) => { started = startEpisodes(x, nos); });
      if (!started.length) {
        commit((x) => { addChat(x, 'assistant', !productionOpen(x) ? localizeMsg('Approve the scenario first.') : prev && prev.stage !== 'done' ? `${asked}: ${localizeMsg('Finish the previous episode first.')}` : localizeMsg('Nothing is waiting for approval.'), { crew: 'producer_desk' }); });
        return;
      }
      set({ focus: started[0], view: 'episode' });
      await runJobs(started.map((no) => ({ k: 'episode' as const, no })));
    },

    reopen: (no, stage) => {
      let ok = false;
      commit((x) => { ok = reopenEpisode(x, no, stage); });
      if (ok) set({ focus: no, view: stage });
    },

    writeSong: async () => {
      const { project, busy } = get();
      if (!project || busy || get().readOnly || project.workflow.stage !== 'music') return;
      commit((x) => { markWorking(x, 'music'); });
      await runJobs([{ k: 'music' }]);
    },

    recast: async (kinds) => {
      const { project, busy } = get();
      if (!project || busy || get().readOnly) return;
      const castKinds = (['character', 'location', 'prop'] as ReferenceKind[]).filter((k) => kinds.includes(k));
      if (!castKinds.length) return;
      const wasStage = project.workflow.stage, wasStatus = project.workflow.status.references;
      set({ busy: true });
      commit((x) => { markWorking(x, 'references'); });
      try {
        const work = structuredClone(get().project!);
        const previous = await previousTexts(work);
        dropReferences(work, castKinds);   // the old entries are gone from the working copy: the crew cannot reuse them
        const says: string[] = [], notes: string[] = []; let role: CrewRole | undefined;
        for (const kind of castKinds) {
          const res = await directorTurn(work, recastInstruction(work, kind), crew(), { kickoff: 'references', part: { kind }, previous });
          says.push(res.reply.say); notes.push(...res.notes); role = role ?? res.reply.crew;
          if (kind !== 'prop' && !work.references.some((r) => r.kind === kind)) throw new Error(`The crew proposed no new ${kind} entries.`);
        }
        const fresh = work.references.filter((r) => castKinds.includes(r.kind));
        // only now the old entries are replaced: a failure above leaves the cast as it was
        commit((x) => {
          dropReferences(x, castKinds);
          x.references.push(...fresh);
          syncShotAssets(x);
          x.workflow.stage = 'references'; markReview(x, 'references');
          addChat(x, 'assistant', says.filter(Boolean).join(' '), { crew: role ?? 'art', notes });
        });
        // the casting canvas was built from the old entries: it is stale now
        try { const { removeCastingCanvas } = await import('../director/canvasAction'); await removeCastingCanvas(); } catch { /* the helper file only */ }
      } catch (e) {
        commit((x) => { x.workflow.stage = wasStage; x.workflow.status.references = wasStatus; addChat(x, 'assistant', (e as Error).message, { crew: 'art', error: true, ...(rawOf(e) ? { raw: rawOf(e) } : {}) }); });
      } finally { set({ busy: false }); }
    },

    retry: async () => {
      const { project: p, busy, view, focus } = get();
      if (!p || busy) return;
      if ((EPISODE_STAGES as StageId[]).includes(view)) {
        const e = episodeByNo(p, focus); if (!e || e.stage !== view || e.stage_status !== 'failed') return;
        const k = view === 'episode' ? 'episode' : view === 'canvas' ? 'canvas' : null; if (!k) return;
        commit((x) => { markEpisodeWorking(x, focus); });
        await runJobs([{ k, no: focus }]); return;
      }
      if (!GLOBAL_STAGES.includes(view) || p.workflow.stage !== view) return;
      const k: Kickoff = view === 'brief' || view === 'references' || view === 'music' || view === 'series' ? view : null; if (!k) return;
      commit((x) => { markWorking(x, view); });
      await runJobs([{ k }]);
    },
  };
});

export const crewName = (c: CrewRole | undefined) => CREW_LABEL[c ?? 'producer_desk'];
export type { StageId };
