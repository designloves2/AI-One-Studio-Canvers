import { useGraph } from '../store/graph';
import { useDirector } from '../store/director';
import { useT } from '../i18n';
import { applyCardToDirector, promptCardState } from './pairing';

/** On a clip's Prompt card of a Director-paired canvas: shown when the card text differs from the Director's prompt; one press puts the card text into the Director. */
export function PairApply({ id }: { id: string }) {
  const T = useT();
  useGraph((s) => s.nodes.find((n) => n.id === id)?.params.text);   // re-render when the card text changes
  useDirector((s) => s.project);                                     // ... or when the Director's prompt does
  const st = promptCardState(id);
  if (!st?.differs) return null;
  return (
    <div className="pair-apply nodrag"><span>{T('Different from the Director')}</span>
      <button className="btn small primary" onClick={() => applyCardToDirector(id)}>{T('Apply to the Director')}</button></div>
  );
}
