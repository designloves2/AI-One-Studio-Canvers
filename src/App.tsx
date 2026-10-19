import { useEffect, useState } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useGraph, restoreAutosave, startAutosave, type PanelId } from './store/graph';
import { Flow } from './canvas/Flow';
import { NodeMenu } from './canvas/NodeMenu';
import { Viewer } from './canvas/Viewer';
import { Painter } from './canvas/Painter';
import { MelodyEditor } from './canvas/MelodyEditor';
import { NodesPanel } from './panels/NodesPanel';
import { AssetsPanel } from './panels/AssetsPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { StatusPanel } from './panels/StatusPanel';
import { SimpleView } from './simple/SimpleView';
import { addImports, openProjectFile, runAll, saveProjectFile, stopAll } from './engine/actions';
import { systemStats } from './backend/comfy';
import { loadServerSettings } from './backend/llm';
import { useT } from './i18n';

const Icon = ({ d }: { d: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const ICONS = {
  nodes: 'M4 6h6v6H4zM14 12h6v6h-6zM10 9h4v6',
  assets: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M9 9.5h.01',
  status: 'M4 13l4 4L20 6',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
};

function TopBar() {
  const T = useT();
  const name = useGraph((s) => s.projectName);
  const setName = useGraph((s) => s.setName);
  const mode = useGraph((s) => s.mode);
  const setMode = useGraph((s) => s.setMode);
  const [up, setUp] = useState<boolean | null>(null);
  useEffect(() => {
    const ping = () => systemStats().then(() => setUp(true), () => setUp(false));
    void ping(); const i = setInterval(ping, 10000); return () => clearInterval(i);
  }, []);
  return (
    <div className="topbar">
      <div className="brand"><img src="/logo.svg" alt="" /><b>AI ONE Studio</b><em>Canvers</em></div>
      <input className="project-name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="file-actions">
        <button title={`${T('New')}`} onClick={() => { if (!useGraph.getState().nodes.length || confirm(`${T('New')}?`)) useGraph.getState().newProject(); }}>＋</button>
        <button title={`${T('Open')} (Ctrl+O)`} onClick={openProjectFile}>⤒</button>
        <button title={`${T('Save')} (Ctrl+S)`} onClick={saveProjectFile}>⤓</button>
      </div>
      <div className="mode-toggle">
        <button className={mode === 'canvas' ? 'active' : ''} onClick={() => setMode('canvas')}>{T('Canvas')}</button>
        <button className={mode === 'simple' ? 'active' : ''} onClick={() => setMode('simple')}>{T('Simple')}</button>
      </div>
      <div className="topbar-right"><span className={`engine-dot ${up ? 'on' : ''}`} title="ComfyUI + STUDIO_ONE"><i />ComfyUI</span></div>
    </div>
  );
}

function Rail() {
  const T = useT();
  const panel = useGraph((s) => s.panel);
  const setPanel = useGraph((s) => s.setPanel);
  const items: [Exclude<PanelId, null>, string, string][] = [['nodes', 'Nodes', ICONS.nodes], ['assets', 'Gallery', ICONS.assets], ['models', 'Models', ICONS.status], ['settings', 'Settings', ICONS.settings]];
  return (
    <div className="rail">
      {items.map(([id, label, d]) => (
        <button key={id} className={panel === id ? 'active' : ''} title={T(label)} onClick={() => setPanel(panel === id ? null : id)}><Icon d={d} /><span>{T(label)}</span></button>
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
      <button className={tool === 'hand' ? 'active' : ''} title="Hand (H)" onClick={() => setTool('hand')}>✋</button>
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

export function App() {
  const mode = useGraph((s) => s.mode);
  const panel = useGraph((s) => s.panel);
  const [tool, setTool] = useState<'select' | 'hand'>('select');
  const [menu, setMenu] = useState<{ x: number; y: number; flow: { x: number; y: number } } | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const T = useT();

  useEffect(() => { restoreAutosave(); startAutosave(); void loadServerSettings(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const g = useGraph.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveProjectFile(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); openProjectFile(); return; }
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
      <TopBar />
      <div className="body">
        <Rail />
        {panel && mode === 'canvas' || panel === 'settings' || panel === 'models' ? (
          <aside className="panel">
            <header><b>{T(({ nodes: 'Nodes', assets: 'Gallery', settings: 'Settings', models: 'Models' } as const)[panel!])}</b><button onClick={() => useGraph.getState().setPanel(null)}>✕</button></header>
            {panel === 'nodes' && <NodesPanel />}
            {panel === 'assets' && <AssetsPanel />}
            {panel === 'settings' && <SettingsPanel />}
            {panel === 'models' && <StatusPanel />}
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
        </main>
      </div>
      {menu && <NodeMenu at={menu} flow={menu.flow} onClose={() => setMenu(null)} />}
      <Viewer />
      <Painter />
      <MelodyEditor />
    </div>
  );
}
