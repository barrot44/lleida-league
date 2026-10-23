import type { CategoryId, Position } from '@/types';

/**
 * Everything the OBS overlay shows lives in ONE small JSON document. The admin panel edits it and publishes it;
 * the overlay (a transparent browser source inside OBS) only renders it. Graphics carry a snapshot of the data
 * they need, so the overlay never has to download the whole league.
 */

export interface ObsTeam {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  presidentName?: string;
}

export interface ObsPlayer {
  id: string;
  name: string;
  nickname?: string;
  dorsal: number;
  position: Position;
  photoUrl: string;
  teamId: string;
}

export interface ObsPlayerStats {
  goals: number;
  assists: number;
  mvpAwards: number;
  matchesPlayed: number;
  yellowCards: number;
  redCards: number;
  rating: number;
}

export type ObsPeriod = '1T' | 'DESC' | '2T' | 'PRO' | 'PEN' | 'FINAL';

export interface ObsClock {
  running: boolean;
  /** Elapsed time banked before the current run (ms). */
  baseMs: number;
  /** Epoch ms when the clock was last started (null while stopped). */
  startedAt: number | null;
  periodMinutes: number;
  /** true → shows the remaining time (20:00 → 00:00) like a futsal scoreboard. */
  countdown: boolean;
}

export interface ObsScoreboard {
  visible: boolean;
  matchId: string | null;
  category: CategoryId;
  matchday: number | null;
  home: ObsTeam | null;
  away: ObsTeam | null;
  homeScore: number;
  awayScore: number;
  /** Accumulated fouls of the current half (futsal: from the 6th, double penalty). */
  homeFouls: number;
  awayFouls: number;
  period: ObsPeriod;
  clock: ObsClock;
}

export type ObsFlashKind = 'goal' | 'yellow_card' | 'red_card' | 'timeout';

/** One-shot animation (goal, card, time-out). Plays once when `id` changes and `at` is recent. */
export interface ObsFlash {
  id: string;
  kind: ObsFlashKind;
  at: number;
  team: ObsTeam;
  player?: ObsPlayer;
  ownGoal?: boolean;
  minute?: number;
  home?: ObsTeam;
  away?: ObsTeam;
  homeScore?: number;
  awayScore?: number;
}

export interface ObsLowerThird {
  visible: boolean;
  /** Changes every time it is (re)shown, so the entry animation replays. */
  id: string;
  title: string;
  subtitle: string;
  team: ObsTeam | null;
  hideAt: number | null;
}

export interface ObsTicker {
  visible: boolean;
  label: string;
  items: string[];
}

export interface ObsStandingRow {
  position: number;
  team: ObsTeam;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDiff: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface ObsResult {
  id: string;
  home: ObsTeam;
  away: ObsTeam;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'live' | 'finished';
  time: string;
  date: string;
}

export interface ObsSummaryEvent {
  minute: number;
  kind: 'goal' | 'own_goal' | 'yellow_card' | 'red_card';
  playerName: string;
  /** Side that benefits / is affected: goals count for this side, cards belong to it. */
  side: 'home' | 'away';
}

export type ObsGraphic =
  | { kind: 'lineup'; team: ObsTeam; starters: ObsPlayer[]; bench: ObsPlayer[]; title: string }
  | { kind: 'preview'; home: ObsTeam; away: ObsTeam; matchday: number | null; date: string; time: string; venue: string; categoryLabel: string; homeRow: ObsStandingRow | null; awayRow: ObsStandingRow | null }
  | { kind: 'player'; player: ObsPlayer; team: ObsTeam; title: string; stats: ObsPlayerStats; matchLine: string }
  | { kind: 'standings'; categoryLabel: string; rows: ObsStandingRow[]; highlight: string[]; playoffSpots: number; relegationSpots: number; totalTeams: number }
  | { kind: 'scorers'; categoryLabel: string; rows: { player: ObsPlayer; team: ObsTeam; goals: number; assists: number }[] }
  | { kind: 'results'; categoryLabel: string; matchday: number; matches: ObsResult[] }
  | { kind: 'summary'; title: string; home: ObsTeam; away: ObsTeam; homeScore: number; awayScore: number; events: ObsSummaryEvent[] };

export type ObsGraphicKind = ObsGraphic['kind'];

export interface ObsMain {
  visible: boolean;
  id: string;
  graphic: ObsGraphic | null;
  hideAt: number | null;
}

export type ObsScreenKind = 'starting' | 'brb' | 'halftime' | 'ending';

export interface ObsScreen {
  visible: boolean;
  kind: ObsScreenKind;
  title: string;
  subtitle: string;
  /** ISO instant for the "starting soon" countdown. Empty = no countdown. */
  targetAt: string;
}

export interface ObsSponsorItem {
  name: string;
  logoUrl: string;
}

export interface ObsState {
  v: 1;
  /** Epoch ms of the last edit (used to discard stale copies). */
  ts: number;
  accent: string;
  categoryLabel: string;
  scoreboard: ObsScoreboard;
  flash: ObsFlash | null;
  lower: ObsLowerThird;
  ticker: ObsTicker;
  main: ObsMain;
  screen: ObsScreen;
  brand: { visible: boolean };
  sponsors: { visible: boolean; items: ObsSponsorItem[]; seconds: number };
  replay: { visible: boolean };
}

/** Layers that can be switched on/off in the overlay URL (`/obs?capes=marcador,rotul`). */
export const OBS_LAYERS = [
  { id: 'marcador', label: 'Marcador' },
  { id: 'avisos', label: 'Gols, targetes i temps morts' },
  { id: 'grafics', label: 'Gràfics centrals' },
  { id: 'rotul', label: 'Rètol' },
  { id: 'barra', label: 'Barra inferior' },
  { id: 'marca', label: 'Marca i patrocinadors' },
  { id: 'pantalles', label: 'Pantalles completes' },
] as const;

export type ObsLayerId = (typeof OBS_LAYERS)[number]['id'];
