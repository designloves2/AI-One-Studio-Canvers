import { build } from 'esbuild';
await build({
  entryPoints: ['mcp/server.ts'], bundle: true, platform: 'node', format: 'esm', target: 'node20', outfile: 'mcp/server.mjs',
  banner: { js: "const __ls = new Map(); globalThis.localStorage ??= { getItem: (k) => __ls.get(k) ?? null, setItem: (k, v) => __ls.set(k, String(v)), removeItem: (k) => __ls.delete(k) };\nimport { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  define: { 'import.meta.env.DEV': 'false' }, logLevel: 'info',
});
