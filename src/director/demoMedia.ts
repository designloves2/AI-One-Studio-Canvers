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

/** a short tone as a WAV data URL: the demo's stand-in for a song (nothing is generated; the real length is in the song data) */
export function demoWavUrl(seconds = 2, hz = 330): string {
  const rate = 8000, n = Math.round(rate * seconds); const b = new Uint8Array(44 + n);
  const w32 = (o: number, v: number) => { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; b[o + 2] = (v >> 16) & 255; b[o + 3] = (v >> 24) & 255; };
  const tag = (o: number, s: string) => { for (let i = 0; i < 4; i++) b[o + i] = s.charCodeAt(i); };
  tag(0, 'RIFF'); w32(4, 36 + n); tag(8, 'WAVE'); tag(12, 'fmt '); w32(16, 16); b[20] = 1; b[22] = 1; w32(24, rate); w32(28, rate); b[32] = 1; b[34] = 8; tag(36, 'data'); w32(40, n);
  for (let i = 0; i < n; i++) b[44 + i] = 128 + Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * 40 * Math.min(1, (n - i) / 800));
  let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return `data:audio/wav;base64,${btoa(s)}`;
}

/** a demo "song" take: the title on a card is not possible for audio, so it is a short tone marked source = 'demo' */
export function demoSongResult(label: string, seed: number, now = new Date().toISOString()): ResultRef {
  return { result_id: `rs_demo_${hash(`song:${label}:${seed}:${now}`).toString(36)}`, file: { filename: `demo-song-${seed}.wav`, subfolder: '', type: 'output' }, kind: 'audio', source: 'demo', data_url: demoWavUrl(2, 220 + (hash(`${label}:${seed}`) % 220)), created_at: now, picked: true };
}

/** the finished episode in the demo: a labelled card (the clips are cards too) */
export function demoFinalResult(label: string, aspect = '16:9', now = new Date().toISOString()): ResultRef {
  const [w, h] = aspect === '9:16' ? [360, 640] : aspect === '1:1' ? [520, 520] : [640, 360];
  return base(`rs_demo_${hash(`final:${label}:${now}`).toString(36)}`, placeholderSvg({ title: label, subtitle: 'clips joined + song', badge: 'DEMO · final', hue: hash(label) % 360, w, h }), now);
}
