import { useMemo, useState, type ReactNode } from 'react';
import { BarChart3, CalendarDays, ClipboardList, Crown, EyeOff, LayoutGrid, Medal, Send, Star, Swords, Trophy, Users } from 'lucide-react';
import type { Player, Team } from '@/types';
import { editionOf } from '@/lib/cardArt';
import { balances, usesLleidalitos } from '@/lib/lleidalitos';
import { walkoutDuration } from '@/obs/overlay/Walkout';
import type { ObsGraphic, ObsGraphicKind, PresidentStats } from '@/obs/types';
import { buildResults, buildStandings, categoryLabel, playerSnap, playerStatsSnap, squadOrder, summaryEvents, teamSnap } from '@/obs/state';
import { useObsStore } from '@/obs/useObsStore';
import { useLeagueStore } from '@/store/useLeagueStore';
import { CATEGORY_BY_ID, POSITION_SHORT } from '@/config/site';
import { matchdaysOf } from '@/lib/standings';
import { SectionCard } from '@/components/admin/fields';
import type { Side, useObsActions } from '@/components/admin/obs/useObsActions';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

const AUTO_HIDE = [
  [0, 'Manual'],
  [10, '10 s'],
  [15, '15 s'],
  [20, '20 s'],
  [30, '30 s'],
] as const;

const PLAYER_TITLES = ['MVP del partit', 'Jugador destacat', 'Golejador del partit', 'Jugador de la jornada', 'El president'];

interface TileProps {
  icon: ReactNode;
  title: string;
  active: boolean;
  onShow: () => void;
  children?: ReactNode;
  disabled?: boolean;
  /** Text of the main button (default «Mostra»). */
  showLabel?: string;
  /** A second way of showing it (e.g. big instead of under the scoreboard). */
  secondary?: { label: string; onClick: () => void };
}

function Tile({ icon, title, active, onShow, children, disabled, showLabel = 'Mostra', secondary }: TileProps) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-2xl border p-3.5 transition', active ? 'border-amber-400/70 bg-amber-400/[0.07] shadow-glow' : 'border-white/[0.08] bg-white/[0.03]')}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-display text-base font-black uppercase tracking-wide text-white">
          <span className="text-amber-400">{icon}</span> {title}
        </span>
        {active && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">En antena</span>}
      </div>
      {children}
      <div className={cn('mt-auto grid gap-2', secondary && 'grid-cols-[1fr_auto]')}>
        <button className={active ? 'btn-ghost' : 'btn-gold'} disabled={disabled} onClick={onShow}>
          <Send size={15} /> {active && !secondary ? 'Torna a mostrar' : showLabel}
        </button>
        {secondary && (
          <button className="btn-ghost" disabled={disabled} onClick={secondary.onClick}>
            {secondary.label}
          </button>
        )}
      </div>
    </div>
  );
}

/** Central graphics: lineups, preview, featured player, tables, results and match summary. */
export function GraphicsControls({ actions }: { actions: Actions }) {
  const state = useObsStore((s) => s.state);
  const sb = state.scoreboard;
  const teams = useLeagueStore((s) => s.teams);
  const players = useLeagueStore((s) => s.players);
  const matches = useLeagueStore((s) => s.matches);
  const champions = useLeagueStore((s) => s.champions);
  const lleidalitoTx = useLeagueStore((s) => s.lleidalitoTx);
  const toast = useUiStore((s) => s.toast);

  const [autoHide, setAutoHide] = useState(0);
  const [lineupSide, setLineupSide] = useState<Side>('home');
  const [starters, setStarters] = useState<Record<Side, string[]>>({ home: [], away: [] });
  const [playerId, setPlayerId] = useState('');
  const [playerTitle, setPlayerTitle] = useState(PLAYER_TITLES[0]);
  const [tableSize, setTableSize] = useState<'all' | 'top8'>('all');
  const [scorersSize, setScorersSize] = useState(5);
  const category = sb.category;
  const days = useMemo(() => matchdaysOf(matches, category), [matches, category]);
  const [matchday, setMatchday] = useState<number | null>(null);
  const day = matchday && days.includes(matchday) ? matchday : (sb.matchday ?? days[days.length - 1] ?? 1);

  const linked = matches.find((m) => m.id === sb.matchId);
  const homeTeam = teams.find((t) => t.id === sb.home?.id);
  const awayTeam = teams.find((t) => t.id === sb.away?.id);
  const squads = useMemo(
    () => ({
      home: players.filter((p) => p.teamId === sb.home?.id).sort(squadOrder),
      away: players.filter((p) => p.teamId === sb.away?.id).sort(squadOrder),
    }),
    [players, sb.home?.id, sb.away?.id],
  );
  const matchPlayers = [...squads.home, ...squads.away];
  const catPlayers = useMemo(() => players.filter((p) => teams.find((t) => t.id === p.teamId)?.category === category), [players, teams, category]);
  const pickable = matchPlayers.length ? matchPlayers : catPlayers;
  const featured = players.find((p) => p.id === playerId) ?? pickable[0];

  const main = state.main;
  const onAir = (kind: ObsGraphicKind, extra?: (g: ObsGraphic) => boolean) => main.visible && main.graphic?.kind === kind && (!extra || extra(main.graphic));
  const stripOn = (kind: 'player' | 'poll') => state.strip.visible && state.strip.item?.kind === kind;
  const show = (g: ObsGraphic, hideAfter = autoHide) => actions.showGraphic(g, hideAfter);
  const needTeams = () => {
    toast('Primer tria els dos equips al marcador.', 'error');
  };

  const cat = CATEGORY_BY_ID[category];

  const toggleStarter = (id: string) =>
    setStarters((s) => {
      const list = s[lineupSide];
      if (list.includes(id)) return { ...s, [lineupSide]: list.filter((x) => x !== id) };
      if (list.length >= 5) {
        toast('Un quintet són 5 jugadors.', 'info');
        return s;
      }
      return { ...s, [lineupSide]: [...list, id] };
    });

  const showLineup = () => {
    const team = lineupSide === 'home' ? homeTeam : awayTeam;
    if (!team) return needTeams();
    const squad = squads[lineupSide];
    const chosen = starters[lineupSide].map((id) => squad.find((p) => p.id === id)).filter((p): p is Player => !!p);
    const bench = squad.filter((p) => !chosen.includes(p));
    show({ kind: 'lineup', team: teamSnap(team), starters: chosen.map(playerSnap), bench: bench.map(playerSnap), title: chosen.length ? 'Quintet inicial' : 'Plantilla' });
  };

  /** Player presentation: the chosen starters of that side, or the whole squad. */
  const showWalkout = (side: Side) => {
    const team = side === 'home' ? homeTeam : awayTeam;
    if (!team) return needTeams();
    const squad = squads[side];
    const chosen = starters[side].map((id) => squad.find((p) => p.id === id)).filter((p): p is Player => !!p);
    const list = (chosen.length ? chosen : squad).slice(0, 12);
    if (!list.length) return toast('Aquest equip no té jugadors.', 'error');
    show(
      {
        kind: 'walkout',
        team: teamSnap(team),
        title: chosen.length ? 'Quintet inicial' : 'Plantilla',
        players: list.map((p) => ({ player: p, edition: editionOf(p, catPlayers) })),
      },
      Math.ceil(walkoutDuration(list.length)),
    );
  };

  const showPresidents = () => {
    if (!homeTeam || !awayTeam) return needTeams();
    const table = buildStandings({ teams, matches }, homeTeam.category);
    const money = balances(teams, lleidalitoTx);
    const statsOf = (t: Team): PresidentStats => {
      const row = table.find((r) => r.team.id === t.id);
      return {
        lleidalitos: usesLleidalitos(t) ? (money.get(t.id) ?? 0) : null,
        titles: champions.filter((c) => c.team.trim().toLowerCase() === t.name.trim().toLowerCase()).length,
        position: row?.position ?? null,
        points: row?.points ?? null,
        form: row?.form ?? [],
      };
    };
    const meetings = matches
      .filter((m) => m.status === 'finished' && [m.homeTeamId, m.awayTeamId].includes(homeTeam.id) && [m.homeTeamId, m.awayTeamId].includes(awayTeam.id))
      .sort((a, b) => b.date.localeCompare(a.date));
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    for (const m of meetings) {
      const hs = m.homeTeamId === homeTeam.id ? m.homeScore! : m.awayScore!;
      const as = m.homeTeamId === homeTeam.id ? m.awayScore! : m.homeScore!;
      if (hs > as) homeWins++;
      else if (as > hs) awayWins++;
      else draws++;
    }
    const last = meetings[0];
    const name = (id: string) => teams.find((t) => t.id === id)?.shortName ?? '?';
    show({
      kind: 'presidents',
      home: teamSnap(homeTeam),
      away: teamSnap(awayTeam),
      homeStats: statsOf(homeTeam),
      awayStats: statsOf(awayTeam),
      h2h: { homeWins, draws, awayWins, last: last ? `${name(last.homeTeamId)} ${last.homeScore}-${last.awayScore} ${name(last.awayTeamId)} (J${last.matchday})` : null },
      categoryLabel: categoryLabel(homeTeam.category),
    });
  };

  const showPreview = () => {
    if (!homeTeam || !awayTeam) return needTeams();
    const table = buildStandings({ teams, matches }, homeTeam.category);
    show({
      kind: 'preview',
      home: teamSnap(homeTeam),
      away: teamSnap(awayTeam),
      matchday: linked?.matchday ?? sb.matchday,
      date: linked?.date ?? '',
      time: linked?.time ?? '',
      venue: linked?.venue ?? '',
      categoryLabel: categoryLabel(homeTeam.category),
      homeRow: table.find((r) => r.team.id === homeTeam.id) ?? null,
      awayRow: table.find((r) => r.team.id === awayTeam.id) ?? null,
    });
  };

  const showStats = () => {
    const g = actions.statsGraphic(state, 'En directe');
    if (!g) return needTeams();
    show(g);
  };

  /** Under the scoreboard (compact) or as the big central card. */
  const showPlayer = (where: 'under' | 'big') => {
    if (!featured) return toast('No hi ha jugadors per mostrar.', 'error');
    const team = teams.find((t) => t.id === featured.teamId);
    if (!team) return;
    let matchLine = '';
    if (linked) {
      const g = linked.events.filter((e) => e.type === 'goal' && e.playerId === featured.id).length;
      const a = linked.events.filter((e) => e.type === 'goal' && e.assistPlayerId === featured.id).length;
      const parts = [g ? `${g} ${g === 1 ? 'gol' : 'gols'}` : '', a ? `${a} ${a === 1 ? 'assistència' : 'assistències'}` : ''].filter(Boolean);
      if (parts.length) matchLine = `En aquest partit: ${parts.join(' · ')}`;
    }
    const item = { kind: 'player' as const, player: playerSnap(featured), team: teamSnap(team), title: playerTitle.trim() || 'Jugador destacat', stats: playerStatsSnap(featured), matchLine };
    if (where === 'big') show(item);
    else actions.showStrip(item, autoHide || 15);
  };

  const showStandings = () => {
    const rows = buildStandings({ teams, matches }, category);
    show({
      kind: 'standings',
      categoryLabel: cat.label,
      rows: tableSize === 'top8' ? rows.slice(0, 8) : rows,
      highlight: [sb.home?.id, sb.away?.id].filter((x): x is string => !!x),
      playoffSpots: cat.playoffSpots,
      relegationSpots: cat.relegationSpots,
      totalTeams: rows.length,
    });
  };

  const showScorers = () => {
    const rows = catPlayers
      .filter((p) => p.stats.goals > 0)
      .sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists || a.name.localeCompare(b.name, 'es'))
      .slice(0, scorersSize)
      .flatMap((p) => {
        const t = teams.find((x) => x.id === p.teamId);
        return t ? [{ player: playerSnap(p), team: teamSnap(t), goals: p.stats.goals, assists: p.stats.assists }] : [];
      });
    show({ kind: 'scorers', categoryLabel: cat.label, rows });
  };

  const showResults = () => show({ kind: 'results', categoryLabel: cat.label, matchday: day, matches: buildResults({ teams, matches }, category, day) });

  const showSummary = () => {
    if (!sb.home || !sb.away) return needTeams();
    const title = sb.period === 'FINAL' ? 'Final' : sb.period === 'DESC' ? 'Descans' : 'Resum';
    show({ kind: 'summary', title, home: sb.home, away: sb.away, homeScore: sb.homeScore, awayScore: sb.awayScore, events: linked ? summaryEvents(linked) : [] });
  };

  const squad = squads[lineupSide];

  return (
    <SectionCard
      title="Gràfics"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            S’amaga
            <select className="input !w-auto !py-1.5" value={autoHide} onChange={(e) => setAutoHide(Number(e.target.value))}>
              {AUTO_HIDE.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn-danger !py-2"
            disabled={!main.visible && !stripOn('player')}
            onClick={() => {
              actions.hideGraphic();
              if (stripOn('player')) actions.hideStrip();
            }}
          >
            <EyeOff size={15} /> Amaga
          </button>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Tile icon={<Swords size={18} />} title="Prèvia del partit" active={onAir('preview')} onShow={showPreview}>
          <p className="text-xs text-slate-400">Els dos escuts cara a cara, posició a la taula, ratxa i data del partit.</p>
        </Tile>
        <Tile icon={<Crown size={18} />} title="Cara a cara de presidents" active={onAir('presidents')} onShow={showPresidents}>
          <p className="text-xs text-slate-400">Els dos presidents amb Lleidalitos, títols, posició, ratxa i els seus duels anteriors. La foto es posa a Equips.</p>
        </Tile>
        <Tile icon={<LayoutGrid size={18} />} title="Alineació" active={onAir('lineup', (g) => g.kind === 'lineup' && g.team.id === (lineupSide === 'home' ? sb.home?.id : sb.away?.id))} onShow={showLineup}>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-pitch/60 p-1">
            {(['home', 'away'] as const).map((s) => (
              <button key={s} onClick={() => setLineupSide(s)} className={cn('truncate rounded-lg px-2 py-1.5 text-xs font-black uppercase tracking-wide transition', lineupSide === s ? 'bg-white/10 text-white' : 'text-slate-500')}>
                {(s === 'home' ? sb.home?.shortName : sb.away?.shortName) ?? (s === 'home' ? 'Local' : 'Visitant')}
              </button>
            ))}
          </div>
          {squad.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">Toca fins a 5 titulars per veure’ls sobre la pista ({starters[lineupSide].length}/5). Sense titulars, surt la plantilla.</p>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {squad.map((p) => {
                  const on = starters[lineupSide].includes(p.id);
                  return (
                    <button key={p.id} onClick={() => toggleStarter(p.id)} className={cn('rounded-lg border px-2 py-1 text-xs font-bold transition', on ? 'border-amber-400 bg-amber-400/20 text-amber-200' : 'border-white/10 text-slate-400 hover:text-white')}>
                      {p.dorsal} {p.name.split(' ')[0]} <span className="text-[10px] opacity-60">{POSITION_SHORT[p.position]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Tria els equips al marcador per veure’n els jugadors.</p>
          )}
        </Tile>
        <div className={cn('flex flex-col gap-3 rounded-2xl border p-3.5 transition', onAir('walkout') ? 'border-amber-400/70 bg-amber-400/[0.07] shadow-glow' : 'border-white/[0.08] bg-white/[0.03]')}>
          <span className="flex items-center justify-between gap-2 font-display text-base font-black uppercase tracking-wide text-white">
            <span className="flex items-center gap-2">
              <span className="text-amber-400">
                <Users size={18} />
              </span>
              Presentació de jugadors
            </span>
            {onAir('walkout') && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">En antena</span>}
          </span>
          <p className="text-xs text-slate-400">Un a un amb la seva carta. Fa servir els titulars triats a «Alineació» (o tota la plantilla) i s’amaga sol en acabar.</p>
          <div className="mt-auto grid grid-cols-2 gap-2">
            {(['home', 'away'] as const).map((s) => (
              <button key={s} className="btn-gold !px-2" onClick={() => showWalkout(s)} disabled={!(s === 'home' ? sb.home : sb.away)}>
                <Send size={14} /> {(s === 'home' ? sb.home?.shortName : sb.away?.shortName) ?? (s === 'home' ? 'Local' : 'Visitant')}
              </button>
            ))}
          </div>
        </div>
        <Tile icon={<ClipboardList size={18} />} title="Resum (descans / final)" active={onAir('summary')} onShow={showSummary}>
          <p className="text-xs text-slate-400">Marcador amb golejadors i targetes{linked ? ' del partit carregat' : ''}. El títol segueix la part: Descans o Final.</p>
        </Tile>
        <Tile icon={<BarChart3 size={18} />} title="Estadístiques en directe" active={onAir('stats')} onShow={showStats}>
          <p className="text-xs text-slate-400">Xuts, parades, córners, faltes i targetes dels dos equips (es compten a «Estadístiques en directe»).</p>
        </Tile>
        <Tile icon={<CalendarDays size={18} />} title="Resultats de la jornada" active={onAir('results')} onShow={showResults} disabled={days.length === 0}>
          <select className="input !py-2" value={day} onChange={(e) => setMatchday(Number(e.target.value))} aria-label="Jornada">
            {days.map((d) => (
              <option key={d} value={d}>
                Jornada {d}
              </option>
            ))}
          </select>
        </Tile>
        <Tile
          icon={<Star size={18} />}
          title="Jugador destacat / MVP"
          active={onAir('player') || stripOn('player')}
          onShow={() => showPlayer('under')}
          showLabel="Sota el marcador"
          disabled={!featured}
          secondary={{ label: 'Gran', onClick: () => showPlayer('big') }}
        >
          <select className="input !py-2" value={featured?.id ?? ''} onChange={(e) => setPlayerId(e.target.value)} aria-label="Jugador">
            {pickable.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.dorsal} {p.name} · {teams.find((t) => t.id === p.teamId)?.shortName}
              </option>
            ))}
          </select>
          <input className="input !py-2" list="obs-player-titles" value={playerTitle} onChange={(e) => setPlayerTitle(e.target.value)} aria-label="Títol" placeholder="Títol del gràfic" />
          <datalist id="obs-player-titles">
            {PLAYER_TITLES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Tile>
        <Tile icon={<Medal size={18} />} title="Golejadors" active={onAir('scorers')} onShow={showScorers}>
          <select className="input !py-2" value={scorersSize} onChange={(e) => setScorersSize(Number(e.target.value))} aria-label="Quants">
            <option value={5}>Top 5</option>
            <option value={8}>Top 8</option>
          </select>
        </Tile>
        <Tile icon={<Trophy size={18} />} title="Classificació" active={onAir('standings')} onShow={showStandings}>
          <select className="input !py-2" value={tableSize} onChange={(e) => setTableSize(e.target.value as 'all' | 'top8')} aria-label="Files">
            <option value="all">Tots els equips</option>
            <option value="top8">Només els 8 primers</option>
          </select>
          <p className="text-xs text-slate-500">Els dos equips del marcador surten ressaltats.</p>
        </Tile>
        <div className="flex flex-col justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-4 text-xs text-slate-500">
          <BarChart3 size={18} className="text-slate-600" />
          Cada gràfic es pot tornar a llançar per repetir l’animació. Només se’n veu un alhora: mostrar-ne un altre substitueix l’anterior.
        </div>
      </div>
    </SectionCard>
  );
}
