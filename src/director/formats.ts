// The kind of work: a drama series, a short film, an ad, a music video, a vlog, a short-form video.
// The line is the same (brief -> casting -> scenario -> clips -> canvas -> generate -> review), but the words on the screen, what "casting" means,
// how many episodes there are, the usual length and what the crew pays attention to differ. Pure (no DOM, no network).
import type { DirectorSeries } from './types';

export type SeriesFormat = 'drama' | 'film' | 'ad' | 'musicvideo' | 'vlog' | 'short';
export const FORMAT_IDS: SeriesFormat[] = ['drama', 'film', 'ad', 'musicvideo', 'vlog', 'short'];

/** screen words (English keys: the UI dictionary turns them into Korean) */
export interface Vocab {
  /** the casting step */ cast: string; /** the scenario step */ scenario: string; /** one episode / the whole piece */ episode: string;
  character: string; location: string; prop: string; characters: string; locations: string; props: string;
}

export interface FormatInfo {
  id: SeriesFormat; label: string;
  /** more than one episode is normal */ multi: boolean;
  vocab: Vocab;
  /** the usual numbers when the producer does not say them */
  defaults: Pick<DirectorSeries, 'total_episodes' | 'episode_seconds' | 'clip_seconds' | 'aspect'>;
  /** what the crew should care about (written into the crew's instructions) */
  guide: string;
  /** words that point to this kind in what the producer wrote */
  words: RegExp;
}

const V = (cast: string, scenario: string, episode: string, character: string, location: string, prop: string, characters: string, locations: string, props: string): Vocab => ({ cast, scenario, episode, character, location, prop, characters, locations, props });

export const FORMATS: Record<SeriesFormat, FormatInfo> = {
  drama: {
    id: 'drama', label: 'Drama series', multi: true,
    vocab: V('Casting', 'Scenario', 'Episode', 'Actor', 'Location', 'Prop', 'Actors', 'Locations', 'Props'),
    defaults: { total_episodes: 12, episode_seconds: 90, clip_seconds: 10, aspect: '16:9' },
    guide: 'A drama series: one story arc across the episodes; every episode has hooks and ends on a turn or a cliffhanger; the leads are the same people in every episode (only costume and place change).',
    words: /드라마|부작|시리즈|웹드라마|web ?drama|series/i,
  },
  film: {
    id: 'film', label: 'Short film', multi: false,
    vocab: V('Casting', 'Scenario', 'Film', 'Actor', 'Location', 'Prop', 'Actors', 'Locations', 'Props'),
    defaults: { total_episodes: 1, episode_seconds: 240, clip_seconds: 10, aspect: '16:9' },
    guide: 'A short film: one piece with a beginning, a turn and an ending; every clip moves the story on; few characters, played consistently.',
    words: /단편\s*영화|단편영화|short film|영화/i,
  },
  ad: {
    id: 'ad', label: 'Ad / commercial', multi: false,
    vocab: V('Models & product', 'Storyboard', 'Ad', 'Model', 'Location', 'Product', 'Models', 'Locations', 'Products & props'),
    defaults: { total_episodes: 1, episode_seconds: 30, clip_seconds: 6, aspect: '16:9' },
    guide: 'An ad: ONE message. Hook in the first 2-3 seconds, the product shown clearly and the same in every shot (exact shape, colour, packaging; never invent a logo or text on it), the benefit shown not told, and a last clip that is a clean end card: product + the line (CTA). Short cuts (about 3-6 s). No long dialogue.',
    words: /광고|\bCF\b|commercial|\bads?\b|프로모션|promo|홍보\s*영상|제품\s*영상/i,
  },
  musicvideo: {
    id: 'musicvideo', label: 'Music video', multi: false,
    vocab: V('Artists & looks', 'Storyboard', 'Music video', 'Artist', 'Location', 'Prop / outfit', 'Artists', 'Locations', 'Props & outfits'),
    defaults: { total_episodes: 1, episode_seconds: 180, clip_seconds: 10, aspect: '16:9' },
    guide: 'A music video: the SONG leads. Sections of the song (intro, verse, pre-chorus, chorus, bridge, outro) decide the scenes; performance shots of the artist(s) alternate with story or mood shots; cuts follow the rhythm (chorus = bigger, faster); the "dialogue" field holds the lyric line sung in that clip (or empty), "music" says which part of the song it is. The look (colour, lighting, costume) stays consistent.',
    words: /뮤직\s*비디오|뮤비|\bMV\b|music ?video|노래\s*영상|가사/i,
  },
  vlog: {
    id: 'vlog', label: 'Vlog', multi: false,
    vocab: V('Host & places', 'Outline', 'Vlog', 'Host', 'Place', 'Prop', 'Hosts', 'Places', 'Props'),
    defaults: { total_episodes: 1, episode_seconds: 120, clip_seconds: 8, aspect: '16:9' },
    guide: 'A vlog: first person, natural and warm, handheld feel, real-life places. A voice-over / to-camera line in the "dialogue" field of most clips (short, spoken, casual). Chapters: opening hook, the activity, a small surprise, a closing thought. Mix talking shots with b-roll (food, scenery, details).',
    words: /브이로그|vlog|일상\s*영상|여행\s*영상/i,
  },
  short: {
    id: 'short', label: 'Short-form video', multi: false,
    vocab: V('Cast', 'Storyboard', 'Short', 'Person', 'Location', 'Prop', 'People', 'Locations', 'Props'),
    defaults: { total_episodes: 1, episode_seconds: 30, clip_seconds: 6, aspect: '9:16' },
    guide: 'A short-form vertical video (Reels / Shorts / TikTok): vertical 9:16, a hook in the first 1-2 seconds, fast cuts, one clear idea, a payoff or loop at the end; text-free pictures (no burned-in captions).',
    words: /숏폼|쇼츠|릴스|shorts?\b|reels?|tiktok|틱톡|세로\s*영상/i,
  },
};

export const vocabOf = (f: SeriesFormat | undefined): Vocab => FORMATS[f && FORMATS[f] ? f : 'drama'].vocab;
export const formatOf = (f: SeriesFormat | undefined): FormatInfo => FORMATS[f && FORMATS[f] ? f : 'drama'];
export const isFormat = (v: unknown): v is SeriesFormat => typeof v === 'string' && (FORMAT_IDS as string[]).includes(v);

/**
 * Which kind of work does the producer's text ask for? The most specific word wins (a music video that says "광고 아님" is rare; "뮤직비디오" beats "영화").
 * Returns null when nothing points to a kind (the crew then decides, default drama).
 */
export function detectFormat(text: string): SeriesFormat | null {
  const order: SeriesFormat[] = ['musicvideo', 'vlog', 'short', 'ad', 'drama', 'film'];
  for (const f of order) if (FORMATS[f].words.test(text)) return f;
  return null;
}

/** a short list of every kind and its guide: the crew reads it while writing the brief (it has to choose the kind) */
export function allFormatsGuide(): string {
  return FORMAT_IDS.map((f) => `- ${f} (${FORMATS[f].label}): usual ${FORMATS[f].defaults.total_episodes} episode(s) x ${FORMATS[f].defaults.episode_seconds}s, clips ${FORMATS[f].defaults.clip_seconds}s, ${FORMATS[f].defaults.aspect}. ${FORMATS[f].guide}`).join('\n');
}
