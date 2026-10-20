// Live Canvas chat (left panel): describe what you want, the LLM reads the canvas and builds / edits / arranges it.
// Extras: production templates, follow-up suggestions, per-answer undo, attach an image (it becomes a card and is described for the LLM).
import { useEffect, useRef, useState } from 'react';
import { liveTurn, type LiveMsg } from '../backend/liveCanvas';
import { liveLlmSettings, runLlm } from '../backend/llm';
import { importFile } from '../engine/run';
import { useGraph } from '../store/graph';
import { useSettings } from '../store/settings';
import { useT } from '../i18n';

const KEY = 'canvers_live_chat_v1';
const load = (): LiveMsg[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v.slice(-60) : []; } catch { return []; } };

/** quick starts: [label, text to put in the input]. "…" is where the user types the topic. */
const TEMPLATES: [string, string][] = [
  ['📣 광고 영상', '… 제품의 30초 광고 영상 만들 준비해줘.'],
  ['🎵 뮤직비디오', '… 분위기의 노래 뮤직비디오 만들어줘. 가사와 음악까지 준비해줘.'],
  ['🎒 브이로그', '… 브이로그 만들 준비해줘.'],
  ['📱 숏폼 (9:16)', '… 주제로 9:16 숏폼 영상 만들 준비해줘. 첫 샷은 훅으로.'],
  ['🎬 예고편/티저', '… 영화의 예고편(티저) 만들 준비해줘.'],
  ['🖼 스토리보드', '… 이야기의 스토리보드(이미지 프레임)를 만들어줘.'],
  ['🧑‍🎨 캐릭터 설정', '… 캐릭터의 캐릭터 시트와 설정 카드를 만들어줘.'],
  ['🛍 제품 이미지 세트', '… 제품의 포스터/썸네일/제품 이미지 세트를 변형 여러 개로 만들어줘.'],
  ['📚 설명 영상', '… 를 설명하는 60초 영상 만들 준비해줘.'],
  ['🔁 SNS 광고 세트', '지금 있는 샷을 16:9, 9:16, 1:1 버전으로 복제해서 세트로 만들어줘.'],
  ['✨ 영상 후처리', '가져온 영상을 업스케일하고 노이즈 제거, 프레임 보간까지 후처리 카드로 연결해줘.'],
  ['🧹 캔버스 정리', '카드들을 연결 흐름대로 보기 좋게 정렬해줘.'],
];

export function LivePanel() {
  const T = useT();
  const [msgs, setMsgs] = useState<LiveMsg[]>(load);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [showTpl, setShowTpl] = useState(false);
  const [attached, setAttached] = useState<{ cardId: string; name: string; caption: string }[]>([]);
  const undoers = useRef(new Map<number, () => void>());     // per answer, in memory only
  const backend = useSettings((s) => (s.live.same ? s.llm.backend : s.live.llm.backend));
  const own = useSettings((s) => !s.live.same);
  const end = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-60))); } catch { /* full */ } end.current?.scrollIntoView({ block: 'end' }); }, [msgs, busy]);

  const send = async (override?: string) => {
    let t = (override ?? text).trim(); if (!t || busy) return;
    const history = msgs; setText(''); setBusy(true);
    if (attached.length) t += '\n' + attached.map((a) => `(attached image → card ${a.cardId}, "${a.name}"${a.caption ? `: ${a.caption}` : ''})`).join('\n');
    setAttached([]);
    setMsgs([...history, { role: 'user', text: t }]);
    try {
      const r = await liveTurn(history, t, setStatus);
      undoers.current.set(history.length + 1, r.undo);
      setMsgs((m) => [...m, { role: 'assistant', text: r.say, notes: r.notes, suggest: r.suggest }]);
      if (r.notes.length) useGraph.setState((s) => ({ fitTick: s.fitTick + 1 }));
    } catch (e) { setMsgs((m) => [...m, { role: 'assistant', text: (e as Error).message, error: true }]); }
    finally { setBusy(false); setStatus(''); }
  };

  const attach = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of [...files].filter((x) => x.type.startsWith('image/')).slice(0, 4)) {
      setStatus('reading the image…'); setBusy(true);
      try {
        const a = await importFile(f);
        const g = useGraph.getState(); const cur = g.nodes.filter((n) => !n.members);
        const id = g.addNode('import', cur.length ? Math.min(...cur.map((n) => n.x)) - 380 : 0, cur.length ? Math.min(...cur.map((n) => n.y)) : 0, { title: f.name } as never);
        g.setResults(id, [a]);
        let caption = '';
        try { caption = (await runLlm({ system: 'Describe this image in one or two short sentences for a video director: subject, look, colours, mood.', prompt: 'Describe this image.', images: [a], max_tokens: 200, llm: liveLlmSettings() })).slice(0, 240); } catch { /* the backend may not see images */ }
        setAttached((x) => [...x, { cardId: id, name: f.name, caption }]);
      } catch { /* upload failed */ }
    }
    setBusy(false); setStatus('');
  };

  const examples = [T('Make a 30-second ad: 4 shot prompts and the reference image prompts'), T('Connect one video generate card to each prompt'), T('Tidy up the cards by their wires'), T('Group the same kind of cards together')];
  const undoAnswer = (i: number) => { undoers.current.get(i)?.(); undoers.current.delete(i); setMsgs((m) => m.map((x, k) => (k === i ? { ...x, notes: [...(x.notes ?? []), 'undone'], suggest: [] } : x))); };

  return (
    <div className="live-panel">
      <div className="live-log">
        {!msgs.length && (
          <div className="live-hint">
            <p>{T('Tell me what to build and I will lay the cards out on the canvas.')}</p>
            <div className="live-tpl">{TEMPLATES.map(([label, t]) => <button key={label} className="chip" onClick={() => setText(t)} title={t}>{label}</button>)}</div>
            <p className="muted">{T('I plan the whole production myself — concept, shots, prompts, references, wiring. Just name the project.')}</p>
            <div className="live-examples">{examples.map((e) => <button key={e} className="chip" onClick={() => setText(e)}>{e}</button>)}</div>
            <small className="muted">{T(own ? 'Uses the Live Canvas LLM from Settings' : 'Uses the LLM chosen in Settings')} ({backend})</small>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`live-msg ${m.role}${m.error ? ' err' : ''}`}>
            <div className="bubble-txt">{m.text}</div>
            {m.notes?.length ? <div className="live-notes">{m.notes.map((n) => <span key={n} className="chip">✓ {n}</span>)}{undoers.current.has(i) && !m.notes.includes('undone') && <button className="chip undo" onClick={() => undoAnswer(i)}>↶ {T('Undo this answer')}</button>}</div> : null}
            {m.suggest?.length ? <div className="live-suggest">{m.suggest.map((s) => <button key={s} className="chip" disabled={busy} onClick={() => void send(s)}>💡 {s}</button>)}</div> : null}
          </div>
        ))}
        {busy && <div className="live-msg assistant"><div className="bubble-txt muted">⏳ {status || T('thinking…')}</div></div>}
        <div ref={end} />
      </div>
      <div className="live-input">
        {showTpl && msgs.length > 0 && <div className="live-tpl">{TEMPLATES.map(([label, t]) => <button key={label} className="chip" onClick={() => { setText(t); setShowTpl(false); }} title={t}>{label}</button>)}</div>}
        {attached.length > 0 && <div className="live-attached">{attached.map((a) => <span key={a.cardId} className="chip">🖼 {a.name}<button onClick={() => setAttached((x) => x.filter((y) => y.cardId !== a.cardId))}>✕</button></span>)}</div>}
        <textarea value={text} rows={3} placeholder={T('Describe what to put on the canvas…')} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
          if (e.ctrlKey || e.metaKey) { // Ctrl/Cmd+Enter = new line (Shift+Enter too); a plain Enter sends
            e.preventDefault(); const t = e.currentTarget, a = t.selectionStart, b = t.selectionEnd; setText(text.slice(0, a) + '\n' + text.slice(b)); requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = a + 1; });
          } else if (!e.shiftKey) { e.preventDefault(); void send(); }
        }} />
        <div className="panel-row">
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { void attach(e.target.files); e.target.value = ''; }} />
          <button className="btn" disabled={busy} onClick={() => file.current?.click()} title={T('Attach an image: it becomes a card and the AI looks at it')}>📎</button>
          <button className="btn" disabled={busy} onClick={() => setShowTpl(!showTpl)} title={T('Production templates')}>⚡</button>
          <button className="btn" disabled={busy} onClick={() => useGraph.getState().undo()} title={T('Undo the last change on the canvas')}>↶</button>
          <button className="btn" disabled={busy || !msgs.length} onClick={() => { undoers.current.clear(); setMsgs([]); }}>{T('Clear chat')}</button>
          <span className="spacer" />
          <button className="btn primary" disabled={busy || !text.trim()} onClick={() => void send()}>{T('Send')}</button>
        </div>
      </div>
    </div>
  );
}
