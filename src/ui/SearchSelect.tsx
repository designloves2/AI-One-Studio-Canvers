import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n';

/**
 * A drop-down with a search field on top: type to filter the list (every word must match the name or its folder).
 * Used for the LoRA / model / combo lists on the cards. The list is drawn in its own layer so a card or panel never clips it.
 */
export function SearchSelect({ value, options, labels, onChange, searchAt = 8, title }: {
  value: string; options: string[]; labels?: Record<string, string>; onChange(v: string): void;
  /** show the search field when the list has at least this many entries (0 = always) */
  searchAt?: number; title?: string;
}) {
  const T = useT();
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxH: number }>({ left: 0, top: 0, width: 240, maxH: 320 });

  const label = (o: string) => labels?.[o] ?? o;
  const searchable = options.length >= searchAt;
  const list = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return terms.length ? options.filter((o) => { const h = `${label(o)} ${o}`.toLowerCase(); return terms.every((t) => h.includes(t)); }) : options;
  }, [options, q, labels]);  // eslint-disable-line react-hooks/exhaustive-deps

  const show = () => {
    const r = btn.current?.getBoundingClientRect(); if (!r) return;
    const chrome = (searchable ? 46 : 12) + 4;               // search field + padding around the list
    const below = innerHeight - r.bottom - 12, above = r.top - 12;
    const up = below < 230 && above > below;                 // open on the side with more room
    const room = Math.max(120, up ? above : below);
    const maxH = Math.max(110, Math.min(380, room - chrome));
    const top = up ? Math.max(8, r.top - (maxH + chrome) - 4) : Math.min(r.bottom + 4, Math.max(8, innerHeight - (maxH + chrome) - 8));
    const width = Math.max(r.width, 300);
    setPos({ left: Math.max(8, Math.min(r.left, innerWidth - width - 8)), top, width, maxH });
    setQ(''); setHi(Math.max(0, options.indexOf(value))); setOpen(true);
  };
  const choose = (o: string) => { setOpen(false); if (o !== value) onChange(o); btn.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [open]);
  useEffect(() => { setHi(0); }, [q]);
  useEffect(() => { if (open) box.current?.querySelector<HTMLElement>('[data-hi="1"]')?.scrollIntoView({ block: 'nearest' }); }, [hi, open]);

  const key = (e: React.KeyboardEvent) => {
    e.stopPropagation();   // the canvas has its own shortcuts
    if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[hi] !== undefined) choose(list[hi]); }
  };

  return (
    <>
      <button ref={btn} type="button" className="ssel-btn nodrag" title={title ?? value} onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); show(); } }}>
        <span>{label(value)}</span><i>▾</i>
      </button>
      {open && createPortal(
        <div ref={box} className="ssel-pop nodrag nowheel" style={{ left: pos.left, top: pos.top, width: pos.width }} onKeyDown={key}>
          {searchable && <input className="ssel-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${T('Search')}…  (${list.length}/${options.length})`} />}
          <div className="ssel-list" style={{ maxHeight: pos.maxH }} tabIndex={searchable ? -1 : 0} ref={(el) => { if (el && !searchable) el.focus(); }}>
            {list.map((o, i) => (
              <div key={o} data-hi={i === hi ? '1' : undefined} className={`ssel-item${o === value ? ' cur' : ''}${i === hi ? ' hi' : ''}`} title={o}
                onMouseEnter={() => setHi(i)} onClick={() => choose(o)}>{label(o)}</div>
            ))}
            {!list.length && <div className="ssel-empty">{T('No match')}</div>}
          </div>
        </div>, document.body)}
    </>
  );
}
