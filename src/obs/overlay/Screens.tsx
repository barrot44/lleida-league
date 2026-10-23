import { motion } from 'framer-motion';
import type { ObsScreen, ObsScoreboard, ObsSponsorItem } from '@/obs/types';
import { SCREEN_DEFAULTS } from '@/obs/state';
import { SITE } from '@/config/site';
import { SOCIAL_ICONS } from '@/components/ui/BrandIcons';
import { Logo } from '@/components/ui/Logo';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { splitDuration } from '@/hooks/useNow';
import { EASE_OUT, GOLD_GRADIENT, PANEL_BG, alpha, goldText } from '@/obs/overlay/kit';

const pad = (n: number) => String(n).padStart(2, '0');

function Countdown({ target, now }: { target: number; now: number }) {
  const { days, hours, minutes, seconds } = splitDuration(target - now);
  const parts: [string, number][] = days > 0 ? [['dies', days], ['hores', hours], ['min', minutes], ['seg', seconds]] : [['hores', hours], ['min', minutes], ['seg', seconds]];
  const shown = days === 0 && hours === 0 ? parts.slice(1) : parts;
  return (
    <div className="flex items-start gap-6">
      {shown.map(([label, value], i) => (
        <div key={label} className="flex items-start gap-6">
          {i > 0 && <span className="digital mt-2 text-[120px] leading-none text-amber-400/60">:</span>}
          <div className="flex w-[210px] flex-col items-center rounded-3xl border border-amber-400/30 py-4" style={{ background: PANEL_BG, boxShadow: '0 0 60px -20px rgba(245,158,11,.6)' }}>
            <span className="digital text-[130px] leading-none" style={goldText}>
              {pad(value)}
            </span>
            <span className="mt-1 text-[22px] font-bold uppercase tracking-[0.35em] text-slate-400">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCard({ sb, showScore }: { sb: ObsScoreboard; showScore: boolean }) {
  if (!sb.home || !sb.away) return null;
  return (
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.6, ease: EASE_OUT }} className="flex items-center gap-10 rounded-[28px] border border-white/10 px-12 py-7" style={{ background: PANEL_BG }}>
      <div className="flex w-[480px] items-center justify-end gap-6">
        <span className="line-clamp-2 text-right text-[46px] font-black uppercase leading-[0.95] text-white">{sb.home.name}</span>
        <TeamCrest team={sb.home} size={120} />
      </div>
      <span className="digital min-w-[190px] text-center text-[100px] leading-none" style={goldText}>
        {showScore ? `${sb.homeScore}-${sb.awayScore}` : 'VS'}
      </span>
      <div className="flex w-[480px] items-center gap-6">
        <TeamCrest team={sb.away} size={120} />
        <span className="line-clamp-2 text-[46px] font-black uppercase leading-[0.95] text-white">{sb.away.name}</span>
      </div>
    </motion.div>
  );
}

/** Opaque full-screen scenes: starting soon, be right back, half-time and goodbye. */
export function FullScreen({ screen, sb, sponsors, accent, now }: { screen: ObsScreen; sb: ObsScoreboard; sponsors: ObsSponsorItem[]; accent: string; now: number }) {
  const defaults = SCREEN_DEFAULTS[screen.kind];
  const title = screen.title.trim() || defaults.title;
  const subtitle = screen.subtitle.trim() || defaults.subtitle;
  const target = screen.kind === 'starting' && screen.targetAt ? Date.parse(screen.targetAt) : NaN;
  const counting = Number.isFinite(target) && target > now;
  const showScore = screen.kind === 'halftime' || screen.kind === 'ending';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.6 } }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      className="absolute inset-0 z-50 overflow-hidden font-display text-white"
      style={{ background: `radial-gradient(1100px 700px at 85% -10%, ${alpha(accent, 0.28)}, transparent 60%), radial-gradient(900px 600px at -10% 110%, rgba(6,182,212,.22), transparent 60%), linear-gradient(180deg, #0b1020 0%, #05070c 100%)` }}
    >
      <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: i === 1 ? 'rgba(6,182,212,.14)' : alpha(accent, 0.16), left: `${10 + i * 32}%`, top: `${i === 1 ? 50 : 8}%` }}
          animate={{ x: [0, 60, -40, 0], y: [0, -40, 30, 0] }}
          transition={{ repeat: Infinity, duration: 16 + i * 4, ease: 'easeInOut' }}
        />
      ))}

      <div className="relative flex h-full flex-col items-center justify-center gap-8 px-20 pb-32">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: EASE_OUT }} className="animate-float">
          <Logo size={160} className="animate-glow-breathe" />
        </motion.div>
        <div className="text-center">
          <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.7, ease: EASE_OUT }} className="shimmer-text text-[120px] font-black uppercase leading-[0.9] tracking-tight">
            {title}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-5 text-[38px] font-bold uppercase tracking-[0.2em] text-slate-300">
            {subtitle}
          </motion.p>
        </div>
        {counting && <Countdown target={target} now={now} />}
        <MatchCard sb={sb} showScore={showScore} />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex h-[120px] items-center justify-between gap-10 border-t border-white/10 px-16" style={{ background: 'rgba(5,7,12,.7)' }}>
        <div className="flex items-center gap-6">
          <span className="text-[40px] font-black tracking-wide text-amber-300">{SITE.handle}</span>
          <span className="flex gap-3">
            {SITE.socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.id];
              return (
                <span key={s.id} className="grid h-[54px] w-[54px] place-items-center rounded-full text-slate-950" style={{ background: GOLD_GRADIENT }}>
                  <Icon size={28} />
                </span>
              );
            })}
          </span>
        </div>
        {sponsors.length > 0 && (
          <div className="flex min-w-0 items-center gap-4 overflow-hidden">
            <span className="shrink-0 text-[18px] font-bold uppercase tracking-[0.3em] text-slate-400">Patrocinadors</span>
            {sponsors.slice(0, 7).map((s) => (
              <span key={s.name} className="grid h-[76px] w-[140px] shrink-0 place-items-center rounded-xl bg-white p-2">
                {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="max-h-[60px] max-w-[124px] object-contain" /> : <span className="text-center text-[16px] font-black uppercase leading-none text-slate-900">{s.name}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
