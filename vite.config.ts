import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-ignore plain JS helper shared with serve.mjs
import { handleDownloads } from './server-lib/downloads.mjs';
// @ts-ignore plain JS helper shared with serve.mjs
import { handleCanvases } from './server-lib/canvases.mjs';

// Dev: the browser talks to this server only; ComfyUI (+ the STUDIO_ONE routes) is proxied,
// so there are no CORS problems. Override the target with COMFY_URL.
const target = process.env.COMFY_URL ?? 'http://127.0.0.1:8188';
const proxied = ['/prompt', '/history', '/queue', '/upload', '/view', '/object_info', '/system_stats', '/interrupt', '/free', '/flux_klein', '/z_image_turbo', '/krea2_one', '/sdxl_one', '/qwen2511_one', '/qwenimage21_one', '/anima_one', '/moss_one', '/minimax_h3_one', '/ltx25_one', '/music_one', '/tj_studio_one', '/tj_shared', '/shared', '/tj_node', '/itda_studio_one', '/extensions', '/api', '/internal', '/userdata', '/models', '/embeddings', '/custom_nodes'];

// ComfyUI refuses requests whose Origin host differs from its own Host (loopback origin check),
// so the proxy presents ComfyUI's own origin instead of the dev server's.
const common = {
  target, changeOrigin: true,
  configure: (proxy: any) => {
    const fix = (req: any) => { try { req.setHeader('origin', target); if (req.getHeader('referer')) req.setHeader('referer', target + '/'); } catch { /* headers already sent */ } };
    proxy.on('proxyReq', fix); proxy.on('proxyReqWs', fix);
  },
};

export default defineConfig({
  plugins: [react(), { name: 'canvers-downloads', configureServer(server) { server.middlewares.use((req, res, next) => { void handleDownloads(req as any, res as any).then((h: boolean) => { if (!h) next(); }); }); } }, { name: 'canvers-canvases', configureServer(server) { server.middlewares.use((req, res, next) => { void handleCanvases(req as any, res as any).then((h: boolean) => { if (!h) next(); }); }); } }],
  server: {
    // 127.0.0.1 (not only "localhost", which on Windows can mean IPv6 only) so a cloudflared tunnel can reach it;
    // tunnel host names are allowed (add more with CANVERS_ALLOWED_HOSTS=a.example.com,b.example.com)
    host: '127.0.0.1',
    port: 8765, strictPort: true,   // the app's port (serve.mjs uses the same)
    allowedHosts: ['.trycloudflare.com', '.tjtj.cloud', ...(process.env.CANVERS_ALLOWED_HOSTS ?? '').split(',').map((x) => x.trim()).filter(Boolean)],
    proxy: {
      ...Object.fromEntries(proxied.map((p) => [p, common])),
      '/ws': { ...common, ws: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
