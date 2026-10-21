import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Maximum tilt in degrees. */
  max?: number;
  /** Adds the holographic foil + glare overlay. */
  holo?: boolean;
}

/** 3D tilt following the pointer, with glare and a holographic foil — updated via CSS vars (no re-renders). */
export function TiltCard({ children, className, style, max = 10, holo = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--rx', `${((0.5 - py) * max * 2).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((px - 0.5) * max * 2).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--mx', '50%');
    el.style.setProperty('--my', '50%');
  };

  return (
    <div className="group [perspective:1000px]" onPointerMove={onMove} onPointerLeave={reset}>
      <div
        ref={ref}
        className={cn('relative transition-transform duration-200 ease-out will-change-transform', className)}
        style={{ transform: 'rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))', transformStyle: 'preserve-3d', ...style }}
      >
        {children}
        {holo && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  'linear-gradient(115deg, transparent 18%, rgba(251,191,36,.55) 32%, rgba(6,182,212,.5) 46%, rgba(236,72,153,.45) 60%, rgba(16,185,129,.4) 72%, transparent 86%)',
                backgroundSize: '260% 260%',
                backgroundPosition: 'var(--mx, 50%) var(--my, 50%)',
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: 'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,.22), transparent 42%)' }}
            />
          </>
        )}
      </div>
    </div>
  );
}
