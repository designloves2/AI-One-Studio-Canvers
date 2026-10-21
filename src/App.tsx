import { useEffect, useState } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useGraph, restoreAutosave, hasUnsavedAutosave, startAutosave, type PanelId } from './store/graph';
import { Flow } from './canvas/Flow';
import { NodeMenu } from './canvas/NodeMenu';
import { Viewer } from './canvas/Viewer';
import { Painter } from './canvas/Painter';
import { BoxEditor } from './canvas/BoxEditor';
import { MelodyEditor } from './canvas/MelodyEditor';
import { AssetPicker, FacePicker } from './canvas/Pickers';
import { NodesPanel } from './panels/NodesPanel';
import { DecksPanel } from './panels/DecksPanel';
import { AssetsPanel } from './panels/AssetsPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { StatusPanel } from './panels/StatusPanel';
import { SimpleView } from './simple/SimpleView';
import { addImports, resumeInflight, runAll, saveCanvasToList, stopAll } from './engine/actions';
import { clearInflight } from './backend/comfy';
import { loadTurboFromStudio } from './backend/turboMemory';
import { t as tr } from './i18n';
import { CanvasesPanel } from './panels/CanvasesPanel';
import { SystemMonitor } from './ui/SystemMonitor';
import { LlmNotice } from './ui/LlmNotice';
import { systemStats } from './backend/comfy';
import { loadServerSettings } from './backend/llm';
import { useT } from './i18n';
import { askConfirm, notify, DialogHost } from './ui/dialog';
import { queueCounts, restartComfy } from './backend/server';
import { RefineHost } from './ui/refine';
import { ColorPopupHost } from './ui/ColorPopup';
import { LightboxHost } from './ui/Lightbox';
import { LibraryPanel } from './panels/LibraryPanel';
import { LivePanel } from './panels/LivePanel';
import { useSettings } from './store/settings';
import { loadStudio, serializeHost, syncLinks, wireHostStore } from './host';
import { setHostSerializer } from './store/graph';

const Icon = ({ d }: { d: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const ICONS = {
  nodes: 'M4 6h6v6H4zM14 12h6v6h-6zM10 9h4v6',
  assets: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M9 9.5h.01',
  status: 'M4 13l4 4L20 6',
  live: 'M4 5h16v10H9l-5 4zM8 9h8M8 12h5',
  canvases: 'M4 4h16v16H4zM4 9h16M9 9v11',
  library: 'M5 4h4v16H5zM11 4h4v16h-4zM17.5 5l3.2 1-3.6 14-3.2-1z',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
};

function TopBar() {
  const T = useT();
  const name = useGraph((s) => s.projectName);
  const setName = useGraph((s) => s.setName);
  const dirty = useGraph((s) => s.dirty);
  const mode = useGraph((s) => s.mode);
  const setMode = useGraph((s) => s.setMode);
  const [up, setUp] = useState<boolean | null>(null);
  const [restarting, setRestarting] = useState(false);
  const restart = async () => {
    if (restarting) return;
    let q = { running: 0, pending: 0 }; try { q = await queueCounts(); } catch { /* server may be stuck: still allow a restart */ }
    const h = new Date().getHours();
    const lines = [T('Restart ComfyUI?'), '', `${T('Running / waiting jobs')}: ${q.running} / ${q.pending}${q.running + q.pending ? ' — ' + T('they will be stopped') : ''}`, T('It takes about a minute. Save unsaved ComfyUI workflows first.')];
    if (h >= 2 && h < 8) lines.push(T('Between 02:00 and 08:00 long batch jobs may be running.'));
    if (!(await askConfirm(lines.join('\n')))) return;
    setRestarting(true); setUp(false);
    try { await restartComfy(); setUp(true); } catch (e) { await notify((e as Error).message); } finally { setRestarting(false); }
  };
  useEffect(() => {
    const ping = () => systemStats().then(() => setUp(true), () => setUp(false));
    void ping(); const i = setInterval(ping, 10000); return () => clearInterval(i);
  }, []);
  return (
    <div className="topbar">
      <div className="brand"><img src="/logo.svg" alt="" /><b>AI ONE Studio</b><em>Canvers</em></div>
      <input className="project-name" value={name} onChange={(e) => setName(e.target.value)} />
      <button className={`save-state ${dirty ? 'dirty' : 'clean'}`} title={dirty ? `${T('Not saved')} — ${T('Click to save')} (Ctrl+S)` : T('Saved')} onClick={() => { if (dirty) void saveCanvasToList(); }}>{dirty ? '●' : '✓'} {dirty ? T('Not saved') : T('Saved')}</button>
      <div className="file-actions">
        <button title={`${T('New')}`} onClick={async () => { if (!useGraph.getState().nodes.length || await askConfirm(`${T('New')}?`)) useGraph.getState().newProject(); }}>＋</button>
        <button title={`${T('Canvases')} (Ctrl+O)`} onClick={() => useGraph.getState().setPanel('canvases')}>☰</button>
        <button title={`${T('Save')} (Ctrl+S)`} onClick={() => void saveCanvasToList()}>⤓</button>
      </div>
      <div className="mode-toggle">
        <button className={mode === 'canvas' ? 'active' : ''} onClick={() => setMode('canvas')}>{T('Canvas')}</button>
        <button className={mode === 'simple' ? 'active' : ''} onClick={() => setMode('simple')}>{T('Simple')}</button>
      </div>
      <div className="topbar-right"><SystemMonitor /><span className={`engine-dot ${up ? 'on' : ''}`} title="ComfyUI + STUDIO_ONE"><i />{restarting ? T('Restarting…') : 'ComfyUI'}</span><button className={`restart-btn${restarting ? ' spin' : ''}`} disabled={restarting} onClick={() => void restart()} title={T('Restart ComfyUI')}>↻</button></div>
    </div>
  );
}

function Rail() {
  const T = useT();
  const mode = useGraph((s) => s.mode);
  const panel = useGraph((s) => s.panel);
  const setPanel = useGraph((s) => s.setPanel);
  const items: [Exclude<PanelId, null>, string, string][] = [['canvases', 'Canvases', ICONS.canvases], ['live', 'Live Canvas', ICONS.live], ['decks', 'Decks', ICONS.nodes], ['nodes', 'Nodes', ICONS.nodes], ['assets', 'Gallery', ICONS.assets], ['library', 'Asset Library', ICONS.library], ['models', 'Models', ICONS.status], ['settings', 'Settings', ICONS.settings]];
  // decks / nodes only make sense on the canvas, so the simple mode hides them
  const visible = mode === 'simple' ? items.filter(([id]) => id !== 'decks' && id !== 'nodes' && id !== 'live' && id !== 'canvases') : items;
  return (
    <div className="rail">
      {visible.map(([id, label, d]) => (
        <button key={id} className={panel === id ? 'active' : ''} title={T(label)} onClick={() => setPanel(panel === id ? null : id)}><Icon d={d} /><span>{T(label).split(' ').map((w, i) => <span key={i}>{i > 0 && <br />}{w}</span>)}</span></button>
      ))}
    </div>
  );
}

function Toolbar({ tool, setTool, onAdd }: { tool: 'select' | 'hand'; setTool(t: 'select' | 'hand'): void; onAdd(): void }) {
  const T = useT();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const running = useGraph((s) => Object.values(s.runtime).some((r) => r.status === 'running'));
  return (
    <div className="toolbar">
      <button className={tool === 'select' ? 'active' : ''} title="Select (V)" onClick={() => setTool('select')}>◰</button>
      <button className={tool === 'hand' ? 'active' : ''} title="Hand (H)" onClick={() => setTool('hand')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15"/></svg></button>
      <button title={`${T('Add node')} (Tab)`} onClick={onAdd}>＋</button>
      <i className="sep" />
      <button title={`${T('Undo')} (Ctrl+Z)`} onClick={() => useGraph.getState().undo()}>↶</button>
      <button title={`${T('Redo')} (Ctrl+Shift+Z)`} onClick={() => useGraph.getState().redo()}>↷</button>
      <i className="sep" />
      <button onClick={() => zoomOut()}>−</button><span className="zoom">{Math.round(zoom * 100)}%</span><button onClick={() => zoomIn()}>＋</button>
      <button title={T('Zoom to fit')} onClick={() => fitView({ padding: 0.2, duration: 200 })}>⛶</button>
      <i className="sep" />
      {running ? <button className="stop-all" onClick={stopAll}>■ {T('Stop')}</button> : <button className="run-all" onClick={() => void runAll()}>▶ {T('Run all')}</button>}
    </div>
  );
}

function SelectionBar() {
  const T = useT();
  const sel = useGraph((s) => s.selected);
  const nodes = useGraph((s) => s.nodes);
  if (!sel.length) return null;
  const one = nodes.find((n) => n.id === sel[0]);
  const locked = !!one?.locked;
  return (
    <div className="selbar">
      <button onClick={() => useGraph.getState().duplicateNodes(sel)}>{T('Duplicate')}</button>
      {one?.members ? <button onClick={() => useGraph.getState().ungroup(one.id)}>{T('Ungroup')}</button> : sel.length > 0 && <button onClick={() => useGraph.getState().group(sel)}>{T('Group')}</button>}
      <button onClick={() => useGraph.getState().setLocked(sel, !locked)}>{locked ? T('Unlock') : T('Lock')}</button>
      {sel.length === 1 && one && one.results.length > 0 && <button onClick={() => useGraph.getState().clearResults(one.id)}>{T('Clear results')}</button>}
      <button className="danger" onClick={() => useGraph.getState().removeNodes(sel)}>{T('Delete')}</button>
    </div>
  );
}

// opening the app in a fresh tab/window starts on a new canvas; a refresh of the same tab keeps the canvas
let booted = false;
const sameSession = (() => { try { const v = sessionStorage.getItem('canvers.session') === '1'; sessionStorage.setItem('canvers.session', '1'); return v; } catch { return false; } })();

export function App() {
  const mode = useGraph((s) => s.mode);
  const panel = useGraph((s) => s.panel);
  const [tool, setTool] = useState<'select' | 'hand'>('select');
  const [menu, setMenu] = useState<{ x: number; y: number; flow: { x: number; y: number }; pending?: import('./canvas/NodeMenu').Pending } | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const T = useT();
  const [panelW, setPanelW] = useState(() => { try { return Math.min(720, Math.max(260, Number(localStorage.getItem('canvers_panel_w')) || 340)); } catch { return 340; } });
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX, w0 = panelW; let w = w0;
    const move = (ev: PointerEvent) => { w = Math.min(720, Math.max(260, w0 + ev.clientX - x0)); setPanelW(w); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.classList.remove('resizing'); try { localStorage.setItem('canvers_panel_w', String(w)); } catch { /* ignore */ } };
    document.body.classList.add('resizing'); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };

  useEffect(() => {
    setHostSerializer(serializeHost); wireHostStore();
    // ONE STUDIO panels need their extensions loaded before a saved canvas that uses them is restored
    void (useSettings.getState().hostPanels ? loadStudio().catch(() => undefined) : Promise.resolve()).finally(async () => {
      if (booted) return; booted = true;   // effects can run twice in dev: start up only once
      await loadTurboFromStudio();          // the last 7+1 LoRA picks (kept on the server) before any card is restored
      // a refresh (same tab) keeps the canvas; opening the app fresh starts on a new one - unsaved work is offered back first
      let restored = sameSession && restoreAutosave();
      if (!sameSession && hasUnsavedAutosave() && await askConfirm(tr('There is an unsaved canvas from last time. Restore it?'))) restored = restoreAutosave();
      if (!restored) clearInflight();
      startAutosave(); syncLinks();
      if (restored) void resumeInflight();
    });
    void loadServerSettings();
    const t = setInterval(() => { const g = useGraph.getState(); if (g.nodes.some((n) => n.defId.startsWith('host:'))) { try { localStorage.setItem('canvers.autosave.v1', JSON.stringify(g.toProject())); } catch { /* quota */ } } }, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const g = useGraph.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void saveCanvasToList(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); g.setPanel('canvases'); return; }
      if (typing || g.mode !== 'canvas') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? g.redo() : g.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); if (g.selected.length) g.duplicateNodes(g.selected); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') { e.preventDefault(); if (g.selected.length) g.group(g.selected); return; }
      if (e.key === 'Tab') { e.preventDefault(); const p = { x: window.innerWidth / 2 - 130, y: window.innerHeight / 3 }; setMenu({ ...p, flow: screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }) }); }
      if (e.key === 'v') setTool('select');
      if (e.key === 'h') setTool('hand');
    };
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length && useGraph.getState().mode === 'canvas' && (e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'INPUT') {
        void addImports(files, screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
      }
    };
    window.addEventListener('keydown', onKey); window.addEventListener('paste', onPaste);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('paste', onPaste); };
  }, [screenToFlowPosition]);

  return (
    <div className="app">
      <DialogHost />
      <RefineHost />
      <ColorPopupHost />
      <LightboxHost />
      <TopBar />
      <div className="body">
        <Rail />
        {panel && (mode === 'canvas' || panel === 'assets' || panel === 'library' || panel === 'settings' || panel === 'models') ? (
          <aside className="panel" style={{ width: panelW }}>
            <header><b>{T(({ canvases: 'Canvases', decks: 'Decks', nodes: 'Nodes', assets: 'Gallery', settings: 'Settings', models: 'Models', library: 'Asset Library', live: 'Live Canvas' } as const)[panel!])}</b><button onClick={() => useGraph.getState().setPanel(null)}>✕</button></header>
            {panel === 'canvases' && <CanvasesPanel />}
            {panel === 'decks' && <DecksPanel />}
            {panel === 'nodes' && <NodesPanel />}
            {panel === 'assets' && <AssetsPanel />}
            {panel === 'library' && <LibraryPanel />}
            {panel === 'live' && <LivePanel />}
            {panel === 'settings' && <SettingsPanel />}
            {panel === 'models' && <StatusPanel />}
            <div className="panel-resize" title={T('Drag to resize')} onPointerDown={startResize} onDoubleClick={() => { setPanelW(340); try { localStorage.setItem('canvers_panel_w', '340'); } catch { /* ignore */ } }} />
          </aside>
        ) : null}
        <main className="stage">
          {mode === 'canvas' ? (
            <>
              <Flow tool={tool} onMenu={setMenu} />
              <Toolbar tool={tool} setTool={setTool} onAdd={() => setMenu({ x: window.innerWidth / 2 - 130, y: window.innerHeight / 3, flow: screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }) })} />
              <SelectionBar />
            </>
          ) : <SimpleView />}
          <LlmNotice mode={mode} />
        </main>
      </div>
      {menu && <NodeMenu at={menu} flow={menu.flow} pending={menu.pending} onClose={() => setMenu(null)} />}
      <Viewer />
      <Painter />
      <BoxEditor />
      <MelodyEditor />
      <AssetPicker />
      <FacePicker />
    </div>
  );
}
