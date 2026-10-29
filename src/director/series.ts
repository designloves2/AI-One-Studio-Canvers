// Series settings helpers: cutting an episode into clips, and turning "1080p + 7+1 Kimchy" into the numbers the H3 Turbo card wants.
// Pure (no DOM, no network).
import type { DirectorSeries, GenPreset, Resolution } from './types';

export const RESOLUTIONS: Resolution[] = ['720p', '1080p', '1440p', '2160p'];
export const PRESETS: GenPreset[] = ['h3_7plus1_kimchy', 'h3_7plus1', 'h3_plain'];
export const PRESET_LABEL: Record<GenPreset, string> = { h3_7plus1_kimchy: '7+1 Kimchy', h3_7plus1: '7+1 (H3 Latent Upscaler)', h3_plain: 'H3 (no 7+1)' };

/** the clip length is fixed to what the H3 card accepts (Clip length 5.2 - 15 s) */
export const MIN_CLIP = 5.2, MAX_CLIP = 15;
const MIN_LAST = 3;   // a last clip shorter than this is merged into the one before it

/**
 * Cut `total` seconds into clips of `clip` seconds. 90 / 10 -> nine 10 s clips. 85 / 10 -> eight 10 s + one 5 s.
 * A tiny remainder (under 3 s) is taken from the clip before it, so no clip is too short to render.
 */
export function splitSeconds(total: number, clip: number): number[] {
  if (!(total > 0) || !(clip > 0)) return [];
  const full = Math.floor(total / clip + 1e-9);
  const rem = Math.round((total - full * clip) * 100) / 100;
  const out = Array.from({ length: full }, () => clip);
  if (rem > 0) {
    if (rem >= MIN_LAST || !out.length) out.push(rem);
    else { out[out.length - 1] = Math.round((clip - (MIN_LAST - rem)) * 100) / 100; out.push(MIN_LAST); }
  }
  return out;
}

const PIXELS: Record<Resolution, [number, number]> = { '720p': [1280, 720], '1080p': [1920, 1080], '1440p': [2560, 1440], '2160p': [3840, 2160] };

/** megapixels of a resolution at an aspect ("1080p" at 16:9 = 2.07). The short side follows the name, the long side follows the aspect. */
export function resolutionMp(res: Resolution, aspect: string): number {
  const [w0, h0] = PIXELS[res] ?? PIXELS['1080p'];
  const short = Math.min(w0, h0);
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspect);
  const a = m ? Number(m[1]) / Number(m[2]) : 16 / 9;
  const ratio = a >= 1 ? a : 1 / a;
  return Math.round(short * short * ratio) / 1e6;
}

export interface TurboSettings { params: Record<string, string | number | boolean>; warnings: string[] }

/** The `h3-turbo` card values for a preset + resolution. Values are clamped to what the card accepts and a note is returned when that changed the request. */
export function turboSettings(s: Pick<DirectorSeries, 'preset' | 'resolution' | 'aspect' | 'start_mp' | 'final_mp'>): TurboSettings {
  const mp = resolutionMp(s.resolution, s.aspect);
  const warnings: string[] = [];
  const clamp = (v: number, lo: number, hi: number, what: string) => {
    const c = Math.min(hi, Math.max(lo, v));
    if (Math.abs(c - v) > 0.005) warnings.push(`${what}: ${s.resolution} is ${v.toFixed(2)} MP, the card allows ${lo}-${hi} MP, so ${c.toFixed(2)} MP is used`);
    return Math.round(c * 100) / 100;
  };
  if (s.preset === 'h3_7plus1_kimchy') return { params: { turbo: 'pdd', hires: true, hires_upscaler: 'kimchy', hires_kim_up: 'neural', hires_kim_start_mp: clamp(s.start_mp ?? 0.5, 0.2, 1, 'Kimchy start size'), hires_kim_final_mp: clamp(s.final_mp ?? mp, 1, 8.5, 'Kimchy final size') }, warnings };
  if (s.preset === 'h3_7plus1') return { params: { turbo: 'pdd', hires: true, hires_upscaler: 'h3', hires_start_mp: clamp(s.start_mp ?? 0.7, 0.2, 1, '7+1 start size'), hires_final_mp: clamp(s.final_mp ?? mp, 0.4, 3, '7+1 final size') }, warnings };
  return { params: { turbo: 'none', hires: false }, warnings };
}

/** the megapixel ranges a mode lets the producer set in the brief (matching the card the value is drawn onto). plain = final only; 7+1 / Kimchy = start + final. */
export function mpRanges(preset: GenPreset): { start: [number, number, number] | null; final: [number, number, number] } {
  if (preset === 'h3_plain') return { start: null, final: [0.25, 4, 0.25] };          // Video Generate → Size (MP)
  if (preset === 'h3_7plus1_kimchy') return { start: [0.2, 1, 0.05], final: [1, 8.5, 0.1] };
  return { start: [0.2, 1, 0.05], final: [0.4, 3, 0.05] };
}

/** the effective start / final MP the canvas will use (what the brief shows when nothing was chosen yet). */
export function defaultMps(s: Pick<DirectorSeries, 'preset' | 'resolution' | 'aspect'>): { start?: number; final: number } {
  const mp = resolutionMp(s.resolution, s.aspect);
  if (s.preset === 'h3_plain') return { final: 0.9 };
  if (s.preset === 'h3_7plus1_kimchy') return { start: 0.5, final: Math.min(8.5, Math.max(1, mp)) };
  return { start: 0.7, final: Math.min(3, Math.max(0.4, mp)) };
}

/** the clip length must be one the card can render; returns the value to use and a note when it had to move */
export function usableClipSeconds(clip: number): { value: number; note?: string } {
  const v = Math.min(MAX_CLIP, Math.max(MIN_CLIP, clip));
  return v === clip ? { value: v } : { value: v, note: `clip length ${clip} s is outside ${MIN_CLIP}-${MAX_CLIP} s, so ${v} s is used` };
}
