import { motion } from 'framer-motion';
import type { ObsGraphic } from '@/obs/types';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { Board, EASE_OUT, alpha, listItem, listParent } from '@/obs/overlay/kit';

type G = Extract<ObsGraphic, { kind: 'stats' }>;

/** Match statistics face to face, TV style. */
export function StatsGraphic({ g, accent }: { g: G; accent: string }) {
  const rows: [string, number, number][] = [
    ['Gols', g.homeScore, g.awayScore],
    ['Xuts', g.homeStats.shots, g.awayStats.shots],
    ['Xuts a porta', g.homeStats.onTarget, g.awayStats.onTarget],
    ['Parades', g.homeStats.saves, g.awayStats.saves],
    ['Córners', g.homeStats.corners, g.awayStats.corners],
    ['Faltes', g.homeStats.fouls, g.awayStats.fouls],
    ['Targetes', g.homeStats.cards, g.awayStats.cards],
  ];
  return (
    <Board eyebrow="Estadístiques del partit" title={g.title} accent={accent} width={1300}>
      <div className="mb-5 flex items-center justify-between">
        <span className="flex items-center gap-4 text-[40px] font-black uppercase text-white">
          <TeamCrest team={g.home} size={70} /> {g.home.shortName}
        </span>
        <span className="flex items-center gap-4 text-[40px] font-black uppercase text-white">
          {g.away.shortName} <TeamCrest team={g.away} size={70} />
        </span>
      </div>
      <motion.ul variants={listParent} initial="hidden" animate="show" className="space-y-4">
        {rows.map(([label, h, a], i) => {
          const total = h + a || 1;
          return (
            <motion.li key={label} variants={listItem}>
              <div className="mb-1.5 grid grid-cols-[110px_1fr_110px] items-end">
                <span className="digital text-[52px] leading-none text-white">{h}</span>
                <span className="text-center text-[22px] font-bold uppercase tracking-[0.25em] text-slate-300">{label}</span>
                <span className="digital text-right text-[52px] leading-none text-white">{a}</span>
              </div>
              <div className="flex h-[16px] gap-1.5">
                <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-white/10">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${(h / total) * 100}%` }} transition={{ delay: 0.4 + i * 0.08, duration: 0.8, ease: EASE_OUT }} className="h-full rounded-l-full" style={{ background: g.home.primaryColor, boxShadow: `0 0 18px ${alpha(g.home.primaryColor, 0.7)}` }} />
                </div>
                <div className="flex-1 overflow-hidden rounded-r-full bg-white/10">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${(a / total) * 100}%` }} transition={{ delay: 0.4 + i * 0.08, duration: 0.8, ease: EASE_OUT }} className="block h-full rounded-r-full" style={{ background: g.away.primaryColor, boxShadow: `0 0 18px ${alpha(g.away.primaryColor, 0.7)}` }} />
                </div>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </Board>
  );
}
