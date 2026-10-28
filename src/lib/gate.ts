import type { GateMode, GateSettings, SiteSettings } from '@/types';

export const DEFAULT_SETTINGS: SiteSettings = {
  gate: { mode: 'off', launchAt: '', title: '', message: '', autoOpen: true },
};

/** Seconds the "we're live!" celebration stays on screen before the site opens by itself. */
export const OPEN_GRACE_MS = 4_000;

export const GATE_DEFAULTS: Record<Exclude<GateMode, 'off'>, { badge: string; title: string; message: string }> = {
  countdown: {
    badge: 'Properament',
    title: 'Ens veiem aviat',
    message: 'Estem preparant la nova Lleida League. Torna quan el comptador arribi a zero.',
  },
  maintenance: {
    badge: 'En manteniment',
    title: 'Estem de manteniment',
    message: 'Estem millorant la web i tornem de seguida. Gràcies per la paciència!',
  },
};

export const GATE_LABEL: Record<GateMode, string> = {
  off: 'Web oberta',
  countdown: 'Comptador de llançament',
  maintenance: 'Manteniment',
};

export function gateCopy(gate: GateSettings) {
  const base = GATE_DEFAULTS[gate.mode === 'maintenance' ? 'maintenance' : 'countdown'];
  return { badge: base.badge, title: gate.title.trim() || base.title, message: gate.message.trim() || base.message };
}

/** Target instant in ms, or `null` when there is none (or it is not a valid date). */
export function gateTarget(gate: GateSettings): number | null {
  if (!gate.launchAt) return null;
  const t = Date.parse(gate.launchAt);
  return Number.isFinite(t) ? t : null;
}

/** Phone notification sent once when the launch countdown reaches zero (by /api/launch). */
export const LAUNCH_PUSH = {
  title: '🚀 La Lleida League ja és oberta!',
  body: 'Entra ara: equips, calendari, classificació i els directes.',
};

/** For 3 days after the launch moment, each browser asks the server (once) to send the launch notification. */
const LAUNCH_WINDOW_MS = 3 * 24 * 3600 * 1000;

export function launchJustHappened(gate: GateSettings, now: number): number | null {
  const target = gateTarget(gate);
  if (target === null || gate.mode === 'maintenance' || now < target || now - target > LAUNCH_WINDOW_MS) return null;
  return target;
}

/** The server sends it only the first time for that launch date, however many browsers call. */
export function pingLaunch(target: number) {
  if (!import.meta.env.PROD) return;
  const key = `lleida-league:launch-ping:${target}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch {
    /* storage unavailable: still ping */
  }
  void fetch('/api/launch', { method: 'POST', keepalive: true }).catch(() => {});
}

/** Is the gate hiding the site from visitors at instant `now`? */
export function isGateActive(gate: GateSettings, now: number): boolean {
  if (gate.mode === 'off') return false;
  const target = gateTarget(gate);
  if (gate.mode === 'countdown' && gate.autoOpen && target !== null && now >= target + OPEN_GRACE_MS) return false;
  return true;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO instant → value for `<input type="datetime-local">` in the viewer's time zone. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `datetime-local` value (local time) → absolute ISO instant, so every visitor sees the same moment. */
export function fromLocalInput(value: string): string {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime()) ? d.toISOString() : '';
}
