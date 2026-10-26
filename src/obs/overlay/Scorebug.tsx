import { AnimatePresence, motion } from 'framer-motion';
import type { ObsScoreboard, ObsTeam } from '@/obs/types';
import { clockText, PERIOD_SHORT } from '@/obs/state';
import { Logo } from '@/components/ui/Logo';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { EASE_OUT, GOLD_GRADIENT, PANEL_BG, alpha } from '@/obs/overlay/kit';

const TEAM_W = 196;
const SCORE_W = 70;

function Score({ value }: { value: number }) {
  return (
    <div className="relative grid h-full place-items-center overflow-hidden bg-black/60" style={{ width: SCORE_W }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 56, opacity: 0, scale: 1.4 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -56, opacity: 0 }}
          transition={{ type: 'spring', damping: 16, stiffness: 260 }}
          className="digital text-[48px] leading-none text-amber-300"
          style={{ textShadow: '0 0 18px rgba(251,191,36,.55)' }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function TeamCell({ team, side }: { team: ObsTeam | null; side: 'home' | 'away' }) {
  const color = team?.primaryColor ?? '#334155';
  return (
    <div
      className="relative flex h-full items-center gap-3 px-4"
      style={{
        width: TEAM_W,
        flexDirection: side === 'home' ? 'row' : 'row-reverse',
        background: `linear-gradient(${side === 'home' ? 90 : 270}deg, ${alpha(color, 0.38)} 0%, rgba(15,23,42,0) 85%)`,
      }}
    >
      <span className="absolute inset-y-0 w-[7px]" style={{ [side === 'home' ? 'left' : 'right']: 0, background: color, boxShadow: `0 0 16px ${alpha(color, 0.8)}` }} />
      {team && <TeamCrest team={team} size={42} />}
      <span className="truncate font-display text-[34px] font-black uppercase leading-none tracking-wide text-white">{team?.shortName ?? '—'}</span>
    </div>
  );
}

function Fouls({ count, side }: { count: number; side: 'home' | 'away' }) {
  const bonus = count >= 5;
  return (
    <div className="flex" style={{ width: TEAM_W + SCORE_W, justifyContent: side === 'home' ? 'flex-start' : 'flex-end' }}>
      <div className="flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5">
      {side === 'home' && <span className="text-[13px] font-bold uppercase tracking-[0.2em] text-slate-300">Faltes</span>}
      <span className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="h-[10px] w-[20px] rounded-sm transition-colors duration-300"
            style={{ background: i < count ? (bonus ? '#EF4444' : '#FBBF24') : 'rgba(255,255,255,.14)', boxShadow: i < count ? `0 0 8px ${bonus ? 'rgba(239,68,68,.8)' : 'rgba(251,191,36,.7)'}` : undefined }}
          />
        ))}
      </span>
      {count > 5 && <span className="font-display text-[16px] font-black text-red-400">+{count - 5}</span>}
      {side === 'away' && <span className="text-[13px] font-bold uppercase tracking-[0.2em] text-slate-300">Faltes</span>}
      </div>
    </div>
  );
}

/** Top-left futsal scoreboard: crests, score, running clock, period and accumulated fouls. */
export function Scorebug({ sb, now }: { sb: ObsScoreboard; now: number }) {
  const halted = sb.period === 'DESC' || sb.period === 'FINAL' || sb.period === 'PEN';
  return (
    <motion.div
      initial={{ y: -140, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE_OUT } }}
      exit={{ y: -140, opacity: 0, transition: { duration: 0.35 } }}
      className="absolute left-[56px] top-[24px] font-display"
    >
      {/* Fouls on top of each team, so the space under the scoreboard is free for the compact graphics. */}
      <div className="mb-1.5 flex">
        <span className="w-[76px]" />
        <Fouls count={sb.homeFouls} side="home" />
        <span className="w-[2px]" />
        <Fouls count={sb.awayFouls} side="away" />
      </div>
      <div className="flex h-[70px] items-stretch overflow-hidden rounded-2xl border border-amber-400/30" style={{ background: PANEL_BG, boxShadow: '0 18px 50px -12px rgba(0,0,0,.8), 0 0 30px -10px rgba(245,158,11,.45)' }}>
        <div className="grid w-[76px] place-items-center border-r border-white/10 bg-[#0b1226]">
          <Logo size={52} />
        </div>
        <TeamCell team={sb.home} side="home" />
        <Score value={sb.homeScore} />
        <span className="w-[2px] bg-amber-400/40" />
        <Score value={sb.awayScore} />
        <TeamCell team={sb.away} side="away" />
        <div className="relative flex min-w-[150px] items-center justify-center gap-2 px-5 text-slate-950" style={{ background: GOLD_GRADIENT }}>
          {sb.clock.running && !halted && <span className="h-2.5 w-2.5 animate-pulse-live rounded-full bg-red-600" />}
          <span className="digital text-[40px] leading-none">{halted ? PERIOD_SHORT[sb.period] : clockText(sb.clock, now)}</span>
        </div>
        {!halted && (
          <div className="grid min-w-[74px] place-items-center bg-[#0b1226] px-3 text-[24px] font-black uppercase tracking-wider text-amber-300">{PERIOD_SHORT[sb.period]}</div>
        )}
      </div>
    </motion.div>
  );
}
