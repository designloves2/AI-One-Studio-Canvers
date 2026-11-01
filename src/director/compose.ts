// The source text a clip's Prompt card starts from: the picture description plus the writer's dialogue, the sound and the music.
// This is the INPUT to the official Minimax H3 (Video) system prompt (formatFor('video-generate')), which rewrites it into the official
// six-section ref2va brief (subject_definitions / summary / retention_analysis / detailed_description / overall_soundscape / non_diegetic_music).
// Here the people of the clip are the personas S1, S2, ... (their order among the characters), dialogue is kept verbatim in
// "(S1) <d>[language] words</d>" so nothing translates it. Pure.
import type { DirectorShot } from './types';

export interface ShotSubject { name: string; kind: 'character' | 'location' | 'prop'; description: string }

const langTag = (lang?: string) => (lang === 'en' ? 'English' : 'Korean');
const normSp = (s: string) => s.toLowerCase().replace(/[\s·.,'"\-_]+/g, '');

/** The spoken lines of a clip as source: one "Dialogue: (S<k>) <d>[lang]words</d>" line per speaker, the <d> block verbatim */
function dialogueLines(d: string, sLabel: Map<string, number>, lang?: string): string[] {
  const tag = langTag(lang);
  const peopleByS = new Map([...sLabel].map(([name, s]) => [s, name]));
  const out: string[] = [];
  for (const seg of String(d ?? '').split(/\n+/).map((x) => x.trim()).filter(Boolean)) {
    let body = seg, s = 1;
    const explicit = /^\(?S(\d+)\)?\s*[:：]?\s*(.+)$/.exec(seg);            // "S1: ..." or "(S1) ..."
    if (explicit) { s = Number(explicit[1]); body = explicit[2]; }
    else {
      const named = /^([^\s:：]+(?:\s+[^\s:：]+)*?)\s*[:：]\s*(.+)$/.exec(seg);   // "서연: 말해"
      if (named) {
        const lbl = sLabel.get(normSp(named[1].trim()));
        if (lbl) { s = lbl; body = named[2].trim(); }
      }
    }
    out.push(`Dialogue: (S${s}) <d>[${tag}]${body.trim()}</d>`);
  }
  return out;
}

/**
 * The source text of a clip (what the official H3 prompt-enrichment gets and what the card shows before it is generated).
 * `subjects` = the clip's references in picture order (cast people/props, then the place); the caller passes `model.shotSubjects(p, s)`.
 */
export function composeClipPrompt(s: Pick<DirectorShot, 'prompt_en' | 'dialogue' | 'sound' | 'music'> & Partial<Pick<DirectorShot, 'cast' | 'location'>>, lang?: string, subjects: ShotSubject[] = []): string {
  const sLabel = new Map(subjects.filter((x) => x.kind === 'character').map((x, i) => [normSp(x.name), i + 1]));
  const out = [s.prompt_en.trim()];
  const names = [...new Set([...(s.cast ?? []), ...(s.location ? [s.location] : [])])];
  if (names.length) out.push(`References: ${names.map((n, i) => { const k = sLabel.get(normSp(n)); return `@image${i + 1} = ${n}${k ? ` (S${k})` : ''}`; }).join(', ')}`);
  out.push(...dialogueLines(s.dialogue ?? '', sLabel, lang));
  const sound = (s.sound ?? '').trim(), music = (s.music ?? '').trim();
  if (sound) out.push(`Sound: ${sound}`);
  if (music) out.push(`Music: ${music}`);
  return out.filter(Boolean).join('\n');
}

/** The full video prompt of a clip as it is used: the producer's own text (she wrote one, or the official H3 brief was generated), else the source.
 *  Everything that shows this text or detects when the canvas is stale must use this. */
export const clipPromptOf = (s: Pick<DirectorShot, 'prompt_user' | 'prompt_en' | 'dialogue' | 'sound' | 'music'> & Partial<Pick<DirectorShot, 'cast' | 'location'>>, lang?: string, subjects: ShotSubject[] = []): string => {
  const own = (s.prompt_user ?? '').trim();
  return own || composeClipPrompt(s, lang, subjects);
};