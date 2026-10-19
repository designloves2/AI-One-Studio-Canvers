import { useEffect, useState } from 'react';
import { getJson } from '../backend/http';
import { objectInfo, systemStats } from '../backend/comfy';
import { FAMILIES, getModels, pickModels, type Family } from '../backend/studio';
import { fetchCatalog } from '../backend/llm';
import { useT } from '../i18n';

interface Check { label: string; ok: boolean | null; detail?: string; hint?: string }

/** Is everything the canvas needs actually present on the ComfyUI side? */
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
