// The text a clip's Prompt card gets: the picture description plus the writer's dialogue, the sound director's sound and the music director's music.
// It is written as a MINIMAX H3 Ref2VA prompt: the people of the clip ("character" cast entries) are the reference personas S1, S2, ...
// (their order in the clip cast, matching the @image order), and every spoken line is dialogue wrapped "<d>[language] words </d>" with the
// speaker's persona label "(S1)". The <d>..</d> rule makes any LLM that strengthens the prompt keep the line verbatim (never translated).
// Pure.
import type { DirectorShot } from './types';

const langTag = (lang?: string) => (lang === 'en' ? 'English' : 'Korean');
const normSp = (s: string) => s.toLowerCase().replace(/[\s·.,'"\-_]+/g, '');

/** The spoken lines of a clip as H3 Ref2VA dialogue: one "Dialogue: (S<k>) <d>[lang]words</d>" line per speaker */
function dialogueLines(d: string, sOf: Map<string, number>, lang?: string): string[] {
  const tag = langTag(lang);
  const out: string[] = [];
  for (const seg of String(d ?? '').split(/\n+/).map((x) => x.trim()).filter(Boolean)) {
    let body = seg, s = 1;
    const explicit = /^\(?S(\d+)\)?\s*[:：]?\s*(.+)$/.exec(seg);            // "S1: ..." or "(S1) ..."
    if (explicit) { s = Number(explicit[1]); body = explicit[2]; }
    else {
      const named = /^([^\s:：]+(?:\s+[^\s:：]+)*?)\s*[:：]\s*(.+)$/.exec(seg);   // "서연: 말해"
      if (named) {
        const idx = sOf.get(normSp(named[1].trim()));
        if (idx) { s = idx; body = named[2]; }
      }
    }
    out.push(`Dialogue: (S${s}) <d>[${tag}]${body.trim()}</d>`);
  }
  return out;
}

/**
 * The full video prompt of a clip as an OFFICIAL Minimax H3 Ref2VA brief: the narrative in `integrated_multimodal_description`,
 * the reference personas (@imageN = name (Sk)) and the spoken lines ((S1) <d>[lang]…</d>) inside it, then `overall_soundscape`
 * and `non_diegetic_music` as the final two sections. `people` = the persona names in order (S1, S2, ...) — the caller passes
 * the character cast entries of the clip. Dialogue is wrapped "<d>[language] words</d>" so any strengthening step keeps it verbatim.
 */
export function composeClipPrompt(s: Pick<DirectorShot, 'prompt_en' | 'dialogue' | 'sound' | 'music'> & Partial<Pick<DirectorShot, 'cast' | 'location'>>, lang?: string, people: string[] = []): string {
  const sOf = new Map(people.map((n, i) => [normSp(n), i + 1]));
  const out: string[] = [`integrated_multimodal_description: ${s.prompt_en.trim()}`];
  const names = [...new Set([...(s.cast ?? []), ...(s.location ? [s.location] : [])])];
  if (names.length) out.push(`References: ${names.map((n, i) => { const k = sOf.get(normSp(n)); return `@image${i + 1} = ${n}${k ? ` (S${k})` : ''}`; }).join(', ')}`);
  out.push(...dialogueLines(s.dialogue ?? '', sOf, lang));
  const sound = (s.sound ?? '').trim(), music = (s.music ?? '').trim();
  if (sound) out.push('', `overall_soundscape: ${sound}`);
  if (music) out.push('', `non_diegetic_music: ${music}`);
  return out.join('\n');
}

/** The full video prompt of a clip as it is used: the producer's own text (she wrote one in the Canvas step), else the composed Ref2VA one.
 *  Everything that shows this text or detects when the canvas is stale must use this. */
export const clipPromptOf = (s: Pick<DirectorShot, 'prompt_user' | 'prompt_en' | 'dialogue' | 'sound' | 'music'> & Partial<Pick<DirectorShot, 'cast' | 'location'>>, lang?: string, people: string[] = []): string => {
  const own = (s.prompt_user ?? '').trim();
  return own || composeClipPrompt(s, lang, people);
};
