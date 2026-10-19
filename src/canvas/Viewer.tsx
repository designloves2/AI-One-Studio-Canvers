import { useEffect, useRef, useState } from 'react';
import { useGraph } from '../store/graph';
import { byId } from '../registry';
import { portAssets, useUpstream } from './helpers';
import { AssetView } from './AssetView';
import { download } from '../engine/actions';
import { useT } from '../i18n';

/** Full-screen look at a node's result: wheel = zoom, drag = pan, double-click = fit, ←/→ = history. */
export function Viewer() {
  const T = useT();
  const v = useGraph((s) => s.viewer);
  const node = useGraph((s) => s.nodes.find((n) => n.id === s.viewer?.nodeId));
  const up = useUpstream(v?.nodeId ?? '', 'image');
  const setActive = useGraph((s) => s.setActive);
  const close = () => useGraph.getState().openViewer(null);
  const [z, setZ] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const def = node ? byId.get(node.defId) : undefined;
  const list = node && def ? (def.kind === 'output' ? (up ? [up] : []) : portAssets(node, def.outputs[0]?.id)) : [];
  const idx = node ? Math.min(node.activeResult, list.length - 1) : 0;
  const cur = list[idx];

  useEffect(() => { setZ({ k: 1, x: 0, y: 0 }); }, [cur?.id]);
  useEffect(() => {
    if (!v) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft' && node) setActive(node.id, idx - 1);
      if (e.key === 'ArrowRight' && node) setActive(node.id, idx + 1);
    };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [v, idx, node?.id]);

  if (!v || !node || !cur) return null;
  return (
    <div className="viewer" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="viewer-bar">
        <span>{def?.title} {list.length > 1 && `· ${idx + 1}/${list.length}`}</span>
        <span className="spacer" />
        {cur.type !== 'text' && <button className="btn" onClick={() => download(cur.url, cur.file?.filename ?? 'result.png')}>{T('Download')}</button>}
        <button className="btn" onClick={close}>{T('Close')}</button>
      </div>
      <div className="viewer-stage"
        onWheel={(e) => { const k = Math.max(0.2, Math.min(12, z.k * (e.deltaY < 0 ? 1.15 : 0.87))); setZ({ ...z, k }); }}
        onMouseDown={(e) => { drag.current = { x: e.clientX - z.x, y: e.clientY - z.y }; }}
        onMouseMove={(e) => { if (drag.current && e.buttons === 1) setZ({ ...z, x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }); }}
        onMouseUp={() => { drag.current = null; }} onDoubleClick={() => setZ({ k: 1, x: 0, y: 0 })}>
        <div style={{ transform: `translate(${z.x}px, ${z.y}px) scale(${z.k})` }}><AssetView asset={cur} /></div>
      </div>
    </div>
  );
}
