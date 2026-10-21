import type { CategoryId, Match, Player, PlayerStats, Team } from '@/types';
import { clamp, matchTimestamp } from '@/lib/utils';

export type FormResult = 'W' | 'D' | 'L';

export interface StandingRow {
  team: Team;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: FormResult[];
}

export const emptyStats = (): PlayerStats => ({
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
  mvpAwards: 0,
  matchesPlayed: 0,
});

const isFinished = (m: Match) => m.status === 'finished' && m.homeScore !== null && m.awayScore !== null;

/** Results of a team in chronological order (oldest → newest). */
export function teamResults(teamId: string, matches: Match[]) {
  return matches
    .filter((m) => isFinished(m) && (m.homeTeamId === teamId || m.awayTeamId === teamId))
    .sort((a, b) => matchTimestamp(a) - matchTimestamp(b))
    .map((m) => {
      const isHome = m.homeTeamId === teamId;
      const gf = (isHome ? m.homeScore : m.awayScore) as number;
      const ga = (isHome ? m.awayScore : m.homeScore) as number;
      const result: FormResult = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
      return { match: m, gf, ga, result, isHome };
    });
}

/**
 * Live standings: 3 pts per win, 1 per draw. Tiebreakers: goal difference,
 * goals scored, then alphabetical. Only `finished` matches count.
 */
export function computeStandings(teams: Team[], matches: Match[], category: CategoryId): StandingRow[] {
  const catTeams = teams.filter((t) => t.category === category);
  const rows: StandingRow[] = catTeams.map((team) => {
    const results = teamResults(team.id, matches);
    let won = 0;
    let drawn = 0;
    let lost = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    for (const r of results) {
      goalsFor += r.gf;
      goalsAgainst += r.ga;
      if (r.result === 'W') won++;
      else if (r.result === 'D') drawn++;
      else lost++;
    }
    return {
      team,
      position: 0,
      played: results.length,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDiff: goalsFor - goalsAgainst,
      points: won * 3 + drawn,
      form: results.slice(-5).map((r) => r.result),
    };
  });

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.team.name.localeCompare(b.team.name, 'es'),
  );
  rows.forEach((r, i) => (r.position = i + 1));
  return rows;
}

/**
 * Rebuilds `player.stats` = stats derived from finished matches + manual adjustments.
 * `matchesPlayed` assumes the whole squad is available, so it equals the team's finished matches.
 */
export function recomputePlayerStats(players: Player[], matches: Match[]): Player[] {
  const derived = new Map<string, PlayerStats>();
  const teamMatches = new Map<string, number>();
  const get = (id: string) => {
    let s = derived.get(id);
    if (!s) {
      s = emptyStats();
      derived.set(id, s);
    }
    return s;
  };

  for (const m of matches) {
    if (m.status !== 'finished') continue;
    teamMatches.set(m.homeTeamId, (teamMatches.get(m.homeTeamId) ?? 0) + 1);
    teamMatches.set(m.awayTeamId, (teamMatches.get(m.awayTeamId) ?? 0) + 1);
    for (const e of m.events) {
      if (e.type === 'goal') {
        get(e.playerId).goals++;
        if (e.assistPlayerId) get(e.assistPlayerId).assists++;
      } else if (e.type === 'yellow_card') get(e.playerId).yellowCards++;
      else if (e.type === 'red_card') get(e.playerId).redCards++;
    }
    if (m.mvpPlayerId) get(m.mvpPlayerId).mvpAwards++;
  }

  return players.map((p) => {
    const d = derived.get(p.id) ?? emptyStats();
    const a = p.adjustments ?? emptyStats();
    const total = (k: keyof PlayerStats, extra = 0) => Math.max(0, d[k] + a[k] + extra);
    return {
      ...p,
      adjustments: a,
      stats: {
        goals: total('goals'),
        assists: total('assists'),
        yellowCards: total('yellowCards'),
        redCards: total('redCards'),
        mvpAwards: total('mvpAwards'),
        matchesPlayed: total('matchesPlayed', teamMatches.get(p.teamId) ?? 0),
      },
    };
  });
}

/** FIFA-style overall rating (55–99) derived from performance. */
export function playerRating(p: Player): number {
  const base: Record<Player['position'], number> = { Portero: 62, Cierre: 64, Ala: 65, Pívot: 65 };
  const s = p.stats;
  const raw =
    base[p.position] + s.goals * 1.6 + s.assists * 1.1 + s.mvpAwards * 3 + s.matchesPlayed * 0.35 - s.redCards * 2 - s.yellowCards * 0.3;
  return Math.round(clamp(raw, 55, 99));
}

export const matchdaysOf = (matches: Match[], category: CategoryId) =>
  [...new Set(matches.filter((m) => m.category === category).map((m) => m.matchday))].sort((a, b) => a - b);
