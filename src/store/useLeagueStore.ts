import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Champion, GalleryItem, GateSettings, LeagueData, Match, NewsItem, Player, PlayerStats, Referee, Sponsor, Team } from '@/types';
import { DEFAULT_SETTINGS } from '@/lib/gate';
import { createInitialLeagueData } from '@/data/initialLeagueData';
import { emptyStats, recomputePlayerStats } from '@/lib/standings';

export const STORAGE_KEY = 'lleida-league:data';

interface LeagueActions {
  /** Creates or updates a match. Returns `true` when it has just become `finished`. */
  upsertMatch: (match: Match) => boolean;
  deleteMatch: (id: string) => void;
  upsertTeam: (team: Team) => void;
  deleteTeam: (id: string) => void;
  upsertPlayer: (player: Player) => void;
  deletePlayer: (id: string) => void;
  /** Sets the displayed totals of a player; the difference with the match events is stored as adjustment. */
  setPlayerTotals: (id: string, totals: Partial<PlayerStats>) => void;
  upsertGallery: (item: GalleryItem) => void;
  deleteGallery: (id: string) => void;
  upsertNews: (item: NewsItem) => void;
  deleteNews: (id: string) => void;
  upsertChampion: (item: Champion) => void;
  deleteChampion: (id: string) => void;
  upsertSponsor: (item: Sponsor) => void;
  deleteSponsor: (id: string) => void;
  upsertReferee: (item: Referee) => void;
  deleteReferee: (id: string) => void;
  /** Site access: open, launch countdown or maintenance. Shared with every visitor through the league data. */
  setGate: (patch: Partial<GateSettings>) => void;
  /** Removes every match and player (keeps teams, gallery, news and club info) to start a real season. */
  startBlankSeason: () => void;
  resetToSeed: () => void;
  importData: (raw: unknown) => boolean;
  exportData: () => string;
}

export type LeagueStore = LeagueData & LeagueActions;

export const pickData = (s: LeagueData): LeagueData => ({
  teams: s.teams,
  players: s.players,
  matches: s.matches,
  gallery: s.gallery,
  news: s.news,
  champions: s.champions,
  sponsors: s.sponsors,
  referees: s.referees,
  settings: s.settings,
});

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = [...list];
  next[i] = item;
  return next;
}

/** Keeps matches internally consistent (scores/events only make sense once a match has started). */
function normalizeMatch(m: Match): Match {
  if (m.status === 'scheduled') return { ...m, homeScore: null, awayScore: null, events: [], mvpPlayerId: undefined, liveMinute: undefined };
  return {
    ...m,
    homeScore: Math.max(0, Math.round(m.homeScore ?? 0)),
    awayScore: Math.max(0, Math.round(m.awayScore ?? 0)),
    liveMinute: m.status === 'live' ? m.liveMinute : undefined,
    mvpPlayerId: m.status === 'finished' ? m.mvpPlayerId : undefined,
  };
}

const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

export const useLeagueStore = create<LeagueStore>()(
  persist(
    (set, get) => ({
      ...createInitialLeagueData(),

      upsertMatch: (match) => {
        const prev = get().matches.find((m) => m.id === match.id);
        const next = normalizeMatch(match);
        const matches = upsert(get().matches, next);
        set({ matches, players: recomputePlayerStats(get().players, matches) });
        return next.status === 'finished' && prev?.status !== 'finished';
      },

      deleteMatch: (id) => {
        const matches = get().matches.filter((m) => m.id !== id);
        set({ matches, players: recomputePlayerStats(get().players, matches) });
      },

      upsertTeam: (team) => set({ teams: upsert(get().teams, team) }),

      deleteTeam: (id) => {
        const matches = get().matches.filter((m) => m.homeTeamId !== id && m.awayTeamId !== id);
        const players = get().players.filter((p) => p.teamId !== id);
        set({
          teams: get().teams.filter((t) => t.id !== id),
          matches,
          players: recomputePlayerStats(players, matches),
          gallery: get().gallery.map((g) => (g.teamId === id ? { ...g, teamId: undefined } : g)),
        });
      },

      upsertPlayer: (player) => {
        const players = upsert(get().players, { ...player, adjustments: player.adjustments ?? emptyStats() });
        set({ players: recomputePlayerStats(players, get().matches) });
      },

      deletePlayer: (id) => {
        const matches = get().matches.map((m) => (m.mvpPlayerId === id ? { ...m, mvpPlayerId: undefined } : m));
        set({ matches, players: recomputePlayerStats(get().players.filter((p) => p.id !== id), matches) });
      },

      setPlayerTotals: (id, totals) => {
        const { players, matches } = get();
        const player = players.find((p) => p.id === id);
        if (!player) return;
        const base = recomputePlayerStats([{ ...player, adjustments: emptyStats() }], matches)[0].stats;
        const adjustments = { ...player.adjustments };
        (Object.keys(totals) as (keyof PlayerStats)[]).forEach((k) => {
          const wanted = totals[k];
          if (typeof wanted === 'number') adjustments[k] = Math.max(0, Math.round(wanted)) - base[k];
        });
        set({ players: recomputePlayerStats(players.map((p) => (p.id === id ? { ...p, adjustments } : p)), matches) });
      },

      upsertGallery: (item) => set({ gallery: upsert(get().gallery, item) }),
      deleteGallery: (id) => set({ gallery: get().gallery.filter((g) => g.id !== id) }),
      upsertNews: (item) => set({ news: upsert(get().news, item) }),
      deleteNews: (id) => set({ news: get().news.filter((n) => n.id !== id) }),
      upsertChampion: (item) => set({ champions: upsert(get().champions, item) }),
      deleteChampion: (id) => set({ champions: get().champions.filter((c) => c.id !== id) }),
      upsertSponsor: (item) => set({ sponsors: upsert(get().sponsors, item) }),
      deleteSponsor: (id) => set({ sponsors: get().sponsors.filter((s) => s.id !== id) }),
      upsertReferee: (item) => set({ referees: upsert(get().referees, item) }),
      deleteReferee: (id) => set({ referees: get().referees.filter((r) => r.id !== id) }),

      setGate: (patch) => set({ settings: { ...get().settings, gate: { ...get().settings.gate, ...patch } } }),

      startBlankSeason: () => set({ matches: [], players: [] }),

      // The access gate is site configuration, not league data: it survives a reset.
      resetToSeed: () => set({ ...createInitialLeagueData(), settings: get().settings }),

      importData: (raw) => {
        if (!raw || typeof raw !== 'object') return false;
        const d = raw as Partial<Record<keyof LeagueData, unknown>>;
        if (!isArray(d.teams) || !isArray(d.players) || !isArray(d.matches) || !isArray(d.gallery) || !isArray(d.news)) return false;
        const matches = d.matches as Match[];
        const players = (d.players as Player[]).map((p) => ({ ...p, adjustments: p.adjustments ?? emptyStats(), stats: p.stats ?? emptyStats() }));
        set({
          teams: d.teams as Team[],
          matches,
          gallery: d.gallery as GalleryItem[],
          news: d.news as NewsItem[],
          champions: isArray(d.champions) ? (d.champions as Champion[]) : get().champions,
          sponsors: isArray(d.sponsors) ? (d.sponsors as Sponsor[]) : get().sponsors,
          referees: isArray(d.referees) ? (d.referees as Referee[]) : get().referees,
          settings: d.settings && typeof d.settings === 'object' ? { ...DEFAULT_SETTINGS, ...(d.settings as object), gate: { ...DEFAULT_SETTINGS.gate, ...((d.settings as { gate?: object }).gate ?? {}) } } : get().settings,
          players: recomputePlayerStats(players, matches),
        });
        return true;
      },

      exportData: () => JSON.stringify({ app: 'lleida-league', version: 2, exportedAt: new Date().toISOString(), ...pickData(get()) }, null, 2),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => pickData(s),
      // v1 stored the old demo league; v2 ships the real Senior teams, so start from the new seed.
      migrate: () => ({}) as LeagueData,
    },
  ),
);
