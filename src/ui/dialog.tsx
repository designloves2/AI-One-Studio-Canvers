// In-app replacements for confirm() / prompt() / alert(): the desktop app's embedded browser auto-dismisses native dialogs.
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

type Req = { kind: 'confirm' | 'prompt' | 'alert'; message: string; resolve: (v: any) => void };
const useDialog = create<{ req?: Req; open(r: Req): void; close(): void }>((set) => ({ open: (req) => set({ req }), close: () => set({ req: undefined }) }));

export const askConfirm = (message: string) => new Promise<boolean>((resolve) => useDialog.getState().open({ kind: 'confirm', message, resolve }));
export const askText = (message: string) => new Promise<string | null>((resolve) => useDialog.getState().open({ kind: 'prompt', message, resolve }));
export const notify = (message: string) => new Promise<void>((resolve) => useDialog.getState().open({ kind: 'alert', message, resolve }));

export function DialogHost() {
  const { req, close } = useDialog();
  const [text, setText] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (req) { setText(''); setTimeout(() => ref.current?.focus(), 0); } }, [req]);
  if (!req) return null;
  const done = (v: any) => { close(); req.resolve(v); };
  const cancel = () => done(req.kind === 'confirm' ? false : req.kind === 'prompt' ? null : undefined);
  const ok = () => done(req.kind === 'confirm' ? true : req.kind === 'prompt' ? text : undefined);
  return (
    <div className="dlg-back dlg-top" onMouseDown={cancel}>
      <div className="dlg" role="dialog" onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') cancel(); if (e.key === 'Enter') ok(); }}>
        <p>{req.message}</p>
        {req.kind === 'prompt' && <input ref={ref} value={text} onChange={(e) => setText(e.target.value)} />}
        <div className="dlg-btns">
          {req.kind !== 'alert' && <button className="btn" onClick={cancel}>취소 / Cancel</button>}
          <button className="btn primary" autoFocus={req.kind !== 'prompt'} onClick={ok}>확인 / OK</button>
        </div>
      </div>
    </div>
  );
}
