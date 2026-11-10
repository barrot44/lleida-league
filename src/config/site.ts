import type { CategoryGroupId, CategoryId, CategoryMeta, ChampionCategory, NewsBadge, Position } from '@/types';

export const SITE = {
  name: 'LLEIDA LEAGUE',
  tagline: 'Més que un joc, una batalla presidencial',
  email: 'lleidaleague@gmail.com',
  handle: '@lleidaleague',
  hashtags: ['#LleidaLeague', '#Futsal', '#Lleida'],
  since: 2023,
  socials: [
    { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/lleidaleague/' },
    { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@lleidaleague' },
    { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@LleidaLeague' },
  ],
} as const;

export const CATEGORIES: CategoryMeta[] = [
  { id: 'senior', label: 'Senior League', short: 'Senior', playoffSpots: 1, relegationSpots: 0, accent: '#F59E0B' },
  { id: 'juvenil', label: 'Juvenil League', short: 'Juvenil', playoffSpots: 2, relegationSpots: 1, accent: '#06B6D4' },
  { id: 'infantil', label: 'Junior League · Infantil', short: 'Infantil', playoffSpots: 2, relegationSpots: 1, accent: '#10B981', group: 'junior' },
  { id: 'cadet', label: 'Junior League · Cadet', short: 'Cadet', playoffSpots: 2, relegationSpots: 1, accent: '#84CC16', group: 'junior' },
  { id: 'femenina', label: 'Femenina League', short: 'Femenina', playoffSpots: 2, relegationSpots: 1, accent: '#EC4899' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryMeta>;

/** Groups of competitions shown under one name in the public category switcher. */
export const CATEGORY_GROUPS: Record<CategoryGroupId, { label: string; short: string; accent: string; hint: string }> = {
  junior: { label: 'Junior League', short: 'Junior', accent: '#10B981', hint: 'Infantil (1r i 2n d’ESO) i Cadet (3r i 4t d’ESO)' },
};

/** The public switcher: single competitions and groups (a group opens its own sub-switcher). */
export type SwitcherItem = { kind: 'category'; meta: CategoryMeta } | { kind: 'group'; id: CategoryGroupId; label: string; short: string; accent: string; members: CategoryMeta[] };
export const SWITCHER_ITEMS: SwitcherItem[] = CATEGORIES.reduce<SwitcherItem[]>((acc, c) => {
  if (!c.group) return [...acc, { kind: 'category', meta: c }];
  const g = acc.find((x) => x.kind === 'group' && x.id === c.group);
  if (g && g.kind === 'group') g.members.push(c);
  else acc.push({ kind: 'group', id: c.group, ...CATEGORY_GROUPS[c.group], members: [c] });
  return acc;
}, []);

/**
 * Data saved before the Junior League was split keeps `'junior'`: it goes to Infantil (the admin can move a team to
 * Cadet). Anything unknown falls back to the Senior League.
 */
export function normalizeCategory(raw: unknown): CategoryId {
  if (raw === 'junior') return 'infantil';
  return typeof raw === 'string' && raw in CATEGORY_BY_ID ? (raw as CategoryId) : 'senior';
}

/** Name and colour of a palmarès entry (including the old single Junior League). */
export const championCategoryMeta = (c: ChampionCategory) =>
  c === 'junior' ? { id: c, label: 'Junior League', short: 'Junior', accent: CATEGORY_GROUPS.junior.accent } : (CATEGORY_BY_ID[c] ?? { id: c, label: c, short: c, accent: '#F59E0B' });

/** Options of the palmarès form: every competition, plus the old Junior League for the editions before the split. */
export const CHAMPION_CATEGORIES: { id: ChampionCategory; label: string }[] = [
  ...CATEGORIES.map((c) => ({ id: c.id as ChampionCategory, label: c.label })),
  { id: 'junior', label: 'Junior League (abans de dividir-la)' },
];

/**
 * Només es distingeix porter o jugador. Les dades antigues poden portar Cierre/Ala/Pívot: totes es mostren com a «Jugador».
 * Els jugadors nous es desen com a 'Ala'.
 */
export const POSITIONS: Position[] = ['Portero', 'Cierre', 'Ala', 'Pívot'];

export const isKeeper = (p: Position) => p === 'Portero';

/** Opcions del formulari: porter o jugador. */
export const ROLE_OPTIONS: { value: Position; label: string }[] = [
  { value: 'Portero', label: 'Porter' },
  { value: 'Ala', label: 'Jugador' },
];

export const POSITION_LABEL: Record<Position, string> = {
  Portero: 'Porter',
  Cierre: 'Jugador',
  Ala: 'Jugador',
  Pívot: 'Jugador',
};

export const POSITION_SHORT: Record<Position, string> = { Portero: 'POR', Cierre: 'JUG', Ala: 'JUG', Pívot: 'JUG' };

export const NEWS_BADGES: NewsBadge[] = ['Oficial', 'Mercat', 'Sanció'];

export const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
