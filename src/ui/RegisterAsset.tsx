// Right-click a result (image / video / music) in Canvas, Simple or the viewer -> "Register as asset" -> a dialog in the middle of the screen:
// the asset name (@tag), the category, Register. The Asset Library is where the Director (casting) and the H3 reference cards pick from.
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import type { Asset } from '../types';
import { libCategories, registerAsset, safeAssetName, resetMentionNames } from '../backend/assetlib';
import { useT } from '../i18n';

interface State { menu: { x: number; y: number; asset: Asset } | null; dialog: Asset | null }
const useReg = create<State>(() => ({ menu: null, dialog: null }));

/** attach to onContextMenu of a result: shows the small menu at the pointer (text results have nothing to register) */
export function openAssetMenu(e: React.MouseEvent, asset: Asset) {
  if (asset.type === 'text') return;
  e.preventDefault(); e.stopPropagation();
  useReg.setState({ menu: { x: e.clientX, y: e.clientY, asset } });
}

const CAT_KEY = 'canvers.register.category';
const readCat = () => { try { return localStorage.getItem(CAT_KEY) ?? ''; } catch { return ''; } };

/** a readable default name from the file name ("MMH3_00012_.png" -> "MMH3_00012") */
export function defaultAssetName(a: Asset): string {
  const raw = a.file?.filename ?? decodeURIComponent((/filename=([^&]+)/.exec(a.url)?.[1] ?? '').replace(/\+/g, ' '));
  return safeAssetName(raw.replace(/\.[^.]+$/, '').replace(/_+$/, '')) || '';
}

function Dialog({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const T = useT();
  const [name, setName] = useState(() => defaultAssetName(asset));
  const [cats, setCats] = useState<string[]>(['character', 'background', 'prop', 'etc']);
  const [cat, setCat] = useState(() => readCat() || (asset.type === 'audio' ? 'etc' : 'character'));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { void libCategories().then((c) => { setCats(c); setCat((cur) => (c.includes(cur) ? cur : c[0] ?? cur)); }).catch(() => undefined); setTimeout(() => { input.current?.focus(); input.current?.select(); }, 30); }, []);
  const tag = safeAssetName(name);
  const register = async () => {
    if (!tag || busy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(asset.url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const base = asset.file?.filename ?? `${tag}.${asset.type === 'video' ? 'mp4' : asset.type === 'audio' ? 'mp3' : 'png'}`;
      const lib = await registerAsset(new File([blob], base, { type: blob.type || undefined }), cat, tag);
      try { localStorage.setItem(CAT_KEY, cat); } catch { /* ignore */ }
      resetMentionNames();
      // the library keeps one entry per image: the same picture registered before comes back under its old name
      setMsg({ ok: true, text: lib.name === tag ? `${T('Registered')}: @${lib.name} (${lib.category})` : `${T('This image was already registered as')} @${lib.name} (${lib.category})` });
      setTimeout(onClose, lib.name === tag ? 900 : 2600);
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  return (
    <div className="dlg-back dlg-top" onMouseDown={onClose}>
      <div className="dlg regdlg" role="dialog" onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter') void register(); }}>
        <h3>{T('Register as asset')}</h3>
        <div className="reg-preview">
          {asset.type === 'image' && <img src={asset.url} alt="" />}
          {asset.type === 'video' && <video src={asset.url} muted preload="metadata" />}
          {asset.type === 'audio' && <audio src={asset.url} controls />}
        </div>
        <label className="reg-row"><span>{T('Asset name')}</span>
          <div className="reg-name"><em>@</em><input ref={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="name" /></div></label>
        <p className="reg-hint">{tag ? <>{T('Write it in a prompt as')} <b>@{tag}</b></> : T('Use letters, numbers, _ and Korean')}{tag !== name && name ? <> · {T('Characters that cannot be used were replaced with _')}</> : null}</p>
        <label className="reg-row"><span>{T('Category')}</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        {msg && <p className={`status ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</p>}
        <div className="dlg-btns">
          <button className="btn" onClick={onClose}>{T('Cancel')}</button>
          <button className="btn primary" disabled={!tag || busy} onClick={() => void register()}>{busy ? '…' : T('Register')}</button>
        </div>
      </div>
    </div>
  );
}

/** mounted once in the app: the small right-click menu and the registration dialog */
export function AssetRegisterHost() {
  const T = useT();
  const { menu, dialog } = useReg();
  useEffect(() => {
    if (!menu) return;
    const close = () => useReg.setState({ menu: null });
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('mousedown', close); window.addEventListener('scroll', close, true); window.addEventListener('keydown', key); window.addEventListener('resize', close);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('scroll', close, true); window.removeEventListener('keydown', key); window.removeEventListener('resize', close); };
  }, [menu]);
  return (
    <>
      {menu && (
        <div className="ctx-menu reg-menu" style={{ left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - 60) }} onMouseDown={(e) => e.stopPropagation()}>
          <button onClick={() => useReg.setState({ menu: null, dialog: menu.asset })}>{T('Register as asset')}…</button>
        </div>)}
      {dialog && <Dialog asset={dialog} onClose={() => useReg.setState({ dialog: null })} />}
    </>
  );
}
