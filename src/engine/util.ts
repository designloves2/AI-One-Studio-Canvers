import type { Asset, Primitive } from '../types';
import { uid } from '../backend/comfy';

export const textAsset = (text: string, port?: string): Asset => ({ id: uid(), type: 'text', url: '', text, port });
export const num = (v: Primitive | undefined, d = 0) => (typeof v === 'number' ? v : parseFloat(String(v)) || d);
export const str = (v: Primitive | undefined, d = '') => (v === undefined ? d : String(v));
export function need<T>(v: T | undefined, what: string): T {
  if (v === undefined || (Array.isArray(v) && !v.length)) throw new Error(`${what} is not connected`);
  return v;
}
