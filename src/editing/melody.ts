// Melody Editor core: note model, ABC export (the `abc` input of YuE2) and Standard MIDI File import/export.
// A note is { p: MIDI pitch, s: start, l: length (both in 16th-note steps), v: velocity 1..127 }.
export interface Note { p: number; s: number; l: number; v: number }

export const STEPS_PER_QUARTER = 4;
export const MAX_BARS = 64;
export const PITCH_MIN = 36; // C2
export const PITCH_MAX = 96; // C7
export const METERS = ['4/4', '3/4', '2/4', '6/8', '12/8', '5/4', '2/2'];
export const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm'];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mod12 = (x: number) => ((x % 12) + 12) % 12;

export function parseMeter(m: string) {
  const [n, d] = String(m || '4/4').split('/').map(Number);
  return !(n > 0) || ![1, 2, 4, 8, 16].includes(d) ? { n: 4, d: 4 } : { n, d };
}
export const stepsPerBar = (m: string) => { const { n, d } = parseMeter(m); return Math.round((n * 16) / d); };
export const stepSeconds = (bpm: number) => 60 / bpm / STEPS_PER_QUARTER;
export const beatSteps = (m: string) => { const { n, d } = parseMeter(m); return d === 8 && n % 3 === 0 ? 6 : 16 / d; };

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteName = (p: number) => NAMES[mod12(p)] + (Math.floor(p / 12) - 1);
export const isBlack = (p: number) => [1, 3, 6, 8, 10].includes(mod12(p));
export const midiFreq = (p: number) => 440 * Math.pow(2, (p - 69) / 12);

// ---- key signature + spelling
const SHARPS = ['F', 'C', 'G', 'D', 'A', 'E', 'B'], FLATS = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
const KEY_SIG: Record<string, number> = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7, Am: 0, Em: 1, Bm: 2, 'F#m': 3, 'C#m': 4, 'G#m': 5, 'D#m': 6, 'A#m': 7, Dm: -1, Gm: -2, Cm: -3, Fm: -4, Bbm: -5, Ebm: -6, Abm: -7 };
function keySignature(key: string) {
  const n = KEY_SIG[key] ?? 0; const ks: Record<string, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  if (n > 0) SHARPS.slice(0, n).forEach((L) => { ks[L] = 1; }); else if (n < 0) FLATS.slice(0, -n).forEach((L) => { ks[L] = -1; });
  return { ks, sharps: n >= 0 };
}
const BASE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const WHITE: Record<number, string> = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' };
function spell(p: number, ks: Record<string, number>, preferSharps: boolean) {
  const pc = mod12(p);
  for (const L of LETTERS) if (mod12(BASE[L] + ks[L]) === pc) return { L, acc: ks[L] };
  if (WHITE[pc]) return { L: WHITE[pc], acc: 0 };
  for (const acc of preferSharps ? [1, -1] : [-1, 1]) { const L = WHITE[mod12(pc - acc)]; if (L) return { L, acc }; }
  return { L: 'C', acc: 0 };
}
function letter(p: number, sp: { L: string; acc: number }) {
  const oct = Math.floor((p - sp.acc) / 12) - 1;
  return oct >= 5 ? sp.L.toLowerCase() + "'".repeat(oct - 5) : sp.L + ','.repeat(Math.max(0, 4 - oct));
}

/** YuE2's melody line is monophonic: one note per start, no overlaps. */
export function toMono(notes: Note[], pick: 'high' | 'low' = 'high') {
  const q = notes.map((n) => ({ p: n.p, v: n.v || 90, s: Math.max(0, Math.round(n.s)), l: Math.max(1, Math.round(n.l)) }));
  q.sort((a, b) => a.s - b.s || (pick === 'low' ? a.p - b.p : b.p - a.p));
  const out: Note[] = [];
  for (const n of q) if (!(out.length && out[out.length - 1].s === n.s)) out.push(n);
  for (let i = 0; i < out.length - 1; i++) if (out[i].s + out[i].l > out[i + 1].s) out[i].l = out[i + 1].s - out[i].s;
  return { mono: out, dropped: notes.length - out.length };
}

export interface AbcOpts { notes: Note[]; bpm: number; meter: string; key: string; bars: number; title?: string }
export function buildAbc({ notes, bpm, meter, key, bars, title = '' }: AbcOpts) {
  const spb = stepsPerBar(meter);
  const { mono, dropped } = toMono(notes);
  const lastEnd = mono.length ? mono[mono.length - 1].s + mono[mono.length - 1].l : 0;
  const totalBars = clamp(mono.length ? Math.ceil(lastEnd / spb) : bars, 1, MAX_BARS);
  const total = totalBars * spb;
  const { ks, sharps } = keySignature(key);
  const bar: string[] = []; const lines: string[] = []; let cur = ''; let barIdx = 0; let altered: Record<string, boolean> = {}; let pos = 0;
  const flush = () => { cur += bar.join('') + '|'; bar.length = 0; altered = {}; barIdx++; if (barIdx % 4 === 0) { lines.push(cur); cur = ''; } };
  const dur = (n: number) => (n === 1 ? '' : String(n));
  const emit = (note: Note | null, len: number) => {
    while (len > 0) {
      const room = spb - (pos % spb); const chunk = Math.min(len, room); const more = len - chunk > 0;
      if (note) {
        const sp = spell(note.p, ks, sharps);
        const explicit = sp.acc !== ks[sp.L] || altered[sp.L];
        let acc = '';
        if (explicit) { acc = sp.acc === 1 ? '^' : sp.acc === -1 ? '_' : '='; if (sp.acc !== ks[sp.L]) altered[sp.L] = true; }
        bar.push(acc + letter(note.p, sp) + dur(chunk) + (more ? '-' : ''));
      } else bar.push(chunk === spb ? 'Z' : 'z' + dur(chunk));
      pos += chunk; len -= chunk;
      if (pos % spb === 0) flush();
    }
  };
  for (const n of mono) { if (n.s > pos) emit(null, n.s - pos); emit(n, n.l); }
  if (pos < total) emit(null, total - pos);
  if (cur) lines.push(cur);
  if (lines.length) lines[lines.length - 1] = lines[lines.length - 1].replace(/\|$/, '|]');
  const head = ['X:1', `T:${title.replace(/[\r\n]+/g, ' ')}`, `M:${meter}`, 'L:1/16', `Q:1/4=${Math.round(bpm)}`, 'V: Vocal clef=treble name="Vocal Melody" snm="Vocal"', `K:${key}`, 'V: Vocal'];
  return { abc: head.concat(lines).join('\n') + '\n', dropped, bars: totalBars, noteCount: mono.length, seconds: totalBars * spb * stepSeconds(bpm) };
}

// ---- Standard MIDI File
const vlq = (n: number) => { const out = [n & 0x7f]; while ((n >>= 7) > 0) out.unshift((n & 0x7f) | 0x80); return out; };
export function writeMidi(notes: Note[], { bpm = 120, meter = '4/4', ppq = 480, name = 'Melody' } = {}): Uint8Array {
  const { n, d } = parseMeter(meter); const ev: [number, number, number[]][] = [];
  const tick = (step: number) => Math.round((step * ppq) / STEPS_PER_QUARTER);
  for (const nt of notes) {
    const on = tick(nt.s), off = Math.max(on + 1, tick(nt.s + nt.l)); const p = clamp(Math.round(nt.p), 0, 127), v = clamp(Math.round(nt.v || 90), 1, 127);
    ev.push([on, 1, [0x90, p, v]], [off, 0, [0x80, p, 0]]);
  }
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const nameBytes = [...new TextEncoder().encode(name)]; const trk: number[] = [0x00, 0xff, 0x03, ...vlq(nameBytes.length), ...nameBytes];
  const mpq = Math.round(60000000 / bpm);
  trk.push(0x00, 0xff, 0x51, 0x03, (mpq >> 16) & 255, (mpq >> 8) & 255, mpq & 255, 0x00, 0xff, 0x58, 0x04, n, Math.log2(d), 24, 8);
  let last = 0; for (const [t, , bytes] of ev) { trk.push(...vlq(t - last), ...bytes); last = t; }
  trk.push(0x00, 0xff, 0x2f, 0x00);
  const u32 = (x: number) => [(x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255];
  return new Uint8Array([0x4d, 0x54, 0x68, 0x64, ...u32(6), 0, 0, 0, 1, (ppq >> 8) & 255, ppq & 255, 0x4d, 0x54, 0x72, 0x6b, ...u32(trk.length), ...trk]);
}

export function parseMidi(buf: ArrayBuffer | Uint8Array): { notes: Note[]; bpm: number } {
  const d = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let p = 0;
  const u32 = () => { const v = (d[p] << 24 | d[p + 1] << 16 | d[p + 2] << 8 | d[p + 3]) >>> 0; p += 4; return v; };
  const u16 = () => { const v = d[p] << 8 | d[p + 1]; p += 2; return v; };
  if (String.fromCharCode(d[0], d[1], d[2], d[3]) !== 'MThd') throw new Error('Not a MIDI file');
  p = 4; const hl = u32(); p = 8; u16(); const ntrk = u16(); const div = u16(); p = 8 + hl;
  if (div & 0x8000) throw new Error('SMPTE time base is not supported');
  const raw: { t: number; p: number; v: number; on: boolean }[] = []; let mpq = 500000;
  for (let t = 0; t < ntrk && p + 8 <= d.length; t++) {
    p += 4; const len = u32(); const end = p + len; let tick = 0; let run = 0;
    const readVlq = () => { let v = 0, b; do { b = d[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
    while (p < end) {
      tick += readVlq(); let st = d[p];
      if (st < 0x80) st = run; else { p++; if (st < 0xf0) run = st; }
      if (st === 0xff) { const type = d[p++]; const l = readVlq(); if (type === 0x51 && l === 3 && t === 0 && mpq === 500000) mpq = d[p] << 16 | d[p + 1] << 8 | d[p + 2]; p += l; }
      else if (st === 0xf0 || st === 0xf7) { p += readVlq(); }
      else { const hi = st & 0xf0; const a = d[p++]; const b = hi === 0xc0 || hi === 0xd0 ? 0 : d[p++]; if (hi === 0x90) raw.push({ t: tick, p: a, v: b, on: b > 0 }); else if (hi === 0x80) raw.push({ t: tick, p: a, v: 0, on: false }); }
    }
    p = end;
  }
  raw.sort((a, b) => a.t - b.t); const open = new Map<number, { t: number; v: number }>(); const notes: Note[] = [];
  const step = (tk: number) => (tk * STEPS_PER_QUARTER) / div;
  for (const e of raw) {
    if (e.on) open.set(e.p, { t: e.t, v: e.v });
    else { const o = open.get(e.p); if (o) { notes.push({ p: e.p, s: Math.round(step(o.t)), l: Math.max(1, Math.round(step(e.t - o.t))), v: o.v }); open.delete(e.p); } }
  }
  return { notes: notes.sort((a, b) => a.s - b.s), bpm: Math.round(60000000 / mpq) };
}

export interface MelodyState { notes: Note[]; bpm: number; meter: string; key: string; bars: number }
export const EMPTY_MELODY: MelodyState = { notes: [], bpm: 100, meter: '4/4', key: 'C', bars: 8 };
export function readMelody(json: unknown): MelodyState {
  try { const j = typeof json === 'string' && json ? JSON.parse(json) : null; return j && Array.isArray(j.notes) ? { ...EMPTY_MELODY, ...j } : { ...EMPTY_MELODY }; } catch { return { ...EMPTY_MELODY }; }
}
