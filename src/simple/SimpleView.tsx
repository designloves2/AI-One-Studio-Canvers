import { useMemo, useRef, useState } from 'react';
import { useGraph } from '../store/graph';
import { byId, engineFor, defaultParams, paramsFor } from '../registry';
import { Field } from '../ui/Controls';
import { AssetView } from '../canvas/AssetView';
import { runComposer, download, addImports } from '../engine/actions';
import { importFile } from '../engine/run';
import type { Asset, Primitive } from '../types';
import { runLlm } from '../backend/llm';
import { useT } from '../i18n';
import { useOptions } from '../backend/options';

const MODELS = ['image-generate', 'image-edit', 'outpaint', 'video-generate'];

/** Simple mode: a Higgsfield-style composer on top of a feed. Runs a throw-away graph behind the scenes. */
export function SimpleView() {
  const T = useT();
  const runs = useGraph((s) => s.composerRuns);
  const [defId, setDefId] = useState('image-generate');
  const def = byId.get(defId)!;
  const [engineId, setEngineId] = useState(engineFor(def)!.id);
  const [prompt, setPrompt] = useState('');
  const [params, setParams] = useState<Record<string, Primitive>>(() => defaultParams(def, engineFor(def)!.id));
  const [refs, setRefs] = useState<Asset[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const pickNode = (id: string) => { const d = byId.get(id)!; const e = engineFor(d)!; setDefId(id); setEngineId(e.id); setParams(defaultParams(d, e.id)); };
  const pickEngine = (id: string) => { setEngineId(id); setParams({ ...defaultParams(def, id) }); };
  const shown = useMemo(() => paramsFor(def, engineId).filter((p) => (!p.when || p.when(params))), [def, engineId, params]);
  const needsImage = def.inputs.some((i) => i.type === 'image' && !i.optional);

  const enhance = async () => {
    if (!prompt.trim()) return; setBusy(true); setNote('');
    try {
      setPrompt(await runLlm({ system: 'Rewrite the idea as a rich, detailed image-generation prompt in English. Output only the prompt.', prompt }));
    } catch (e) { setNote((e as Error).message); } finally { setBusy(false); }
  };
  // H3 speed-up (Turbo LoRA + optional 7+1 hi-res finish) rides along as an option card
  const [turbo, setTurbo] = useState({ on: false, lora: 'none', hires: true });
  const loras = useOptions('loras:h3', ['none']);
  const isH3 = defId === 'video-generate' && engineId !== 'ltx25';
  const go = () => {
    const cards = isH3 && turbo.on ? [{ def: 'h3-turbo', params: { turbo: 'pdd', turbo_lora: turbo.lora, hires: turbo.hires } }] : [];
    void runComposer({ defId, engineId, prompt, params, refs, cards });
  };

  return (
    <div className="simple">
      <div className="feed">
        {!runs.length && <div className="hint"><h2>AI ONE Studio Canvers</h2><p>{T('Describe what you want below and press Generate.')}</p></div>}
        {runs.map((r) => (
          <article key={r.id} className="sim-run">
            <header><b>{r.engineLabel}</b><span className="muted">{new Date(r.createdAt).toLocaleTimeString()}</span><span className="spacer" /><button className="x" onClick={() => useGraph.getState().removeComposerRun(r.id)}>✕</button></header>
            <p className="run-prompt">{r.prompt}</p>
            {r.status === 'running' && <div className="bar big"><b style={{ width: `${Math.max(6, r.pct)}%` }} /><em>{r.pct}%</em></div>}
            {r.status === 'error' && <div className="error">{r.error}</div>}
            <div className="run-results">
              {r.results.map((a) => (
                <div key={a.id} className="run-img">
                  <AssetView asset={a} />
                  <div className="run-actions">
                    <button className="btn" onClick={() => download(a.url, a.file?.filename ?? 'result.png')}>{T('Download')}</button>
                    <button className="btn" onClick={() => setRefs((p) => [...p, a])}>{T('Use as reference')}</button>
                    <button className="btn" onClick={() => { const g = useGraph.getState(); const id = g.addNode('import', 100, 100); g.setResults(id, [a]); g.setMode('canvas'); }}>{T('To canvas')}</button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="composer">
        {refs.length > 0 && <div className="refs">{refs.map((a, i) => <figure key={a.id}><img src={a.url} alt="" /><button onClick={() => setRefs(refs.filter((_, j) => j !== i))}>✕</button></figure>)}</div>}
        <textarea value={prompt} placeholder={defId === 'video-generate' ? T('Describe your video…') : T('Describe your image…')} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) go(); }} rows={2} />
        <div className="composer-bar">
          <select value={defId} onChange={(e) => pickNode(e.target.value)}>{MODELS.map((id) => <option key={id} value={id}>{T(byId.get(id)!.title)}</option>)}</select>
          {def.engines && <select value={engineId} onChange={(e) => pickEngine(e.target.value)}>{def.engines.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</select>}
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={async (e) => { const fs = [...(e.target.files ?? [])]; const as = await Promise.all(fs.map(importFile)); setRefs((p) => [...p, ...as]); e.target.value = ''; }} />
          <button className="btn" onClick={() => file.current?.click()}>＋ {T('Reference')}</button>
          <button className="btn" onClick={() => setOpen((o) => !o)}>⚙ {T('Options')}</button>
          <button className="btn" disabled={busy || !prompt.trim()} onClick={() => void enhance()} title="LLM (Settings)">✨ {T('Enhance')}</button>
          <span className="spacer" />
          {note && <span className="error-inline">{note}</span>}
          <button className="btn primary big" disabled={!prompt.trim() && !needsImage} onClick={go}>{T('Generate')}</button>
        </div>
        {open && isH3 && (
          <div className="composer-opts turbo-opts">
            <label className="field"><span className="field-label">{T('Turbo (faster)')}</span><input type="checkbox" checked={turbo.on} onChange={(e) => setTurbo({ ...turbo, on: e.target.checked })} /></label>
            {turbo.on && <label className="field"><span className="field-label">{T('Turbo LoRA')}</span><select className="nodrag" value={turbo.lora} onChange={(e) => setTurbo({ ...turbo, lora: e.target.value })}>{loras.map((o) => <option key={o}>{o}</option>)}</select></label>}
            {turbo.on && <label className="field"><span className="field-label">{T('7+1 hi-res finish')}</span><input type="checkbox" checked={turbo.hires} onChange={(e) => setTurbo({ ...turbo, hires: e.target.checked })} /></label>}
          </div>
        )}
        {open && <div className="composer-opts">{shown.map((p) => <Field key={p.id} def={p} value={params[p.id] ?? p.default} onChange={(v) => setParams({ ...params, [p.id]: v })} />)}</div>}
      </div>
    </div>
  );
}
export { addImports };
