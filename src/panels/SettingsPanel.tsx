import { useEffect, useState } from 'react';
import { useSettings, type LlmBackend } from '../store/settings';
import { useLang } from '../i18n';
import { BACKENDS, connectCustom, fetchCatalog, loadServerSettings, runLlm, saveOpenRouter, saveServerSettings, type LlmCatalog } from '../backend/llm';
import { systemStats } from '../backend/comfy';
import { FAMILIES, clearStudioCache, getModels, pickModels, type Family, type ModelLists } from '../backend/studio';
import { resetOptions } from '../backend/options';
import { useT } from '../i18n';

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="srow"><span>{label}</span><div>{children}</div>{hint && <small>{hint}</small>}</label>;
}

function Select({ value, onChange, options, blank }: { value: string; onChange(v: string): void; options: string[]; blank?: string }) {
  const list = [...(blank !== undefined ? [''] : []), ...options.filter((o) => o && o !== 'none')];
  const withCur = value && !list.includes(value) ? [value, ...list] : list;
  return <select value={value} onChange={(e) => onChange(e.target.value)}>{withCur.map((o) => <option key={o} value={o}>{o === '' ? blank : o}</option>)}</select>;
}

// ------------------------------------------------------------------ connection
function Connection() {
  const T = useT();
  const url = useSettings((s) => s.comfyUrl);
  const set = useSettings((s) => s.set);
  const [draft, setDraft] = useState(url);
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const test = async () => {
    set({ comfyUrl: draft.trim() });
    clearStudioCache(); resetOptions();
    setState({ ok: false, text: '…' });
    try {
      const s = await systemStats();
      const gpu = s?.devices?.[0]?.name ?? '';
      setState({ ok: true, text: `ComfyUI ${s?.system?.comfyui_version ?? ''} ${gpu}`.trim() });
    } catch (e) { setState({ ok: false, text: (e as Error).message }); }
  };
  useEffect(() => { void test(); }, []);
  return (
    <section>
      <h3>{T('ComfyUI connection')}</h3>
      <Row label={T('Server address')} hint={T('Leave empty to use the built-in proxy (recommended).')}>
        <input value={draft} placeholder="http://127.0.0.1:8188" onChange={(e) => setDraft(e.target.value)} />
        <button className="btn" onClick={() => void test()}>{T('Test')}</button>
      </Row>
      {state && <p className={`status ${state.ok ? 'ok' : 'bad'}`}>{state.ok ? `● ${T('Connected')} — ${state.text}` : `○ ${T('Not connected')} ${state.text}`}</p>}
      <Row label={T('Language')}>
        <select value={useLang.getState().lang} onChange={(e) => useLang.getState().setLang(e.target.value as 'ko' | 'en')}>
          <option value="ko">한국어</option><option value="en">English</option>
        </select>
      </Row>
    </section>
  );
}

// ------------------------------------------------------------------ image models
function ImageModels() {
  const T = useT();
  const models = useSettings((s) => s.models);
  const setModel = useSettings((s) => s.setModel);
  const save = useSettings((s) => s.saveSubfolder);
  const hostPanels = useSettings((s) => s.hostPanels);
  const set = useSettings((s) => s.set);
  const [lists, setLists] = useState<Partial<Record<Family, ModelLists>>>({});
  const [auto, setAuto] = useState<Partial<Record<Family, string>>>({});
  useEffect(() => {
    (Object.keys(FAMILIES) as Family[]).forEach((f) => {
      void getModels(f).then((l) => setLists((p) => ({ ...p, [f]: l }))).catch(() => undefined);
      void pickModels(f).then((m) => setAuto((p) => ({ ...p, [f]: m.model }))).catch(() => undefined);
    });
  }, []);
  return (
    <section>
      <h3>{T('Image models')}</h3>
      {(Object.keys(FAMILIES) as Family[]).map((f) => {
        const l = lists[f]; const cur = models[f] ?? { model: '', textEncoder: '', vae: '' };
        return (
          <div key={f} className="fam">
            <h4>{FAMILIES[f].label}</h4>
            <Row label={f === 'sdxl' ? 'Checkpoint' : 'Diffusion model'}><Select value={cur.model} onChange={(v) => setModel(f, { model: v })} options={(f === 'sdxl' ? l?.checkpoints : l?.diffusion_models) ?? []} blank={`(auto${auto[f] ? ': ' + auto[f] : ''})`} /></Row>
            {f !== 'sdxl' && <Row label={T('Text encoder')}><Select value={cur.textEncoder} onChange={(v) => setModel(f, { textEncoder: v })} options={l?.text_encoders ?? []} blank="(auto)" /></Row>}
            {f !== 'sdxl' && <Row label="VAE"><Select value={cur.vae} onChange={(v) => setModel(f, { vae: v })} options={l?.vaes ?? []} blank="(auto)" /></Row>}
          </div>
        );
      })}
      <Row label={T('Legacy: load original STUDIO_ONE panels')} hint={T('Adds the old all-in-one panels as extra nodes (reload needed). Off = card nodes only.')}><input type="checkbox" checked={hostPanels} onChange={(e) => set({ hostPanels: e.target.checked })} /></Row>
      <Row label={T('Output folder')} hint="ComfyUI/output/<folder>"><input value={save} onChange={(e) => set({ saveSubfolder: e.target.value.replace(/[^\w\-/]+/g, '_') })} /></Row>
    </section>
  );
}

// ------------------------------------------------------------------ LLM (the four TJ backends)
function Llm() {
  const T = useT();
  const llm = useSettings((s) => s.llm);
  const keys = useSettings((s) => s.keys);
  const setLlm = useSettings((s) => s.setLlm);
  const setKey = useSettings((s) => s.setKey);
  const [cat, setCat] = useState<LlmCatalog | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void loadServerSettings(); void fetchCatalog().then(setCat).catch((e) => setCat({ ok: false, error: e.message, gguf: [], mmproj: [], text_encoders: [], clip_loader_types: ['Auto'] })); }, []);

  const wrap = async (fn: () => Promise<string>) => {
    setBusy(true); setMsg(null);
    try { setMsg({ ok: true, text: await fn() }); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };

  const connect = () => wrap(async () => {
    const r = await connectCustom('img_enhance'); await connectCustom('img_i2p');
    if (!r.ok) throw new Error(r.error || 'failed');
    setModels(r.models ?? []);
    const found = r.modelFound === false ? ' — model id not in the list' : '';
    return `${T('Connected')} · ${r.ms} ms · ${r.models?.length ?? 0} models${found}${r.keyStored ? ' · ' + T('Key stored on server') : ''}`;
  });
  const saveOR = () => wrap(async () => {
    const r = await saveOpenRouter(keys.openrouter || undefined); setKey('openrouter', '');
    setCat((c) => (c ? { ...c, openrouter_key_set: r.openrouter_key_set, openrouter_key_hint: r.openrouter_key_hint } : c));
    return r.openrouter_key_set ? `OpenRouter key set (${r.openrouter_key_hint})` : 'No OpenRouter key stored';
  });
  const test = () => wrap(async () => {
    if (llm.backend === 'openrouter') await saveOpenRouter(keys.openrouter || undefined);
    const t0 = performance.now();
    const out = await runLlm({ system: 'Reply with the single word OK.', prompt: 'ping', max_tokens: 20 });
    return `“${out.slice(0, 60)}” · ${Math.round(performance.now() - t0)} ms`;
  });
  const saveAll = () => wrap(async () => { await saveServerSettings(); if (llm.backend === 'openrouter') await saveOpenRouter(keys.openrouter || undefined); return T('Saved'); });

  return (
    <section>
      <h3>{T('LLM backend')}</h3>
      <div className="backends">
        {BACKENDS.map((b) => (
          <button key={b.id} className={`bk ${llm.backend === b.id ? 'on' : ''}`} onClick={() => setLlm({ backend: b.id as LlmBackend })} title={b.hint}>
            <b>{T(b.label)}</b><small>{b.hint}</small>
          </button>
        ))}
      </div>

      {llm.backend === 'local' && <>
        {cat && cat.local_available === false && <p className="status bad">ComfyUI-TJ_NODE (llama-cpp) {cat.error ? `— ${cat.error}` : 'not available'}</p>}
        <Row label={T('GGUF model')}><Select value={llm.gguf_model} onChange={(v) => setLlm({ gguf_model: v })} options={cat?.gguf ?? []} blank="(choose)" /></Row>
        <Row label={T('Vision projector (mmproj)')}><Select value={llm.mmproj_file} onChange={(v) => setLlm({ mmproj_file: v })} options={['none', ...(cat?.mmproj ?? [])]} /></Row>
        <Row label={T('Context size')}><input type="number" value={llm.n_ctx} step={512} onChange={(e) => setLlm({ n_ctx: +e.target.value })} /></Row>
        <Row label="GPU layers (−1 = all)"><input type="number" value={llm.n_gpu_layers} onChange={(e) => setLlm({ n_gpu_layers: +e.target.value })} /></Row>
      </>}

      {llm.backend === 'comfy' && <>
        <Row label={T('Text encoder')}><Select value={llm.text_encoder_name} onChange={(v) => setLlm({ text_encoder_name: v })} options={cat?.text_encoders ?? []} blank="(choose)" /></Row>
        <Row label={T('Loader type')}><Select value={llm.clip_loader_type} onChange={(v) => setLlm({ clip_loader_type: v })} options={cat?.clip_loader_types?.length ? cat.clip_loader_types : ['Auto']} /></Row>
      </>}

      {llm.backend === 'openrouter' && <>
        <Row label={T('API key')} hint={cat?.openrouter_key_set ? `✔ ${cat.openrouter_key_hint}` : undefined}>
          <input type="password" autoComplete="off" placeholder={cat?.openrouter_key_set ? '•••••• (stored)' : 'sk-or-…'} value={keys.openrouter} onChange={(e) => setKey('openrouter', e.target.value)} />
          <button className="btn" disabled={busy} onClick={() => void saveOR()}>{T('Save')}</button>
        </Row>
        <Row label={T('Text model')}><input list="or-models" value={llm.or_model_text} onChange={(e) => setLlm({ or_model_text: e.target.value })} /></Row>
        <Row label={T('Vision model')}><input list="or-models" value={llm.or_model_vision} onChange={(e) => setLlm({ or_model_vision: e.target.value })} /></Row>
        <datalist id="or-models">{['google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'anthropic/claude-sonnet-4.5', 'openai/gpt-4o-mini', 'qwen/qwen2.5-vl-72b-instruct', 'meta-llama/llama-3.3-70b-instruct'].map((m) => <option key={m} value={m} />)}</datalist>
      </>}

      {llm.backend === 'custom' && <>
        <Row label={T('Base URL')} hint="http://localhost:3000/v1 · LM Studio :1234/v1 · Ollama :11434/v1"><input value={llm.custom_base} onChange={(e) => setLlm({ custom_base: e.target.value })} /></Row>
        <Row label={T('API key')} hint={T('Key is kept in server memory only.')}><input type="password" autoComplete="off" placeholder="(optional)" value={keys.custom} onChange={(e) => setKey('custom', e.target.value)} /></Row>
        <Row label={T('Model')}><input list="custom-models" value={llm.custom_model} onChange={(e) => setLlm({ custom_model: e.target.value })} /><datalist id="custom-models">{models.map((m) => <option key={m} value={m} />)}</datalist></Row>
        <Row label={T('Context size')} hint="0 = unknown"><input type="number" value={llm.custom_ctx} step={1024} onChange={(e) => setLlm({ custom_ctx: +e.target.value })} /></Row>
        <Row label=""><button className="btn" disabled={busy} onClick={() => void connect()}>{T('Connect & test')}</button></Row>
      </>}

      <Row label={T('Temperature')}><input type="number" step={0.05} min={0} max={2} value={llm.temperature} onChange={(e) => setLlm({ temperature: +e.target.value })} /></Row>
      <Row label={T('Max tokens')}><input type="number" step={50} min={50} max={8192} value={llm.max_tokens} onChange={(e) => setLlm({ max_tokens: +e.target.value })} /></Row>

      <div className="srow-actions">
        <button className="btn" disabled={busy} onClick={() => void test()}>{T('Test')}</button>
        <button className="btn primary" disabled={busy} onClick={() => void saveAll()}>{T('Save LLM settings')}</button>
      </div>
      {msg && <p className={`status ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</p>}
    </section>
  );
}

function MusicModels() {
  const T = useT();
  const music = useSettings((s) => s.music);
  const setMusic = useSettings((s) => s.setMusic);
  const [lists, setLists] = useState<{ diffusion_models: string[]; text_encoders: string[]; vaes: string[]; checkpoints?: string[] } | null>(null);
  const [auto, setAuto] = useState<Record<string, string | number>>({});
  useEffect(() => {
    void import('../backend/music').then(async (m) => { try { setLists((await m.musicBackend()).models); setAuto(await m.resolveMusicModels({})); } catch { /* backend without MusicMaker */ } });
  }, []);
  const rows: [string, string, string[] | undefined][] = [
    ['ace_unet', 'Ace-Step diffusion', lists?.diffusion_models], ['ace_clip1', 'Ace-Step CLIP 1', lists?.text_encoders], ['ace_clip2', 'Ace-Step CLIP 2', lists?.text_encoders], ['ace_vae', 'Ace-Step VAE', lists?.vaes],
    ['yue2_ckpt', 'YuE2 checkpoint', lists?.checkpoints], ['dit', 'MiniMax Music DiT', lists?.diffusion_models], ['clip', 'MiniMax Music encoder', lists?.text_encoders], ['dav', 'MiniMax Music audio VAE', lists?.vaes],
  ];
  return (
    <section>
      <h3>{T('Music models')}</h3>
      {rows.map(([k, label, opts]) => <Row key={k} label={label}><Select value={music[k] ?? ''} onChange={(v) => setMusic(k, v)} options={opts ?? []} blank={`(auto${auto[k] ? ': ' + auto[k] : ''})`} /></Row>)}
    </section>
  );
}

function VideoModels() {
  const T = useT();
  const video = useSettings((s) => s.video);
  const setVideo = useSettings((s) => s.setVideo);
  const [lists, setLists] = useState<Awaited<ReturnType<typeof import('../backend/ltx').ltxModelLists>> | null>(null);
  const [auto, setAuto] = useState<Record<string, string>>({});
  useEffect(() => {
    void import('../backend/ltx').then(async (m) => { try { setLists(await m.ltxModelLists()); const a = await m.resolveLtxModels({}); const h = await (await import('../backend/h3')).resolveH3Models({}, 't2v'); const hr = await (await import('../backend/h3')).resolveH3Models({}, 'reference'); setAuto({ ltx_unet: a.unet, ltx_clip: a.clip, ltx_vae_video: a.vaeVideo, ltx_vae_audio: a.vaeAudio, ltx_upscaler: a.upscaler, h3_unet_fl: h.unet, h3_unet_ref: hr.unet, h3_clip: h.clip, h3_vae_video: h.vaeVideo, h3_vae_audio: h.vaeAudio }); } catch { /* no LTX routes */ } });
  }, []);
  const rows: [string, string, string[] | undefined][] = [
    ['ltx_unet', 'LTX diffusion', lists?.diffusion_models], ['ltx_clip', 'LTX text encoder', lists?.text_encoders_all ?? lists?.text_encoders], ['ltx_vae_video', 'LTX video VAE', lists?.vaes],
    ['ltx_vae_audio', 'LTX audio VAE', lists?.vaes], ['ltx_upscaler', 'LTX latent upscaler', lists?.latent_upscale_models],
    ['h3_unet_fl', 'H3 first/last diffusion', lists?.diffusion_models], ['h3_unet_ref', 'H3 reference diffusion', lists?.diffusion_models], ['h3_clip', 'H3 text encoder', lists?.text_encoders_all ?? lists?.text_encoders],
    ['h3_vae_video', 'H3 video VAE', lists?.vaes], ['h3_vae_audio', 'H3 audio VAE', lists?.vaes],
  ];
  return (
    <section>
      <h3>{T('Video models')}</h3>
      {rows.map(([k, label, opts]) => <Row key={k} label={label}><Select value={video[k] ?? ''} onChange={(v) => setVideo(k, v)} options={opts ?? []} blank={`(auto${auto[k] ? ': ' + auto[k] : ''})`} /></Row>)}
    </section>
  );
}

export function SettingsPanel() {
  return <div className="panel-body settings"><Connection /><Llm /><ImageModels /><VideoModels /><MusicModels /></div>;
}
