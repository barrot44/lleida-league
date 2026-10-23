import { CalendarDays, House, ImageIcon, Lock, Medal, Sparkles, Trophy, Vote, type LucideIcon } from 'lucide-react';

export type RouteId = 'home' | 'standings' | 'calendar' | 'stats' | 'gallery' | 'club' | 'admin' | 'vote';

export interface NavItem {
  id: RouteId;
  path: string;
  label: string;
  short: string;
  /** Shorter label for medium desktops (lg), where the full label would not fit. */
  lgLabel?: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { id: 'home', path: '/', label: 'Inici', short: 'Inici', icon: House },
  { id: 'standings', path: '/classificacio', label: 'Classificació', short: 'Classif.', icon: Trophy },
  { id: 'calendar', path: '/calendari', label: 'Calendari', short: 'Partits', icon: CalendarDays },
  { id: 'stats', path: '/golejadors', label: 'Golejadors i MVPs', lgLabel: 'Golejadors', short: 'Gols', icon: Medal },
  { id: 'gallery', path: '/galeria', label: 'Galeria', short: 'Galeria', icon: ImageIcon },
  { id: 'club', path: '/descobreix-nos', label: 'Descobreix-nos', short: 'Club', icon: Sparkles },
];

export const ADMIN_NAV: NavItem = { id: 'admin', path: '/admin', label: 'Tauler de control / Admin', short: 'Admin', icon: Lock };

/** Public MVP vote of the live streams (reached from the QR, the home banner or the match sheet; not in the menu). */
export const VOTE_NAV: NavItem = { id: 'vote', path: '/vota', label: 'Vota l’MVP', short: 'Vota', icon: Vote };

export const ALL_ROUTES: NavItem[] = [...NAV, ADMIN_NAV, VOTE_NAV];
