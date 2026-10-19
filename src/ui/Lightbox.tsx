// Full-size viewer for a result (image or video). Click outside / Esc to close.
import { useEffect } from 'react';
import { create } from 'zustand';
import { download } from '../engine/actions';
import { useT } from '../i18n';

interface Item { url: string; type: 'image' | 'video'; name: string }
const useLightbox = create<{ item?: Item; open(i: Item): void; close(): void }>((set) => ({ open: (item) => set({ item }), close: () => set({ item: undefined }) }));
export const openLightbox = (i: Item) => useLightbox.getState().open(i);

export function LightboxHost() {
  const T = useT();
  const { item, close } = useLightbox();
  useEffect(() => {
    if (!item) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [item, close]);
  if (!item) return null;
  return (
    <div className="lightbox" onClick={close}>
      {item.type === 'video'
        ? <video src={item.url} controls autoPlay loop onClick={(e) => e.stopPropagation()} />
        : <img src={item.url} alt={item.name} onClick={(e) => e.stopPropagation()} />}
      <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <span className="muted">{item.name}</span>
        <button className="btn" onClick={() => download(item.url, item.name)}>{T('Download')}</button>
        <button className="btn" onClick={close}>✕</button>
      </div>
    </div>
  );
}
