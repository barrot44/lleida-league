import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import type { ObsLowerThird, ObsSponsorItem, ObsTicker } from '@/obs/types';
import { SITE } from '@/config/site';
import { Logo } from '@/components/ui/Logo';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { EASE_OUT, GOLD_GRADIENT, PANEL_BG } from '@/obs/overlay/kit';

/** Persistent "furniture" of the broadcast: lower third, ticker, brand bug, sponsors and replay tag. */

export function LowerThird({ lt, raised }: { lt: ObsLowerThird; raised: boolean }) {
  return (
    <motion.div
      className="absolute left-[96px] flex items-stretch font-display"
      style={{ bottom: raised ? 120 : 76 }}
      exit={{ opacity: 0, x: -60, transition: { duration: 0.35 } }}
    >
      <motion.span
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="w-[12px] origin-bottom rounded-l-md"
        style={{ background: GOLD_GRADIENT, boxShadow: '0 0 24px rgba(251,191,36,.6)' }}
      />
      {lt.team && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: EASE_OUT }}
          className="grid w-[150px] place-items-center"
          style={{ background: PANEL_BG }}
        >
          <TeamCrest team={lt.team} size={104} />
        </motion.div>
      )}
      <div className="flex flex-col">
        <motion.div
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0)' }}
          transition={{ delay: 0.15, duration: 0.6, ease: EASE_OUT }}
          className="px-9 py-4"
          style={{ background: PANEL_BG, boxShadow: '0 20px 50px -12px rgba(0,0,0,.8)' }}
        >
          <p className="max-w-[1300px] truncate text-[58px] font-black uppercase leading-none text-white">{lt.title}</p>
        </motion.div>
        {lt.subtitle && (
          <motion.div
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ delay: 0.45, duration: 0.55, ease: EASE_OUT }}
            className="self-start px-9 py-2.5 text-slate-950"
            style={{ background: GOLD_GRADIENT }}
          >
            <p className="max-w-[1300px] truncate text-[28px] font-black uppercase leading-none tracking-[0.14em]">{lt.subtitle}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export function TickerBar({ ticker }: { ticker: ObsTicker }) {
  const items = ticker.items.filter((s) => s.trim());
  const chars = items.join('').length + items.length * 6;
  const seconds = Math.max(22, chars * 0.22);
  const row = (key: string) => (
    <div key={key} className="flex shrink-0 items-center">
      {items.map((text, i) => (
        <span key={i} className="flex items-center">
          <span className="whitespace-nowrap px-8 text-[28px] font-black uppercase tracking-wide text-white">{text}</span>
          <span className="h-3 w-3 rotate-45 rounded-[2px]" style={{ background: GOLD_GRADIENT }} />
        </span>
      ))}
    </div>
  );
  return (
    <motion.div
      initial={{ y: 80 }}
      animate={{ y: 0, transition: { duration: 0.5, ease: EASE_OUT } }}
      exit={{ y: 80, transition: { duration: 0.3 } }}
      className="absolute inset-x-0 bottom-0 flex h-[64px] items-stretch font-display"
    >
      <div className="relative z-10 flex shrink-0 items-center gap-3 pl-6 pr-8 text-slate-950" style={{ background: GOLD_GRADIENT, clipPath: 'polygon(0 0, 100% 0, calc(100% - 22px) 100%, 0 100%)' }}>
        <Logo size={44} glow={false} />
        <span className="text-[26px] font-black uppercase tracking-wider">{ticker.label || 'Lleida League'}</span>
      </div>
      <div className="relative -ml-[22px] flex flex-1 items-center overflow-hidden border-t border-amber-400/40" style={{ background: 'rgba(8,11,17,0.92)' }}>
        {items.length > 0 && (
          <div className="flex animate-marquee" style={{ animationDuration: `${seconds}s` }}>
            {row('a')}
            {row('b')}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function BrandBug() {
  return (
    <motion.div
      initial={{ x: 260, opacity: 0 }}
      animate={{ x: 0, opacity: 1, transition: { duration: 0.55, ease: EASE_OUT } }}
      exit={{ x: 260, opacity: 0 }}
      className="absolute right-[56px] top-[44px] flex items-center gap-3 rounded-full border border-white/10 py-2 pl-3 pr-6 font-display"
      style={{ background: PANEL_BG, boxShadow: '0 16px 40px -12px rgba(0,0,0,.8)' }}
    >
      <span className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-[18px] font-black uppercase tracking-[0.2em] text-white">
        <span className="h-2.5 w-2.5 animate-pulse-live rounded-full bg-white" /> Directe
      </span>
      <Logo size={40} />
      <span className="text-[24px] font-black tracking-wide text-amber-300">{SITE.handle}</span>
    </motion.div>
  );
}

export function SponsorBug({ items, seconds, lowered }: { items: ObsSponsorItem[]; seconds: number; lowered: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(() => setI((n) => n + 1), Math.max(3, seconds) * 1000);
    return () => window.clearInterval(id);
  }, [items.length, seconds]);
  const current = items.length ? items[i % items.length] : null;
  if (!current) return null;
  return (
    <motion.div
      initial={{ x: 260, opacity: 0 }}
      animate={{ x: 0, opacity: 1, transition: { duration: 0.55, ease: EASE_OUT } }}
      exit={{ x: 260, opacity: 0 }}
      className="absolute right-[56px] w-[250px] overflow-hidden rounded-2xl border border-white/10 font-display"
      style={{ top: lowered ? 116 : 44, background: PANEL_BG, boxShadow: '0 16px 40px -12px rgba(0,0,0,.8)' }}
    >
      <p className="px-4 pt-2.5 text-center text-[13px] font-bold uppercase tracking-[0.28em] text-slate-400">Amb el suport de</p>
      <div className="relative m-3 mt-2 h-[86px] overflow-hidden rounded-xl bg-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${current.name}-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 grid place-items-center p-3"
          >
            {current.logoUrl ? (
              <img src={current.logoUrl} alt={current.name} className="max-h-[62px] max-w-[200px] object-contain" />
            ) : (
              <span className="text-center text-[24px] font-black uppercase leading-none text-slate-900">{current.name}</span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function ReplayTag() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 0 6px rgba(251,191,36,.85), inset 0 0 80px rgba(251,191,36,.25)' }} />
      <motion.div
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
        className="absolute left-1/2 top-[150px] flex -translate-x-1/2 items-center gap-3 rounded-full px-8 py-3 font-display text-slate-950"
        style={{ background: GOLD_GRADIENT, boxShadow: '0 0 40px rgba(251,191,36,.6)' }}
      >
        <motion.span animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }} className="grid">
          <RotateCcw size={32} strokeWidth={3} />
        </motion.span>
        <span className="text-[34px] font-black uppercase tracking-[0.3em]">Repetició</span>
      </motion.div>
    </motion.div>
  );
}
