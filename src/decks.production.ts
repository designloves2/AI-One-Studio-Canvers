// Production decks: the cards of a whole project, already wired (ad film, music video, vlog, storyboard, short-form, trailer, image set).
// The Live Canvas loads one of these and fills in the texts; they also show up in the Decks panel.
import type { Primitive } from './types';
import type { Deck, DeckNode } from './decks';

const C = 400, R = 340;
const nd = (k: string, def: string, col: number, row: number, extra: Partial<DeckNode> = {}): DeckNode => ({ k, def, x: col * C, y: row * R, ...extra });
const ph = (t: string): Record<string, Primitive> => ({ text: t });
type Edge = [string, string, string, string];

const shotsRow = (n: number, row: number, label: string): DeckNode[] => Array.from({ length: n }, (_, i) => nd(`s${i + 1}`, 'prompt', i, row, { params: ph(`${label} ${i + 1}: describe the action, camera and light`) }));
const videosRow = (n: number, row: number, engine: string, extra: Record<string, Primitive> = {}): DeckNode[] => Array.from({ length: n }, (_, i) => nd(`v${i + 1}`, 'video-generate', i, row, { engine, params: { seconds: 8, ...extra } }));
const wire = (n: number, a: string, ah: string, b: string, bh: string): Edge[] => Array.from({ length: n }, (_, i) => [`${a}${i + 1}`, ah, `${b}${i + 1}`, bh]);
const toStitch = (n: number): Edge[] => Array.from({ length: n }, (_, i) => [`v${i + 1}`, 'video', 'st', 'videos']);

export const PRODUCTION_DECKS: Deck[] = [
  {
    id: 'prod-ad', name: 'Ad film (brief → references → shots → stitch)', note: 'Brief note, 2 reference images, 4 shots with reference-driven H3 videos, stitched.',
    nodes: [
      nd('brief', 'note', 0, 0, { params: ph('Brief: product, idea, mood, length') }),
      nd('r1', 'prompt', 0, 1, { params: ph('Reference image 1: product pack shot') }), nd('r2', 'prompt', 1, 1, { params: ph('Reference image 2: hero / setting') }),
      nd('i1', 'image-generate', 0, 2), nd('i2', 'image-generate', 1, 2),
      ...shotsRow(4, 3, 'Shot'), ...videosRow(4, 4, 'h3-ref'),
      nd('st', 'video-stitch', 1, 5), nd('pv', 'preview', 2, 5),
    ],
    edges: [['r1', 'text', 'i1', 'prompt'], ['r2', 'text', 'i2', 'prompt'], ...wire(4, 's', 'text', 'v', 'prompt'),
      ['i1', 'image', 'v1', 'image'], ['i1', 'image', 'v2', 'image'], ['i2', 'image', 'v3', 'image'], ['i2', 'image', 'v4', 'image'],
      ...toStitch(4), ['st', 'video', 'pv', 'image']],
  },
  {
    id: 'prod-musicvideo', name: 'Music video (lyrics → music → shots → stitch + sound)', note: 'Concept → lyrics → music, beat detection, 5 shots, stitched with the music on top.',
    nodes: [
      nd('brief', 'note', 0, 0, { params: ph('Brief: song concept, mood, structure') }),
      nd('pc', 'prompt', 0, 1, { params: ph('Song concept / theme') }), nd('mw', 'music-writer', 1, 1), nd('ps', 'prompt', 2, 1, { params: ph('Music style: genre, tempo, instruments') }),
      nd('mg', 'music-generate', 3, 1), nd('bd', 'beat-detect', 4, 1),
      ...shotsRow(5, 2, 'Shot'), ...videosRow(5, 3, 'h3'),
      nd('st', 'video-stitch', 1, 4), nd('va', 'video-audio', 2, 4), nd('pv', 'preview', 3, 4),
    ],
    edges: [['pc', 'text', 'mw', 'text'], ['mw', 'text', 'mg', 'lyrics'], ['ps', 'text', 'mg', 'prompt'], ['mg', 'audio', 'bd', 'media'],
      ...wire(5, 's', 'text', 'v', 'prompt'), ...toStitch(5), ['st', 'video', 'va', 'video'], ['mg', 'audio', 'va', 'audio'], ['va', 'video', 'pv', 'image']],
  },
  {
    id: 'prod-vlog', name: 'Vlog / story (scene → key frame → video → stitch)', note: '4 scenes: each prompt makes a key frame that is animated, then all stitched.',
    nodes: [
      nd('brief', 'note', 0, 0, { params: ph('Brief: story, places, mood, length') }),
      ...shotsRow(4, 1, 'Scene'), ...Array.from({ length: 4 }, (_, i) => nd(`i${i + 1}`, 'image-generate', i, 2)), ...videosRow(4, 3, 'h3'),
      nd('st', 'video-stitch', 1, 4), nd('pv', 'preview', 2, 4),
    ],
    edges: [...wire(4, 's', 'text', 'i', 'prompt'), ...wire(4, 's', 'text', 'v', 'prompt'), ...wire(4, 'i', 'image', 'v', 'image'), ...toStitch(4), ['st', 'video', 'pv', 'image']],
  },
  {
    id: 'prod-storyboard', name: 'Storyboard (6 frames)', note: '6 shot prompts, each with an image frame under it.',
    nodes: [
      nd('brief', 'note', 0, 0, { params: ph('Brief: story and style of the frames') }),
      ...Array.from({ length: 6 }, (_, i) => nd(`s${i + 1}`, 'prompt', i % 3, 1 + Math.floor(i / 3) * 2, { params: ph(`Frame ${i + 1}: subject, composition, light`) })),
      ...Array.from({ length: 6 }, (_, i) => nd(`i${i + 1}`, 'image-generate', i % 3, 2 + Math.floor(i / 3) * 2)),
    ],
    edges: wire(6, 's', 'text', 'i', 'prompt'),
  },
  {
    id: 'prod-short', name: 'Short-form 9:16 (3 shots)', note: 'Hook, middle, payoff — vertical videos stitched into one.',
    nodes: [
      nd('brief', 'note', 0, 0, { params: ph('Brief: hook, idea, length (15-30 s)') }),
      ...shotsRow(3, 1, 'Shot'), ...videosRow(3, 2, 'h3', { aspect: '9:16' }), nd('st', 'video-stitch', 1, 3), nd('pv', 'preview', 2, 3),
    ],
    edges: [...wire(3, 's', 'text', 'v', 'prompt'), ...toStitch(3), ['st', 'video', 'pv', 'image']],
  },
  {
    id: 'prod-trailer', name: 'Trailer / teaser (4 shots + music)', note: '4 shots stitched, with a music track laid over.',
    nodes: [
      nd('brief', 'note', 0, 0, { params: ph('Brief: film, tone, title, release line') }),
      ...shotsRow(4, 1, 'Shot'), ...videosRow(4, 2, 'h3'),
      nd('st', 'video-stitch', 1, 3), nd('ps', 'prompt', 2, 3, { params: ph('Music: epic trailer, brass, tension build') }), nd('mg', 'music-generate', 3, 3),
      nd('va', 'video-audio', 2, 4), nd('pv', 'preview', 3, 4),
    ],
    edges: [...wire(4, 's', 'text', 'v', 'prompt'), ...toStitch(4), ['ps', 'text', 'mg', 'prompt'], ['st', 'video', 'va', 'video'], ['mg', 'audio', 'va', 'audio'], ['va', 'video', 'pv', 'image']],
  },
  {
    id: 'prod-imageset', name: 'Product / poster image set (4 variations)', note: 'One prompt, four image cards (different models) to pick from.',
    nodes: [
      nd('brief', 'note', 0, 0, { params: ph('Brief: product, use (poster, thumbnail, ad), style') }), nd('p', 'prompt', 0, 1, { params: ph('Image prompt') }),
      nd('i1', 'image-generate', 1, 0, { engine: 'zimage' }), nd('i2', 'image-generate', 2, 0, { engine: 'krea2' }), nd('i3', 'image-generate', 1, 1, { engine: 'klein' }), nd('i4', 'image-generate', 2, 1, { engine: 'qwen21' }),
    ],
    edges: [['p', 'text', 'i1', 'prompt'], ['p', 'text', 'i2', 'prompt'], ['p', 'text', 'i3', 'prompt'], ['p', 'text', 'i4', 'prompt']],
  },
];
