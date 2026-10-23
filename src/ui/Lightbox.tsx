// Full-size viewer for a result (image or video). Click outside / Esc to close.
import { useEffect, useRef, useState } from 'react';
import { attachPanZoom } from './panZoom';
import { create } from 'zustand';
import { download } from '../engine/actions';
import { useT } from '../i18n';

interface Item { url: string; type: 'image' | 'video'; name: string }
const useLightbox = create<{ item?: Item; open(i: Item): void; close(): void }>((set) => ({ open: (item) => set({ item }), close: () => set({ item: undefined }) }));
export const openLightbox = (i: Item) => useLightbox.getState().open(i);

export function LightboxHost() {
  const T = useT();
  const { item, close } = useLightbox();
  const host = useRef<HTMLDivElement>(null);
  const pz = useRef<ReturnType<typeof attachPanZoom>>();
  const [info, setInfo] = useState('');
  useEffect(() => {
    setInfo('');
    if (!item) return;
    // wheel = zoom at cursor · drag = pan · double-click = fit; keys: Esc close · + / - zoom · 0 fit
    pz.current = host.current ? attachPanZoom(host.current, () => host.current!.querySelectorAll<HTMLElement>('img, video')) : undefined;
    const zoom = (dy: number) => { const h = host.current; if (h) { const r = h.getBoundingClientRect(); h.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, cancelable: true })); } };
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === '+' || e.key === '=') zoom(-1);
      else if (e.key === '-') zoom(1);
      else if (e.key === '0') pz.current?.reset();
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [item, close]);
  if (!item) return null;
  return (
    <div className="lightbox" onClick={close}>
      <div ref={host} className="lightbox-host" onClick={(e) => e.stopPropagation()}>
        {item.type === 'video'
          ? <video src={item.url} data-pz-ignore controls autoPlay loop onLoadedMetadata={(e) => { const v = e.currentTarget; setInfo(`${v.videoWidth}×${v.videoHeight} · ${v.duration.toFixed(1)}s`); }} />
          : <img src={item.url} alt={item.name} onLoad={(e) => setInfo(`${e.currentTarget.naturalWidth}×${e.currentTarget.naturalHeight}`)} />}
      </div>
      <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <span className="muted">{item.name}{info ? ` — ${info}` : ''}</span>
        <button className="btn" onClick={() => download(item.url, item.name)}>{T('Download')}</button>
        <button className="btn" onClick={close}>✕</button>
      </div>
    </div>
  );
}
