import { useEffect, useState } from 'react';
import { useDirector } from '../store/director';
import { useT } from '../i18n';
import { askConfirm, askText, notify } from '../ui/dialog';
import { newAsset, newScene, newShot, safeProjectName } from './model';
import type { AssetRole, DirectorProject, ShotStatus } from './types';
import { libThumb, listAssets, type LibAsset } from '../backend/assetlib';
import { describeReport, linkOf, makeCanvasFromDirector, openLinkedCanvas } from './canvasAction';
import type { Generator } from './adapter';

const STATUSES: ShotStatus[] = ['draft', 'ready', 'approved', 'queued', 'generating', 'review', 'done', 'failed'];
const ROLES: AssetRole[] = ['character', 'background', 'prop', 'reference', 'audio', 'other'];
const ASPECTS = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];

/** Director mode (MVP): brief → story → scene/shot board → assets. Nothing here starts a generation. */
export function DirectorView() {
  const T = useT();
  const d = useDirector();
  const p = d.project;
  useEffect(() => { void d.refreshList(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const guard = (f: () => Promise<unknown>) => () => { f().catch((e) => void notify((e as Error).message)); };
  const create = async () => {
    if (d.dirty && p && !(await askConfirm(T('This project has unsaved changes. Continue?')))) return;
    const name = await askText(T('Project name')); if (name === null) return;
    if (!safeProjectName(name)) { void notify(T('That name cannot be used as a file name.')); return; }
    d.create(name.trim());
  };
  const open = async (name: string) => {
    if (d.dirty && p && !(await askConfirm(T('This project has unsaved changes. Continue?')))) return;
    await d.open(name);
  };

  return (
    <div className="dir">
      <aside className="dir-side">
        <div className="dir-side-head"><b>{T('Director projects')}</b><button className="btn" onClick={() => void create()}>＋ {T('New')}</button></div>
        {d.list.length === 0 && <p className="dir-muted">{T('No Director projects yet.')}</p>}
        {d.list.map((e) => (
          <div key={e.name} className={`dir-proj${d.file === e.name ? ' on' : ''}`}>
            <button onClick={guard(() => open(e.name))}><b>{e.name}</b><small>{e.scenes} {T('scenes')} · {e.shots} {T('shots')}</small></button>
            <button className="dir-x" title={T('Delete')} onClick={guard(async () => { if (await askConfirm(`${e.name} — ${T('Delete')}?`)) await d.remove(e.name); })}>✕</button>
          </div>
        ))}
      </aside>
      <section className="dir-main">
        {!p ? <div className="dir-empty"><h2>{T('Director')}</h2><p>{T('Plan the film here: brief, story, scenes and shots. Nothing is generated from this screen.')}</p><button className="btn primary big" onClick={() => void create()}>＋ {T('New project')}</button></div> : (
          <>
            <div className="dir-bar">
              <input className="project-name" value={p.name} disabled={d.readOnly} onChange={(e) => d.edit((x) => { x.name = e.target.value; })} />
              {d.readOnly && <span className="chip warn">{T('Read-only (saved by a newer version)')}</span>}
              {d.dirty && <span className="chip warn">● {T('Not saved')}</span>}
              <button className="btn primary" disabled={!d.dirty || d.readOnly} onClick={guard(d.save)}>{T('Save')}</button>
            </div>
            {d.notes.length > 0 && <div className="dir-notes">{d.notes.map((n, i) => <div key={i}>⚠ {n}</div>)}</div>}
            <div className="dir-tabs">
              {(['brief', 'story', 'board', 'assets'] as const).map((k) => <button key={k} className={d.tab === k ? 'active' : ''} onClick={() => d.setTab(k)}>{T(({ brief: 'Brief', story: 'Story', board: 'Scenes & shots', assets: 'Assets' })[k])}</button>)}
            </div>
            <div className="dir-body">
              {d.tab === 'brief' && <Brief p={p} ro={d.readOnly} />}
              {d.tab === 'story' && <Story p={p} ro={d.readOnly} />}
              {d.tab === 'board' && <Board p={p} ro={d.readOnly} />}
              {d.tab === 'assets' && <Assets p={p} ro={d.readOnly} />}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="dir-row"><span>{label}</span>{children}</label>;

function Brief({ p, ro }: { p: DirectorProject; ro: boolean }) {
  const T = useT(); const edit = useDirector((s) => s.edit); const b = p.brief;
  const set = <K extends keyof typeof b>(k: K, v: (typeof b)[K]) => edit((x) => { x.brief[k] = v; });
  return (
    <div className="dir-form">
      <Row label={T('Title')}><input disabled={ro} value={b.title} onChange={(e) => set('title', e.target.value)} /></Row>
      <Row label={T('Purpose')}><textarea disabled={ro} rows={3} value={b.purpose} onChange={(e) => set('purpose', e.target.value)} /></Row>
      <Row label={T('Audience')}><input disabled={ro} value={b.audience} onChange={(e) => set('audience', e.target.value)} /></Row>
      <Row label={T('Length (s)')}><input type="number" min={1} disabled={ro} value={b.duration_sec} onChange={(e) => set('duration_sec', Math.max(1, Number(e.target.value) || 1))} /></Row>
      <Row label={T('Aspect ratio')}><select disabled={ro} value={b.aspect} onChange={(e) => set('aspect', e.target.value)}>{ASPECTS.map((a) => <option key={a}>{a}</option>)}</select></Row>
      <Row label={T('Tone')}><input disabled={ro} value={b.tone} onChange={(e) => set('tone', e.target.value)} /></Row>
      <Row label={T('Notes')}><textarea disabled={ro} rows={4} value={b.notes} onChange={(e) => set('notes', e.target.value)} /></Row>
      <label className="dir-check"><input type="checkbox" disabled={ro} checked={b.status === 'approved'} onChange={(e) => set('status', e.target.checked ? 'approved' : 'draft')} /> {T('Brief approved')}</label>
    </div>
  );
}

function Story({ p, ro }: { p: DirectorProject; ro: boolean }) {
  const T = useT(); const edit = useDirector((s) => s.edit); const s = p.story;
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => edit((x) => { x.story[k] = v; });
  const approve = async () => {
    if (s.approved_text.trim() && s.approved_text !== s.draft_text && !(await askConfirm(T('Replace the approved story with this draft?')))) return;
    edit((x) => { x.story.approved_text = x.story.draft_text; x.story.status = 'approved'; });
  };
  return (
    <div className="dir-form">
      <Row label={T('Logline')}><input disabled={ro} value={s.logline} onChange={(e) => set('logline', e.target.value)} /></Row>
      <Row label={T('Synopsis')}><textarea disabled={ro} rows={3} value={s.synopsis} onChange={(e) => set('synopsis', e.target.value)} /></Row>
      <div className="dir-two">
        <Row label={T('Draft')}><textarea disabled={ro} rows={14} value={s.draft_text} onChange={(e) => set('draft_text', e.target.value)} /></Row>
        <Row label={`${T('Approved')} ${s.status === 'approved' ? '✓' : ''}`}><textarea readOnly rows={14} value={s.approved_text} placeholder={T('Nothing approved yet. Approving copies the draft here; a new draft never overwrites it.')} /></Row>
      </div>
      <div><button className="btn" disabled={ro || !s.draft_text.trim()} onClick={() => void approve()}>{T('Approve draft')}</button></div>
    </div>
  );
}

function CanvasBar({ p, ro }: { p: DirectorProject; ro: boolean }) {
  const T = useT();
  const [gen, setGen] = useState<Generator>('image-generate');
  const [busy, setBusy] = useState(false);
  const link = linkOf(p.canvas_links);
  const make = async () => {
    setBusy(true);
    try {
      const r = await makeCanvasFromDirector(gen);
      if (r) await notify(`${r.file}

${describeReport(r.report)}${ro ? '' : `

${T('Save the project to keep the link to this canvas.')}`}`);
    } catch (e) { await notify((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="dir-canvasbar">
      <select value={gen} onChange={(e) => setGen(e.target.value as Generator)} title={T('Card made for each shot')}>
        <option value="image-generate">{T('Image Generate')}</option><option value="video-generate">{T('Video Generate')}</option>
      </select>
      <button className="btn" disabled={busy || p.shots.length === 0} onClick={() => void make()}>{link ? T('Update Canvers canvas') : T('Make Canvers canvas')}</button>
      {link && <button className="btn" onClick={() => void openLinkedCanvas(link.canvas_file).catch((e) => notify((e as Error).message))}>{T('Open in Canvas')}</button>}
      {link && <span className="dir-muted">{link.canvas_file}</span>}
    </div>
  );
}

function Board({ p, ro }: { p: DirectorProject; ro: boolean }) {
  const T = useT(); const edit = useDirector((s) => s.edit);
  const shotsOf = (sc: string) => p.shots.filter((s) => s.scene_id === sc).sort((a, b) => a.order - b.order);
  const renumber = (x: DirectorProject, sceneId: string) => {
    const sc = x.scenes.find((s) => s.scene_id === sceneId); if (!sc) return;
    const ordered = x.shots.filter((s) => s.scene_id === sceneId).sort((a, b) => a.order - b.order);
    ordered.forEach((s, i) => { s.order = i + 1; }); sc.shot_ids = ordered.map((s) => s.shot_id);
  };
  return (
    <div className="dir-board">
      <CanvasBar p={p} ro={ro} />
      {[...p.scenes].sort((a, b) => a.order - b.order).map((sc) => (
        <div key={sc.scene_id} className="dir-scene">
          <div className="dir-scene-head">
            <span className="chip">{sc.order}</span>
            <input disabled={ro} value={sc.title} placeholder={T('Scene title')} onChange={(e) => edit((x) => { x.scenes.find((s) => s.scene_id === sc.scene_id)!.title = e.target.value; })} />
            <button className="btn" disabled={ro} onClick={() => edit((x) => { newShot(x, sc.scene_id); })}>＋ {T('Shot')}</button>
            <button className="dir-x" disabled={ro} title={T('Delete')} onClick={async () => {
              if (!(await askConfirm(`${sc.title || T('Scene')} — ${T('Delete')}? (${shotsOf(sc.scene_id).length} ${T('shots')})`))) return;
              edit((x) => { x.shots = x.shots.filter((s) => s.scene_id !== sc.scene_id); x.scenes = x.scenes.filter((s) => s.scene_id !== sc.scene_id); x.scenes.forEach((s, i) => { s.order = i + 1; }); });
            }}>✕</button>
          </div>
          <textarea className="dir-sum" disabled={ro} rows={2} value={sc.summary} placeholder={T('Scene summary')} onChange={(e) => edit((x) => { x.scenes.find((s) => s.scene_id === sc.scene_id)!.summary = e.target.value; })} />
          {shotsOf(sc.scene_id).map((sh) => (
            <div key={sh.shot_id} className={`dir-shot st-${sh.status}`}>
              <div className="dir-shot-head">
                <span className="chip">{sc.order}.{sh.order}</span>
                <select disabled={ro} value={sh.status} onChange={(e) => edit((x) => { x.shots.find((s) => s.shot_id === sh.shot_id)!.status = e.target.value as ShotStatus; })}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                <input type="number" min={0.5} step={0.5} disabled={ro} title={T('Length (s)')} value={sh.duration_sec} onChange={(e) => edit((x) => { x.shots.find((s) => s.shot_id === sh.shot_id)!.duration_sec = Math.max(0.5, Number(e.target.value) || 0.5); })} />
                <button className="dir-x" disabled={ro} title={T('Delete')} onClick={() => edit((x) => { x.shots = x.shots.filter((s) => s.shot_id !== sh.shot_id); renumber(x, sc.scene_id); })}>✕</button>
              </div>
              <textarea disabled={ro} rows={2} placeholder="Prompt (English — this is what the model gets)" value={sh.prompt_en} onChange={(e) => edit((x) => { x.shots.find((s) => s.shot_id === sh.shot_id)!.prompt_en = e.target.value; })} />
              <textarea disabled={ro} rows={2} placeholder={T('프롬프트 (한국어 보기용)')} value={sh.prompt_ko} onChange={(e) => edit((x) => { x.shots.find((s) => s.shot_id === sh.shot_id)!.prompt_ko = e.target.value; })} />
              <input disabled={ro} placeholder={T('Camera')} value={sh.camera} onChange={(e) => edit((x) => { x.shots.find((s) => s.shot_id === sh.shot_id)!.camera = e.target.value; })} />
              {p.assets.length > 0 && (
                <div className="dir-chips">{p.assets.map((a) => {
                  const on = sh.asset_ids.includes(a.asset_id);
                  return <button key={a.asset_id} disabled={ro} className={`chip${on ? ' on' : ''}`} onClick={() => edit((x) => { const s = x.shots.find((q) => q.shot_id === sh.shot_id)!; s.asset_ids = on ? s.asset_ids.filter((i) => i !== a.asset_id) : [...s.asset_ids, a.asset_id]; })}>{a.name}</button>;
                })}</div>
              )}
            </div>
          ))}
        </div>
      ))}
      <button className="btn" disabled={ro} onClick={() => edit((x) => { newScene(x, ''); })}>＋ {T('Scene')}</button>
    </div>
  );
}

function Assets({ p, ro }: { p: DirectorProject; ro: boolean }) {
  const T = useT(); const edit = useDirector((s) => s.edit);
  const [lib, setLib] = useState<LibAsset[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { listAssets().then(setLib, (e) => { setLib([]); setErr((e as Error).message); }); }, []);
  const used = new Set(p.assets.flatMap((a) => (a.source.kind === 'library' ? [a.source.id] : [])));
  return (
    <div className="dir-assets">
      <h4>{T('In this project')}</h4>
      {p.assets.length === 0 && <p className="dir-muted">{T('No assets yet. Add some from the Asset Library below.')}</p>}
      {p.assets.map((a) => (
        <div key={a.asset_id} className="dir-asset">
          {a.source.kind === 'library' && <img src={libThumb(a.source.id)} alt="" />}
          <input disabled={ro} value={a.name} onChange={(e) => edit((x) => { x.assets.find((q) => q.asset_id === a.asset_id)!.name = e.target.value; })} />
          <select disabled={ro} value={a.role} onChange={(e) => edit((x) => { x.assets.find((q) => q.asset_id === a.asset_id)!.role = e.target.value as AssetRole; })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
          <button className="dir-x" disabled={ro} title={T('Delete')} onClick={() => edit((x) => { x.assets = x.assets.filter((q) => q.asset_id !== a.asset_id); x.shots.forEach((s) => { s.asset_ids = s.asset_ids.filter((i) => i !== a.asset_id); }); })}>✕</button>
        </div>
      ))}
      <h4>{T('Asset Library')}</h4>
      {err && <p className="dir-muted">{T('The Asset Library is not available')}: {err}</p>}
      {lib && lib.length === 0 && !err && <p className="dir-muted">{T('The Asset Library is empty.')}</p>}
      <div className="dir-lib">
        {(lib ?? []).filter((a) => a.kind !== 'set').map((a) => (
          <button key={a.id} disabled={ro || used.has(a.id)} className="dir-libitem" title={a.name}
            onClick={() => edit((x) => { newAsset(x, { name: a.name, role: (ROLES as string[]).includes(a.category) ? (a.category as AssetRole) : a.kind === 'audio' ? 'audio' : 'reference', source: { kind: 'library', id: a.id }, note: '' }); })}>
            {a.kind === 'image' ? <img src={libThumb(a.id)} alt="" loading="lazy" /> : <span>{a.kind}</span>}<small>{used.has(a.id) ? '✓ ' : ''}{a.name}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
