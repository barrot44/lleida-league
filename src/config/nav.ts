import { CalendarDays, House, ImageIcon, Lock, Medal, Trophy, type LucideIcon } from 'lucide-react';

export type RouteId = 'home' | 'standings' | 'calendar' | 'stats' | 'gallery' | 'admin';

export interface NavItem {
  id: RouteId;
  path: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { id: 'home', path: '/', label: 'Inicio', short: 'Inicio', icon: House },
  { id: 'standings', path: '/clasificacion', label: 'Clasificación', short: 'Tabla', icon: Trophy },
  { id: 'calendar', path: '/calendario', label: 'Calendario', short: 'Partidos', icon: CalendarDays },
  { id: 'stats', path: '/estadisticas', label: 'Goleadores & MVPs', short: 'Stats', icon: Medal },
  { id: 'gallery', path: '/galeria', label: 'Galería', short: 'Galería', icon: ImageIcon },
];

export const ADMIN_NAV: NavItem = { id: 'admin', path: '/admin', label: 'Panel de Control / Admin', short: 'Admin', icon: Lock };

export const ALL_ROUTES: NavItem[] = [...NAV, ADMIN_NAV];
