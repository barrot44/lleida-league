import { useMemo, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import type { CategoryId } from '@/types';
import { Field } from '@/components/admin/fields';
import { SocialCard } from '@/components/social/SocialCard';
import { matchCaption, matchdayCaption, mvpCaption, quintetCaption, scorersCaption, standingsCaption } from '@/components/social/captions';
import { buildQuintet } from '@/lib/quintet';
import { FORMATS, MatchListTemplate, MatchResultTemplate, MvpTemplate, QuintetTemplate, ScorersTemplate, StandingsTemplate, type SocialFormat } from '@/components/social/templates';
import { EmptyState } from '@/components/ui/Section';
import { CATEGORIES, CATEGORY_BY_ID } from '@/config/site';
import { useLeagueView } from '@/hooks/useLeagueView';
import { useUiStore } from '@/store/useUiStore';
import { formatDay } from '@/lib/utils';

type TemplateId = 'match' | 'matchday' | 'fixtures' | 'standings' | 'scorers' | 'mvp' | 'quintet';

const TEMPLATES: { id: TemplateId; label: string; hint: string }[] = [
  { id: 'match', label: 'Resultat d’un partit', hint: 'Marcador, golejadors i MVP' },
  { id: 'matchday', label: 'Resum de la jornada', hint: 'Tots els resultats' },
  { id: 'fixtures', label: 'Cartell de la jornada', hint: 'Horaris dels propers partits' },
  { id: 'standings', label: 'Classificació', hint: 'Taula amb els primers equips' },
  { id: 'scorers', label: 'Màxims golejadors', hint: 'Pitxitxi i el seu Top 5' },
  { id: 'mvp', label: 'MVP', hint: 'Targeta del millor jugador' },
  { id: 'quintet', label: 'Quintet ideal', hint: 'Els cinc millors de la jornada' },
];

export function SocialStudio() {
  const category = useUiStore((s) => s.category);
  const setCategory = useUiStore((s) => s.setCategory);
  const view = useLeagueView(category);
  const cat = CATEGORY_BY_ID[category];

  const [template, setTemplate] = useState<TemplateId>('match');
  const [format, setFormat] = useState<SocialFormat>('post');
  const [pickedMatchday, setMatchday] = useState<number | null>(null);
  const [pickedMatch, setPickedMatch] = useState<string | null>(null);
  const [pickedMvp, setPickedMvp] = useState<string | null>(null);

  const matchdays = useMemo(() => [...new Set(view.catMatches.map((m) => m.matchday))].sort((a, b) => a - b), [view.catMatches]);
  const lastPlayed = useMemo(() => view.catMatches.filter((m) => m.status !== 'scheduled').reduce((max, m) => Math.max(max, m.matchday), 0) || matchdays[0] || 1, [view.catMatches, matchdays]);
  const nextUp = useMemo(() => view.catMatches.find((m) => m.status === 'scheduled')?.matchday ?? lastPlayed, [view.catMatches, lastPlayed]);
  const matchday = pickedMatchday ?? (template === 'fixtures' ? nextUp : lastPlayed);

  const dayMatches = useMemo(
    () => view.catMatches.filter((m) => m.matchday === matchday).map((match) => ({ match, home: view.teamMap.get(match.homeTeamId), away: view.teamMap.get(match.awayTeamId) })).filter((r): r is { match: typeof r.match; home: NonNullable<typeof r.home>; away: NonNullable<typeof r.away> } => !!r.home && !!r.away),
    [view.catMatches, view.teamMap, matchday],
  );

  const chosen = dayMatches.find((r) => r.match.id === pickedMatch) ?? dayMatches.find((r) => r.match.status !== 'scheduled') ?? dayMatches[0];

  const mvpOptions = useMemo(
    () =>
      dayMatches
        .filter((r) => r.match.mvpPlayerId)
        .map((r) => ({ match: r.match, player: view.playerMap.get(r.match.mvpPlayerId as string) }))
        .filter((o): o is { match: typeof o.match; player: NonNullable<typeof o.player> } => !!o.player),
    [dayMatches, view.playerMap],
  );
  const seasonMvp = useMemo(() => [...view.catPlayers].sort((a, b) => b.stats.mvpAwards - a.stats.mvpAwards)[0], [view.catPlayers]);
  const mvpPlayer = mvpOptions.find((o) => o.player.id === pickedMvp)?.player ?? mvpOptions[0]?.player ?? seasonMvp;
  const mvpLabel = mvpOptions.length > 0 ? `Jornada ${matchday}` : 'Millor de la temporada';

  const standings = view.standings.slice(0, Math.min(10, view.standings.length));
  const scorers = useMemo(
    () =>
      [...view.catPlayers]
        .filter((p) => p.stats.goals > 0)
        .sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists || a.name.localeCompare(b.name, 'es'))
        .slice(0, 5)
        .map((player) => ({ player, team: view.teamMap.get(player.teamId) })),
    [view.catPlayers, view.teamMap],
  );

  const quintet = useMemo(() => buildQuintet(view.catMatches, view.catPlayers, view.teamMap, matchday), [view.catMatches, view.catPlayers, view.teamMap, matchday]);

  const { width, height } = FORMATS[format];

  const art = (() => {
    switch (template) {
      case 'match': {
        if (!chosen) return null;
        const mvp = chosen.match.mvpPlayerId ? view.playerMap.get(chosen.match.mvpPlayerId) : undefined;
        return {
          node: <MatchResultTemplate format={format} category={cat} match={chosen.match} home={chosen.home} away={chosen.away} mvp={mvp} />,
          caption: matchCaption(chosen.match, chosen.home, chosen.away, cat, mvp),
          file: `resultat-${chosen.match.id}`,
        };
      }
      case 'matchday':
      case 'fixtures': {
        if (dayMatches.length === 0) return null;
        const mode = template === 'matchday' ? 'results' : 'fixtures';
        return {
          node: <MatchListTemplate format={format} category={cat} matchday={matchday} matches={dayMatches} mode={mode} />,
          caption: matchdayCaption(cat, matchday, dayMatches, mode),
          file: `${mode}-${category}-j${matchday}`,
        };
      }
      case 'standings':
        if (standings.length === 0) return null;
        return { node: <StandingsTemplate format={format} category={cat} rows={standings} />, caption: standingsCaption(cat, standings), file: `classificacio-${category}` };
      case 'scorers':
        if (scorers.length === 0) return null;
        return { node: <ScorersTemplate format={format} category={cat} entries={scorers} />, caption: scorersCaption(cat, scorers), file: `golejadors-${category}` };
      case 'quintet':
        if (quintet.length === 0) return null;
        return { node: <QuintetTemplate format={format} category={cat} slots={quintet} label={`Jornada ${matchday}`} />, caption: quintetCaption(cat, quintet, `J${matchday}`), file: `quintet-${category}-j${matchday}` };
      case 'mvp': {
        if (!mvpPlayer) return null;
        const team = view.teamMap.get(mvpPlayer.teamId);
        return { node: <MvpTemplate format={format} category={cat} player={mvpPlayer} team={team} label={mvpLabel} />, caption: mvpCaption(cat, mvpPlayer, team, mvpLabel), file: `mvp-${mvpPlayer.id}` };
      }
    }
  })();

  const needsMatchday = template === 'match' || template === 'matchday' || template === 'fixtures' || template === 'mvp' || template === 'quintet';

  return (
    <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
      <div className="space-y-5">
        <p className="text-sm text-slate-400">Crea imatges llestes per a Instagram, TikTok o stories amb les dades de la lliga. Tria una plantilla, ajusta les opcions i descarrega-la o comparteix-la directament.</p>

        <Field label="Plantilla">
          <div className="grid gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`rounded-xl border px-3.5 py-2.5 text-left transition ${template === t.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/[0.03] hover:border-amber-400/40'}`}
              >
                <span className="block font-display text-base font-black uppercase text-white">{t.label}</span>
                <span className="text-xs text-slate-400">{t.hint}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Categoria">
          <select
            className="input"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as CategoryId);
              setMatchday(null);
              setPickedMatch(null);
              setPickedMvp(null);
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        {needsMatchday && (
          <Field label="Jornada">
            <select
              className="input"
              value={matchday}
              onChange={(e) => {
                setMatchday(Number(e.target.value));
                setPickedMatch(null);
                setPickedMvp(null);
              }}
            >
              {matchdays.map((d) => (
                <option key={d} value={d}>
                  Jornada {d}
                </option>
              ))}
            </select>
          </Field>
        )}

        {template === 'match' && dayMatches.length > 0 && (
          <Field label="Partit">
            <select className="input" value={chosen?.match.id ?? ''} onChange={(e) => setPickedMatch(e.target.value)}>
              {dayMatches.map(({ match, home, away }) => (
                <option key={match.id} value={match.id}>
                  {home.shortName} {match.status === 'scheduled' ? 'vs' : `${match.homeScore}-${match.awayScore}`} {away.shortName} · {formatDay(match.date)} {match.time}
                </option>
              ))}
            </select>
          </Field>
        )}

        {template === 'mvp' && mvpOptions.length > 1 && (
          <Field label="MVP del partit">
            <select className="input" value={mvpPlayer?.id ?? ''} onChange={(e) => setPickedMvp(e.target.value)}>
              {mvpOptions.map((o) => (
                <option key={o.match.id} value={o.player.id}>
                  {o.player.name} — {view.teamMap.get(o.player.teamId)?.shortName}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Format">
          <div className="grid gap-2">
            {(Object.keys(FORMATS) as SocialFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${format === f ? 'border-amber-400 bg-amber-400/10 text-white' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-amber-400/40'}`}
              >
                <span className="font-semibold">{FORMATS[f].label}</span>
                <span className="text-xs text-slate-500">{FORMATS[f].hint}</span>
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div>
        {art ? (
          <SocialCard key={`${template}-${format}-${art.file}`} width={width} height={height} filename={art.file} caption={art.caption}>
            {art.node}
          </SocialCard>
        ) : (
          <EmptyState icon={<ImageIcon />} title="Res per mostrar" hint="Aquesta plantilla necessita dades: partits finalitzats, golejadors o MVPs de la categoria i la jornada triades." />
        )}
      </div>
    </div>
  );
}
