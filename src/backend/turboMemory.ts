import { getJson, postJson } from './http';
import { useSettings } from '../store/settings';

/**
 * The 7+1 Turbo LoRAs picked last are kept on the server, in One Studio's own saved H3 settings
 * (pdd_file = first/last-frame LoRA, pdd_file_reference = multi-reference LoRA), so they survive a new browser,
 * another address / port and a cleared cache - and One Studio and the canvas share the same choice.
 */
const KEY = { fl: 'pdd_file', ref: 'pdd_file_reference' } as const;

/** remember a pick on the server (fire and forget) */
export function saveTurboPick(kind: 'fl' | 'ref', lora: string): void {
  if (!lora || lora === 'none') return;
  void postJson('/minimax_h3_one/config', { [KEY[kind]]: lora }).catch(() => undefined);
}

/** at start-up: take the last picks from the server so every new / empty Turbo card gets them */
export async function loadTurboFromStudio(): Promise<void> {
  try {
    const cfg = await getJson<Record<string, unknown>>('/minimax_h3_one/config');
    const fl = String(cfg[KEY.fl] ?? ''), ref = String(cfg[KEY.ref] ?? '');
    useSettings.getState().setH3Turbo({ ...(fl && fl !== 'none' ? { fl } : {}), ...(ref && ref !== 'none' ? { ref } : {}) });
  } catch { /* the local memory still works */ }
}
