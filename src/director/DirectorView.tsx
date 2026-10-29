import { useEffect, useRef, useState } from 'react';
import { useDirector } from '../store/director';
import { useT } from '../i18n';
import { askText, notify } from '../ui/dialog';
import { viewUrl } from '../backend/comfy';
import { getGallery, type GalleryItem } from '../backend/studio';
import { listAssets, libThumb, type LibAsset } from '../backend/assetlib';
import { useSettings, type LlmSettings } from '../store/settings';
import { useGraph } from '../store/graph';
import { assetKey, mediaKey, useIsBlurred, useSensitive } from '../backend/sensitive';
import { BACKENDS } from '../backend/llm';
import { Llm } from '../panels/SettingsPanel';
import { resultUrl } from './media';
import { CREW_LABEL } from './ai';
import { episodeByNo, findReference, newAsset, newReference, shotsOfEpisode, syncShotAssets } from './model';
import { newSeed } from './execution';
import { applyMusicPatch, defaultSections, newMusic, pickedAudio, songMap } from './music';
import { finishEpisode, generateSong, pickSong, registerSong, syncFinalFromCanvas, uploadSong } from './musicAction';
import { byId } from '../registry';
import { PRESETS, PRESET_LABEL, RESOLUTIONS, splitSeconds } from './series';
import { ASPECTS, applySeriesPatch } from './ai';
import { FORMAT_IDS, FORMATS, vocabOf } from './formats';
import { blockers, hasMusicStep, EPISODE_STAGES, epStageIndex, episodeBlockers, episodeState, GLOBAL_STAGES, productionOpen, stageIndex } from './workflow';
import { localizeMsg } from './localize';
import { castEngines, extraAspects, makeVersionCanvases, versionLinks, downloadEpisodePackages, generateBatch, generateCast, linkOfCasting, linkOfEpisode, openLinkedCanvas, registerCast, syncCastFromCanvas, syncResultsFromCanvas } from './canvasAction';
import type { DirectorProject, DirectorReference, DirectorShot, ResultRef, StageId } from './types';

const STEPS: { id: StageId; label: string }[] = [
  { id: 'brief', label: 'Brief' }, { id: 'references', label: 'Casting' }, { id: 'music', label: 'Song' }, { id: 'series', label: 'Scenario' },
  { id: 'episode', label: 'Episode' }, { id: 'canvas', label: 'Canvas' }, { id: 'execute', label: 'Generate & check' }, { id: 'review', label: 'Final review' },
];
const NEXT_LABEL: Partial<Record<StageId, string>> = { brief: 'Casting', references: 'Scenario', music: 'Scenario', series: 'Episode', episode: 'Canvas', canvas: 'Generate & check', execute: 'Final review', review: 'Next episode' };
const STATUS_TEXT: Record<string, string> = { idle: 'waiting', working: 'the crew is working…', review_required: 'waiting for your approval', approved: 'approved', failed: 'failed', completed: 'finished', blocked: 'blocked' };
const EXAMPLES = [
  '막장 드라마 하나 만들자. 장편이고 30부작, 편당 1분 30초 구성으로 16:9 비율이며 7+1 Kimchy 모드로 생성하고 싶어.',
  '프리미엄 아웃도어 브랜드의 30초 광고를 만들어 줘. 제품을 고급스럽게 보여주고 16:9, 9:16 두 버전으로 필요해.',
  '이 노래로 뮤직비디오를 만들자. 3분 길이, 아티스트가 도시 야경에서 노래하는 분위기로.',
  '제주도 2박 3일 여행 브이로그를 2분 길이로 만들어 줘. 내레이션은 편안한 말투로.',
  '릴스용 15초 숏폼. 첫 장면은 훅으로, 9:16 세로.',
  '용의 눈동자 1편 내용에 이어지는 2편의 내용을 만들자.',
];

/** Director mode: the producer talks in the chat on the left; the results of the crew are on the right; each approval moves the line on.
 *  The steps on top can be clicked at any time to look at them again; looking never changes anything. */
export function DirectorView() {
  const T = useT();
  const d = useDirector();
  const p = d.project;
  useEffect(() => { void d.refreshList(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  // the episode steps show the episode in focus
  const pv = p ? { ...p, workflow: { ...p.workflow, episode_no: d.focus } } : null;
  return (
    <div className="dirx">
      {pv && <Progress p={pv} />}
      <div className="dirx-body">
        <ChatDock p={pv} T={T} />
        <div className="dirx-result">{pv && pv.workflow.stage !== 'intake' ? <StagePanel p={pv} ro={d.readOnly} view={d.view} /> : <Welcome />}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ top: where we are (click a step to look at it again)
const EPISODE_STATE_TEXT: Record<string, string> = { idle: 'not started', working: 'writing', review: 'waiting for approval', building: 'canvas', generating: 'generating', checking: 'review', failed: 'failed', done: 'done' };
function Progress({ p }: { p: DirectorProject }) {
  const T = useT();
  const d = useDirector();
  const w = p.workflow, s = p.series, open = productionOpen(p);
  const ep = episodeByNo(p, d.focus);
  const eps = s.total_episodes > 1;
  const V = vocabOf(s.format);
  const stepName = (id: StageId, label: string) => (id === 'references' ? V.cast : id === 'series' ? V.scenario : id === 'episode' ? V.episode : label);
  return (
    <div className="dirx-progress">
      <div className="dirx-title"><b>{s.title || p.name}</b>
        <span className="dirx-chips">
          {d.demo && <i className="demo" title={T('Demo: nothing is generated, stand-in pictures are used')}>DEMO</i>}{eps && <i>{s.total_episodes} {T('episodes')}</i>}<i>{fmtSec(s.episode_seconds)}</i><i>{s.clip_seconds}s {T('clips')}</i><i>{s.aspect}</i><i>{s.resolution}</i><i>{PRESET_LABEL[s.preset]}</i>
        </span>
      </div>
      <ol className="dirx-steps">
        {STEPS.filter((st) => st.id !== 'music' || hasMusicStep(p)).map((st, i) => {
          const isEp = (EPISODE_STAGES as StageId[]).includes(st.id);
          const locked = isEp && !open;
          let done = false, cur = false, bad = false;
          if (!isEp) { done = stageIndex(st.id) < stageIndex(w.stage); cur = w.stage === st.id; bad = cur && w.status[st.id] === 'failed'; }
          else if (ep && open) { const k = epStageIndex(ep.stage); const me = epStageIndex(st.id as 'episode'); done = ep.stage === 'done' || me < k; cur = ep.stage === st.id; bad = cur && ep.stage_status === 'failed'; }
          return (
            <li key={st.id} className={`${done ? 'done' : ''}${cur ? ' cur' : ''}${bad ? ' bad' : ''}${d.view === st.id ? ' view' : ''}${locked ? ' locked' : ''}`}>
              <button disabled={locked} title={locked ? T('Opens when the scenario is approved') : T('Look at this step')} onClick={() => d.setView(st.id)}>
                <span>{done ? '✓' : i + 1}</span>{T(stepName(st.id, st.label))}{st.id === 'episode' && eps ? ` ${d.focus}/${s.total_episodes}` : ''}
              </button>
            </li>
          );
        })}
      </ol>
      {open && eps && <EpisodeStrip p={p} />}
    </div>
  );
}

/** every episode as a chip with its own state; click = look at it, "several episodes" = tick some and act on them together */
function EpisodeStrip({ p }: { p: DirectorProject }) {
  const T = useT(); const d = useDirector();
  const eps = [...p.episodes].sort((a, b) => a.no - b.no);
  const sel = d.batchMode ? d.selEpisodes : [d.focus];
  const byNo = (n: number) => episodeByNo(p, n);
  const can = {
    start: sel.filter((n) => byNo(n)?.stage === 'idle'),
    approve: sel.filter((n) => { const e = byNo(n); return !!e && e.stage === d.view && e.stage_status === 'review_required'; }),
  };
  const isEpView = (EPISODE_STAGES as StageId[]).includes(d.view);
  return (
    <div className="dx-epstrip">
      <div className="dx-eps-row">
        {eps.map((e) => {
          const st = episodeState(e);
          return (
            <button key={e.episode_id} className={`dx-ep s-${st}${d.focus === e.no ? ' cur' : ''}${d.selEpisodes.includes(e.no) && d.batchMode ? ' sel' : ''}`} title={`${e.no}. ${e.title} — ${T(EPISODE_STATE_TEXT[st])}`} onClick={() => d.setFocus(e.no)}>
              {d.batchMode && <input type="checkbox" checked={d.selEpisodes.includes(e.no)} onClick={(ev) => ev.stopPropagation()} onChange={() => d.toggleEpisode(e.no)} />}
              <b>{e.no}</b><i />
            </button>
          );
        })}
      </div>
      <div className="dx-eps-bar">
        <label className="dx-check"><input type="checkbox" checked={d.batchMode} onChange={(ev) => d.setBatchMode(ev.target.checked)} />{T('Several episodes together')}</label>
        {d.batchMode && <>
          <button className="linkbtn" onClick={() => d.setSelEpisodes(eps.map((e) => e.no))}>{T('All')}</button>
          <button className="linkbtn" onClick={() => d.setSelEpisodes(eps.filter((e) => e.stage === 'idle').map((e) => e.no))}>{T('Not started')}</button>
          <button className="linkbtn" onClick={() => d.setSelEpisodes(eps.filter((e) => e.stage === d.view).map((e) => e.no))}>{T('At this step')}</button>
          <button className="linkbtn" onClick={() => d.setSelEpisodes([])}>{T('None')}</button>
          <span className="dirx-muted">{d.selEpisodes.length ? d.selEpisodes.join(', ') : T('Tick episodes above')}</span>
        </>}
        <span className="dx-eps-act">
          {d.view === 'episode' && <button className="btn" disabled={d.busy || d.readOnly || !can.start.length} onClick={() => void d.startEpisodes(can.start)}>{T('Start writing')} ({can.start.length})</button>}
          {isEpView && <button className="btn" disabled={d.busy || d.readOnly || !can.approve.length} onClick={() => void d.approveEpisodes(can.approve)}>✓ {T('Approve')} ({can.approve.length})</button>}
        </span>
      </div>
    </div>
  );
}
const fmtSec = (n: number) => (n >= 60 ? `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}` : `${n}s`);

// ------------------------------------------------------------------ middle: what the crew produced
function Welcome() {
  const T = useT();
  const d = useDirector();
  return (
    <div className="dirx-welcome">
      <h2>{T('Director')}</h2>
      <p>{T('You are the producer. Say what you want to make in the chat below; the crew (writer, director, art, sound, music) does the work and asks for your approval at each step.')}</p>
      <div className="dirx-examples">{EXAMPLES.map((e) => <button key={e} className="btn" onClick={() => (document.querySelector('.dirx-input textarea') as HTMLTextAreaElement | null)?.focus() ?? undefined} onMouseDown={() => fill(e)}>{e}</button>)}</div>
      <label className="dirx-demo"><input type="checkbox" checked={d.demo} onChange={(e) => d.setDemo(e.target.checked)} /> {T('Try it without an LLM (scripted demo crew)')}</label>
    </div>
  );
}
/** put text into the chat box (React-controlled: set through the native setter) */
function fill(text: string) {
  const ta = document.querySelector('.dirx-input textarea') as HTMLTextAreaElement | null; if (!ta) return;
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(ta, text); ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
}

function StagePanel({ p, ro, view }: { p: DirectorProject; ro: boolean; view: StageId }) {
  const T = useT();
  if (view === 'brief') return <BriefCard p={p} />;
  if (view === 'references') return <CastGrid p={p} ro={ro} />;
  if (view === 'music' && hasMusicStep(p)) return <MusicCard p={p} ro={ro} />;
  if (view === 'series') return <ScenarioList p={p} />;
  if (!productionOpen(p)) return <div className="dx-page"><p className="dirx-muted">{T('Opens when the scenario is approved')}</p></div>;
  const ep = episodeByNo(p, p.workflow.episode_no);
  if (!ep || ep.stage === 'idle') return <EpisodeIdle p={p} ro={ro} />;
  if (view === 'episode') return <EpisodeCard p={p} />;
  if (view === 'canvas') return <CanvasCard p={p} />;
  if (view === 'review') return <ReviewCard p={p} ro={ro} />;
  return <GenerateCard p={p} ro={ro} review={false} />;
}

/** "working" line for the unit being looked at: the global step, or the episode's own step */
function Working({ p }: { p: DirectorProject }) {
  const T = useT(); const view = useDirector((x) => x.view);
  const isEp = (EPISODE_STAGES as StageId[]).includes(view);
  const ep = episodeByNo(p, p.workflow.episode_no);
  const working = isEp ? ep?.stage === view && ep.stage_status === 'working' : p.workflow.status[view] === 'working';
  return working ? <div className="dirx-working"><span className="dirx-spin" />{T('The crew is working…')}</div> : null;
}

function EpisodeIdle({ p, ro }: { p: DirectorProject; ro: boolean }) {
  const T = useT(); const d = useDirector(); const e = episodeByNo(p, p.workflow.episode_no);
  return (
    <div className="dx-page">
      <header className="dx-hero small"><div className="dx-tags"><span>{T('Episode')} {p.workflow.episode_no} / {p.series.total_episodes}</span><span>{T('not started')}</span></div>
        <h2>{e?.title.replace(/^\d+화:\s*/, '') || `${T('Episode')} ${p.workflow.episode_no}`}</h2>{e?.logline && <p>{e.logline}</p>}</header>
      <section className="dx-block"><h4><Ico n="film" />{T('This episode has not been started')}</h4>
        <p className="dx-prose">{T('The crew writes its clips from the scenario and the cast. You can start several episodes at once with "Several episodes together".')}</p>
        <div className="dx-btns"><button className="btn primary big" disabled={ro || d.busy} onClick={() => void d.startEpisodes([p.workflow.episode_no])}>{T('Start writing this episode')}</button></div></section>
    </div>
  );
}

const ICONS: Record<string, string> = {
  film: 'M4 5h16v14H4zM4 9h16M4 15h16M8 5v14M16 5v14',
  clock: 'M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z',
  total: 'M4 19V9M10 19V5M16 19v-7M22 19H2',
  clip: 'M4 6h12v12H4zM16 10l5-3v10l-5-3',
  screen: 'M3 5h18v11H3zM8 20h8M12 16v4',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  sound: 'M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11',
  music: 'M9 18V6l10-2v12M9 18a3 3 0 11-6 0 3 3 0 016 0zM19 16a3 3 0 11-6 0 3 3 0 016 0z',
  idea: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z',
  check: 'M5 12l4 4 10-10',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-7 8-7s8 3 8 7',
  pin: 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  chat: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
  play: 'M7 4l13 8-13 8z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
};
const Ico = ({ n }: { n: keyof typeof ICONS }) => <svg className="dx-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[n]} /></svg>;
const Tile = ({ icon, value, label, sub, tone }: { icon: keyof typeof ICONS; value: string; label: string; sub?: string; tone?: string }) => (
  <div className={`dx-tile ${tone ?? ''}`}><Ico n={icon} /><b>{value}</b><span>{label}</span>{sub && <small>{sub}</small>}</div>
);
const fmtTotal = (sec: number) => { const m = Math.round(sec / 60); return m >= 120 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim() : `${m}m`; };

const EP_SECS = [30, 45, 60, 90, 120, 180, 300];
const CLIP_SECS = [6, 8, 10, 12, 15];
const EditTile = ({ icon, label, tone, wide, children }: { icon: keyof typeof ICONS; label: string; tone?: string; wide?: boolean; children: React.ReactNode }) => (
  <div className={`dx-tile edit ${tone ?? ''}${wide ? ' wide' : ''}`}><Ico n={icon} /><span className="lab">{label}</span>{children}</div>
);
/** the settings of the brief: the crew fills them from the producer's words; here they can be changed with dropdowns and kept with "Apply" */
function BriefTiles({ p }: { p: DirectorProject }) {
  const T = useT(); const edit = useDirector((x) => x.edit); const ro = useDirector((x) => x.readOnly);
  const s = p.series;
  const cur = { format: s.format, total_episodes: s.total_episodes, episode_seconds: s.episode_seconds, clip_seconds: s.clip_seconds, aspect: s.aspect, resolution: s.resolution, preset: s.preset };
  const key = JSON.stringify(cur);
  const [d, setD] = useState(cur);
  useEffect(() => { setD(cur); }, [key]);   // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(d) !== key;
  const parts = splitSeconds(d.episode_seconds, d.clip_seconds);
  const past = p.workflow.stage !== 'brief' && p.workflow.stage !== 'intake';
  const opts = (list: number[], v: number) => [...new Set([...list, v])].sort((x, y) => x - y);
  const apply = () => { const notes: string[] = []; edit((x) => { applySeriesPatch(x, d, notes); }); if (notes.length) void notify(notes.join('\n')); };
  return (
    <>
      <section className="dx-tiles">
        <EditTile icon="idea" label={T('Kind of work')} tone="a" wide><select disabled={ro} value={d.format} onChange={(e) => setD({ ...d, format: e.target.value as typeof d.format })}>{FORMAT_IDS.map((f) => <option key={f} value={f}>{T(FORMATS[f].label)}</option>)}</select></EditTile>
        <EditTile icon="film" label={T('Episodes')} tone="a"><input type="number" min={1} max={200} disabled={ro} value={d.total_episodes} onChange={(e) => setD({ ...d, total_episodes: Math.max(1, Math.min(200, Math.floor(Number(e.target.value) || 1))) })} /></EditTile>
        <EditTile icon="clock" label={T('Per episode')}><select disabled={ro} value={d.episode_seconds} onChange={(e) => setD({ ...d, episode_seconds: Number(e.target.value) })}>{opts(EP_SECS, d.episode_seconds).map((v) => <option key={v} value={v}>{fmtSec(v)}</option>)}</select></EditTile>
        <Tile icon="total" value={fmtTotal(d.total_episodes * d.episode_seconds)} label={T('Total length')} />
        <EditTile icon="clip" label={`${T('Clips per episode')}: ${parts.length}`} tone="b"><select disabled={ro} value={d.clip_seconds} onChange={(e) => setD({ ...d, clip_seconds: Number(e.target.value) })}>{opts(CLIP_SECS, d.clip_seconds).map((v) => <option key={v} value={v}>{v}s × {splitSeconds(d.episode_seconds, v).length}</option>)}</select></EditTile>
        <EditTile icon="screen" label={T('Aspect · resolution')}><div className="dx-two-sel"><select disabled={ro} value={d.aspect} onChange={(e) => setD({ ...d, aspect: e.target.value })}>{ASPECTS.map((v) => <option key={v}>{v}</option>)}</select><select disabled={ro} value={d.resolution} onChange={(e) => setD({ ...d, resolution: e.target.value as typeof d.resolution })}>{RESOLUTIONS.map((v) => <option key={v}>{v}</option>)}</select></div></EditTile>
        <EditTile icon="bolt" label={T('Rendering')} tone="a"><select disabled={ro} value={d.preset} onChange={(e) => setD({ ...d, preset: e.target.value as typeof d.preset })}>{PRESETS.map((v) => <option key={v} value={v}>{PRESET_LABEL[v]}</option>)}</select></EditTile>
      </section>
      {dirty && (
        <div className="dx-apply"><span>{T('You changed the settings.')}{past ? ` ${T('Scenario and clips that are already written are not changed: ask the crew in the chat to rewrite them if needed.')}` : ''}</span>
          <button className="btn" onClick={() => setD(cur)}>{T('Undo')}</button><button className="btn primary" disabled={ro} onClick={apply}>{T('Apply')}</button></div>)}
    </>
  );
}

function BriefCard({ p }: { p: DirectorProject }) {
  const T = useT(); const s = p.series;
  const parts = splitSeconds(s.episode_seconds, s.clip_seconds);
  const first = (p.brief.text.split(/(?<=[.!?。])\s/)[0] || '').trim();
  const log = s.logline || first;
  return (
    <div className="dx-page">
      <Working p={p} />
      <header className="dx-hero">
        <div className="dx-tags">{s.genre && <span>{s.genre}</span>}{s.tone && <span>{s.tone}</span>}{(p.continues ?? []).length > 0 && <span className="cont"><Ico n="link" />{(p.continues ?? []).map((c) => c.name).join(', ')}</span>}</div>
        <h2>{s.title || p.name}</h2>
        {log && <p>{log}</p>}
      </header>

      <BriefTiles p={p} />

      <section className="dx-block">
        <h4>{T('How one episode is cut')}</h4>
        <div className="dx-bar" aria-label={`${fmtSec(s.episode_seconds)} = ${parts.join(' + ')}`}>{parts.map((d, i) => <i key={i} style={{ flex: d }}><em>{i + 1}</em>{d}s</i>)}</div>
        <small>{T('Every episode is written as clips of this length, so each clip renders at the length the model handles best.')}</small>
      </section>

      <section className="dx-two">
        <div className="dx-card sound"><h4><Ico n="sound" />{T('Sound')}</h4><p>{s.sound_direction || '—'}</p></div>
        <div className="dx-card music"><h4><Ico n="music" />{T('Music')}</h4><p>{s.music_direction || '—'}</p></div>
      </section>

      {p.brief.text && <section className="dx-block"><h4><Ico n="idea" />{T('Concept')}</h4><p className="dx-prose">{p.brief.text}</p></section>}

      {p.brief.assumptions.length > 0 && (
        <section className="dx-assume">
          <h4>{T('I decided these for you')}</h4>
          <p>{T('Tell me in the chat if any of them is wrong.')}</p>
          <ul>{p.brief.assumptions.map((a, i) => <li key={i}><Ico n="check" />{a}</li>)}</ul>
        </section>
      )}
    </div>
  );
}

const img = (r?: ResultRef) => resultUrl(r);

function PageHead({ icon, title, sub, right }: { icon: keyof typeof ICONS; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <header className="dx-head"><span className="dx-head-ico"><Ico n={icon} /></span><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{right && <div className="dx-head-right">{right}</div>}</header>
  );
}
const Meter = ({ done, total, label }: { done: number; total: number; label: string }) => (
  <div className="dx-meter"><div><i style={{ width: `${total ? (100 * done) / total : 0}%` }} /></div><span>{label}</span></div>
);

// ---- the cast follows the project: avatars and the strip that is shown in every step
function Avatar({ r, size = 28 }: { r: DirectorReference; size?: number }) {
  const pick = r.results.find((x) => x.picked);
  return <span className={`dx-av k-${r.kind}`} style={{ width: size, height: size }} title={r.name}>{pick ? <img src={img(pick)} alt={r.name} loading="lazy" /> : <b>{r.name.slice(0, 1)}</b>}</span>;
}
function CastStrip({ p, names }: { p: DirectorProject; names?: string[] }) {
  const T = useT();
  const live = p.references.filter((r) => r.status !== 'rejected' && (!names || names.some((n) => n.trim().toLowerCase() === r.name.trim().toLowerCase())));
  if (!live.length) return null;
  return <div className="dx-strip"><span>{T('Cast')}</span>{live.map((r) => <span key={r.ref_id} className="dx-strip-item"><Avatar r={r} size={30} /><em>{r.name}</em></span>)}</div>;
}
/** cast entries whose name appears in a text (an episode's title / story line) */
const castInText = (p: DirectorProject, text: string) => p.references.filter((r) => r.status !== 'rejected' && r.name.length > 1 && text.toLowerCase().includes(r.name.toLowerCase())).map((r) => r.name);

/** choose the image of a cast entry from the Asset Library or from the Gallery (instead of generating it) */
/** a picture that the producer hid with the eye in the Gallery / Asset Library stays blurred here too (same hidden list) */
function Hideable({ k, children }: { k: string; children: React.ReactNode }) {
  const hid = useIsBlurred(k);
  return <span className={`dx-hideable${hid ? ' hid' : ''}`}>{children}</span>;
}

function CastPicker({ refId, onClose }: { refId: string; onClose: () => void }) {
  const T = useT(); const edit = useDirector((x) => x.edit); const sub = useSettings((x) => x.saveSubfolder);
  const [tab, setTab] = useState<'library' | 'gallery'>('library');
  useEffect(() => { void useSensitive.getState().load(); }, []);
  const [lib, setLib] = useState<LibAsset[] | null>(null); const [gal, setGal] = useState<GalleryItem[] | null>(null); const [err, setErr] = useState('');
  useEffect(() => {
    listAssets({ kind: 'image' }).then(setLib, (e) => { setLib([]); setErr(`${T('The Asset Library is not available')}: ${(e as Error).message}`); });
    getGallery('klein', sub, 0, 100).then((r) => setGal(r.images), () => setGal([]));
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const setPick = (x: DirectorProject, make: (r: DirectorReference) => ResultRef) => {
    const r = x.references.find((q) => q.ref_id === refId)!;
    r.results.forEach((z) => { z.picked = false; });
    r.results.push(make(r));
    if (r.status === 'rejected') r.status = 'proposed';
    syncShotAssets(x);
  };
  const chooseLib = (a: LibAsset) => { edit((x) => { setPick(x, () => ({ result_id: `rs_lib_${a.id}`, file: { filename: `library-${a.id}`, subfolder: '', type: 'input' }, kind: 'image', source: 'library', lib_id: a.id, created_at: new Date().toISOString(), picked: true }));
    const r = x.references.find((q) => q.ref_id === refId)!;
    const have = x.assets.find((q) => q.source.kind === 'library' && q.source.id === a.id) ?? newAsset(x, { name: a.name, role: r.kind === 'character' ? 'character' : r.kind === 'location' ? 'background' : 'prop', source: { kind: 'library', id: a.id }, note: r.description });
    r.asset_id = have.asset_id; syncShotAssets(x); }); onClose(); };
  const chooseGal = (g: GalleryItem) => { edit((x) => { setPick(x, () => ({ result_id: `rs_gal_${g.subfolder}_${g.filename}`, file: { filename: g.filename, subfolder: g.subfolder, type: 'output' }, kind: 'image', source: 'gallery', created_at: new Date().toISOString(), picked: true }));
    x.references.find((q) => q.ref_id === refId)!.asset_id = undefined; }); onClose(); };
  return (
    <div className="dx-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dx-modal-box">
        <header><b>{T('Choose the image')}</b>
          <div className="dx-seg"><button className={tab === 'library' ? 'on' : ''} onClick={() => setTab('library')}>{T('Asset Library')}</button><button className={tab === 'gallery' ? 'on' : ''} onClick={() => setTab('gallery')}>{T('Gallery')}</button></div>
          <button className="dir-x" onClick={onClose}>✕</button></header>
        {err && tab === 'library' && <p className="dirx-muted">{err}</p>}
        <div className="dx-picker">
          {tab === 'library' && (lib ?? []).map((a) => <button key={a.id} onClick={() => chooseLib(a)} title={a.name}><Hideable k={assetKey(a.id)}><img src={libThumb(a.id)} alt="" loading="lazy" /></Hideable><small>{a.name}</small></button>)}
          {tab === 'gallery' && (gal ?? []).map((g) => <button key={`${g.subfolder}/${g.filename}`} onClick={() => chooseGal(g)} title={g.filename}><Hideable k={mediaKey(g.filename, g.subfolder)}><img src={viewUrl({ filename: g.filename, subfolder: g.subfolder, type: 'output' })} alt="" loading="lazy" /></Hideable></button>)}
          {tab === 'library' && lib && !lib.length && !err && <p className="dirx-muted">{T('The Asset Library is empty.')}</p>}
          {tab === 'gallery' && gal && !gal.length && <p className="dirx-muted">{T('The Gallery is empty.')}</p>}
        </div>
      </div>
    </div>
  );
}

// ---- casting
const KIND: Record<string, { icon: keyof typeof ICONS; label: string; cls: string }> = { character: { icon: 'user', label: 'Actors', cls: 'k-char' }, location: { icon: 'pin', label: 'Locations', cls: 'k-loc' }, prop: { icon: 'box', label: 'Props', cls: 'k-prop' } };
function CastCard({ r, onPick, onMake, onRegister, onChoose, onSavePrompt, onVariant, ro, busy }: { r: DirectorReference; onVariant?: () => void; onPick: () => void; onMake: () => void; onRegister: () => void; onChoose: (id: string) => void; onSavePrompt: (text: string) => void; ro: boolean; busy: boolean }) {
  const T = useT(); const pick = r.results.find((x) => x.picked); const k = KIND[r.kind];
  const fmtOfProject = useDirector((x) => x.project?.series.format);
  const [showPrompt, setShowPrompt] = useState(false); const [draft, setDraft] = useState<string | null>(null);
  const shown = r.description;
  return (
    <article className={`dx-cast ${k.cls}`}>
      <div className="dx-cast-img">{pick ? <img src={img(pick)} alt={r.name} loading="lazy" /> : <div className="empty"><Ico n="image" /><span>{T('No image yet')}</span></div>}
        <span className="badge"><Ico n={k.icon} />{T(r.kind === 'character' ? vocabOf(fmtOfProject).character : r.kind === 'location' ? vocabOf(fmtOfProject).location : vocabOf(fmtOfProject).prop)}</span>
        {r.asset_id && <span className="asset"><Ico n="check" />{T('Asset')}</span>}</div>
      <div className="dx-cast-body"><b>{r.name}</b>{r.variant_of && <em><Ico n="link" />{T('look of')} {r.variant_of}</em>}<p>{r.description}</p>
        {r.results.length > 1 && <div className="dx-cands" title={T('Other takes: click one to use it')}>{r.results.map((x) => <button key={x.result_id} className={x.picked ? 'on' : ''} disabled={ro} onClick={() => onChoose(x.result_id)}><img src={img(x)} alt="" loading="lazy" /></button>)}</div>}
        <div className="dx-cast-actions">
          <button className="btn small" disabled={ro || busy} onClick={onMake}>{pick ? `↻ ${T('Make again')}` : T('Make this one')}</button>
          <button className="btn small" disabled={ro} onClick={onPick}>{pick ? T('Change image') : T('Choose from Library / Gallery')}</button>
          {onVariant && <button className="btn small" disabled={ro || busy} title={T('The same one with another costume, hair or look (a new entry)')} onClick={onVariant}>+ {T('New look')}</button>}
          {pick && !r.asset_id && <button className="btn small" disabled={ro || busy} onClick={onRegister}>{T('Register as asset')}</button>}
          <button className={`btn small${showPrompt ? ' on' : ''}`} onClick={() => setShowPrompt(!showPrompt)}>{T('Edit description')}</button>
        </div>
        {showPrompt && (
          <div className="dx-promptbox">
            <textarea rows={5} disabled={ro} value={draft ?? shown} onChange={(e) => setDraft(e.target.value)} />
            <small>{T('This text is all there is: when the image is made, the image model\'s own prompt writer turns it into that model\'s prompt.')}</small>
            {draft !== null && draft !== shown && <div className="dx-btns"><button className="btn small" onClick={() => setDraft(null)}>{T('Undo')}</button><button className="btn small primary" disabled={ro} onClick={() => { onSavePrompt(draft); setDraft(null); }}>{T('Apply')}</button></div>}
          </div>)}
      </div>
    </article>
  );
}
function CastGrid({ p, ro }: { p: DirectorProject; ro: boolean }) {
  const T = useT(); const edit = useDirector((x) => x.edit); const [busy, setBusy] = useState(false); const [picking, setPicking] = useState<string | null>(null);
  const live = p.references.filter((r) => r.status !== 'rejected');
  const made = live.filter((r) => r.results.some((x) => x.picked)).length;
  const link = linkOfCasting(p);
  const engines = castEngines();
  const engine = p.settings.cast_engine && engines.some((e) => e.id === p.settings.cast_engine) ? p.settings.cast_engine : engines[0]?.id;
  const toRegister = live.filter((r) => r.results.some((x) => x.picked) && !r.asset_id);
  const guard = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } catch (e) { await notify((e as Error).message); } finally { setBusy(false); } };
  const report = async (r: Awaited<ReturnType<typeof generateCast>>) => { if (r.failed) await notify(`${T('Failed')}: ${r.failed}`); else if (!r.cancelled && !r.made) await notify(T('Every cast entry already has an image.')); };
  const makeAll = () => guard(async () => report(await generateCast({ engine })));
  const makeOne = (r: DirectorReference) => guard(async () => report(await generateCast({ refIds: [r.ref_id], engine, newSeed: r.results.some((x) => x.picked) })));
  const sync = () => guard(async () => { const n = await syncCastFromCanvas(); await notify(n ? `${T('Results added')}: ${n}` : T('No new results.')); });
  const register = (ids?: string[]) => guard(async () => { const n = await registerCast({ refIds: ids }); await notify(n ? `${T('Registered')}: ${n}` : T('Nothing to register.')); });
  const choose = (r: DirectorReference, resultId: string) => edit((x) => { const q = x.references.find((z) => z.ref_id === r.ref_id)!; q.results.forEach((z) => { z.picked = z.result_id === resultId; }); q.asset_id = undefined; });
  const regMode = p.settings.cast_register ?? 'auto';
  // a new look (costume, hair, age, season) of a cast entry: a new entry that says it is a variant of the first one; its prompt is the base prompt + the change
  const variant = async (r: DirectorReference) => {
    const what = (await askText(`${T('Describe the new look (costume, hair, age, season …)')}\n${r.name}`))?.trim(); if (!what) return;
    edit((x) => { const b = x.references.find((q) => q.ref_id === r.ref_id); if (!b) return; const v = newReference(x, b.kind, `${b.name} (${what.slice(0, 14)})`, `${b.description} — ${what}`); v.variant_of = b.name; v.seed = undefined; });
  };
  return (
    <div className="dx-page">
      <Working p={p} />
      <PageHead icon="user" title={T(vocabOf(p.series.format).cast)} sub={T('Actors, locations and props are cast first; the story is written with them.')}
        right={link && <button className="btn" onClick={() => void openLinkedCanvas(link.canvas_file).catch((e) => notify((e as Error).message))}>{T('Open in Canvas')}</button>} />
      <section className="dx-block"><h4><Ico n="image" />{T('Make the cast images')}</h4>
        <div className="dx-btns">
          <label className="dx-field">{T('Image model')}<select disabled={ro || busy} value={engine} onChange={(ev) => edit((x) => { x.settings.cast_engine = ev.target.value; })}>{engines.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</select></label>
          <button className="btn primary" disabled={ro || busy || !live.length || p.workflow.status.references === 'working' || made === live.length} onClick={() => void makeAll()}>{T('Generate all')} ({live.length - made})</button>
          <button className="btn" disabled={ro || !link} onClick={() => void sync()}>{T('Sync results')}</button>
        </div>
        <p className="dirx-muted">{T('Or make one entry at a time on its card, choose an image from the Asset Library or the Gallery, or make one again for a different take.')}</p>
      </section>
      <section className="dx-block"><h4><Ico n="box" />{T('Register as assets')}</h4>
        <div className="dx-btns">
          <label className="dx-check"><input type="radio" name="reg" checked={regMode === 'auto'} disabled={ro} onChange={() => edit((x) => { x.settings.cast_register = 'auto'; })} />{T('Automatic: all of them when the casting is approved')}</label>
          <label className="dx-check"><input type="radio" name="reg" checked={regMode === 'manual'} disabled={ro} onChange={() => edit((x) => { x.settings.cast_register = 'manual'; })} />{T('Manual: only the ones I register')}</label>
          <button className="btn" disabled={ro || busy || !toRegister.length} onClick={() => void register()}>{T('Register all now')} ({toRegister.length})</button>
        </div>
      </section>
      {live.length > 0 && <Meter done={made} total={live.length} label={`${made} / ${live.length} ${T('images ready')}`} />}
      {(['character', 'location', 'prop'] as const).map((kind) => {
        const items = live.filter((r) => r.kind === kind); if (!items.length) return null;
        return <section key={kind} className="dx-group"><h4 className={KIND[kind].cls}><Ico n={KIND[kind].icon} />{T(kind === 'character' ? vocabOf(p.series.format).characters : kind === 'location' ? vocabOf(p.series.format).locations : vocabOf(p.series.format).props)} <small>{items.length}</small></h4>
          <div className="dx-castgrid">{items.map((r) => <CastCard key={r.ref_id} r={r} ro={ro} busy={busy} onVariant={r.kind !== 'prop' && !r.variant_of ? () => void variant(r) : undefined} onPick={() => setPicking(r.ref_id)} onMake={() => void makeOne(r)} onRegister={() => void register([r.ref_id])} onChoose={(id) => choose(r, id)} onSavePrompt={(text) => edit((x) => { const q = x.references.find((z) => z.ref_id === r.ref_id); if (q) q.description = text.trim(); })} />)}</div></section>;
      })}
      {picking && <CastPicker refId={picking} onClose={() => setPicking(null)} />}
    </div>
  );
}


// ---- the song of a music video: the producer's own file OR made by the AI, chosen here or by chat
const SECTION_COLOR: Record<string, string> = { intro: '#6b7a99', verse: '#4f8f7a', 'pre-chorus': '#a68a3a', chorus: '#b0507a', bridge: '#7b62b5', outro: '#6b7a99' };
function MusicCard({ p, ro }: { p: DirectorProject; ro: boolean }) {
  const T = useT(); const d = useDirector(); const edit = d.edit; const [busy, setBusy] = useState(false);
  const m = p.music;
  const picked = pickedAudio(m);
  const engines = (byId.get('music-generate')?.engines ?? []).map((e) => ({ id: e.id, label: e.label }));
  const engine = m?.engine && engines.some((e) => e.id === m.engine) ? m.engine : engines[0]?.id;
  const guard = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } catch (e) { await notify((e as Error).message); } finally { setBusy(false); } };
  const choose = (src: 'upload' | 'generate') => edit((x) => { x.music = x.music ?? newMusic(); applyMusicPatch(x.music, { source: src }); });
  const set = (patch: Record<string, unknown>) => edit((x) => { x.music = x.music ?? newMusic(); applyMusicPatch(x.music, patch); });
  const fileRef = useRef<HTMLInputElement>(null);
  const clips = m && m.sections.length && m.duration_sec > 0 ? songMap(m.duration_sec, p.series.clip_seconds, m.sections) : [];
  const total = m?.duration_sec || 0;
  return (
    <div className="dx-page"><Working p={p} />
      <PageHead icon="music" title={T('Song')} sub={T('The music video is cut to the song: use your own song, or let the AI make one.')} />
      <section className="dx-block"><h4><Ico n="music" />{T('Where does the song come from?')}</h4>
        <div className="dx-choose-grid">
          <button className={m?.source === 'upload' ? 'on' : ''} disabled={ro} onClick={() => choose('upload')}><Ico n="box" /><b>{T('My own song')}</b><span>{T('Upload a music file. The crew proposes its structure (intro, verse, chorus …).')}</span></button>
          <button className={m?.source === 'generate' ? 'on' : ''} disabled={ro} onClick={() => choose('generate')}><Ico n="bolt" /><b>{T('Make with the AI')}</b><span>{T('The crew writes the style and lyrics, the music model makes the song.')}</span></button>
        </div>
        <p className="dirx-muted">{T('You can also say it in the chat: "use my own song" or "make the song with the AI".')}</p>
      </section>
      {m?.source === 'upload' && (
        <section className="dx-block"><h4><Ico n="box" />{T('Your song file')}</h4>
          <div className="dx-btns">
            <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg" style={{ display: 'none' }} onChange={(ev) => { const f = ev.target.files?.[0]; ev.target.value = ''; if (f) void guard(() => uploadSong(f)); }} />
            <button className="btn primary" disabled={ro || busy} onClick={() => fileRef.current?.click()}>{picked ? T('Choose another file') : T('Choose the song file')}</button>
            <button className="btn" disabled={ro || d.busy || !picked} onClick={() => void d.writeSong()}>{T('Ask the crew to propose the structure')}</button>
          </div>
        </section>)}
      {m?.source === 'generate' && (
        <section className="dx-block"><h4><Ico n="bolt" />{T('Make the song')}</h4>
          <div className="dx-btns">
            <label className="dx-field">{T('Music model')}<select disabled={ro || busy} value={engine} onChange={(ev) => set({ engine: ev.target.value })}>{engines.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</select></label>
            <button className="btn" disabled={ro || d.busy} onClick={() => void d.writeSong()}>{T('Ask the crew to write the song')}</button>
            <button className="btn primary" disabled={ro || busy || !m.style.trim() || !m.lyrics.trim()} onClick={() => void guard(async () => { const r = await generateSong({ newSeedNow: !!picked }); if (!r.made && !r.cancelled) await notify(T('No song came back.')); })}>▶ {picked ? T('Make another take') : T('Make the song')}</button>
          </div>
          <div className="dx-songfields">
            <label className="dx-field wide">{T('Style')}<textarea rows={2} disabled={ro} defaultValue={m.style} key={`st-${m.style}`} onBlur={(ev) => ev.target.value !== m.style && set({ style: ev.target.value })} /></label>
            <label className="dx-field wide">{T('Lyrics')}<textarea rows={6} disabled={ro} defaultValue={m.lyrics} key={`ly-${m.lyrics}`} onBlur={(ev) => ev.target.value !== m.lyrics && set({ lyrics: ev.target.value })} /></label>
          </div>
        </section>)}
      {m && (m.source || m.title) && (
        <section className="dx-block"><h4><Ico n="list" />{T('The song')}</h4>
          <div className="dx-songmeta">
            <label className="dx-field">{T('Title')}<input disabled={ro} defaultValue={m.title} key={`ti-${m.title}`} onBlur={(ev) => ev.target.value !== m.title && set({ title: ev.target.value })} /></label>
            <label className="dx-field">{T('Length (s)')}<input type="number" min={10} max={600} disabled={ro} defaultValue={m.duration_sec || ''} key={`du-${m.duration_sec}`} onBlur={(ev) => Number(ev.target.value) !== m.duration_sec && set({ duration_sec: Number(ev.target.value) })} /></label>
            <label className="dx-field">BPM<input type="number" min={0} max={240} disabled={ro} defaultValue={m.bpm || ''} key={`bp-${m.bpm}`} onBlur={(ev) => Number(ev.target.value) !== m.bpm && set({ bpm: Number(ev.target.value) })} /></label>
            <label className="dx-field">{T('Language')}<select disabled={ro} value={m.language} onChange={(ev) => set({ language: ev.target.value })}><option value="ko">한국어</option><option value="en">English</option></select></label>
          </div>
          {m.candidates.length > 0 && <div className="dx-takes">{m.candidates.map((c, i) => (
            <div key={c.result_id} className={`dx-take${c.picked ? ' on' : ''}`}><span>{c.source === 'upload' ? T('Uploaded') : `${T('Take')} ${i + 1}`}{c.source === 'demo' ? ' · DEMO' : ''}</span>
              <audio controls preload="none" src={resultUrl(c)} />
              {c.picked ? <i>✓ {T('The song')}</i> : <button className="linkbtn" disabled={ro} onClick={() => pickSong(c.result_id)}>{T('Use this take')}</button>}</div>))}</div>}
          {total > 0 && m.sections.length > 0 && <>
            <div className="dx-songbar" title={T('Sections of the song')}>{m.sections.map((s, i) => <span key={i} style={{ width: `${(100 * (s.end_sec - s.start_sec)) / total}%`, background: SECTION_COLOR[s.name] }} title={`${s.name} ${s.start_sec}–${s.end_sec}s`}>{s.name}</span>)}</div>
            <div className="dx-songbar clips" title={T('Which part of the song each clip covers')}>{clips.map((c) => <span key={c.no} style={{ width: `${(100 * (c.to - c.from)) / total}%` }} title={`${T('Clip')} ${c.no}: ${c.from}–${c.to}s ${c.section ?? ''}`}>{c.no}</span>)}</div>
            <p className="dirx-muted">{clips.length} {T('clips')} · {p.series.clip_seconds}s</p>
            <div className="dx-btns"><button className="linkbtn" disabled={ro} onClick={() => set({ sections: defaultSections(total) })}>{T('Reset the sections to a typical song')}</button></div></>}
          {picked && <div className="dx-btns"><button className="btn" disabled={ro || busy || !!m.asset_id} onClick={() => void guard(async () => { await registerSong(); })}>{m.asset_id ? T('Registered as an asset') : T('Register the song as an asset')}</button></div>}
        </section>)}
    </div>
  );
}

// ---- scenario
function ScenarioList({ p }: { p: DirectorProject }) {
  const T = useT(); const eps = [...p.episodes].sort((a, b) => a.no - b.no);
  return (
    <div className="dx-page">
      <Working p={p} />
      <header className="dx-hero small"><div className="dx-tags"><span>{p.series.genre}</span><span>{eps.length} {T('episodes')}</span></div>
        <h2>{p.series.logline || p.series.title}</h2>{p.series.synopsis && <p>{p.series.synopsis}</p>}</header>
      <CastStrip p={p} />
      <section className="dx-group"><h4><Ico n="list" />{T(p.series.total_episodes > 1 ? 'Episodes' : vocabOf(p.series.format).scenario)} <small>{eps.length}</small></h4>
        <div className="dx-epgrid">{eps.map((e) => (
          <article key={e.episode_id} className={`dx-epcard st-${e.status}`}><span className="no">{e.no}</span><div><b>{e.title.replace(/^\d+화:\s*/, '')}</b><p>{e.logline}</p><EpisodeRefs p={p} e={e} /></div></article>))}</div>
      </section>
    </div>
  );
}

/** the cast, props and places of an episode (what the scenario decided; before that was decided, the names written in its story line) */
function EpisodeRefs({ p, e }: { p: DirectorProject; e: DirectorProject['episodes'][number] }) {
  const T = useT();
  const named = [...(e.cast ?? []), ...(e.locations ?? [])].map((n) => findReference(p, n)).filter((r): r is DirectorReference => !!r && r.status !== 'rejected');
  const refs = named.length ? named : p.references.filter((r) => castInText(p, `${e.title} ${e.logline}`).includes(r.name));
  const anyPlace = p.references.some((r) => r.kind === 'location' && r.status !== 'rejected');
  return (
    <div className="dx-avs">{[...new Set(refs)].map((r) => <span key={r.ref_id} className="dx-strip-item"><Avatar r={r} size={22} /><em>{r.name}</em></span>)}
      {!refs.some((r) => r.kind !== 'location') && <small className="dx-warn">{T('No cast yet')}</small>}
      {anyPlace && !refs.some((r) => r.kind === 'location') && <small className="dx-warn">{T('No place yet')}</small>}</div>
  );
}

// ---- episode / clips
const STATUS_KO: Record<string, string> = { draft: 'draft', ready: 'ready', approved: 'approved', queued: 'queued', generating: 'generating', review: 'review', done: 'done', failed: 'failed' };
function ClipCard({ s, n, big, gen, sel, onSel, onAgain, ro }: { s: DirectorShot; n: number; big?: boolean; gen?: boolean; sel?: boolean; onSel?: () => void; onAgain?: () => void; ro?: boolean }) {
  const T = useT(); const proj = useDirector((x) => x.project); const edit = useDirector((x) => x.edit);
  const pick = s.results.find((r) => r.picked);
  const live = useGraph((g) => { const l = proj?.canvas_links.find((c) => !c.aspect && c.shots.some((q) => q.shot_id === s.shot_id)); const id = l?.shots.find((q) => q.shot_id === s.shot_id)?.node_ids[1]; return id && g.canvasFile === l?.canvas_file ? g.runtime[id] : undefined; });
  const setSeed = (v: number | undefined) => edit((x) => { const q = x.shots.find((z) => z.shot_id === s.shot_id); if (q) q.seed = v; });
  const passed = !!pick && s.passed === pick.result_id;
  const setPass = () => edit((x) => { const q = x.shots.find((z) => z.shot_id === s.shot_id); const pk = q?.results.find((r) => r.picked); if (q && pk) q.passed = passed ? undefined : pk.result_id; });
  const setIn = (v: boolean) => edit((x) => { const q = x.shots.find((z) => z.shot_id === s.shot_id); if (q) q.excluded = v ? undefined : true; });
  return (
    <article className={`dx-clip st-${s.status}${sel ? ' sel' : ''}`}>
      <header>{onSel && <input type="checkbox" className="dx-clip-check" checked={!!sel} onChange={onSel} title={T('Select this clip')} />}<span className="num">{n}</span><span className="pill">{s.duration_sec}s</span>{s.camera && <span className="pill cam">{s.camera}</span>}<span className={`stat s-${s.status}`}>{T(STATUS_KO[s.status])}</span>{pick && s.passed === pick.result_id && <span className="stat s-done">✓ {T('Passed')}</span>}{s.excluded && <span className="stat s-failed">{T('Left out')}</span>}</header>
      {s.status === 'generating' && live?.status === 'running' && <div className="dx-clipprog"><div><i style={{ width: `${Math.max(2, Math.min(100, Math.round(live.pct ?? 0)))}%` }} /></div><span>{Math.round(live.pct ?? 0)}%{live.label ? ` · ${live.label}` : ''}</span></div>}
      <p className="pic">{s.prompt_ko || s.prompt_en}</p>
      {s.prompt_ko && <p className="en">{s.prompt_en}</p>}
      {(s.dialogue || s.sound || s.music) && <ul className="voices">
        {s.dialogue && <li className="dlg" title={T(proj?.series.format === 'vlog' ? 'Narration' : 'Dialogue')}><Ico n="chat" />{proj?.series.format === 'vlog' && <b className="dx-voice">{T('Narration')}</b>}<span>{s.dialogue}</span></li>}
        {s.sound && <li className="snd"><Ico n="sound" /><span>{s.sound}</span></li>}
        {s.music && <li className="mus"><Ico n="music" /><span>{s.music}</span></li>}</ul>}
      {(s.cast.length > 0 || s.location) && <footer>{s.cast.map((c) => { const r = proj?.references.find((x) => x.name.toLowerCase() === c.toLowerCase()); return <i key={c}>{r ? <Avatar r={r} size={18} /> : <Ico n="user" />}{c}</i>; })}{s.location && <i className="loc">{(() => { const r = proj?.references.find((x) => x.name.toLowerCase() === s.location.toLowerCase()); return r ? <Avatar r={r} size={18} /> : <Ico n="pin" />; })()}{s.location}</i>}</footer>}
      {big && pick && <div className="dx-preview">{pick.kind === 'video' ? <video src={img(pick)} controls preload="metadata" /> : <img src={img(pick)} alt="" />}</div>}
      <Thumbs s={s} />
      {gen && (
        <div className="dx-seedrow">
          <label>{T('Seed')}<input type="number" min={0} disabled={ro} placeholder={T('random')} value={s.seed ?? ''} onChange={(e) => setSeed(e.target.value === '' ? undefined : Math.max(0, Math.floor(Number(e.target.value))))} /></label>
          <button className="btn small" disabled={ro} title={T('A new random seed')} onClick={() => setSeed(newSeed())}>🎲</button>
          {onAgain && <button className="btn small" disabled={ro} title={T('Make this clip again with a new seed')} onClick={onAgain}>↻ {T('Make again')}</button>}
        </div>)}
      {gen && (
        <div className="dx-passrow">
          <button className={`btn small${passed ? ' primary' : ''}`} disabled={ro || !pick} title={T('The clip is good: it can be joined')} onClick={setPass}>{passed ? `✓ ${T('Passed')}` : T('Pass')}</button>
          <label className="dx-check"><input type="checkbox" disabled={ro} checked={!s.excluded} onChange={(ev) => setIn(ev.target.checked)} />{T('In the joined video')}</label>
        </div>)}
    </article>
  );
}
function Thumbs({ s }: { s: DirectorShot }) {
  const edit = useDirector((x) => x.edit); const T = useT();
  if (!s.results.length) return null;
  return <div className="dirx-thumbs">{s.results.map((r) => (
    <button key={r.result_id} className={r.picked ? 'on' : ''} title={r.picked ? T('Picked') : T('Pick this result')} onClick={() => edit((x) => { const q = x.shots.find((z) => z.shot_id === s.shot_id)!; q.results.forEach((z) => { z.picked = z.result_id === r.result_id; }); })}>
      {r.kind === 'video' ? <video src={img(r)} muted preload="metadata" /> : <img src={img(r)} alt="" loading="lazy" />}{r.picked && <i>✓</i>}
    </button>))}</div>;
}

function EpisodeHead({ p, icon }: { p: DirectorProject; icon: keyof typeof ICONS }) {
  const T = useT(); const e = episodeByNo(p, p.workflow.episode_no); const shots = e ? shotsOfEpisode(p, e.episode_id) : [];
  const total = Math.round(shots.reduce((a, s) => a + s.duration_sec, 0) * 10) / 10;
  return (
    <>
      <header className="dx-hero small"><div className="dx-tags"><span>{p.series.total_episodes > 1 ? `${T('Episode')} ${p.workflow.episode_no} / ${p.series.total_episodes}` : T(vocabOf(p.series.format).episode)}</span><span>{shots.length} {T('clips')}</span><span>{total}s / {p.series.episode_seconds}s</span>{e && <span>{T(EPISODE_STATE_TEXT[episodeState(e)])}</span>}</div>
        <h2><Ico n={icon} />{e?.title.replace(/^\d+화:\s*/, '') || `${T('Episode')} ${p.workflow.episode_no}`}</h2>{e?.logline && <p>{e.logline}</p>}</header>
      {shots.length > 0 && <div className="dx-bar line">{shots.map((s, i) => <i key={s.shot_id} className={`s-${s.status}`} style={{ flex: s.duration_sec }} title={`#${i + 1} ${s.duration_sec}s`}><em>{i + 1}</em></i>)}</div>}
    </>
  );
}
function EpisodeCard({ p }: { p: DirectorProject }) {
  const e = episodeByNo(p, p.workflow.episode_no);
  const writing = e?.stage === 'episode' && e.stage_status === 'working';   // while the crew writes, nothing old is shown
  const scenes = e && !writing ? p.scenes.filter((s) => s.episode_id === e.episode_id).sort((a, b) => a.order - b.order) : [];
  let n = 0;
  return (
    <div className="dx-page"><Working p={p} />{writing ? <header className="dx-hero small"><h2>{e?.title.replace(/^\d+화:\s*/, '')}</h2>{e?.logline && <p>{e.logline}</p>}</header> : <EpisodeHead p={p} icon="film" />}
      {scenes.map((sc) => (
        <section key={sc.scene_id} className="dx-group"><h4><span className="sceneno">{sc.order}</span>{sc.title} <small>{sc.summary}</small></h4>
          <div className="dx-clips">{p.shots.filter((s) => s.scene_id === sc.scene_id).sort((a, b) => a.order - b.order).map((s) => <ClipCard key={s.shot_id} s={s} n={++n} />)}</div>
        </section>))}
    </div>
  );
}

// ---- canvas
function CanvasCard({ p }: { p: DirectorProject }) {
  const T = useT(); const link = linkOfEpisode(p, p.workflow.episode_no); const e = episodeByNo(p, p.workflow.episode_no);
  const shots = e ? shotsOfEpisode(p, e.episode_id) : [];
  return (
    <div className="dx-page"><Working p={p} /><EpisodeHead p={p} icon="clip" />
      {link ? (
        <section className="dx-block"><h4><Ico n="film" />{T('The episode is set up as a canvas')}</h4>
          <p className="dx-prose"><b>{link.canvas_file}</b></p>
          <div className="dx-tiles two"><Tile icon="clip" value={String(shots.length)} label={T('Clips')} tone="b" /><Tile icon="bolt" value={PRESET_LABEL[p.series.preset]} label={`${T('with the shared 7+1 card')} · ${p.series.resolution}`} tone="a" /></div>
          <div className="dx-btns"><button className="btn primary" onClick={() => void openLinkedCanvas(link.canvas_file).catch((er) => notify((er as Error).message))}>{T('Open in Canvas')}</button></div>
        </section>) : <p className="dirx-muted">{T('The canvas is being built…')}</p>}
      {link && <VersionsBlock p={p} />}
    </div>
  );
}

/** the same piece in other screen ratios (an ad in 16:9 + 9:16 + 1:1): one extra canvas per ratio */
function VersionsBlock({ p }: { p: DirectorProject }) {
  const T = useT(); const edit = useDirector((x) => x.edit); const [busy, setBusy] = useState(false);
  const picked = p.series.versions ?? [];
  const links = versionLinks(p);
  const toggle = (a: string) => edit((x) => { const v = new Set(x.series.versions ?? []); if (v.has(a)) v.delete(a); else v.add(a); x.series.versions = [...v]; });
  const make = async () => { setBusy(true); try { const r = await makeVersionCanvases(); await notify(`${T('Canvases made')}: ${r.files.join(', ')}`); } catch (er) { await notify((er as Error).message); } finally { setBusy(false); } };
  return (
    <section className="dx-block"><h4><Ico n="image" />{T('Other screen ratios')}</h4>
      <p className="dirx-muted">{T('Make the same piece in more ratios (for example an ad as 16:9, 9:16 and 1:1). Each ratio gets its own canvas with the same prompts, cast images and seeds; you generate them in the Canvas.')}</p>
      <div className="dx-btns">{ASPECTS.filter((a) => a !== p.series.aspect).map((a) => <label key={a} className="dx-check"><input type="checkbox" checked={picked.includes(a)} onChange={() => toggle(a)} />{a}</label>)}
        <button className="btn" disabled={busy || !extraAspects(p).length} onClick={() => void make()}>{T('Make the canvases for the other ratios')}</button></div>
      {links.length > 0 && <div className="dx-btns">{links.map((l) => <button key={l.canvas_id} className="btn" onClick={() => void openLinkedCanvas(l.canvas_file).catch((er) => notify((er as Error).message))}>{l.aspect} · {T('Open in Canvas')}</button>)}</div>}
    </section>
  );
}

// ---- generate / review: first decide automatic or manual; then a scope (this episode / ticked episodes / every episode at this step); clips can be ticked
const BATCH_STATE_TEXT: Record<string, string> = { waiting: 'waiting', running: 'generating', done: 'done', failed: 'failed', cancelled: 'cancelled', skipped: 'skipped' };

/** the finished episode: the clips joined in order, and for a music video the song laid on top */
function FinalBlock({ p, ro, shots }: { p: DirectorProject; ro: boolean; shots: DirectorShot[] }) {
  const T = useT(); const [busy, setBusy] = useState(false);
  const e = episodeByNo(p, p.workflow.episode_no);
  if (!e || !shots.length) return null;
  const inc = shots.filter((s) => !s.excluded);
  const ready = inc.length > 0 && inc.every((s) => { const pk = s.results.find((r) => r.picked); return !!pk && s.passed === pk.result_id; });
  const mv = p.series.format === 'musicvideo';
  const link = linkOfEpisode(p, e.no);
  const guard = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } catch (er) { await notify((er as Error).message); } finally { setBusy(false); } };
  return (
    <section className="dx-block"><h4><Ico n="film" />{T(mv ? 'Finished video (clips joined + the song)' : 'Finished video (clips joined)')}</h4>
      {e.final && <div className="dx-preview">{e.final.kind === 'video' ? <video src={resultUrl(e.final)} controls preload="metadata" /> : <img src={resultUrl(e.final)} alt="" />}</div>}
      <div className="dx-btns">
        <button className="btn primary" disabled={ro || busy || !ready} onClick={() => void guard(async () => { const r = await finishEpisode(e.no); if (!r.made && !r.cancelled) await notify(T('No finished video came back.')); })}>{e.final ? T('Join the clips again') : T(mv ? 'Join the clips and add the song' : 'Join the clips')}</button>
        <button className="btn" disabled={ro || busy || !link} onClick={() => void guard(async () => { const n = await syncFinalFromCanvas(e.no); await notify(n ? `${T('Results added')}: ${n}` : T('No new results.')); })}>{T('Sync results')}</button>
      </div>
      {!ready && <p className="dirx-muted">{T('Every clip that stays in the video must be passed first.')}</p>}
      {inc.length < shots.length && <p className="dirx-muted">{shots.length - inc.length} {T('clips are left out of the joined video.')}</p>}
      {mv && !pickedAudio(p.music) && <p className="dirx-muted">{T('There is no song yet: the clips are joined without it.')}</p>}
    </section>
  );
}

function GenerateCard({ p, ro, review }: { p: DirectorProject; ro: boolean; review: boolean }) {
  const T = useT(); const d = useDirector(); const edit = d.edit;
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState<'one' | 'ticked' | 'all'>('one');
  const [onFail, setOnFail] = useState<'stop' | 'skip'>('stop');
  const [newSeeds, setNewSeeds] = useState(true);
  const mode = p.settings.generation;
  const no = p.workflow.episode_no;
  const link = linkOfEpisode(p, no);
  const e = episodeByNo(p, no); const shots = e ? shotsOfEpisode(p, e.episode_id) : [];
  const have = shots.filter((s) => s.results.some((r) => r.picked)).length;
  const refsUsed = [...new Set(shots.flatMap((s) => [...s.cast, ...(s.location ? [s.location] : [])]))];
  const nosOf = (): number[] => (scope === 'one' ? [no] : scope === 'ticked' ? (d.selEpisodes.length ? d.selEpisodes : [no]) : p.episodes.filter((x) => x.stage === 'execute').map((x) => x.no));
  const approvedCount = nosOf().reduce((a, n) => { const ee = episodeByNo(p, n); return a + (ee ? shotsOfEpisode(p, ee.episode_id).filter((s) => s.status === 'approved').length : 0); }, 0);
  const choose = (g: 'auto' | 'manual') => edit((x) => { x.settings.generation = g; x.settings.execution_mode = g === 'auto' ? 'hybrid' : 'manual'; });
  const guard = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } catch (er) { await notify((er as Error).message); } finally { setBusy(false); } };
  const report = async (r: Awaited<ReturnType<typeof generateBatch>>) => { if (r.cancelled && !r.items.length) return; const bad = r.items.filter((i) => i.state === 'failed'); if (bad.length) await notify(`${T('A shot failed. The rest were not started.')}\n${bad.map((i) => `${i.no}: ${i.note ?? ''}`).join('\n')}`); };
  const run = (opt: { nos: number[]; clipIds?: string[]; newSeeds?: boolean }) => guard(async () => { await report(await generateBatch({ ...opt, onFail })); });
  const sync = () => guard(async () => { let n = 0; for (const x of nosOf()) n += await syncResultsFromCanvas(x); await notify(n ? `${T('Results added')}: ${n}` : T('No new results.')); });
  const zip = () => guard(async () => { const rs = await downloadEpisodePackages(nosOf()); await notify(rs.map((r) => `${r.zipName} — ${r.included.length} ${T('files')}${r.missing.length ? ` (${T('Not included')}: ${r.missing.map((m) => m.name).join(', ')})` : ''}`).join('\n')); });
  const ticked = shots.filter((s) => d.selClips.includes(s.shot_id)).map((s) => s.shot_id);
  return (
    <div className="dx-page"><Working p={p} /><EpisodeHead p={p} icon={review ? 'check' : 'play'} />
      <CastStrip p={p} names={refsUsed} />
      <Meter done={have} total={shots.length} label={`${have} / ${shots.length} ${T('clips generated')}`} />
      {!review && !mode && (
        <section className="dx-choose"><h3>{T('How do you want to make this episode?')}</h3>
          <div className="dx-choose-grid">
            <button disabled={ro} onClick={() => choose('auto')}><Ico n="bolt" /><b>{T('Automatic')}</b><span>{T('The crew connects the cast images, generates every approved clip one after another, and shows the results here.')}</span></button>
            <button disabled={ro} onClick={() => choose('manual')}><Ico n="film" /><b>{T('Manual')}</b><span>{T('You decide: open the episode in the Canvas, or take it as a file (ZIP) and make it yourself.')}</span></button>
          </div></section>)}
      {mode && (
        <section className="dx-block"><h4><Ico n={mode === 'auto' ? 'bolt' : 'film'} />{T(mode === 'auto' ? 'Automatic' : 'Manual')} <button className="linkbtn" disabled={ro} onClick={() => choose(mode === 'auto' ? 'manual' : 'auto')}>{T(mode === 'auto' ? 'Switch to manual' : 'Switch to automatic')}</button></h4>
          {!review && (
            <div className="dx-scope"><span>{T('Which episodes')}</span>
              {(['one', 'ticked', 'all'] as const).map((k) => <label key={k}><input type="radio" name="scope" checked={scope === k} onChange={() => setScope(k)} />{T(k === 'one' ? 'This episode' : k === 'ticked' ? 'Ticked episodes' : 'Every episode at this step')}{k === 'ticked' ? ` (${d.selEpisodes.length})` : k === 'all' ? ` (${p.episodes.filter((x) => x.stage === 'execute').length})` : ''}</label>)}
              <select value={onFail} onChange={(ev) => setOnFail(ev.target.value as 'stop' | 'skip')} title={T('If an episode fails')}><option value="stop">{T('Stop at the first failure')}</option><option value="skip">{T('Skip the failed episode and go on')}</option></select>
            </div>)}
          {mode === 'auto' && <>
            <p className="dx-prose">{T('Before it starts you will be asked once. Generating uses the GPU and takes time.')}</p>
            <div className="dx-btns">
              {!review && <button className="btn primary big" disabled={busy || ro || !approvedCount} onClick={() => void run({ nos: nosOf() })}>▶ {T('Start generating')} ({approvedCount})</button>}
              <button className="btn" disabled={busy || ro || !ticked.length} onClick={() => void run({ nos: [no], clipIds: ticked, newSeeds })}>▶ {T('Generate the ticked clips')} ({ticked.length})</button>
              <label className="dx-check"><input type="checkbox" checked={newSeeds} onChange={(ev) => setNewSeeds(ev.target.checked)} />{T('with new seeds')}</label>
              <button className="btn" disabled={ro || !link} onClick={() => void sync()}>{T('Sync results')}</button>
            </div></>}
          {mode === 'manual' && (
            <div className="dx-btns">
              <button className="btn primary" disabled={!link} onClick={() => void openLinkedCanvas(link!.canvas_file).catch((er) => notify((er as Error).message))}>{T('Open in Canvas')}</button>
              <button className="btn" disabled={busy} onClick={() => void zip()}>{T('Take it as a file (ZIP)')}</button>
              <button className="btn" disabled={ro || !link} onClick={() => void sync()}>{T('Sync results')}</button>
            </div>)}
          <div className="dx-btns small"><button className="linkbtn" disabled={ro} onClick={() => edit((x) => { for (const q of x.shots) { if (!shots.some((s) => s.shot_id === q.shot_id)) continue; const pk = q.results.find((r) => r.picked); if (pk) q.passed = pk.result_id; } })}>{T('Pass all clips that have a result')}</button><button className="linkbtn" onClick={() => d.setSelClips(shots.map((s) => s.shot_id))}>{T('Tick all clips')}</button><button className="linkbtn" onClick={() => d.setSelClips(shots.filter((s) => !s.results.some((r) => r.picked)).map((s) => s.shot_id))}>{T('Clips without a result')}</button><button className="linkbtn" onClick={() => d.setSelClips([])}>{T('None')}</button></div>
        </section>)}
      {d.batch && (
        <section className="dx-block"><h4><Ico n="list" />{T('Batch')} {d.batch.running ? <span className="dirx-spin" /> : <button className="linkbtn" onClick={() => d.setBatch(null)}>{T('Close')}</button>}</h4>
          <div className="dx-batch">{d.batch.items.map((i) => <div key={i.no} className={`dx-batch-row s-${i.state}`}><b>{i.no}</b><span>{i.clips ? `${i.clips} ${T('clips')}` : ''}</span><em>{T(BATCH_STATE_TEXT[i.state])}</em>{i.note && <small>{i.note}</small>}</div>)}</div></section>)}
      <p className="dirx-muted">{T('Make each clip, look at it and pass it (or make it again). Clips you do not want can be left out. Then join the passed clips; the joined video is checked in the next step.')}</p>
      <FinalBlock p={p} ro={ro} shots={shots} />
      <div className="dx-clips">{shots.map((s, i) => <ClipCard key={s.shot_id} s={s} n={i + 1} big gen ro={ro} sel={d.selClips.includes(s.shot_id)} onSel={() => d.toggleClip(s.shot_id)}
        onAgain={mode === 'auto' && !busy && link ? () => void run({ nos: [no], clipIds: [s.shot_id], newSeeds: true }) : undefined} />)}</div>
    </div>
  );
}

/** the last step of an episode: the joined video is watched and judged as a whole; changes are asked for in the chat */
function ReviewCard({ p, ro }: { p: DirectorProject; ro: boolean }) {
  const T = useT(); const d = useDirector();
  const e = episodeByNo(p, p.workflow.episode_no); const shots = e ? shotsOfEpisode(p, e.episode_id) : [];
  return (
    <div className="dx-page"><Working p={p} /><EpisodeHead p={p} icon="check" />
      <CastStrip p={p} names={[...new Set(shots.flatMap((s) => [...s.cast, ...(s.location ? [s.location] : [])]))]} />
      <FinalBlock p={p} ro={ro} shots={shots} />
      <section className="dx-block"><h4><Ico n="chat" />{T('Your verdict on the joined video')}</h4>
        <p className="dx-prose">{T('Watch the whole video. If something must change, tell the crew in the chat (for example: "make clip 3 darker", "leave out clip 5", "change the ending"): the clips that change go back to be generated again. If it is good, approve to finish this episode.')}</p>
        <div className="dx-btns">{e && <button className="btn" disabled={ro} onClick={() => d.reopen(e.no, 'execute')}>{T('Back to the clips')}</button>}</div></section>
      <section className="dx-group"><h4><Ico n="clip" />{T('Clips in this video')} <small>{shots.filter((s) => !s.excluded).length} / {shots.length}</small></h4>
        <div className="dx-clips">{shots.map((s, i) => <ClipCard key={s.shot_id} s={s} n={i + 1} />)}</div></section>
    </div>
  );
}

// ------------------------------------------------------------------ bottom: the chat
/** one short line that says which model the crew is using (shown on the button next to the chat box) */
function llmLabel(same: boolean, main: LlmSettings, own: LlmSettings, T: (k: string) => string): string {
  const l = same ? main : own;
  const b = BACKENDS.find((x) => x.id === l.backend);
  const model = l.backend === 'local' ? l.gguf_model : l.backend === 'comfy' ? l.text_encoder_name : l.backend === 'openrouter' ? l.or_model_text : l.custom_model;
  const tail = (model || '').split(/[\\/]/).pop() || T('no model chosen');
  return `${same ? `${T('Main LLM')} · ` : ''}${b ? T(b.label) : l.backend} · ${tail.length > 28 ? `${tail.slice(0, 27)}…` : tail}`;
}

/** the Director's own model settings (the same four backends as everywhere else), opened right from the chat box */
function ModelDialog({ onClose }: { onClose: () => void }) {
  const T = useT();
  const [demoOn, setDemoOn] = useState(useDirector.getState().demo);
  return (
    <div className="dx-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dx-modal-box wide">
        <header><b>{T('Model settings')}</b><span className="dirx-muted">{T('Used by the Director crew only')}</span><button className="dir-x" onClick={onClose}>✕</button></header>
        <label className="dx-check demo-switch"><input type="checkbox" checked={demoOn} onChange={(e) => { useDirector.getState().setDemo(e.target.checked); setDemoOn(e.target.checked); }} />{T('Demo: go through every step without an LLM or a GPU (stand-in pictures)')}</label>
        <div className="dx-modal-scroll settings"><Llm target="director" /></div>
      </div>
    </div>
  );
}

function ChatDock({ p, T }: { p: DirectorProject | null; T: (k: string) => string }) {
  const d = useDirector();
  const [text, setText] = useState('');
  const [showModel, setShowModel] = useState(false);
  const dirSet = useSettings((x) => x.director); const mainLlm = useSettings((x) => x.llm);
  const end = useRef<HTMLDivElement>(null);
  const view = d.view;
  const isEp = (EPISODE_STAGES as StageId[]).includes(view);
  const ep = p ? episodeByNo(p, d.focus) : undefined;
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [p?.chat.length, d.busy]);
  // is the line waiting on the step that is being looked at?
  const frontier = !!p && p.workflow.stage !== 'intake' && (isEp ? !!ep && ep.stage === view : p.workflow.stage === view);
  const status = !p ? 'idle' : isEp ? (frontier ? ep!.stage_status : 'idle') : (frontier ? p.workflow.status[view] : 'idle');
  const blocked = p && frontier && status === 'review_required' ? (isEp ? episodeBlockers(p, d.focus, view) : blockers(p, view)) : [];
  const canApprove = frontier && status === 'review_required' && !d.busy && !d.readOnly && blocked.length === 0;
  const behind = !!p && isEp && !!ep && ep.stage !== 'idle' && epStageIndex(view as 'episode') < epStageIndex(ep.stage);
  const looking = !!p && p.workflow.stage !== 'intake' && !frontier;
  const send = () => { const t = text.trim(); if (!t) return; setText(''); void d.send(t); };
  return (
    <div className="dirx-dock">
      <div className="dirx-log">
        {(p?.chat ?? []).slice(-40).map((m) => (
          <div key={m.id} className={`dirx-msg ${m.role}${m.error ? ' err' : ''}`}>
            {m.role === 'assistant' && <span className="dirx-who">{T(CREW_LABEL[m.crew ?? 'producer_desk'])}</span>}
            <div>{m.text}</div>{m.notes?.map((n, i) => <small key={i}>• {n}</small>)}
          </div>))}
        {d.busy && <div className="dirx-msg assistant"><span className="dirx-spin" /> {T('The crew is working…')}</div>}
        <div ref={end} />
      </div>
      {p && p.workflow.stage !== 'intake' && (
        <div className="dirx-approve">
          <button className="btn primary big" disabled={!canApprove} onClick={() => void d.approve()}>✓ {T('Approve')}{NEXT_LABEL[view] ? ` → ${T(view === 'brief' ? vocabOf(p?.series.format).cast : view === 'references' ? (p && hasMusicStep(p) ? 'Song' : vocabOf(p?.series.format).scenario) : view === 'music' ? vocabOf(p?.series.format).scenario : view === 'series' ? vocabOf(p?.series.format).episode : NEXT_LABEL[view]!)}` : ''}</button>
          {status === 'failed' && <button className="btn" disabled={d.busy} onClick={() => void d.retry()}>{T('Try again')}</button>}
          {behind && <button className="btn" disabled={d.busy || d.readOnly} onClick={() => d.reopen(d.focus, view)}>{T('Go back to this step')}</button>}
          <span className="dirx-hint">{looking ? T('You are looking at a step that is not the current one. Tell the crew below what to change, or go back to it.') : status === 'review_required' ? (blocked[0] ? `${T('Not yet')}: ${localizeMsg(blocked[0])}` : T('To change something, tell the crew below.')) : T(STATUS_TEXT[status] ?? status)}</span>
        </div>)}
      <div className="dirx-input">
        <textarea rows={4} value={text} disabled={d.readOnly} placeholder={p ? T('Tell the crew what to do, or what to change…') : T('Say what you want to make…')}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
        <div className="dirx-input-bar">
          <button className="dirx-model" title={T('Model settings')} onClick={() => setShowModel(true)}>⚙ <span>{llmLabel(dirSet.same, mainLlm, dirSet.llm, T)}</span></button>
          <span className="dirx-hint">{T('Enter to send, Shift+Enter for a new line')}</span><button className="btn primary" disabled={d.busy || !text.trim() || d.readOnly} onClick={send}>{T('Send')}</button></div>
      </div>
      {showModel && <ModelDialog onClose={() => setShowModel(false)} />}
    </div>
  );
}
