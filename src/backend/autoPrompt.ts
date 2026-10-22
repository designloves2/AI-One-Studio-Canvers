// Auto Prompt (same as the One Studio nodes): before a video card generates, its prompt is written with the LLM and the
// result replaces the prompt. The whole prompt goes in as one request, the whole answer comes back; no confirmation.
import type { Asset } from '../types';
import { runLlm } from './llm';
import { H3_SYSTEM_PROMPT_BASE, H3_SYSTEM_PROMPT_REF } from './h3Prompt';
import { LTX_WRITE_PLAIN_SYSTEM, LTX_VISION_SYSTEM } from './ltxPrompt';

const VISION = 'Describe this image factually and concisely for a video director: subject appearance, pose, expression, setting, lighting. Plain prose, no formatting, no preamble, 2-4 sentences.';
const secLabel = (s: number) => `${+s.toFixed(2)}s`;

async function describe(images: Asset[], system: string): Promise<string[]> {
  const out: string[] = [];
  for (const a of images) out.push(((await runLlm({ system, prompt: 'Describe this image.', images: [a], where: 'bottom' })) || '').trim());
  return out;
}

/** One-Take: the rule block the node adds to the brief request while Continuity is One-Take (ONE_TAKE guide, chapter 8). `lens` = each clip's length in seconds. */
export function oneTakeRules(lens: number[], prevEnding = ''): string {
  const cutoff = (l: number) => Math.max(0, l - 1.7).toFixed(1);
  const lines = [
    'ONE-TAKE MODE - the clips are chained into one continuous, unbroken take.',
    'How it works: consecutive clips overlap by 39 frames (1.625 s). The first 1.625 s of clip N+1 re-renders the last 1.625 s of clip N, '
    + 'so the start of clip N+1 is a copy of the end state of clip N, not new content. New content of a clip begins at 2.0 s.',
    'Rules:',
    '1. Use exactly one [Shot 1] per clip. Never write [Shot 2] or higher - a shot number means a cut.',
    '2. Write the development at 2.0 s in the same paragraph, as "At 00:02.000, ..." (later beats the same way, in the same paragraph).',
    '3. End every clip by stating its exact final state, as if describing the last frame frozen: pose, direction, speed, camera position.',
    '4. Open every clip after the first by copying that final state word for word - keep the noun phrases exactly, change only the verbs '
    + 'to "is already ...ing" / "still". Never rephrase it.',
    '5. Finish fast or irreversible actions (strikes, jumps, throws, opening doors, sudden expressions) at least 1.7 s before the clip ends'
    + (lens.length ? ` (cut-off per clip: ${lens.map((l, i) => `clip ${i + 1} ${cutoff(l)} s`).join(', ')})` : '')
    + '; only slow, sustainable motion at the seam.',
    '6. End each clip in motion (a moving vector), not stopped.',
    '7. Describe every element on screen - supporting characters, VFX (and the direction they dissipate), props, performance, crowd - with identical wording on both sides of each seam.',
    '8. State direction (left / right / clockwise) and speed (same steady pace) explicitly; the camera keeps moving too.',
    '9. Start each clip with: "The entire clip is a single uninterrupted shot with no cuts." and, from clip 2 on, '
    + '"The clip continues the same unbroken take; <the copied end state>."',
  ];
  if (prevEnding) lines.push('', `The clip before this one ends with: "${prevEnding}" - open this clip with that state, copied as rule 4 says.`);
  return lines.join('\n');
}

/** MiniMax H3: Reference (Ref2VA) uses the full-reference guide, every other mode the base guide. */
export async function autoPromptH3(o: { prompt: string; seconds: number; mode: 'reference' | 'firstlast' | 't2v'; images: Asset[]; assetRef?: boolean; oneTake?: boolean; clips?: number }): Promise<string> {
  const images = o.images.slice(0, 9);
  if (!o.prompt.trim() && !images.length) return o.prompt;
  const notes = images.length ? (await describe(images, VISION)).map((d, i) => `Image ${i + 1}: ${d}`).join('\n') : '';
  const label = o.mode === 'reference' ? 'Reference' : o.mode === 'firstlast' ? 'First/Last frame' : 'Text/Image → Brief';
  const lines = [`Mode: ${label}`, `Target duration: ${o.seconds.toFixed(2)} seconds total, split into 1 shot(s) of ~${o.seconds.toFixed(2)}s each.`];
  // One-Take: the same rule block the node adds; the prompt may hold several clips (--- between them), each o.seconds long
  if (o.oneTake) lines.push('', oneTakeRules(Array.from({ length: Math.max(1, o.clips ?? 1) }, () => o.seconds)));
  lines.push('', 'Reference manifest:');
  lines.push(o.assetRef ? 'Asset Library references are named by @name in the creative brief.' : o.mode === 'reference' && images.length ? `${images.length} reference image(s) supplied; refer to them as <Picture 1>…<Picture ${images.length}>.` : 'None');
  if (notes) {
    lines.push('', o.mode === 'firstlast'
      ? 'The following images were analyzed in order: image 1 is the STARTING frame, the last one is the ENDING frame. Write the brief as a first/last-frame shot that moves from the starting description to the ending one.'
      : `The following images were analyzed in order and are the <Picture 1>…<Picture ${images.length}> references for this brief.`, '', notes);
  }
  lines.push('', 'Creative brief:', o.prompt || '(no text supplied — base the brief on the image analysis above)', '',
    'Final grounding check: stay grounded in what the request and any images/video/audio actually show — invent only the minimum needed to connect frames or fulfill the request, never unrelated actions, props, on-screen text, dialogue, or locations. An explicit user instruction always outranks a default assumption. Treat every explicitly assigned reference role (voice, motion, style, etc.) as exclusive — use only that role\'s content, do not also pull in its other visible traits. Do not invent music or ambient sound beyond what the request asks for or clearly implies. Never pad solely to reach a length — use only what the target duration above actually needs. Return only the complete brief text, no commentary outside it.');
  const text = (await runLlm({ system: o.mode === 'reference' ? H3_SYSTEM_PROMPT_REF : H3_SYSTEM_PROMPT_BASE, prompt: lines.join('\n'), where: 'bottom' })).trim();
  if (!text) throw new Error('empty response');
  return text;
}

/** LTX 2.5: the clip is written as a plan (JSON) and its prompt is taken (this card has no segment timeline). */
export async function autoPromptLtx(o: { prompt: string; seconds: number; images: Asset[] }): Promise<string> {
  const images = o.images.slice(0, 2);
  if (!o.prompt.trim() && !images.length) return o.prompt;
  const notes = images.length ? (await describe(images, LTX_VISION_SYSTEM)).map((d, i) => `Image ${i + 1}: ${d}`).join('\n') : '';
  const lines = [`Total length: ${secLabel(o.seconds)} in 1 clip: clip 1 = ${secLabel(o.seconds)}.`, 'Write exactly 1 clip with these lengths.'];
  if (notes) lines.push('', 'Images given to this clip (in order; the time is when each one appears):', notes);
  lines.push('', 'Brief:', o.prompt || '(no text supplied - base the plan on the images above)', '', 'Return only the JSON object.');
  const text = await runLlm({ system: LTX_WRITE_PLAIN_SYSTEM, prompt: lines.join('\n'), where: 'bottom' });
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('the model did not return a plan (no JSON found)');
  let raw: any; try { raw = JSON.parse(text.slice(a, b + 1)); } catch { throw new Error("the model's plan is not valid JSON"); }
  const clip = String(raw?.clips?.[0]?.prompt ?? '').trim();
  if (!clip) throw new Error('the plan has no clips');
  return [String(raw.global ?? '').trim(), clip].filter(Boolean).join('\n\n');
}
