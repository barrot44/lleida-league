import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const pad = (n: number) => String(n).padStart(2, '0');

/** Local `YYYY-MM-DD` (avoids the UTC shift of `toISOString`). */
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const toTimeString = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const matchDateTime = (m: { date: string; time: string }) => new Date(`${m.date}T${m.time || '00:00'}:00`);

export const matchTimestamp = (m: { date: string; time: string }) => matchDateTime(m).getTime();

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const dayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

const parseDay = (date: string) => new Date(`${date}T12:00:00`);

export const formatDay = (date: string) => dayFmt.format(parseDay(date)).replace('.', '');
export const formatDateLong = (date: string) => longFmt.format(parseDay(date));
export const formatDateShort = (date: string) => shortFmt.format(parseDay(date)).replace(/\./g, '');

export function relativeDay(date: string, now = new Date()): string {
  const target = parseDay(date);
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const diff = Math.round((target.getTime() - base.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  return formatDay(date);
}

export function downloadTextFile(filename: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Readable text color (black/white) for an arbitrary hex background. */
export function readableOn(hex: string): '#05070c' | '#ffffff' {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#05070c' : '#ffffff';
}
