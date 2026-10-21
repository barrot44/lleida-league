import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Radio, Sparkles } from 'lucide-react';
import { Particles } from '@/components/home/Particles';
import { Countdown } from '@/components/home/Countdown';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { CATEGORY_BY_ID, SITE } from '@/config/site';
import { hrefFor } from '@/hooks/useHashRoute';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { useLeagueView } from '@/hooks/useLeagueView';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useNow } from '@/hooks/useNow';
import { matchTimestamp } from '@/lib/utils';

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export function Hero() {
  const category = useUiStore((s) => s.category);
  const openModal = useUiStore((s) => s.openModal);
  const allMatches = useLeagueStore((s) => s.matches);
  const view = useLeagueView(category);
  const now = useNow(30_000);
  const xl = useMediaQuery('(min-width: 1280px)');
  const lg = useMediaQuery('(min-width: 1024px)');
  const cat = CATEGORY_BY_ID[category];

  const live = view.catMatches.find((m) => m.status === 'live');
  const next = useMemo(() => {
    const upcoming = (list: typeof allMatches) => list.filter((m) => m.status === 'scheduled' && matchTimestamp(m) > now).sort((a, b) => matchTimestamp(a) - matchTimestamp(b))[0];
    return upcoming(view.catMatches) ?? upcoming(allMatches);
  }, [view.catMatches, allMatches, now]);

  const { mvp, scorer, matchday } = useMemo(() => {
    const finished = view.catMatches.filter((m) => m.status === 'finished');
    const lastDay = finished.reduce((max, m) => Math.max(max, m.matchday), 0);
    const impact = (m: (typeof finished)[number]) =>
      m.events.filter((e) => e.playerId === m.mvpPlayerId && e.type === 'goal').length + m.events.filter((e) => e.assistPlayerId === m.mvpPlayerId).length;
    const best = finished
      .filter((m) => m.matchday === lastDay && m.mvpPlayerId)
      .sort((a, b) => impact(b) - impact(a))[0];
    const mvpPlayer = (best?.mvpPlayerId && view.playerMap.get(best.mvpPlayerId)) || [...view.catPlayers].sort((a, b) => b.stats.mvpAwards - a.stats.mvpAwards)[0];
    const top = [...view.catPlayers].sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists)[0];
    return { mvp: mvpPlayer, scorer: top, matchday: lastDay };
  }, [view]);

  const nextHome = next ? view.teamMap.get(next.homeTeamId) : undefined;
  const nextAway = next ? view.teamMap.get(next.awayTeamId) : undefined;
  const liveHome = live ? view.teamMap.get(live.homeTeamId) : undefined;
  const liveAway = live ? view.teamMap.get(live.awayTeamId) : undefined;
  const cardSize = xl ? 250 : lg ? 205 : 225;

  return (
    <section className="relative isolate overflow-hidden border-b border-white/[0.06]">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-70" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: `radial-gradient(60% 55% at 78% 30%, ${cat.accent}26, transparent 70%), radial-gradient(45% 60% at 8% 90%, rgba(6,182,212,.14), transparent 70%)` }}
      />
      <Particles />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div className="min-w-0">
          <motion.div {...rise(0)} className="mb-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">
              <Sparkles size={13} /> Futsal · Lleida · Des del {SITE.since}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: cat.accent }}>
              {cat.label}
            </span>
          </motion.div>

          <motion.h1 {...rise(0.08)} className="text-[clamp(2.6rem,7.5vw,5.6rem)] leading-[0.92]">
            Més que un joc,
            <span className="neon-gold mt-1 block">una batalla presidencial</span>
          </motion.h1>

          <motion.p {...rise(0.16)} className="mt-6 max-w-xl text-lg text-slate-300">
            La lliga de futbol sala de Lleida en una sola app: classificació en directe, resultats, golejadors i MVPs de les quatre competicions.
          </motion.p>

          <motion.div {...rise(0.24)} className="mt-7 flex flex-wrap gap-3">
            <a href={hrefFor('standings')} className="btn-gold">
              Veure la classificació <ArrowRight size={16} />
            </a>
            <a href={hrefFor('calendar')} className="btn-ghost">
              Calendari i resultats
            </a>
          </motion.div>

          <motion.div {...rise(0.32)} className="mt-9 space-y-4">
            {live && liveHome && liveAway && (
              <button
                onClick={() => openModal({ kind: 'match', id: live.id })}
                className="group relative flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-red-500/40 bg-red-500/[0.08] p-4 text-left shadow-red transition hover:border-red-400"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/20 text-red-300">
                  <Radio size={22} className="animate-pulse-live" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-300">En directe ara · {live.liveMinute ? `${live.liveMinute}'` : 'Jornada ' + live.matchday}</p>
                  <p className="mt-1 flex items-center gap-2 font-display text-xl font-black uppercase text-white">
                    <TeamCrest team={liveHome} size={22} /> {liveHome.shortName}
                    <span className="digital rounded-lg bg-black/50 px-2.5 text-2xl text-amber-300">
                      {live.homeScore} - {live.awayScore}
                    </span>
                    {liveAway.shortName} <TeamCrest team={liveAway} size={22} />
                  </p>
                </div>
                <ArrowRight className="shrink-0 text-red-300 transition-transform group-hover:translate-x-1" />
              </button>
            )}
            {next && nextHome && nextAway && <Countdown match={next} home={nextHome} away={nextAway} />}
          </motion.div>
        </div>

        <motion.div {...rise(0.2)} className="relative min-w-0">
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${cat.accent}40, transparent 65%)` }}
          />
          <div className="hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 pt-2 lg:mx-0 lg:justify-center lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-10">
            {mvp && (
              <div className="shrink-0 snap-center lg:z-10 lg:-rotate-3">
                <PlayerCard player={mvp} team={view.teamMap.get(mvp.teamId)} size={cardSize} ribbon={matchday ? `MVP · J${matchday}` : 'MVP'} onClick={() => openModal({ kind: 'player', id: mvp.id })} />
                <p className="mt-3 text-center text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">MVP de la setmana</p>
              </div>
            )}
            {scorer && (
              <div className="shrink-0 snap-center lg:-ml-5 lg:translate-y-10 lg:rotate-3">
                <PlayerCard player={scorer} team={view.teamMap.get(scorer.teamId)} size={cardSize} ribbon="Pitxitxi" onClick={() => openModal({ kind: 'player', id: scorer.id })} />
                <p className="mt-3 text-center text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">Màxim golejador actual</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
