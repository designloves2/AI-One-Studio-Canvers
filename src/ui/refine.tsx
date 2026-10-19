// Refine (ONE STUDIO "Refine"): type what to change in an existing prompt -> LLM -> original / revised side by side -> Apply, Retry or Close.
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { useT } from '../i18n';

interface Req { current: string; run(instruction: string): Promise<string>; resolve(v: string | null): void }
const useRefine = create<{ req?: Req; open(r: Req): void; close(): void }>((set) => ({ open: (req) => set({ req }), close: () => set({ req: undefined }) }));

/** Resolves with the accepted text, or null when closed. */
export const runRefine = (current: string, run: (instruction: string) => Promise<string>) =>
  new Promise<string | null>((resolve) => useRefine.getState().open({ current, run, resolve }));

let lastInstruction = '';

export function RefineHost() {
  const T = useT();
  const { req, close } = useRefine();
  const [instr, setInstr] = useState('');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (req) { setInstr(lastInstruction); setOut(null); setErr(''); setTimeout(() => ta.current?.focus(), 0); } }, [req]);
  if (!req) return null;
  const done = (v: string | null) => { close(); req.resolve(v); };
  const go = async () => {
    if (!instr.trim() || busy) return;
    lastInstruction = instr.trim(); setBusy(true); setErr('');
    try { setOut(await req.run(instr.trim())); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
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
            <div><span className="field-label">{T('Original')}</span><pre>{req.current}</pre></div>
            <div><span className="field-label">{T('Revised')}</span><pre>{out}</pre></div>
          </div>
        )}
        <div className="dlg-btns">
          <button className="btn" onClick={() => done(null)} disabled={busy}>{T('Close')}</button>
          {out !== null && <button className="btn primary" onClick={() => done(out)}>{T('Apply')}</button>}
        </div>
      </div>
    </div>
  );
}
