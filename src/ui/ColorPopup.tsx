// Custom card colour popup: left = background colour, right = text colour. Each side has its own palette
// (saturation/brightness square + hue bar + hex), "save colour" and saved colours (click = pick, right-click = delete with a confirmation).
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { useCustomColors, type ColorKind } from '../store/customColors';
import { askConfirm } from './dialog';
import { useT } from '../i18n';

type Pick = (bg: string | undefined, text: string | undefined) => void;
const usePopup = create<{ onPick?: Pick; open: boolean; n: number; show(onPick: Pick): void; hide(): void }>((set) => ({
  open: false, n: 0, show: (onPick) => set((s) => ({ open: true, onPick, n: s.n + 1 })), hide: () => set({ open: false, onPick: undefined }),
}));
export const openColorPopup = (onPick: Pick) => usePopup.getState().show(onPick);

type HSV = { h: number; s: number; v: number };
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
function hsvToHex({ h, s, v }: HSV): string {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return '#' + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
function hexToHsv(hex: string): HSV {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return { h: 260, s: 0.5, v: 0.4 };
  const n = parseInt(m[1], 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: max === 0 ? 0 : d / max, v: max };
}

/** One palette column. `value` is the chosen colour (undefined = default); `onChange` reports edits. */
function Palette({ kind, title, value, onChange }: { kind: ColorKind; title: string; value: string | undefined; onChange(c: string | undefined): void }) {
  const T = useT();
  const saved = useCustomColors((s) => s[kind]);
  const { add, remove } = useCustomColors.getState();
  const [hsv, setHsv] = useState<HSV>(hexToHsv(value ?? (kind === 'bg' ? '#3a2a5c' : '#ffffff')));
  const [hex, setHex] = useState(value ?? (kind === 'bg' ? '#3a2a5c' : '#ffffff'));
  const sq = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const set = (n: HSV) => { const h = hsvToHex(n); setHsv(n); setHex(h); onChange(h); };
  const choose = (h: string) => { setHsv(hexToHsv(h)); setHex(h); onChange(h); };
  const drag = (el: React.RefObject<HTMLDivElement>, apply: (x: number, y: number) => void) => (e: React.PointerEvent) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => { const r = el.current!.getBoundingClientRect(); apply(clamp((ev.clientX - r.left) / r.width), clamp((ev.clientY - r.top) / r.height)); };
    move(e.nativeEvent);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const del = async (c: string) => { if (await askConfirm(`${T('Delete this saved colour?')} ${c}`)) remove(kind, c); };
  return (
    <div className="cp-col">
      <div className="cp-title">{title}</div>
      <div ref={sq} className="cp-square" style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }} onPointerDown={drag(sq, (x, y) => set({ ...hsv, s: x, v: 1 - y }))}>
        <i style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
      </div>
      <div ref={bar} className="cp-hue" onPointerDown={drag(bar, (x) => set({ ...hsv, h: x * 360 }))}>
        <i style={{ left: `${(hsv.h / 360) * 100}%` }} />
      </div>
      <div className="cp-row">
        <span className="cp-preview" style={{ background: value ?? 'transparent' }} title={value ? hex : T('Default')} />
        <input value={hex} onChange={(e) => { setHex(e.target.value); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) { setHsv(hexToHsv(e.target.value)); onChange(e.target.value); } }} spellCheck={false} />
      </div>
      <div className="cp-row">
        <button className="btn" onClick={() => add(kind, hex)}>＋ {T(kind === 'bg' ? 'Save background colour' : 'Save text colour')}</button>
        {kind === 'text' && <button className="btn" onClick={() => onChange(undefined)} title={T('Use the theme text colour')}>{T('Default')}</button>}
      </div>
      <div className="cp-saved-head">{T('Saved colours')} <small className="muted">({T('right-click to delete')})</small></div>
      <div className="cp-saved">
        {saved.map((c) => <i key={c} title={c} style={{ background: c }} onClick={() => choose(c)} onContextMenu={(e) => { e.preventDefault(); void del(c); }} />)}
        {!saved.length && <span className="muted">{T('Nothing saved yet')}</span>}
      </div>
    </div>
  );
}

export function ColorPopupHost() {
  const T = useT();
  const { open, onPick, hide, n } = usePopup();
  const [bg, setBg] = useState<string | undefined>('#3a2a5c');
  const [text, setText] = useState<string | undefined>(undefined);
  useEffect(() => { if (open) { setBg('#3a2a5c'); setText(undefined); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open, hide]);
  if (!open) return null;
  return (
    <div className="dlg-back" onMouseDown={hide}>
      <div className="dlg colorpop" role="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{T('Custom colour')}</h3>
        <div className="cp-cols">
          <Palette key={`bg${n}`} kind="bg" title={T('Background colour')} value={bg} onChange={setBg} />
          <Palette key={`tx${n}`} kind="text" title={T('Text colour')} value={text} onChange={setText} />
        </div>
        <div className="cp-sample" style={{ background: bg ?? 'var(--bg2)', color: text ?? 'var(--fg)' }}>{T('Sample card text')} — Aa 가나다</div>
        <div className="dlg-btns">
          <button className="btn" onClick={hide}>{T('Close')}</button>
          <button className="btn primary" onClick={() => { onPick?.(bg, text); hide(); }}>{T('Apply')}</button>
        </div>
      </div>
    </div>
  );
}
