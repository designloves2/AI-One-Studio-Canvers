import { useEffect, useRef, useState } from 'react';
import { useGraph } from '../store/graph';
import { useUpstream } from './helpers';
import { useT } from '../i18n';
import type { MossBox } from '../backend/imageGen';

const snap = (v: number) => Math.round(v / 16) * 16;
const parseBoxes = (s: unknown): MossBox[] => { try { const j = JSON.parse(String(s || '[]')); return Array.isArray(j) ? j : []; } catch { return []; } };

/** Draw boxes for Moss Image R2I: each is an OBJECT or exact TEXT. Numbered in the order drawn (background first, foreground last). */
export function BoxEditor() {
  const T = useT();
  const id = useGraph((s) => s.boxEditor);
  const node = useGraph((s) => s.nodes.find((n) => n.id === s.boxEditor));
  const bg = useUpstream(id ?? '', 'image');
  const close = () => useGraph.getState().openBoxEditor(null);
  const [boxes, setBoxes] = useState<MossBox[]>([]);
  const [sel, setSel] = useState(-1);
  const [drag, setDrag] = useState<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const W = Math.max(16, Number(node?.params.width) || 1024), H = Math.max(16, Number(node?.params.height) || 1024);

  useEffect(() => { if (id && node) { setBoxes(parseBoxes(node.params.boxes)); setSel(-1); } }, [id]);
  useEffect(() => {
    if (!id) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [id]);

  const at = (e: React.PointerEvent) => {
    const r = stage.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(W, ((e.clientX - r.left) / r.width) * W)), y: Math.max(0, Math.min(H, ((e.clientY - r.top) / r.height) * H)) };
  };
  const patch = (i: number, f: (b: MossBox) => MossBox) => setBoxes((bs) => bs.map((b, j) => (j === i ? f(b) : b)));
  const save = () => {
    const g = useGraph.getState();
    g.setParam(id!, 'boxes', JSON.stringify(boxes));
    close();
  };

  if (!id || !node) return null;
  const rect = drag ? { x: Math.min(drag.x, drag.cx), y: Math.min(drag.y, drag.cy), w: Math.abs(drag.cx - drag.x), h: Math.abs(drag.cy - drag.y) } : null;
  const pct = (v: number, t: number) => `${(v / t) * 100}%`;
  return (
    <div className="viewer painter box-editor">
      <div className="viewer-bar">
        <span>{T('Draw a box on the canvas: it becomes an object (or exact text) in that place.')}</span>
        <span className="spacer" />
        <button className="btn" onClick={() => { setBoxes([]); setSel(-1); }}>{T('Clear')}</button>
        <button className="btn primary" onClick={save}>{T('Apply')}</button>
        <button className="btn" onClick={close}>{T('Cancel')}</button>
      </div>
      <div className="box-body">
        <div className="painter-stage">
          <div ref={stage} className="box-stage" style={{ aspectRatio: `${W}/${H}` }}
            onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); const p = at(e); setDrag({ x: p.x, y: p.y, cx: p.x, cy: p.y }); }}
            onPointerMove={(e) => { if (drag) { const p = at(e); setDrag({ ...drag, cx: p.x, cy: p.y }); } }}
            onPointerUp={() => {
              if (!drag) return;
              const x = snap(Math.min(drag.x, drag.cx)), y = snap(Math.min(drag.y, drag.cy));
              const w = Math.min(W - x, Math.max(16, snap(Math.abs(drag.cx - drag.x)))), h = Math.min(H - y, Math.max(16, snap(Math.abs(drag.cy - drag.y))));
              setDrag(null);
              if (Math.abs(drag.cx - drag.x) < 8 && Math.abs(drag.cy - drag.y) < 8) return;
              setBoxes((bs) => [...bs, { x, y, width: w, height: h, metadata: { type: 'obj', text: '', desc: '', palette: [] } }]);
              setSel(boxes.length);
            }}>
            {bg && <img src={bg.url} alt="" draggable={false} />}
            {boxes.map((b, i) => (
              <div key={i} className={`bx ${b.metadata.type} ${sel === i ? 'on' : ''}`} style={{ left: pct(b.x, W), top: pct(b.y, H), width: pct(b.width, W), height: pct(b.height, H) }}
                onPointerDown={(e) => { e.stopPropagation(); setSel(i); }}>
                <b>{i + 1}</b><i>{b.metadata.type === 'text' ? b.metadata.text : b.metadata.desc}</i>
              </div>
            ))}
            {rect && <div className="bx draft" style={{ left: pct(rect.x, W), top: pct(rect.y, H), width: pct(rect.w, W), height: pct(rect.h, H) }} />}
          </div>
        </div>
        <div className="box-list">
          {!boxes.length && <p className="muted">{T('No boxes yet — drag on the canvas.')}</p>}
          {boxes.map((b, i) => (
            <div key={i} className={`box-row ${sel === i ? 'on' : ''}`} onClick={() => setSel(i)}>
              <div className="row">
                <b>{i + 1}</b>
                <select value={b.metadata.type} onChange={(e) => patch(i, (x) => ({ ...x, metadata: { ...x.metadata, type: e.target.value as 'obj' | 'text' } }))}>
                  <option value="obj">OBJECT</option><option value="text">TEXT</option>
                </select>
                <span className="muted">{b.x},{b.y} · {b.width}×{b.height}</span>
                <span className="spacer" />
                <button className="btn" onClick={() => { setBoxes((bs) => bs.filter((_, j) => j !== i)); setSel(-1); }}>✕</button>
              </div>
              {b.metadata.type === 'text' && <input placeholder={T('Exact text to render')} value={b.metadata.text} onChange={(e) => patch(i, (x) => ({ ...x, metadata: { ...x.metadata, text: e.target.value } }))} />}
              <input placeholder={T('Description')} value={b.metadata.desc} onChange={(e) => patch(i, (x) => ({ ...x, metadata: { ...x.metadata, desc: e.target.value } }))} />
              <input placeholder={T('Palette (hex, comma separated)')} value={b.metadata.palette.join(', ')}
                onChange={(e) => patch(i, (x) => ({ ...x, metadata: { ...x.metadata, palette: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } }))} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
