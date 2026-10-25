import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ObsGraphic } from '@/obs/types';
import { POSITION_LABEL } from '@/config/site';
import { LeagueCard } from '@/components/cards/LeagueCard';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { EDITION_LABEL, EDITION_STYLE } from '@/lib/cardArt';
import { EASE_OUT, GOLD_GRADIENT, PANEL_BG, alpha, goldText } from '@/obs/overlay/kit';

type G = Extract<ObsGraphic, { kind: 'walkout' }>;

/** Timing of the presentation (seconds). */
export const WALKOUT_INTRO = 2.4;
export const WALKOUT_PER_PLAYER = 2.8;
export const walkoutDuration = (n: number) => WALKOUT_INTRO + n * WALKOUT_PER_PLAYER + 3.5;

/** Seconds since this graphic went on air (restarts if the page reloads). */
function useClock() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => setT((performance.now() - start) / 1000), 100);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

/** The squad walks out: team intro, then every player with their collectible card, then the whole line-up. */
export function Walkout({ g }: { g: G }) {
  const t = useClock();
  const n = g.players.length;
  const idx = t < WALKOUT_INTRO ? -1 : Math.min(n, Math.floor((t - WALKOUT_INTRO) / WALKOUT_PER_PLAYER));
  const done = idx >= n;
  const color = g.team.primaryColor;
  const current = idx >= 0 && idx < n ? g.players[idx] : null;

  return (
    <div className="relative h-[820px] w-[1720px] overflow-hidden rounded-[32px] border border-white/10 font-display text-white" style={{ background: `radial-gradient(900px 600px at 25% 40%, ${alpha(color, 0.45)}, transparent 65%), ${PANEL_BG}` }}>
      <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
      <motion.span aria-hidden className="absolute inset-y-0 w-[420px]" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.12), transparent)' }} initial={{ x: -500 }} animate={{ x: 2300 }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2.4 }} />

      {/* Header */}
      <div className="absolute inset-x-10 top-7 flex items-center gap-5">
        <TeamCrest team={g.team} size={78} />
        <div className="leading-none">
          <p className="text-[22px] font-bold uppercase tracking-[0.32em] text-amber-300">Presentació · {g.title}</p>
          <p className="mt-2 text-[52px] font-black uppercase">{g.team.name}</p>
        </div>
        {idx >= 0 && !done && (
          <span className="digital ml-auto rounded-2xl border border-white/15 bg-black/40 px-5 py-2 text-[44px] text-amber-300">
            {idx + 1}/{n}
          </span>
        )}
      </div>

      {/* 1) Team intro */}
      <AnimatePresence>
        {idx === -1 && (
          <motion.div key="intro" className="absolute inset-0 flex flex-col items-center justify-center" exit={{ opacity: 0, scale: 1.08, transition: { duration: 0.4 } }}>
            <motion.div initial={{ scale: 0.2, rotate: -25, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', damping: 11, stiffness: 120 }}>
              <TeamCrest team={g.team} size={300} />
            </motion.div>
            <motion.p initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 0.5, ease: EASE_OUT }} className="mt-6 text-[96px] font-black uppercase leading-none" style={goldText}>
              {g.team.name}
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-3 text-[30px] font-bold uppercase tracking-[0.4em] text-slate-300">
              Surten a la pista
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2) One player at a time */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div key={current.player.id} className="absolute inset-x-0 top-[130px] bottom-[150px] flex items-center gap-16 px-24" exit={{ opacity: 0, x: -120, transition: { duration: 0.3 } }}>
            <motion.div initial={{ x: 700, rotateY: -75, rotate: 8, opacity: 0 }} animate={{ x: 0, rotateY: 0, rotate: -3, opacity: 1 }} transition={{ type: 'spring', damping: 14, stiffness: 110 }} style={{ perspective: 1400 }}>
              <LeagueCard player={current.player} team={g.team} edition={current.edition} size={360} tilt={false} />
            </motion.div>
            <div className="relative min-w-0 flex-1">
              <motion.span
                className="absolute -left-6 -top-24 text-[360px] font-black leading-none"
                style={{ color: 'transparent', WebkitTextStroke: `4px ${alpha(color, 0.55)}` }}
                initial={{ opacity: 0, scale: 1.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
              >
                {current.player.dorsal}
              </motion.span>
              <motion.p initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25, duration: 0.5, ease: EASE_OUT }} className="relative text-[28px] font-bold uppercase tracking-[0.3em] text-amber-300">
                #{current.player.dorsal} · {POSITION_LABEL[current.player.position]}
              </motion.p>
              <motion.p initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35, duration: 0.55, ease: EASE_OUT }} className="relative mt-2 truncate text-[110px] font-black uppercase leading-[0.9]">
                {current.player.name}
              </motion.p>
              {current.player.nickname && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="relative mt-2 text-[40px] font-bold italic text-slate-300">
                  «{current.player.nickname}»
                </motion.p>
              )}
              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7, duration: 0.45 }} className="relative mt-8 flex gap-4">
                {(
                  [
                    ['Gols', current.player.stats.goals],
                    ['Assist.', current.player.stats.assists],
                    ['MVPs', current.player.stats.mvpAwards],
                    ['Partits', current.player.stats.matchesPlayed],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="min-w-[140px] rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center">
                    <p className="digital text-[60px] leading-none" style={goldText}>
                      {v}
                    </p>
                    <p className="mt-1 text-[16px] font-bold uppercase tracking-[0.2em] text-slate-400">{k}</p>
                  </div>
                ))}
              </motion.div>
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="relative mt-6 inline-block rounded-full px-5 py-1.5 text-[22px] font-black uppercase tracking-[0.25em] text-slate-950" style={{ background: EDITION_STYLE[current.edition].frame, backgroundSize: '300% 100%', animation: 'll-foil 6s linear infinite' }}>
                Carta {EDITION_LABEL[current.edition]}
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3) Everyone together */}
      <AnimatePresence>
        {done && (
          <motion.div key="all" className="absolute inset-x-0 top-[150px] bottom-[60px] flex flex-col items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-wrap items-end justify-center gap-5 px-10">
              {g.players.map(({ player, edition }, i) => (
                <motion.div key={player.id} initial={{ y: 120, opacity: 0, rotate: (i - n / 2) * 3 }} animate={{ y: 0, opacity: 1, rotate: (i - (n - 1) / 2) * 2.2 }} transition={{ delay: i * 0.08, type: 'spring', damping: 13 }}>
                  <LeagueCard player={player} team={g.team} edition={edition} size={n > 6 ? 170 : 230} tilt={false} />
                </motion.div>
              ))}
            </div>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + n * 0.08 }} className="mt-8 rounded-full px-8 py-2 text-[34px] font-black uppercase tracking-[0.3em] text-slate-950" style={{ background: GOLD_GRADIENT }}>
              {g.title} · {g.team.shortName}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strip of the players already presented */}
      {idx >= 1 && !done && (
        <div className="absolute inset-x-10 bottom-6 flex items-center gap-3">
          {g.players.slice(0, idx).map(({ player }) => (
            <motion.span key={player.id} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg text-[20px] font-black text-slate-950" style={{ background: GOLD_GRADIENT }}>
                {player.dorsal}
              </span>
              <span className="max-w-[180px] truncate text-[22px] font-black uppercase">{player.nickname || player.name.split(' ')[0]}</span>
            </motion.span>
          ))}
        </div>
      )}
    </div>
  );
}
