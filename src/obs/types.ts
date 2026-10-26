import type { CategoryId, Player, Position } from '@/types';
import type { Edition } from '@/lib/cardArt';
import type { MvpCandidate } from '@/lib/mvp';

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
  presidentPhotoUrl?: string;
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
  /** Scored while the "Gol doble" card was in force (counts 2). */
  double?: boolean;
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
  | { kind: 'summary'; title: string; home: ObsTeam; away: ObsTeam; homeScore: number; awayScore: number; events: ObsSummaryEvent[] }
  /** Public MVP vote: live bars + QR while open, winner reveal once closed. Results are read live by the overlay. */
  | { kind: 'poll'; pollId: string; title: string; candidates: MvpCandidate[]; closed: boolean; voteUrl: string }
  /** Players presented one by one with their collectible card. */
  | { kind: 'walkout'; team: ObsTeam; title: string; players: { player: Player; edition: Edition }[] }
  /** Live match statistics face to face. */
  | { kind: 'stats'; title: string; home: ObsTeam; away: ObsTeam; homeScore: number; awayScore: number; homeStats: MatchStats; awayStats: MatchStats }
  /** The two presidents face to face. */
  | { kind: 'presidents'; home: ObsTeam; away: ObsTeam; homeStats: PresidentStats; awayStats: PresidentStats; h2h: { homeWins: number; draws: number; awayWins: number; last: string | null }; categoryLabel: string };

export interface PresidentStats {
  lleidalitos: number | null;
  titles: number;
  position: number | null;
  points: number | null;
  form: ('W' | 'D' | 'L')[];
}

export type ObsGraphicKind = ObsGraphic['kind'];

export interface ObsMain {
  visible: boolean;
  id: string;
  graphic: ObsGraphic | null;
  hideAt: number | null;
  /** When it went on air (sequenced graphics such as the player presentation). */
  at?: number;
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
  /** Corner QR code to the website. */
  qr: { visible: boolean; url: string; label: string };
  /** Visual-only logo sting (the overlay plays it once when `id` changes). */
  transition: { id: string; at: number } | null;
  /** Orders for the overlay running inside OBS (scene changes, replays…). Newest last, a few kept. */
  cmds: ObsCommand[];
  /** Plays of the match saved with the replay buffer ("Jugades del partit"). */
  clips: ObsClip[];
  /** The public's dice throw (last two minutes of the first half). */
  dice: ObsDice;
  /** Power cards (Kings League style). */
  cards: ObsCards;
  /** Link of the live video (YouTube, Twitch…) shown on the website's live page. */
  stream: { url: string };
  /** Situations panel: OBS scene chosen for each match situation and the one on air. */
  situations: { scenes: Record<string, string>; active: string | null; transition: boolean };
  /** Interview at the side of the court. */
  interview: ObsInterview;
  /** Arena sounds played by the overlay inside OBS. */
  sound: { enabled: boolean; auto: boolean; volume: number; last: { id: string; at: number; kind: SfxKind } | null };
  /** Live match statistics (tapped from the panel). */
  stats: { home: MatchStats; away: MatchStats };
  /** A fan message approved for the screen. */
  fanMsg: { id: string; at: number; name: string; text: string } | null;
  /** Phone notifications sent automatically (goals, start, final, votes). */
  notify: { auto: boolean };
}

export interface ObsCardDef {
  id: string;
  name: string;
  desc: string;
  /** 0 = instant power; otherwise how long it lasts. */
  minutes: number;
  color: string;
  enabled: boolean;
}

export interface ObsActiveCard {
  id: string;
  cardId: string;
  team: ObsTeam;
  /** 'clock' = counts down with the match clock (stops when it stops); 'real' = wall clock. */
  mode: 'clock' | 'real';
  startAt: number;
  startElapsed: number;
  durationMs: number;
}

export interface ObsCards {
  deck: ObsCardDef[];
  /** A team asked for a card: on-air notice until the draw. */
  request: { id: string; at: number; team: ObsTeam } | null;
  /** The card that came out (plays the shuffle + reveal once per id). */
  draw: { id: string; at: number; team: ObsTeam; cardId: string } | null;
  /** Timed card currently in force. */
  active: ObsActiveCard | null;
  /** Cards drawn in this match. */
  history: { id: string; at: number; teamId: string; teamShort: string; cardId: string }[];
}

export interface ObsDice {
  /** What each result (1–4) means, shown under the number. */
  labels: string[];
  /** Optional video file (on the OBS computer) for each result, played after the animation. */
  videos: string[];
  playVideo: boolean;
  /** Last throw: the face that came out (1–6) and the result it counts as (1–4). */
  last: { id: string; at: number; face: number; result: number } | null;
}

/** Faces 5 and 6 count as 1 and 2: the die only has four real results. */
export const diceResult = (face: number) => (face === 5 ? 1 : face === 6 ? 2 : face);

export type ObsCommand =
  | { id: string; at: number; type: 'scene'; scene: string; transition: boolean }
  | { id: string; at: number; type: 'replay'; clipId: string; label: string; slow: boolean }
  /** Saves the last seconds as a clip WITHOUT putting it on air (played later from the list). */
  | { id: string; at: number; type: 'save'; clipId: string }
  /** Plays a video file of the OBS computer (e.g. the dice result videos) in the replay scene. */
  | { id: string; at: number; type: 'video'; path: string; title: string; label: string; delay?: number }
  | { id: string; at: number; type: 'play'; clipIds: string[]; labels?: string[]; title: string; slow: boolean };

export interface ObsClip {
  id: string;
  label: string;
  minute: number | null;
  at: number;
  starred: boolean;
}

/** What the overlay inside OBS reports back to the control panels. */
export interface ObsExecStatus {
  at: number;
  connected: boolean;
  error: string | null;
  scenes: string[];
  currentScene: string;
  replayBuffer: boolean;
  replayError: string | null;
  busy: string | null;
  /** Clips whose video file this OBS knows (others were saved elsewhere or forgotten). */
  clips: string[];
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

export type SfxKind = 'horn' | 'whistle' | 'cheer' | 'drumroll' | 'card' | 'sting' | 'dice';

export interface MatchStats {
  shots: number;
  onTarget: number;
  fouls: number;
  corners: number;
  saves: number;
  /** Yellow + red cards shown. */
  cards: number;
}

export interface ObsInterview {
  visible: boolean;
  /** Changes every time it is put on air, so the entrance replays. */
  id: string;
  name: string;
  role: string;
  team: ObsTeam | null;
  question: string;
  sponsors: boolean;
}
