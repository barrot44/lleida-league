import type { CategoryId, LeagueData, Match, Player, Team } from '@/types';
import type { ObsClock, ObsPeriod, ObsPlayer, ObsPlayerStats, ObsResult, ObsStandingRow, ObsState, ObsSummaryEvent, ObsTeam } from '@/obs/types';
import { CATEGORY_BY_ID, POSITIONS } from '@/config/site';
import { DEFAULT_DECK, mergeDeck } from '@/obs/cards';
import { computeStandings, playerRating, type StandingRow } from '@/lib/standings';
import { matchTimestamp } from '@/lib/utils';

export const PERIOD_LABEL: Record<ObsPeriod, string> = {
  '1T': '1a part',
  DESC: 'Descans',
  '2T': '2a part',
  PRO: 'Pròrroga',
  PEN: 'Penals',
  FINAL: 'Final',
};

/** Short text for the scoreboard. */
export const PERIOD_SHORT: Record<ObsPeriod, string> = { '1T': '1T', DESC: 'DESC', '2T': '2T', PRO: 'PRÒ', PEN: 'PEN', FINAL: 'FINAL' };

export const SCREEN_DEFAULTS = {
  starting: { title: 'Comencem aviat', subtitle: 'El directe començarà en breus moments' },
  brb: { title: 'Tornem de seguida', subtitle: 'No marxis, continuem en un moment' },
  halftime: { title: 'Descans', subtitle: 'Tornem amb la segona part' },
  ending: { title: 'Gràcies per veure’ns', subtitle: 'Segueix-nos a les xarxes per no perdre’t res' },
} as const;

export function defaultObsState(): ObsState {
  return {
    v: 1,
    ts: 0,
    accent: '#F59E0B',
    categoryLabel: 'Senior League',
    scoreboard: {
      visible: false,
      matchId: null,
      category: 'senior',
      matchday: null,
      home: null,
      away: null,
      homeScore: 0,
      awayScore: 0,
      homeFouls: 0,
      awayFouls: 0,
      period: '1T',
      clock: { running: false, baseMs: 0, startedAt: null, periodMinutes: 20, countdown: true },
    },
    flash: null,
    lower: { visible: false, id: '', title: '', subtitle: '', team: null, hideAt: null },
    ticker: { visible: false, label: 'Lleida League', items: [] },
    main: { visible: false, id: '', graphic: null, hideAt: null },
    screen: { visible: false, kind: 'starting', title: '', subtitle: '', targetAt: '' },
    brand: { visible: true },
    sponsors: { visible: false, items: [], seconds: 8 },
    replay: { visible: false },
    qr: { visible: false, url: '', label: 'Tota la lliga a la web' },
    transition: null,
    cmds: [],
    clips: [],
    dice: {
      labels: ['', '', '', ''],
      videos: ['DAU NUMERO 1.mp4', 'Dau numero 2.mp4', 'DAU NUMERO 3.mp4', 'DAU NUMERO 4.mp4'].map((f) => `C:/Users/ferra/Desktop/LLEIDA LEAGUE/VIDEOS I FOTOS/VIDEOS DAUS/${f}`),
      playVideo: false,
      last: null,
    },
    cards: { deck: DEFAULT_DECK, request: null, draw: null, active: null, history: [] },
  };
}

/** Accepts anything (old copies, half-written rows) and always returns a complete state. */
export function normalizeObsState(raw: unknown): ObsState {
  const base = defaultObsState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<ObsState>;
  return {
    ...base,
    ...r,
    v: 1,
    scoreboard: { ...base.scoreboard, ...r.scoreboard, clock: { ...base.scoreboard.clock, ...r.scoreboard?.clock } },
    lower: { ...base.lower, ...r.lower },
    ticker: { ...base.ticker, ...r.ticker, items: Array.isArray(r.ticker?.items) ? r.ticker.items : [] },
    main: { ...base.main, ...r.main },
    screen: { ...base.screen, ...r.screen },
    brand: { ...base.brand, ...r.brand },
    sponsors: { ...base.sponsors, ...r.sponsors, items: Array.isArray(r.sponsors?.items) ? r.sponsors.items : [] },
    replay: { ...base.replay, ...r.replay },
    qr: { ...base.qr, ...r.qr },
    flash: r.flash ?? null,
    transition: r.transition ?? null,
    cmds: Array.isArray(r.cmds) ? r.cmds : [],
    clips: Array.isArray(r.clips) ? r.clips : [],
    dice: { ...base.dice, ...r.dice, last: r.dice?.last ?? null },
    cards: {
      ...base.cards,
      ...r.cards,
      deck: mergeDeck(r.cards?.deck),
      request: r.cards?.request ?? null,
      draw: r.cards?.draw ?? null,
      active: r.cards?.active ?? null,
      history: Array.isArray(r.cards?.history) ? r.cards.history : [],
    },
  };
}

// ───────────────────────── Clock ─────────────────────────

export const clockElapsed = (c: ObsClock, now = Date.now()) => Math.max(0, c.baseMs + (c.running && c.startedAt ? now - c.startedAt : 0));

export const periodMs = (c: ObsClock) => Math.max(1, c.periodMinutes) * 60_000;

/** `mm:ss` as the scoreboard shows it (remaining time in countdown mode, clamped to the period). */
export function clockText(c: ObsClock, now = Date.now()) {
  const elapsed = Math.min(clockElapsed(c, now), periodMs(c));
  const ms = c.countdown ? periodMs(c) - elapsed : elapsed;
  const total = c.countdown ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Match minute (1-based, counting the second half from where the first ended). */
export function matchMinute(c: ObsClock, period: ObsPeriod, now = Date.now()) {
  const inPeriod = Math.min(clockElapsed(c, now), periodMs(c));
  const offset = period === '2T' || period === 'PRO' || period === 'PEN' || period === 'FINAL' ? c.periodMinutes : 0;
  return Math.min(offset + Math.floor(inPeriod / 60_000) + 1, offset + c.periodMinutes);
}

export const startClock = (c: ObsClock, now = Date.now()): ObsClock => (c.running ? c : { ...c, running: true, startedAt: now });
export const pauseClock = (c: ObsClock, now = Date.now()): ObsClock =>
  c.running ? { ...c, running: false, baseMs: Math.min(clockElapsed(c, now), periodMs(c)), startedAt: null } : c;
export const resetClock = (c: ObsClock): ObsClock => ({ ...c, running: false, baseMs: 0, startedAt: null });
/** Moves the clock by `deltaMs` of match time (positive = more time played). */
export function nudgeClock(c: ObsClock, deltaMs: number, now = Date.now()): ObsClock {
  const elapsed = Math.min(Math.max(0, clockElapsed(c, now) + deltaMs), periodMs(c));
  return c.running ? { ...c, baseMs: elapsed, startedAt: now } : { ...c, baseMs: elapsed };
}

// ───────────────────────── Snapshots from the league data ─────────────────────────

export const teamSnap = (t: Team): ObsTeam => ({
  id: t.id,
  name: t.name,
  shortName: t.shortName,
  primaryColor: t.primaryColor,
  secondaryColor: t.secondaryColor,
  logoUrl: t.logoUrl,
  presidentName: t.presidentName || undefined,
});

export const playerSnap = (p: Player): ObsPlayer => ({
  id: p.id,
  name: p.name,
  nickname: p.nickname,
  dorsal: p.dorsal,
  position: p.position,
  photoUrl: p.photoUrl,
  teamId: p.teamId,
});

export const playerStatsSnap = (p: Player): ObsPlayerStats => ({
  goals: p.stats.goals,
  assists: p.stats.assists,
  mvpAwards: p.stats.mvpAwards,
  matchesPlayed: p.stats.matchesPlayed,
  yellowCards: p.stats.yellowCards,
  redCards: p.stats.redCards,
  rating: playerRating(p),
});

const rowSnap = (r: StandingRow): ObsStandingRow => ({
  position: r.position,
  team: teamSnap(r.team),
  played: r.played,
  won: r.won,
  drawn: r.drawn,
  lost: r.lost,
  goalDiff: r.goalDiff,
  points: r.points,
  form: r.form,
});

/** Goalkeepers first, then by position and number — the order a squad is read out on air. */
export const squadOrder = (a: Player | ObsPlayer, b: Player | ObsPlayer) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || a.dorsal - b.dorsal;

export function buildStandings(data: Pick<LeagueData, 'teams' | 'matches'>, category: CategoryId) {
  return computeStandings(data.teams, data.matches, category).map(rowSnap);
}

export function buildResults(data: Pick<LeagueData, 'teams' | 'matches'>, category: CategoryId, matchday: number): ObsResult[] {
  const teams = new Map(data.teams.map((t) => [t.id, t]));
  return data.matches
    .filter((m) => m.category === category && m.matchday === matchday)
    .sort((a, b) => matchTimestamp(a) - matchTimestamp(b))
    .flatMap((m) => {
      const home = teams.get(m.homeTeamId);
      const away = teams.get(m.awayTeamId);
      if (!home || !away) return [];
      return [{ id: m.id, home: teamSnap(home), away: teamSnap(away), homeScore: m.homeScore, awayScore: m.awayScore, status: m.status, time: m.time, date: m.date }];
    });
}

export function summaryEvents(match: Match): ObsSummaryEvent[] {
  return [...match.events]
    .sort((a, b) => a.minute - b.minute)
    .map((e) => {
      const isHome = e.teamId === match.homeTeamId;
      // An own goal is credited to the opposite side.
      const side: 'home' | 'away' = e.type === 'own_goal' ? (isHome ? 'away' : 'home') : isHome ? 'home' : 'away';
      return { minute: e.minute, kind: e.type, playerName: e.playerName, side };
    });
}

/** Lines for the bottom ticker: live and latest results, and the next fixtures of the category. */
export function tickerResultLines(data: Pick<LeagueData, 'teams' | 'matches'>, category: CategoryId): string[] {
  const teams = new Map(data.teams.map((t) => [t.id, t]));
  const label = (m: Match) => {
    const h = teams.get(m.homeTeamId)?.shortName ?? '?';
    const a = teams.get(m.awayTeamId)?.shortName ?? '?';
    if (m.status === 'scheduled') return `J${m.matchday} · ${h} vs ${a} · ${m.time}`;
    return `${m.status === 'live' ? 'EN DIRECTE' : `J${m.matchday}`} · ${h} ${m.homeScore} - ${m.awayScore} ${a}`;
  };
  const cat = data.matches.filter((m) => m.category === category);
  const live = cat.filter((m) => m.status === 'live');
  const done = cat.filter((m) => m.status === 'finished').sort((a, b) => matchTimestamp(b) - matchTimestamp(a)).slice(0, 6);
  const next = cat.filter((m) => m.status === 'scheduled').sort((a, b) => matchTimestamp(a) - matchTimestamp(b)).slice(0, 4);
  return [...live, ...done, ...next].map(label);
}

export const categoryLabel = (c: CategoryId) => CATEGORY_BY_ID[c].label;
