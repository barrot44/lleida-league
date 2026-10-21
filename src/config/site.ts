import type { CategoryId, CategoryMeta, NewsBadge, Position } from '@/types';

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
  { id: 'junior', label: 'Junior League', short: 'Junior', playoffSpots: 2, relegationSpots: 1, accent: '#10B981' },
  { id: 'femenina', label: 'Femenina League', short: 'Femenina', playoffSpots: 2, relegationSpots: 1, accent: '#EC4899' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryMeta>;

/** Els valors de dades es mantenen (Portero/Cierre/Ala/Pívot); aquí hi ha el text en català. */
export const POSITIONS: Position[] = ['Portero', 'Cierre', 'Ala', 'Pívot'];

export const POSITION_LABEL: Record<Position, string> = {
  Portero: 'Porter',
  Cierre: 'Tancament',
  Ala: 'Ala',
  Pívot: 'Pivot',
};

export const POSITION_SHORT: Record<Position, string> = { Portero: 'POR', Cierre: 'TAN', Ala: 'ALA', Pívot: 'PIV' };

export const NEWS_BADGES: NewsBadge[] = ['Oficial', 'Mercat', 'Sanció'];

export const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
