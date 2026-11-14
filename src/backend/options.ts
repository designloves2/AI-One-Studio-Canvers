import { styleCatalog } from './promptStyle';
// Dynamic option lists for `select` controls whose values come from the backend.
import { useEffect, useState } from 'react';
import { getJson } from './http';
import { objectInfo } from './comfy';
import { getModels, FAMILIES, type Family } from './studio';

// shown until ComfyUI own list arrives (and kept if it cannot): the complete KSampler lists, not a short selection
const FALLBACK: Record<string, string[]> = {
  samplers: ['euler', 'euler_cfg_pp', 'euler_ancestral', 'euler_ancestral_cfg_pp', 'heun', 'heunpp2', 'exp_heun_2_x0', 'exp_heun_2_x0_sde', 'dpm_2', 'dpm_2_ancestral', 'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_2s_ancestral_cfg_pp', 'dpmpp_sde', 'dpmpp_sde_gpu', 'dpmpp_2m', 'dpmpp_2m_cfg_pp', 'dpmpp_2m_sde', 'dpmpp_2m_sde_gpu', 'dpmpp_2m_sde_heun', 'dpmpp_2m_sde_heun_gpu', 'dpmpp_3m_sde', 'dpmpp_3m_sde_gpu', 'ddpm', 'lcm', 'ipndm', 'ipndm_v', 'deis', 'cfgpp_ud10_ab', 'res_multistep', 'res_multistep_cfg_pp', 'res_multistep_ancestral', 'res_multistep_ancestral_cfg_pp', 'gradient_estimation', 'gradient_estimation_cfg_pp', 'er_sde', 'seeds_2', 'seeds_3', 'sa_solver', 'sa_solver_pece', 'ddim', 'uni_pc', 'uni_pc_bh2', 'legacy_rk', 'rk', 'rk_beta', 'deis_3m_ode', 'deis_2m_ode', 'deis_3m', 'deis_2m', 'res_6s_ode', 'res_5s_ode', 'res_3s_ode', 'res_2s_ode', 'res_3m_ode', 'res_2m_ode', 'res_6s', 'res_5s', 'res_3s', 'res_2s', 'res_3m', 'res_2m', 'jkass_fast', 'jkass_quality'],
  schedulers: ['simple', 'sgm_uniform', 'karras', 'exponential', 'ddim_uniform', 'beta', 'normal', 'linear_quadratic', 'kl_optimal', 'beta57', 'bong_tangent'],
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
  if (source === 'recavsr') { const l = await getJson<{ recavsr_models?: string[] }>('/minimax_h3_one/models'); return ['none', ...(l.recavsr_models ?? []).filter((x) => /transformer/i.test(x))]; }   // models/recavsr: only the transformer files
  if (source === 'relayvsr_unets') { const l = await getJson<{ diffusion_models?: string[] }>('/minimax_h3_one/models'); return ['none', ...(l.diffusion_models ?? []).filter((x) => /relayvsr/i.test(x))]; }
  if (source === 'relayvsr_vaes') { const l = await getJson<{ vaes?: string[] }>('/minimax_h3_one/models'); return ['none', ...(l.vaes ?? []).filter((x) => /relayvsr/i.test(x))]; }
  if (source === 'vaes') { const l = await getJson<{ vaes?: string[] }>('/minimax_h3_one/models'); return ['none', ...(l.vaes ?? []).filter((x) => x && x !== 'none')]; }
  if (source === 'tinyvaes') { const i = await objectInfo('ModelPreviewOverrideKJ'); return i?.ModelPreviewOverrideKJ?.input?.optional?.tiny_vae?.[1]?.options ?? ['none']; }
  if (source === 'tinyvaes+auto') return ['auto', ...(await loadOptions('tinyvaes'))];
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
