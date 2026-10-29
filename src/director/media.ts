// Where the picture of a cast entry / result is read from (app side). A result made in ComfyUI or chosen from the Gallery is a file of the
// ComfyUI folders; a result chosen from the Asset Library is read from the library.
import { assetFromFile, viewUrl } from '../backend/comfy';
import { libFile } from '../backend/assetlib';
import type { Asset } from '../types';
import type { ResultRef } from './types';

export const resultUrl = (r?: ResultRef): string => (!r ? '' : r.lib_id ? libFile(r.lib_id) : viewUrl(r.file));

/** the canvas Asset for a picked image (what a Load Image card holds) */
export function assetOfResult(r: ResultRef, id: string): Asset {
  if (r.lib_id) return { id, type: 'image', url: libFile(r.lib_id), port: 'image' };
  return { ...assetFromFile(r.file, 'image', 'image'), id };
}
