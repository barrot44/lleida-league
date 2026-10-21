import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CalendarX2 } from 'lucide-react';
import type { Match, MatchStatus } from '@/types';
import { MatchCard } from '@/components/calendar/MatchCard';
import { EmptyState, PageHeader } from '@/components/ui/Section';
import { CATEGORY_BY_ID } from '@/config/site';
import { useUiStore } from '@/store/useUiStore';
import { useLeagueView } from '@/hooks/useLeagueView';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | MatchStatus;

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'live', label: 'En vivo' },
  { id: 'finished', label: 'Finalizados' },
  { id: 'scheduled', label: 'Próximos' },
];

const chip = (active: boolean) =>
  cn(
    'shrink-0 rounded-xl border px-3.5 py-2 font-display text-sm font-black uppercase tracking-wide transition',
    active ? 'border-amber-400 bg-gold-gradient text-slate-950 shadow-glow' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-amber-400/50 hover:text-white',
  );

export default function CalendarPage() {
  const category = useUiStore((s) => s.category);
  const view = useLeagueView(category);
  const cat = CATEGORY_BY_ID[category];

  const matchdays = useMemo(() => [...new Set(view.catMatches.map((m) => m.matchday))].sort((a, b) => a - b), [view.catMatches]);
  const currentMatchday = useMemo(() => {
    const pending = view.catMatches.find((m) => m.status !== 'finished');
    return pending?.matchday ?? matchdays[matchdays.length - 1] ?? 1;
  }, [view.catMatches, matchdays]);

  const [matchday, setMatchday] = useState<number | 'all'>(currentMatchday);
  const [status, setStatus] = useState<StatusFilter>('all');
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => setMatchday(currentMatchday), [category]);

  useEffect(() => {
    scroller.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [matchday, category]);

  const counts = useMemo(() => {
    const base = matchday === 'all' ? view.catMatches : view.catMatches.filter((m) => m.matchday === matchday);
    return {
      all: base.length,
      live: base.filter((m) => m.status === 'live').length,
      finished: base.filter((m) => m.status === 'finished').length,
      scheduled: base.filter((m) => m.status === 'scheduled').length,
    };
  }, [view.catMatches, matchday]);

  const groups = useMemo(() => {
    const filtered = view.catMatches.filter((m) => (matchday === 'all' || m.matchday === matchday) && (status === 'all' || m.status === status));
    const map = new Map<number, Match[]>();
    filtered.forEach((m) => map.set(m.matchday, [...(map.get(m.matchday) ?? []), m]));
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [view.catMatches, matchday, status]);

  let cardIndex = 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow={cat.label} title="Calendario y resultados" description="Filtra por jornada y estado. Abre la ficha de cualquier partido para ver goleadores, tarjetas y MVP." />

      <div className="mb-7 space-y-3">
        <div ref={scroller} className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Jornada">
          <button role="tab" aria-selected={matchday === 'all'} data-active={matchday === 'all'} onClick={() => setMatchday('all')} className={chip(matchday === 'all')}>
            Todas
          </button>
          {matchdays.map((d) => (
            <button key={d} role="tab" aria-selected={matchday === d} data-active={matchday === d} onClick={() => setMatchday(d)} className={chip(matchday === d)}>
              J{d}
              {d === currentMatchday && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-middle" title="Jornada actual" />}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Estado del partido">
          {STATUS_TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={status === t.id} onClick={() => setStatus(t.id)} className={chip(status === t.id)}>
              {t.label} <span className="ml-1 opacity-60">{counts[t.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={<CalendarX2 />} title="Sin partidos" hint="No hay partidos con estos filtros. Prueba con otra jornada o estado." />
      ) : (
        <div className="space-y-10">
          <AnimatePresence mode="popLayout">
            {groups.map(([day, list]) => (
              <section key={day}>
                {matchday === 'all' && <h2 className="section-title mb-4 !text-2xl">Jornada {day}</h2>}
                <div className="grid gap-4 lg:grid-cols-2">
                  {list.map((m) => {
                    const home = view.teamMap.get(m.homeTeamId);
                    const away = view.teamMap.get(m.awayTeamId);
                    return home && away ? <MatchCard key={m.id} match={m} home={home} away={away} index={cardIndex++} /> : null;
                  })}
                </div>
              </section>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
