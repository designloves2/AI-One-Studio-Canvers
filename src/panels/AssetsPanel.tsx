import { useEffect, useRef, useState } from 'react';
import { askConfirm } from '../ui/dialog';
import { getGallery, getVideoGallery, deleteOutput, type GalleryItem } from '../backend/studio';
import { viewUrl, uid } from '../backend/comfy';
import { useSettings } from '../store/settings';
import { useGraph } from '../store/graph';
import { download } from '../engine/actions';
import { useT } from '../i18n';
import { mediaKey, useIsBlurred, useSensitive } from '../backend/sensitive';

export function AssetsPanel() {
  const T = useT();
  const sub = useSettings((s) => s.saveSubfolder);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<'image' | 'video'>('image');
  const [zoom, setZoom] = useState<GalleryItem | null>(null);
  const clickTimer = useRef<number>();

  const load = async (offset = 0) => {
    setBusy(true); setErr('');
    try {
      const r = kind === 'video' ? await getVideoGallery(sub, offset, 40) : await getGallery('klein', sub, offset, 40);
      setItems((p) => (offset ? [...p, ...r.images] : r.images)); setTotal(r.total);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  useEffect(() => { setItems([]); void load(); }, [sub, kind]);
  useEffect(() => { void useSensitive.getState().load(); }, []);
  const revealAll = useSensitive((st) => st.revealAll);

  const toCanvas = (it: GalleryItem) => {
    const g = useGraph.getState();
    const file = { filename: it.filename, subfolder: it.subfolder, type: 'output' as const };
    const vid = /\.(mp4|webm|mov|mkv|gif)$/i.test(it.filename);
    const id = g.addNode(vid ? 'import-video' : 'import', 120 + Math.random() * 160, 120 + Math.random() * 160);
    g.setResults(id, [{ id: uid(), type: vid ? 'video' : 'image', url: viewUrl(file), file }]);
    if (g.mode === 'simple') g.setMode('canvas');
  };

  // single click = enlarge, double click = card on the canvas
  const onClick = (it: GalleryItem) => { window.clearTimeout(clickTimer.current); clickTimer.current = window.setTimeout(() => setZoom(it), 230); };
  const onDouble = (it: GalleryItem) => { window.clearTimeout(clickTimer.current); toCanvas(it); };
  useEffect(() => {
    if (!zoom) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoom(null); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [zoom]);
  const zf = zoom ? { filename: zoom.filename, subfolder: zoom.subfolder, type: 'output' as const } : null;

  return (
    <div className="panel-body">
      {zoom && zf && (
        <div className="lightbox" onClick={() => setZoom(null)}>
          {/\.(mp4|webm|mov|mkv)$/i.test(zoom.filename) ? <video src={viewUrl(zf)} controls autoPlay loop onClick={(e) => e.stopPropagation()} /> : <img src={viewUrl(zf)} alt={zoom.filename} onClick={(e) => e.stopPropagation()} onDoubleClick={() => { toCanvas(zoom); setZoom(null); }} />}
          <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <span className="muted">{zoom.filename}</span>
            <button className="btn" onClick={() => { toCanvas(zoom); setZoom(null); }}>{T('To canvas')}</button>
            <button className="btn" onClick={() => download(viewUrl(zf), zoom.filename)}>{T('Download')}</button>
            <button className="btn" onClick={() => setZoom(null)}>✕</button>
          </div>
        </div>
      )}
      <div className="gal-tabs"><button className={kind === 'image' ? 'on' : ''} onClick={() => setKind('image')}>{T('Images')}</button><button className={kind === 'video' ? 'on' : ''} onClick={() => setKind('video')}>{T('Video clips')}</button></div>
      <div className="panel-row"><b>{sub}</b><span className="muted">{total}</span><span className="spacer" /><button className="btn" title={T(revealAll ? 'Hide the hidden items again' : 'Temporarily show every hidden item')} onClick={() => useSensitive.getState().setRevealAll(!revealAll)}>{revealAll ? '🙈' : '👁'}</button><button className="btn" onClick={() => void load()} disabled={busy}>↻</button></div>
      {err && <p className="status bad">{err}</p>}
      <div className="thumbs">
        {items.map((it) => {
          const f = { filename: it.filename, subfolder: it.subfolder, type: 'output' as const };
          return (
            <Thumb key={it.key ?? it.filename} video={kind === 'video'} it={it} url={viewUrl(f)} onClick={() => onClick(it)} onDouble={() => onDouble(it)}
              onDelete={async () => { if (await askConfirm(`${T('Delete')}? ${it.filename}`)) { await deleteOutput('klein', it.filename, it.subfolder); void load(); } }} />
          );
        })}
      </div>
      {!items.length && !err && !busy && <p className="muted">{T('Nothing here yet.')}</p>}
      {items.length < total && <button className="btn" onClick={() => void load(items.length)} disabled={busy}>+ more</button>}
    </div>
  );
}

function Thumb({ it, url, video, onClick, onDouble, onDelete }: { it: GalleryItem; url: string; video?: boolean; onClick(): void; onDouble(): void; onDelete(): void }) {
  const T = useT();
  const key = mediaKey(it.filename, it.subfolder);
  const blurred = useIsBlurred(key);
  const marked = useSensitive((st) => st.items.has(key));
  return (
    <figure className={`thumb${blurred ? ' blurred' : ''}`}>
      {video
        ? <video src={`${url}#t=0.1`} muted loop playsInline preload="metadata" onMouseEnter={(e) => { if (!blurred) void e.currentTarget.play().catch(() => undefined); }} onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0.1; }}
            onClick={blurred ? undefined : onClick} onDoubleClick={blurred ? undefined : onDouble} title={`${it.filename} — ${T('Click: enlarge · Double-click: add to canvas')}`} />
        : <img src={url} alt="" loading="lazy" draggable={!blurred} onDragStart={(e) => e.dataTransfer.setData('text/uri-list', url)}
            onClick={blurred ? undefined : onClick} onDoubleClick={blurred ? undefined : onDouble} title={`${it.filename} — ${T('Click: enlarge · Double-click: add to canvas')}`} />}
      <button className="eye" title={T(marked ? 'Reveal this item' : 'Hide this item')} onClick={() => useSensitive.getState().toggle(key)}>{marked ? '⊘' : '👁︎'}</button>
      <figcaption>
        <button title={T('Download')} onClick={() => download(url, it.filename)}>⭳</button>
        <button title={T('Delete')} onClick={onDelete}>✕</button>
      </figcaption>
    </figure>
  );
}
