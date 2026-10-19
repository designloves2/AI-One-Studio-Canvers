import type { Asset } from '../types';

export function AssetView({ asset, className, controls = true }: { asset: Asset; className?: string; controls?: boolean }) {
  if (asset.type === 'video') return <video className={className} src={asset.url} controls={controls} loop muted playsInline />;
  if (asset.type === 'audio') return <audio className={className} src={asset.url} controls />;
  if (asset.type === 'text') return <pre className={`textout ${className ?? ''}`}>{asset.text}</pre>;
  return <img className={className} src={asset.url} alt="" draggable={false} loading="lazy" />;
}
