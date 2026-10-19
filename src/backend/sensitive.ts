// "Eye cover" (눈가리기): items marked sensitive are blurred in the gallery.
// The list lives on the ComfyUI side (GET/POST /tj_shared/sensitive_media, key "<subfolder>/<filename>") and is shared
// with the other One Studio galleries; localStorage only mirrors the last list so a reload paints blurred straight away.
import { create } from 'zustand';
import { getJson } from './http';

const MIRROR = 'canvers_sensitive_media_v1';
const readMirror = (): string[] => { try { return JSON.parse(localStorage.getItem(MIRROR) ?? '[]'); } catch { return []; } };
const writeMirror = (items: Set<string>) => { try { localStorage.setItem(MIRROR, JSON.stringify([...items])); } catch { /* private mode */ } };

/** Asset Library items share the same hidden list under reflib/<id> */
export const assetKey = (id: number | string) => `reflib/${id}`;
export const mediaKey = (filename: string, subfolder = '') => `${subfolder}/${filename}`;

interface SensitiveState {
  items: Set<string>;
  /** session-only peek at every hidden item */
  revealAll: boolean;
  loaded: boolean;
  load(): Promise<void>;
  toggle(key: string): void;
  setRevealAll(on: boolean): void;
}

export const useSensitive = create<SensitiveState>((set, get) => ({
  items: new Set(readMirror()), revealAll: false, loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const d = await getJson<{ ok?: boolean; items?: string[] }>('/tj_shared/sensitive_media');
      if (d.ok && Array.isArray(d.items)) { const items = new Set(d.items); writeMirror(items); set({ items }); }
    } catch { /* offline: keep the mirror */ }
    set({ loaded: true });
  },
  toggle: (key) => {
    const on = !get().items.has(key);
    const next = new Set(get().items); if (on) next.add(key); else next.delete(key);
    writeMirror(next); set({ items: next });
    fetch('/tj_shared/sensitive_media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, on }) })
      .then((r) => r.json())
      .then((d) => { if (d?.ok && Array.isArray(d.items)) { const items = new Set<string>(d.items); writeMirror(items); set({ items }); } })
      .catch(() => { const back = new Set(get().items); if (on) back.delete(key); else back.add(key); writeMirror(back); set({ items: back }); });
  },
  setRevealAll: (revealAll) => set({ revealAll }),
}));

/** Blurred right now = marked hidden and not peeking. */
export const useIsBlurred = (key: string) => useSensitive((s) => !s.revealAll && s.items.has(key));
