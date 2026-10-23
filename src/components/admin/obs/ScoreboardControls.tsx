import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Minus, Pause, Play, Plus, RotateCcw, Timer, Undo2 } from 'lucide-react';
import type { CategoryId, Player } from '@/types';
import type { ObsPeriod } from '@/obs/types';
import { CATEGORIES, CATEGORY_BY_ID } from '@/config/site';
import { clockElapsed, clockText, matchMinute, nudgeClock, pauseClock, periodMs, PERIOD_LABEL, resetClock, startClock, teamSnap } from '@/obs/state';
import { useObsStore } from '@/obs/useObsStore';
import { useLeagueStore } from '@/store/useLeagueStore';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { SectionCard } from '@/components/admin/fields';
import { PlayerPicker } from '@/components/admin/obs/PlayerPicker';
import { Toggle } from '@/components/admin/obs/Toggle';
import type { Side, useObsActions } from '@/components/admin/obs/useObsActions';
import { useNow } from '@/hooks/useNow';
import { cn, formatDay, matchTimestamp } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

const PERIODS: ObsPeriod[] = ['1T', 'DESC', '2T', 'PRO', 'PEN', 'FINAL'];

type Picker = { side: Side; kind: 'goal' | 'yellow_card' | 'red_card' } | null;

/** Match selection, score, fouls, cards, time-outs and the clock. */
export function ScoreboardControls({ actions, sync, setSync }: { actions: Actions; sync: boolean; setSync: (v: boolean) => void }) {
  const state = useObsStore((s) => s.state);
  const sb = state.scoreboard;
  const teams = useLeagueStore((s) => s.teams);
  const matches = useLeagueStore((s) => s.matches);
  const upsertMatch = useLeagueStore((s) => s.upsertMatch);
  const now = useNow(sb.clock.running ? 250 : 1000);
  const [picker, setPicker] = useState<Picker>(null);
  const [ownGoalSide, setOwnGoalSide] = useState<Side | null>(null);
  const [category, setCategory] = useState<CategoryId>(sb.category);

  const catMatches = useMemo(() => {
    const rank = (s: string) => (s === 'live' ? 0 : s === 'scheduled' ? 1 : 2);
    const today = Date.now();
    return matches
      .filter((m) => m.category === category)
      .sort((a, b) => rank(a.status) - rank(b.status) || Math.abs(matchTimestamp(a) - today) - Math.abs(matchTimestamp(b) - today));
  }, [matches, category]);
  const catTeams = useMemo(() => teams.filter((t) => t.category === category), [teams, category]);
  const teamName = (id: string) => teams.find((t) => t.id === id)?.shortName ?? '?';
  const linked = matches.find((m) => m.id === sb.matchId);

  const loadMatch = (matchId: string) => {
    const m = matches.find((x) => x.id === matchId);
    if (!m) return;
    const home = teams.find((t) => t.id === m.homeTeamId);
    const away = teams.find((t) => t.id === m.awayTeamId);
    if (!home || !away) return;
    const cat = CATEGORY_BY_ID[m.category];
    actions.update((s) => ({
      ...s,
      accent: cat.accent,
      categoryLabel: cat.label,
      scoreboard: {
        ...s.scoreboard,
        visible: true,
        matchId: m.id,
        category: m.category,
        matchday: m.matchday,
        home: teamSnap(home),
        away: teamSnap(away),
        homeScore: m.homeScore ?? 0,
        awayScore: m.awayScore ?? 0,
        ...(s.scoreboard.matchId === m.id ? {} : { homeFouls: 0, awayFouls: 0, period: '1T' as const, clock: resetClock(s.scoreboard.clock) }),
      },
    }));
  };

  const setManualTeam = (side: Side, teamId: string) => {
    const t = teams.find((x) => x.id === teamId);
    if (!t) return;
    const cat = CATEGORY_BY_ID[t.category];
    actions.update((s) => ({ ...s, accent: cat.accent, categoryLabel: cat.label, scoreboard: { ...s.scoreboard, matchId: null, category: t.category, [side]: teamSnap(t) } }));
  };

  // Stop the clock by itself at the end of the period.
  const elapsed = clockElapsed(sb.clock, now);
  const timeUp = elapsed >= periodMs(sb.clock);
  useEffect(() => {
    if (sb.clock.running && timeUp) actions.update((s) => ({ ...s, scoreboard: { ...s.scoreboard, clock: pauseClock(s.scoreboard.clock) } }));
  }, [timeUp, sb.clock.running, actions]);

  // Keep the website's live minute in step with the clock (once per minute, only while it runs).
  const minute = matchMinute(sb.clock, sb.period, now);
  const lastMinute = useRef(0);
  useEffect(() => {
    if (!sync || !sb.clock.running || !linked || linked.status !== 'live' || lastMinute.current === minute) return;
    lastMinute.current = minute;
    if (linked.liveMinute !== minute) upsertMatch({ ...linked, liveMinute: minute });
  }, [minute, sync, sb.clock.running, linked, upsertMatch]);

  const setClock = (fn: (c: typeof sb.clock) => typeof sb.clock) => actions.update((s) => ({ ...s, scoreboard: { ...s.scoreboard, clock: fn(s.scoreboard.clock) } }));

  const toggleClock = () => {
    if (sb.clock.running) setClock((c) => pauseClock(c));
    else {
      setClock((c) => startClock(timeUp ? resetClock(c) : c));
      // Starting the clock puts a scheduled match live on the website.
      if (sync && linked?.status === 'scheduled') upsertMatch({ ...linked, status: 'live', homeScore: sb.homeScore, awayScore: sb.awayScore, liveMinute: 1 });
    }
  };

  const finishOnWeb = () => {
    if (!linked) return;
    upsertMatch({ ...linked, status: 'finished', homeScore: sb.homeScore, awayScore: sb.awayScore });
  };

  const pickerTeam = picker ? (picker.side === 'home' ? sb.home : sb.away) : null;
  const pickerPlayers: Player[] = picker ? actions.squadOf(state, picker.side) : [];
  const leagueTeam = (id?: string) => teams.find((t) => t.id === id);

  const sideColumn = (side: Side) => {
    const team = side === 'home' ? sb.home : sb.away;
    const score = side === 'home' ? sb.homeScore : sb.awayScore;
    const fouls = side === 'home' ? sb.homeFouls : sb.awayFouls;
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 sm:p-4">
        <select className="input !py-2 text-center font-display font-black uppercase" value={team?.id ?? ''} onChange={(e) => setManualTeam(side, e.target.value)} aria-label={side === 'home' ? 'Equip local' : 'Equip visitant'}>
          <option value="" disabled>
            {side === 'home' ? 'Local…' : 'Visitant…'}
          </option>
          {catTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          {team && <TeamCrest team={team} size={44} />}
          <button className="btn-ghost !p-2.5" aria-label="Treu un gol" onClick={() => actions.setScore(side, score - 1)}>
            <Minus size={16} />
          </button>
          <span className="digital w-14 text-center text-5xl text-amber-300">{score}</span>
          <button className="btn-ghost !p-2.5" aria-label="Suma un gol sense animació" onClick={() => actions.setScore(side, score + 1)}>
            <Plus size={16} />
          </button>
        </div>
        <button className="btn-gold w-full !py-3 text-base" disabled={!team} onClick={() => setPicker({ side, kind: 'goal' })}>
          ⚽ Gol!
        </button>
        <div className="grid w-full grid-cols-3 gap-2">
          <button className="btn-ghost !px-2 !py-2 text-xs" disabled={!team} onClick={() => setPicker({ side, kind: 'yellow_card' })}>
            🟨 Groga
          </button>
          <button className="btn-ghost !px-2 !py-2 text-xs" disabled={!team} onClick={() => setPicker({ side, kind: 'red_card' })}>
            🟥 Verm.
          </button>
          <button className="btn-ghost !px-2 !py-2 text-xs" disabled={!team} onClick={() => actions.sideFlash(side, 'timeout', null)}>
            <Timer size={13} /> T. mort
          </button>
        </div>
        <div className="flex w-full items-center justify-between rounded-xl bg-pitch/60 px-3 py-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Faltes</span>
          <div className="flex items-center gap-2">
            <button className="btn-ghost !p-1.5" aria-label="Treu una falta" onClick={() => actions.setFouls(side, fouls - 1)}>
              <Minus size={14} />
            </button>
            <span className={cn('digital w-7 text-center text-2xl', fouls >= 5 ? 'text-red-400' : 'text-white')}>{fouls}</span>
            <button className="btn-ghost !p-1.5" aria-label="Suma una falta" onClick={() => actions.setFouls(side, fouls + 1)}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <SectionCard
      title="Marcador i partit"
      actions={
        <button className={sb.visible ? 'btn-gold !py-2' : 'btn-ghost !py-2'} onClick={() => actions.update((s) => ({ ...s, scoreboard: { ...s.scoreboard, visible: !s.scoreboard.visible } }))}>
          {sb.visible ? <Eye size={16} /> : <EyeOff size={16} />} {sb.visible ? 'Marcador en antena' : 'Mostra el marcador'}
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} aria-label="Categoria">
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select className="input" value={linked && linked.category === category ? linked.id : ''} onChange={(e) => loadMatch(e.target.value)} aria-label="Partit">
          <option value="">{catMatches.length ? 'Carrega un partit del calendari…' : 'No hi ha partits en aquesta categoria'}</option>
          {catMatches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.status === 'live' ? '🔴 ' : m.status === 'finished' ? '✔ ' : ''}J{m.matchday} · {teamName(m.homeTeamId)} - {teamName(m.awayTeamId)} · {formatDay(m.date)} {m.time}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Toggle checked={sync} onChange={setSync} label="Sincronitza amb la web" hint={linked ? 'Gols, targetes i minut es guarden al partit.' : 'Carrega un partit del calendari per activar-ho.'} />
        {linked && sync && linked.status !== 'finished' && (
          <button className="btn-ghost !py-1.5 text-xs" onClick={finishOnWeb}>
            Tanca el partit a la web ({sb.homeScore}-{sb.awayScore})
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {sideColumn('home')}
        {sideColumn('away')}
      </div>

      {/* Clock */}
      <div className="scoreboard mt-4 rounded-2xl border border-white/10 p-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button className="btn-ghost !px-2.5 !py-2 text-xs" onClick={() => setClock((c) => nudgeClock(c, c.countdown ? 60_000 : -60_000))} aria-label="Un minut enrere al rellotge">
            −1′
          </button>
          <button className="btn-ghost !px-2.5 !py-2 text-xs" onClick={() => setClock((c) => nudgeClock(c, c.countdown ? 1000 : -1000))} aria-label="Un segon enrere al rellotge">
            −1″
          </button>
          <span className={cn('digital min-w-[8.5rem] text-center text-6xl', timeUp ? 'text-red-400' : 'text-amber-300')}>{clockText(sb.clock, now)}</span>
          <button className="btn-ghost !px-2.5 !py-2 text-xs" onClick={() => setClock((c) => nudgeClock(c, c.countdown ? -1000 : 1000))} aria-label="Un segon endavant al rellotge">
            +1″
          </button>
          <button className="btn-ghost !px-2.5 !py-2 text-xs" onClick={() => setClock((c) => nudgeClock(c, c.countdown ? -60_000 : 60_000))} aria-label="Un minut endavant al rellotge">
            +1′
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button className={cn('btn min-w-[9rem] !py-3 text-base', sb.clock.running ? 'bg-red-500 text-white shadow-red hover:bg-red-400' : 'bg-emerald-500 text-emerald-950 shadow-emerald hover:bg-emerald-400')} onClick={toggleClock}>
            {sb.clock.running ? <Pause size={18} /> : <Play size={18} />} {sb.clock.running ? 'Atura' : timeUp ? 'Reinicia' : 'Inicia'}
          </button>
          <button className="btn-ghost !py-3" onClick={() => setClock((c) => resetClock(c))}>
            <RotateCcw size={16} /> 0:00
          </button>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => actions.setPeriod(p)}
              className={cn('rounded-xl px-3 py-1.5 font-display text-sm font-black uppercase tracking-wide transition', sb.period === p ? 'bg-gold-gradient text-slate-950 shadow-glow' : 'border border-white/10 text-slate-400 hover:text-white')}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
          <label className="flex items-center gap-2">
            Durada de la part
            <input
              type="number"
              min={1}
              max={60}
              className="input !w-16 !px-2 !py-1 text-center"
              value={sb.clock.periodMinutes}
              onChange={(e) => setClock((c) => ({ ...c, periodMinutes: Math.min(60, Math.max(1, Number(e.target.value) || 20)) }))}
            />
            min
          </label>
          <Toggle small checked={sb.clock.countdown} onChange={(v) => setClock((c) => ({ ...c, countdown: v }))} label="Compte enrere" />
          <Toggle small checked={state.replay.visible} onChange={(v) => actions.update((s) => ({ ...s, replay: { visible: v } }))} label="Rètol «Repetició»" />
        </div>
      </div>

      {linked && linked.events.length > 0 && sync && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Undo2 size={13} /> Treure un gol amb «−» també esborra l’últim gol registrat d’aquell equip al partit.
        </p>
      )}

      <PlayerPicker
        open={!!picker}
        onClose={() => setPicker(null)}
        title={picker?.kind === 'goal' ? `Qui ha marcat? · ${pickerTeam?.name ?? ''}` : picker?.kind === 'red_card' ? 'Targeta vermella per a…' : 'Targeta groga per a…'}
        team={leagueTeam(pickerTeam?.id)}
        players={pickerPlayers}
        extra={
          picker?.kind === 'goal'
            ? [
                { label: 'Gol sense golejador', onPick: () => actions.goal(picker.side, null) },
                {
                  label: 'Gol en pròpia',
                  hint: '(tria després qui)',
                  onPick: () => {
                    const side = picker.side;
                    // Let the first dialog close before opening the second one.
                    window.setTimeout(() => setOwnGoalSide(side), 250);
                  },
                },
              ]
            : []
        }
        onPick={(p) => {
          if (!picker) return;
          if (picker.kind === 'goal') actions.goal(picker.side, p);
          else actions.sideFlash(picker.side, picker.kind, p);
        }}
      />
      {/* Own goal: the goal counts for `ownGoalSide`, the player belongs to the other team. */}
      <PlayerPicker
        open={!!ownGoalSide}
        onClose={() => setOwnGoalSide(null)}
        title="Gol en pròpia: qui l’ha fet?"
        team={leagueTeam((ownGoalSide === 'home' ? sb.away : sb.home)?.id)}
        players={ownGoalSide ? actions.squadOf(state, ownGoalSide === 'home' ? 'away' : 'home') : []}
        onPick={(p) => ownGoalSide && actions.goal(ownGoalSide, p, true)}
      />
    </SectionCard>
  );
}
