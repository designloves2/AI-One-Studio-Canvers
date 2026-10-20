// Under the Prompt card's text: ✨ Enhance (model-aware, sees the connected reference images), ✎ Refine (change an
// existing prompt from a typed instruction) and ⚙ options (target model format / aesthetic / extra instructions).
import { useEffect, useState } from 'react';
import { useGraph } from '../store/graph';
import { runLlm } from '../backend/llm';
import { downstreamImages, enhanceWithImages } from '../backend/refEnhance';
import { AUTO, NO_AESTHETIC, downstreamTarget, styleCatalog, styleOf, type StyleCatalog } from '../backend/promptStyle';
import { runRefine } from '../ui/refine';
import { useT } from '../i18n';

export function PromptTools({ id }: { id: string }) {
  const T = useT();
  const node = useGraph((s) => s.nodes.find((n) => n.id === id));
  const [busy, setBusy] = useState(false);
  const [prev, setPrev] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<StyleCatalog | null>(null);
  useEffect(() => { if (open && !cat) void styleCatalog().then(setCat).catch((e) => setErr((e as Error).message)); }, [open, cat]);
  if (!node) return null;
  const p = node.params;
  const set = (k: string, v: string) => useGraph.getState().setParam(id, k, v);
  const autoLabel = (() => { const t = downstreamTarget(id); return t ? `${T('Auto')} — ${t.model_format}` : T('Auto'); })();

  const withBusy = async (label: string, fn: () => Promise<void>) => {
    setBusy(true); setErr(''); useGraph.getState().setRuntime(id, { status: 'running', pct: 0, label });
    try { await fn(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); useGraph.getState().setRuntime(id, { status: 'idle', pct: 100 }); }
  };
  const current = () => String(useGraph.getState().nodes.find((n) => n.id === id)?.params.text ?? '');

  const enhance = async () => {
    const cur = current();
    if (!cur.trim()) { setErr(T('Write a prompt first.')); return; }
    await withBusy('enhancing…', async () => {
      const style = styleOf(id, useGraph.getState().nodes.find((n) => n.id === id)!.params);
      const { images } = downstreamImages(id);
      const out = images.length
        ? await enhanceWithImages({ idea: cur, images: images.map((x) => x.asset), purpose: style.purpose, modelStyle: style, progress: (pct, label) => useGraph.getState().setRuntime(id, { status: 'running', pct, label }) })
        : await runLlm({ system: '', prompt: cur, style });
      if (out) { setPrev(cur); set('text', out); }
    });
  };

  const refine = async () => {
    const cur = current();
    if (!cur.trim()) { setErr(T('Write a prompt first.')); return; }
    setErr('');
    const style = styleOf(id, useGraph.getState().nodes.find((n) => n.id === id)!.params);
    const accepted = await runRefine(cur, (instruction) => runLlm({ system: '', prompt: cur, refine: instruction, style }));
    if (accepted) { setPrev(cur); set('text', accepted); }
  };

  return (
    <div className="prompt-tools nodrag">
      <div className="enhance-row">
        <button className="btn" disabled={busy} onClick={() => void enhance()}>{busy ? '…' : '✨ ' + T('Enhance')}</button>
        <button className="btn" disabled={busy} onClick={() => void refine()}>✎ {T('Refine')}</button>
        <button className={`btn${open ? ' active' : ''}`} title={T('Prompt options')} onClick={() => setOpen(!open)}>⚙</button>
        {prev !== null && <button className="btn" onClick={() => { set('text', prev); setPrev(null); }}>{T('Restore')}</button>}
        {err && <span className="error-inline">{err}</span>}
      </div>
      {open && (
        <div className="prompt-opts">
          <span className="field-label">{T('Write for')}</span>
          <select value={String(p.fmt ?? AUTO)} onChange={(e) => set('fmt', e.target.value)}>
            <option value={AUTO}>{autoLabel}</option>
            {(cat?.formats ?? []).map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <span className="field-label">{T('Aesthetic')}</span>
          <select value={String(p.aes ?? NO_AESTHETIC)} onChange={(e) => set('aes', e.target.value)}>
            {(cat?.aesthetics ?? [NO_AESTHETIC]).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="field-label">{T('Extra instructions')}</span>
          <textarea value={String(p.extra ?? '')} onChange={(e) => set('extra', e.target.value)} placeholder={T('e.g. keep it under 80 words')} />
        </div>
      )}
    </div>
  );
}

// ---- Sticky note: ✨ tidy / improve the note with the LLM, ✎ change it from a typed instruction
const NOTE_SYSTEM = 'You are an editor for working notes on a creative production canvas (briefs, shot lists, ideas, to-dos, meeting notes). '
  + 'Always keep the author\'s language, the facts, names, numbers and intent. Never add information the author did not imply unless it is an obvious gap you are asked to fill. '
  + 'Output ONLY the resulting note text: no preamble, no explanation, no quotes, no code fences.';
const NOTE_POLISH = ' Polish the note: fix spelling and wording, make it clear and concise, group related points, put steps or items on numbered / bulleted lines, give sections short headings when it helps, and remove repetition. Do not make it longer than needed.';

export function NoteTools({ id }: { id: string }) {
  const T = useT();
  const [busy, setBusy] = useState(false);
  const [prev, setPrev] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const current = () => String(useGraph.getState().nodes.find((n) => n.id === id)?.params.text ?? '');
  const set = (v: string) => useGraph.getState().setParam(id, 'text', v);

  const enhance = async () => {
    const cur = current(); if (!cur.trim()) { setErr(T('Write a note first.')); return; }
    setBusy(true); setErr('');
    try {
      const out = await runLlm({ system: `${NOTE_SYSTEM}${NOTE_POLISH}`, prompt: cur, max_tokens: 1500 });
      if (out) { setPrev(cur); set(out); }
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const refine = async () => {
    const cur = current(); if (!cur.trim()) { setErr(T('Write a note first.')); return; }
    setErr('');
    const accepted = await runRefine(cur, (instruction) => runLlm({
      system: `${NOTE_SYSTEM} Apply the change request to the note. Change only what it asks for and keep everything else as it is.`,
      prompt: `Current note:\n${cur}\n\nChange request:\n${instruction}`, max_tokens: 1500,
    }));
    if (accepted) { setPrev(cur); set(accepted); }
  };
  return (
    <div className="note-tools nodrag">
      <button className="btn" disabled={busy} onClick={() => void enhance()}>{busy ? '…' : '✨ ' + T('Polish note')}</button>
      <button className="btn" disabled={busy} onClick={() => void refine()}>✎ {T('Refine')}</button>
      {prev !== null && <button className="btn" onClick={() => { set(prev); setPrev(null); }}>{T('Restore')}</button>}
      {err && <span className="error-inline">{err}</span>}
    </div>
  );
}
