import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: the browser talks to this server only; ComfyUI (+ the STUDIO_ONE routes) is proxied,
// so there are no CORS problems. Override the target with COMFY_URL.
const target = process.env.COMFY_URL ?? 'http://127.0.0.1:8188';
const proxied = ['/prompt', '/history', '/queue', '/upload', '/view', '/object_info', '/system_stats', '/interrupt', '/free', '/flux_klein', '/z_image_turbo', '/krea2_one', '/sdxl_one', '/qwen2511_one', '/qwenimage21_one', '/anima_one', '/minimax_h3_one', '/ltx25_one', '/music_one', '/tj_studio_one', '/tj_shared', '/shared', '/tj_node', '/itda_studio_one'];

// ComfyUI refuses requests whose Origin host differs from its own Host (loopback origin check),
// so the proxy presents ComfyUI's own origin instead of the dev server's.
const common = {
  target, changeOrigin: true,
  configure: (proxy: any) => {
    const fix = (req: any) => { try { req.setHeader('origin', target); } catch { /* headers already sent */ } };
    proxy.on('proxyReq', fix); proxy.on('proxyReqWs', fix);
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      ...Object.fromEntries(proxied.map((p) => [p, common])),
      '/ws': { ...common, ws: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
