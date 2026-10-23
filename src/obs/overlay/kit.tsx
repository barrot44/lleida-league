import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

/** Shared look of the broadcast graphics: the same navy glass, gold and neon of the website, sized for 1920×1080. */

export const GOLD_GRADIENT = 'linear-gradient(135deg, #FDE68A 0%, #FBBF24 35%, #F59E0B 65%, #B45309 100%)';
export const PANEL_BG = 'linear-gradient(180deg, rgba(19,28,51,0.94) 0%, rgba(8,11,17,0.94) 100%)';
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const goldText: CSSProperties = {
  backgroundImage: 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 45%, #d97706 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

/** Hex color with alpha (`#rrggbb` + 0..1). */
export function alpha(hex: string, a: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(148,163,184,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Scales its content down (never up) to fit the box it is given. */
export function FitInside({ children, className }: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      const k = Math.min(1, o.clientHeight / Math.max(1, i.offsetHeight), o.clientWidth / Math.max(1, i.offsetWidth));
      setScale((prev) => (Math.abs(prev - k) > 0.002 ? k : prev));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(i);
    ro.observe(o);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className={cn('flex items-center justify-center', className)}>
      <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        {children}
      </div>
    </div>
  );
}

const FORM_LABEL = { W: 'V', D: 'E', L: 'D' } as const;
const FORM_COLOR = { W: '#10B981', D: '#64748B', L: '#EF4444' } as const;

/** Last results as V / E / D chips (Victòria, Empat, Derrota). */
export function FormChips({ form, size = 30 }: { form: ('W' | 'D' | 'L')[]; size?: number }) {
  if (form.length === 0) return <span className="text-slate-500">—</span>;
  return (
    <span className="inline-flex gap-1.5">
      {form.map((r, i) => (
        <span
          key={i}
          className="grid place-items-center rounded-md font-display font-black text-white"
          style={{ width: size, height: size, fontSize: size * 0.56, background: FORM_COLOR[r], boxShadow: `0 0 12px ${alpha(FORM_COLOR[r], 0.5)}` }}
        >
          {FORM_LABEL[r]}
        </span>
      ))}
    </span>
  );
}

interface BoardProps {
  eyebrow: string;
  title: string;
  accent: string;
  width: number;
  right?: ReactNode;
  children: ReactNode;
}

/** Centered broadcast panel: league badge + title header, body and a gold underline. */
export function Board({ eyebrow, title, accent, width, right, children }: BoardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-white/10 font-display text-white"
      style={{ width, background: PANEL_BG, boxShadow: `0 40px 120px -20px rgba(0,0,0,.85), 0 0 0 1px ${alpha(accent, 0.25)}, 0 0 80px -30px ${alpha(accent, 0.6)}` }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full blur-3xl" style={{ background: alpha(accent, 0.22) }} />
      <motion.header
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5, ease: EASE_OUT }}
        className="relative flex items-center gap-6 border-b border-white/10 px-10 py-7"
      >
        <Logo size={78} />
        <div className="min-w-0 flex-1 leading-none">
          <p className="text-[22px] font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
            {eyebrow}
          </p>
          <h2 className="mt-2 truncate text-[60px] font-black uppercase leading-[0.95] tracking-tight text-white">{title}</h2>
        </div>
        {right}
      </motion.header>
      <div className="relative px-10 py-7">{children}</div>
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.25, duration: 0.8, ease: EASE_OUT }}
        className="h-[6px] origin-left"
        style={{ background: GOLD_GRADIENT }}
      />
    </div>
  );
}

/** Standard enter/exit of a central graphic. */
export const boardMotion = {
  initial: { opacity: 0, scale: 0.92, y: 40 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.96, y: -30, transition: { duration: 0.35, ease: 'easeIn' as const } },
};

/** Staggered rows: parent `variants={listParent}` + children `variants={listItem}`. */
export const listParent = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.3 } } };
export const listItem = {
  hidden: { opacity: 0, x: -36 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

export function Pill({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full px-5 py-2 font-display font-black uppercase tracking-[0.18em]', className)} style={style}>
      {children}
    </span>
  );
}
