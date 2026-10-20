// Live Canvas: talk to the LLM, it reads the canvas and answers with a JSON "plan" (add / wire / edit / arrange / run …) that the app executes.
// The LLM backends here are plain text-in / text-out, so tool use is a JSON protocol instead of native tool calls.
import { liveLlmSettings, runLlm } from './llm';
import { useGraph } from '../store/graph';
import { useSettings } from '../store/settings';
import { t } from '../i18n';
import { REGISTRY, byId, compatible } from '../registry';
import type { ParamDef } from '../types';
import { runNode, runAll, stopAll } from '../engine/actions';
import { askConfirm } from '../ui/dialog';
import { BUILTIN_DECKS, userDecks, insertDeck, type Deck } from '../decks';
import { COMBOS } from './liveCombos';
import type { GraphNode, Primitive } from '../types';

export interface LiveMsg { role: 'user' | 'assistant'; text: string; notes?: string[]; suggest?: string[]; error?: boolean }

type Params = Record<string, Primitive>;
type Place = 'below' | 'right' | 'left' | 'above';
interface PlanCard { id?: string; def: string; title?: string; params?: Params; text?: string; engine?: string; color?: string; textColor?: string; row?: number; col?: number; near?: string; place?: Place }
interface ArrangeSpec { mode: 'flow' | 'grid' | 'row' | 'column' | 'group-by-type'; ids?: string[]; cols?: number; gap?: number }
interface AlignSpec { ids: string[]; edge: 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y' }
interface Plan {
  say?: string;
  /** load a ready-made deck (a whole wired project); its cards become addressable as "<as>.<key>" */
  decks?: { deck: string; as?: string; near?: string; place?: Place }[];
  cards?: PlanCard[];
  links?: { from: string; to: string; fromPort?: string; toPort?: string }[];
  unlink?: { from: string; to: string }[];
  set?: { id: string; title?: string; params?: Params; engine?: string; color?: string; textColor?: string; locked?: boolean; width?: number; x?: number; y?: number; dx?: number; dy?: number }[];
  duplicate?: { id: string; as?: string }[];
  remove?: string[];
  move?: { id: string; x?: number; y?: number; dx?: number; dy?: number }[];
  arrange?: ArrangeSpec;
  align?: AlignSpec;
  distribute?: { ids: string[]; axis: 'x' | 'y' };
  group?: { ids: string[]; title?: string }[];
  ungroup?: string[];
  clear_results?: string[];
  select?: string[];
  /** ask for the full description + values of these card types before planning (compact mode) */
  need_details?: string[];
  /** up to 4 short follow-up ideas shown as buttons under the reply */
  suggest?: string[];
  run?: string[];
  stop?: boolean;
  fit?: boolean;
}

// ------------------------------------------------------------------ what the LLM is told
const SKIP = new Set(['router', 'compare', 'melody-editor', 'painter', 'color-palette', 'comfy-workflow', 'toggle', 'number', 'text-data', 'seed-node', 'import-audio']);
function paramLine(p: ParamDef): string {
  const c = p.control; const d = p.default === '' ? '""' : String(p.default);
  const t = c.kind === 'select' ? (c.options.length ? c.options.slice(0, 8).join('|') + (c.options.length > 8 ? '|…' : '') : c.source ? `list:${c.source}` : 'text')
    : c.kind === 'slider' || c.kind === 'number' ? `${c.min ?? ''}..${c.max ?? ''}` : c.kind === 'toggle' ? 'on/off' : c.kind === 'seed' ? 'seed' : c.kind;
  return `${p.id}(${t};${d})`;
}
/** Card list for the LLM. compact = id, title, ports, engines. full adds a short description and the main values of every card. */
function catalog(full: boolean, only?: Set<string>): string {
  return REGISTRY.filter((d) => !SKIP.has(d.id) && (!only || only.has(d.id))).map((d) => {
    const ins = d.inputs.map((i) => `${i.id}:${i.type}${i.multi ? '*' : ''}${i.optional ? '?' : ''}`).join(',');
    const outs = d.outputs.map((o) => `${o.id}:${o.type}`).join(',');
    const eng = d.engines?.length ? ` engines ${d.engines.map((e) => e.id).join('/')}` : '';
    let line = `${d.id} = ${d.title} [in ${ins || '-'}; out ${outs || '-'}]${eng}`;
    if (full || only) {
      if (d.description) line += `
    ${short(d.description, 110)}`;
      const ps = (d.params.length ? d.params : d.engines?.[0]?.params ?? []).filter((p) => !p.advanced).slice(0, 10).map(paramLine);
      if (ps.length) line += `
    values: ${ps.join(' ')}`;
    }
    return line;
  }).join('\n');
}

const short = (v: unknown, n = 60) => { const s = String(v ?? '').replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n) + '…' : s; };
const KEY_PARAMS = ['seconds', 'aspect', 'megapixels', 'steps'];

/** The whole canvas as compact text: cards (id, type, title, engine, position, key values, results) and wires. */
export function canvasState(): string {
  const { nodes, edges } = useGraph.getState();
  const real = nodes.filter((n) => !n.members);
  if (!real.length) return '(the canvas is empty)';
  const lines = real.slice(0, 80).map((n) => {
    const info: string[] = [];
    if (n.defId === 'prompt' || n.defId === 'note') info.push(`text="${short(n.params.text)}"`);
    else for (const k of KEY_PARAMS) if (n.params[k] !== undefined && n.params[k] !== '') info.push(`${k}=${short(n.params[k], 20)}`);
    if (n.results.length) info.push(`result: ${n.results.length} ${n.results[0].type}`);
    if (n.locked) info.push('locked');
    return `${n.id} | ${n.defId} | "${short(n.title ?? '', 40)}" | ${n.engineId ?? '-'} | (${Math.round(n.x)},${Math.round(n.y)}) | ${info.join(' ')}`;
  });
  const wires = edges.filter((e) => real.some((n) => n.id === e.source) && real.some((n) => n.id === e.target)).slice(0, 120).map((e) => `${e.source}.${e.sourceHandle} -> ${e.target}.${e.targetHandle}`);
  const sel = useGraph.getState().selected.filter((id) => real.some((n) => n.id === id));
  const groups = nodes.filter((n) => n.members).map((n) => `${n.id} "${short(n.title ?? '', 30)}" = ${n.members!.join(',')}`);
  return `Cards (id | type | "title" | engine | (x,y) | values):\n${lines.join('\n')}\nWires:\n${wires.join('\n') || '(none)'}${groups.length ? `\nGroups:\n${groups.join('\n')}` : ''}`;
}

const PRODUCTION_MODE = `
PRODUCTION MODE — when the user names a project ("… 광고 영상 만들 준비해줘", "… 뮤직비디오 만들어줘", "브이로그", "스토리보드", "단편 영상" …)
You are the director/producer. Do NOT ask for details and do NOT leave placeholders like "[scene 1]": decide the concept, tone, structure, shot list and every prompt text yourself, write real content, and state your key assumptions in one or two sentences in "say" (the user can then change anything). Ask a question only if the subject itself is missing. "준비" = build the canvas only; never run unless asked.
Always create, in this order: (1) one Note card (def "note", params.text = the creative brief: logline, concept, mood/style, length, aspect, and the shot list as numbered lines), then the pipeline below. Default length: ad 30s, music video ~60s, vlog ~45s. Use 16:9 unless told otherwise. Shots are 5-15 s and add up to the length. Put the shot number in the titles ("샷 1 (8초)").
Pipelines (cards via "near"/"row"/"col", wires via "links" — ports are chosen automatically):
- AD: reference-image prompt cards (def prompt) in one row -> each wired to its own "image-generate" card placed below it. Shot prompt cards (def prompt) in the next row; below each shot a "video-generate" card (engine "h3-ref" when it uses a reference image, else "h3"; params seconds) wired from its shot prompt; wire the matching reference image-generate card to the video card's image port. One "video-stitch" card wired from all video cards (near the last video, place right). Optional when asked: "music-generate" -> "video-audio" with the stitched video.
- MUSIC VIDEO: a prompt card with the song concept -> "music-writer" (params task "lyrics from theme") -> its text wired to a "music-generate" card's lyrics port; a prompt card with the music style wired to music-generate's prompt port. "beat-detect" wired from the music-generate audio. Shots follow the song structure (intro, verse, chorus, bridge, outro) with the lyric lines in each shot's prompt; one video-generate card per shot (below its prompt, wired); "video-stitch" from all videos; "video-audio" with the stitch video and the music-generate audio.
- VLOG: scene prompt cards (a day / trip structure) -> each wired to an "image-generate" card (key frame), each image wired to a "video-generate" card (engine h3, image-to-video) placed below, plus the same scene prompt wired to the video card; "video-stitch" at the end.
- STORYBOARD (frames only): shot prompt cards -> one "image-generate" per shot below it, arranged as a tidy row; no video cards.
- IMAGE SET / CHARACTER SHEET etc.: prompt cards + image-generate (or "character-sheet") cards.
- More situations (same rules: brief note + real texts + wired pipeline): SHORT-FORM / REELS (9:16, 15-30 s, hook in the first shot, 3-5 shots) · PRODUCT INTRO / UNBOXING · TRAILER / TEASER (3-5 shots, title card last) · ANIMATED SHORT / STORY (character-sheet card first, then shots that refer to it) · LYRIC VIDEO (lyrics sections as shots over the music) · GAME / FILM CINEMATIC INTRO · EXPLAINER / EDUCATION (one idea per shot) · FASHION / LOOKBOOK (image-generate set, then short motion clips) · TRAVEL / EVENT / WEDDING highlight · SNS AD SERIES (same idea in several aspects 16:9, 9:16, 1:1: duplicate the shot cards and set aspect) · POSTER / THUMBNAIL / PRODUCT IMAGE SET (prompt + image-generate per image, several variations) · CHARACTER DESIGN (character-sheet) · NARRATION / VOICE (put spoken lines in <d> in the shots; a music-generate or import-audio for sound) · LOCALIZED VERSIONS (copy the shot prompts, change the spoken language).
- Working with what exists: if cards are already on the canvas, extend or edit them instead of starting over. For the user's own footage: "import-video" -> post-processing cards (pp-upscale, pp-denoise, pp-deblur, pp-interpolate, pp-grain, pp-resize), "face-refine", "video-refine", "video-audio" to add sound, "video-stitch" to join clips, "scene-detect"/"beat-detect" for timing, "extract-frame" for a key frame. For the user's own images: "import" -> image-edit / upscale / remove-bg / video-generate (image-to-video). Wire in the order the data flows (source -> processing -> result) and finish with a "preview" card for the result when useful.
- Revisions: when the user says "shot 3 should be …", "make it more dramatic", "add a shot", "change the product name", edit the matching prompt cards (set) or add cards in the right place and keep the shot numbers/durations consistent (renumber titles, keep the total length).
Reference-image prompt cards are titled "레퍼런스 이미지 N: …"; shot prompt cards use the H3 shot style above and mention @imageN when they use that reference.
`;

const allDecks = (): Deck[] => [...BUILTIN_DECKS, ...userDecks()];
const findDeck = (ref: string): Deck | undefined => { const r = String(ref ?? '').toLowerCase(); return allDecks().find((d) => d.id.toLowerCase() === r || d.name.toLowerCase() === r); };
/** "id = name - note [cards: key:def …]" for every deck, so the LLM knows which key is which card */
function deckList(tiny = false): string {
  if (tiny) return allDecks().map((d) => `${d.id} = ${d.name} [${d.nodes.map((x) => x.k).join(' ')}]`).join('\n');
  return allDecks().map((d) => `${d.id} = ${d.name} — ${short(d.note, 90)} [cards: ${d.nodes.map((x) => `${x.k}:${x.def}`).join(' ')}]`).join('\n');
}

const SYSTEM = (state: string, cards: string, compact: boolean, tiny = false) => `You are the Live Canvas assistant of AI ONE Studio Canvers, a node-card canvas for AI image/video/music generation.
You can READ the canvas (state below) and CHANGE it. The user talks to you; you answer with ONE JSON object and nothing else (no markdown, no code fence). The app executes it.

JSON (every key except "say" is optional; use only what is needed):
{"say":"short reply in the user's language (answer questions about the canvas here)",
 "cards":[{"id":"v1","def":"video-generate","title":"…","engine":"h3","params":{"seconds":8},"near":"<existing or new card id>","place":"below|right|left|above","row":0,"col":0,"color":"#2a1d1f"}],
 "links":[{"from":"<id>","to":"<id>","fromPort":"text","toPort":"prompt"}],
 "unlink":[{"from":"<id>","to":"<id>"}],
 "set":[{"id":"<id>","title":"…","params":{"text":"…"},"engine":"…","color":"#hex","textColor":"#hex","locked":true,"width":340}],
 "duplicate":[{"id":"<id>","as":"copy1"}],
 "remove":["<id>"],
 "move":[{"id":"<id>","x":0,"y":0}] or [{"id":"<id>","dx":50,"dy":0}]   (moving a card = "move", not "set"),
 "arrange":{"mode":"flow|grid|row|column|group-by-type","ids":["…"],"cols":3},
 "align":{"ids":["…"],"edge":"left|right|top|bottom|center-x|center-y"},
 "distribute":{"ids":["…"],"axis":"x|y"},
 "group":[{"ids":["…"],"title":"…"}], "ungroup":["<group id>"],
 "clear_results":["<id>"], "select":["<id>"], "decks":[{"deck":"<deck id>","as":"d1","near":"<card id>","place":"below"}],
 "suggest":["2-4 short, useful next steps the user could ask for"], "run":["<id>"|"all"], "stop":true, "fit":true}

How it works
- New cards: "id" is your own alias (used by links and near). Place them with "near"+"place" (relative to a card) OR with "row"/"col" (a grid block the app puts in free space); with neither, they go below everything. Never give coordinates for new cards. The app always avoids overlaps.
- Wires: "links" need card ids (existing ids from the state, or aliases of cards created in the same reply). Ports are optional: the app picks the first compatible pair (e.g. text -> prompt); give them when ambiguous. Ports are listed as id:type; "*" = takes several wires.
- "For each of N cards" = one new card per source card, each with a link, placed with near=<source>, place=below.
- "arrange": 'flow' = left-to-right by wires (best for connected cards), 'grid' = tidy grid, 'row'/'column' = one line, 'group-by-type' = same card types together. Without "ids" it arranges every card. When asked to tidy / sort / align the canvas pick 'flow' if cards are wired, otherwise 'group-by-type' or 'grid'.
- "run" starts generation (it uses the GPU and takes minutes): only when the user asks to run/generate. "all" runs everything.
- DECKS are ready-made, correctly wired projects (list below). When a deck fits the request, load it with "decks" instead of building every card yourself, then fill and adapt it in the same reply: its cards are addressed as "<as>.<key>" (e.g. "d1.s2" is the card with key s2) in "set", "links", "remove", "duplicate" etc. Fill every text (brief note, prompts) with real content, delete cards you don't need, add cards ("cards") or duplicate for more shots, keep wiring complete. Use plain "cards" when no deck fits or for the parts a deck doesn't cover.
- Mix freely: any cards can be combined when their ports match (see COMBINING CARDS). Think about what the user will actually need next (references, music, upscaling, a preview) and include it when it clearly helps.
- Always write real text into every Prompt / Note card you create (never leave them empty or as "[...]" placeholders): invent concrete, usable content from the user's topic.
- Never invent card types or ids. If something is unclear or missing, ask in "say" and return no changes. Do not repeat what already exists.
- Prompt card: {"def":"prompt","params":{"text":"..."}} — the text the user sends to a generator. Video Generate ("video-generate"): engines h3 (text / first-last frame), h3-ref (multi-reference), ltx25; params seconds (5-15), aspect "16:9"|"9:16"|"1:1". When the source prompt's title has a duration like "(8초)", use THAT card's own duration as seconds (each card its own number). Image Generate ("image-generate"): engines zimage, klein, krea2, sdxl, anima, qwen, qwen21; params aspect, megapixels.
- Titles: short; Korean when the user writes Korean. A shot card with a duration puts it in the title: "프롬프트 1 (8초)".

Writing MiniMax H3 video prompts (shot cards): 2-4 sentences of present-tense cinematic English: subject, action, setting, camera move, light, mood, then "Ambient sound:" and, if needed, spoken words as <d>[Korean] exact words</d>. Keep characters/products/look consistent between shots. Refer to reference images as @image1, @image2 (in the order of the reference cards). Shot lengths 5-15 s and they add up to the requested total.
Writing reference-image prompt cards (def "prompt"): one per image the shots need, titled "레퍼런스 이미지 N: what it is", text = a detailed English text-to-image prompt. Put them in the row below the shots.
${tiny ? '' : PRODUCTION_MODE}
CURRENT CANVAS
${state}

DECKS
${deckList(tiny)}

${tiny ? '' : `COMBINING CARDS (typical chains — mix freely, any compatible ports can be wired)
${COMBOS}`}

AVAILABLE CARDS${compact ? ' (compact: ports only — reply with only {"need_details":["<card id>",…]} if you need the description and values of cards before planning)' : ''}
${cards}`;

function history(msgs: LiveMsg[]): string {
  return msgs.slice(-8).map((m) => (m.role === 'user' ? `User: ${m.text}` : `Assistant: ${m.text}${m.notes?.length ? ` (${m.notes.join('; ')})` : ''}`)).join('\n');
}

function parsePlan(raw: string): Plan {
  let s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no JSON in the reply');
  s = s.slice(a, b + 1);
  try { return JSON.parse(s) as Plan; }
  catch { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')) as Plan; }   // trailing commas
}

// ------------------------------------------------------------------ geometry
const GAP_X = 70, GAP_Y = 70;
const EST_H: Record<string, number> = { prompt: 350, 'video-generate': 560, 'image-generate': 440, note: 170, import: 380, 'import-video': 380 };
type Rect = { id: string; x: number; y: number; w: number; h: number };

/** measured size from the DOM when the card is on screen (CSS px, unscaled), else an estimate */
function sizeOf(n: GraphNode): { w: number; h: number } {
  const el = typeof document !== 'undefined' ? (document.querySelector(`.react-flow__node[data-id="${n.id}"]`) as HTMLElement | null) : null;
  return { w: n.w ?? (el?.offsetWidth || 300), h: n.h ?? (el?.offsetHeight || EST_H[n.defId] || 400) };
}
const rectOf = (n: GraphNode): Rect => ({ id: n.id, x: n.x, y: n.y, ...sizeOf(n) });
const overlaps = (a: Rect, b: Rect, pad = 24) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/** nearest free spot at/after (x,y): slide down until the card overlaps nothing */
function findFree(x: number, y: number, w: number, h: number, ignore: Set<string> = new Set()): { x: number; y: number } {
  const others = useGraph.getState().nodes.filter((n) => !n.members && !ignore.has(n.id)).map(rectOf);
  let cy = y;
  for (let i = 0; i < 80; i++) {
    const me: Rect = { id: '', x, y: cy, w, h };
    const hit = others.find((o) => overlaps(me, o));
    if (!hit) return { x, y: cy };
    cy = hit.y + hit.h + GAP_Y;
  }
  return { x, y: cy };
}

/** Reading order of a card: its own "… 3 …" number in the title, else the number of the card feeding it (shot 3 → its video card), else its position. */
function readingKey(n: GraphNode, seen: Set<string> = new Set()): number {
  if (seen.has(n.id)) return 1e6; seen.add(n.id);
  const num = (t?: string) => { const m = /(\d+)/.exec(t ?? ''); return m ? Number(m[1]) : undefined; };
  const { nodes, edges } = useGraph.getState();
  // a card fed by another card follows its source ("영상 생성 (8초)" holds a duration, not a shot number); otherwise its own title number
  for (const e of edges) if (e.target === n.id) { const src = nodes.find((x) => x.id === e.source); const k = src ? readingKey(src, seen) : undefined; if (k !== undefined && k < 1e6) return k; }
  const own = num(n.title);
  if (own !== undefined) return own;
  return 1e6 + n.y * 1000 + n.x;
}

function setPositions(pos: Map<string, { x: number; y: number }>) {
  if (!pos.size) return;
  useGraph.getState().snapshot();
  useGraph.setState((s) => ({ nodes: s.nodes.map((n) => (pos.has(n.id) && !n.locked ? { ...n, x: Math.round(pos.get(n.id)!.x), y: Math.round(pos.get(n.id)!.y) } : n)) }));
}

/** left-to-right layers by wires; loose cards (no wires) go to columns of their own, same types together */
function flowLayout(ids: string[], gap = GAP_X): Map<string, { x: number; y: number }> {
  const { nodes, edges } = useGraph.getState();
  const set = new Set(ids);
  const list = nodes.filter((n) => set.has(n.id));
  const es = edges.filter((e) => set.has(e.source) && set.has(e.target));
  const layer = new Map<string, number>();
  const linked = new Set(es.flatMap((e) => [e.source, e.target]));
  const incoming = (id: string) => es.filter((e) => e.target === id).map((e) => e.source);
  const depth = (id: string, seen: Set<string>): number => {
    if (layer.has(id)) return layer.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const d = Math.max(-1, ...incoming(id).map((s) => depth(s, seen))) + 1;
    layer.set(id, d); return d;
  };
  for (const n of list) if (linked.has(n.id)) depth(n.id, new Set());
  const cols = new Map<number, GraphNode[]>();
  for (const n of list) if (linked.has(n.id)) { const l = layer.get(n.id) ?? 0; cols.set(l, [...(cols.get(l) ?? []), n]); }
  const order = new Map<string, number>(); list.forEach((n) => order.set(n.id, readingKey(n)));
  const maxLayer = Math.max(-1, ...cols.keys());
  const pos = new Map<string, { x: number; y: number }>();
  const startX = Math.min(...list.map((n) => n.x)), startY = Math.min(...list.map((n) => n.y));
  // row index per card: the first layer in reading order, later layers sit in the row of the card that feeds them (next free row when taken)
  const rowOf = new Map<string, number>();
  const layerCards: GraphNode[][] = [];
  for (let l = 0; l <= maxLayer; l++) {
    const col = (cols.get(l) ?? []).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    layerCards.push(col);
    const used = new Set<number>(); let next = 0;
    for (const n of col) {
      const srcRows = incoming(n.id).map((s) => rowOf.get(s)).filter((r): r is number => r !== undefined);
      let r = srcRows.length ? Math.min(...srcRows) : next;
      while (used.has(r)) r++;
      used.add(r); rowOf.set(n.id, r); next = Math.max(next, r + 1);
    }
  }
  const rowH = new Map<number, number>();
  for (const n of list) if (rowOf.has(n.id)) rowH.set(rowOf.get(n.id)!, Math.max(rowH.get(rowOf.get(n.id)!) ?? 0, sizeOf(n).h));
  const rowY = new Map<number, number>(); let yy = startY;
  for (const r of [...rowH.keys()].sort((a, b) => a - b)) { rowY.set(r, yy); yy += rowH.get(r)! + GAP_Y; }
  let x = startX;
  for (const col of layerCards) {
    let colW = 0;
    for (const n of col) { const sz = sizeOf(n); pos.set(n.id, { x, y: rowY.get(rowOf.get(n.id)!)! }); colW = Math.max(colW, sz.w); }
    x += colW + gap;
  }
  const loose = list.filter((n) => !linked.has(n.id)).sort((a, b) => a.defId.localeCompare(b.defId) || order.get(a.id)! - order.get(b.id)!);
  if (loose.length) {
    let y = startY, colW = 0; const limit = 2600; let prev = '';
    for (const n of loose) {
      const s = sizeOf(n);
      if (y > startY && (y + s.h > startY + limit || (prev && prev !== n.defId && y > startY + limit * 0.6))) { x += colW + gap; y = startY; colW = 0; }
      pos.set(n.id, { x, y }); y += s.h + GAP_Y; colW = Math.max(colW, s.w); prev = n.defId;
    }
  }
  return pos;
}

function gridLayout(ids: string[], cols?: number, gap = GAP_X, byType = false): Map<string, { x: number; y: number }> {
  const list = useGraph.getState().nodes.filter((n) => ids.includes(n.id));
  const sorted = [...list].sort((a, b) => (byType ? a.defId.localeCompare(b.defId) : 0) || readingKey(a) - readingKey(b) || a.y - b.y || a.x - b.x);
  const pos = new Map<string, { x: number; y: number }>();
  const x0 = Math.min(...list.map((n) => n.x)), y0 = Math.min(...list.map((n) => n.y));
  if (byType) {   // one band per card type, wrapping after `cols` cards
    const groups = new Map<string, GraphNode[]>(); for (const n of sorted) groups.set(n.defId, [...(groups.get(n.defId) ?? []), n]);
    const per = cols ?? 5; let y = y0;
    for (const g of groups.values()) {
      for (let i = 0; i < g.length; i += per) {
        const row = g.slice(i, i + per); let x = x0, h = 0;
        for (const n of row) { const s = sizeOf(n); pos.set(n.id, { x, y }); x += s.w + gap; h = Math.max(h, s.h); }
        y += h + GAP_Y;
      }
    }
    return pos;
  }
  const c = Math.max(1, cols ?? Math.ceil(Math.sqrt(sorted.length)));
  const cw = Math.max(...sorted.map((n) => sizeOf(n).w)) + gap;
  const rowsH: number[] = []; sorted.forEach((n, i) => { const r = Math.floor(i / c); rowsH[r] = Math.max(rowsH[r] ?? 0, sizeOf(n).h); });
  sorted.forEach((n, i) => { const r = Math.floor(i / c), k = i % c; pos.set(n.id, { x: x0 + k * cw, y: y0 + rowsH.slice(0, r).reduce((p, h) => p + h + GAP_Y, 0) }); });
  return pos;
}

function lineLayout(ids: string[], axis: 'x' | 'y', gap = GAP_X): Map<string, { x: number; y: number }> {
  const list = useGraph.getState().nodes.filter((n) => ids.includes(n.id)).sort((a, b) => readingKey(a) - readingKey(b) || a.y - b.y || a.x - b.x);
  const pos = new Map<string, { x: number; y: number }>(); let x = Math.min(...list.map((n) => n.x)), y = Math.min(...list.map((n) => n.y));
  for (const n of list) { const s = sizeOf(n); pos.set(n.id, { x, y }); if (axis === 'x') x += s.w + gap; else y += s.h + GAP_Y; }
  return pos;
}

// ------------------------------------------------------------------ apply
const HEX = /^#[0-9a-f]{6}$/i;
/** MiniMax H3 clips are 5-15 s */
const clampSeconds = (v: Primitive): Primitive => { const n = Number(v); return Number.isFinite(n) ? Math.min(15, Math.max(5, n)) : v; };

/** Run a plan against the canvas; returns notes (what was done / skipped). */
export function applyPlan(plan: Plan, opts: { allowRun?: boolean } = {}): string[] {
  const g = () => useGraph.getState();
  const notes: string[] = [];
  const alias = new Map<string, string>();
  const idOf = (a: unknown): string | undefined => (typeof a === 'string' ? alias.get(a) ?? (g().nodes.some((n) => n.id === a) ? a : undefined) : undefined);
  const idsOf = (a: unknown): string[] => (Array.isArray(a) ? a.map(idOf).filter((x): x is string => !!x) : []);
  const nodeOf = (id: string) => g().nodes.find((n) => n.id === id)!;
  const before = new Set(g().nodes.map((n) => n.id));

  function place(c: PlanCard, x: number, y: number) {
    const params: Params = { ...(c.params ?? {}) };
    if (c.text !== undefined && (c.def === 'prompt' || c.def === 'note')) params.text = c.text;
    const f = findFree(x, y, 300, EST_H[c.def] ?? 400);
    const id = g().addNode(c.def, f.x, f.y, { ...(c.title ? { title: c.title } : {}) } as never);
    const def = byId.get(c.def)!;
    if (c.engine) { if (def.engines?.some((e) => e.id === c.engine)) g().setEngine(id, c.engine); else notes.push(`unknown engine "${c.engine}"`); }
    for (const [k, v] of Object.entries(params)) g().setParam(id, k, c.def === 'video-generate' && k === 'seconds' ? clampSeconds(v) : v);
    if (c.color && HEX.test(c.color)) g().setColor([id], c.color);
    if (c.textColor && HEX.test(c.textColor)) g().setCardColors([id], nodeOf(id).color, c.textColor);
    if (c.def === 'note') g().setSize(id, 420, 300);
    if (c.id) alias.set(c.id, id);
  }

  // ---- decks (whole wired projects), then the cards
  for (const d of plan.decks ?? []) {
    const deck = findDeck(d.deck); if (!deck) { notes.push(`unknown deck "${d.deck}"`); continue; }
    const srcId = idOf(d.near); const src = srcId ? nodeOf(srcId) : undefined;
    const at = src ? { x: src.x + (d.place === 'right' ? sizeOf(src).w + GAP_X * 2 : 0), y: src.y + (d.place === 'right' ? 0 : sizeOf(src).h + GAP_Y * 2) } : undefined;
    const map = insertDeck(deck, at);
    const as = d.as || deck.id;
    for (const [k, id] of map) {
      alias.set(`${as}.${k}`, id);
      if (deck.nodes.find((x) => x.k === k)?.def === 'note') g().setSize(id, 420, 300);
    }
    notes.push(`deck: ${deck.name}`);
  }

  // ---- new cards
  const cards = (plan.cards ?? []).filter((c) => { if (!c || typeof c.def !== 'string' || !byId.has(c.def)) { notes.push(`skipped unknown card "${c?.def}"`); return false; } return true; });
  const blocks = cards.filter((c) => !c.near);
  if (blocks.length) {          // a grid block in free space below everything
    const cur = g().nodes.filter((n) => !n.members);
    const minX = cur.length ? Math.min(...cur.map((n) => n.x)) : 0;
    const bottom = cur.length ? Math.max(...cur.map((n) => n.y + sizeOf(n).h)) + GAP_Y : 0;
    const rows = [...new Set(blocks.map((c) => c.row ?? 0))].sort((a, b) => a - b);
    const rowTop = new Map<number, number>(); let y = bottom;
    for (const r of rows) { rowTop.set(r, y); y += Math.max(...blocks.filter((c) => (c.row ?? 0) === r).map((c) => EST_H[c.def] ?? 400)) + GAP_Y; }
    const nextCol = new Map<number, number>();
    for (const c of blocks) {
      const r = c.row ?? 0, col = c.col ?? nextCol.get(r) ?? 0; nextCol.set(r, col + 1);
      place(c, minX + col * (300 + GAP_X), rowTop.get(r) ?? bottom);
    }
  }
  for (const c of cards.filter((x) => x.near)) {   // placed relative to another card (existing or created above)
    const srcId = idOf(c.near); const src = srcId ? nodeOf(srcId) : undefined;
    if (!src) { place(c, 0, 0); continue; }
    const s = sizeOf(src), mh = EST_H[c.def] ?? 400, p = c.place ?? 'below';
    place(c, p === 'right' ? src.x + s.w + GAP_X : p === 'left' ? src.x - 300 - GAP_X : src.x, p === 'below' ? src.y + s.h + GAP_Y : p === 'above' ? src.y - mh - GAP_Y : src.y);
  }
  if (cards.length) { const n = cards.length, p = cards.filter((c) => c.def === 'prompt').length; notes.push(p === n ? `+${n} prompt cards` : `+${n} cards`); }

  // ---- wires
  let wired = 0;
  for (const l of plan.links ?? []) {
    const from = idOf(l.from), to = idOf(l.to);
    if (!from || !to) { notes.push(`link skipped (${l.from} → ${l.to})`); continue; }
    const fd = byId.get(nodeOf(from).defId)!, td = byId.get(nodeOf(to).defId)!;
    const pairs = fd.outputs.flatMap((o) => td.inputs.filter((i) => compatible(o.type, i.type)).map((i) => [o.id, i.id] as const));
    // prefer: the given ports → text→prompt → anything compatible
    const wanted = pairs.find(([o, i]) => o === l.fromPort && i === l.toPort) ?? pairs.find(([, i]) => i === l.toPort) ?? pairs.find(([o]) => o === l.fromPort) ?? pairs.find(([o, i]) => o === 'text' && i === 'prompt') ?? pairs[0];
    if (wanted && g().edges.some((e) => e.source === from && e.sourceHandle === wanted[0] && e.target === to && e.targetHandle === wanted[1])) continue;   // already wired (e.g. by the deck)
    if (wanted && g().connect({ source: from, sourceHandle: wanted[0], target: to, targetHandle: wanted[1] })) wired++; else notes.push(`link skipped (${l.from} → ${l.to})`);
  }
  if (wired) notes.push(`${wired} wires`);
  for (const u of plan.unlink ?? []) {
    const a = idOf(u.from), b = idOf(u.to); if (!a || !b) continue;
    const ids = g().edges.filter((e) => e.source === a && e.target === b).map((e) => e.id); if (ids.length) { g().removeEdges(ids); notes.push('wire removed'); }
  }

  // ---- edits
  for (const s of plan.set ?? []) {
    const id = idOf(s.id); if (!id) { notes.push(`edit skipped (${s.id})`); continue; }
    const def = byId.get(nodeOf(id).defId)!;
    if (s.engine) { if (def.engines?.some((e) => e.id === s.engine)) g().setEngine(id, s.engine); else notes.push(`unknown engine "${s.engine}"`); }
    for (const [k, v] of Object.entries(s.params ?? {})) g().setParam(id, k, def.id === 'video-generate' && k === 'seconds' ? clampSeconds(v) : v);
    if (s.title !== undefined) g().setTitle(id, s.title);
    if (s.color && HEX.test(s.color)) g().setColor([id], s.color);
    if (s.textColor && HEX.test(s.textColor)) g().setCardColors([id], nodeOf(id).color, s.textColor);
    if (s.locked !== undefined) g().setLocked([id], !!s.locked);
    if (s.width && s.width >= 240 && s.width <= 720) g().setSize(id, s.width, sizeOf(nodeOf(id)).h);
  }
  if ((plan.set ?? []).length) notes.push(`${plan.set!.length} edited`);
  for (const d of plan.duplicate ?? []) {
    const id = idOf(d.id); if (!id) continue;
    const had = new Set(g().nodes.map((n) => n.id)); g().duplicateNodes([id]);
    const copy = g().nodes.find((n) => !had.has(n.id)); if (!copy) continue;
    if (d.as) alias.set(d.as, copy.id);
    const src = nodeOf(id), s = sizeOf(src); setPositions(new Map([[copy.id, findFree(src.x, src.y + s.h + GAP_Y, s.w, s.h, new Set([copy.id]))]]));
    notes.push('duplicated');
  }
  const gone = idsOf(plan.remove);
  if (gone.length) { g().removeNodes(gone); notes.push(`${gone.length} removed`); }
  for (const id of idsOf(plan.clear_results)) g().clearResults(id);

  // ---- layout
  const moves = new Map<string, { x: number; y: number }>();
  // models sometimes put the position into "set": accept x/y/dx/dy there as a move
  const asMoves = (plan.set ?? []).filter((x) => [x.x, x.y, x.dx, x.dy].some((v) => typeof v === 'number')).map((x) => ({ id: x.id, x: x.x, y: x.y, dx: x.dx, dy: x.dy }));
  for (const m of [...(plan.move ?? []), ...asMoves]) { const id = idOf(m.id); if (!id) continue; const n = nodeOf(id); moves.set(id, { x: m.x ?? n.x + (m.dx ?? 0), y: m.y ?? n.y + (m.dy ?? 0) }); }
  if (moves.size) { setPositions(moves); notes.push(`${moves.size} moved`); }
  const movable = () => g().nodes.filter((n) => !n.members && !n.locked).map((n) => n.id);
  if (plan.arrange) {
    const a = plan.arrange; const ids = a.ids?.length ? idsOf(a.ids) : movable();
    if (ids.length > 1) {
      const gap = a.gap && a.gap >= 20 && a.gap <= 400 ? a.gap : GAP_X;
      const pos = a.mode === 'grid' ? gridLayout(ids, a.cols, gap) : a.mode === 'row' ? lineLayout(ids, 'x', gap) : a.mode === 'column' ? lineLayout(ids, 'y', gap)
        : a.mode === 'group-by-type' ? gridLayout(ids, a.cols, gap, true) : flowLayout(ids, gap);
      setPositions(pos); notes.push(`arranged (${a.mode ?? 'flow'})`);
    }
  }
  if (plan.align) {
    const ids = idsOf(plan.align.ids); const rs = g().nodes.filter((n) => ids.includes(n.id)).map(rectOf);
    if (rs.length > 1) {
      const pos = new Map<string, { x: number; y: number }>(); const e = plan.align.edge;
      const L = Math.min(...rs.map((r) => r.x)), R = Math.max(...rs.map((r) => r.x + r.w)), T = Math.min(...rs.map((r) => r.y)), B = Math.max(...rs.map((r) => r.y + r.h));
      for (const r of rs) pos.set(r.id, { x: e === 'left' ? L : e === 'right' ? R - r.w : e === 'center-x' ? (L + R) / 2 - r.w / 2 : r.x, y: e === 'top' ? T : e === 'bottom' ? B - r.h : e === 'center-y' ? (T + B) / 2 - r.h / 2 : r.y });
      setPositions(pos); notes.push(`aligned (${e})`);
    }
  }
  if (plan.distribute) {
    const ids = idsOf(plan.distribute.ids); const rs = g().nodes.filter((n) => ids.includes(n.id)).map(rectOf);
    if (rs.length > 2) {
      const ax: 'x' | 'y' = plan.distribute.axis === 'y' ? 'y' : 'x', sz = ax === 'x' ? 'w' : 'h';
      rs.sort((a, b) => a[ax] - b[ax]);
      const total = rs[rs.length - 1][ax] + rs[rs.length - 1][sz] - rs[0][ax], used = rs.reduce((p, r) => p + r[sz], 0), gap = (total - used) / (rs.length - 1);
      const pos = new Map<string, { x: number; y: number }>(); let cur = rs[0][ax];
      for (const r of rs) { pos.set(r.id, ax === 'x' ? { x: cur, y: r.y } : { x: r.x, y: cur }); cur += r[sz] + gap; }
      setPositions(pos); notes.push('distributed');
    }
  }
  for (const gr of plan.group ?? []) {
    const ids = idsOf(gr.ids); if (!ids.length) continue; g().group(ids);
    const grp = g().nodes.find((n) => n.members && !before.has(n.id) && ids.every((i) => n.members!.includes(i))); if (grp && gr.title) g().setTitle(grp.id, gr.title);
    notes.push('grouped');
  }
  for (const id of plan.ungroup ?? []) { const i = idOf(id); if (i && nodeOf(i).members) { g().ungroup(i); notes.push('ungrouped'); } }

  // ---- view / run
  const sel = idsOf(plan.select); if (sel.length) g().select(sel);
  if (plan.fit || cards.length || plan.arrange || plan.align || plan.distribute || moves.size) g().requestFit();
  if (plan.stop) { stopAll(); notes.push('stopped'); }
  const run = plan.run ?? [];
  if (run.length && !opts.allowRun) notes.push('run skipped (only when you ask to run / generate)');
  else if (run.includes('all')) { void runAll(); notes.push('running all'); }
  else { const ids = idsOf(run); ids.forEach((id) => void runNode(id)); if (ids.length) notes.push(`running ${ids.length}`); }
  return notes;
}

export interface LiveResult { say: string; notes: string[]; suggest: string[]; undo(): void }

/** what a run would start: generators among the cards (and the length of the video they make) */
function runSummary(ids: string[] | 'all'): { n: number; seconds: number; label: string } {
  const nodes = useGraph.getState().nodes.filter((x) => !x.members);
  const pick = ids === 'all' ? nodes : nodes.filter((x) => ids.includes(x.id));
  const gen = pick.filter((x) => byId.get(x.defId)?.kind === 'generate');
  const videos = gen.filter((x) => x.defId === 'video-generate');
  const seconds = videos.reduce((p, x) => p + (Number(x.params.seconds) || 0), 0);
  return { n: gen.length, seconds, label: `${gen.length} ${t('generator cards')}${videos.length ? `, ${videos.length} ${t('videos')} (${t('total')} ${seconds}${t('s')})` : ''}` };
}

/** One chat turn: ask the LLM with the current canvas, parse its plan (one retry on bad JSON), apply it. */
export async function liveTurn(msgs: LiveMsg[], userText: string, onStatus?: (s: string) => void): Promise<LiveResult> {
  const prompt = `${history(msgs)}
User: ${userText}

Reply with the JSON object only.`;
  const cfg = liveLlmSettings() ?? useSettings.getState().llm;
  // small-context backends get the compact card list and ask for details on demand
  const compact = (import.meta.env.DEV && !!(window as unknown as { __forceCompact?: boolean }).__forceCompact) || cfg.backend === 'comfy' || (cfg.backend === 'local' && cfg.n_ctx < 12000);
  const tiny = cfg.backend === 'local' && cfg.n_ctx < 8192;   // ~4k context: drop the production recipes and combos
  let system = SYSTEM(canvasState(), catalog(!compact), compact, tiny);
  let plan: Plan | null = null, lastErr = '', detailed = false, wired = false;
  for (let attempt = 0; attempt < 3 && !plan; attempt++) {
    onStatus?.(attempt ? 'fixing the reply…' : 'thinking…');
    const raw = await runLlm({ system: attempt ? `${system}

Your previous reply was not valid JSON (${lastErr}). Return ONLY the JSON object.` : system, prompt, max_tokens: 7000, temperature: 0.5, llm: liveLlmSettings(), where: 'live' });
    try {
      const p = parsePlan(raw);
      const need = (p.need_details ?? []).filter((x) => byId.has(x));
      if (compact && !detailed && need.length && !p.cards?.length && !p.decks?.length) { detailed = true; system = SYSTEM(canvasState(), `${catalog(false)}\n\nDETAILS OF THE CARDS YOU ASKED FOR\n${catalog(true, new Set(need))}`, false, tiny); attempt = -1; continue; }
      // a pipeline of generator cards without a single wire is almost always a forgotten "links": ask once more
      const gens = (p.cards ?? []).filter((c) => byId.get(c.def)?.kind === 'generate' || c.def === 'video-stitch').length;
      if (!wired && gens >= 2 && !(p.links ?? []).length && !(p.decks ?? []).length) { wired = true; lastErr = 'the new cards have no "links" — add the wires between them (and "set" the texts)'; system = `${system}

Your previous reply created cards but no "links". Return the complete plan again, this time with every wire.`; attempt = -1; continue; }
      plan = p;
    } catch (e) { lastErr = (e as Error).message; }
  }
  if (!plan) throw new Error(`The model did not return a usable plan (${lastErr}). Try again or pick a stronger LLM in Settings.${tiny ? ' A local model with a 4k context is too small for the Live Canvas: raise the context size to 8192 or more.' : ''}`);
  if (import.meta.env.DEV) (window as unknown as { __lastPlan?: Plan }).__lastPlan = plan;
  onStatus?.('placing cards…');
  // generation uses the GPU for minutes: only run when the user's message asks for it, and confirm what will start
  let cancelled = false;
  let allowRun = /실행|돌려|돌리|시작|렌더|(^|[^a-z])(run|start|render)([^a-z]|$)|생성\s*(을|좀)?\s*(해|하|돌|시작)/i.test(userText);
  const wantsRun = (plan.run ?? []).length > 0;
  if (allowRun && wantsRun) {
    const sum = runSummary((plan.run ?? []).includes('all') ? 'all' : (plan.run ?? []));
    if (sum.n > 0 && !(await askConfirm(`${t('Start generating now?')} ${sum.label}
${t('This uses the GPU and can take a while.')}`))) { allowRun = false; cancelled = true; }
  }
  // one checkpoint for the whole reply, so "undo" takes back everything this answer changed
  const before = { nodes: useGraph.getState().nodes, edges: useGraph.getState().edges };
  const notes = applyPlan(plan, { allowRun });
  if (cancelled) { const i = notes.findIndex((x) => x.startsWith('run skipped')); if (i >= 0) notes[i] = 'run cancelled'; else notes.push('run cancelled'); }
  const videos = useGraph.getState().nodes.filter((n) => n.defId === 'video-generate');
  if (cardsAdded(plan) && videos.length) notes.push(`∑ ${videos.reduce((p, x) => p + (Number(x.params.seconds) || 0), 0)} s of video`);
  const suggest = (plan.suggest ?? []).filter((x) => typeof x === 'string' && x.trim()).slice(0, 4);
  return { say: plan.say?.trim() || (notes.length ? 'Done.' : '…'), notes, suggest, undo: () => { useGraph.getState().snapshot(); useGraph.setState({ nodes: before.nodes, edges: before.edges, selected: [] }); } };
}
const cardsAdded = (p: Plan) => (p.cards ?? []).length > 0 || (p.set ?? []).some((x) => x.params && 'seconds' in x.params);
