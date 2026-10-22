import { styleCatalog } from './promptStyle';
// Dynamic option lists for `select` controls whose values come from the backend.
import { useEffect, useState } from 'react';
import { getJson } from './http';
import { objectInfo } from './comfy';
import { getModels, FAMILIES, type Family } from './studio';

const FALLBACK: Record<string, string[]> = {
  samplers: ['euler', 'euler_ancestral', 'res_multistep', 'er_sde', 'dpmpp_2m', 'dpmpp_sde', 'uni_pc'],
  schedulers: ['simple', 'normal', 'karras', 'beta', 'sgm_uniform'],
};

const memo = new Map<string, Promise<string[]>>();

async function load(source: string): Promise<string[]> {
  if (source === 'samplers' || source === 'schedulers') {
    const info = await objectInfo('KSampler');
    const req = info?.KSampler?.input?.required;
    return (source === 'samplers' ? req?.sampler_name?.[0] : req?.scheduler?.[0]) ?? FALLBACK[source];
  }
  if (source === 'loras:all') {
    const lists = await Promise.all([...Object.keys(FAMILIES).map((f) => getModels(f as Family).then((m) => m.loras ?? []).catch(() => [] as string[])), getJson<{ loras: string[] }>('/minimax_h3_one/models').then((l) => l.loras ?? []).catch(() => [] as string[])]);
    return ['none', ...new Set(lists.flat().filter((x) => x && x !== 'none'))];
  }
  if (source === 'h3unets') { const l = await getJson<{ diffusion_models?: string[] }>('/minimax_h3_one/models'); return ['none', ...(l.diffusion_models ?? []).filter((x) => x && x !== 'none')]; }
  if (source === 'seedvr2dit') { const i = await objectInfo('SeedVR2LoadDiTModel'); return ['none', ...(i?.SeedVR2LoadDiTModel?.input?.required?.model?.[0] ?? [])]; }
  if (source === 'seedvr2vae') { const i = await objectInfo('SeedVR2LoadVAEModel'); return ['none', ...(i?.SeedVR2LoadVAEModel?.input?.required?.model?.[0] ?? [])]; }
  if (source === 'preprocessors') { const i = await objectInfo('AIO_Preprocessor'); return i?.AIO_Preprocessor?.input?.required?.preprocessor?.[0] ?? ['DepthAnythingPreprocessor']; }
  if (source === 'promptformats') { const c = await styleCatalog(); return ['auto', ...c.formats]; }
  if (source === 'promptaesthetics') { return (await styleCatalog()).aesthetics; }
  if (source === 'modelpatches') { const i = await objectInfo('ModelPatchLoader'); return ['none', ...(i?.ModelPatchLoader?.input?.required?.name?.[0] ?? [])]; }
  if (source === 'bboxdetectors') { const i = await objectInfo('UltralyticsDetectorProvider'); return ['none', ...(i?.UltralyticsDetectorProvider?.input?.required?.model_name?.[0] ?? [])]; }
  if (source === 'facedetectors') {
    const l = await getJson<{ face_detectors?: string[] }>('/minimax_h3_one/models');
    return ['none', ...(l.face_detectors ?? []).filter((x) => x && x !== 'none')];
  }
  if (source.startsWith('loras:')) {
    const fam = source.slice(6) as string;
    if (fam === 'h3' || fam === 'ltx25') { const l = await getJson<{ loras: string[] }>('/minimax_h3_one/models'); return ['none', ...(l.loras ?? []).filter((x) => x && x !== 'none')]; }
    if (!(fam in FAMILIES)) return ['none'];
    const m = await getModels(fam as Family);
    return ['none', ...(m.loras ?? []).filter((x) => x && x !== 'none')];
  }
  if (source === 'bgmodels') {
    const r = await getJson<{ models: string[] }>(`${FAMILIES.klein.prefix}/bgremoval_models`);
    return r.models?.length ? r.models : ['birefnet.safetensors'];
  }
  if (source === 'upscalers') {
    const info = await objectInfo('UpscaleModelLoader');
    const list: string[] = info?.UpscaleModelLoader?.input?.required?.model_name?.[0] ?? [];
    return list.length ? list : ['none'];
  }
  return [];
}

export function loadOptions(source: string): Promise<string[]> {
  if (!memo.has(source)) memo.set(source, load(source).catch(() => { memo.delete(source); return FALLBACK[source] ?? []; }));
  return memo.get(source)!;
}
export const resetOptions = () => memo.clear();

/** options for a select control: static list, or fetched (with `fallback` shown meanwhile) */
export function useOptions(source: string | undefined, fallback: string[]): string[] {
  const [opts, setOpts] = useState<string[]>(source ? (FALLBACK[source] ?? fallback) : fallback);
  useEffect(() => {
    if (!source) { setOpts(fallback); return; }
    let live = true;
    void loadOptions(source).then((o) => { if (live && o.length) setOpts(o); });
    return () => { live = false; };
  }, [source]);
  return opts;
}
