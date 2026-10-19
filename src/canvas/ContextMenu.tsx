import { useEffect, useRef } from 'react';
import { useT } from '../i18n';

export interface CtxItem { swatches?: { value: string | undefined; title: string }[]; onPick?: (v: string | undefined) => void; label: string; shortcut?: string; danger?: boolean; disabled?: boolean; divider?: boolean; onClick?: () => void }

/** Right-click menu for cards, selections and the empty canvas. */
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: CtxItem[]; onClose(): void }) {
  const T = useT();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', away); window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('mousedown', away); window.removeEventListener('keydown', esc); };
  }, [onClose]);
  return (
    <div ref={box} className="ctx-menu" style={{ left: Math.min(x, window.innerWidth - 230), top: Math.min(y, window.innerHeight - items.length * 34 - 16) }}>
      {items.map((it, i) => (
        <div key={i}>
          {it.divider && <hr />}
          {it.swatches ? (
            <div className="ctx-swatches"><span>{T(it.label)}</span>{it.swatches.map((sw, k) => <i key={k} title={sw.title} style={{ background: sw.value ?? 'var(--bg2)' }} className={sw.value ? '' : 'none'} onClick={() => { it.onPick?.(sw.value); onClose(); }} />)}</div>
          ) : <button className={it.danger ? 'danger' : ''} disabled={it.disabled} onClick={() => { it.onClick?.(); onClose(); }}>
            <span>{T(it.label)}</span>{it.shortcut && <kbd>{it.shortcut}</kbd>}
          </button>}
        </div>
      ))}
    </div>
  );
}
