import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Lock, Mail, Rocket, Wrench, X } from 'lucide-react';
import type { GateSettings } from '@/types';
import { Particles } from '@/components/home/Particles';
import { AppCard } from '@/components/live/AppCard';
import { SOCIAL_ICONS } from '@/components/ui/BrandIcons';
import { Logo } from '@/components/ui/Logo';
import { SITE } from '@/config/site';
import { hrefFor } from '@/hooks/useHashRoute';
import { splitDuration, useNow } from '@/hooks/useNow';
import { gateCopy, gateTarget, pingLaunch } from '@/lib/gate';
import { celebrate } from '@/lib/confetti';
import { cn } from '@/lib/utils';

function BigDigit({ value, label }: { value: number; label: string }) {
  const text = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <div className="scoreboard relative overflow-hidden rounded-[0.2em] border border-amber-400/25 px-[0.2em] py-[0.08em] text-[clamp(3rem,13vw,12rem)] shadow-glow-lg">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            initial={{ y: '-45%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '45%', opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="digital text-gold-gradient block leading-none"
          >
            {text}
          </motion.span>
        </AnimatePresence>
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-[2px] bg-black/60" />
      </div>
      <span className="mt-3 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 sm:text-sm">{label}</span>
    </div>
  );
}

interface Props {
  gate: GateSettings;
  /** Admin preview: covers the page and shows a close button. */
  preview?: boolean;
  onClose?: () => void;
}

/** Full-screen "coming soon" countdown / maintenance page shown instead of the site. */
export function SiteGate({ gate, preview, onClose }: Props) {
  const now = useNow(1000);
  const copy = gateCopy(gate);
  const target = gateTarget(gate);
  const remaining = target === null ? null : target - now;
  const done = remaining !== null && remaining <= 0;
  const { days, hours, minutes, seconds } = splitDuration(remaining ?? 0);
  const maintenance = gate.mode === 'maintenance';
  // In maintenance the clock is only an estimate: once it has passed, hide it instead of showing zeros.
  const showClock = target !== null && (!maintenance || (remaining ?? 0) > 0);
  const previous = useRef<number | null>(null);

  // Confetti the moment the countdown hits zero (not when someone arrives after the launch).
  useEffect(() => {
    if (gate.mode !== 'countdown' || remaining === null) return;
    if (previous.current !== null && previous.current > 0 && remaining <= 0) void celebrate(undefined, { big: true });
    previous.current = remaining;
  }, [remaining, gate.mode]);

  // Whoever is watching when it reaches zero triggers the "we're open" notification (sent once, server side).
  useEffect(() => {
    if (done && !preview && gate.mode === 'countdown' && target !== null) pingLaunch(target);
  }, [done, preview, gate.mode, target]);

  const watermark = days > 0 ? days : hours;

  return (
    <div className={cn('relative isolate flex flex-col bg-pitch text-center', preview ? 'fixed inset-0 z-[300] overflow-y-auto' : 'min-h-dvh')}>
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-60" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(60% 50% at 50% 38%, rgba(245,158,11,.2), transparent 70%), radial-gradient(45% 45% at 8% 100%, rgba(6,182,212,.16), transparent 70%)' }}
      />
      <Particles count={70} />

      {/* giant number behind everything */}
      {showClock && !done && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 grid select-none place-items-center overflow-hidden">
          <span className="digital text-[clamp(14rem,52vw,60rem)] leading-none text-white/[0.035] blur-[2px]">{String(watermark).padStart(2, '0')}</span>
        </div>
      )}

      {preview && (
        <div className="sticky top-0 z-20 flex items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">
          Previsualització: això és el que veuran els visitants
          <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
            <X size={14} /> Tanca
          </button>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-6 px-4 py-12 sm:gap-8">
        <Logo size={132} className="animate-float" />

        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.25em] text-amber-300">
          {maintenance ? <Wrench size={14} /> : <Rocket size={14} />} {copy.badge}
        </span>

        <h1 className="neon-gold text-[clamp(2.4rem,8vw,6rem)] leading-[0.95]">{done && !maintenance ? 'Som aquí!' : copy.title}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">{done && !maintenance ? 'La Lleida League ja és aquí. Obrint la web…' : copy.message}</p>

        {showClock ? (
          <div className="mt-2 flex items-start justify-center gap-2 sm:gap-6" role="timer" aria-label="Compte enrere">
            <BigDigit value={days} label="Dies" />
            <BigDigit value={hours} label="Hores" />
            <BigDigit value={minutes} label="Minuts" />
            <BigDigit value={seconds} label="Segons" />
          </div>
        ) : (
          maintenance && (
            <div className="relative mt-4 grid h-40 w-40 place-items-center rounded-full border border-amber-400/30 bg-amber-400/[0.06] shadow-glow-lg">
              <Wrench size={72} className="animate-pulse text-amber-300" />
            </div>
          )
        )}
        {maintenance && showClock && <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">Temps estimat per tornar</p>}
        {/* Before the launch: get the app on the home screen and a notification the day the site opens. */}
        {!maintenance && !done && (
          <div className="mt-2 w-full max-w-2xl text-left">
            <AppCard launch />
          </div>
        )}
      </main>

      <footer className="flex flex-col items-center gap-4 px-4 pb-8 pt-4">
        <div className="flex gap-2">
          {SITE.socials.map((s) => {
            const Icon = SOCIAL_ICONS[s.id];
            return (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:-translate-y-0.5 hover:border-amber-400/50 hover:text-amber-300 hover:shadow-glow"
              >
                <Icon size={20} />
              </a>
            );
          })}
        </div>
        <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-amber-300">
          <Mail size={15} /> {SITE.email}
        </a>
        {!preview && (
          // Presidents register their teams (and the image rights) before the launch; admins manage everything.
          <nav aria-label="Accessos" className="flex flex-wrap justify-center gap-2.5">
            <a href={hrefFor('registration')} className="btn border border-amber-400/50 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20 hover:shadow-glow">
              <Crown size={16} /> Accés presidents
            </a>
            <a href={hrefFor('admin')} className="btn-ghost">
              <Lock size={16} /> Accés administrador
            </a>
          </nav>
        )}
      </footer>
    </div>
  );
}
