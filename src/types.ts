export type CategoryId = 'senior' | 'juvenil' | 'junior' | 'femenina';

export type Position = 'Portero' | 'Cierre' | 'Ala' | 'Pívot';

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type MatchEventType = 'goal' | 'yellow_card' | 'red_card' | 'own_goal';

export type NewsBadge = 'Oficial' | 'Mercat' | 'Sanció';

export interface PlayerStats {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  mvpAwards: number;
  matchesPlayed: number;
}

export interface Player {
  id: string;
  name: string;
  nickname?: string;
  dorsal: number;
  position: Position;
  teamId: string;
  /** Empty string → an avatar is generated from the team colors. */
  photoUrl: string;
  /** Derived total (match events + manual adjustments). Recomputed by the store, never edit directly. */
  stats: PlayerStats;
  /** Manual corrections added on top of what the match events say (can be negative). */
  adjustments: PlayerStats;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  presidentName: string;
  /** Empty string → a crest is generated from the team colors. */
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  category: CategoryId;
  history: string;
  /** Virtual currency balance ("Lleidalitos"). Optional: only competitions that use it. */
  lleidalitos?: number;
}

export interface MatchEvent {
  id: string;
  minute: number;
  type: MatchEventType;
  playerId: string;
  playerName: string;
  /** Team of the player who performed the action. For `own_goal` the goal is credited to the opponent. */
  teamId: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
}

export interface Match {
  id: string;
  category: CategoryId;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  /** ISO date `YYYY-MM-DD` (local). */
  date: string;
  /** `HH:mm` (local). */
  time: string;
  venue: string;
  liveMinute?: number;
  mvpPlayerId?: string;
  events: MatchEvent[];
}

export interface GalleryItem {
  id: string;
  title: string;
  matchday?: number;
  imageUrl: string;
  category: CategoryId | 'general';
  teamId?: string;
  date: string;
  caption: string;
  tags: string[];
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  date: string;
  badge: NewsBadge;
  category?: CategoryId;
}

export interface Champion {
  id: string;
  category: CategoryId;
  /** Edition number (1st, 2nd…). */
  edition: number;
  year: number;
  /** Free text: champions may belong to teams that no longer exist in the app. */
  team: string;
}

export interface Sponsor {
  id: string;
  name: string;
  url?: string;
  logoUrl?: string;
}

export interface Referee {
  id: string;
  name: string;
  role: string;
}

export type GateMode = 'off' | 'countdown' | 'maintenance';

export interface GateSettings {
  mode: GateMode;
  /** ISO instant (UTC): countdown target, or the estimated return time while in maintenance. Empty = none. */
  launchAt: string;
  /** Custom texts. Empty = use the defaults of the mode. */
  title: string;
  message: string;
  /** Countdown only: let visitors in by themselves when the countdown reaches zero. */
  autoOpen: boolean;
}

export interface SiteSettings {
  gate: GateSettings;
}

export interface LeagueData {
  teams: Team[];
  players: Player[];
  matches: Match[];
  gallery: GalleryItem[];
  news: NewsItem[];
  champions: Champion[];
  sponsors: Sponsor[];
  referees: Referee[];
  settings: SiteSettings;
}

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  short: string;
  /** Number of top positions that qualify for the play-off (position 1 is highlighted in gold). */
  playoffSpots: number;
  /** Number of bottom positions flagged as the danger zone. */
  relegationSpots: number;
  accent: string;
}
