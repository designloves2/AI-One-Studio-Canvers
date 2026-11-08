// Simple mode: the first sentence decides where the work goes — a Director project, a canvas (Live Canvas chat), or a plain generation.
// Plain words only (no LLM call): a wrong guess costs nothing because anything unclear stays an ordinary generation.
import { detectFormat } from '../director/formats';

export type FirstRoute = 'canvas' | 'director' | null;

const CANVAS = /캔버스|canvas|워크\s*플로|workflow|노드\s*(를|로|구성|연결)|카드를?\s*(만들|배치|연결|구성)/i;
const DIRECTOR = /디렉터|director|시나리오|캐스팅|\d+\s*(부작|편짜리|화짜리)|시리즈|웹\s*드라마/i;
const STILL = /(이미지|사진|포스터|썸네일|로고|그림|image|photo|poster|thumbnail|logo)/i;
const MOTION = /(영상|동영상|비디오|뮤비|드라마|영화|video|film|movie|clip)/i;

export function routeFirstMessage(text: string): FirstRoute {
  const t = text.trim();
  if (t.length < 6) return null;
  if (CANVAS.test(t)) return 'canvas';
  if (DIRECTOR.test(t)) return 'director';
  // a kind of production (drama, ad, music video, vlog, short...) asked as a video, not as a single picture
  if (detectFormat(t) && !(STILL.test(t) && !MOTION.test(t))) return 'director';
  return null;
}

/** the sentence typed in Simple mode, waiting for the Live Canvas chat to take it over once it is open */
let pendingLive: string | null = null;
export const setPendingLive = (t: string): void => { pendingLive = t; };
export const takePendingLive = (): string | null => { const t = pendingLive; pendingLive = null; return t; };
