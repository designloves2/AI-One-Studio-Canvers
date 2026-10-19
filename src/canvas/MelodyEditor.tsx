import { useEffect, useMemo, useRef, useState } from 'react';
import { useGraph } from '../store/graph';
import { KEYS, METERS, MAX_BARS, PITCH_MAX, PITCH_MIN, beatSteps, buildAbc, isBlack, midiFreq, noteName, parseMidi, readMelody, stepSeconds, stepsPerBar, writeMidi, type MelodyState, type Note } from '../editing/melody';
import { download } from '../engine/actions';
import { useT } from '../i18n';

const CW = 22, RH = 15; // px per 16th step / per semitone
type Voice = OscillatorType;

// computer keyboard → semitone offset from the chosen octave's C
const KEYMAP: Record<string, number> = { z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11, ',': 12 };

/** Piano-roll for a single melody line. Apply stores the notes in the node; the node outputs the ABC text for YuE2. */
export function MelodyEditor() {
  const T = useT();
  const id = useGraph((s) => s.melody);
  const node = useGraph((s) => s.nodes.find((n) => n.id === s.melody));
  const [m, setM] = useState<MelodyState>(readMelody(''));
  const [grid, setGrid] = useState(2); // step snap
  const [voice, setVoice] = useState<Voice>('triangle');
  const [playing, setPlaying] = useState(false);
  const [head, setHead] = useState<number | null>(null);
  const [rec, setRec] = useState(false);
  const [octave, setOctave] = useState(4);
  const [midiIn, setMidiIn] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const hist = useRef<Note[][]>([]);
  const ctx = useRef<AudioContext | null>(null);
  const playRef = useRef<{ stop(): void } | null>(null);
  const recRef = useRef({ on: false, t0: 0, open: new Map<number, Note>() });
  const mRef = useRef(m); mRef.current = m;

  useEffect(() => { if (node) { setM(readMelody(node.params.melody)); hist.current = []; setMsg(''); } }, [id]);
  const close = () => { stop(); useGraph.getState().openMelody(null); };

  const spb = stepsPerBar(m.meter);
  const steps = m.bars * spb;
  const rows = useMemo(() => Array.from({ length: PITCH_MAX - PITCH_MIN + 1 }, (_, i) => PITCH_MAX - i), []);
  const push = (next: Note[]) => { hist.current = [...hist.current.slice(-30), mRef.current.notes]; setM((p) => ({ ...p, notes: next })); };

  // ---- audio
  const audio = () => (ctx.current ??= new AudioContext());
  const blip = (p: number, at = 0, dur = 0.25, vel = 90) => {
    const a = audio(); const o = a.createOscillator(), g = a.createGain(); const t = a.currentTime + at;
    o.type = voice; o.frequency.value = midiFreq(p); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((vel / 127) * 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, dur));
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  };
  const click = (at: number, strong: boolean) => { const a = audio(); const o = a.createOscillator(), g = a.createGain(); const t = a.currentTime + at; o.frequency.value = strong ? 1600 : 1100; g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.06); };

  const stop = () => { playRef.current?.stop(); playRef.current = null; setPlaying(false); setHead(null); recRef.current.on = false; setRec(false); };
  const play = (recording = false) => {
    stop(); const cur = mRef.current; const sec = stepSeconds(cur.bpm); const a = audio(); void a.resume();
    const countIn = recording ? stepsPerBar(cur.meter) : 0;
    const t0 = a.currentTime + 0.1;
    if (!recording) for (const n of cur.notes) blip(n.p, 0.1 + n.s * sec, Math.max(0.08, n.l * sec * 0.95), n.v);
    const bs = beatSteps(cur.meter);
    for (let s = 0; s < (recording ? countIn : cur.bars * stepsPerBar(cur.meter)); s += bs) click(0.1 + s * sec, s % stepsPerBar(cur.meter) === 0);
    const total = (recording ? countIn + cur.bars * stepsPerBar(cur.meter) : cur.bars * stepsPerBar(cur.meter));
    if (recording) { for (let s = countIn; s < total; s += bs) click(0.1 + s * sec, (s - countIn) % stepsPerBar(cur.meter) === 0); recRef.current = { on: true, t0: t0 + countIn * sec, open: new Map() }; }
    let raf = 0; setPlaying(true); setRec(recording);
    const tick = () => {
      const st = (a.currentTime - t0) / sec - countIn; setHead(st >= 0 ? st : null);
      if (a.currentTime - t0 > total * sec) { stop(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); playRef.current = { stop: () => cancelAnimationFrame(raf) };
  };

  // ---- recording input (MIDI keyboard + computer keyboard)
  const noteOn = (p: number, v = 90) => {
    blip(p, 0, 0.4, v);
    const r = recRef.current; if (!r.on) return;
    const s = (audio().currentTime - r.t0) / stepSeconds(mRef.current.bpm);
    if (s < -0.5) return; r.open.set(p, { p, s: Math.max(0, Math.round(s)), l: 1, v });
  };
  const noteOff = (p: number) => {
    const r = recRef.current; const o = r.open.get(p); if (!o) return;
    const s = (audio().currentTime - r.t0) / stepSeconds(mRef.current.bpm); o.l = Math.max(1, Math.round(s - o.s)); r.open.delete(p);
    setM((prev) => ({ ...prev, notes: [...prev.notes, o] }));
  };
  useEffect(() => {
    if (!id) return;
    const dn = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT' || e.repeat) return;
      if (e.key === ' ') { e.preventDefault(); playRef.current ? stop() : play(false); return; }
      if (e.key === 'Escape') { close(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
      const off = KEYMAP[e.key.toLowerCase()]; if (off !== undefined) noteOn(12 * (octave + 1) + off);
    };
    const up = (e: KeyboardEvent) => { const off = KEYMAP[e.key.toLowerCase()]; if (off !== undefined) noteOff(12 * (octave + 1) + off); };
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, [id, octave, voice]);
  useEffect(() => {
    if (!id || !(navigator as any).requestMIDIAccess) return;
    let access: any; const names: string[] = [];
    (navigator as any).requestMIDIAccess().then((a: any) => {
      access = a;
      a.inputs.forEach((inp: any) => { names.push(inp.name); inp.onmidimessage = (ev: any) => { const [st, p, v] = ev.data; const hi = st & 0xf0; if (hi === 0x90 && v > 0) noteOn(p, v); else if (hi === 0x80 || (hi === 0x90 && v === 0)) noteOff(p); }; });
      setMidiIn(names);
    }).catch(() => undefined);
    return () => { access?.inputs?.forEach((i: any) => { i.onmidimessage = null; }); };
  }, [id, voice]);

  // ---- editing
  const undo = () => { const h = hist.current.pop(); if (h) setM((p) => ({ ...p, notes: h })); };
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<{ i: number; mode: 'move' | 'resize'; dx: number; ds: number; p0: number; s0: number; l0: number } | null>(null);
  const cell = (e: React.PointerEvent) => { const r = area.current!.getBoundingClientRect(); return { s: (e.clientX - r.left) / CW, p: PITCH_MAX - Math.floor((e.clientY - r.top) / RH) }; };
  const snap = (s: number) => Math.round(s / grid) * grid;

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; const { s, p } = cell(e); if (p < PITCH_MIN || p > PITCH_MAX) return;
    const hit = m.notes.findIndex((n) => n.p === p && s >= n.s && s < n.s + n.l);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (hit >= 0) {
      const n = m.notes[hit]; hist.current = [...hist.current.slice(-30), m.notes];
      drag.current = { i: hit, mode: s > n.s + n.l - 1 || e.shiftKey ? 'resize' : 'move', dx: s - n.s, ds: s, p0: n.p, s0: n.s, l0: n.l }; blip(n.p, 0, 0.2);
    } else {
      const st = Math.max(0, Math.floor(s / grid) * grid); const note: Note = { p, s: st, l: grid, v: 90 }; blip(p, 0, 0.25);
      hist.current = [...hist.current.slice(-30), m.notes]; setM((prev) => ({ ...prev, notes: [...prev.notes, note] }));
      drag.current = { i: m.notes.length, mode: 'resize', dx: 0, ds: s, p0: p, s0: st, l0: grid };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return; const { s, p } = cell(e);
    setM((prev) => {
      const notes = prev.notes.map((n, i) => {
        if (i !== d.i) return n;
        if (d.mode === 'resize') return { ...n, l: Math.max(grid, snap(s - n.s) || grid) };
        return { ...n, s: Math.max(0, snap(s - d.dx)), p: Math.max(PITCH_MIN, Math.min(PITCH_MAX, p)) };
      });
      return { ...prev, notes };
    });
  };
  const onUp = () => { drag.current = null; };
  const del = (i: number) => push(m.notes.filter((_, j) => j !== i));

  const abc = useMemo(() => buildAbc({ notes: m.notes, bpm: m.bpm, meter: m.meter, key: m.key, bars: m.bars }), [m]);

  const apply = () => {
    const g = useGraph.getState(); g.setParam(id!, 'melody', JSON.stringify(m)); g.setParam(id!, 'abc', abc.abc); g.clearResults(id!); close();
  };
  const importMidi = () => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.mid,.midi';
    i.onchange = async () => {
      const f = i.files?.[0]; if (!f) return;
      try { const r = parseMidi(await f.arrayBuffer()); const end = Math.max(0, ...r.notes.map((n) => n.s + n.l)); push(r.notes); setM((p) => ({ ...p, bpm: r.bpm || p.bpm, bars: Math.min(MAX_BARS, Math.max(p.bars, Math.ceil(end / stepsPerBar(p.meter)))) })); setMsg(`${r.notes.length} notes`); } catch (e) { setMsg((e as Error).message); }
    };
    i.click();
  };
  const exportMidi = () => { const u = URL.createObjectURL(new Blob([writeMidi(m.notes, { bpm: m.bpm, meter: m.meter }).buffer as ArrayBuffer], { type: 'audio/midi' })); download(u, 'melody.mid'); setTimeout(() => URL.revokeObjectURL(u), 2000); };

  if (!id || !node) return null;
  return (
    <div className="viewer melody">
      <div className="viewer-bar">
        <button className="btn primary" onClick={() => (playing ? stop() : play(false))}>{playing && !rec ? '■' : '▶'} {T('Play')}</button>
        <button className={`btn ${rec ? 'rec' : ''}`} onClick={() => (rec ? stop() : play(true))} title={midiIn.length ? midiIn.join(', ') : 'Z S X D C V G B H N J M , = piano keys'}>● {T('Record')}</button>
        <label className="inline">BPM<input type="number" value={m.bpm} min={30} max={240} onChange={(e) => setM({ ...m, bpm: +e.target.value || 100 })} style={{ width: 62 }} /></label>
        <select value={m.meter} onChange={(e) => setM({ ...m, meter: e.target.value })}>{METERS.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={m.key} onChange={(e) => setM({ ...m, key: e.target.value })}>{KEYS.map((x) => <option key={x}>{x}</option>)}</select>
        <label className="inline">{T('Bars')}<input type="number" value={m.bars} min={1} max={MAX_BARS} onChange={(e) => setM({ ...m, bars: Math.max(1, Math.min(MAX_BARS, +e.target.value || 1)) })} style={{ width: 54 }} /></label>
        <select value={grid} onChange={(e) => setGrid(+e.target.value)} title="snap"><option value={1}>1/16</option><option value={2}>1/8</option><option value={4}>1/4</option></select>
        <select value={voice} onChange={(e) => setVoice(e.target.value as Voice)}><option value="triangle">triangle</option><option value="sine">sine</option><option value="square">square</option><option value="sawtooth">saw</option></select>
        <label className="inline">Oct<input type="number" value={octave} min={1} max={7} onChange={(e) => setOctave(+e.target.value)} style={{ width: 46 }} /></label>
        <button className="btn" onClick={undo}>{T('Undo')}</button>
        <button className="btn" onClick={() => push([])}>{T('Clear')}</button>
        <button className="btn" onClick={importMidi}>MIDI ⤒</button>
        <button className="btn" onClick={exportMidi} disabled={!m.notes.length}>MIDI ⤓</button>
        <span className="spacer" />
        <span className="muted">{abc.noteCount} {T('notes')} · {abc.bars} {T('bars')} · {Math.round(abc.seconds)}s{abc.dropped ? ` · ${abc.dropped} ${T('overlapping notes dropped')}` : ''}{msg ? ' · ' + msg : ''}</span>
        <button className="btn primary" onClick={apply}>{T('Apply')}</button>
        <button className="btn" onClick={close}>{T('Cancel')}</button>
      </div>
      <div className="roll-wrap">
        <div className="roll" style={{ width: 52 + steps * CW, height: rows.length * RH }}>
          <div className="keys">{rows.map((p) => <div key={p} className={`key ${isBlack(p) ? 'blk' : ''}`} style={{ height: RH }} onPointerDown={() => blip(p, 0, 0.4)}>{p % 12 === 0 ? noteName(p) : ''}</div>)}</div>
          <div className="grid" ref={area} style={{ width: steps * CW, height: rows.length * RH, backgroundSize: `${CW * grid}px ${RH}px, ${CW * spb}px ${RH}px, 100% ${RH}px` }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onContextMenu={(e) => { e.preventDefault(); const { s, p } = cell(e as unknown as React.PointerEvent); const i = m.notes.findIndex((n) => n.p === p && s >= n.s && s < n.s + n.l); if (i >= 0) del(i); }}>
            {rows.map((p, i) => isBlack(p) ? <div key={p} className="blkrow" style={{ top: i * RH, height: RH }} /> : null)}
            {m.notes.map((n, i) => <div key={i} className="note" style={{ left: n.s * CW, top: (PITCH_MAX - n.p) * RH, width: Math.max(4, n.l * CW - 1), height: RH - 1, opacity: 0.55 + (n.v / 127) * 0.45 }} onDoubleClick={() => del(i)} />)}
            {head !== null && <div className="playhead" style={{ left: head * CW }} />}
          </div>
        </div>
      </div>
      <div className="melody-foot muted">{T('Click = add note · drag = move · drag right edge (or Shift+drag) = length · double-click / right-click = delete · Space = play')}</div>
    </div>
  );
}
