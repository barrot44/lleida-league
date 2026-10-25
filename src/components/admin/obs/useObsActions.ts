import { useCallback, useMemo, useState } from 'react';
import type { Match, MatchEventType, Player } from '@/types';
import type { ObsCommand, ObsFlashKind, ObsGraphic, ObsPeriod, ObsScreenKind, ObsState } from '@/obs/types';
import { clockElapsed, matchMinute, pauseClock, playerSnap, resetClock, teamSnap } from '@/obs/state';
import { cardIsLive } from '@/obs/cards';
import { useObsStore } from '@/obs/useObsStore';
import { useLeagueStore } from '@/store/useLeagueStore';
import { uid } from '@/lib/utils';

export type Side = 'home' | 'away';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

const SYNC_KEY = 'lleida-league:obs-sync';

/** "Sync with the website": goals, cards and the live minute are also written into the linked match. */
export function useSyncSetting() {
  const [sync, setSyncState] = useState(() => {
    try {
      return localStorage.getItem(SYNC_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const setSync = (v: boolean) => {
    setSyncState(v);
    try {
      localStorage.setItem(SYNC_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  };
  return [sync, setSync] as const;
}

/** Every action of the control room, so the panels stay small and consistent. */
export function useObsActions(sync: boolean) {
  const update = useObsStore((s) => s.update);
  const teams = useLeagueStore((s) => s.teams);
  const players = useLeagueStore((s) => s.players);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  /** Writes into the linked match of the website (only when sync is on and a real match is loaded). */
  const patchMatch = useCallback(
    (fn: (m: Match, s: ObsState) => Match | null) => {
      if (!sync) return;
      const s = useObsStore.getState().state;
      const id = s.scoreboard.matchId;
      if (!id) return;
      const league = useLeagueStore.getState();
      const m = league.matches.find((x) => x.id === id);
      if (!m) return;
      const next = fn(m, s);
      if (next) league.upsertMatch(next);
    },
    [sync],
  );

  const liveMatch = (m: Match, s: ObsState): Match => ({
    ...m,
    status: m.status === 'scheduled' ? 'live' : m.status,
    homeScore: s.scoreboard.homeScore,
    awayScore: s.scoreboard.awayScore,
    liveMinute: m.status === 'finished' ? undefined : matchMinute(s.scoreboard.clock, s.scoreboard.period),
  });

  const sideTeamId = (s: ObsState, side: Side) => (side === 'home' ? s.scoreboard.home?.id : s.scoreboard.away?.id);

  const setScore = useCallback(
    (side: Side, value: number) => {
      update((s) => ({ ...s, scoreboard: { ...s.scoreboard, [side === 'home' ? 'homeScore' : 'awayScore']: Math.max(0, value) } }));
      patchMatch((m, s) => {
        // Taking a goal back also removes the last goal registered for that side.
        const prevTotal = side === 'home' ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
        let events = m.events;
        if (value < prevTotal) {
          const sideId = side === 'home' ? m.homeTeamId : m.awayTeamId;
          const idx = [...events].reverse().findIndex((e) => (e.type === 'goal' && e.teamId === sideId) || (e.type === 'own_goal' && e.teamId !== sideId));
          if (idx !== -1) events = events.filter((_, i) => i !== events.length - 1 - idx);
        }
        return { ...liveMatch(m, s), events };
      });
    },
    [update, patchMatch],
  );

  const goal = useCallback(
    (side: Side, scorer: Player | null, ownGoal = false) => {
      const now = Date.now();
      let teamOk = false;
      update((s) => {
        const sb = s.scoreboard;
        const team = side === 'home' ? sb.home : sb.away;
        if (!team || !sb.home || !sb.away) return s;
        teamOk = true;
        // Power cards: "Gol doble" makes it count 2; scoring ends the rival's "Expulsió".
        const live = cardIsLive(s.cards.active, sb.clock, now) ? s.cards.active : null;
        const double = !!live && live.cardId === 'double-goal' && live.team.id === team.id;
        const endsExpulsion = !!live && live.cardId === 'rival-expulsion' && live.team.id === team.id;
        const inc = double ? 2 : 1;
        const homeScore = sb.homeScore + (side === 'home' ? inc : 0);
        const awayScore = sb.awayScore + (side === 'away' ? inc : 0);
        return {
          ...s,
          scoreboard: { ...sb, homeScore, awayScore },
          cards: endsExpulsion ? { ...s.cards, active: null } : s.cards,
          flash: {
            id: uid('f'),
            kind: 'goal',
            at: now,
            team,
            player: scorer ? playerSnap(scorer) : undefined,
            ownGoal,
            double,
            minute: matchMinute(sb.clock, sb.period, now),
            home: sb.home,
            away: sb.away,
            homeScore,
            awayScore,
          },
        };
      });
      if (!teamOk) return;
      patchMatch((m, s) => {
        const base = liveMatch(m, s);
        if (!scorer) return base;
        const type: MatchEventType = ownGoal ? 'own_goal' : 'goal';
        return { ...base, events: [...m.events, { id: uid('e'), minute: base.liveMinute ?? 1, type, playerId: scorer.id, playerName: scorer.name, teamId: scorer.teamId }] };
      });
    },
    [update, patchMatch],
  );

  const sideFlash = useCallback(
    (side: Side, kind: Exclude<ObsFlashKind, 'goal'>, player: Player | null) => {
      const now = Date.now();
      update((s) => {
        const team = side === 'home' ? s.scoreboard.home : s.scoreboard.away;
        if (!team) return s;
        return { ...s, flash: { id: uid('f'), kind, at: now, team, player: player ? playerSnap(player) : undefined, minute: kind === 'timeout' ? undefined : matchMinute(s.scoreboard.clock, s.scoreboard.period, now) } };
      });
      if ((kind === 'yellow_card' || kind === 'red_card') && player) {
        patchMatch((m, s) => {
          const base = liveMatch(m, s);
          return { ...base, events: [...m.events, { id: uid('e'), minute: base.liveMinute ?? 1, type: kind, playerId: player.id, playerName: player.name, teamId: player.teamId }] };
        });
      }
    },
    [update, patchMatch],
  );

  const setFouls = useCallback(
    (side: Side, value: number) => update((s) => ({ ...s, scoreboard: { ...s.scoreboard, [side === 'home' ? 'homeFouls' : 'awayFouls']: Math.max(0, Math.min(15, value)) } })),
    [update],
  );

  const setPeriod = useCallback(
    (period: ObsPeriod) => {
      update((s) => {
        const sb = s.scoreboard;
        let clock = sb.clock;
        let fouls = { homeFouls: sb.homeFouls, awayFouls: sb.awayFouls };
        if (period === '2T' && sb.period !== '2T') {
          // New half: the clock starts again and futsal accumulated fouls reset.
          clock = resetClock(clock);
          fouls = { homeFouls: 0, awayFouls: 0 };
        } else if (period === 'PRO' && sb.period !== 'PRO') clock = resetClock(clock);
        else if (period === '1T' && sb.period !== '1T') clock = resetClock(clock);
        else if (period === 'DESC' || period === 'FINAL' || period === 'PEN') clock = pauseClock(clock);
        // A timed card on the match clock keeps its remaining time when the clock is reset for a new period.
        let cards = s.cards;
        const a = cards.active;
        if (a && a.mode === 'clock' && clock.baseMs === 0 && !clock.running && clockElapsed(sb.clock) > 0) {
          const used = Math.max(0, clockElapsed(sb.clock) - a.startElapsed);
          cards = { ...cards, active: { ...a, startElapsed: -used } };
        }
        return { ...s, scoreboard: { ...sb, ...fouls, period, clock }, cards };
      });
    },
    [update],
  );

  const showGraphic = useCallback(
    (graphic: ObsGraphic, autoHideSec: number) =>
      update((s) => ({ ...s, main: { visible: true, id: uid('g'), graphic, at: Date.now(), hideAt: autoHideSec > 0 ? Date.now() + autoHideSec * 1000 : null } })),
    [update],
  );

  const hideGraphic = useCallback(() => update((s) => ({ ...s, main: { ...s.main, visible: false } })), [update]);

  const showLower = useCallback(
    (title: string, subtitle: string, teamId: string | null, autoHideSec: number) => {
      const team = teamId ? teamMap.get(teamId) : undefined;
      update((s) => ({ ...s, lower: { visible: true, id: uid('l'), title, subtitle, team: team ? teamSnap(team) : null, hideAt: autoHideSec > 0 ? Date.now() + autoHideSec * 1000 : null } }));
    },
    [update, teamMap],
  );

  const hideLower = useCallback(() => update((s) => ({ ...s, lower: { ...s.lower, visible: false } })), [update]);

  const showScreen = useCallback(
    (kind: ObsScreenKind, title: string, subtitle: string, targetAt: string) => update((s) => ({ ...s, screen: { visible: true, kind, title, subtitle, targetAt } })),
    [update],
  );

  const hideScreen = useCallback(() => update((s) => ({ ...s, screen: { ...s.screen, visible: false } })), [update]);

  const clearAll = useCallback(
    () =>
      update((s) => ({
        ...s,
        flash: null,
        main: { ...s.main, visible: false },
        lower: { ...s.lower, visible: false },
        screen: { ...s.screen, visible: false },
        replay: { visible: false },
      })),
    [update],
  );

  /** Squad of one side of the scoreboard, in on-air order. */
  const squadOf = useCallback(
    (s: ObsState, side: Side) => {
      const id = sideTeamId(s, side);
      return id ? players.filter((p) => p.teamId === id) : [];
    },
    [players],
  );

  /** Queues an order for the overlay inside OBS (only the last few are kept). */
  const sendCmd = useCallback(
    (cmd: DistributiveOmit<ObsCommand, 'id' | 'at'>, extra?: (s: ObsState) => Partial<ObsState>) =>
      update((s) => ({ ...s, ...extra?.(s), cmds: [...s.cmds, { ...cmd, id: uid('c'), at: Date.now() } as ObsCommand].slice(-12) })),
    [update],
  );

  /** Visual-only logo transition (no scene change). */
  const sting = useCallback(() => update((s) => ({ ...s, transition: { id: uid('t'), at: Date.now() } })), [update]);

  return { update, sendCmd, sting, setScore, goal, sideFlash, setFouls, setPeriod, showGraphic, hideGraphic, showLower, hideLower, showScreen, hideScreen, clearAll, squadOf, patchMatch, teamMap };
}
