import { useEffect, useReducer, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useGraph } from '../store/graph';
import { PORT_COLORS, type PortType } from '../types';
import { ensureHostNode, hostStatus, loadStudio } from './index';
import { byId } from '../registry';
import { runHostNode } from './exec';

const toPort = (t: string): PortType => (t === 'IMAGE' ? 'image' : t === 'STRING' ? 'text' : t === 'AUDIO' ? 'audio' : t === 'TJ_PROMPT_PIPE' ? 'pipe' : 'any');

/** plain LiteGraph widgets (number / text / combo / toggle / button) for nodes that have no DOM panel */
function WidgetRow({ w, onChange, linked }: { w: any; onChange(): void; linked?: boolean }) {
  const set = (v: any) => { w.value = v; try { w.callback?.(v); } catch (e) { console.warn(e); } onChange(); };
  const label = <span className="field-label">{linked !== undefined && <Handle id={w.name} type="target" position={Position.Left} style={{ background: PORT_COLORS.text, left: -10 }} />}{w.label ?? w.name}{linked ? ' ⟵' : ''}</span>;
  if (w.type === 'button') return <button className="btn nodrag" onClick={() => w.callback?.(w)}>{w.name}</button>;
  if (w.type === 'toggle' || typeof w.value === 'boolean') return <label className="field">{label}<button type="button" className={`switch ${w.value ? 'on' : ''}`} onClick={() => set(!w.value)}><i /></button></label>;
  if (w.type === 'combo') return <label className="field">{label}<select value={String(w.value)} onChange={(e) => set(e.target.value)}>{(typeof w.options?.values === 'function' ? w.options.values() : w.options?.values ?? []).map((o: any) => <option key={String(o)} value={String(o)}>{String(o)}</option>)}</select></label>;
  if (w.type === 'number' || typeof w.value === 'number') return <label className="field">{label}<input type="number" value={w.value} step={w.options?.step ? w.options.step / 10 : 1} min={w.options?.min} max={w.options?.max} onChange={(e) => set(parseFloat(e.target.value))} /></label>;
  const multi = w.options?.multiline || w.type === 'customtext';
  return <label className={`field ${multi ? 'wide' : ''}`}>{label}{multi ? <textarea rows={3} value={w.value ?? ''} onChange={(e) => set(e.target.value)} /> : <input type="text" value={w.value ?? ''} onChange={(e) => set(e.target.value)} />}</label>;
}

/** A ONE STUDIO node: the original STUDIO_ONE panel (DOM widget) inside a canvas card, with live slots. */
export function HostCard({ id, selected }: { id: string; selected?: boolean }) {
  const gn = useGraph((s) => s.nodes.find((n) => n.id === id));
  const [, tick] = useReducer((x: number) => x + 1, 0);
  const [err, setErr] = useState('');
  const body = useRef<HTMLDivElement>(null);
  const rt = useGraph((s) => s.runtime[id]);
  const run = async () => {
    const g = useGraph.getState(); g.setRuntime(id, { status: 'running', pct: 0, error: undefined });
    try { const out = await runHostNode(id, (pct) => useGraph.getState().setRuntime(id, { status: 'running', pct })); g.setResults(id, out, 'replace'); g.setRuntime(id, { status: 'idle', pct: 100 }); }
    catch (e) { g.setRuntime(id, { status: 'error', error: (e as Error).message }); }
  };
  const [ready, setReady] = useState(hostStatus.loaded);

  useEffect(() => { if (!ready) void loadStudio().then(() => setReady(true), (e) => setErr((e as Error).message)); }, [ready]);
  const inst = ready && gn ? ensureHostNode(gn) : null;
  useEffect(() => { if (!inst) return; const off = inst.subscribe(tick); return () => { off(); }; }, [inst]);

  // mount the DOM widgets the panel created
  useEffect(() => {
    if (!inst || !body.current) return;
    const host = body.current;
    for (const w of inst.widgets) if (w.element && w.element.parentElement !== host) host.appendChild(w.element);
  });

  if (!gn) return null;
  if (err) return <div className="cnode err" style={{ width: 320 }}><div className="cnode-head"><span className="title">ONE STUDIO</span></div><div className="error">{err}</div></div>;
  if (!inst) return <div className="cnode" style={{ width: 320 }}><div className="cnode-head"><span className="title">ONE STUDIO</span></div><div className="empty">loading…</div></div>;

  const slots = inst.inputs.filter((x) => !x.widget);
  const rows = Math.max(slots.length, inst.outputs.length);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div className={`cnode host ${selected ? 'sel' : ''}`} style={{ width: inst.size[0], ['--k' as string]: '#8b7bff' }}>
      <div className="cnode-head"><i className="dot" /><span className="title">{inst.title}</span><span className="spacer" />{byId.get(gn.defId)?.runnable && (rt?.status === 'running' ? <span className="chip">{rt.pct}%</span> : <button className="run nodrag" title="Run" onClick={() => void run()}>▶</button>)}</div>
      {rt?.status === 'error' && <div className="error">{rt.error}</div>}
      <div className="ports">
        {Array.from({ length: rows }, (_, i) => {
          const a = slots[i], b = inst.outputs[i];
          return (
            <div className="port-row" key={i}>
              <div className="port in">{a && <><Handle id={a.name} type="target" position={Position.Left} style={{ background: PORT_COLORS[toPort(a.type)] }} /><span className="opt">{a.label ?? a.name}</span></>}</div>
              <div className="port out">{b && <><span>{b.label ?? b.name}</span><Handle id={b.name} type="source" position={Position.Right} style={{ background: PORT_COLORS[toPort(b.type)] }} /></>}</div>
            </div>
          );
        })}
      </div>
      {inst.widgets.some((w) => !w.element && !w.hidden && w.type !== 'converted-widget' && w.type !== 'hidden') && <div className="params nodrag">{inst.widgets.filter((w) => !w.element && !w.hidden && w.type !== 'converted-widget' && w.type !== 'hidden').map((w, i) => <WidgetRow key={w.name + i} w={w} onChange={tick} linked={inst.inputs.some((x) => x.widget?.name === w.name) ? inst.inputs.some((x) => x.widget?.name === w.name && x.link != null) : undefined} />)}</div>}
      {byId.get(gn.defId)?.runnable && gn.results.length > 0 && <div className="params nodrag">{gn.results.map((a) => a.type === 'text' ? <pre key={a.id} className="textout">{a.text}</pre> : a.type === 'image' ? <img key={a.id} src={a.url} alt="" style={{ width: '100%' }} /> : null)}</div>}
      <div ref={body} className="host-body nodrag nopan nowheel" onKeyDown={stop} onKeyUp={stop} onPaste={stop} onDoubleClick={stop} />
    </div>
  );
}
