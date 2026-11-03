import { useGraph } from '../store/graph';
import { useT } from '../i18n';
import { openDirectorOfCanvas } from './pairing';

/** Canvas side of a Director <-> canvas pair: which Director project (and episode) this canvas belongs to, with a button to open it. */
export function PairBar() {
  const T = useT();
  const pair = useGraph((s) => s.directorPair);
  const has = useGraph((s) => s.nodes.length > 0);
  if (!pair) return has ? <div className="pairbar free" title={T('This canvas has no Director project. A new Director project replaces it with a new canvas made for the Director (you are asked to save first).')}>{T('No Director project')}</div> : null;
  const what = pair.purpose === 'casting' ? ` · ${T('Casting')}` : pair.purpose === 'music' ? ` · ${T('Song')}` : pair.no ? ` · ${T('Episode')} ${pair.no}` : '';
  return (
    <div className="pairbar" title={pair.file}>
      <span>🎬 {T('Director')}: <b>{pair.name}</b>{what}</span>
      <button className="btn" onClick={() => void openDirectorOfCanvas()}>{T('Open in Director')}</button>
    </div>
  );
}
