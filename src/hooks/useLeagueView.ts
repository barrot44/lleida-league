import { useMemo } from 'react';
import type { CategoryId } from '@/types';
import { useLeagueStore } from '@/store/useLeagueStore';
import { computeStandings } from '@/lib/standings';
import { matchTimestamp } from '@/lib/utils';

/** Lookup maps across every category (teams/players are referenced by id from many places). */
export function useLookups() {
  const teams = useLeagueStore((s) => s.teams);
  const players = useLeagueStore((s) => s.players);
  return useMemo(
    () => ({
      teamMap: new Map(teams.map((t) => [t.id, t])),
      playerMap: new Map(players.map((p) => [p.id, p])),
    }),
    [teams, players],
  );
}

/** Everything the public pages need for one category, memoized and always up to date. */
export function useLeagueView(category: CategoryId) {
  const teams = useLeagueStore((s) => s.teams);
  const players = useLeagueStore((s) => s.players);
  const matches = useLeagueStore((s) => s.matches);
  const { teamMap, playerMap } = useLookups();

  return useMemo(() => {
    const catTeams = teams.filter((t) => t.category === category);
    const catMatches = matches
      .filter((m) => m.category === category)
      .sort((a, b) => matchTimestamp(a) - matchTimestamp(b));
    const catPlayers = players.filter((p) => teamMap.get(p.teamId)?.category === category);
    const standings = computeStandings(teams, matches, category);
    return { catTeams, catMatches, catPlayers, standings, teamMap, playerMap };
  }, [teams, players, matches, category, teamMap, playerMap]);
}
