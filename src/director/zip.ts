// A small ZIP writer (STORE = no compression, so no library is needed) and the safe-path rules for the production package. Pure.
//
// Rules for every entry name: relative, "/" separated, no "..", no drive letter, no leading "/" or "\", no control characters, not empty,
// at most 180 characters. A name that breaks a rule is refused (never silently "fixed"), so nothing can be written outside the package.

export interface ZipFile { path: string; data: Uint8Array }

const enc = new TextEncoder();
export const utf8 = (s: string) => enc.encode(s);

const BAD = /[\u0000-\u001f\\:*?"<>|]/;
export function isSafeZipPath(p: string): boolean {
  if (!p || p.length > 180 || p.startsWith('/') || BAD.test(p)) return false;
  return p.split('/').every((seg) => seg !== '' && seg !== '.' && seg !== '..');   // a drive letter ("C:") is already refused above: ':' is not allowed
}

/** a file-name part made safe for a package path (the name stays readable; Korean is kept) */
export function safeName(n: string, fallback = 'file'): string {
  const s = n.normalize('NFC').replace(/[\u0000-\u001f\\/:*?"<>|]+/g, ' ').replace(/\.{2,}/g, '.').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 80).trim();
  return s || fallback;
}

let table: Uint32Array | null = null;
export function crc32(data: Uint8Array): number {
  if (!table) { table = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Build the ZIP bytes. Throws on an unsafe or duplicate path. */
export function buildZip(files: ZipFile[], now: Date = new Date()): Uint8Array {
  const seen = new Set<string>();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  const chunks: Uint8Array[] = []; const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (v: number) => [v & 0xff, (v >>> 8) & 0xff];
  const u32 = (v: number) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
  for (const f of files) {
    if (!isSafeZipPath(f.path)) throw new Error(`unsafe path in the package: ${f.path}`);
    if (seen.has(f.path)) throw new Error(`duplicate path in the package: ${f.path}`);
    seen.add(f.path);
    const name = utf8(f.path), crc = crc32(f.data), size = f.data.length;
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0)]);
    chunks.push(local, name, f.data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
    offset += local.length + name.length + size;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  const all = [...chunks, ...central, end];
  const out = new Uint8Array(all.reduce((a, c) => a + c.length, 0));
  let p = 0; for (const c of all) { out.set(c, p); p += c.length; }
  return out;
}
