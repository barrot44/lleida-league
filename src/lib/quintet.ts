import type { Match, Player, Position, Team } from '@/types';

export interface QuintetSlot {
  role: Position;
  player: Player;
  team?: Team;
  /** Performance points in the chosen period (goals ×3, assists ×1.5, MVP ×4, clean sheets, cards). */
  points: number;
}

/** 1 goalkeeper and 4 outfield players, drawn on the court in the classic futsal diamond. */
const LINEUP: Position[] = ['Portero', 'Cierre', 'Ala', 'Ala', 'Pívot'];

/**
 * Best five of a matchday (or of the whole season when `matchday` is `null`).
 * Only finished matches count. Returns fewer than five slots when a position has nobody with activity.
 */
export function buildQuintet(matches: Match[], players: Player[], teams: Map<string, Team>, matchday: number | null): QuintetSlot[] {
  const finished = matches.filter((m) => m.status === 'finished' && (matchday === null || m.matchday === matchday));
  const byId = new Map(players.map((p) => [p.id, p]));
  const score = new Map<string, number>();
  const bump = (id: string | undefined, pts: number) => {
    if (id && byId.has(id)) score.set(id, (score.get(id) ?? 0) + pts);
  };

  for (const m of finished) {
    for (const e of m.events) {
      if (e.type === 'goal') {
        bump(e.playerId, 3);
        bump(e.assistPlayerId, 1.5);
      } else if (e.type === 'yellow_card') bump(e.playerId, -0.5);
      else if (e.type === 'red_card') bump(e.playerId, -3);
    }
    bump(m.mvpPlayerId, 4);
    // Clean-sheet bonus for the starting goalkeeper (dorsal 1) when his team conceded at most one goal.
    for (const [teamId, conceded] of [
      [m.homeTeamId, m.awayScore ?? 0],
      [m.awayTeamId, m.homeScore ?? 0],
    ] as const) {
      if (conceded <= 1) {
        const keeper = players.find((p) => p.teamId === teamId && p.position === 'Portero' && p.dorsal === 1);
        bump(keeper?.id, conceded === 0 ? 3 : 1.5);
      }
    }
  }

  const used = new Set<string>();
  const slots: QuintetSlot[] = [];
  for (const role of LINEUP) {
    const best = players
      .filter((p) => (role === 'Portero') === (p.position === 'Portero') && !used.has(p.id) && score.has(p.id))
      .sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) || b.stats.goals - a.stats.goals || a.name.localeCompare(b.name, 'es'))[0];
    if (!best) continue;
    used.add(best.id);
    slots.push({ role, player: best, team: teams.get(best.teamId), points: Math.round((score.get(best.id) ?? 0) * 10) / 10 });
  }
  return slots;
}
