// MCP server (stdio): drive AI ONE Studio Canvers from Claude Code or any MCP client.
// Uses the same backend modules as the web app, so results are identical.
//   COMFY_URL=http://127.0.0.1:8188 node mcp/server.mjs
import fs from 'node:fs';
import path from 'node:path';
import { useSettings } from '../src/store/settings';
import { executeGraph } from '../src/engine/run';
import { REGISTRY, byId, defaultParams, engineFor } from '../src/registry';
import { fetchBlob, systemStats } from '../src/backend/comfy';
import { loadServerSettings, runLlm } from '../src/backend/llm';
import type { Asset, GraphEdge, GraphNode, Project } from '../src/types';

useSettings.getState().set({ comfyUrl: process.env.COMFY_URL ?? 'http://127.0.0.1:8188' });

const text = (t: string) => ({ content: [{ type: 'text', text: t }] });
const fail = (t: string) => ({ isError: true, content: [{ type: 'text', text: t }] });

async function saveAssets(assets: Asset[], dir: string, stem: string): Promise<string[]> {
  fs.mkdirSync(dir, { recursive: true });
  const out: string[] = [];
  let i = 0;
  for (const a of assets) {
    if (a.type === 'text') continue;
    const ext = path.extname(a.file?.filename ?? '') || (a.type === 'video' ? '.mp4' : a.type === 'audio' ? '.flac' : '.png');
    const p = path.resolve(dir, `${stem}_${String(++i).padStart(2, '0')}${ext}`);
    fs.writeFileSync(p, Buffer.from(await (await fetchBlob(a)).arrayBuffer()));
    out.push(p);
  }
  return out;
}

const textPort = (nodeId: string) => byId.get(nodeId)?.inputs.find((i) => i.type === 'text')?.id ?? 'prompt';

async function generate(a: any) {
  const defId = String(a.node ?? 'image-generate');
  const def = byId.get(defId);
  if (!def || (def.kind !== 'generate' && def.kind !== 'llm')) throw new Error(`"${defId}" is not a generator node. Use canvers_list_nodes.`);
  const eng = engineFor(def, a.engine);
  const params = { ...defaultParams(def, eng?.id), ...(a.params ?? {}) };
  const nodes: GraphNode[] = [
    { id: 'target', defId, x: 0, y: 0, engineId: eng?.id, params, results: [], activeResult: 0 },
    { id: 'prompt', defId: 'prompt', x: 0, y: 0, params: { text: String(a.prompt ?? '') }, results: [], activeResult: 0 },
  ];
  const edges: GraphEdge[] = [{ id: 'e0', source: 'prompt', sourceHandle: 'text', target: 'target', targetHandle: textPort(defId) }];
  const imgPort = def.inputs.find((i) => i.type === 'image')?.id;
  for (const [i, f] of ((a.images as string[] | undefined) ?? []).entries()) {
    if (!imgPort) break;
    const { uploadToInput, assetFromFile } = await import('../src/backend/comfy');
    const blob = new Blob([fs.readFileSync(f)], { type: /\.jpe?g$/i.test(f) ? 'image/jpeg' : 'image/png' });
    nodes.push({ id: `ref${i}`, defId: 'import', x: 0, y: 0, params: {}, results: [assetFromFile(await uploadToInput(blob), 'image')], activeResult: 0 });
    edges.push({ id: `er${i}`, source: `ref${i}`, sourceHandle: 'image', target: 'target', targetHandle: imgPort });
  }
  let results: Asset[] = [];
  await executeGraph({ nodes, edges }, 'target', { done: (id, assets) => { if (id === 'target') results = assets; } });
  const files = await saveAssets(results, String(a.output_dir ?? process.cwd()), String(a.name ?? 'canvers'));
  return text(files.length ? `Saved:\n${files.join('\n')}` : results.map((r) => r.text).join('\n'));
}

async function runCanvas(a: any) {
  const p: Project = JSON.parse(fs.readFileSync(String(a.path), 'utf8'));
  const fed = new Set(p.edges.map((e) => e.source));
  const targets = a.node_id ? [String(a.node_id)] : p.nodes.filter((n) => byId.get(n.defId) && !fed.has(n.id) && ['generate', 'llm'].includes(byId.get(n.defId)!.kind)).map((n) => n.id);
  if (!targets.length) throw new Error('No generator/LLM node to run.');
  const lines: string[] = [];
  for (const t of targets) {
    let res: Asset[] = [];
    await executeGraph({ nodes: p.nodes, edges: p.edges }, t, { done: (id, assets) => { if (id === t) res = assets; } });
    const files = await saveAssets(res, String(a.output_dir ?? path.dirname(String(a.path))), `${path.basename(String(a.path), '.json')}_${t}`);
    lines.push(`${t}: ${files.join(', ') || res.map((r) => r.text).join(' ')}`);
  }
  return text(lines.join('\n'));
}

function buildCanvas(a: any) {
  const def = byId.get('image-generate')!; const eng = engineFor(def, a.engine)!;
  const items = (a.prompts as string[]) ?? [];
  const nodes: GraphNode[] = []; const edges: GraphEdge[] = [];
  items.forEach((prompt, i) => {
    const y = i * 420;
    nodes.push({ id: `p${i}`, defId: 'prompt', x: 0, y, w: 340, params: { text: prompt }, results: [], activeResult: 0 });
    nodes.push({ id: `g${i}`, defId: 'image-generate', x: 420, y, engineId: eng.id, params: defaultParams(def, eng.id), results: [], activeResult: 0 });
    edges.push({ id: `e${i}`, source: `p${i}`, sourceHandle: 'text', target: `g${i}`, targetHandle: 'prompt' });
  });
  const project: Project = { app: 'ai-one-studio-canvers', version: 1, id: `mcp${Date.now()}`, name: String(a.name ?? 'mcp canvas'), nodes, edges, updatedAt: new Date().toISOString() };
  const out = path.resolve(String(a.path ?? `${project.name.replace(/\W+/g, '_')}.canvers.json`));
  fs.writeFileSync(out, JSON.stringify(project, null, 1));
  return text(`Canvas written: ${out} (${items.length} prompt → generate pairs). Open it in the app, or run it with canvers_run_canvas.`);
}

const TOOLS = [
  { name: 'canvers_status', description: 'Check the ComfyUI + STUDIO_ONE connection.', inputSchema: { type: 'object', properties: {} },
    run: async () => { const s = await systemStats(); return text(`ComfyUI ${s.system?.comfyui_version} · ${s.devices?.[0]?.name ?? 'cpu'}`); } },
  { name: 'canvers_list_nodes', description: 'List node types and the engines of the generator nodes.', inputSchema: { type: 'object', properties: {} },
    run: async () => text(REGISTRY.map((d) => `${d.id} — ${d.title} [${d.kind}]${d.engines ? ' engines: ' + d.engines.map((e) => e.id).join(', ') : ''}`).join('\n')) },
  { name: 'canvers_generate', description: 'Run a generator node once (image, edit, video, music…) and save the result files. node: image-generate | image-edit | inpaint | outpaint | face-swap | remove-bg | upscale | video-generate | music-generate. engine: see canvers_list_nodes. params: node parameters, e.g. {"aspect":"16:9","steps":8}.',
    inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, node: { type: 'string' }, engine: { type: 'string' }, params: { type: 'object' }, images: { type: 'array', items: { type: 'string' }, description: 'local image file paths (references / source)' }, output_dir: { type: 'string' }, name: { type: 'string' } }, required: ['prompt'] }, run: generate },
  { name: 'canvers_llm', description: 'Ask the LLM configured in the app (Local GGUF / ComfyUI TextGenerate / OpenRouter / Connect Custom).',
    inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, system: { type: 'string' } }, required: ['prompt'] },
    run: async (a: any) => { await loadServerSettings(); return text(await runLlm({ system: String(a.system ?? 'You are a helpful assistant.'), prompt: String(a.prompt) })); } },
  { name: 'canvers_build_canvas', description: 'Write a .canvers.json canvas with one prompt → image-generate pair per prompt.',
    inputSchema: { type: 'object', properties: { prompts: { type: 'array', items: { type: 'string' } }, engine: { type: 'string' }, name: { type: 'string' }, path: { type: 'string' } }, required: ['prompts'] }, run: async (a: any) => buildCanvas(a) },
  { name: 'canvers_run_canvas', description: 'Run the generator nodes of a .canvers.json file headlessly and save the outputs (browser-only edit nodes are not supported here).',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, node_id: { type: 'string' }, output_dir: { type: 'string' } }, required: ['path'] }, run: runCanvas },
];

// ---- minimal MCP over stdio (newline-delimited JSON-RPC)
const send = (m: unknown) => process.stdout.write(JSON.stringify(m) + '\n');
async function handle(msg: any) {
  const { id, method, params } = msg;
  try {
    if (method === 'initialize') return send({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion ?? '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'ai-one-studio-canvers', version: '2.10.0' } } });
    if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools: TOOLS.map(({ run: _r, ...t }) => t) } });
    if (method === 'tools/call') {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return send({ jsonrpc: '2.0', id, result: fail(`unknown tool ${params?.name}`) });
      try { return send({ jsonrpc: '2.0', id, result: await tool.run(params?.arguments ?? {}) }); }
      catch (e) { return send({ jsonrpc: '2.0', id, result: fail((e as Error).message) }); }
    }
    if (method === 'ping') return send({ jsonrpc: '2.0', id, result: {} });
    if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } });
  } catch (e) { if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32603, message: (e as Error).message } }); }
}
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (line) void handle(JSON.parse(line)); } });
