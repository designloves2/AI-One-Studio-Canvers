import { useEffect, useState } from 'react';
import { askConfirm, notify } from '../ui/dialog';
import { useGraph } from '../store/graph';
import { useT } from '../i18n';
import { canvasFileName, deleteCanvas, listCanvases, loadCanvas, type CanvasEntry } from '../backend/canvases';
import { download, exportProjectFile, importProjectFile, openSavedCanvas, saveCanvasToList } from '../engine/actions';

const fmt = (ms: number) => new Date(ms).toLocaleString([], { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

/** The saved canvases (project folder): open, save, save as, export, import, delete. */
export function CanvasesPanel() {
  const T = useT();
  const name = useGraph((s) => s.projectName);
  const file = useGraph((s) => s.canvasFile);
  const dirty = useGraph((s) => s.dirty);
  const [list, setList] = useState<CanvasEntry[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => { try { setList(await listCanvases()); setErr(''); } catch (e) { setErr((e as Error).message); } };
  // a save from the top bar / Ctrl+S changes the list too
  useEffect(() => { void load(); }, [file, dirty]);

  const save = async (as = false) => { setBusy(true); try { await saveCanvasToList({ as }); } finally { setBusy(false); void load(); } };
  const remove = async (c: CanvasEntry) => {
    if (!(await askConfirm(`${T('Delete this saved canvas?')}\n${c.name}`))) return;
    try { await deleteCanvas(c.name); if (useGraph.getState().canvasFile === c.name) useGraph.setState({ canvasFile: null, dirty: true }); } catch (e) { void notify((e as Error).message); }
    void load();
  };
  const exportOne = async (c: CanvasEntry) => {
    try {
      const u = URL.createObjectURL(new Blob([JSON.stringify(await loadCanvas(c.name), null, 1)], { type: 'application/json' }));
      download(u, `${canvasFileName(c.name)}.canvers.json`); setTimeout(() => URL.revokeObjectURL(u), 2000);
    } catch (e) { void notify((e as Error).message); }
  };
  const fresh = async () => {
    const g = useGraph.getState();
    if (g.dirty && g.nodes.length && !(await askConfirm(T('This canvas has unsaved changes. Open anyway?')))) return;
    g.newProject();
  };

  return (
    <div className="panel-body">
      <div className="cv-current">
        <div className="cv-title"><b>{name}</b><span className={`save-state ${dirty ? 'dirty' : 'clean'}`}>{dirty ? `● ${T('Not saved')}` : `✓ ${T('Saved')}`}</span></div>
        <div className="panel-row">
          <button className="btn primary" onClick={() => void save(false)} disabled={busy}>{T('Save')}</button>
          <button className="btn" onClick={() => void save(true)} disabled={busy}>{T('Save as')}</button>
          <button className="btn" onClick={() => void fresh()}>{T('New canvas')}</button>
        </div>
        <div className="panel-row">
          <button className="btn" onClick={exportProjectFile}>{T('Export')}</button>
          <button className="btn" onClick={importProjectFile}>{T('Import')}</button>
        </div>
      </div>
      <h4>{T('Saved canvases')} · {list.length}</h4>
      {err && <p className="status bad">{err}</p>}
      <div className="cv-list">
        {list.map((c) => (
          <div key={c.name} className={`cv-item${c.name === file ? ' current' : ''}`} onClick={() => void openSavedCanvas(c.name)} title={c.name}>
            <div className="cv-main"><b>{c.name}{c.name === file && dirty ? ' ●' : ''}</b><span className="muted">{c.nodes} {T('nodes')} · {fmt(c.mtime)}</span></div>
            <button className="mini-link" title={T('Export this canvas')} onClick={(e) => { e.stopPropagation(); void exportOne(c); }}>⤓</button>
            <button className="mini-link" title={T('Delete')} onClick={(e) => { e.stopPropagation(); void remove(c); }}>✕</button>
          </div>
        ))}
      </div>
      {!list.length && !err && <p className="muted">{T('No saved canvases yet.')}</p>}
    </div>
  );
}
