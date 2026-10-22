import { SearchSelect } from './SearchSelect';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type TextareaHTMLAttributes } from 'react';
import type { ParamDef, Primitive } from '../types';
import { useOptions } from '../backend/options';
import { t } from '../i18n';

interface Props { def: ParamDef; value: Primitive; onChange(v: Primitive): void; compact?: boolean }

/** Korean / Japanese / Chinese input: while a character is being composed, keep the text locally and send it on to the card only when the composition ends (a re-render in the middle breaks the composition). */
export function useComposing(value: string, onChange: (v: string) => void) {
  const [draft, setDraft] = useState<string | null>(null);
  return {
    value: draft ?? value,
    composing: draft !== null,
    onChange: (e: { target: { value: string }; nativeEvent: Event }) => {
      const v = e.target.value;
      if ((e.nativeEvent as InputEvent).isComposing) setDraft(v); else { setDraft(null); onChange(v); }
    },
    onCompositionStart: () => setDraft((d) => d ?? value),
    onCompositionEnd: (e: { currentTarget: { value: string } }) => { const v = e.currentTarget.value; setDraft(null); onChange(v); },
  };
}

/**
 * Same as the Simple-mode prompt box: a plain controlled textarea that keeps what you type in its own state. The card is
 * updated 300 ms after you stop (and on blur); updating the card on every keystroke made Korean composition fall apart.
 */
export const ImeTextarea = forwardRef<HTMLTextAreaElement, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & { value: string; onChange(v: string): void; onLive?(v: string): void }>(
  function ImeTextarea({ value, onChange, onLive, onBlur, ...rest }, ref) {
    const inner = useRef<HTMLTextAreaElement>(null);
    const [local, setLocal] = useState(value);
    const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useRef(local); latest.current = local;
    useImperativeHandle(ref, () => inner.current!);
    useEffect(() => { if (!pending.current) setLocal(value); }, [value]);
    const flush = () => { if (pending.current) { clearTimeout(pending.current); pending.current = null; onChange(latest.current); } };
    useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps
    return <textarea {...rest} ref={inner} value={local}
      onChange={(e) => { const v = e.target.value; setLocal(v); latest.current = v; onLive?.(v); if (pending.current) clearTimeout(pending.current); pending.current = setTimeout(flush, 300); }}
      onBlur={(e) => { flush(); onBlur?.(e); }} />;
  });

/** a card nobody resized grows with its text up to this height, then the box scrolls (a card the user sized by hand ignores it) */
const AUTO_MAX_H = 420;

/** textarea that grows with its content and stops canvas shortcuts while typing */
export function AutoText({ value, onChange, placeholder, rows = 3 }: { value: string; onChange(v: string): void; placeholder?: string; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [names, setNames] = useState<string[]>([]);
  const [sug, setSug] = useState<{ list: string[]; at: number; idx: number } | null>(null);
  // The browser sizes the box itself (field-sizing); resetting style.height on every keystroke broke Korean composition.
  const native = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');
  useEffect(() => {
    const el = ref.current; if (!el || native) return;
    el.style.height = 'auto'; el.style.height = `${Math.min(AUTO_MAX_H, Math.max(el.scrollHeight, rows * 18))}px`;
  }, [value, rows, native]);
  useEffect(() => { let live = true; void import('../backend/assetlib').then((m) => m.mentionNames()).then((n) => { if (live) setNames(n); }); return () => { live = false; }; }, []);
  // typing @ opens the Asset Library names
  const look = (text: string, caret: number) => {
    const m = /(^|\s)@([\w\u3131-\uD79D]*)$/.exec(text.slice(0, caret));
    if (!m || !names.length) { setSug(null); return; }
    const q = m[2].toLowerCase(); const list = names.filter((n) => n.toLowerCase().startsWith(q) && n.toLowerCase() !== q).slice(0, 8);
    setSug(list.length ? { list, at: caret - m[2].length - 1, idx: 0 } : null);
  };
  const pick = (name: string) => {
    const el = ref.current; if (!el || !sug) return;
    const caret = el.selectionStart; const next = `${value.slice(0, sug.at)}@${name} ${value.slice(caret)}`;
    onChange(next); setSug(null);
    requestAnimationFrame(() => { const pos = sug.at + name.length + 2; el.setSelectionRange(pos, pos); el.focus(); });
  };
  return (
    <div className="mention-wrap">
      <ImeTextarea ref={ref} className="nodrag nowheel" rows={rows} value={value} placeholder={placeholder} spellCheck={false}
        style={native ? ({ fieldSizing: 'content', minHeight: rows * 18, maxHeight: AUTO_MAX_H } as React.CSSProperties) : undefined}
        onChange={onChange} onLive={(v) => { const el = ref.current; if (el) look(v, el.selectionStart); }}
        onBlur={() => setTimeout(() => setSug(null), 150)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (!sug) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setSug({ ...sug, idx: (sug.idx + 1) % sug.list.length }); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSug({ ...sug, idx: (sug.idx + sug.list.length - 1) % sug.list.length }); }
          else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(sug.list[sug.idx]); }
          else if (e.key === 'Escape') setSug(null);
        }} />
      {sug && <div className="mention-pop nodrag">{sug.list.map((n, i) => <button key={n} className={i === sug.idx ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); pick(n); }}>@{n}</button>)}</div>}
    </div>
  );
}

function SelectControl({ def, value, onChange }: Props) {
  if (def.control.kind !== 'select') return null;
  const opts = useOptions(def.control.source, def.control.options);
  const list = opts.includes(String(value)) ? opts : [String(value), ...opts];
  // long lists (LoRAs, models) get a search field on top; short ones (aspect ratio ...) stay a plain list
  return <SearchSelect value={String(value)} options={list} labels={def.control.labels} onChange={onChange} searchAt={def.control.source ? 0 : 8} />;
}

function TextInput({ value, onChange }: { value: string; onChange(v: string): void }) {
  const ime = useComposing(value, onChange);
  return <input className="nodrag" type="text" value={ime.value} onChange={ime.onChange} onCompositionStart={ime.onCompositionStart} onCompositionEnd={ime.onCompositionEnd} onKeyDown={(e) => e.stopPropagation()} />;
}

export function ParamControl({ def, value, onChange }: Props) {
  const c = def.control;
  const [draft, setDraft] = useState<string | null>(null);
  switch (c.kind) {
    case 'text':
      return c.multiline
        ? <AutoText value={String(value)} onChange={onChange} placeholder={c.placeholder} />
        : <TextInput value={String(value)} onChange={onChange} />;
    case 'number':
      return <input className="nodrag" type="number" value={draft ?? String(value)} min={c.min} max={c.max} step={c.step ?? 1}
        onChange={(e) => { setDraft(e.target.value); const n = parseFloat(e.target.value); if (!Number.isNaN(n)) onChange(n); }}
        onBlur={() => setDraft(null)} onKeyDown={(e) => e.stopPropagation()} />;
    case 'slider':
      return (
        <div className="slider nodrag">
          <input type="range" min={c.min} max={c.max} step={c.step ?? 1} value={Number(value)} onChange={(e) => onChange(parseFloat(e.target.value))} />
          <input className="slider-num" type="number" min={c.min} max={c.max} step={c.step ?? 1} value={Number(value)}
            onChange={(e) => { const n = parseFloat(e.target.value); if (!Number.isNaN(n)) onChange(n); }} onKeyDown={(e) => e.stopPropagation()} />
        </div>
      );
    case 'select': return <SelectControl def={def} value={value} onChange={onChange} />;
    case 'toggle':
      return <button type="button" className={`switch nodrag ${value ? 'on' : ''}`} onClick={() => onChange(!value)} aria-pressed={!!value}><i /></button>;
    case 'seed': {
      const n = Number(value);
      return (
        <div className="seed nodrag">
          <input type="number" value={n < 0 ? '' : n} placeholder="random" onChange={(e) => onChange(e.target.value === '' ? -1 : Math.max(0, parseInt(e.target.value, 10) || 0))} onKeyDown={(e) => e.stopPropagation()} />
          <button type="button" title="Random" className={n < 0 ? 'on' : ''} onClick={() => onChange(n < 0 ? Math.floor(Math.random() * 1e9) : -1)}>⚄</button>
        </div>
      );
    }
    default: return null;
  }
}

export function Field({ def, value, onChange }: Props) {
  const wide = def.control.kind === 'text' && def.control.multiline;
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span className="field-label">{t(def.label)}</span>
      <ParamControl def={def} value={value} onChange={onChange} />
    </label>
  );
}
