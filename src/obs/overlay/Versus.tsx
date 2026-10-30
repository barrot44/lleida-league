import { motion } from 'framer-motion';
import type { ObsGraphic, ObsStandingRow, ObsTeam } from '@/obs/types';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { formatDateLong } from '@/lib/utils';
import { EASE_OUT, FormChips, GOLD_GRADIENT, alpha, goldText } from '@/obs/overlay/kit';

type G = Extract<ObsGraphic, { kind: 'preview' }>;

/** Tiny deterministic random, so every copy of the overlay draws the same sparks. */
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const VS_AT = 0.95;

function Side({ team, row, home }: { team: ObsTeam; row: ObsStandingRow | null; home: boolean }) {
  const dir = home ? -1 : 1;
  const nameSize = team.name.length > 20 ? 70 : team.name.length > 14 ? 84 : 100;
  return (
    <div className="absolute top-0 flex h-full w-1/2 flex-col items-center justify-center" style={{ [home ? 'left' : 'right']: 0, paddingBottom: 40 }}>
      {/* Halo of the team colour behind the crest */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 0.85] }}
        transition={{ delay: 0.55, duration: 0.9, ease: EASE_OUT }}
        className="absolute h-[620px] w-[620px] rounded-full"
        style={{ top: 120, background: `radial-gradient(closest-side, ${alpha(team.primaryColor, 0.75)}, transparent)` }}
      />
      <motion.div
        initial={{ x: dir * 900, scale: 2.6, rotate: dir * -35, opacity: 0 }}
        animate={{ x: 0, scale: 1, rotate: 0, opacity: 1 }}
        transition={{ delay: 0.45, type: 'spring', damping: 13, stiffness: 120 }}
      >
        <motion.div animate={{ y: [0, -12, 0] }} transition={{ delay: 2, duration: 3.4, repeat: Infinity, ease: 'easeInOut' }} style={{ filter: `drop-shadow(0 30px 50px rgba(0,0,0,.7)) drop-shadow(0 0 40px ${alpha(team.primaryColor, 0.8)})` }}>
          <TeamCrest team={team} size={330} />
        </motion.div>
      </motion.div>
      <div className="mt-8 overflow-hidden px-10">
        <motion.p
          initial={{ y: 140 }}
          animate={{ y: 0 }}
          transition={{ delay: 1.2, duration: 0.6, ease: EASE_OUT }}
          className="text-center font-black uppercase leading-[0.92] text-white"
          style={{ fontSize: nameSize, textShadow: '0 10px 40px rgba(0,0,0,.8)' }}
        >
          {team.name}
        </motion.p>
      </div>
      {team.presidentName && (
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.45, duration: 0.5 }} className="mt-3 text-[26px] font-bold uppercase tracking-[0.25em] text-white/75">
          President: {team.presidentName}
        </motion.p>
      )}
      {row && (
        <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.7, type: 'spring', damping: 12 }} className="mt-6 flex items-center gap-5">
          <span className="rounded-xl px-5 py-2 text-[32px] font-black text-slate-950" style={{ background: GOLD_GRADIENT }}>
            {row.position}º · {row.points} pts
          </span>
          <FormChips form={row.form} size={36} />
        </motion.div>
      )}
    </div>
  );
}

/**
 * «Qui contra qui», full-screen version: the two team colours crash into each other, the crests fly in, VS slams
 * with a shockwave and sparks, then names, presidents, table position and the match details.
 */
export function VersusEpic({ g, accent }: { g: G; accent: string }) {
  const when = [g.matchday ? `Jornada ${g.matchday}` : null, g.date ? formatDateLong(g.date) : null, g.time || null].filter(Boolean).join(' · ');
  const h = g.home;
  const a = g.away;
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      className="absolute inset-0 z-40 overflow-hidden bg-[#05070c] font-display text-white"
    >
      {/* Screen shake on the VS */}
      <motion.div className="absolute inset-0" animate={{ x: [0, 0, -18, 14, -9, 5, 0], y: [0, 0, 10, -8, 5, -2, 0] }} transition={{ delay: VS_AT, duration: 0.5, times: [0, 0.01, 0.2, 0.4, 0.6, 0.8, 1] }}>
        {/* The two colours crashing in */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          transition={{ duration: 0.55, ease: EASE_OUT }}
          className="absolute inset-0"
          style={{ clipPath: 'polygon(0 0, 56% 0, 44% 100%, 0 100%)', background: `linear-gradient(120deg, ${h.primaryColor} 0%, ${alpha(h.secondaryColor, 0.95)} 55%, #05070c 100%)` }}
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          transition={{ duration: 0.55, ease: EASE_OUT }}
          className="absolute inset-0"
          style={{ clipPath: 'polygon(56% 0, 100% 0, 100% 100%, 44% 100%)', background: `linear-gradient(240deg, ${a.primaryColor} 0%, ${alpha(a.secondaryColor, 0.95)} 55%, #05070c 100%)` }}
        />
        {/* Darkening + texture */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,.15) 0%, rgba(0,0,0,.65) 100%)' }} />
        <div aria-hidden className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'repeating-linear-gradient(120deg, #fff 0 2px, transparent 2px 22px)' }} />
        {/* Giant short names drifting behind */}
        <motion.span initial={{ x: -200, opacity: 0 }} animate={{ x: 60, opacity: 0.14 }} transition={{ delay: 0.3, duration: 9, ease: 'linear' }} className="absolute left-0 top-[40px] text-[360px] font-black leading-none" style={{ color: 'transparent', WebkitTextStroke: '4px #fff' }}>
          {h.shortName}
        </motion.span>
        <motion.span initial={{ x: 200, opacity: 0 }} animate={{ x: -60, opacity: 0.14 }} transition={{ delay: 0.3, duration: 9, ease: 'linear' }} className="absolute bottom-[40px] right-0 text-[360px] font-black leading-none" style={{ color: 'transparent', WebkitTextStroke: '4px #fff' }}>
          {a.shortName}
        </motion.span>

        {/* The gold seam where they meet */}
        <div className="absolute left-1/2 top-[-10%] h-[120%] w-[10px]" style={{ transform: 'translateX(-50%) rotate(12deg)' }}>
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.4, duration: 0.45, ease: EASE_OUT }}
            className="h-full w-full origin-top"
            style={{ background: GOLD_GRADIENT, boxShadow: '0 0 40px 10px rgba(251,191,36,.6)' }}
          />
        </div>

        <Side team={h} row={g.homeRow} home />
        <Side team={a} row={g.awayRow} home={false} />

        {/* VS slam */}
        <div className="absolute inset-0 grid place-items-center" style={{ paddingBottom: 120 }}>
          <motion.div initial={{ scale: 0, opacity: 0.9 }} animate={{ scale: [0, 9], opacity: [0.9, 0] }} transition={{ delay: VS_AT, duration: 0.8, ease: 'easeOut' }} className="absolute h-[140px] w-[140px] rounded-full border-[10px] border-amber-200" />
          {Array.from({ length: 46 }, (_, i) => {
            const ang = rnd(i, 1) * Math.PI * 2;
            const dist = 260 + rnd(i, 2) * 620;
            return (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
                animate={{ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, opacity: [0, 1, 0], scale: [1, 1, 0.3] }}
                transition={{ delay: VS_AT, duration: 0.9 + rnd(i, 3) * 0.5, ease: 'easeOut' }}
                className="absolute h-[6px] w-[34px] rounded-full"
                style={{ background: i % 3 ? '#FDE68A' : '#fff', rotate: `${(ang * 180) / Math.PI}deg`, boxShadow: '0 0 14px #F59E0B' }}
              />
            );
          })}
          <motion.span
            initial={{ scale: 4.5, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: -6 }}
            transition={{ delay: VS_AT, type: 'spring', damping: 9, stiffness: 220 }}
            className="relative text-[260px] font-black italic leading-none"
            style={{ ...goldText, filter: 'drop-shadow(0 0 40px rgba(251,191,36,.75)) drop-shadow(0 18px 30px rgba(0,0,0,.8))' }}
          >
            VS
          </motion.span>
        </div>

        {/* Light sweep, every few seconds */}
        <motion.div
          initial={{ x: '-40vw' }}
          animate={{ x: ['-40vw', '140vw'] }}
          transition={{ delay: 1.6, duration: 1.1, repeat: Infinity, repeatDelay: 3.2, ease: 'easeInOut' }}
          className="absolute top-[-20%] h-[140%] w-[220px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,240,200,.35), transparent)', transform: 'rotate(14deg)', mixBlendMode: 'screen' }}
        />
      </motion.div>

      {/* Top: category; bottom: when and where */}
      <motion.div initial={{ y: -120 }} animate={{ y: 0 }} transition={{ delay: 1.5, duration: 0.55, ease: EASE_OUT }} className="absolute inset-x-0 top-[44px] flex justify-center">
        <span className="rounded-full px-10 py-3 text-[30px] font-black uppercase tracking-[0.4em] text-slate-950 shadow-2xl" style={{ background: accent }}>
          {g.categoryLabel}
        </span>
      </motion.div>
      {(when || g.venue) && (
        <motion.div initial={{ y: 160 }} animate={{ y: 0 }} transition={{ delay: 1.75, duration: 0.55, ease: EASE_OUT }} className="absolute inset-x-0 bottom-[44px] flex justify-center">
          <div className="rounded-2xl border border-white/15 bg-black/70 px-12 py-4 text-center backdrop-blur">
            {when && <p className="text-[36px] font-black uppercase tracking-wide text-white">{when}</p>}
            {g.venue && <p className="mt-1 text-[24px] font-bold uppercase tracking-[0.25em] text-amber-200/80">{g.venue}</p>}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
