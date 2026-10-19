import { useEffect, useMemo, useRef, useState } from 'react';
import { REGISTRY, CATEGORIES, byId, compatible } from '../registry';
import { useGraph } from '../store/graph';
import { t, useT } from '../i18n';

/** Searchable node picker (Tab / double-click). Enter or click adds the node at the given spot. */
export interface Pending { node: string; handle: string; dir: 'out' | 'in'; type: string }

export function NodeMenu({ at, flow, pending, onClose }: { at: { x: number; y: number }; flow: { x: number; y: number }; pending?: Pending; onClose(): void }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const T = useT();
  useEffect(() => ref.current?.focus(), []);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return REGISTRY.filter((d) => (!pending || (pending.dir === 'out' ? d.inputs.some((i) => compatible(pending.type, i.type)) : d.outputs.some((o) => compatible(o.type, pending.type)))) && (!s || d.title.toLowerCase().includes(s) || t(d.title).toLowerCase().includes(s) || d.category.toLowerCase().includes(s) || (d.description ?? '').toLowerCase().includes(s)));
  }, [q]);

  // with one card selected, the new card lands to its right and is wired up to it
  const add = (defId: string) => {
    const g = useGraph.getState();
    if (pending) {
      // a wire was dropped on empty canvas: the new card is created there and wired to it
      const b = byId.get(defId)!;
      const id = g.addNode(defId, pending.dir === 'out' ? flow.x : flow.x - 340, flow.y - 20);
      if (pending.dir === 'out') {
        const ins = b.inputs.filter((i) => compatible(pending.type, i.type)).sort((x, y) => Number(x.type === 'any') - Number(y.type === 'any'));
        for (const i of ins) if (useGraph.getState().connect({ source: pending.node, sourceHandle: pending.handle, target: id, targetHandle: i.id })) break;
      } else {
        for (const o of b.outputs.filter((o) => compatible(o.type, pending.type))) if (useGraph.getState().connect({ source: id, sourceHandle: o.id, target: pending.node, targetHandle: pending.handle })) break;
      }
      onClose(); return;
    }
    const from = g.selected.length === 1 ? g.nodes.find((n) => n.id === g.selected[0] && n.defId !== 'group') : undefined;
    const id = g.addNode(defId, from ? from.x + (from.w ?? 300) + 80 : flow.x, from ? from.y : flow.y);
    if (from) {
      const a = byId.get(from.defId), b = byId.get(defId);
      const taken = new Set(useGraph.getState().edges.filter((e) => e.source === from.id).map((e) => `${e.sourceHandle}`));
      const outs = [...(a?.outputs ?? [])].sort((x, y) => Number(taken.has(x.id)) - Number(taken.has(y.id)));
      const ins = b?.inputs ?? [];
      const pairs = outs.flatMap((o) => ins.filter((i) => compatible(o.type, i.type)).map((i) => [o, i] as const)).sort((p, q) => Number(p[1].type === 'any') - Number(q[1].type === 'any'));
      for (const [o, i] of pairs) if (useGraph.getState().connect({ source: from.id, sourceHandle: o.id, target: id, targetHandle: i.id })) break;
    }
    onClose();
  };

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
