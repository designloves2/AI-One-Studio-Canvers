import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { useGraph } from '../store/graph';
import { useDirector } from '../store/director';
import { clearPart, canvasesOf, deleteProject, duplicateProject, exportProject, importProject, newProjectFlow, openProject, renameProject, saveAll, sendPart, useWorkspace, type Part } from '../store/workspace';
import { askConfirm, notify } from '../ui/dialog';
import { openSavedCanvas } from '../engine/actions';
import { loadManifest, type ProjectManifest } from '../backend/projects';
import { listDirectorProjects, type DirectorEntry } from '../backend/director';

const fmt = (ms: number) => new Date(ms).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const MODE_ICON: Record<string, string> = { director: '🎬', canvas: '▦', simple: '✦' };

/** The project menu: everything about the open project and the other saved projects in one place. */
export function ProjectsPanel() {
  const T = useT();
  const m = useWorkspace((s) => s.manifest);
  const list = useWorkspace((s) => s.list);
  const busy = useWorkspace((s) => s.busy);
  const dir = useDirector((s) => s.project);
  const dirDirty = useDirector((s) => s.dirty);
  const runs = useGraph((s) => s.composerRuns);
  const canvasFile = useGraph((s) => s.canvasFile);
  const gDirty = useGraph((s) => s.dirty);
  const [target, setTarget] = useState('');
  const [move, setMove] = useState(false);
  // the project list is an accordion: a project opens to show what is in it; it is loaded only by its Load button
  const [open, setOpen] = useState<string | null>(null);
  const [info, setInfo] = useState<{ m: ProjectManifest; dir?: DirectorEntry } | null>(null);
  const peek = async (name: string) => {
    if (open === name) { setOpen(null); setInfo(null); return; }
    setOpen(name); setInfo(null);
    try { const m = await loadManifest(name); const dir = m.director ? (await listDirectorProjects().catch(() => [])).find((d) => d.name === m.director) : undefined; setInfo({ m, dir }); } catch { /* shown as empty */ }
  };
  useEffect(() => { void useWorkspace.getState().refreshList(); }, []);
  const others = list.filter((p) => p.name !== m?.name);
  const to = others.some((p) => p.name === target) ? target : (others[0]?.name ?? '');
  const guard = (f: () => Promise<unknown>) => () => { f().catch((e) => void notify((e as Error).message)); };
  const goMode = (mode: 'director' | 'canvas' | 'simple') => useGraph.getState().setMode(mode);
  const canvases = m ? canvasesOf(m, dir) : [];
  const unsaved = dirDirty || gDirty;

  const nodeCount = useGraph((x) => x.nodes.length);
  const openCanvas = async (f?: string) => { if (f && useGraph.getState().canvasFile !== f) await openSavedCanvas(f); goMode('canvas'); };
  const send = (part: Part, file?: string) => guard(() => sendPart(part, to, move, file));

  const Send = ({ part, file }: { part: Part; file?: string }) => (to ? <button className="mini-link" disabled={busy} title={`${move ? T('Move') : T('Copy')} → ${to}`} onClick={send(part, file)}>{move ? '⇥' : '⧉'} {T('Send')}</button> : null);

  return (
    <div className="panel-body prj">
      <div className="panel-row">
        <button className="btn primary" disabled={busy} onClick={guard(newProjectFlow)}>＋ {T('New project')}</button>
        <button className="btn" onClick={importProject}>{T('Import')}</button>
      </div>

      {m ? (
        <section className="prj-card">
          <div className="prj-title">
            <b title={m.name}>{m.name}</b>
            <button className="mini-link" title={T('Rename')} onClick={guard(renameProject)}>✎</button>
            <span className={`save-state ${unsaved ? 'dirty' : 'clean'}`}>{unsaved ? `● ${T('Not saved')}` : `✓ ${T('Saved')}`}</span>
          </div>
          <div className="panel-row">
            <button className="btn primary" disabled={busy} onClick={guard(saveAll)}>{T('Save')}</button>
            <button className="btn" disabled={busy} onClick={guard(duplicateProject)}>{T('Make a copy')}</button>
            <button className="btn" disabled={busy} onClick={guard(() => exportProject())}>{T('Export')}</button>
            <button className="btn" disabled={busy} onClick={guard(() => deleteProject(m.name))}>{T('Delete')}</button>
          </div>

          {others.length > 0 && (
            <div className="prj-send">
              <span>{T('Send to')}</span>
              <select value={to} onChange={(e) => setTarget(e.target.value)}>{others.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}</select>
              <button className={`chip${move ? '' : ' on'}`} onClick={() => setMove(false)}>{T('Copy')}</button>
              <button className={`chip${move ? ' on' : ''}`} onClick={() => setMove(true)}>{T('Move')}</button>
            </div>
          )}

          <div className="prj-part">
            <header><b>🎬 {T('Director')}</b><span className="muted">{dir ? `${dir.shots.length} ${T('clips')}` : T('Empty')}</span></header>
            {dir && <div className="prj-sub" title={dir.name}>{dir.name}</div>}
            <div className="prj-acts">
              <button className="mini-link" onClick={() => goMode('director')}>{T('Open')}</button>
              {dir && <Send part="director" />}
              {dir && <button className="mini-link" disabled={busy} onClick={guard(() => clearPart('director'))}>{T('Clear')}</button>}
            </div>
          </div>

          <div className="prj-part">
            <header><b>▦ {T('Canvas')}</b><span className="muted">{canvases.length ? `${nodeCount} ${T('cards')}` : T('Empty')}</span></header>
            <div className="prj-acts">
              <button className="mini-link" onClick={guard(() => openCanvas(canvases[0]))}>{T('Open')}</button>
              {canvases.length > 0 && <Send part="canvas" file={canvases[0]} />}
              {canvases.length > 0 && <button className="mini-link" disabled={busy} onClick={guard(() => clearPart('canvas'))}>{T('Clear')}</button>}
            </div>
          </div>

          <div className="prj-part">
            <header><b>✦ {T('Simple')}</b><span className="muted">{runs.length ? `${runs.length} ${T('results')}` : T('Empty')}</span></header>
            <div className="prj-acts">
              <button className="mini-link" onClick={() => goMode('simple')}>{T('Open')}</button>
              {runs.length > 0 && <Send part="simple" />}
              {runs.length > 0 && <button className="mini-link" disabled={busy} onClick={guard(() => clearPart('simple'))}>{T('Clear')}</button>}
            </div>
          </div>
        </section>
      ) : (
        <p className="muted">{T('There is no open project yet. It is made automatically when you create something, or press New project.')}</p>
      )}

      <h4>{T('Projects')} · {list.length}</h4>
      <div className="cv-list">
        {list.map((p) => {
          const isOpen = open === p.name; const here = p.name === m?.name;
          return (
            <div key={p.name} className={`prj-item${isOpen ? ' open' : ''}${here ? ' current' : ''}`}>
              <button className="prj-head" aria-expanded={isOpen} onClick={() => void peek(p.name)}>
                <span className="prj-hname" title={p.name}>{p.name}</span>
                <span className="muted">{MODE_ICON[p.mode] ?? ''} {fmt(p.mtime)}</span>
                <i aria-hidden>{isOpen ? '▾' : '▸'}</i>
              </button>
              {isOpen && (
                <div className="prj-body">
                  {!info ? <p className="muted">…</p> : <>
                    <div className="prj-line"><b>🎬 {T('Director')}</b><span>{info.m.director ? `${info.dir ? `${info.dir.shots} ${T('clips')}` : ''}${info.dir ? ' · ' : ''}${info.m.director}` : T('Empty')}</span></div>
                    <div className="prj-line"><b>▦ {T('Canvas')}</b><span>{info.m.canvases.length ? info.m.canvases.join(' · ') : T('Empty')}</span></div>
                    <div className="prj-line"><b>✦ {T('Simple')}</b><span>{info.m.simple.length ? `${info.m.simple.length} ${T('results')}` : T('Empty')}</span></div>
                    <div className="prj-line"><b>{T('Saved')}</b><span>{fmt(p.mtime)}</span></div>
                    <div className="panel-row">
                      {here ? <span className="muted">{T('This project is open.')}</span> : <button className="btn primary" disabled={busy} onClick={guard(() => openProject(p.name))}>{T('Load')}</button>}
                      {!here && <button className="btn" disabled={busy} onClick={guard(async () => { await deleteProject(p.name); setOpen(null); setInfo(null); })}>{T('Delete')}</button>}
                    </div>
                  </>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!list.length && <p className="muted">{T('No projects yet.')}</p>}
    </div>
  );
}
