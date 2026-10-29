import { useEffect } from 'react';
import { useDirector } from '../store/director';
import { useT } from '../i18n';
import { askConfirm, notify } from '../ui/dialog';

/** Side menu of the Director mode: the saved Director projects. Only shown in Director mode (the rail item is hidden elsewhere). */
export function DirectorPanel() {
  const T = useT();
  const d = useDirector();
  useEffect(() => { void d.refreshList(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const guard = (f: () => Promise<unknown>) => () => { f().catch((e) => void notify((e as Error).message)); };
  const open = async (name: string) => {
    if (d.busy) { void notify(T('The crew is working. Wait until it is done.')); return; }
    if (d.dirty && d.project && !d.file && !(await askConfirm(T('This project has unsaved changes. Continue?')))) return;
    await d.open(name);
  };
  return (
    <div className="dirp">
      <button className="btn primary" disabled={d.busy} onClick={() => d.close()}>＋ {T('New project')}</button>
      <p className="dir-muted">{T('Start a new project by writing in the chat. To continue an earlier one, name it: "…1편에 이어서 2편을 만들자".')}</p>
      {d.list.length === 0 && <p className="dir-muted">{T('No Director projects yet.')}</p>}
      {d.list.map((e) => (
        <div key={e.name} className={`dir-proj${d.file === e.name ? ' on' : ''}`}>
          <button onClick={guard(() => open(e.name))}><b>{e.name}</b><small>{e.scenes} {T('scenes')} · {e.shots} {T('clips')}</small></button>
          <button className="dir-x" title={T('Delete')} onClick={guard(async () => { if (await askConfirm(`${e.name} — ${T('Delete')}?`)) await d.remove(e.name); })}>✕</button>
        </div>
      ))}
    </div>
  );
}
