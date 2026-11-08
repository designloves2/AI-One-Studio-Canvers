// Automatic card layout: pure functions (no store, no DOM) so the Director adapter, the Live Canvas and the "Tidy up" menu share them.
// A card that makes an image / video grows downward when its result arrives; the layout reserves that room up front,
// so tidied cards never end up on top of each other. A long list of the same chain (9 clips = 9 × prompt → video) is packed as a grid of tiles
// (3 across), not one long column.
import type { GraphEdge, GraphNode } from '../types';

export interface Box { w: number; h: number }
export interface LayoutOptions {
  /** the size of a card; default = `estimateBox` */
  size?: (n: GraphNode) => Box;
  /** tiles per row (default: 3, fewer when there are few) */
  cols?: number;
  gapX?: number; gapY?: number;
  /** reading order of a card (default: its place in the list) */
  order?: (n: GraphNode, i: number) => number;
}

/** cards that show no picture / video (their height is just their controls and text) */
const TEXT_ONLY = new Set(['prompt', 'note', 'h3-turbo', 'import-audio']);
/** the height of the card without its picture / video */
const BASE_H: Record<string, number> = { prompt: 300, note: 170, 'h3-turbo': 460, 'image-generate': 440, 'image-edit': 440, outpaint: 440, 'video-generate': 520, 'video-stitch': 400, 'video-audio': 400, 'music-generate': 520, import: 140, 'import-video': 140, 'import-audio': 220 };

function ratioOf(aspect: unknown): number {
  const m = /^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/.exec(String(aspect ?? '').trim());
  const r = m ? Number(m[2]) / Number(m[1]) : 1;
  return Number.isFinite(r) && r > 0 ? Math.min(1.8, Math.max(0.5, r)) : 1;
}

/** the room a card needs once its result is shown */
export function estimateBox(n: GraphNode): Box {
  const w = n.w ?? 300;
  if (n.defId === 'prompt') {
    const len = String(n.params.text ?? '').length;
    return { w, h: n.h ?? Math.max(BASE_H.prompt, 260 + Math.min(520, Math.ceil(len / 38) * 18)) };
  }
  const base = BASE_H[n.defId] ?? 420;
  if (TEXT_ONLY.has(n.defId)) return { w, h: n.h ?? base };
  const media = Math.round(w * ratioOf(n.params.aspect));
  return { w, h: Math.max(n.h ?? 0, base + media + 40) };
}

/** a measured size is trusted unless the card still has no result (then its result room is kept free) */
export function reserveBox(n: GraphNode, measured?: Box): Box {
  const est = estimateBox(n);
  if (!measured) return est;
  return { w: Math.max(n.w ?? 0, measured.w), h: Math.max(measured.h, TEXT_ONLY.has(n.defId) ? 0 : est.h) };
}

const GAP_X = 80, GAP_Y = 90, INNER_X = 70, INNER_Y = 50;

interface Tile { ids: string[]; w: number; h: number; pos: Map<string, { x: number; y: number }>; key: number }

/**
 * Positions for `nodes` (only these cards are laid out; the result starts at the top-left of their current bounding box).
 *  - shared cards that feed many chains (reference images, 7+1) stand in a column on the left,
 *  - the cards that gather many chains (Video Stitch, the song, the final video) stand to the right,
 *  - every chain in between (prompt → video) is one tile, and the tiles are packed in rows (3 across),
 *  - cards without a wire go below, several per row.
 */
export function layoutCards(nodes: GraphNode[], edges: GraphEdge[], opt: LayoutOptions = {}): Map<string, { x: number; y: number }> {
  const size = opt.size ?? estimateBox;
  const gapX = opt.gapX ?? GAP_X, gapY = opt.gapY ?? GAP_Y;
  const out = new Map<string, { x: number; y: number }>();
  if (!nodes.length) return out;
  const ids = new Set(nodes.map((n) => n.id));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const sizeOf = new Map(nodes.map((n) => [n.id, size(n)]));
  const orderOf = new Map(nodes.map((n, i) => [n.id, (opt.order ?? ((_, k) => k))(n, i)]));
  const es = edges.filter((e) => ids.has(e.source) && ids.has(e.target) && e.source !== e.target);
  const outs = new Map<string, Set<string>>(), ins = new Map<string, Set<string>>();
  for (const n of nodes) { outs.set(n.id, new Set()); ins.set(n.id, new Set()); }
  for (const e of es) { outs.get(e.source)!.add(e.target); ins.get(e.target)!.add(e.source); }
  const startX = Math.min(...nodes.map((n) => n.x)), startY = Math.min(...nodes.map((n) => n.y));

  const loose = nodes.filter((n) => !outs.get(n.id)!.size && !ins.get(n.id)!.size);
  const linked = nodes.filter((n) => outs.get(n.id)!.size || ins.get(n.id)!.size);

  // shared cards: one card feeding / gathering 3 or more others
  const FAN = 3;
  const srcHub = new Set(linked.filter((n) => outs.get(n.id)!.size >= FAN).map((n) => n.id));
  // (a card fed by the shared cards and one prompt is still a chain card: only the cards that gather chains count)
  const sinkHub = new Set(linked.filter((n) => [...ins.get(n.id)!].filter((s) => !srcHub.has(s)).length >= FAN && !srcHub.has(n.id)).map((n) => n.id));
  const walk = (from: Iterable<string>, next: Map<string, Set<string>>): Set<string> => { const seen = new Set<string>(); const st = [...from]; while (st.length) { const id = st.pop()!; for (const t of next.get(id) ?? []) if (!seen.has(t)) { seen.add(t); st.push(t); } } return seen; };
  const right = new Set<string>([...sinkHub, ...walk(sinkHub, outs)]);
  for (const id of srcHub) right.delete(id);
  // the left side: shared source cards and what only feeds them
  const left = new Set<string>([...srcHub].filter((id) => !right.has(id)));

  const tileNodes = linked.filter((n) => !left.has(n.id) && !right.has(n.id));
  // loose helper cards that only feed the right side (the song) belong to the right
  const rightFeed = (n: GraphNode) => { const o = outs.get(n.id)!; return o.size > 0 && [...o].every((t) => right.has(t)); };
  const tileList: GraphNode[] = []; const rightExtra: GraphNode[] = [];
  for (const n of tileNodes) (rightFeed(n) && !ins.get(n.id)!.size ? rightExtra : tileList).push(n);
  for (const n of rightExtra) right.add(n.id);

  // chains: connected pieces of the cards in the middle
  const inMid = new Set(tileList.map((n) => n.id));
  const comp = new Map<string, number>(); const comps: GraphNode[][] = [];
  for (const n of tileList) {
    if (comp.has(n.id)) continue;
    const c = comps.length; comps.push([]); const st = [n.id]; comp.set(n.id, c);
    while (st.length) {
      const id = st.pop()!; comps[c].push(byId.get(id)!);
      for (const t of [...outs.get(id)!, ...ins.get(id)!]) if (inMid.has(t) && !comp.has(t)) { comp.set(t, c); st.push(t); }
    }
  }

  // one tile per chain: its cards in columns by depth, left to right
  const layerPos = (members: GraphNode[]): Tile => {
    const mem = new Set(members.map((m) => m.id));
    const depth = new Map<string, number>();
    const dep = (id: string, seen: Set<string>): number => {
      if (depth.has(id)) return depth.get(id)!; if (seen.has(id)) return 0; seen.add(id);
      const d = Math.max(-1, ...[...ins.get(id)!].filter((s) => mem.has(s)).map((s) => dep(s, seen))) + 1; depth.set(id, d); return d;
    };
    for (const m of members) dep(m.id, new Set());
    const layers: GraphNode[][] = [];
    for (const m of members) (layers[depth.get(m.id)!] ??= []).push(m);
    const pos = new Map<string, { x: number; y: number }>(); let x = 0, h = 0;
    for (const layer of layers) {
      if (!layer) continue;
      layer.sort((a, b) => orderOf.get(a.id)! - orderOf.get(b.id)!);
      let y = 0, w = 0;
      for (const m of layer) { const s = sizeOf.get(m.id)!; pos.set(m.id, { x, y }); y += s.h + INNER_Y; w = Math.max(w, s.w); }
      h = Math.max(h, y - INNER_Y); x += w + INNER_X;
    }
    return { ids: members.map((m) => m.id), w: Math.max(0, x - INNER_X), h, pos, key: Math.min(...members.map((m) => orderOf.get(m.id)!)) };
  };
  const tiles = comps.map((c) => layerPos(c)).sort((a, b) => a.key - b.key);

  // grid of tiles
  const n = tiles.length;
  const cols = Math.max(1, Math.min(opt.cols ?? (n <= 3 ? n : n === 4 ? 2 : 3), n || 1));
  const colW: number[] = [], rowH: number[] = [];
  tiles.forEach((t, i) => { const c = i % cols, r = Math.floor(i / cols); colW[c] = Math.max(colW[c] ?? 0, t.w); rowH[r] = Math.max(rowH[r] ?? 0, t.h); });
  const gridW = colW.reduce((p, w) => p + w + gapX, 0) - (colW.length ? gapX : 0);
  const gridH = rowH.reduce((p, h) => p + h + gapY, 0) - (rowH.length ? gapY : 0);

  // the left column(s): shared source cards, stacked (a second column when it is taller than the grid)
  const stack = (list: GraphNode[], x0: number, limit: number): number => {
    let x = x0, y = startY, w = 0;
    for (const m of list) {
      const s = sizeOf.get(m.id)!;
      if (y > startY && y + s.h > startY + limit) { x += w + INNER_X; y = startY; w = 0; }
      out.set(m.id, { x, y }); y += s.h + INNER_Y; w = Math.max(w, s.w);
    }
    return x + w;
  };
  const leftList = nodes.filter((m) => left.has(m.id)).sort((a, b) => orderOf.get(a.id)! - orderOf.get(b.id)!);
  const limit = Math.max(gridH, 1800);
  const leftEnd = leftList.length ? stack(leftList, startX, limit) : startX - gapX;
  const gx = leftEnd + gapX;
  let acc = 0; const colX = colW.map((w) => { const x = gx + acc; acc += w + gapX; return x; });
  let yy = startY; const rowY = rowH.map((h) => { const y = yy; yy += h + gapY; return y; });
  tiles.forEach((t, i) => { const c = i % cols, r = Math.floor(i / cols); for (const [id, p] of t.pos) out.set(id, { x: colX[c] + p.x, y: rowY[r] + p.y }); });

  // the right side: cards that gather the chains (and the song that goes with them), by depth, centred on the grid
  const rightList = nodes.filter((m) => right.has(m.id));
  if (rightList.length) {
    const rt = layerPos(rightList);
    const rx = gx + gridW + gapX, ry = startY + Math.max(0, Math.round((gridH - rt.h) / 2));
    for (const [id, p] of rt.pos) out.set(id, { x: rx + p.x, y: ry + p.y });
  }

  // cards without any wire: below everything, several per row, same kinds together
  if (loose.length) {
    const sorted = [...loose].sort((a, b) => a.defId.localeCompare(b.defId) || orderOf.get(a.id)! - orderOf.get(b.id)!);
    let bottom = startY;
    for (const m of nodes) { const p = out.get(m.id); if (p) bottom = Math.max(bottom, p.y + sizeOf.get(m.id)!.h); }
    const top = out.size ? bottom + gapY : startY; const per = 4;
    let y = top;
    for (let i = 0; i < sorted.length; i += per) {
      const row = sorted.slice(i, i + per); let x = startX, h = 0;
      for (const m of row) { const s = sizeOf.get(m.id)!; out.set(m.id, { x, y }); x += s.w + gapX; h = Math.max(h, s.h); }
      y += h + gapY;
    }
  }
  return out;
}
