import { useEffect, useMemo, useRef, useState } from 'react';
import { useGraph } from '../store/graph';
import { useUpstream } from './helpers';
import { useT } from '../i18n';
import { deleteAsset, libThumb, listAssets, listProjects, registerAsset, type LibAsset, type LibProject } from '../backend/assetlib';
import { scanFaces, type FaceShot } from '../backend/faceRefine';
import { ensureInput } from '../backend/comfy';
import { byId } from '../registry';

/** Asset Library: choose characters / places / props (or a whole project) for the Asset Library card. */
export function AssetPicker() {
  const T = useT();
  const id = useGraph((s) => s.assetPicker);
  const node = useGraph((s) => s.nodes.find((n) => n.id === s.assetPicker));
  const [assets, setAssets] = useState<LibAsset[]>([]);
  const [projects, setProjects] = useState<LibProject[]>([]);
  const [q, setQ] = useState(''); const [cat, setCat] = useState('');
  const [sel, setSel] = useState<string[]>([]); const [project, setProject] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const [newCat, setNewCat] = useState('character');
  const close = () => useGraph.getState().openAssetPicker(null);
  const load = async () => { try { setAssets(await listAssets()); setProjects(await listProjects()); setErr(''); } catch (e) { setErr(`${(e as Error).message} — is ComfyUI-TJ_NODE installed?`); } };
  useEffect(() => { if (id) { void load(); setSel(String(node?.params.ids ?? '').split(/[,\s]+/).filter(Boolean)); setProject(String(node?.params.project ?? '')); } }, [id]);
  const cats = useMemo(() => [...new Set(assets.map((a) => a.category))], [assets]);
  const shown = assets.filter((a) => (!cat || a.category === cat) && (!q || a.name.toLowerCase().includes(q.toLowerCase())));
  if (!id || !node) return null;
  const toggle = (a: LibAsset) => { setProject(''); setSel((s) => (s.includes(String(a.id)) ? s.filter((x) => x !== String(a.id)) : [...s, String(a.id)])); };
  const apply = () => { const g = useGraph.getState(); g.setParam(id, 'project', project); g.setParam(id, 'ids', project ? '' : sel.join(',')); g.clearResults(id); close(); };
  const upload = async (files: FileList | null) => {
    if (!files) return; setBusy(true);
    try { for (const f of [...files]) await registerAsset(f, newCat); await load(); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="viewer assetlib" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="viewer-bar">
        <span>{T('Asset Library')}</span>
        <input placeholder={T('Search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">{T('All categories')}</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={project} onChange={(e) => { setProject(e.target.value); if (e.target.value) setSel([]); }}><option value="">{T('— pick assets below —')}</option>{projects.map((p) => <option key={p.id} value={p.id}>{T('Project')}: {p.name}</option>)}</select>
        <span className="spacer" />
        <input ref={file} type="file" multiple hidden accept="image/*,video/*,audio/*" onChange={(e) => { void upload(e.target.files); e.target.value = ''; }} />
        <input className="narrow" value={newCat} onChange={(e) => setNewCat(e.target.value)} title={T('Category for new assets')} />
        <button className="btn" disabled={busy} onClick={() => file.current?.click()}>{T('Register files…')}</button>
        <button className="btn primary" onClick={apply}>{T('Use')} ({project ? T('project') : sel.length})</button>
        <button onClick={close}>✕</button>
      </div>
      {err && <div className="error" style={{ margin: 12 }}>{err}</div>}
      <div className="asset-grid">
        {shown.map((a) => (
          <div key={a.id} className={`asset-tile ${sel.includes(String(a.id)) ? 'on' : ''}`} onClick={() => toggle(a)} title={`@${a.name}`}>
            <img src={libThumb(a.id)} alt="" loading="lazy" />
            <b>{a.name}</b><small>{a.kind} · {a.category}</small>
            <button className="mini" onClick={(e) => { e.stopPropagation(); if (confirm(`${T('Delete')} ${a.name}?`)) void deleteAsset(a.id).then(load).catch((x) => setErr(String(x))); }}>✕</button>
          </div>
        ))}
        {!shown.length && !err && <div className="empty">{T('No assets yet — register some files.')}</div>}
      </div>
    </div>
  );
}

/** Face Refine "Pick faces": scan the connected video, then click the face(s) to refine. */
export function FacePicker() {
  const T = useT();
  const id = useGraph((s) => s.facePicker);
  const node = useGraph((s) => s.nodes.find((n) => n.id === s.facePicker));
  const vid = useUpstream(id ?? '', 'video');
  const [shots, setShots] = useState<FaceShot[]>([]);
  const [picks, setPicks] = useState<number[]>([]);
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const close = () => useGraph.getState().openFacePicker(null);
  useEffect(() => { setShots([]); setPicks([]); setMsg(''); }, [id]);
  if (!id || !node) return null;
  const single = shots.length === 1;
  const scan = async () => {
    if (!vid) { setMsg(T('Connect a video first')); return; }
    setBusy(true); setMsg(T('Scanning… (nothing else should be rendering)'));
    try {
      const p = node.params;
      const d = await scanFaces({ video: await ensureInput(vid), detector: p.detector, confidence: p.confidence ?? 0.35, cut_detection: p.cuts ? 'auto (pyscenedetect)' : 'none', cut_threshold: p.cut_threshold ?? 3, skip_first_frames: 0, frame_load_cap: 0, select_every_nth: 1, select: 'manual' });
      if ((d as any).error) throw new Error((d as any).error);
      setShots(d.shots ?? []); setPicks((d.shots ?? []).length === 1 ? [] : (d.shots ?? []).map(() => -2)); setMsg('');
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };
  const ready = single ? picks.length > 0 : shots.length > 0 && picks.every((x) => x !== -2);
  const apply = () => { const g = useGraph.getState(); g.setParam(id, 'picks', picks.join(',')); g.setParam(id, 'pick_mode', single ? 'chain' : 'shots'); close(); };
  const click = (si: number, fi: number) => setPicks((cur) => { if (single) return cur.includes(fi) ? cur.filter((x) => x !== fi) : [...cur, fi]; const c = [...cur]; c[si] = fi; return c; });
  return (
    <div className="viewer facepick" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="viewer-bar"><span>{T('Pick faces')}</span><button className="btn" disabled={busy} onClick={() => void scan()}>{T('Scan video')}</button><span className="muted">{msg}</span><span className="spacer" />
        <span className="muted">{single ? T('Click faces in the order to refine') : T('Click a face per shot')}</span>
        <button className="btn primary" disabled={!ready} onClick={apply}>{T('Use')}</button><button onClick={close}>✕</button></div>
      <div className="face-grid">
        {shots.map((s, si) => (
          <div key={si} className="face-shot">
            <div className="face-img">{s.jpg ? <img src={`data:image/jpeg;base64,${s.jpg}`} alt="" /> : <em>{T('no face found')}</em>}
              {(s.boxes ?? []).map((b, fi) => <i key={fi} className={(single ? picks.includes(fi) : picks[si] === fi) ? 'on' : ''} title={`${fi}`} onClick={() => click(si, fi)} style={{ left: `${b[0] * 100}%`, top: `${b[1] * 100}%`, width: `${(b[2] - b[0]) * 100}%`, height: `${(b[3] - b[1]) * 100}%` }}>{single ? (picks.indexOf(fi) >= 0 ? picks.indexOf(fi) + 1 : fi) : fi}</i>)}</div>
            {!single && <button className={`btn ${picks[si] === -1 ? 'primary' : ''}`} onClick={() => click(si, -1)}>{T('not in this shot')}</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
void byId;
