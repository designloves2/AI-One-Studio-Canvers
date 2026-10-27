// Refine (ONE STUDIO "Refine"): type what to change in an existing prompt -> LLM -> original / revised side by side -> Apply, Retry or Close.
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { useT } from '../i18n';
import { getUseKo, protectWords, translateLlm, whileTranslating } from '../backend/translate';
import { translateText } from '../backend/bilingual';

export interface RefineResult { text: string; ko: string }
interface Req { current: string; run(instruction: string): Promise<string>; resolve(v: RefineResult | null): void }
const useRefine = create<{ req?: Req; open(r: Req): void; close(): void }>((set) => ({ open: (req) => set({ req }), close: () => set({ req: undefined }) }));

/** Resolves with the accepted English text and its Korean translation ('' when it was not translated, or the English was edited after), or null when closed. */
export const runRefine = (current: string, run: (instruction: string) => Promise<string>) =>
  new Promise<RefineResult | null>((resolve) => useRefine.getState().open({ current, run, resolve }));

let lastInstruction = '';

export function RefineHost() {
  const T = useT();
  const { req, close } = useRefine();
  const [instr, setInstr] = useState('');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  const [ko, setKo] = useState('');
  const [koBusy, setKoBusy] = useState(false);
  const [err, setErr] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (req) { setInstr(lastInstruction); setOut(null); setKo(''); setErr(''); setTimeout(() => ta.current?.focus(), 0); } }, [req]);
  if (!req) return null;
  const done = (v: RefineResult | null) => { close(); req.resolve(v); };
  // the Korean side: written for the English shown (automatic when Korean translation is on, else the EN → KO button)
  const translate = async (english: string) => {
    setKoBusy(true); setErr('');
    try { setKo(await translateText(english, 'ko', translateLlm(), { protect: await protectWords() })); } catch (e) { setErr((e as Error).message); } finally { setKoBusy(false); }
  };
  const go = async () => {
    if (!instr.trim() || busy) return;
    lastInstruction = instr.trim(); setBusy(true); setErr('');
    try { const r = await req.run(instr.trim()); setOut(r); setKo(''); if (getUseKo()) void translate(r); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="dlg-back" onMouseDown={() => !busy && done(null)}>
      <div className="dlg refine" role="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h3>✎ {T('Refine prompt')}</h3>
        <label className="field-label">{T('What should change?')}</label>
        <textarea ref={ta} value={instr} onChange={(e) => setInstr(e.target.value)} placeholder={T('e.g. make it nighttime, change the coat to red')} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void go(); }} />
        <div className="dlg-btns"><button className="btn" disabled={busy || !instr.trim()} onClick={() => void go()}>{busy ? '…' : out === null ? T('Refine') : T('Refine again')}</button></div>
        {err && <div className="error">{err}</div>}
        {out !== null && (
          <div className="refine-cmp">
            <div><span className="field-label">{T('English (you can edit it before applying)')}</span><textarea className="nodrag" rows={8} value={out} onChange={(e) => { setOut(e.target.value); setKo(''); }} /></div>
            <div style={{ position: 'relative' }}>
              <span className="field-label">{T('Korean (translation)')} {!koBusy && !ko && <button className="btn" onClick={() => void translate(out)}>{T('EN → KO')}</button>}</span>
              <textarea className="nodrag" rows={8} readOnly value={ko} />
              {koBusy && <div className="bil-busy nodrag" style={{ top: 18 }}>⏳ 번역중 (한국어로)…</div>}
            </div>
          </div>
        )}
        <div className="dlg-btns">
          <button className="btn" onClick={() => done(null)} disabled={busy}>{T('Close')}</button>
          {out !== null && <button className="btn primary" onClick={() => done({ text: out, ko })} disabled={busy || koBusy}>{T('Apply')}</button>}
        </div>
      </div>
    </div>
  );
}
