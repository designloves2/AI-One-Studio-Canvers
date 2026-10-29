// Production server: serves the built canvas (dist/) and forwards ComfyUI + STUDIO_ONE traffic.
//   COMFY_URL=http://127.0.0.1:8188 PORT=8765 node serve.mjs
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleDownloads } from './server-lib/downloads.mjs';
import { handleCanvases } from './server-lib/canvases.mjs';
import { handleDirector } from './server-lib/director.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const defaultTarget = new URL(process.env.COMFY_URL ?? 'http://127.0.0.1:8188');
let target = defaultTarget;   // changed from the Settings panel (POST /canvers/target), empty = back to COMFY_URL
const port = Number(process.env.PORT ?? 8765);

const PROXIED = ['/prompt', '/history', '/queue', '/upload', '/view', '/object_info', '/system_stats', '/interrupt', '/free', '/ws',
  '/flux_klein', '/z_image_turbo', '/krea2_one', '/sdxl_one', '/qwen2511_one', '/qwenimage21_one', '/anima_one', '/moss_one', '/minimax_h3_one',
  '/ltx25_one', '/music_one', '/tj_studio_one', '/tj_shared', '/shared', '/tj_node', '/itda_studio_one', '/extensions', '/api', '/internal', '/userdata', '/models', '/embeddings', '/custom_nodes'];
const isProxied = (p) => PROXIED.some((x) => p === x || p.startsWith(x + '/') || p.startsWith(x + '?'));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  if (await handleDownloads(req, res)) return;
  if (await handleCanvases(req, res)) return;
  if (await handleDirector(req, res)) return;
  if (p === '/canvers/target') {
    const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.method === 'GET') return json(200, { url: target.origin });
    // only from the machine running the server: a tunnelled visitor must not be able to redirect the proxy
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host ?? '')) return json(403, { error: 'only from localhost' });
    let body = ''; for await (const c of req) body += c;
    try {
      const u = JSON.parse(body || '{}').url?.trim();
      target = u ? new URL(/^https?:\/\//.test(u) ? u : `http://${u}`) : defaultTarget;
      return json(200, { url: target.origin });
    } catch { return json(400, { error: 'invalid address' }); }
  }
  if (isProxied(p)) {
    const up = http.request({ host: target.hostname, port: target.port || 80, path: req.url, method: req.method, headers: { ...req.headers, host: target.host, ...(req.headers.origin ? { origin: target.origin } : {}), ...(req.headers.referer ? { referer: target.origin + '/' } : {}) } }, (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers); r.pipe(res);
      r.on('error', () => res.destroy());
    });
    // a closed tab / aborted video range request must release the upstream socket, or they pile up until the proxy stalls
    res.on('close', () => { if (!res.writableFinished) up.destroy(); });
    up.on('error', (e) => { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: `ComfyUI unreachable at ${target.origin}: ${e.message}` })); });
    req.pipe(up); return;
  }
  let file = path.join(root, p === '/' ? 'index.html' : p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// WebSocket: tunnel the raw upgrade to ComfyUI
server.on('upgrade', (req, socket, head) => {
  const up = net.connect(Number(target.port || 80), target.hostname, () => {
    up.write(`${req.method} ${req.url} HTTP/1.1\r\n` + Object.entries({ ...req.headers, host: target.host, ...(req.headers.origin ? { origin: target.origin } : {}), ...(req.headers.referer ? { referer: target.origin + '/' } : {}) }).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n');
    if (head?.length) up.write(head);
    socket.pipe(up).pipe(socket);
  });
  up.on('error', () => socket.destroy()); socket.on('error', () => up.destroy());
});

server.listen(port, '0.0.0.0', () => console.log(`AI ONE Studio Canvers → http://localhost:${port}   (ComfyUI: ${target.origin})`));
