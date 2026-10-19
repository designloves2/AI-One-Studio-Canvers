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
  if (source.startsWith('loras:')) {
    const fam = source.slice(6) as Family;
    if (!FAMILIES[fam]) return ['none'];
    const m = await getModels(fam);
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
