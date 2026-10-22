// Asset Library popups: register a new asset (upload or pick from the gallery, name, category, tags) and edit / delete an existing one.
import { useEffect, useRef, useState } from 'react';
import { deleteAsset, libPreview, registerAsset, safeAssetName, replaceAssetMedia, updateAsset, type LibAsset } from '../backend/assetlib';
import { getGallery, type GalleryItem } from '../backend/studio';
import { fetchBlob, viewUrl } from '../backend/comfy';
import { assetKey, mediaKey, useIsBlurred, useSensitive } from '../backend/sensitive';
import { useSettings } from '../store/settings';
import { askConfirm } from '../ui/dialog';
import { useT } from '../i18n';

const tagsOf = (a?: LibAsset): string => { const t = (a as { tags?: unknown } | undefined)?.tags; return Array.isArray(t) ? t.join(', ') : String(t ?? ''); };
const stem = (n: string) => n.replace(/\.[^.]+$/, '');

/** Gallery images to choose from (blurred ones stay blurred and can't be picked). */
function GalleryPick({ onPick, onClose }: { onPick(f: File): void; onClose(): void }) {
  const T = useT();
  const sub = useSettings((s) => s.saveSubfolder);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void useSensitive.getState().load(); }, []);
  const load = async (offset = 0) => {
    setBusy(true);
    try { const r = await getGallery('klein', sub, offset, 40); setItems((p) => (offset ? [...p, ...r.images] : r.images)); setTotal(r.total); setErr(''); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, [sub]);
  const pick = async (it: GalleryItem) => {
    try { const blob = await fetchBlob(viewUrl({ filename: it.filename, subfolder: it.subfolder, type: 'output' })); onPick(new File([blob], it.filename, { type: blob.type || 'image/png' })); }
    catch (e) { setErr((e as Error).message); }
  };
  return (
    <div className="dlg-back" onMouseDown={onClose}>
      <div className="dlg gallery-pick" role="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{T('Pick from gallery')} <small className="muted">{sub}</small></h3>
        {err && <div className="error">{err}</div>}
        <div className="gp-grid">{items.map((it) => <GpTile key={it.key ?? it.filename} it={it} onPick={() => void pick(it)} />)}</div>
        {!items.length && !err && !busy && <p className="muted">{T('Nothing here yet.')}</p>}
        <div className="dlg-btns">
          {items.length < total && <button className="btn" disabled={busy} onClick={() => void load(items.length)}>+ more</button>}
          <button className="btn" onClick={onClose}>{T('Close')}</button>
        </div>
      </div>
    </div>
  );
}
function GpTile({ it, onPick }: { it: GalleryItem; onPick(): void }) {
  const blurred = useIsBlurred(mediaKey(it.filename, it.subfolder));
  return <img className={blurred ? 'blurred' : ''} src={viewUrl({ filename: it.filename, subfolder: it.subfolder, type: 'output' })} alt="" loading="lazy" title={it.filename} onClick={blurred ? undefined : onPick} />;
}

/** `asset` given = edit that asset; omitted = register a new one. */
export function AssetDialog({ asset, cats, onClose, onChanged }: { asset?: LibAsset; cats: string[]; onClose(): void; onChanged(): void }) {
  const T = useT();
  const editing = !!asset;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [name, setName] = useState(asset?.name ?? '');
  const [category, setCategory] = useState(asset?.category ?? 'character');
  const [tags, setTags] = useState(tagsOf(asset));
  const [note, setNote] = useState(String((asset as { note?: string } | undefined)?.note ?? ''));
  const [gallery, setGallery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const hideKey = asset ? assetKey(asset.id) : '';
  const hidden = useIsBlurred(hideKey);
  const marked = useSensitive((st) => hideKey ? st.items.has(hideKey) : false);
  const catList = cats.includes(category) || !category ? cats : [category, ...cats];

  useEffect(() => { if (!file) { setPreview(''); return; } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !gallery) onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [gallery, onClose]);

  const choose = (f: File | undefined | null) => { if (!f) return; setFile(f); if (!editing && !name.trim()) setName(stem(f.name).replace(/[^\wㄱ-힝-]+/g, '_')); };
  const isVideo = (file?.type ?? '').startsWith('video/') || (!file && asset?.kind === 'video');
  const isAudio = (file?.type ?? '').startsWith('audio/') || (!file && asset?.kind === 'audio');
  const shown = preview || (asset ? libPreview(asset.id) : '');

  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(''); try { await fn(); onChanged(); onClose(); } catch (e) { setErr((e as Error).message); setBusy(false); } };
  const save = () => run(async () => {
    if (editing && asset) { if (file) await replaceAssetMedia(asset.id, file); await updateAsset(asset.id, { name: name.trim(), category, tags, note }); }
    else if (file) { const a = await registerAsset(file, category, name.trim() || undefined); if (tags.trim() || note.trim()) await updateAsset(a.id, { tags, note }); }
  });
  const remove = async () => { if (asset && await askConfirm(`${T('Delete')} @${asset.name}?`)) await run(async () => { await deleteAsset(asset.id); }); };

  return (
    <>
      <div className="dlg-back" onMouseDown={() => !busy && onClose()}>
        <div className="dlg asset-dlg" role="dialog" onMouseDown={(e) => e.stopPropagation()}>
          <h3>{editing ? `@${asset!.name}` : T('Register asset')}</h3>
          <div className="ad-body">
            <div className="ad-image">
              <div className={`ad-preview${hidden && !file ? ' blurred' : ''}`} onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files?.[0]); }}>
                {shown && !isAudio ? (isVideo ? <video src={shown} muted loop autoPlay /> : <img src={shown} alt="" />) : <span className="muted">{isAudio ? '♪ ' + (file?.name ?? asset?.name) : T('Click or drop an image here')}</span>}
              </div>
              <input ref={input} type="file" hidden accept="image/*,video/*,audio/*" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
              <div className="panel-row">
                <button className="btn" onClick={() => input.current?.click()}>⬆ {T(editing ? 'Replace file' : 'Upload')}</button>
                <button className="btn" onClick={() => setGallery(true)}>🖼 {T('From gallery')}</button>
              </div>
              {editing && <button className="btn" onClick={() => useSensitive.getState().toggle(hideKey)}>{marked ? '⊘ ' + T('Reveal this item') : '👁︎ ' + T('Hide this item')}</button>}
              {file && <small className="muted">{file.name}</small>}
              {editing && asset && !file && <small className="muted">{asset.kind} · {asset.width && asset.height ? `${asset.width}×${asset.height}` : ''}{asset.duration ? ` · ${asset.duration.toFixed?.(1) ?? asset.duration}s` : ''} · #{asset.id}</small>}
            </div>
            <div className="ad-form">
              <label className="field-label">{T('Name')} <small className="muted">(@{name.trim() || '…'})</small><input value={name} onChange={(e) => setName(safeAssetName(e.target.value))} autoFocus /></label>
              <label className="field-label">{T('Category')}<select value={category} onChange={(e) => setCategory(e.target.value)}>{catList.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="field-label">{T('Tags')}<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="a, b" /></label>
              <label className="field-label">{T('Note')}<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
            </div>
          </div>
          {err && <div className="error">{err}</div>}
          <div className="dlg-btns">
            {editing && <button className="btn danger" disabled={busy} onClick={() => void remove()}>{T('Delete')}</button>}
            <span className="spacer" />
            <button className="btn" disabled={busy} onClick={onClose}>{T('Cancel')}</button>
            <button className="btn primary" disabled={busy || (!editing && !file) || (editing && !name.trim())} onClick={() => void save()}>{busy ? '…' : T(editing ? 'Save' : 'Register')}</button>
          </div>
        </div>
      </div>
      {gallery && <GalleryPick onClose={() => setGallery(false)} onPick={(f) => { choose(f); setGallery(false); }} />}
    </>
  );
}
