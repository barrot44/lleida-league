import { useLayoutEffect, useRef, useState } from 'react';
import { Grid2x2, MonitorPlay } from 'lucide-react';
import { Stage, STAGE_H, STAGE_W } from '@/obs/overlay/Stage';
import { useObsStore } from '@/obs/useObsStore';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/utils';

const CHECKER_BG = 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 28px 28px';

/** A futsal court seen from the stands, so the graphics are judged over something that looks like the stream. */
function CourtBackdrop() {
  return (
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="obs-stands" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141a26" />
          <stop offset="1" stopColor="#2a3243" />
        </linearGradient>
        <linearGradient id="obs-court" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f6fae" />
          <stop offset="1" stopColor="#1c4f86" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#obs-stands)" />
      <polygon points="300,330 1620,330 1920,1080 0,1080" fill="#b8642e" />
      <polygon points="380,370 1540,370 1800,1080 120,1080" fill="url(#obs-court)" />
      <g fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="5">
        <polygon points="380,370 1540,370 1800,1080 120,1080" />
        <line x1="960" y1="370" x2="960" y2="1080" />
        <ellipse cx="960" cy="640" rx="170" ry="95" />
      </g>
      <rect width="1920" height="1080" fill="url(#obs-stands)" opacity=".18" />
    </svg>
  );
}

/** Live, scaled copy of exactly what OBS is showing. */
export function ObsPreview() {
  const state = useObsStore((s) => s.state);
  const now = useNow(250);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [bg, setBg] = useState<'court' | 'checker'>('court');

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const scale = width / STAGE_W;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          <span className="h-2 w-2 animate-pulse-live rounded-full bg-red-500" /> Vista prèvia (el que surt a OBS)
        </p>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-pitch/60 p-0.5">
          {(
            [
              ['court', MonitorPlay, 'Pista'],
              ['checker', Grid2x2, 'Transparent'],
            ] as const
          ).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setBg(id)} className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition', bg === id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300')}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>
      <div ref={box} className="relative w-full overflow-hidden rounded-2xl border border-white/10 shadow-card" style={{ height: STAGE_H * scale, background: CHECKER_BG }}>
        {bg === 'court' && <CourtBackdrop />}
        <div className="pointer-events-none absolute left-0 top-0">
          <Stage state={state} now={now} scale={scale} preview />
        </div>
      </div>
    </div>
  );
}
