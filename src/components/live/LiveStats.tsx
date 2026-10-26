import type { MatchStats, ObsTeam } from '@/obs/types';
import { TeamCrest } from '@/components/ui/TeamCrest';

export const STAT_ROWS: { key: keyof MatchStats; label: string }[] = [
  { key: 'shots', label: 'Xuts' },
  { key: 'onTarget', label: 'Xuts a porta' },
  { key: 'saves', label: 'Parades' },
  { key: 'corners', label: 'Córners' },
  { key: 'fouls', label: 'Faltes' },
  { key: 'cards', label: 'Targetes' },
];

export const hasStats = (h: MatchStats, a: MatchStats) => STAT_ROWS.some((r) => h[r.key] + a[r.key] > 0);

/** Match statistics face to face for the public live page. */
export function LiveStats({ home, away, homeStats, awayStats }: { home: ObsTeam; away: ObsTeam; homeStats: MatchStats; awayStats: MatchStats }) {
  return (
    <section className="card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-lg font-black uppercase text-white">
          <TeamCrest team={home} size={28} /> {home.shortName}
        </span>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Estadístiques</h2>
        <span className="flex items-center gap-2 font-display text-lg font-black uppercase text-white">
          {away.shortName} <TeamCrest team={away} size={28} />
        </span>
      </div>
      <ul className="space-y-3">
        {STAT_ROWS.map(({ key, label }) => {
          const h = homeStats[key];
          const a = awayStats[key];
          const total = h + a || 1;
          return (
            <li key={key}>
              <div className="mb-1 grid grid-cols-[40px_1fr_40px] items-end text-sm">
                <span className="digital text-xl text-white">{h}</span>
                <span className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</span>
                <span className="digital text-right text-xl text-white">{a}</span>
              </div>
              <div className="flex h-2 gap-1">
                <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-white/10">
                  <span className="h-full rounded-l-full transition-all duration-700" style={{ width: `${(h / total) * 100}%`, background: home.primaryColor }} />
                </div>
                <div className="flex-1 overflow-hidden rounded-r-full bg-white/10">
                  <span className="block h-full rounded-r-full transition-all duration-700" style={{ width: `${(a / total) * 100}%`, background: away.primaryColor }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
