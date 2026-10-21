import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { CategoryMeta, Match, Team } from '@/types';
import { EmptyState } from '@/components/ui/Section';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { computeStandings } from '@/lib/standings';
import { cn } from '@/lib/utils';

interface Props {
  teams: Team[];
  matches: Match[];
  category: CategoryMeta;
}

/** Bump chart: the position of every team after each matchday. Hover or tap a team to highlight its path. */
export function PositionChart({ teams, matches, category }: Props) {
  const [focus, setFocus] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const active = locked ?? focus;

  const days = useMemo(() => [...new Set(matches.filter((m) => m.status === 'finished').map((m) => m.matchday))].sort((a, b) => a - b), [matches]);

  const series = useMemo(() => {
    const map = new Map<string, number[]>(teams.map((t) => [t.id, []]));
    for (const d of days) {
      const upTo = matches.filter((m) => m.status === 'finished' && m.matchday <= d);
      for (const row of computeStandings(teams, upTo, category.id)) map.get(row.team.id)?.push(row.position);
    }
    return map;
  }, [days, matches, teams, category.id]);

  if (days.length < 2 || teams.length < 2) {
    return <EmptyState icon={<TrendingUp />} title="Encara no hi ha evolució" hint="Cal haver disputat almenys dues jornades perquè aparegui el gràfic." />;
  }

  const W = 820;
  const left = 36;
  const right = 70;
  const top = 26;
  const rowH = 30;
  const H = top * 2 + (teams.length - 1) * rowH + 26;
  const x = (i: number) => left + (i * (W - left - right)) / (days.length - 1);
  const y = (p: number) => top + (p - 1) * rowH;

  return (
    <div className="card p-4 sm:p-6">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[560px] w-full" role="img" aria-label="Evolució de la classificació jornada a jornada">
          {Array.from({ length: teams.length }, (_, i) => i + 1).map((p) => (
            <g key={p}>
              <line x1={left} x2={W - right} y1={y(p)} y2={y(p)} stroke="rgba(255,255,255,.06)" />
              <text x={left - 12} y={y(p) + 4} textAnchor="end" fontSize="11" fill="#64748b" fontWeight="700">
                {p}
              </text>
            </g>
          ))}
          {days.map((d, i) => (
            <text key={d} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="700">
              J{d}
            </text>
          ))}
          {teams.map((t) => {
            const pts = series.get(t.id) ?? [];
            if (pts.length < 2) return null;
            const dim = active !== null && active !== t.id;
            const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p)}`).join(' ');
            const last = pts[pts.length - 1];
            return (
              <g key={t.id} opacity={dim ? 0.12 : 1} style={{ transition: 'opacity .25s' }}>
                <path d={path} fill="none" stroke={t.primaryColor} strokeWidth={active === t.id ? 5 : 2.5} strokeLinejoin="round" strokeLinecap="round" />
                {pts.map((p, i) => (
                  <circle key={i} cx={x(i)} cy={y(p)} r={active === t.id ? 4.5 : 3} fill={t.primaryColor} stroke="#0b0e14" strokeWidth="1.5" />
                ))}
                <text x={x(pts.length - 1) + 12} y={y(last) + 4} fontSize="12" fontWeight="800" fill={t.primaryColor}>
                  {t.shortName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {teams.map((t) => (
          <button
            key={t.id}
            onMouseEnter={() => setFocus(t.id)}
            onMouseLeave={() => setFocus(null)}
            onClick={() => setLocked((l) => (l === t.id ? null : t.id))}
            aria-pressed={locked === t.id}
            className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-bold transition', locked === t.id ? 'border-amber-400 bg-amber-400/15 text-white' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30')}
          >
            <TeamCrest team={t} size={14} /> {t.shortName}
          </button>
        ))}
        {locked && (
          <button onClick={() => setLocked(null)} className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 underline hover:text-white">
            Treu el ressaltat
          </button>
        )}
      </div>
    </div>
  );
}
