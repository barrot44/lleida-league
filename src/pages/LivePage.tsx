import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ExternalLink, Radio, Timer } from 'lucide-react';
import type { ObsState } from '@/obs/types';
import { clockText, PERIOD_LABEL } from '@/obs/state';
import { cardIsLive, cardRemaining, mmss } from '@/obs/cards';
import { isLive, streamEmbed, useLiveState } from '@/lib/live';
import { useOpenPoll } from '@/lib/mvp';
import { celebrate } from '@/lib/confetti';
import { MvpVoteBox } from '@/components/vote/MvpVoteBox';
import { LiveStats, hasStats } from '@/components/live/LiveStats';
import { AppCard } from '@/components/live/AppCard';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { EmptyState, PageHeader } from '@/components/ui/Section';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useNow } from '@/hooks/useNow';
import { hrefFor } from '@/hooks/useHashRoute';
import { formatDay, matchTimestamp } from '@/lib/utils';

function Fouls({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-1" title={`${n} faltes acumulades`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="h-1.5 w-4 rounded-sm" style={{ background: i < n ? (n >= 5 ? '#EF4444' : '#FBBF24') : 'rgba(255,255,255,.14)' }} />
      ))}
    </span>
  );
}

function Scoreboard({ s, now }: { s: ObsState; now: number }) {
  const sb = s.scoreboard;
  const halted = sb.period === 'DESC' || sb.period === 'FINAL' || sb.period === 'PEN';
  if (!sb.home || !sb.away) return null;
  const side = (team: NonNullable<typeof sb.home>, fouls: number, right: boolean) => (
    <div className={`flex flex-1 flex-col items-center gap-2 ${right ? 'sm:items-start' : 'sm:items-end'}`}>
      <TeamCrest team={team} size={84} />
      <span className="max-w-[16rem] text-center font-display text-lg font-black uppercase leading-tight text-white sm:text-2xl">{team.name}</span>
      <Fouls n={fouls} />
    </div>
  );
  return (
    <div className="scoreboard relative overflow-hidden rounded-3xl border border-white/10 px-4 py-6 sm:px-8" style={{ background: `radial-gradient(60% 120% at 0% 0%, ${sb.home.primaryColor}44, transparent 60%), radial-gradient(60% 120% at 100% 0%, ${sb.away.primaryColor}44, transparent 60%)` }}>
      <div className="mb-4 flex items-center justify-center gap-3">
        <span className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white">
          <span className="h-2 w-2 animate-pulse-live rounded-full bg-white" /> En directe
        </span>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{s.categoryLabel}{sb.matchday ? ` · Jornada ${sb.matchday}` : ''}</span>
      </div>
      <div className="flex items-center gap-3 sm:gap-6">
        {side(sb.home, sb.homeFouls, false)}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 sm:gap-4">
            {[sb.homeScore, sb.awayScore].map((v, i) => (
              <span key={i} className="flex items-center">
                {i === 1 && <span className="digital mx-1 text-4xl text-slate-600 sm:text-6xl">:</span>}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={v} initial={{ y: 40, opacity: 0, scale: 1.5 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 14 }} className="digital text-6xl text-gold-gradient sm:text-8xl">
                    {v}
                  </motion.span>
                </AnimatePresence>
              </span>
            ))}
          </div>
          <span className="mt-2 rounded-xl bg-gold-gradient px-4 py-1 font-display text-xl font-black text-slate-950 sm:text-2xl">{halted ? PERIOD_LABEL[sb.period] : clockText(sb.clock, now)}</span>
          {!halted && <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">{PERIOD_LABEL[sb.period]}</span>}
        </div>
        {side(sb.away, sb.awayFouls, true)}
      </div>
    </div>
  );
}

/** `/directe`: follow the match that is being streamed (score, clock, cards, vote and the video). */
export default function LivePage() {
  const s = useLiveState(3000);
  const now = useNow(500);
  const poll = useOpenPoll();
  const matches = useLeagueStore((st) => st.matches);
  const teams = useLeagueStore((st) => st.teams);
  const live = isLive(s, now);
  const lastGoal = useRef<string | null>(null);

  // Confetti when a goal arrives while you are watching.
  useEffect(() => {
    const f = s?.flash;
    if (!f || f.kind !== 'goal') return;
    if (lastGoal.current === null) {
      lastGoal.current = f.id;
      return;
    }
    if (f.id !== lastGoal.current && Date.now() - f.at < 30_000) {
      lastGoal.current = f.id;
      void celebrate([f.team.primaryColor, '#FBBF24'], { big: true });
    }
  }, [s?.flash]);

  const next = matches.filter((m) => m.status === 'scheduled').sort((a, b) => matchTimestamp(a) - matchTimestamp(b))[0];
  const team = (id: string) => teams.find((t) => t.id === id);
  const match = s?.scoreboard.matchId ? matches.find((m) => m.id === s.scoreboard.matchId) : undefined;
  const embed = s ? streamEmbed(s.stream.url) : null;
  const goal = s?.flash?.kind === 'goal' && now - s.flash.at < 9000 ? s.flash : null;
  const card = s && cardIsLive(s.cards.active, s.scoreboard.clock, now) ? s.cards.active : null;
  const cardDef = card ? s?.cards.deck.find((c) => c.id === card.cardId) : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Lleida League TV" title="En directe" description="Segueix el partit que s’està retransmetent: marcador i rellotge en temps real, cartes de poder, la votació de l’MVP i el vídeo." actions={<Radio aria-hidden className="hidden text-red-500/50 sm:block" size={56} />} />

      {!live || !s ? (
        <div className="space-y-6">
          <EmptyState icon={<Radio />} title="Ara mateix no hi ha cap partit en directe" hint="Quan comenci una retransmissió, aquí veuràs el marcador en temps real i el vídeo." />
          <AppCard />
          {next && team(next.homeTeamId) && team(next.awayTeamId) && (
            <a href={hrefFor('calendar')} className="card flex items-center justify-center gap-4 px-4 py-4 transition hover:border-amber-400/50">
              <CalendarDays className="text-amber-400" />
              <span className="text-sm text-slate-300">
                Pròxim partit: <strong className="text-white">{team(next.homeTeamId)!.name}</strong> vs <strong className="text-white">{team(next.awayTeamId)!.name}</strong> · {formatDay(next.date)} {next.time}
              </span>
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Scoreboard s={s} now={now} />

          <AnimatePresence>
            {goal && (
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, y: -20 }} className="flex items-center justify-center gap-4 rounded-3xl border border-amber-400/60 px-5 py-4 shadow-glow" style={{ background: `linear-gradient(90deg, ${goal.team.primaryColor}66, transparent)` }}>
                <TeamCrest team={goal.team} size={44} />
                <span className="font-display text-3xl font-black uppercase italic text-gold-gradient sm:text-5xl">{goal.double ? 'Gol doble!' : goal.ownGoal ? 'Gol en pròpia' : 'Gooool!'}</span>
                {goal.player && <span className="font-display text-xl font-black uppercase text-white">{goal.player.name}</span>}
              </motion.div>
            )}
          </AnimatePresence>

          {card && cardDef && (
            <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: cardDef.color, background: `${cardDef.color}1f` }}>
              <span className="text-2xl">🃏</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Carta de poder · {card.team.shortName}</span>
                <span className="block truncate font-display text-xl font-black uppercase text-white">{cardDef.name}</span>
              </span>
              <span className="digital flex items-center gap-1.5 text-3xl text-amber-300">
                <Timer size={20} /> {mmss(cardRemaining(card, s.scoreboard.clock, now))}
              </span>
            </div>
          )}

          {embed?.embedUrl ? (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-card">
              <iframe src={embed.embedUrl} title="Directe de la Lleida League" className="aspect-video w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
          ) : embed ? (
            <a href={embed.url} target="_blank" rel="noreferrer" className="btn-gold w-full !py-4 text-base">
              <ExternalLink size={18} /> Mira el directe {embed.provider === 'tiktok' ? 'a TikTok' : embed.provider === 'youtube' ? 'a YouTube' : ''}
            </a>
          ) : null}

          {poll && (!poll.matchId || poll.matchId === s.scoreboard.matchId) && (
            <section className="rounded-3xl border border-amber-400/40 bg-amber-400/[0.05] p-4 sm:p-5">
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black uppercase text-white">
                <span className="h-2 w-2 animate-pulse-live rounded-full bg-red-500" /> {poll.title}
              </h2>
              <MvpVoteBox poll={poll} compact />
            </section>
          )}

          {s.scoreboard.home && s.scoreboard.away && hasStats(s.stats.home, s.stats.away) && <LiveStats home={s.scoreboard.home} away={s.scoreboard.away} homeStats={s.stats.home} awayStats={s.stats.away} />}

          <AppCard />

          {match && match.events.length > 0 && (
            <section className="card p-4 sm:p-6">
              <h2 className="section-title mb-4 !text-xl">Què ha passat</h2>
              <ol className="space-y-2">
                {[...match.events].reverse().map((e) => {
                  const t = team(e.teamId);
                  const icon = e.type === 'yellow_card' ? '🟨' : e.type === 'red_card' ? '🟥' : '⚽';
                  return (
                    <li key={e.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm">
                      <span className="digital w-10 text-amber-300">{e.minute}’</span>
                      <span>{icon}</span>
                      {t && <TeamCrest team={t} size={20} />}
                      <span className="font-bold text-white">{e.playerName}</span>
                      {e.type === 'own_goal' && <span className="text-xs text-slate-400">(en pròpia)</span>}
                      {e.assistPlayerName && <span className="text-xs text-slate-400">· assist. {e.assistPlayerName}</span>}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
