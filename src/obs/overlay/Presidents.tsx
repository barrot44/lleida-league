import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Crown, Trophy } from 'lucide-react';
import type { ObsGraphic, ObsTeam, PresidentStats } from '@/obs/types';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { EASE_OUT, FormChips, GOLD_GRADIENT, alpha, goldText } from '@/obs/overlay/kit';

type G = Extract<ObsGraphic, { kind: 'presidents' }>;

function CountUp({ to, delay = 0 }: { to: number; delay?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / 1100));
      setV(Math.round(to * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay]);
  return <>{v}</>;
}

/** A president: photo if there is one, otherwise a suited silhouette in the team colours, always crowned. */
function Portrait({ team }: { team: ObsTeam }) {
  return (
    <div className="relative h-[250px] w-[250px]">
      <motion.span className="absolute -top-[62px] left-1/2 -ml-[40px] text-amber-300" initial={{ y: -60, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 1, type: 'spring', damping: 10 }}>
        <Crown size={80} fill="currentColor" strokeWidth={1.4} />
      </motion.span>
      <div className="h-full w-full overflow-hidden rounded-full p-[7px]" style={{ background: GOLD_GRADIENT, boxShadow: `0 0 70px ${alpha(team.primaryColor, 0.8)}` }}>
        {team.presidentPhotoUrl ? (
          <img src={team.presidentPhotoUrl} alt={team.presidentName ?? ''} className="h-full w-full rounded-full object-cover object-top" />
        ) : (
          <svg viewBox="0 0 100 100" className="h-full w-full rounded-full">
            <defs>
              <radialGradient id={`pbg-${team.id}`} cx="50%" cy="35%" r="75%">
                <stop offset="0" stopColor={team.primaryColor} stopOpacity=".75" />
                <stop offset="1" stopColor={team.secondaryColor} />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill={`url(#pbg-${team.id})`} />
            <path d="M8 104c0-26 17-38 42-38s42 12 42 38z" fill="#0b1226" />
            <path d="M38 66l12 16 12-16-6-2-6 7-6-7z" fill="#f8fafc" />
            <path d="M47.5 72h5l2 16-4.5 6-4.5-6z" fill={team.primaryColor} />
            <rect x="43" y="52" width="14" height="14" rx="5" fill="#cbd5e1" />
            <ellipse cx="50" cy="38" rx="15.5" ry="18" fill="#cbd5e1" />
            <path d="M34 34c0-12 7-19 16-19s17 7 16 19c-5-6-10-8-16-8s-11 2-16 8z" fill="#0f172a" opacity=".85" />
          </svg>
        )}
      </div>
    </div>
  );
}

function Side({ team, stats, side }: { team: ObsTeam; stats: PresidentStats; side: 'home' | 'away' }) {
  const home = side === 'home';
  const rows: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
    ...(stats.lleidalitos !== null ? [{ icon: <Coins size={30} />, label: 'Lleidalitos', value: <CountUp to={stats.lleidalitos} delay={1.1} /> }] : []),
    { icon: <Trophy size={30} />, label: 'Títols', value: <CountUp to={stats.titles} delay={1.25} /> },
    ...(stats.position !== null ? [{ icon: <span className="text-[26px] font-black">#</span>, label: 'Posició', value: <>{stats.position}º · {stats.points} pts</> }] : []),
  ];
  return (
    <motion.div
      initial={{ x: home ? -900 : 900, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.75, ease: EASE_OUT }}
      className={`relative flex w-[760px] flex-col items-center ${home ? '' : ''}`}
    >
      <Portrait team={team} />
      <p className="mt-6 line-clamp-2 max-w-[640px] text-center font-black uppercase leading-[0.95]" style={{ fontSize: (team.presidentName ?? '').length > 18 ? 46 : 62 }}>
        {team.presidentName || 'President'}
      </p>
      <p className="mt-3 flex items-center gap-3 text-[26px] font-bold uppercase tracking-[0.2em] text-slate-300">
        <TeamCrest team={team} size={40} /> President · {team.shortName}
      </p>
      <div className="mt-7 w-[560px] space-y-2.5">
        {rows.map((r, i) => (
          <motion.div
            key={r.label}
            initial={{ x: home ? -60 : 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.9 + i * 0.12, duration: 0.45 }}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/35 px-5 py-2.5"
          >
            <span className="text-amber-300">{r.icon}</span>
            <span className="flex-1 text-[22px] font-bold uppercase tracking-[0.18em] text-slate-300">{r.label}</span>
            <span className="digital text-[40px] leading-none" style={goldText}>
              {r.value}
            </span>
          </motion.div>
        ))}
        {stats.form.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/35 px-5 py-2.5">
            <span className="text-[22px] font-bold uppercase tracking-[0.18em] text-slate-300">Ratxa</span>
            <FormChips form={stats.form} size={34} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/** "Una batalla presidencial": the two presidents face to face. */
export function Presidents({ g }: { g: G }) {
  const total = g.h2h.homeWins + g.h2h.draws + g.h2h.awayWins;
  const pct = (n: number) => (total ? (n / total) * 100 : 33.3);
  return (
    <div className="relative h-[860px] w-[1720px] overflow-hidden rounded-[32px] border border-white/10 font-display text-white">
      {/* Split background in both team colours */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(105deg, ${alpha(g.home.primaryColor, 0.75)} 0%, ${alpha(g.home.secondaryColor, 0.7)} 44%, #05070c 50%, ${alpha(g.away.secondaryColor, 0.7)} 56%, ${alpha(g.away.primaryColor, 0.75)} 100%)` }} />
      <div aria-hidden className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'repeating-linear-gradient(105deg, #fff 0 2px, transparent 2px 34px)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(5,7,12,.75) 85%)' }} />

      <motion.p initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="absolute inset-x-0 top-6 text-center text-[30px] font-black uppercase tracking-[0.45em] text-amber-300">
        Una batalla presidencial · {g.categoryLabel}
      </motion.p>

      <div className="absolute inset-x-0 top-[110px] flex justify-between px-4">
        <Side team={g.home} stats={g.homeStats} side="home" />
        <Side team={g.away} stats={g.awayStats} side="away" />
      </div>

      {/* VS: a gold medallion on a lightning bolt, centred between the two portraits. */}
      <motion.div
        className="absolute left-1/2 top-[120px] -ml-[120px] grid h-[240px] w-[240px] place-items-center"
        initial={{ scale: 3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.7, type: 'spring', damping: 9, stiffness: 140 }}
      >
        <svg viewBox="0 0 100 100" className="absolute h-full w-full drop-shadow-[0_0_30px_rgba(251,191,36,.7)]">
          <defs>
            <linearGradient id="bolt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fef3c7" />
              <stop offset=".5" stopColor="#fbbf24" />
              <stop offset="1" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <path d="M60 0 22 58h24L36 100l42-62H54z" fill="url(#bolt)" stroke="#fff7d6" strokeWidth="1.2" />
        </svg>
        <motion.span
          className="relative grid h-[150px] w-[150px] place-items-center rounded-full p-[6px]"
          style={{ background: GOLD_GRADIENT }}
          animate={{ boxShadow: ['0 0 30px rgba(251,191,36,.45)', '0 0 90px rgba(251,191,36,.95)', '0 0 30px rgba(251,191,36,.45)'] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >
          <span className="grid h-full w-full place-items-center rounded-full bg-[#05070c]">
            <span className="pr-[6px] text-[78px] font-black italic leading-none" style={goldText}>
              VS
            </span>
          </span>
        </motion.span>
      </motion.div>

      {/* Head to head, in the centre column under the VS */}
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.6, duration: 0.5 }} className="absolute left-1/2 top-[400px] -ml-[170px] w-[340px] text-center">
        <p className="text-[18px] font-bold uppercase tracking-[0.3em] text-slate-300">Cara a cara</p>
        {total === 0 ? (
          <p className="mt-3 text-[34px] font-black uppercase leading-[0.95] text-white">
            Primer
            <br />
            duel!
          </p>
        ) : (
          <>
            <p className="digital mt-2 flex items-center justify-center gap-3 text-[64px] leading-none">
              <span style={{ color: g.home.primaryColor, textShadow: '0 0 20px rgba(0,0,0,.6)' }}>{g.h2h.homeWins}</span>
              <span className="text-slate-400">{g.h2h.draws}</span>
              <span style={{ color: g.away.primaryColor, textShadow: '0 0 20px rgba(0,0,0,.6)' }}>{g.h2h.awayWins}</span>
            </p>
            <p className="mt-1 text-[15px] font-bold uppercase tracking-[0.2em] text-slate-400">Vict. · Emp. · Vict.</p>
            <div className="mx-auto mt-3 flex h-[14px] w-[300px] overflow-hidden rounded-full border border-white/15">
              <motion.span initial={{ width: 0 }} animate={{ width: `${pct(g.h2h.homeWins)}%` }} transition={{ delay: 1.9, duration: 0.8 }} style={{ background: g.home.primaryColor }} />
              <motion.span initial={{ width: 0 }} animate={{ width: `${pct(g.h2h.draws)}%` }} transition={{ delay: 1.9, duration: 0.8 }} className="bg-slate-500" />
              <motion.span initial={{ width: 0 }} animate={{ width: `${pct(g.h2h.awayWins)}%` }} transition={{ delay: 1.9, duration: 0.8 }} style={{ background: g.away.primaryColor }} />
            </div>
            {g.h2h.last && <p className="mt-3 text-[18px] font-bold uppercase leading-tight text-slate-300">Últim: {g.h2h.last}</p>}
          </>
        )}
      </motion.div>
    </div>
  );
}
