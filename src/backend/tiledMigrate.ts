// The H3 "Kimchy" upscaler became our own "H3 Latent Upscale Tiled (TJ)" (node relay SPEC_RELAY_TILED_UPSCALER): the value, the keys and the
// Director preset were renamed. Saved canvases / presets / Director projects still carry the old names, so they are converted when they are loaded.
// This is the ONLY place the old names are written.
import type { Primitive } from '../types';

const KEYS: [string, string][] = [
  ['hires_kim_up', 'hires_tiled_up'], ['hires_kim_start_mp', 'hires_tiled_start_mp'], ['hires_kim_final_mp', 'hires_tiled_final_mp'],
  ['h3_kim_up', 'h3_tiled_up'], ['h3_kim_final_mp', 'h3_tiled_final_mp'],
];

/** old upscaler value / keys -> new ones (returns the same object when nothing needs to change) */
export function migrateTiledParams<T extends Record<string, Primitive>>(params: T): T {
  let out: Record<string, Primitive> | null = null;
  const set = (k: string, v: Primitive | undefined, del?: string) => { out = out ?? { ...params }; if (v !== undefined) out[k] = v; if (del) delete out[del]; };
  for (const k of ['hires_upscaler', 'h3_upscaler']) if (params[k] === 'kimchy') set(k, 'tiled');
  for (const [from, to] of KEYS) if (from in params) set(to, params[to] === undefined ? params[from] : undefined, from);
  return (out ?? params) as T;
}

/** the Director preset that used the old upscaler */
export const migrateTiledPreset = (preset: string): string => (preset === 'h3_7plus1_kimchy' ? 'h3_7plus1_tiled' : preset);
