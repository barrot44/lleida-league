import type { Match, Player, Team } from '@/types';
import { decimal, matchTimestamp } from '@/lib/utils';

export type RecordIcon = 'flame' | 'goal' | 'shield' | 'zap' | 'crown' | 'star' | 'card' | 'target';

export interface RecordCard {
  id: string;
  icon: RecordIcon;
  title: string;
  value: string;
  detail: string;
  teamId?: string;
  playerId?: string;
  matchId?: string;
}

const finishedOf = (matches: Match[]) => matches.filter((m) => m.status === 'finished' && m.homeScore !== null && m.awayScore !== null);

/** Longest run of consecutive matches (chronological) of a team where `test` holds. */
function longestRun(teamId: string, matches: Match[], test: (gf: number, ga: number) => boolean): number {
  let best = 0;
  let run = 0;
  for (const m of [...matches].sort((a, b) => matchTimestamp(a) - matchTimestamp(b))) {
    const isHome = m.homeTeamId === teamId;
    if (!isHome && m.awayTeamId !== teamId) continue;
    const gf = (isHome ? m.homeScore : m.awayScore) as number;
    const ga = (isHome ? m.awayScore : m.homeScore) as number;
    run = test(gf, ga) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** League records derived from finished matches and player stats — nothing is stored. */
export function computeRecords(allMatches: Match[], teams: Team[], players: Player[]): RecordCard[] {
  const matches = finishedOf(allMatches);
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? '—';
  const cards: RecordCard[] = [];
  if (matches.length === 0) return cards;

  const score = (m: Match) => `${m.homeScore}-${m.awayScore}`;
  const versus = (m: Match) => `${teamName(m.homeTeamId)} ${score(m)} ${teamName(m.awayTeamId)} · J${m.matchday}`;

  const biggest = [...matches].sort((a, b) => Math.abs((b.homeScore as number) - (b.awayScore as number)) - Math.abs((a.homeScore as number) - (a.awayScore as number)))[0];
  cards.push({ id: 'biggest-win', icon: 'flame', title: 'Golejada més gran', value: score(biggest), detail: versus(biggest), matchId: biggest.id });

  const wildest = [...matches].sort((a, b) => (b.homeScore as number) + (b.awayScore as number) - ((a.homeScore as number) + (a.awayScore as number)))[0];
  cards.push({ id: 'most-goals', icon: 'goal', title: 'Partit amb més gols', value: `${(wildest.homeScore as number) + (wildest.awayScore as number)} gols`, detail: versus(wildest), matchId: wildest.id });

  const stats = teams
    .map((t) => {
      const played = matches.filter((m) => m.homeTeamId === t.id || m.awayTeamId === t.id);
      const gf = played.reduce((s, m) => s + ((m.homeTeamId === t.id ? m.homeScore : m.awayScore) as number), 0);
      const ga = played.reduce((s, m) => s + ((m.homeTeamId === t.id ? m.awayScore : m.homeScore) as number), 0);
      return { team: t, played: played.length, gf, ga };
    })
    .filter((s) => s.played > 0);

  if (stats.length > 0) {
    const attack = [...stats].sort((a, b) => b.gf / b.played - a.gf / a.played)[0];
    cards.push({ id: 'best-attack', icon: 'zap', title: 'Millor atac', value: `${attack.gf} gols`, detail: `${attack.team.name} · ${decimal(attack.gf / attack.played)} per partit`, teamId: attack.team.id });
    const defence = [...stats].sort((a, b) => a.ga / a.played - b.ga / b.played)[0];
    cards.push({ id: 'best-defence', icon: 'shield', title: 'Millor defensa', value: `${defence.ga} encaixats`, detail: `${defence.team.name} · ${decimal(defence.ga / defence.played)} per partit`, teamId: defence.team.id });

    const wins = [...stats].map((s) => ({ s, n: longestRun(s.team.id, matches, (gf, ga) => gf > ga) })).sort((a, b) => b.n - a.n)[0];
    if (wins.n >= 2) cards.push({ id: 'win-streak', icon: 'crown', title: 'Ratxa de victòries', value: `${wins.n} seguides`, detail: wins.s.team.name, teamId: wins.s.team.id });
    const unbeaten = [...stats].map((s) => ({ s, n: longestRun(s.team.id, matches, (gf, ga) => gf >= ga) })).sort((a, b) => b.n - a.n)[0];
    if (unbeaten.n >= 3) cards.push({ id: 'unbeaten', icon: 'target', title: 'Ratxa sense perdre', value: `${unbeaten.n} partits`, detail: unbeaten.s.team.name, teamId: unbeaten.s.team.id });
  }

  // Most goals by one player in a single match + hat-tricks.
  let top: { player?: Player; goals: number; match: Match } | null = null;
  let hatTricks = 0;
  for (const m of matches) {
    const perPlayer = new Map<string, number>();
    for (const e of m.events) if (e.type === 'goal') perPlayer.set(e.playerId, (perPlayer.get(e.playerId) ?? 0) + 1);
    for (const [pid, n] of perPlayer) {
      if (n >= 3) hatTricks++;
      if (!top || n > top.goals) top = { player: players.find((p) => p.id === pid), goals: n, match: m };
    }
  }
  const topMatch = top as { player?: Player; goals: number; match: Match } | null;
  if (topMatch && topMatch.goals >= 2) {
    cards.push({
      id: 'player-match',
      icon: 'goal',
      title: topMatch.goals >= 3 ? 'Més gols d’un jugador en un partit' : 'Màxim d’un jugador en un partit',
      value: `${topMatch.goals} gols`,
      detail: `${topMatch.player?.name ?? 'Jugador'} · ${versus(topMatch.match)}`,
      playerId: topMatch.player?.id,
      matchId: topMatch.match.id,
    });
  }
  if (hatTricks > 0) cards.push({ id: 'hat-tricks', icon: 'star', title: 'Hat-tricks de la temporada', value: String(hatTricks), detail: 'Jugadors amb 3 gols o més en un mateix partit' });

  const by = (pick: (p: Player) => number) => [...players].sort((a, b) => pick(b) - pick(a) || a.name.localeCompare(b.name, 'es'))[0];
  const scorer = by((p) => p.stats.goals);
  if (scorer && scorer.stats.goals > 0) cards.push({ id: 'top-scorer', icon: 'crown', title: 'Pitxitxi', value: `${scorer.stats.goals} gols`, detail: `${scorer.name} · ${teamName(scorer.teamId)}`, playerId: scorer.id });
  const assister = by((p) => p.stats.assists);
  if (assister && assister.stats.assists > 0) cards.push({ id: 'top-assists', icon: 'zap', title: 'Màxim assistent', value: `${assister.stats.assists} assist.`, detail: `${assister.name} · ${teamName(assister.teamId)}`, playerId: assister.id });
  const mvp = by((p) => p.stats.mvpAwards);
  if (mvp && mvp.stats.mvpAwards > 0) cards.push({ id: 'top-mvp', icon: 'star', title: 'Rei dels MVPs', value: `${mvp.stats.mvpAwards} MVPs`, detail: `${mvp.name} · ${teamName(mvp.teamId)}`, playerId: mvp.id });
  const dirty = by((p) => p.stats.yellowCards + p.stats.redCards * 2);
  if (dirty && dirty.stats.yellowCards + dirty.stats.redCards > 0) {
    cards.push({ id: 'cards', icon: 'card', title: 'Jugador més amonestat', value: `${dirty.stats.yellowCards} grogues · ${dirty.stats.redCards} vermelles`, detail: `${dirty.name} · ${teamName(dirty.teamId)}`, playerId: dirty.id });
  }
  return cards;
}
