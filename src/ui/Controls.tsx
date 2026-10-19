import { useEffect, useRef, useState } from 'react';
import type { ParamDef, Primitive } from '../types';
import { useOptions } from '../backend/options';
import { t } from '../i18n';

interface Props { def: ParamDef; value: Primitive; onChange(v: Primitive): void; compact?: boolean }

/** textarea that grows with its content and stops canvas shortcuts while typing */
export function AutoText({ value, onChange, placeholder, rows = 3 }: { value: string; onChange(v: string): void; placeholder?: string; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = `${Math.min(360, Math.max(el.scrollHeight, rows * 18))}px`;
  }, [value, rows]);
  return <textarea ref={ref} className="nodrag nowheel" rows={rows} value={value} placeholder={placeholder} spellCheck={false}
    onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />;
}

function SelectControl({ def, value, onChange }: Props) {
  if (def.control.kind !== 'select') return null;
  const opts = useOptions(def.control.source, def.control.options);
  const list = opts.includes(String(value)) ? opts : [String(value), ...opts];
  return (
    <select className="nodrag" value={String(value)} onChange={(e) => onChange(e.target.value)}>
      {list.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function ParamControl({ def, value, onChange }: Props) {
  const c = def.control;
  const [draft, setDraft] = useState<string | null>(null);
  switch (c.kind) {
    case 'text':
      return c.multiline
        ? <AutoText value={String(value)} onChange={onChange} placeholder={c.placeholder} />
        : <input className="nodrag" type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />;
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
