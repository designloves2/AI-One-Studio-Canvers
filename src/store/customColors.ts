// Card colours the user saved (right-click → Card colour → custom): background and text lists, newest first, at most 12 each.
import { create } from 'zustand';

export type ColorKind = 'bg' | 'text';
const KEYS: Record<ColorKind, string> = { bg: 'canvers_custom_colors_v1', text: 'canvers_custom_text_colors_v1' };
const read = (k: ColorKind): string[] => { try { const v = JSON.parse(localStorage.getItem(KEYS[k]) ?? '[]'); return Array.isArray(v) ? v.filter((c) => /^#[0-9a-f]{6}$/i.test(c)) : []; } catch { return []; } };
const write = (k: ColorKind, c: string[]) => { try { localStorage.setItem(KEYS[k], JSON.stringify(c)); } catch { /* private mode */ } };

export const useCustomColors = create<{ bg: string[]; text: string[]; add(k: ColorKind, c: string): void; remove(k: ColorKind, c: string): void }>((set, get) => ({
  bg: read('bg'), text: read('text'),
  add: (k, c) => { const next = [c.toLowerCase(), ...get()[k].filter((x) => x !== c.toLowerCase())].slice(0, 12); write(k, next); set({ [k]: next } as any); },
  remove: (k, c) => { const next = get()[k].filter((x) => x !== c.toLowerCase()); write(k, next); set({ [k]: next } as any); },
}));
