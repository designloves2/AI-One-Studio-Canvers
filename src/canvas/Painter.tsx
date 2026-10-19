import { useEffect, useRef, useState } from 'react';
import { useGraph } from '../store/graph';
import { useUpstream } from './helpers';
import { loadBitmap, canvasToAsset } from '../editing/ops';
import { useT } from '../i18n';

type Tool = 'brush' | 'eraser';
type Layer = 'paint' | 'mask';

/** Draw on an image (paint layer) or paint a mask (white = selected). Result + mask go out as two ports. */
export function Painter() {
  const T = useT();
  const id = useGraph((s) => s.painter);
  const node = useGraph((s) => s.nodes.find((n) => n.id === s.painter));
  const base = useUpstream(id ?? '', 'image');
  const close = () => useGraph.getState().openPainter(null);

  const stage = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLCanvasElement | null>(null);
  const paint = useRef<HTMLCanvasElement>(null);
  const mask = useRef<HTMLCanvasElement>(null);
  const [dim, setDim] = useState({ w: 1024, h: 1024 });
  const [tool, setTool] = useState<Tool>('brush');
  const [layer, setLayer] = useState<Layer>('mask');
  const [size, setSize] = useState(40);
  const [color, setColor] = useState('#ff3366');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const history = useRef<{ paint: ImageData; mask: ImageData }[]>([]);
  const down = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!id || !node) return;
    let live = true;
    (async () => {
      let w = Number(node.params.width) || 1024, h = Number(node.params.height) || 1024;
      let img: ImageBitmap | null = null;
      if (base) { try { img = await loadBitmap(base); w = img.width; h = img.height; } catch { /* blank canvas */ } }
      if (!live) return;
      setDim({ w, h });
      requestAnimationFrame(() => {
        const b = document.createElement('canvas'); b.width = w; b.height = h;
        const bc = b.getContext('2d')!; bc.fillStyle = '#ffffff'; bc.fillRect(0, 0, w, h); if (img) bc.drawImage(img, 0, 0);
        bg.current = b;
        for (const c of [paint.current, mask.current]) if (c) { c.width = w; c.height = h; c.getContext('2d')!.clearRect(0, 0, w, h); }
        history.current = [];
        redraw();
      });
    })();
    return () => { live = false; };
  }, [id, base?.id]);

  // the visible canvas = image + paint + mask tint
  const view = useRef<HTMLCanvasElement>(null);
  const redraw = () => {
    const v = view.current, b = bg.current; if (!v || !b) return;
    v.width = b.width; v.height = b.height;
    const ctx = v.getContext('2d')!; ctx.drawImage(b, 0, 0);
    if (paint.current) ctx.drawImage(paint.current, 0, 0);
    if (mask.current) { // tint the selected area red
      const t = document.createElement('canvas'); t.width = b.width; t.height = b.height;
      const tc = t.getContext('2d')!; tc.fillStyle = '#ff2d55'; tc.fillRect(0, 0, t.width, t.height);
      tc.globalCompositeOperation = 'destination-in'; tc.drawImage(mask.current, 0, 0);
      ctx.globalAlpha = 0.5; ctx.drawImage(t, 0, 0); ctx.globalAlpha = 1;
    }
  };

  const pos = (e: React.PointerEvent) => {
    const r = view.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * dim.w, y: ((e.clientY - r.top) / r.height) * dim.h };
  };
  const stroke = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const c = (layer === 'paint' ? paint.current : mask.current)!; const ctx = c.getContext('2d')!;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = size;
    if (layer === 'paint') {
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'; ctx.strokeStyle = color;
    } else {
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'; ctx.strokeStyle = '#fff';
    }
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    redraw();
  };
  const pushHistory = () => {
    const p = paint.current!.getContext('2d')!.getImageData(0, 0, dim.w, dim.h), m = mask.current!.getContext('2d')!.getImageData(0, 0, dim.w, dim.h);
    history.current = [...history.current.slice(-14), { paint: p, mask: m }];
  };
  const undo = () => {
    const h = history.current.pop(); if (!h) return;
    paint.current!.getContext('2d')!.putImageData(h.paint, 0, 0); mask.current!.getContext('2d')!.putImageData(h.mask, 0, 0); redraw();
  };
  const clear = () => {
    pushHistory();
    paint.current!.getContext('2d')!.clearRect(0, 0, dim.w, dim.h);
    mask.current!.getContext('2d')!.clearRect(0, 0, dim.w, dim.h); redraw();
  };
  const fillMask = (white: boolean) => { pushHistory(); const m = mask.current!.getContext('2d')!; m.clearRect(0, 0, dim.w, dim.h); if (white) { m.fillStyle = '#fff'; m.fillRect(0, 0, dim.w, dim.h); } redraw(); };

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const out = document.createElement('canvas'); out.width = dim.w; out.height = dim.h;
      const oc = out.getContext('2d')!; oc.drawImage(bg.current!, 0, 0); oc.drawImage(paint.current!, 0, 0);
      const g = useGraph.getState();
      const mo = document.createElement('canvas'); mo.width = dim.w; mo.height = dim.h; // white = selected, on black
      const mc = mo.getContext('2d')!; mc.fillStyle = '#000'; mc.fillRect(0, 0, dim.w, dim.h); mc.drawImage(mask.current!, 0, 0);
      g.setResults(id!, [await canvasToAsset(out, 'image'), await canvasToAsset(mo, 'mask')]);
      close();
    } catch (e) { setErr((e as Error).message); } finally { setSaving(false); }
  };

  useEffect(() => {
    if (!id) return;
    const on = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); } if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [id, dim.w, dim.h]);

  if (!id || !node) return null;
  return (
    <div className="viewer painter">
      <div className="viewer-bar">
        <div className="seg"><button className={layer === 'mask' ? 'on' : ''} onClick={() => setLayer('mask')}>{T('Mask')}</button><button className={layer === 'paint' ? 'on' : ''} onClick={() => setLayer('paint')}>{T('Paint')}</button></div>
        <div className="seg"><button className={tool === 'brush' ? 'on' : ''} onClick={() => setTool('brush')}>{T('Brush')}</button><button className={tool === 'eraser' ? 'on' : ''} onClick={() => setTool('eraser')}>{T('Eraser')}</button></div>
        <label className="inline">{T('Size')}<input type="range" min={2} max={300} value={size} onChange={(e) => setSize(+e.target.value)} /><b>{size}</b></label>
        {layer === 'paint' && <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />}
        {layer === 'mask' && <><button className="btn" onClick={() => fillMask(true)}>{T('Fill')}</button><button className="btn" onClick={() => fillMask(false)}>{T('Empty')}</button></>}
        <button className="btn" onClick={undo}>{T('Undo')}</button>
        <button className="btn" onClick={clear}>{T('Clear')}</button>
        <span className="spacer" />
        {err && <span className="error-inline">{err}</span>}
        <button className="btn primary" disabled={saving} onClick={() => void save()}>{saving ? '…' : T('Apply')}</button>
        <button className="btn" onClick={close}>{T('Cancel')}</button>
      </div>
      <div className="painter-stage" ref={stage}>
        <canvas ref={view} className="painter-view" style={{ aspectRatio: `${dim.w}/${dim.h}` }}
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); pushHistory(); down.current = pos(e); stroke(down.current, down.current); }}
          onPointerMove={(e) => { if (!down.current) return; const p = pos(e); stroke(down.current, p); down.current = p; }}
          onPointerUp={() => { down.current = null; }} />
        <canvas ref={paint} hidden /><canvas ref={mask} hidden />
      </div>
    </div>
  );
}
