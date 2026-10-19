import { useState } from 'react';
import type { Asset } from '../types';
import { useT } from '../i18n';

/** Compact notice shown instead of a picture that cannot be shown. */
function Notice({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const T = useT();
  return <div className="asset-missing">⚠ {text}{onRetry && <button className="mini-link" onClick={onRetry}>{T('Retry')}</button>}</div>;
}

export function AssetView({ asset, className, controls = true, onBroken }: { asset: Asset; className?: string; controls?: boolean; onBroken?: () => void }) {
  const T = useT();
  // 'gone' = the server says 404 (deleted / moved); 'failed' = the file could not be loaded for another reason (server busy, bad file)
  const [state, setState] = useState<'ok' | 'gone' | 'failed'>('ok');
  const [tries, setTries] = useState(0);
  const failed = async () => {
    try {
      const r = await fetch(asset.url, { method: 'HEAD' });
      if (r.status === 404) { setState('gone'); onBroken?.(); return; }
    } catch { /* network error → treat as failed */ }
    setState('failed');
  };
  if (asset.type === 'text') return <pre className={`textout ${className ?? ''}`}>{asset.text}</pre>;
  if (state === 'gone') return <Notice text={T('File not found — it was deleted or moved')} />;
  if (state === 'failed') return <Notice text={T('Could not load this file')} onRetry={() => { setState('ok'); setTries(tries + 1); }} />;
  const src = tries ? `${asset.url}${asset.url.includes('?') ? '&' : '?'}r=${tries}` : asset.url;
  if (asset.type === 'video') return <video className={className} src={src} controls={controls} loop muted playsInline onError={() => void failed()} />;
  if (asset.type === 'audio') return <audio className={className} src={src} controls onError={() => void failed()} />;
  return <img className={className} src={src} alt="" draggable={false} loading="lazy" onError={() => void failed()} />;
}
