// The real registry seen through the small interface the adapter needs (kept apart so adapter.ts stays testable without the app).
import { byId, compatible, defaultParams, engineFor, paramsFor } from '../registry';
import type { RegistryLike, RegDef } from './adapter';

export const appRegistry: RegistryLike = {
  compatible,
  get(defId): RegDef | undefined {
    const d = byId.get(defId);
    if (!d || d.planned) return undefined;
    const eng = engineFor(d);
    const params: RegDef['params'] = {};
    for (const q of paramsFor(d, eng?.id)) {
      const c = q.control;
      if (c.kind === 'select') params[q.id] = { options: c.options };
      else if (c.kind === 'slider' || c.kind === 'number') params[q.id] = { min: c.min, max: c.max };
      else params[q.id] = {};
    }
    return {
      id: d.id,
      inputs: d.inputs.map((i) => ({ id: i.id, type: i.type, optional: i.optional, multi: i.multi })),
      outputs: d.outputs.map((o) => ({ id: o.id, type: o.type })),
      engineId: eng?.id, engines: d.engines?.map((e) => e.id), params, defaults: defaultParams(d, eng?.id),
    };
  },
};
