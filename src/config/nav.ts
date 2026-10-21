import { CalendarDays, House, ImageIcon, Lock, Medal, Sparkles, Trophy, type LucideIcon } from 'lucide-react';

export type RouteId = 'home' | 'standings' | 'calendar' | 'stats' | 'gallery' | 'club' | 'admin';

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

export const ALL_ROUTES: NavItem[] = [...NAV, ADMIN_NAV];
