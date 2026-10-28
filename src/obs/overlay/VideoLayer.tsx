import { useEffect, useRef } from 'react';
import type { ObsVideos } from '@/obs/types';
import { VIDEO_LEAD_MS, fmtSeconds, videoPosition } from '@/lib/videos';
import { GOLD_GRADIENT } from '@/obs/overlay/kit';

type Playing = NonNullable<ObsVideos['playing']>;

/**
 * Full-screen video / ad break, driven by the clock (`playing.at` + the lengths): a copy of the overlay reloaded
 * halfway picks it up at the same point. When it arrives fresh, it starts on THIS computer's clock (soon after it
 * is received), so a phone and the OBS computer whose clocks differ a few seconds still start it from the top.
 * `preview` (admin panel) plays it muted.
 */
export function VideoLayer({ playing, volume, now, preview }: { playing: Playing; volume: number; now: number; preview?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const startAt = useRef<number | null>(null);
  if (startAt.current === null) {
    const late = now - playing.at;
    const fresh = late < 4000 && late > -10_000;
    startAt.current = fresh ? Math.min(Math.max(playing.at, now + 300), now + VIDEO_LEAD_MS) : playing.at;
  }
  const local = { ...playing, at: startAt.current };
  const pos = videoPosition(local, now);
  const started = now >= local.at;
  const index = pos?.index ?? 0;
  const item = playing.items[index];
  const next = playing.items[index + 1];
  const over = started && !pos;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.volume = Math.max(0, Math.min(1, volume));
    if (!started || over) {
      if (!v.paused) v.pause();
      return;
    }
    const want = pos?.offset ?? 0;
    // Keep in step with the clock: big jumps only (a reload, a throttled tab), never on every tick.
    if (Math.abs(v.currentTime - want) > (v.paused ? 0.35 : 1.2)) {
      try {
        v.currentTime = want;
      } catch {
        /* not seekable yet */
      }
    }
    if (v.paused && !v.ended) {
      v.play().catch(() => {
        // A normal browser tab may refuse sound without a click: play it muted rather than not at all.
        v.muted = true;
        void v.play().catch(() => {});
      });
    }
  });

  if (!item) return null;
  const fadeIn = Math.min(1, Math.max(0, (now - (local.at - VIDEO_LEAD_MS)) / 350));
  const fadeOut = over ? 0 : pos && pos.left < 0.45 ? pos.left / 0.45 : 1;
  const hasAds = playing.items.some((x) => x.kind === 'ad');

  return (
    <div className="absolute inset-0 z-[60] bg-black transition-opacity duration-300" style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      <video key={`${playing.id}-${index}`} ref={ref} src={item.url} preload="auto" playsInline muted={preview} className="h-full w-full object-contain" />
      {/* Next file loading in the background, so the cut is instant. */}
      {next && <video key={`pre-${playing.id}-${index + 1}`} src={next.url} preload="auto" muted className="hidden" />}
      {hasAds && started && pos && (
        <div className="absolute right-[48px] top-[40px] flex items-center gap-3 font-display">
          {item.kind === 'ad' && <span className="rounded-lg bg-black/55 px-4 py-1.5 text-[22px] font-black uppercase tracking-[0.25em] text-white/85">Publicitat</span>}
          <span className="rounded-lg px-4 py-1.5 text-[22px] font-black uppercase tracking-wider text-slate-950" style={{ background: GOLD_GRADIENT }}>
            Tornem en {fmtSeconds(pos.left)}
          </span>
        </div>
      )}
    </div>
  );
}
