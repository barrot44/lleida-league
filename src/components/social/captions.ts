import type { CategoryMeta, Match, Player, Team } from '@/types';
import type { StandingRow } from '@/lib/standings';
import { SITE } from '@/config/site';
import { formatDay } from '@/lib/utils';

const tail = `\n\n${SITE.handle}\n${SITE.hashtags.join(' ')}`;

const scorers = (match: Match, teamId: string) =>
  match.events
    .filter((e) => (e.type === 'goal' && e.teamId === teamId) || (e.type === 'own_goal' && e.teamId !== teamId))
    .map((e) => `${e.playerName}${e.type === 'own_goal' ? ' (p.p.)' : ''} ${e.minute}'`);

export function matchCaption(match: Match, home: Team, away: Team, cat: CategoryMeta, mvp?: Player): string {
  if (match.status === 'scheduled') {
    return `🔥 PROPER PARTIT · ${cat.short} · J${match.matchday}\n\n${home.name} 🆚 ${away.name}\n\n🗓️ ${formatDay(match.date)} · ${match.time}h\n📍 ${match.venue}${tail}`;
  }
  const head = match.status === 'live' ? '🔴 EN DIRECTE' : '🏁 RESULTAT FINAL';
  const lines = [
    `${head} · ${cat.short} · J${match.matchday}`,
    '',
    `${home.name} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${away.name}`,
  ];
  const hg = scorers(match, home.id);
  const ag = scorers(match, away.id);
  if (hg.length) lines.push('', `⚽ ${home.shortName}: ${hg.join(', ')}`);
  if (ag.length) lines.push(`⚽ ${away.shortName}: ${ag.join(', ')}`);
  if (mvp) lines.push('', `⭐ MVP del partit: ${mvp.name}`);
  lines.push('', `📍 ${match.venue}`);
  return lines.join('\n') + tail;
}

export function matchdayCaption(cat: CategoryMeta, matchday: number, rows: { match: Match; home: Team; away: Team }[], mode: 'results' | 'fixtures'): string {
  const head = mode === 'results' ? `📊 RESULTATS · ${cat.short} · JORNADA ${matchday}` : `🗓️ CARTELL · ${cat.short} · JORNADA ${matchday}`;
  const body = rows.map(({ match, home, away }) =>
    match.status === 'scheduled' || mode === 'fixtures'
      ? `• ${home.shortName} vs ${away.shortName} — ${formatDay(match.date)} ${match.time}h`
      : `• ${home.shortName} ${match.homeScore ?? 0}-${match.awayScore ?? 0} ${away.shortName}`,
  );
  return `${head}\n\n${body.join('\n')}${tail}`;
}

export function standingsCaption(cat: CategoryMeta, rows: StandingRow[]): string {
  const body = rows.slice(0, 5).map((r) => `${r.position}. ${r.team.name} — ${r.points} pts`);
  return `🏆 CLASSIFICACIÓ · ${cat.label}\n\n${body.join('\n')}\n\nTaula completa a la web!${tail}`;
}

export function scorersCaption(cat: CategoryMeta, entries: { player: Player; team?: Team }[]): string {
  const body = entries.map((e, i) => `${i + 1}. ${e.player.name} (${e.team?.shortName ?? '—'}) — ${e.player.stats.goals} gols`);
  return `👑 PITXITXI · ${cat.label}\n\n${body.join('\n')}${tail}`;
}

export function mvpCaption(cat: CategoryMeta, player: Player, team: Team | undefined, label: string): string {
  return `⭐ MVP · ${label}\n\n${player.name}${team ? ` (${team.name})` : ''} — ${cat.label}\n\nEnhorabona, crack! 👏${tail}`;
}
