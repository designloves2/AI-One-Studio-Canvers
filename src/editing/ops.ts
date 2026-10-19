// Browser-side image operations (Canvas 2D). Each takes decoded images and returns a canvas.
import type { Asset } from '../types';
import { fetchBlob, uploadToInput, assetFromFile } from '../backend/comfy';

type Params = Record<string, string | number | boolean>;
const n = (v: unknown, d = 0) => (typeof v === 'number' ? v : parseFloat(String(v)) || d);

export async function loadBitmap(a: Asset): Promise<ImageBitmap> {
  return createImageBitmap(await fetchBlob(a));
}

const newCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
};
const draw = (src: ImageBitmap | HTMLCanvasElement) => {
  const c = newCanvas(src.width, src.height);
  c.getContext('2d', { willReadFrequently: true })!.drawImage(src, 0, 0);
  return c;
};
const pixels = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height);
const put = (c: HTMLCanvasElement, d: ImageData) => { c.getContext('2d', { willReadFrequently: true })!.putImageData(d, 0, 0); return c; };
const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('PNG encode failed'))), 'image/png'));
}

/** Encode, upload to ComfyUI's input folder and wrap as an Asset so it can feed generators. */
export async function canvasToAsset(c: HTMLCanvasElement, port?: string): Promise<Asset> {
  return assetFromFile(await uploadToInput(await canvasToBlob(c)), 'image', port);
}

function filtered(src: ImageBitmap | HTMLCanvasElement, filter: string): HTMLCanvasElement {
  const c = newCanvas(src.width, src.height);
  const ctx = c.getContext('2d')!;
  ctx.filter = filter;
  ctx.drawImage(src, 0, 0);
  return c;
}

export function convolve(c: HTMLCanvasElement, kernel: number[], div = 1): HTMLCanvasElement {
  const src = pixels(c); const out = new ImageData(c.width, c.height);
  const w = c.width, h = c.height;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    for (let ch = 0; ch < 3; ch++) {
      let acc = 0;
      for (let ky = -1; ky <= 1; ky++) for (let kx = -1; kx <= 1; kx++) {
        const yy = Math.min(h - 1, Math.max(0, y + ky)), xx = Math.min(w - 1, Math.max(0, x + kx));
        acc += src.data[(yy * w + xx) * 4 + ch] * kernel[(ky + 1) * 3 + kx + 1];
      }
      out.data[(y * w + x) * 4 + ch] = clamp(acc / div);
    }
    out.data[(y * w + x) * 4 + 3] = src.data[(y * w + x) * 4 + 3];
  }
  return put(newCanvas(w, h), out);
}

export function applyOp(op: string, img: ImageBitmap, p: Params): HTMLCanvasElement {
  const w = img.width, h = img.height;
  switch (op) {
    case 'crop': {
      const x = Math.round(w * n(p.x) / 100), y = Math.round(h * n(p.y) / 100);
      const cw = Math.max(1, Math.min(w - x, Math.round(w * n(p.w, 100) / 100))), ch = Math.max(1, Math.min(h - y, Math.round(h * n(p.h, 100) / 100)));
      const c = newCanvas(cw, ch); c.getContext('2d')!.drawImage(img, x, y, cw, ch, 0, 0, cw, ch); return c;
    }
    case 'resize': {
      let nw = w, nh = h;
      const mode = String(p.mode);
      if (mode === 'scale') { nw = w * n(p.scale, 1); nh = h * n(p.scale, 1); }
      else if (mode === 'fit width') { nw = n(p.width, w); nh = h * (nw / w); }
      else if (mode === 'fit height') { nh = n(p.height, h); nw = w * (nh / h); }
      else { nw = n(p.width, w); nh = n(p.height, h); }
      const c = newCanvas(nw, nh); const ctx = c.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, c.width, c.height); return c;
    }
    case 'blur': return filtered(img, `blur(${n(p.radius, 4)}px)`);
    case 'hue-rotate': return filtered(img, `hue-rotate(${n(p.degrees, 30)}deg)`);
    case 'grayscale': return filtered(img, `grayscale(${n(p.amount, 1)})`);
    case 'invert': return filtered(img, 'invert(1)');
    case 'color-correct': {
      const c = filtered(img, `brightness(${n(p.brightness, 1)}) contrast(${n(p.contrast, 1)}) saturate(${n(p.saturation, 1)})`);
      const warm = n(p.temperature);
      if (warm) {
        const d = pixels(c);
        for (let i = 0; i < d.data.length; i += 4) { d.data[i] = clamp(d.data[i] + warm * 0.6); d.data[i + 2] = clamp(d.data[i + 2] - warm * 0.6); }
        put(c, d);
      }
      return c;
    }
    case 'levels': {
      const c = draw(img); const d = pixels(c);
      const b = n(p.black), wt = Math.max(b + 1, n(p.white, 255)), g = 1 / Math.max(0.01, n(p.gamma, 1));
      const lut = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) lut[i] = clamp(255 * Math.pow(Math.min(1, Math.max(0, (i - b) / (wt - b))), g));
      for (let i = 0; i < d.data.length; i += 4) { d.data[i] = lut[d.data[i]]; d.data[i + 1] = lut[d.data[i + 1]]; d.data[i + 2] = lut[d.data[i + 2]]; }
      return put(c, d);
    }
    case 'rotate-flip': {
      const r = n(p.rotate) % 360; const swap = r === 90 || r === 270;
      const c = newCanvas(swap ? h : w, swap ? w : h); const ctx = c.getContext('2d')!;
      ctx.translate(c.width / 2, c.height / 2); ctx.rotate((r * Math.PI) / 180);
      ctx.scale(p.flip_h ? -1 : 1, p.flip_v ? -1 : 1); ctx.drawImage(img, -w / 2, -h / 2); return c;
    }
    case 'sharpen': {
      const a = n(p.amount, 0.8);
      return convolve(draw(img), [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0]);
    }
    case 'threshold': {
      const c = draw(img); const d = pixels(c); const lv = n(p.level, 128);
      for (let i = 0; i < d.data.length; i += 4) { const y = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2]; const v = y >= lv ? 255 : 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; }
      return put(c, d);
    }
    case 'posterize': {
      const c = draw(img); const d = pixels(c); const lv = Math.max(2, n(p.levels, 6)); const step = 255 / (lv - 1);
      for (let i = 0; i < d.data.length; i += 4) for (let k = 0; k < 3; k++) d.data[i + k] = Math.round(Math.round(d.data[i + k] / step) * step);
      return put(c, d);
    }
    case 'vignette': {
      const c = draw(img); const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (1 - n(p.softness, 0.6)) * 0.5, w / 2, h / 2, Math.hypot(w, h) / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${n(p.strength, 0.5)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); return c;
    }
    case 'pixelate': {
      const s = Math.max(2, n(p.size, 12));
      const small = newCanvas(w / s, h / s); const sc = small.getContext('2d')!; sc.imageSmoothingEnabled = true; sc.drawImage(img, 0, 0, small.width, small.height);
      const c = newCanvas(w, h); const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false; ctx.drawImage(small, 0, 0, w, h); return c;
    }
    default: throw new Error(`Unknown edit op ${op}`);
  }
}

/** channels node → [image, mask] */
export function channelOp(img: ImageBitmap, channel: string): { image: HTMLCanvasElement; mask: HTMLCanvasElement } {
  const c = draw(img); const d = pixels(c);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = channel === 'red' ? d.data[i] : channel === 'green' ? d.data[i + 1] : channel === 'blue' ? d.data[i + 2] : channel === 'alpha' ? d.data[i + 3] : 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  put(c, d);
  return { image: c, mask: draw(c) };
}

const BLEND: Record<string, GlobalCompositeOperation> = {
  normal: 'source-over', multiply: 'multiply', screen: 'screen', overlay: 'overlay', darken: 'darken', lighten: 'lighten', difference: 'difference', 'soft-light': 'soft-light',
};

export function blendOp(base: ImageBitmap, top: ImageBitmap, mask: ImageBitmap | null, p: Params): HTMLCanvasElement {
  const c = newCanvas(base.width, base.height); const ctx = c.getContext('2d')!;
  ctx.drawImage(base, 0, 0);
  const layer = newCanvas(base.width, base.height); const lc = layer.getContext('2d')!;
  lc.drawImage(top, 0, 0, layer.width, layer.height);
  if (mask) { // keep the layer only where the mask is white
    const m = newCanvas(base.width, base.height); const mc = m.getContext('2d', { willReadFrequently: true })!;
    mc.drawImage(mask, 0, 0, m.width, m.height);
    const md = mc.getImageData(0, 0, m.width, m.height);
    for (let i = 0; i < md.data.length; i += 4) { md.data[i + 3] = md.data[i]; }
    mc.putImageData(md, 0, 0);
    lc.globalCompositeOperation = 'destination-in'; lc.drawImage(m, 0, 0);
  }
  ctx.globalAlpha = n(p.opacity, 1); ctx.globalCompositeOperation = BLEND[String(p.mode)] ?? 'source-over';
  ctx.drawImage(layer, 0, 0); return c;
}

export function maskGrow(img: ImageBitmap, amount: number, feather: number): HTMLCanvasElement {
  let c = draw(img);
  const steps = Math.abs(Math.round(amount));
  if (steps) {
    // dilate/erode by blurring then re-thresholding (cheap, good enough for mattes)
    const radius = Math.max(1, steps);
    const b = filtered(c, `blur(${radius}px)`); const d = pixels(b);
    const cut = amount > 0 ? 8 : 247;
    for (let i = 0; i < d.data.length; i += 4) { const v = d.data[i] > cut ? 255 : 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    c = put(b, d);
  }
  if (feather > 0) c = filtered(c, `blur(${feather}px)`);
  return c;
}

export function invertMask(img: ImageBitmap): HTMLCanvasElement { return filtered(img, 'invert(1)'); }

/** dominant colours by median-cut-free 4-bit bucketing — plenty for a palette node */
export function palette(img: ImageBitmap, count: number): string[] {
  const s = 96, c = newCanvas(s, Math.max(1, Math.round((s * img.height) / img.width))); const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data; const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 16) continue;
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    const e = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2]; bins.set(key, e);
  }
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return [...bins.values()].sort((a, b) => b.n - a.n).slice(0, count).map((e) => `#${hex(e.r / e.n)}${hex(e.g / e.n)}${hex(e.b / e.n)}`);
}

export async function videoFrame(a: Asset, positionPct: number): Promise<HTMLCanvasElement> {
  const blob = await fetchBlob(a); const url = URL.createObjectURL(blob);
  try {
    const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = url;
    await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error('cannot read video')); });
    v.currentTime = Math.max(0, (v.duration || 0) * (positionPct / 100) - (positionPct >= 100 ? 0.05 : 0));
    await new Promise<void>((res) => { v.onseeked = () => res(); });
    const c = newCanvas(v.videoWidth, v.videoHeight); c.getContext('2d')!.drawImage(v, 0, 0); return c;
  } finally { URL.revokeObjectURL(url); }
}
