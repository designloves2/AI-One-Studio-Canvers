// The text a clip's Prompt card gets: the picture description plus the writer's dialogue, the sound director's sound and the music director's music.
// (They map to the H3 prompt's dialogue / overall_soundscape / non_diegetic_music.) When the clip has cast, the order of the reference images is added
// ("@image1 = Seoyeon"): the canvas connects the images in exactly this order. Pure.
import type { DirectorShot } from './types';

export function composeClipPrompt(s: Pick<DirectorShot, 'prompt_en' | 'dialogue' | 'sound' | 'music'> & Partial<Pick<DirectorShot, 'cast' | 'location'>>): string {
  const lines = [s.prompt_en.trim()];
  const names = [...new Set([...(s.cast ?? []), ...(s.location ? [s.location] : [])])];
  if (names.length) lines.push(`References: ${names.map((n, i) => `@image${i + 1} = ${n}`).join(', ')}`);
  if (s.dialogue?.trim()) lines.push(`Dialogue: ${s.dialogue.trim()}`);
  if (s.sound?.trim()) lines.push(`Sound: ${s.sound.trim()}`);
  if (s.music?.trim()) lines.push(`Music: ${s.music.trim()}`);
  return lines.filter(Boolean).join('\n');
}
