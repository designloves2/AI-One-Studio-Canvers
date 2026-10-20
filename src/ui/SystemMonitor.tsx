import { useEffect, useState } from 'react';
import { subscribeSystemStats, type SystemStats } from '../backend/monitor';

// 0-10 % blue, then purple (30) -> orange (50) -> red (70+), blended linearly between the stops
const STOPS: [number, [number, number, number]][] = [[0, [59, 130, 246]], [10, [59, 130, 246]], [30, [139, 123, 255]], [50, [255, 157, 61]], [70, [255, 93, 108]], [100, [255, 93, 108]]];
function colorFor(pct: number): string {
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i]; const [p0, c0] = STOPS[i - 1];
    if (pct <= p1) { const t = p1 === p0 ? 0 : (pct - p0) / (p1 - p0); return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * t)).join(',')})`; }
  }
  return `rgb(${STOPS[STOPS.length - 1][1].join(',')})`;
}

function Meter({ label, pct, text, title }: { label: string; pct: number | null | undefined; text?: string; title?: string }) {
  const ok = typeof pct === 'number' && Number.isFinite(pct);
  const v = ok ? Math.max(0, Math.min(100, pct as number)) : 0;
  return (
    <div className="sysmon-meter" title={title}>
      <span className="sysmon-label">{label}</span>
      <div className="sysmon-box">
        <div className="sysmon-fill" style={{ width: `${v}%`, background: colorFor(v) }} />
        <span className="sysmon-text">{ok ? text ?? `${Math.round(v)}%` : '—'}</span>
      </div>
    </div>
  );
}

/** CPU / RAM / GPU / VRAM / temperature of the ComfyUI machine (needs ComfyUI-Crystools; without it the meters stay at "—"). */
export function SystemMonitor() {
  const [s, setS] = useState<SystemStats | null>(null);
  useEffect(() => subscribeSystemStats(setS), []);
  const g = s?.gpus?.[0];
  return (
    <div className="sysmon" aria-label="system monitor">
      <Meter label="CPU" pct={s?.cpu_utilization} title="CPU" />
      <Meter label="RAM" pct={s?.ram_used_percent} title="RAM" />
      <Meter label="GPU" pct={g?.gpu_utilization} title="GPU" />
      <Meter label="VRAM" pct={g?.vram_used_percent} title={g ? `VRAM ${(g.vram_used / 2 ** 30).toFixed(1)} / ${(g.vram_total / 2 ** 30).toFixed(1)} GB` : 'VRAM'} />
      <Meter label="TEMP" pct={g?.gpu_temperature} text={g ? `${Math.round(g.gpu_temperature)}°` : undefined} title="GPU temperature" />
    </div>
  );
}
