// Card decks: ready-made chains of cards you can spread on the canvas in one click, plus your own saved selections.
import { useGraph } from './store/graph';
import type { Primitive } from './types';
import { PRODUCTION_DECKS } from './decks.production';

export interface DeckNode { k: string; def: string; x: number; y: number; engine?: string; params?: Record<string, Primitive> }
export interface Deck { id: string; name: string; note: string; nodes: DeckNode[]; edges: [string, string, string, string][]; user?: boolean }

const C = 400, R = 340;
const n = (k: string, def: string, col: number, row: number, extra: Partial<DeckNode> = {}): DeckNode => ({ k, def, x: col * C, y: row * R, ...extra });

export const BUILTIN_DECKS: Deck[] = [
  { id: 'img-to-vid', name: 'Prompt → Image → Prompt → Video', note: 'Make an image, look at it, then animate it.',
    nodes: [n('p1', 'prompt', 0, 0, { params: { text: 'a lighthouse on a cliff at dusk, cinematic' } }), n('g', 'image-generate', 1, 0), n('v1', 'preview', 2, 0), n('p2', 'prompt', 2, 1, { params: { text: 'slow camera push-in, waves crashing, wind in the grass' } }), n('vg', 'video-generate', 3, 0), n('v2', 'preview', 4, 0)],
    edges: [['p1', 'text', 'g', 'prompt'], ['g', 'image', 'v1', 'image'], ['v1', 'out', 'vg', 'image'], ['p2', 'text', 'vg', 'prompt'], ['vg', 'video', 'v2', 'image']] },
  { id: 'zimage-krea-h3', name: 'Z-Image → Krea 2 (i2i) → H3 7+1 + LoRA', note: 'Draft with Z-Image, restyle with Krea 2, animate with H3 Turbo 7+1 and a LoRA card.',
    nodes: [n('p', 'prompt', 0, 0), n('z', 'image-generate', 1, 0, { engine: 'zimage' }), n('k', 'image-edit', 2, 0, { engine: 'krea2-i2i' }), n('pv', 'prompt', 2, 1, { params: { text: 'the character turns and smiles, soft light, subtle camera move' } }), n('t', 'h3-turbo', 3, 1), n('l', 'lora-card', 3, 2), n('h', 'video-generate', 3, 0, { engine: 'h3' }), n('v', 'preview', 4, 0)],
    edges: [['p', 'text', 'z', 'prompt'], ['p', 'text', 'k', 'prompt'], ['z', 'image', 'k', 'image'], ['k', 'image', 'h', 'image'], ['pv', 'text', 'h', 'prompt'], ['t', 'card', 'h', 'cards'], ['l', 'lora', 'h', 'loras'], ['h', 'video', 'v', 'image']] },
  { id: 'ref-video-up', name: 'Reference images → Video → Upscale → Interpolate', note: 'Up to 9 reference images drive an H3 reference video, then enlarge and smooth it.',
    nodes: [n('i1', 'import', 0, 0), n('i2', 'import', 0, 1), n('i3', 'import', 0, 2), n('p', 'prompt', 1, 2), n('vg', 'video-generate', 2, 0, { engine: 'h3-ref' }), n('up', 'pp-upscale', 3, 0), n('ip', 'pp-interpolate', 4, 0), n('v', 'preview', 5, 0)],
    edges: [['i1', 'image', 'vg', 'image'], ['i2', 'image', 'vg', 'image'], ['i3', 'image', 'vg', 'image'], ['p', 'text', 'vg', 'prompt'], ['vg', 'video', 'up', 'video'], ['up', 'video', 'ip', 'video'], ['ip', 'video', 'v', 'image']] },
  { id: 'post-stitch', name: 'Upscale / Deblur → Stitch', note: 'Three clips are cleaned up on different routes and joined into one video.',
    nodes: [n('a', 'import-video', 0, 0), n('b', 'import-video', 0, 1), n('c', 'import-video', 0, 2), n('u1', 'pp-upscale', 1, 0), n('d', 'pp-deblur', 2, 0), n('u2', 'pp-upscale', 1, 1), n('st', 'video-stitch', 3, 1), n('v', 'preview', 4, 1)],
    edges: [['a', 'video', 'u1', 'video'], ['u1', 'video', 'd', 'video'], ['b', 'video', 'u2', 'video'], ['d', 'video', 'st', 'videos'], ['u2', 'video', 'st', 'videos'], ['c', 'video', 'st', 'videos'], ['st', 'video', 'v', 'image']] },
  { id: 'video-edit', name: 'Load Video → Prompt → Video Edit', note: 'Re-render an existing clip with LTX 2.5 following a prompt.',
    nodes: [n('l', 'import-video', 0, 0), n('p', 'prompt', 0, 1, { params: { text: 'same scene, golden hour light, film look' } }), n('e', 'video-refine', 1, 0), n('v', 'preview', 2, 0)],
    edges: [['l', 'video', 'e', 'video'], ['p', 'text', 'e', 'prompt'], ['e', 'video', 'v', 'image']] },
  { id: 'face-up', name: 'Load Video → Face Refine → View → Upscale → View', note: 'Fix small faces first, check the result, then enlarge.',
    nodes: [n('l', 'import-video', 0, 0), n('f', 'face-refine', 1, 0), n('v1', 'preview', 2, 0), n('u', 'pp-upscale', 3, 0), n('v2', 'preview', 4, 0)],
    edges: [['l', 'video', 'f', 'video'], ['f', 'video', 'v1', 'image'], ['v1', 'out', 'u', 'video'], ['u', 'video', 'v2', 'image']] },
  { id: 'charsheet', name: 'Character Sheet', note: 'One character image → 8-view model sheet (+ turnaround video).',
    nodes: [n('i', 'import', 0, 0), n('c', 'character-sheet', 1, 0), n('v', 'preview', 2, 0)],
    edges: [['i', 'image', 'c', 'image'], ['c', 'image', 'v', 'image']] },
  { id: 'asset-h3', name: 'Asset Library → H3 reference video (@names)', note: 'Pick characters / places from your library, write @name in the prompt.',
    nodes: [n('a', 'asset-library', 0, 0), n('p', 'prompt', 0, 1, { params: { text: '@hero walks into @room and looks around' } }), n('vg', 'video-generate', 1, 0, { engine: 'h3-ref' }), n('v', 'preview', 2, 0)],
    edges: [['a', 'assets', 'vg', 'assets'], ['p', 'text', 'vg', 'prompt'], ['vg', 'video', 'v', 'image']] },
  { id: 'music', name: 'Prompt → Music → Listen', note: 'Style (and lyrics) → music.',
    nodes: [n('p', 'prompt', 0, 0, { params: { text: 'dreamy synthwave, warm pads, 100 bpm' } }), n('m', 'music-generate', 1, 0), n('v', 'preview', 2, 0)],
    edges: [['p', 'text', 'm', 'prompt'], ['m', 'audio', 'v', 'image']] },
];

BUILTIN_DECKS.push(...PRODUCTION_DECKS);

const KEY = 'canvers.decks.v1';
export const userDecks = (): Deck[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };
const saveUser = (d: Deck[]) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* full */ } };
export const deleteDeck = (id: string) => saveUser(userDecks().filter((d) => d.id !== id));

/** save the selected cards (and the wires between them) as a deck */
export function saveSelectionAsDeck(name: string): Deck | null {
  const { nodes, edges, selected } = useGraph.getState();
  const sel = nodes.filter((x) => selected.includes(x.id) && x.defId !== 'group');
  if (!sel.length) return null;
  const x0 = Math.min(...sel.map((x) => x.x)), y0 = Math.min(...sel.map((x) => x.y));
  const deck: Deck = {
    id: `u${Date.now()}`, name, note: `${sel.length} cards`, user: true,
    nodes: sel.map((x) => ({ k: x.id, def: x.defId, x: x.x - x0, y: x.y - y0, engine: x.engineId, params: x.params })),
    edges: edges.filter((e) => sel.some((s) => s.id === e.source) && sel.some((s) => s.id === e.target)).map((e) => [e.source, e.sourceHandle, e.target, e.targetHandle] as [string, string, string, string]),
  };
  saveUser([deck, ...userDecks()]);
  return deck;
}

/** spread a deck on the canvas, below whatever is already there */
export function insertDeck(deck: Deck, at?: { x: number; y: number }): Map<string, string> {
  const g = useGraph.getState();
  const ox = at?.x ?? (g.nodes.length ? Math.min(...g.nodes.map((x) => x.x)) : 80);
  const oy = at?.y ?? (g.nodes.length ? Math.max(...g.nodes.map((x) => x.y + (x.h ?? 300))) + 80 : 80);
  const ids = new Map<string, string>();
  for (const dn of deck.nodes) {
    const id = useGraph.getState().addNode(dn.def, ox + dn.x, oy + dn.y, {});
    ids.set(dn.k, id);
    if (dn.engine) useGraph.getState().setEngine(id, dn.engine);
    for (const [k, v] of Object.entries(dn.params ?? {})) useGraph.getState().setParam(id, k, v);
  }
  for (const [a, ah, b, bh] of deck.edges) { const s = ids.get(a), t = ids.get(b); if (s && t) useGraph.getState().connect({ source: s, sourceHandle: ah, target: t, targetHandle: bh }); }
  useGraph.getState().select([...ids.values()]);
  useGraph.getState().requestFit();
  // once the cards are drawn, stack the ones that share a column so tall cards never overlap
  setTimeout(() => {
    const st = useGraph.getState();
    const mine = [...ids.values()].map((id) => st.nodes.find((x) => x.id === id)!).filter(Boolean);
    const cols = new Map<number, typeof mine>();
    for (const nd of mine) cols.set(nd.x, [...(cols.get(nd.x) ?? []), nd]);
    const moves: { id: string; x: number; y: number }[] = [];
    for (const col of cols.values()) {
      col.sort((a, b) => a.y - b.y);
      let y = col[0].y;
      for (const nd of col) {
        const h = document.querySelector(`.react-flow__node[data-id="${nd.id}"]`)?.getBoundingClientRect().height ?? 260;
        const z = Number(document.querySelector('.react-flow__viewport')?.getAttribute('style')?.match(/scale\(([\d.]+)\)/)?.[1] ?? 1);
        const yy = Math.max(nd.y, y); if (yy !== nd.y) moves.push({ id: nd.id, x: nd.x, y: yy });
        y = yy + h / z + 40;
      }
    }
    if (moves.length) { st.moveMany(moves); st.requestFit(); }
  }, 250);
  return ids;
}
