import { useState } from 'react';
import { CalendarDays, Hourglass, MapPin, Share2, Star } from 'lucide-react';
import type { Match, MatchEvent, Team } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { ShareMatchModal } from '@/components/social/ShareMatchModal';
import { StatusBadge } from '@/components/ui/Badges';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { CATEGORY_BY_ID } from '@/config/site';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { useLookups } from '@/hooks/useLeagueView';
import { formatDateLong } from '@/lib/utils';
import { cn } from '@/lib/utils';

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  if (type === 'yellow_card') return <span className="inline-block h-5 w-3.5 rounded-[3px] bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,.6)]" title="Targeta groga" />;
  if (type === 'red_card') return <span className="inline-block h-5 w-3.5 rounded-[3px] bg-red-500 shadow-red" title="Targeta vermella" />;
  return <span className="text-lg leading-none" title={type === 'own_goal' ? 'Gol en pròpia porta' : 'Gol'}>⚽</span>;
}

function eventLabel(e: MatchEvent) {
  if (e.type === 'own_goal') return `${e.playerName} (p.p.)`;
  return e.playerName;
}

/** Which side of the timeline the event belongs to (an own goal benefits the opponent). */
function eventSide(e: MatchEvent, match: Match): 'home' | 'away' {
  const mine = e.teamId === match.homeTeamId ? 'home' : 'away';
  if (e.type !== 'own_goal') return mine;
  return mine === 'home' ? 'away' : 'home';
}

export function MatchSheetModal({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const match = useLeagueStore((s) => s.matches.find((m) => m.id === id));
  const { teamMap, playerMap } = useLookups();
  const openModal = useUiStore((s) => s.openModal);
  const [sharing, setSharing] = useState(false);
  const home = match ? teamMap.get(match.homeTeamId) : undefined;
  const away = match ? teamMap.get(match.awayTeamId) : undefined;

  if (!match || !home || !away) return null;

  const mvp = match.mvpPlayerId ? playerMap.get(match.mvpPlayerId) : undefined;
  const mvpTeam = mvp ? teamMap.get(mvp.teamId) : undefined;
  const started = match.status !== 'scheduled';
  const cat = CATEGORY_BY_ID[match.category];

  const Side = ({ team, right }: { team: Team; right?: boolean }) => (
    <button
      onClick={() => openModal({ kind: 'team', id: team.id })}
      className={cn('group flex flex-1 flex-col items-center gap-2 text-center', right ? 'sm:items-start sm:text-left' : 'sm:items-end sm:text-right')}
    >
      <TeamCrest team={team} size={76} className="transition-transform duration-300 group-hover:scale-110" />
      <span className="font-display text-xl font-black uppercase leading-tight text-white sm:text-2xl">{team.name}</span>
    </button>
  );

  return (
    <>
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={`Fitxa del partit: ${home.name} contra ${away.name}`} hideHeader size="lg">
      <div
        className="relative overflow-hidden px-5 pb-8 pt-10 sm:px-8"
        style={{ background: `radial-gradient(70% 120% at 0% 0%, ${home.primaryColor}55, transparent 60%), radial-gradient(70% 120% at 100% 0%, ${away.primaryColor}55, transparent 60%)` }}
      >
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-center">
          <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: cat.accent }}>
            {cat.label} · Jornada {match.matchday}
          </span>
          <StatusBadge status={match.status} minute={match.liveMinute} />
        </div>

        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
          <Side team={home} />
          <div className="scoreboard min-w-[150px] rounded-2xl border border-white/10 px-5 py-3 text-center">
            {started ? (
              <p className="digital text-6xl text-gold-gradient">
                {match.homeScore} <span className="text-slate-600">:</span> {match.awayScore}
              </p>
            ) : (
              <>
                <p className="digital text-5xl text-gold-gradient">{match.time}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Pendent</p>
              </>
            )}
          </div>
          <Side team={away} right />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-300">
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={15} className="text-amber-400" />
            <span className="inline-block first-letter:uppercase">{formatDateLong(match.date)}</span> · {match.time}h
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin size={15} className="text-amber-400" /> {match.venue}
          </span>
        </div>
        <div className="mt-5 flex justify-center">
          <button className="btn-ghost !px-4 !py-2 text-xs" onClick={() => setSharing(true)}>
            <Share2 size={14} /> Imatge per a xarxes
          </button>
        </div>
      </div>

      <div className="space-y-8 p-5 sm:p-8">
        {mvp && (
          <button
            onClick={() => openModal({ kind: 'player', id: mvp.id })}
            className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-400/15 via-amber-400/5 to-transparent p-4 text-left shadow-glow transition hover:border-amber-300"
          >
            <PlayerAvatar player={mvp} team={mvpTeam} size={64} className="ring-2 ring-amber-400" />
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
                <Star size={13} fill="currentColor" /> MVP del partit
              </p>
              <p className="truncate font-display text-2xl font-black uppercase text-white">{mvp.name}</p>
              <p className="text-xs text-slate-400">
                {mvpTeam?.name} · #{mvp.dorsal} · {mvp.position}
              </p>
            </div>
          </button>
        )}

        <section>
          <h3 className="section-title mb-4 !text-xl">Cronologia</h3>
          {match.events.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-400">
              <Hourglass size={22} />
              {started ? 'Encara no hi ha esdeveniments registrats en aquesta fitxa.' : 'El partit encara no ha començat. Torna quan soni el xiulet!'}
            </div>
          ) : (
            <ol className="relative space-y-2.5">
              <div aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
              {match.events.map((e) => {
                const side = eventSide(e, match);
                const body = (
                  <div className={cn('flex items-center gap-2.5', side === 'home' ? 'flex-row-reverse text-right' : 'text-left')}>
                    <EventIcon type={e.type} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{eventLabel(e)}</p>
                      {e.assistPlayerName && <p className="truncate text-xs text-slate-400">Assist. {e.assistPlayerName}</p>}
                    </div>
                  </div>
                );
                return (
                  <li key={e.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className={side === 'home' ? 'flex justify-end' : ''}>{side === 'home' && body}</div>
                    <span className="digital z-10 grid h-8 min-w-[2.75rem] place-items-center rounded-full border border-white/10 bg-pitch px-2 text-sm text-amber-300">{e.minute}'</span>
                    <div>{side === 'away' && body}</div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </Modal>
    {sharing && <ShareMatchModal match={match} home={home} away={away} mvp={mvp} open={sharing} onClose={() => setSharing(false)} />}
    </>
  );
}
