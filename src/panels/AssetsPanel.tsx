import { useEffect, useRef, useState } from 'react';
import { askConfirm } from '../ui/dialog';
import { getGallery, getVideoGallery, deleteOutput, type GalleryItem } from '../backend/studio';
import { viewUrl, uid } from '../backend/comfy';
import { useSettings } from '../store/settings';
import { useGraph } from '../store/graph';
import { addGalleryCard, download } from '../engine/actions';
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
  // select mode: tick several items and delete them in one go (same flow as the web gallery)
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = async (offset = 0) => {
    setBusy(true); setErr('');
    try {
      const r = kind === 'video' ? await getVideoGallery(sub, offset, 40) : await getGallery('klein', sub, offset, 40);
      setItems((p) => (offset ? [...p, ...r.images] : r.images)); setTotal(r.total);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  useEffect(() => { setItems([]); setSelected(new Set()); void load(); }, [sub, kind]);
  useEffect(() => { void useSensitive.getState().load(); }, []);
  const revealAll = useSensitive((st) => st.revealAll);
  const itemKey = (it: GalleryItem) => it.key ?? `${it.subfolder}/${it.filename}`;
  const toggleSelectMode = () => { setSelectMode((m) => !m); setSelected(new Set()); };
  const toggleSel = (it: GalleryItem) => setSelected((p) => { const n = new Set(p); const k = itemKey(it); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const deleteSelected = async () => {
    const chosen = items.filter((it) => selected.has(itemKey(it)));
    if (!chosen.length || deleting) return;
    if (!(await askConfirm(`${chosen.length}${T('Delete selected items?')}`))) return;
    setDeleting(true);
    let failed = 0;
    for (const it of chosen) { try { await deleteOutput('klein', it.filename, it.subfolder); } catch { failed++; } }
    setDeleting(false); setSelected(new Set());
    if (failed) setErr(`${failed} ${T('could not be deleted')}`);
    void load();
  };

  const toCanvas = (it: GalleryItem) => { addGalleryCard({ filename: it.filename, subfolder: it.subfolder }); };

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
      <div className="panel-row"><b>{sub}</b><span className="muted">{total}</span><span className="spacer" />{selectMode && selected.size > 0 && <button className="btn danger" onClick={() => void deleteSelected()} disabled={deleting}>{T('Delete')} {selected.size}</button>}<button className={`btn${selectMode ? ' on' : ''}`} onClick={toggleSelectMode}>{selectMode ? `${selected.size} ${T('Selected')}` : T('Select')}</button><button className="btn" title={T(revealAll ? 'Hide the hidden items again' : 'Temporarily show every hidden item')} onClick={() => useSensitive.getState().setRevealAll(!revealAll)}>{revealAll ? '🙈' : '👁'}</button><button className="btn" onClick={() => void load()} disabled={busy}>↻</button></div>
      {err && <p className="status bad">{err}</p>}
      <div className="thumbs">
        {items.map((it) => {
          const f = { filename: it.filename, subfolder: it.subfolder, type: 'output' as const };
          return (
            <Thumb key={it.key ?? it.filename} video={kind === 'video'} it={it} url={viewUrl(f)} selectMode={selectMode} picked={selected.has(itemKey(it))} onPick={() => toggleSel(it)} onClick={() => onClick(it)} onDouble={() => onDouble(it)}
              onDelete={async () => { if (await askConfirm(`${T('Delete')}? ${it.filename}`)) { await deleteOutput('klein', it.filename, it.subfolder); void load(); } }} />
          );
        })}
      </div>
      {!items.length && !err && !busy && <p className="muted">{T('Nothing here yet.')}</p>}
      {items.length < total && <button className="btn" onClick={() => void load(items.length)} disabled={busy}>+ more</button>}
    </div>
  );
}

function Thumb({ it, url, video, selectMode, picked, onPick, onClick, onDouble, onDelete }: { it: GalleryItem; url: string; video?: boolean; selectMode?: boolean; picked?: boolean; onPick(): void; onClick(): void; onDouble(): void; onDelete(): void }) {
  const T = useT();
  const key = mediaKey(it.filename, it.subfolder);
  const blurred = useIsBlurred(key);
  const marked = useSensitive((st) => st.items.has(key));
  // Same as the web gallery: cards are plain <img> (small cached thumbnail / server-made first frame), and a clip is only
  // streamed while the pointer is on its card, so a big gallery never holds dozens of decoders or /view streams.
  const [thumbFailed, setThumbFailed] = useState(false);
  const [hover, setHover] = useState(false);
  // drag a card out of the gallery onto the canvas: it becomes a Load Image / Load Video card where it is dropped
  const dragOut = (e: React.DragEvent) => { e.dataTransfer.setData('application/x-canvers-asset', JSON.stringify({ filename: it.filename, subfolder: it.subfolder, type: 'output' })); e.dataTransfer.setData('text/uri-list', url); e.dataTransfer.effectAllowed = 'copy'; };
  const vidThumb = `/ltx25_one/thumb?filename=${encodeURIComponent(it.filename)}&subfolder=${encodeURIComponent(it.subfolder)}`;
  const thumbUrl = `/tj_shared/thumb?filename=${encodeURIComponent(it.filename)}&subfolder=${encodeURIComponent(it.subfolder)}&root=output&t=${Math.round(it.mtime || 0)}`;
  return (
    <figure className={`thumb${blurred ? ' blurred' : ''}${selectMode && picked ? ' picked' : ''}`}>
      {video
        ? <div className="vthumb" draggable={!blurred && !selectMode} onDragStart={(e) => { setHover(false); dragOut(e); }} onMouseEnter={() => { if (!blurred && !selectMode) setHover(true); }} onMouseLeave={() => setHover(false)}
            onClick={selectMode ? onPick : blurred ? undefined : onClick} onDoubleClick={selectMode || blurred ? undefined : onDouble} title={`${it.filename} — ${T('Click: enlarge · Double-click: add to canvas')}`}>
            <img src={vidThumb} alt="" loading="lazy" draggable={false} />
            {hover && !selectMode && <video src={url} muted loop autoPlay playsInline />}
          </div>
        : <img src={thumbFailed ? url : thumbUrl} onError={() => setThumbFailed(true)} alt="" loading="lazy" draggable={!blurred && !selectMode} onDragStart={(e) => dragOut(e)}
            onClick={selectMode ? onPick : blurred ? undefined : onClick} onDoubleClick={selectMode || blurred ? undefined : onDouble} title={`${it.filename} — ${T('Click: enlarge · Double-click: add to canvas')}`} />}
      {selectMode && <span className="pick-box" onClick={onPick}>{picked ? '✓' : ''}</span>}
      <button className="eye" title={T(marked ? 'Reveal this item' : 'Hide this item')} onClick={() => useSensitive.getState().toggle(key)}>{marked ? '⊘' : '👁︎'}</button>
      {!selectMode && <figcaption>
        <button title={T('Download')} onClick={() => download(url, it.filename)}>⭳</button>
        <button title={T('Delete')} onClick={onDelete}>✕</button>
      </figcaption>}
    </figure>
  );
}
