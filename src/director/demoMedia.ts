// Stand-in pictures for the DEMO (no LLM, no GPU): a cast image or a clip "result" drawn as a labelled colour card (SVG data URL).
// They let the producer click through every step up to the review without generating anything. They are marked source = 'demo'. Pure.
import type { DirectorReference, DirectorShot, ResultRef } from './types';

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export interface CardSpec { title: string; subtitle?: string; badge?: string; hue: number; w: number; h: number }

/** a labelled colour card as an SVG data URL (the text is escaped; nothing from the project can break out of the markup) */
export function placeholderSvg(c: CardSpec): string {
  const { w, h, hue } = c;
  const fs = Math.round(Math.min(w, h) / 9);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 55% 38%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 60% 20%)"/></linearGradient></defs>`
    + `<rect width="${w}" height="${h}" fill="url(#g)"/>`
    + `<circle cx="${w * 0.5}" cy="${h * 0.38}" r="${Math.min(w, h) * 0.16}" fill="rgba(255,255,255,.16)"/>`
    + `<text x="50%" y="${h * 0.66}" text-anchor="middle" font-family="sans-serif" font-size="${fs}" font-weight="700" fill="#fff">${esc(c.title)}</text>`
    + (c.subtitle ? `<text x="50%" y="${h * 0.66 + fs * 1.3}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(fs * 0.55)}" fill="rgba(255,255,255,.8)">${esc(c.subtitle)}</text>` : '')
    + `<text x="${w * 0.04}" y="${h * 0.07}" font-family="sans-serif" font-size="${Math.round(fs * 0.5)}" fill="rgba(255,255,255,.75)">${esc(c.badge ?? 'DEMO')}</text>`
    + `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const base = (id: string, url: string, now: string): ResultRef => ({ result_id: id, file: { filename: 'demo.svg', subfolder: '', type: 'output' }, kind: 'image', source: 'demo', data_url: url, created_at: now, picked: true });

/** a cast image: tall for a person, wide for a place, square for a prop; the colour follows the name and the seed (a new seed = a different take) */
export function demoRefResult(ref: Pick<DirectorReference, 'ref_id' | 'name' | 'kind'>, model: string, seed: number, aspect = '16:9', now = new Date().toISOString()): ResultRef {
  const [w, h] = ref.kind === 'character' ? [480, 640] : ref.kind === 'location' ? (aspect === '9:16' ? [360, 640] : [640, 360]) : [520, 520];
  const url = placeholderSvg({ title: ref.name, subtitle: `${model} · seed ${seed}`, badge: 'DEMO · cast', hue: hash(`${ref.name}:${seed}`) % 360, w, h });
  return base(`rs_demo_${hash(`${ref.ref_id}:${seed}:${now}`).toString(36)}`, url, now);
}

/** a clip "result": the clip number and its length on a colour card in the series' aspect */
export function demoClipResult(label: string, shot: Pick<DirectorShot, 'shot_id' | 'duration_sec' | 'prompt_en'>, seed: number, aspect = '16:9', now = new Date().toISOString()): ResultRef {
  const [w, h] = aspect === '9:16' ? [360, 640] : aspect === '1:1' ? [520, 520] : [640, 360];
  const url = placeholderSvg({ title: `Clip ${label}`, subtitle: `${shot.duration_sec}s · seed ${seed}`, badge: 'DEMO · clip', hue: hash(`${shot.shot_id}:${seed}`) % 360, w, h });
  return base(`rs_demo_${hash(`${shot.shot_id}:${seed}:${now}`).toString(36)}`, url, now);
}

/** add a picked result to a list: the others stay as candidates but are no longer picked */
export function pushPicked(list: ResultRef[], r: ResultRef): void { list.forEach((x) => { x.picked = false; }); list.push(r); }
