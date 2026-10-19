import { useEffect, useMemo, useRef, useState } from 'react';
import { REGISTRY, CATEGORIES } from '../registry';
import { useGraph } from '../store/graph';
import { t, useT } from '../i18n';

/** Searchable node picker (Tab / double-click). Enter or click adds the node at the given spot. */
export function NodeMenu({ at, flow, onClose }: { at: { x: number; y: number }; flow: { x: number; y: number }; onClose(): void }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const T = useT();
  useEffect(() => ref.current?.focus(), []);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return REGISTRY.filter((d) => !s || d.title.toLowerCase().includes(s) || t(d.title).toLowerCase().includes(s) || d.category.toLowerCase().includes(s) || (d.description ?? '').toLowerCase().includes(s));
  }, [q]);

  const add = (defId: string) => { useGraph.getState().addNode(defId, flow.x, flow.y); onClose(); };

  return (
    <div className="menu-shade" onMouseDown={onClose}>
      <div className="node-menu" style={{ left: Math.min(at.x, window.innerWidth - 300), top: Math.min(at.y, window.innerHeight - 420) }} onMouseDown={(e) => e.stopPropagation()}>
        <input ref={ref} value={q} placeholder={T('Search nodes…')} onChange={(e) => { setQ(e.target.value); setIdx(0); }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
            if (e.key === 'Enter' && items[idx]) add(items[idx].id);
          }} />
        <div className="menu-list">
          {CATEGORIES.map((cat) => {
            const rows = items.filter((d) => d.category === cat);
            if (!rows.length) return null;
            return (
              <div key={cat}>
                <div className="menu-cat">{T(cat)}</div>
                {rows.map((d) => (
                  <button key={d.id} className={items[idx]?.id === d.id ? 'active' : ''} onMouseEnter={() => setIdx(items.indexOf(d))} onClick={() => add(d.id)}>
                    <span>{T(d.title)}</span>{d.planned && <em>{T('planned')}</em>}
                  </button>
                ))}
              </div>
            );
          })}
          {!items.length && <div className="empty">{T('Nothing here yet.')}</div>}
        </div>
      </div>
    </div>
  );
}
