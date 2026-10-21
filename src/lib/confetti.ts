const GOLD = ['#FBBF24', '#F59E0B', '#FDE68A', '#06B6D4', '#10B981'];

/** Lazy-loaded so canvas-confetti stays out of the main bundle. */
export async function celebrate(colors: string[] = GOLD, opts: { big?: boolean } = {}) {
  const { default: confetti } = await import('canvas-confetti');
  const base = { colors: [...colors, ...GOLD.slice(0, 2)], disableForReducedMotion: true, zIndex: 9999 };
  confetti({ ...base, particleCount: opts.big ? 160 : 90, spread: 80, startVelocity: 48, origin: { y: 0.7 } });
  if (opts.big) {
    setTimeout(() => confetti({ ...base, particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } }), 220);
    setTimeout(() => confetti({ ...base, particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } }), 380);
  }
}
