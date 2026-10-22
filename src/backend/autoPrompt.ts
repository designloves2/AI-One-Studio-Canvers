// Auto Prompt (same as the One Studio nodes): before a video card generates, its prompt is written with the LLM and the
// result replaces the prompt. The whole prompt goes in as one request, the whole answer comes back; no confirmation.
import type { Asset } from '../types';
import { listAssets, resolveRefs } from './assetlib';
import { runLlm } from './llm';
import { H3_SYSTEM_PROMPT_BASE, H3_SYSTEM_PROMPT_REF } from './h3Prompt';
import { LTX_WRITE_PLAIN_SYSTEM, LTX_VISION_SYSTEM } from './ltxPrompt';

const VISION = 'Describe this image factually and concisely for a video director: subject appearance, pose, expression, setting, lighting. Plain prose, no formatting, no preamble, 2-4 sentences.';
const secLabel = (s: number) => `${+s.toFixed(2)}s`;

async function describe(images: Asset[], system: string): Promise<string[]> {
  // all images at once (OpenRouter takes them in parallel; a local LLM still waits its turn in the guard)
  return (await Promise.all(images.map((a) => runLlm({ system, prompt: 'Describe this image.', images: [a], where: 'bottom' })))).map((d) => (d || '').trim());
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

/** The Asset Library references of a Reference clip: the @tokens the writer may use and a short description of each (name, category, tags, note) - the library turns @tokens into the model's tags itself. */
async function libraryContext(ref: { project?: string; ids: string[] }, described: Record<string, string> = {}): Promise<{ text: string; items: { token: string; name: string }[] }> {
  const [rep, listing] = await Promise.all([resolveRefs(ref.project ? 'project' : 'assets', ref.project, ref.ids), listAssets()]);
  if (!rep.ok) throw new Error(`could not resolve the library references: ${rep.errors?.[0]?.message ?? 'unknown'}`);
  const meta = new Map(listing.map((a) => [a.id, a]));
  const items = (rep.attached ?? []).map((a) => {
    const m = meta.get(a.id);
    return { token: `@${a.mention || a.alias || a.id}`, kind: a.kind, name: a.name, category: m?.category, tags: m?.tags ? String(m.tags) : '', note: [(m as { note?: string } | undefined)?.note, described[String(a.id)]].filter(Boolean).join(' / ') };
  });
  if (!items.length) throw new Error('the library references are empty');
  const lines = items.map((it, i) => [`<Picture ${i + 1}> = ${it.token} — ${it.name} (${it.kind}${it.category ? `, ${it.category}` : ''})`, it.tags && `tags: ${it.tags}`, it.note && `note: ${it.note}`].filter(Boolean).join(' · '));
  const text = 'Reference images attached to this clip, in this order (<Picture N> is what you write; the @name after it is what the creative brief calls it, so "' + items[0].token + '" in the brief means <Picture 1>). There are no videos and no audio: never write <Video N> or <Audio N>. EVERY <Picture N> listed below must appear in the prompt at least once, as its own subject doing what the creative brief says it does; a picture the brief does not describe still gets a fitting, natural place in the scene. Never leave one out and never invent a picture that is not listed.\n' + lines.join('\n');
  return { text, items: items.map((it) => ({ token: it.token, name: it.name })) };
}

/**
 * A small local model often defines every reference as <Subject k> (in the order it was given them) but forgets to name the picture each one is.
 * Without that link the video model cannot tell which image is which, so when there are as many subject lines as pictures, each subject that has no
 * <Picture> yet gets the picture of the same number.
 */
export function linkSubjects(text: string, pictures: number): string {
  const lines = text.split('\n');
  const idx = lines.map((l, i) => (/^<Subject \d+> /.test(l) ? i : -1)).filter((i) => i >= 0);
  if (idx.length !== pictures) return text;   // shortcut: the pairing by number is only safe when the counts match
  idx.forEach((i, k) => { if (!/<Picture \d+>/.test(lines[i])) lines[i] = lines[i].replace(/\s*$/, '').replace(/\.?$/, ` in <Picture ${k + 1}>.`); });
  return lines.join('\n');
}

/**
 * The order of the references decides which face goes where, so the written prompt is checked with the library itself: a name the library cannot read as a token
 * (it only knows aliases / ids, so "@girl-1" is not one) is replaced by the asset's real token, and anything still wrong or unused is reported.
 */
async function checkLibraryTags(text: string, ref: { project?: string; ids: string[] }, items: { token: string; name: string }[], warn?: (m: string) => void): Promise<string> {
  let out = text;
  // every way of naming a reference (@alias, @id, @name) becomes its <Picture N>: the numbers follow the attach order, so nothing can drift
  items.forEach((it, i) => {
    for (const form of new Set([it.token, `@${it.name}`])) out = out.replace(new RegExp(form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])', 'gi'), `<Picture ${i + 1}>`);
  });
  out = linkSubjects(out, items.length);
  const chk = await resolveRefs(ref.project ? 'project' : 'assets', ref.project, ref.ids, out);
  const errs = (chk.errors ?? []).filter((e) => e.code !== 'NOT_ATTACHED');
  // the library node itself only warns about these (match_check = warn), so they are reported, not fatal
  for (const e of new Set(errs.map((x) => x.message))) warn?.(e);
  for (const w of chk.warnings ?? []) warn?.(w.message);
  return out;
}

/** MiniMax H3: Reference (Ref2VA) uses the full-reference guide, every other mode the base guide. */
export async function autoPromptH3(o: { prompt: string; seconds: number; mode: 'reference' | 'firstlast' | 't2v'; images: Asset[]; assetRef?: { project?: string; ids: string[] }; tempImages?: Record<string, Asset>; warn?: (msg: string) => void; oneTake?: boolean; clips?: number }): Promise<string> {
  // with an Asset Library card the clip is rendered from the library references only (plain image cards are not used), so those are what the writer is told about
  const images = o.assetRef ? [] : o.images.slice(0, 9);
  // plain images that were bundled into temporary library assets are described here, as the library has nothing on them
  const described: Record<string, string> = {};
  const tmpIds = Object.keys(o.tempImages ?? {});
  (await describe(tmpIds.map((id) => o.tempImages![id]), VISION)).forEach((d, i) => { described[tmpIds[i]] = d; });
  const libCtx = o.assetRef ? await libraryContext(o.assetRef, described) : null;
  const lib = libCtx?.text ?? '';
  if (!o.prompt.trim() && !images.length && !lib) return o.prompt;
  const notes = images.length ? (await describe(images, VISION)).map((d, i) => `Image ${i + 1}: ${d}`).join('\n') : '';
  const label = o.mode === 'reference' ? 'Reference' : o.mode === 'firstlast' ? 'First/Last frame' : 'Text/Image → Brief';
  const lines = [`Mode: ${label}`, `Target duration: ${o.seconds.toFixed(2)} seconds total, split into 1 shot(s) of ~${o.seconds.toFixed(2)}s each.`];
  // One-Take: the same rule block the node adds; the prompt may hold several clips (--- between them), each o.seconds long
  if (o.oneTake) lines.push('', oneTakeRules(Array.from({ length: Math.max(1, o.clips ?? 1) }, () => o.seconds)));
  lines.push('', 'Reference manifest:');
  lines.push(lib ? lib : o.mode === 'reference' && images.length ? `${images.length} reference image(s) supplied; refer to them as <Picture 1>…<Picture ${images.length}>.` : 'None');
  if (notes) {
    lines.push('', o.mode === 'firstlast'
      ? 'The following images were analyzed in order: image 1 is the STARTING frame, the last one is the ENDING frame. Write the brief as a first/last-frame shot that moves from the starting description to the ending one.'
      : `The following images were analyzed in order and are the <Picture 1>…<Picture ${images.length}> references for this brief.`, '', notes);
  }
  lines.push('', 'Creative brief:', o.prompt || '(no text supplied — base the brief on the image analysis above)', '',
    'Final grounding check: stay grounded in what the request and any images/video/audio actually show — invent only the minimum needed to connect frames or fulfill the request, never unrelated actions, props, on-screen text, dialogue, or locations. An explicit user instruction always outranks a default assumption. Treat every explicitly assigned reference role (voice, motion, style, etc.) as exclusive — use only that role\'s content, do not also pull in its other visible traits. Do not invent music or ambient sound beyond what the request asks for or clearly implies. Never pad solely to reach a length — use only what the target duration above actually needs. Return only the complete brief text, no commentary outside it.');
  const text = (await runLlm({ system: o.mode === 'reference' ? H3_SYSTEM_PROMPT_REF : H3_SYSTEM_PROMPT_BASE, prompt: lines.join('\n'), where: 'bottom', max_tokens: 16000 })).trim();
  if (!text) throw new Error('empty response');
  if (!o.assetRef || !libCtx) return text;
  return checkLibraryTags(text, o.assetRef, libCtx.items, o.warn);
}

/** LTX 2.5: the clip is written as a plan (JSON) and its prompt is taken (this card has no segment timeline). */
export async function autoPromptLtx(o: { prompt: string; seconds: number; images: Asset[] }): Promise<string> {
  const images = o.images.slice(0, 2);
  if (!o.prompt.trim() && !images.length) return o.prompt;
  const notes = images.length ? (await describe(images, LTX_VISION_SYSTEM)).map((d, i) => `Image ${i + 1}: ${d}`).join('\n') : '';
  const lines = [`Total length: ${secLabel(o.seconds)} in 1 clip: clip 1 = ${secLabel(o.seconds)}.`, 'Write exactly 1 clip with these lengths.'];
  if (notes) lines.push('', 'Images given to this clip (in order; the time is when each one appears):', notes);
  lines.push('', 'Brief:', o.prompt || '(no text supplied - base the plan on the images above)', '', 'Return only the JSON object.');
  const text = await runLlm({ system: LTX_WRITE_PLAIN_SYSTEM, prompt: lines.join('\n'), where: 'bottom', max_tokens: 8000 });
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('the model did not return a plan (no JSON found)');
  let raw: any; try { raw = JSON.parse(text.slice(a, b + 1)); } catch { throw new Error("the model's plan is not valid JSON"); }
  const clip = String(raw?.clips?.[0]?.prompt ?? '').trim();
  if (!clip) throw new Error('the plan has no clips');
  return [String(raw.global ?? '').trim(), clip].filter(Boolean).join('\n\n');
}
