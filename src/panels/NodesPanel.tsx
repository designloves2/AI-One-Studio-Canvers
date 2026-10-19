import { useState } from 'react';
import { CATEGORIES, REGISTRY } from '../registry';
import { useGraph } from '../store/graph';
import { useT } from '../i18n';

export function NodesPanel() {
  const T = useT();
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const add = (id: string) => useGraph.getState().addNode(id, 120 + Math.random() * 200, 100 + Math.random() * 200);
  return (
    <div className="panel-body">
      <input className="panel-search" placeholder={T('Search nodes…')} value={q} onChange={(e) => setQ(e.target.value)} />
      {CATEGORIES.map((cat) => {
        const rows = REGISTRY.filter((d) => d.category === cat && (!s || d.title.toLowerCase().includes(s) || T(d.title).toLowerCase().includes(s)));
        if (!rows.length) return null;
        return (
          <section key={cat}>
            <h4>{T(cat)}</h4>
            {rows.map((d) => (
              <button key={d.id} className="tile" draggable onDragStart={(e) => e.dataTransfer.setData('application/x-canvers-node', d.id)} onClick={() => add(d.id)} title={d.description}>
                <b>{T(d.title)}</b><small>{d.description}</small>
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}
