// Live Canvas chat (left panel): describe what you want, the LLM lays the cards out on the canvas.
import { useEffect, useRef, useState } from 'react';
import { liveTurn, type LiveMsg } from '../backend/liveCanvas';
import { useGraph } from '../store/graph';
import { useSettings } from '../store/settings';
import { useT } from '../i18n';

const KEY = 'canvers_live_chat_v1';
const load = (): LiveMsg[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v.slice(-60) : []; } catch { return []; } };

export function LivePanel() {
  const T = useT();
  const [msgs, setMsgs] = useState<LiveMsg[]>(load);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const backend = useSettings((s) => (s.live.same ? s.llm.backend : s.live.llm.backend));
  const own = useSettings((s) => !s.live.same);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-60))); } catch { /* full */ } end.current?.scrollIntoView({ block: 'end' }); }, [msgs, busy]);

  const send = async () => {
    const t = text.trim(); if (!t || busy) return;
    const history = msgs; setText(''); setBusy(true);
    setMsgs([...history, { role: 'user', text: t }]);
    try {
      const r = await liveTurn(history, t, setStatus);
      setMsgs((m) => [...m, { role: 'assistant', text: r.say, notes: r.notes }]);
      if (r.notes.length) useGraph.setState((s) => ({ fitTick: s.fitTick + 1 }));
    } catch (e) { setMsgs((m) => [...m, { role: 'assistant', text: (e as Error).message, error: true }]); }
    finally { setBusy(false); setStatus(''); }
  };

  const examples = [T('Make a 30-second ad: 4 shot prompts and the reference image prompts'), T('Connect one video generate card to each prompt'), T('Tidy up the cards by their wires'), T('Group the same kind of cards together')];
  return (
    <div className="live-panel">
      <div className="live-log">
        {!msgs.length && (
          <div className="live-hint">
            <p>{T('Tell me what to build and I will lay the cards out on the canvas.')}</p>
            <div className="live-examples">{examples.map((e) => <button key={e} className="chip" onClick={() => setText(e)}>{e}</button>)}</div>
            <small className="muted">{T(own ? 'Uses the Live Canvas LLM from Settings' : 'Uses the LLM chosen in Settings')} ({backend})</small>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`live-msg ${m.role}${m.error ? ' err' : ''}`}>
            <div className="bubble-txt">{m.text}</div>
            {m.notes?.length ? <div className="live-notes">{m.notes.map((n) => <span key={n} className="chip">✓ {n}</span>)}</div> : null}
          </div>
        ))}
        {busy && <div className="live-msg assistant"><div className="bubble-txt muted">⏳ {status || T('thinking…')}</div></div>}
        <div ref={end} />
      </div>
      <div className="live-input">
        <textarea value={text} rows={3} placeholder={T('Describe what to put on the canvas…')} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
          if (e.ctrlKey || e.metaKey) { // Ctrl/Cmd+Enter = new line (Shift+Enter too); a plain Enter sends
            e.preventDefault(); const t = e.currentTarget, a = t.selectionStart, b = t.selectionEnd; setText(text.slice(0, a) + '\n' + text.slice(b)); requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = a + 1; });
          } else if (!e.shiftKey) { e.preventDefault(); void send(); }
        }} />
        <div className="panel-row">
          <button className="btn" disabled={busy} onClick={() => useGraph.getState().undo()} title={T('Undo the last change on the canvas')}>↶ {T('Undo')}</button>
          <button className="btn" disabled={busy || !msgs.length} onClick={() => setMsgs([])}>{T('Clear chat')}</button>
          <span className="spacer" />
          <button className="btn primary" disabled={busy || !text.trim()} onClick={() => void send()}>{T('Send')}</button>
        </div>
      </div>
    </div>
  );
}
