import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { parseWorkflow, candidates } from '../backend/workflow';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useGraph } from '../store/graph';
import { byId, engineFor, paramsFor } from '../registry';
import { PORT_COLORS, type Asset, type GraphNode, type PortDef } from '../types';
import { Field, AutoText } from '../ui/Controls';
import { AssetView } from './AssetView';
import { activeAsset, portAssets, useUpstream } from './helpers';
import { runNode, stopNode, addImports, download } from '../engine/actions';
import { importFile, enhanceInstruction } from '../engine/run';
import { runLlm } from '../backend/llm';
import { PromptTools, NoteTools } from './PromptTools';
import { useSensitive } from '../backend/sensitive';
import { useSettings } from '../store/settings';
import { t, useT } from '../i18n';
import { HostCard } from '../host/HostCard';

const KIND_COLOR: Record<string, string> = { source: '#8b7bff', edit: '#4f8dff', generate: '#34c98e', llm: '#c08bff', output: '#ff9d3d', note: '#e6c34a' };

/** Numbered strip for a multi-image input: shows which connection is @image1, @image2 … and lets you reorder them. */
function RefOrder({ nodeId, inp }: { nodeId: string; inp: PortDef }) {
  const T = useT();
  const edges = useGraph((s) => s.edges);
  const nodes = useGraph((s) => s.nodes);
  const hiddenSet = useSensitive((st) => st.items);
  const revealAll = useSensitive((st) => st.revealAll);
  const list = edges.filter((e) => e.target === nodeId && e.targetHandle === inp.id);
  if (!list.length) return null;
  return (
    <div className="ref-order" title={T('Order of the connected images — use @image1, @image2 … in the prompt')}>
      {list.map((e, i) => {
        const src = nodes.find((n) => n.id === e.source); const a = src && activeAsset(src, e.sourceHandle);
        return (
          <div key={e.id} className="ref-chip nodrag">
            {a?.url ? <img className={(a.meta as { assetId?: number } | undefined)?.assetId !== undefined && hiddenSet.has(`reflib/${(a.meta as { assetId: number }).assetId}`) && !revealAll ? 'blurred' : ''} src={a.url} alt="" /> : <i />}
            <b>@image{i + 1}</b>
            {list.length > 1 && <span className="mv"><button disabled={i === 0} onClick={() => useGraph.getState().moveEdge(e.id, -1)}>◀</button><button disabled={i === list.length - 1} onClick={() => useGraph.getState().moveEdge(e.id, 1)}>▶</button></span>}
          </div>
        );
      })}
    </div>
  );
}

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

/** Pick several of a card's stacked clips and send them, in the order picked, to the Video Stitch it is wired to. */
function ClipPicker({ node, clips }: { node: GraphNode; clips: Asset[] }) {
  const T = useT();
  const setPick = useGraph((s) => s.setPick);
  const pick = node.pick ?? [];
  const toggle = (a: Asset) => setPick(node.id, pick.includes(a.id) ? pick.filter((x) => x !== a.id) : [...pick, a.id]);
  return (
    <div className="clip-pick nodrag nowheel">
      <div className="clip-pick-head">
        <b>{T('Clips for the stitch')}</b>
        <span className="muted">{pick.length ? `${pick.length} ${T('picked, sent in this order')}` : T('none picked: only the shown clip is sent')}</span>
        <button onClick={() => setPick(node.id, clips.map((a) => a.id))}>{T('All')}</button>
        <button onClick={() => setPick(node.id, [])}>{T('Clear')}</button>
      </div>
      <div className="clip-pick-row">
        {clips.map((a, i) => {
          const n = pick.indexOf(a.id); const f = a.file;
          return (
            <button key={a.id} className={`clip-tile${n >= 0 ? ' on' : ''}`} onClick={() => toggle(a)} title={f?.filename}>
              {f && <img loading="lazy" draggable={false} alt="" src={`/ltx25_one/thumb?filename=${encodeURIComponent(f.filename)}&subfolder=${encodeURIComponent(f.subfolder)}`} />}
              <span className="clip-idx">{i + 1}</span>
              {n >= 0 && <span className="clip-num">{n + 1}</span>}
            </button>
          );
        })}
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
  const stitchLinked = useGraph((s) => s.edges.some((e) => e.source === id && s.nodes.find((n) => n.id === e.target)?.defId === 'video-stitch'));
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
      {stitchLinked && main.length > 1 && main[0]?.type === 'video' && <ClipPicker node={node} clips={main} />}
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
      <input ref={ref} type="file" accept={node.defId === 'import-audio' ? 'audio/*' : node.defId === 'import-video' ? 'video/*' : 'image/*'} multiple hidden onChange={(e) => { void addImports([...(e.target.files ?? [])].slice(1), { x: node.x + 340, y: node.y }); const f = e.target.files?.[0]; if (f) void replaceImport(id, f); e.target.value = ''; }} />
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

/** @names of the Asset Library cards wired into this prompt, as clickable chips (cut the wire and the chips go away). */
function MentionBar({ id }: { id: string }) {
  const T = useT();
  const nodes = useGraph((s) => s.nodes);
  const edges = useGraph((s) => s.edges);
  const libs = edges.filter((e) => e.target === id).map((e) => nodes.find((n) => n.id === e.source)).filter((n) => n?.defId === 'asset-library');
  const key = libs.map((n) => `${n!.id}:${n!.params.ids ?? ''}:${n!.results.length}`).join('|');
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    const fromRuns = libs.flatMap((n) => n!.results.filter((a) => a.port === 'mentions').flatMap((a) => (a.text ?? '').split(/\s+/).filter(Boolean).map((t) => t.replace(/^@/, ''))));
    if (fromRuns.length || !libs.length) { setNames([...new Set(fromRuns)]); return; }
    // not run yet: look the chosen ids up in the library
    const ids = new Set(libs.flatMap((n) => String(n!.params.ids ?? '').split(/[,\s]+/).filter(Boolean)));
    void import('../backend/assetlib').then((m) => m.listAssets()).then((a) => { if (live) setNames(a.filter((x) => ids.has(String(x.id)) && x.kind !== 'audio').map((x) => x.name)); }).catch(() => undefined);
    return () => { live = false; };
  }, [key]);
  if (!libs.length || !names.length) return null;
  const add = (n: string) => { const g = useGraph.getState(); const cur = String(g.nodes.find((x) => x.id === id)?.params.text ?? ''); g.setParam(id, 'text', `${cur}${cur && !/\s$/.test(cur) ? ' ' : ''}@${n} `); };
  return <div className="mentions nodrag" title={T('Asset Library names — click to add')}>{names.map((n) => <button key={n} className="chip" onClick={() => add(n)}>@{n}</button>)}</div>;
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

function MelodyBody({ id }: { id: string }) {
  const T = useT();
  const node = useGraph((s) => s.nodes.find((n) => n.id === id))!;
  const info = useMemo(() => { try { const j = JSON.parse(String(node.params.melody || '{}')); return j.notes ? `${j.notes.length} ${T('notes')} · ${j.bpm} BPM · ${j.key}` : ''; } catch { return ''; } }, [node.params.melody]);
  return (
    <div className="import-body">
      <button className="btn nodrag" onClick={() => useGraph.getState().openMelody(id)}>🎹 {T('Open melody editor')}</button>
      <span className="muted">{info || T('empty — open the editor')}</span>
    </div>
  );
}

function AssetLibBody({ id }: { id: string }) {
  const T = useT();
  const node = useGraph((s) => s.nodes.find((n) => n.id === id))!;
  const ids = String(node.params.ids ?? '').split(/[,\s]+/).filter(Boolean);
  const project = String(node.params.project ?? '');
  const [proj, setProj] = useState<{ ids: string[]; name: string } | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    void import('../backend/assetlib').then(async (m) => {
      const all = await m.listAssets(); if (live) setNames(Object.fromEntries(all.map((a) => [String(a.id), a.name])));
      if (project) { const p = (await m.listProjects()).find((x) => String(x.id) === project); if (live) setProj(p ? { name: p.name, ids: (p.items ?? []).map((i) => String(i.asset_id)) } : null); } else if (live) setProj(null);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [project, node.params.ids]);
  const shown = project ? proj?.ids ?? [] : ids;
  const hiddenSet = useSensitive((st) => st.items);
  const revealAll = useSensitive((st) => st.revealAll);
  useEffect(() => { void useSensitive.getState().load(); }, []);
  return (
    <div className="import-body">
      <button className="btn nodrag" onClick={() => useGraph.getState().openAssetPicker(id)}>📚 {T('Choose from library…')}</button>
      <span className="muted">{project ? `${T('Project')}: ${proj?.name ?? '#' + project}` : ids.length ? `${ids.length} ${T('assets')}` : T('nothing chosen yet')}</span>
      {shown.length > 0 && (
        <div className="asset-chosen nodrag">
          {shown.map((i) => (
            <figure key={i} title={`@${names[i] ?? i}`} className={hiddenSet.has(`reflib/${i}`) && !revealAll ? 'blurred' : ''}>
              <img src={`/tj_node/reflib/thumb/${i}`} alt="" loading="lazy" />
              <figcaption>@{names[i] ?? i}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

function FacePickBody({ id }: { id: string }) {
  const T = useT();
  const node = useGraph((s) => s.nodes.find((n) => n.id === id))!;
  if (node.params.select !== 'manual') return null;
  return (
    <div className="import-body">
      <button className="btn nodrag" onClick={() => useGraph.getState().openFacePicker(id)}>🙂 {T('Pick faces')}</button>
      <span className="muted">{String(node.params.picks || '') || T('none picked')}</span>
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

export const CanvasNode = memo(function CanvasNode(props: NodeProps) {
  const isHost = useGraph((s) => s.nodes.find((n) => n.id === props.id)?.defId.startsWith('host:') ?? false);
  return isHost ? <HostCard id={props.id} selected={props.selected} /> : <PlainNode {...props} />;
});

const boxCount = (s: unknown): number => { try { const j = JSON.parse(String(s || '[]')); return Array.isArray(j) ? j.length : 0; } catch { return 0; } };

const PlainNode = memo(function PlainNode({ id, selected }: NodeProps) {
  const node = useGraph((s) => s.nodes.find((n) => n.id === id));
  const rt = useGraph((s) => s.runtime[id]);
  const setParam = useGraph((s) => s.setParam);
  const setEngine = useGraph((s) => s.setEngine);
  const setTitle = useGraph((s) => s.setTitle);
  const openPainter = useGraph((s) => s.openPainter);
  const openBoxEditor = useGraph((s) => s.openBoxEditor);
  const llmBackend = useSettings((s) => s.llm.backend);
  const [adv, setAdv] = useState(false);
  const [editing, setEditing] = useState(false);
  const T = useT();
  if (!node) return null;
  const def = byId.get(node.defId);
  if (!def) return null;

  const color = KIND_COLOR[def.kind] ?? '#888';
  const params = paramsFor(def, node.engineId);
  const shown = params.filter((p) => (adv || !p.advanced) && (!p.when || p.when(node.params)) && !(def.id === 'comfy-workflow' && /target$|^workflow$/.test(p.id)) && !(def.id === 'melody-editor') && !(def.id === 'asset-library') && !(def.id === 'face-refine' && (p.id === 'picks' || p.id === 'pick_mode')));
  const hasAdv = params.some((p) => p.advanced);
  const rows = Math.max(def.inputs.length, def.outputs.length);
  const running = rt?.status === 'running';
  const runnable = def.kind === 'generate' || def.kind === 'llm' || def.kind === 'edit' && def.id !== 'router';
  const engine = engineFor(def, node.engineId);

  if (def.kind === 'note') {
    return (
      <div className={`cnode note ${selected ? 'sel' : ''}`}>
        <NodeResizer minWidth={160} minHeight={90} isVisible={selected} />
        {/* a plain textarea that fills the card: text stays inside, long notes scroll */}
        <textarea className="note-text nodrag nowheel" value={String(node.params.text ?? '')} onChange={(e) => setParam(id, 'text', e.target.value)} placeholder="…" />
        <NoteTools id={id} />
      </div>
    );
  }

  return (
    <div className={`cnode ${selected ? 'sel' : ''} ${running ? 'running' : ''} ${rt?.status === 'error' ? 'err' : ''}`} style={{ width: node.w ?? 300, ['--k' as string]: color, ...(node.color ? { background: node.color } : {}), ...(node.textColor ? { color: node.textColor, ['--fg' as string]: node.textColor, ['--muted' as string]: `color-mix(in srgb, ${node.textColor} 68%, transparent)` } : {}) }}>
      {running && <div className="run-overlay"><span className="spin" /><b>RUNNING…</b>{rt?.label && <em>{rt.label}</em>}</div>}
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
      {def.inputs.filter((i) => i.multi && i.type === 'image').map((i) => <RefOrder key={i.id} nodeId={id} inp={i} />)}

      {(def.id === 'import' || def.id === 'import-audio' || def.id === 'import-video') && <ImportBody id={id} />}
      {(def.id === 'export' || def.id === 'preview' || def.id === 'compare') && <DisplayBody id={id} defId={def.id} />}

      {def.id === 'comfy-workflow' && <WorkflowBody id={id} />}
      {shown.length > 0 && (
        <div className="params">
          {shown.map((p) => <Field key={p.id} def={p} value={node.params[p.id] ?? p.default} onChange={(v) => setParam(id, p.id, v)} />)}
        </div>
      )}
      {def.id === 'prompt' && <MentionBar id={id} />}
      {def.id === 'prompt' && <PromptTools id={id} />}
      {hasAdv && <button className="adv-toggle nodrag" onClick={() => setAdv((v) => !v)}>{adv ? '▾' : '▸'} {T('Advanced')}</button>}

      {def.id === 'melody-editor' && <MelodyBody id={id} />}
      {def.id === 'asset-library' && <AssetLibBody id={id} />}
      {def.id === 'face-refine' && <FacePickBody id={id} />}
      {def.id === 'painter' && <button className="btn nodrag open-painter" onClick={() => openPainter(id)}>{T('Open painter')}</button>}
      {def.id === 'moss-bboxes' && <button className="btn nodrag open-painter" onClick={() => openBoxEditor(id)}>{T('Edit boxes')} ({boxCount(node.params.boxes)})</button>}

      {running && <div className="bar"><b style={{ width: `${Math.max(4, rt!.pct)}%` }} /><em>{rt!.label ?? `${rt!.pct}%`}</em></div>}
      {rt?.status === 'error' && <div className="error">{rt.error}</div>}

      {def.kind !== 'output' && (def.kind !== 'source' || def.id === 'import' || def.id === 'import-audio' || def.id === 'import-video') && <Results id={id} />}
      <NodeResizer minWidth={240} maxWidth={720} isVisible={selected} handleStyle={{ width: 8, height: 8 }} lineStyle={{ opacity: 0 }} onResizeEnd={(_, p) => useGraph.getState().setSize(id, p.width, p.height)} keepAspectRatio={false} />
    </div>
  );
});
