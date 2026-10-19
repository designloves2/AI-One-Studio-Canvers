// Asset Library manager (side menu): browse registered characters / backgrounds / props. Registering and editing happen in popups.
// The Asset Library card and prompts use these as @name.
import { useEffect, useMemo, useState } from 'react';
import { libCategories, libThumb, listAssets, type LibAsset } from '../backend/assetlib';
import { AssetDialog } from './AssetDialog';
import { assetKey, useIsBlurred, useSensitive } from '../backend/sensitive';
import { useT } from '../i18n';

const tagsOf = (a: LibAsset): string => { const t = (a as { tags?: unknown }).tags; return Array.isArray(t) ? t.join(', ') : String(t ?? ''); };

export function LibraryPanel() {
  const T = useT();
  const [assets, setAssets] = useState<LibAsset[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  /** undefined = closed, null = register new, asset = edit */
  const [dlg, setDlg] = useState<LibAsset | null | undefined>(undefined);

  const load = async () => {
    try { setAssets(await listAssets()); setErr(''); setCats(await libCategories()); }
    catch (e) { setErr(`${(e as Error).message} — is ComfyUI-TJ_NODE installed?`); }
  };
  useEffect(() => { void load(); void useSensitive.getState().load(); }, []);
  const revealAll = useSensitive((st) => st.revealAll);

  const shown = useMemo(() => assets.filter((a) => (!cat || a.category === cat) && (!q || a.name.toLowerCase().includes(q.toLowerCase()) || tagsOf(a).toLowerCase().includes(q.toLowerCase()))), [assets, cat, q]);

  return (
    <div className="panel-body lib-panel">
      <div className="panel-row">
        <input className="panel-search" placeholder={T('Search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" title={T(revealAll ? 'Hide the hidden items again' : 'Temporarily show every hidden item')} onClick={() => useSensitive.getState().setRevealAll(!revealAll)}>{revealAll ? '🙈' : '👁'}</button>
        <button className="btn" onClick={() => void load()}>↻</button>
      </div>
      <button className="btn primary" onClick={() => setDlg(null)}>＋ {T('Register asset')}</button>
      <div className="lib-cats">
        <button className={`chip${!cat ? ' on' : ''}`} onClick={() => setCat('')}>{T('All categories')}</button>
        {cats.map((c) => <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      {err && <p className="status bad">{err}</p>}
      <div className="lib-grid">
        {shown.map((a) => <LibTile key={a.id} a={a} onOpen={() => setDlg(a)} />)}
      </div>
      {!shown.length && !err && <p className="muted">{T('No assets yet — register some files.')}</p>}
      {dlg !== undefined && <AssetDialog key={dlg?.id ?? 'new'} asset={dlg ?? undefined} cats={cats.length ? cats : ['character', 'background', 'prop', 'etc']} onClose={() => setDlg(undefined)} onChanged={() => void load()} />}
    </div>
  );
}

function LibTile({ a, onOpen }: { a: LibAsset; onOpen(): void }) {
  const T = useT();
  const key = assetKey(a.id);
  const blurred = useIsBlurred(key);
  const marked = useSensitive((st) => st.items.has(key));
  return (
    <div className={`lib-item thumb-eye${blurred ? ' blurred' : ''}`}>
      <div className="lib-tile" onClick={onOpen} title={`@${a.name}`}>
        <div className="lib-img">
          <img src={libThumb(a.id)} alt="" loading="lazy" />
          <button className="eye" title={T(marked ? 'Reveal this item' : 'Hide this item')} onClick={(e) => { e.stopPropagation(); useSensitive.getState().toggle(key); }}>{marked ? '⊘' : '👁︎'}</button>
        </div>
        <b>@{a.name}</b><small>{a.kind} · {a.category}</small>
      </div>
    </div>
  );
}
