import { useEffect, useState } from 'react';
import type { Asset } from '../types';
import { useT } from '../i18n';

// Videos start loading once they are near the screen (off-screen ones wait), so a long canvas does not open every clip at once.

/** Compact notice shown instead of a picture that cannot be shown. */
function Notice({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const T = useT();
  return <div className="asset-missing">⚠ {text}{onRetry && <button className="mini-link" onClick={onRetry}>{T('Retry')}</button>}</div>;
}

export function AssetView({ asset, className, controls = true, onBroken }: { asset: Asset; className?: string; controls?: boolean; onBroken?: () => void }) {
  const T = useT();
  // 'gone' = the server says 404 (deleted / moved); 'failed' = the file could not be loaded for another reason (server busy, bad file)
  const [state, setState] = useState<'ok' | 'gone' | 'failed' | 'stalled'>('ok');
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);      // video: the user pressed play, so the file is being fetched
  const [tries, setTries] = useState(0);
  const failed = async () => {
    try {
      const r = await fetch(asset.url, { method: 'HEAD' });
      if (r.status === 404) { setState('gone'); onBroken?.(); return; }
    } catch { /* network error → treat as failed */ }
    setState('failed');
  };
  // A video that never gets a first byte (ComfyUI's /view can hang with a 0-byte body) would spin forever: say so after a while.
  useEffect(() => {
    if (asset.type !== 'video' || state !== 'ok' || ready || !playing) return;
    const id = setTimeout(() => setState('stalled'), 15000);
    return () => clearTimeout(id);
  }, [asset.type, asset.url, state, ready, tries, playing]);
  if (asset.type === 'text') return <pre className={`textout ${className ?? ''}`}>{asset.text}</pre>;
  if (state === 'gone') return <Notice text={T('File not found — it was deleted or moved')} />;
  if (state === 'failed') return <Notice text={T('Could not load this file')} onRetry={() => { setState('ok'); setTries(tries + 1); }} />;
  if (state === 'stalled') return <Notice text={T('The server is not sending this file (ComfyUI may be stuck)')} onRetry={() => { setReady(false); setPlaying(false); setState('ok'); setTries(tries + 1); }} />;
  const src = tries ? `${asset.url}${asset.url.includes('?') ? '&' : '?'}r=${tries}` : asset.url;
  // Cards show the server-made first frame and fetch the clip only when it is played: a canvas full of clips would otherwise open
  // one /view stream per card (the browser serves ~6 per host, the rest wait and ComfyUI's connections pile up).
  if (asset.type === 'video') {
    const f = asset.file;
    const poster = f ? `/ltx25_one/thumb?filename=${encodeURIComponent(f.filename)}&subfolder=${encodeURIComponent(f.subfolder)}` : undefined;
    return <video className={className} src={src} poster={poster} preload="none" controls={controls} loop muted playsInline
      onPlay={() => setPlaying(true)} onLoadedMetadata={() => setReady(true)} onError={() => void failed()} />;
  }
  if (asset.type === 'audio') return <audio className={className} src={src} controls onError={() => void failed()} />;
  return <img className={className} src={src} alt="" draggable={false} loading="lazy" onError={() => void failed()} />;
}
