// The text a clip's Prompt card gets: the picture description plus the writer's dialogue, the sound director's sound and the music director's music.
// (They map to the H3 prompt's dialogue / overall_soundscape / non_diegetic_music.) When the clip has cast, the order of the reference images is added
// ("@image1 = Seoyeon"): the canvas connects the images in exactly this order. Pure.
import type { DirectorShot } from './types';

/** the dialogue is wrapped so any LLM that strengthens the prompt keeps it exactly as it is (the enhance instructions say to use <d>..</d> verbatim) */
const dlg = (s: string, lang?: string) => `<d>[${lang === 'en' ? 'English' : 'Korean'}]${s}</d>`;

export function composeClipPrompt(s: Pick<DirectorShot, 'prompt_en' | 'dialogue' | 'sound' | 'music'> & Partial<Pick<DirectorShot, 'cast' | 'location'>>, lang?: string): string {
  const lines = [s.prompt_en.trim()];
  const names = [...new Set([...(s.cast ?? []), ...(s.location ? [s.location] : [])])];
  if (names.length) lines.push(`References: ${names.map((n, i) => `@image${i + 1} = ${n}`).join(', ')}`);
  if (s.dialogue?.trim()) lines.push(`Dialogue: ${dlg(s.dialogue.trim(), lang)}`);
  if (s.sound?.trim()) lines.push(`Sound: ${s.sound.trim()}`);
  if (s.music?.trim()) lines.push(`Music: ${s.music.trim()}`);
  return lines.filter(Boolean).join('\n');
}

/** The full video prompt of a clip as it is used: the producer's own text (she wrote one in the Canvas step), else the composed one.
 *  Everything that shows this text or detects when the canvas is stale must use this. */
export const clipPromptOf = (s: Pick<DirectorShot, 'prompt_user' | 'prompt_en' | 'dialogue' | 'sound' | 'music'> & Partial<Pick<DirectorShot, 'cast' | 'location'>>, lang?: string): string => {
  const own = (s.prompt_user ?? '').trim();
  return own || composeClipPrompt(s, lang);
};
