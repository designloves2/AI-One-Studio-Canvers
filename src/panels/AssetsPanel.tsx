import { useEffect, useState } from 'react';
import { getGallery, deleteOutput, type GalleryItem } from '../backend/studio';
import { viewUrl, uid } from '../backend/comfy';
import { useSettings } from '../store/settings';
import { useGraph } from '../store/graph';
import { download } from '../engine/actions';
import { useT } from '../i18n';

export function AssetsPanel() {
  const T = useT();
  const sub = useSettings((s) => s.saveSubfolder);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (offset = 0) => {
    setBusy(true); setErr('');
    try {
      const r = await getGallery('klein', sub, offset, 40);
      setItems((p) => (offset ? [...p, ...r.images] : r.images)); setTotal(r.total);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, [sub]);

  const toCanvas = (it: GalleryItem) => {
    const g = useGraph.getState();
    const file = { filename: it.filename, subfolder: it.subfolder, type: 'output' as const };
    const vid = /\.(mp4|webm|mov|mkv|gif)$/i.test(it.filename);
    const id = g.addNode(vid ? 'import-video' : 'import', 120 + Math.random() * 160, 120 + Math.random() * 160);
    g.setResults(id, [{ id: uid(), type: vid ? 'video' : 'image', url: viewUrl(file), file }]);
  };

  return (
    <div className="panel-body">
      <div className="panel-row"><b>{sub}</b><span className="muted">{total}</span><span className="spacer" /><button className="btn" onClick={() => void load()} disabled={busy}>↻</button></div>
      {err && <p className="status bad">{err}</p>}
      <div className="thumbs">
        {items.map((it) => {
          const f = { filename: it.filename, subfolder: it.subfolder, type: 'output' as const };
          return (
            <figure key={it.key ?? it.filename} className="thumb">
              <img src={viewUrl(f)} alt="" loading="lazy" draggable onDragStart={(e) => e.dataTransfer.setData('text/uri-list', viewUrl(f))} onClick={() => toCanvas(it)} title={it.filename} />
              <figcaption>
                <button title={T('Download')} onClick={() => download(viewUrl(f), it.filename)}>⭳</button>
                <button title={T('Delete')} onClick={async () => { if (confirm(`${T('Delete')}? ${it.filename}`)) { await deleteOutput('klein', it.filename, it.subfolder); void load(); } }}>✕</button>
              </figcaption>
            </figure>
          );
        })}
      </div>
      {!items.length && !err && !busy && <p className="muted">{T('Nothing here yet.')}</p>}
      {items.length < total && <button className="btn" onClick={() => void load(items.length)} disabled={busy}>+ more</button>}
    </div>
  );
}
