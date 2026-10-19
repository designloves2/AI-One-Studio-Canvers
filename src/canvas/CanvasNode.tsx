import { memo, useMemo, useRef, useState } from 'react';
import { parseWorkflow, candidates } from '../backend/workflow';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useGraph } from '../store/graph';
import { byId, engineFor, paramsFor } from '../registry';
import { PORT_COLORS, type PortDef } from '../types';
import { Field, AutoText } from '../ui/Controls';
import { AssetView } from './AssetView';
import { activeAsset, portAssets, useUpstream } from './helpers';
import { runNode, stopNode, addImports, download } from '../engine/actions';
import { importFile, enhanceInstruction } from '../engine/run';
import { runLlm } from '../backend/llm';
import { useSettings } from '../store/settings';
import { t, useT } from '../i18n';

const KIND_COLOR: Record<string, string> = { source: '#8b7bff', edit: '#4f8dff', generate: '#34c98e', llm: '#c08bff', output: '#ff9d3d', note: '#e6c34a' };

function PortRow({ nodeId, inp, out }: { nodeId: string; inp?: PortDef; out?: PortDef }) {
  return (
    <div className="port-row">
      <div className="port in">
        {inp && <>
          <Handle id={inp.id} type="target" position={Position.Left} style={{ background: PORT_COLORS[inp.type] }} />
          <span className={inp.optional ? 'opt' : ''}>{t(inp.label)}{inp.multi ? ' +' : ''}</span>
        </>}
      </div>
      <div className="port out">
        {out && <>
          <span>{t(out.label)}</span>
          <Handle id={out.id} type="source" position={Position.Right} style={{ background: PORT_COLORS[out.type] }} />
        </>}
      </div>
    </div>
  );
}

function Results({ id }: { id: string }) {
  const node = useGraph((s) => s.nodes.find((n) => n.id === id))!;
  const openViewer = useGraph((s) => s.openViewer);
  const setActive = useGraph((s) => s.setActive);
  const def = byId.get(node.defId)!;
  const main = portAssets(node, def.outputs[0]?.id);
  let others = def.outputs.slice(1).map((o) => ({ o, a: activeAsset(node, o.id) })).filter((x) => x.a);
  let cur = activeAsset(node, def.outputs[0]?.id);
  if (!cur && def.id === 'comfy-workflow' && others.length) { cur = others[0].a; others = []; } // video-only result
  if (!cur && !others.length) return null;
  return (
    <div className="results">
      {cur && (
        <div className="result-frame nodrag" onDoubleClick={() => openViewer(id)}>
          <AssetView asset={cur} />
          {main.length > 1 && (
            <div className="pager">
              <button onClick={() => setActive(id, node.activeResult - 1)} disabled={node.activeResult <= 0}>‹</button>
              <span>{Math.min(node.activeResult, main.length - 1) + 1}/{main.length}</span>
              <button onClick={() => setActive(id, node.activeResult + 1)} disabled={node.activeResult >= main.length - 1}>›</button>
            </div>
          )}
        </div>
      )}
      {others.length > 0 && <div className="mini-results">{others.map(({ o, a }) => <figure key={o.id}><AssetView asset={a!} controls={false} /><figcaption>{t(o.label)}</figcaption></figure>)}</div>}
    </div>
  );
}

function ImportBody({ id }: { id: string }) {
  const node = useGraph((s) => s.nodes.find((n) => n.id === id))!;
  const ref = useRef<HTMLInputElement>(null);
  const T = useT();
  return (
    <div className="import-body">
      <input ref={ref} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { void addImports([...(e.target.files ?? [])].slice(1), { x: node.x + 340, y: node.y }); const f = e.target.files?.[0]; if (f) void replaceImport(id, f); e.target.value = ''; }} />
      <button className="btn nodrag" onClick={() => ref.current?.click()}>{node.results.length ? T('Replace…') : T('Choose file…')}</button>
      <span className="muted">{T('or drop a file on the canvas')}</span>
    </div>
  );
}

async function replaceImport(id: string, f: File) {
  const g = useGraph.getState();
  g.setRuntime(id, { status: 'running', pct: 30, label: 'uploading…' });
  try { g.setResults(id, [await importFile(f)]); g.setRuntime(id, { status: 'idle', pct: 100 }); }
  catch (e) { g.setRuntime(id, { status: 'error', error: (e as Error).message }); }
}

function EnhanceButton({ id }: { id: string }) {
  const T = useT();
  const [busy, setBusy] = useState(false);
  const [prev, setPrev] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const go = async () => {
    const g = useGraph.getState();
    const cur = String(g.nodes.find((n) => n.id === id)?.params.text ?? '');
    if (!cur.trim()) { setErr(T('Write a prompt first.')); return; }
    setBusy(true); setErr('');
    try {
      const out = await runLlm({ system: enhanceInstruction('Image', '', true), prompt: cur });
      if (out) { setPrev(cur); useGraph.getState().setParam(id, 'text', out); }
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="enhance-row">
      <button className="btn nodrag" disabled={busy} onClick={() => void go()}>{busy ? '…' : '✨ ' + T('Enhance')}</button>
      {prev !== null && <button className="btn nodrag" onClick={() => { useGraph.getState().setParam(id, 'text', prev); setPrev(null); }}>{T('Restore')}</button>}
      {err && <span className="error-inline">{err}</span>}
    </div>
  );
}

function WorkflowBody({ id }: { id: string }) {
  const T = useT();
  const node = useGraph((s) => s.nodes.find((n) => n.id === id))!;
  const set = useGraph((s) => s.setParam);
  const ref = useRef<HTMLInputElement>(null);
  const src = String(node.params.workflow ?? '');
  const parsed = useMemo(() => parseWorkflow(src), [src]);
  const cand = useMemo(() => (parsed.graph ? candidates(parsed.graph) : null), [parsed.graph]);
  const load = async (f: File) => {
    const text = await f.text();
    const p = parseWorkflow(text);
    set(id, 'workflow', text);
    if (p.graph) {
      const c = candidates(p.graph);
      set(id, 'prompt_target', c.text[0]?.key ?? ''); set(id, 'image_target', c.image[0]?.key ?? ''); set(id, 'image2_target', c.image[1]?.key ?? '');
      set(id, 'video_target', c.video[0]?.key ?? ''); set(id, 'seed_target', c.seed[0]?.key ?? '');
    }
  };
  const pick = (param: string, label: string, list: { key: string; label: string }[]) => (
    <label className="field"><span className="field-label">{T(label)}</span>
      <select className="nodrag" value={String(node.params[param] ?? '')} onChange={(e) => set(id, param, e.target.value)}>
        <option value="">—</option>{list.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select></label>
  );
  return (
    <div className="params">
      <input ref={ref} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f); e.target.value = ''; }} />
      <button className="btn nodrag" onClick={() => ref.current?.click()}>{src ? T('Replace workflow…') : T('Load workflow (API JSON)…')}</button>
      {parsed.error && <div className="error">{parsed.error}</div>}
      {cand && <>
        <small className="muted">{Object.keys(parsed.graph!).length} nodes</small>
        {pick('prompt_target', 'Prompt field', cand.text)}{pick('image_target', 'Image 1 field', cand.image)}{pick('image2_target', 'Image 2 field', cand.image)}
        {pick('video_target', 'Video field', cand.video)}{pick('seed_target', 'Seed field', cand.seed)}
      </>}
    </div>
  );
}

function DisplayBody({ id, defId }: { id: string; defId: string }) {
  const a = useUpstream(id, defId === 'compare' ? 'a' : 'image');
  const b = useUpstream(id, 'b');
  const openViewer = useGraph((s) => s.openViewer);
  const name = useGraph((s) => String(s.nodes.find((n) => n.id === id)?.params.name ?? 'canvers'));
  const T = useT();
  const [pos, setPos] = useState(50);
  if (defId === 'compare') {
    if (!a || !b) return <div className="empty">{T('Connect A and B')}</div>;
    return (
      <div className="compare nodrag" onMouseMove={(e) => { if (e.buttons === 1) { const r = e.currentTarget.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))); } }}>
        <img src={b.url} alt="" draggable={false} />
        <div className="compare-top" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}><img src={a.url} alt="" draggable={false} /></div>
        <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} />
      </div>
    );
  }
  if (!a) return <div className="empty">{T('Nothing connected yet')}</div>;
  return (
    <div className="result-frame nodrag" onDoubleClick={() => openViewer(id)}>
      <AssetView asset={a} />
      {defId === 'export' && a.type !== 'text' && (
        <button className="btn primary dl" onClick={() => download(a.url, `${name}.${a.type === 'video' ? 'mp4' : 'png'}`)}>{T('Download')}</button>
      )}
    </div>
  );
}

export const CanvasNode = memo(function CanvasNode({ id, selected }: NodeProps) {
  const node = useGraph((s) => s.nodes.find((n) => n.id === id));
  const rt = useGraph((s) => s.runtime[id]);
  const setParam = useGraph((s) => s.setParam);
  const setEngine = useGraph((s) => s.setEngine);
  const setTitle = useGraph((s) => s.setTitle);
  const openPainter = useGraph((s) => s.openPainter);
  const llmBackend = useSettings((s) => s.llm.backend);
  const [adv, setAdv] = useState(false);
  const [editing, setEditing] = useState(false);
  const T = useT();
  if (!node) return null;
  const def = byId.get(node.defId);
  if (!def) return null;

  const color = KIND_COLOR[def.kind] ?? '#888';
  const params = paramsFor(def, node.engineId);
  const shown = params.filter((p) => (adv || !p.advanced) && (!p.when || p.when(node.params)) && !(def.id === 'comfy-workflow' && /target$|^workflow$/.test(p.id)));
  const hasAdv = params.some((p) => p.advanced);
  const rows = Math.max(def.inputs.length, def.outputs.length);
  const running = rt?.status === 'running';
  const runnable = def.kind === 'generate' || def.kind === 'llm' || def.kind === 'edit' && def.id !== 'router';
  const engine = engineFor(def, node.engineId);

  if (def.kind === 'note') {
    return (
      <div className={`cnode note ${selected ? 'sel' : ''}`}>
        <NodeResizer minWidth={160} minHeight={90} isVisible={selected} />
        <AutoText value={String(node.params.text ?? '')} onChange={(v) => setParam(id, 'text', v)} placeholder="…" rows={4} />
      </div>
    );
  }

  return (
    <div className={`cnode ${selected ? 'sel' : ''} ${running ? 'running' : ''} ${rt?.status === 'error' ? 'err' : ''}`} style={{ width: node.w ?? 300, ['--k' as string]: color }}>
      <div className="cnode-head">
        <i className="dot" />
        {editing
          ? <input className="title-edit nodrag" autoFocus defaultValue={node.title ?? t(def.title)} onBlur={(e) => { setTitle(id, e.target.value); setEditing(false); }} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
          : <span className="title" onDoubleClick={() => setEditing(true)} title={def.description}>{node.title ?? t(def.title)}</span>}
        {def.id === 'llm-tj' && <span className="chip" title="Change in Settings → LLM">{llmBackend}</span>}
        {def.planned && <span className="chip warn">{T('planned')}</span>}
        <span className="spacer" />
        {runnable && (running
          ? <button className="run stop nodrag" title={T('Stop')} onClick={() => stopNode(id)}>■</button>
          : <button className="run nodrag" title={T('Run')} onClick={() => void runNode(id)}>▶</button>)}
      </div>

      {def.engines && def.engines.length > 1 && (
        <select className="engine nodrag" value={engine?.id} onChange={(e) => setEngine(id, e.target.value)}>
          {def.engines.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      )}
      {def.engines && def.engines.length === 1 && <div className="engine-fixed">{engine?.label}</div>}

      {rows > 0 && <div className="ports">{Array.from({ length: rows }, (_, i) => <PortRow key={i} nodeId={id} inp={def.inputs[i]} out={def.outputs[i]} />)}</div>}

      {def.id === 'import' && <ImportBody id={id} />}
      {(def.id === 'export' || def.id === 'preview' || def.id === 'compare') && <DisplayBody id={id} defId={def.id} />}

      {def.id === 'comfy-workflow' && <WorkflowBody id={id} />}
      {shown.length > 0 && (
        <div className="params">
          {shown.map((p) => <Field key={p.id} def={p} value={node.params[p.id] ?? p.default} onChange={(v) => setParam(id, p.id, v)} />)}
        </div>
      )}
      {def.id === 'prompt' && <EnhanceButton id={id} />}
      {hasAdv && <button className="adv-toggle nodrag" onClick={() => setAdv((v) => !v)}>{adv ? '▾' : '▸'} {T('Advanced')}</button>}

      {def.id === 'painter' && <button className="btn nodrag open-painter" onClick={() => openPainter(id)}>{T('Open painter')}</button>}

      {running && <div className="bar"><b style={{ width: `${Math.max(4, rt!.pct)}%` }} /><em>{rt!.label ?? `${rt!.pct}%`}</em></div>}
      {rt?.status === 'error' && <div className="error">{rt.error}</div>}

      {def.kind !== 'output' && (def.kind !== 'source' || def.id === 'import') && <Results id={id} />}
      <NodeResizer minWidth={240} maxWidth={720} isVisible={selected} handleStyle={{ width: 8, height: 8 }} lineStyle={{ opacity: 0 }} onResizeEnd={(_, p) => useGraph.getState().setSize(id, p.width, p.height)} keepAspectRatio={false} />
    </div>
  );
});
