import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';
import { GOLD_GRADIENT, alpha } from '@/obs/overlay/kit';

/** How long a visual-only sting keeps the screen covered before opening again (ms). */
const STING_HOLD = 700;

/** `true` for a moment every time a new visual-only transition arrives in the shared state. */
export function useSting(transition: { id: string; at: number } | null) {
  const [covered, setCovered] = useState(false);
  const id = transition?.id;
  const at = transition?.at ?? 0;
  useEffect(() => {
    if (!id || Math.abs(Date.now() - at) > 10_000) return;
    setCovered(true);
    const t = window.setTimeout(() => setCovered(false), STING_HOLD);
    return () => window.clearTimeout(t);
  }, [id, at]);
  return covered;
}

const SNAP = [0.7, 0, 0.2, 1] as const;

const panel = (from: 'left' | 'right') => ({
  initial: { x: from === 'left' ? '-115%' : '115%' },
  animate: { x: '0%', transition: { duration: 0.46, ease: SNAP } },
  exit: { x: from === 'left' ? '-115%' : '115%', transition: { duration: 0.46, ease: SNAP } },
});

/**
 * The Lleida League logo transition: two navy blades with gold edges close in, the badge bursts in the middle,
 * then everything opens again. The scene change happens while the screen is covered.
 */
export function Stinger({ accent }: { accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[70] overflow-hidden">
      <motion.div {...panel('left')} className="absolute -inset-y-24 left-[-12%] w-[66%]" style={{ skewX: -14, background: 'linear-gradient(110deg, #05070c 0%, #0b1226 70%, #131c33 100%)' }}>
        <span className="absolute inset-y-0 right-0 w-[26px]" style={{ background: GOLD_GRADIENT, boxShadow: '0 0 60px rgba(251,191,36,.8)' }} />
        <span className="absolute inset-y-0 right-[48px] w-[8px]" style={{ background: alpha(accent, 0.8) }} />
        <div aria-hidden className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 2px, transparent 2px 40px)' }} />
      </motion.div>
      <motion.div {...panel('right')} className="absolute -inset-y-24 right-[-12%] w-[66%]" style={{ skewX: -14, background: 'linear-gradient(290deg, #05070c 0%, #0b1226 70%, #131c33 100%)' }}>
        <span className="absolute inset-y-0 left-0 w-[26px]" style={{ background: GOLD_GRADIENT, boxShadow: '0 0 60px rgba(251,191,36,.8)' }} />
        <span className="absolute inset-y-0 left-[48px] w-[8px]" style={{ background: 'rgba(6,182,212,.8)' }} />
        <div aria-hidden className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 2px, transparent 2px 40px)' }} />
      </motion.div>

      <div className="absolute inset-0 grid place-items-center">
        <motion.span
          className="absolute h-[360px] w-[360px] rounded-full border-[6px] border-amber-300"
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: [0.2, 1.7], opacity: [0, 0.9, 0], transition: { delay: 0.3, duration: 0.7 } }}
          exit={{ opacity: 0 }}
        />
        <motion.div
          initial={{ scale: 0, rotate: -160, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1, transition: { delay: 0.18, type: 'spring', damping: 13, stiffness: 190 } }}
          exit={{ scale: 1.6, opacity: 0, transition: { duration: 0.32 } }}
          className="relative"
        >
          <div className="absolute -inset-10 rounded-full blur-3xl" style={{ background: 'rgba(251,191,36,.45)' }} />
          <Logo size={300} className="relative" />
        </motion.div>
      </div>
    </div>
  );
}
