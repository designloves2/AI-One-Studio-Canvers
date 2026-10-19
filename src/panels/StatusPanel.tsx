import { useEffect, useState } from 'react';
import { getJson } from '../backend/http';
import { objectInfo, systemStats } from '../backend/comfy';
import { FAMILIES, getModels, pickModels, type Family } from '../backend/studio';
import { fetchCatalog } from '../backend/llm';
import { useT } from '../i18n';
import { CATALOG } from '../backend/catalog';

interface Check { label: string; ok: boolean | null; detail?: string; hint?: string }

/** Is everything the canvas needs actually present on the ComfyUI side? */
function Downloads() {
  const T = useT();
  const [cap, setCap] = useState<boolean | null>(null);
  const [installed, setInstalled] = useState<Record<string, string[]>>({});
  const [jobs, setJobs] = useState<Record<string, { pct: number; done?: boolean; error?: string }>>({});
  const refresh = async () => {
    try {
      const c = await getJson<{ download: boolean }>('/__canvers/capabilities'); setCap(c.download);
      if (c.download) { setInstalled(await getJson('/__canvers/installed')); setJobs(await getJson('/__canvers/downloads')); }
    } catch { setCap(false); }
  };
  useEffect(() => { void refresh(); const i = setInterval(() => { void refresh(); }, 2500); return () => clearInterval(i); }, []);
  const has = (folder: string, file: string) => (installed[folder] ?? []).some((x) => x === file || x.endsWith('/' + file) || x.endsWith('\\' + file));
  const get = async (folder: string, file: string, url: string) => {
    try { await fetch('/__canvers/download', { method: 'POST', body: JSON.stringify({ folder, file, url }) }); } catch { /* shown via jobs */ }
    void refresh();
  };
  return (
    <div className="dl-section">
      <div className="panel-row"><b>{T('Model downloads')}</b></div>
      {cap === false && <p className="muted">{T('Start the server with COMFY_DIR=<ComfyUI folder> to download here. Links below open in your browser.')}</p>}
      {CATALOG.map((g) => (
        <div key={g.id} className="dl-group">
          <h4>{g.label}</h4>
          {g.note && <small className="muted">{g.note}</small>}
          {g.files.map((f) => {
            const j = jobs[`${f.folder}/${f.file}`]; const ok = has(f.folder, f.file) || j?.done;
            return (
              <div key={f.file} className="dl-file">
                <span className={ok ? 'ok' : ''}>{ok ? '●' : '○'}</span>
                <div><b title={f.url}>{f.file}</b><small>models/{f.folder}</small>
                  {j && !j.done && !j.error && <div className="bar"><b style={{ width: `${Math.max(3, j.pct)}%` }} /><em>{j.pct}%</em></div>}
                  {j?.error && <small className="bad">{j.error}</small>}</div>
                {!ok && (cap ? <button className="btn" disabled={!!j && !j.done && !j.error} onClick={() => void get(f.folder, f.file, f.url)}>⭳</button> : <a className="btn" href={f.url} target="_blank" rel="noreferrer">↗</a>)}
              </div>
            );
          })}
        </div>
      ))}
      <Downloads />
    </div>
  );
}

export function StatusPanel() {
  const T = useT();
  const [checks, setChecks] = useState<Check[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true); const out: Check[] = [];
    const add = (c: Check) => { out.push(c); setChecks([...out]); };
    try {
      const s = await systemStats();
      add({ label: 'ComfyUI', ok: true, detail: `${s.system?.comfyui_version ?? ''} · ${s.devices?.[0]?.name ?? 'cpu'}` });
    } catch (e) { add({ label: 'ComfyUI', ok: false, detail: (e as Error).message, hint: 'Start ComfyUI and check Settings → server address.' }); setBusy(false); return; }

    for (const f of Object.keys(FAMILIES) as Family[]) {
      try {
        await getJson(`${FAMILIES[f].prefix}/config`);
        const m = await pickModels(f);
        const l = await getModels(f);
        add({ label: `STUDIO_ONE · ${FAMILIES[f].label}`, ok: !!m.model, detail: m.model ? `${m.model} · TE ${m.textEncoder || '—'} · VAE ${m.vae || '—'} · ${(l.loras ?? []).filter((x) => x !== 'none').length} LoRA` : 'no diffusion model found', hint: m.model ? undefined : `Put the ${FAMILIES[f].label} files in ComfyUI/models.` });
      } catch (e) { add({ label: `STUDIO_ONE · ${FAMILIES[f].label}`, ok: false, detail: (e as Error).message, hint: 'Install ComfyUI-TJ_NODE_STUDIO_ONE and restart ComfyUI.' }); }
    }

    const needs: [string, string][] = [
      ['UnetLoaderGGUF', 'GGUF diffusion models (ComfyUI-GGUF)'], ['InpaintCropImproved', 'Inpaint crop/stitch (Klein/Z-Image inpaint)'],
      ['ImagePadKJ', 'Klein outpaint (ComfyUI-KJNodes)'], ['LoadBackgroundRemovalModel', 'Remove Background'], ['UpscaleModelLoader', 'Upscale'],
    ];
    for (const [cls, why] of needs) {
      try { const i = await objectInfo(cls); add({ label: cls, ok: !!i?.[cls], detail: why }); } catch { add({ label: cls, ok: false, detail: why }); }
    }
    try {
      const c = await fetchCatalog();
      add({ label: 'LLM · Local GGUF', ok: !!c.local_available, detail: c.local_available ? `${c.gguf.length} gguf` : c.error ?? 'ComfyUI-TJ_NODE not installed' });
      add({ label: 'LLM · ComfyUI TextGenerate', ok: c.text_encoders.length > 0, detail: `${c.text_encoders.length} text encoders` });
      add({ label: 'LLM · OpenRouter', ok: !!c.openrouter_key_set, detail: c.openrouter_key_set ? c.openrouter_key_hint : 'no key stored' });
    } catch (e) { add({ label: 'LLM routes', ok: false, detail: (e as Error).message }); }
    setBusy(false);
  };
  useEffect(() => { void run(); }, []);

  return (
    <div className="panel-body">
      <div className="panel-row"><b>{T('Models')}</b><span className="spacer" /><button className="btn" disabled={busy} onClick={() => void run()}>↻</button></div>
      {checks.map((c, i) => (
        <div key={i} className={`check ${c.ok ? 'ok' : c.ok === false ? 'bad' : ''}`}>
          <i>{c.ok ? '●' : '○'}</i><div><b>{c.label}</b><small>{c.detail}</small>{c.hint && !c.ok && <small className="hint">{c.hint}</small>}</div>
        </div>
      ))}
    </div>
  );
}
