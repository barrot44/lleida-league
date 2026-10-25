import type { Player } from '@/types';
import { playerRating } from '@/lib/standings';
import { clamp } from '@/lib/utils';

/** Deterministic randomness per player: the same player always gets the same unique artwork. */
export function seedOf(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Edition = 'bronze' | 'plata' | 'or' | 'llegenda' | 'pitxitxi' | 'mvp';

export const EDITION_LABEL: Record<Edition, string> = {
  bronze: 'Bronze',
  plata: 'Plata',
  or: 'Or',
  llegenda: 'Llegenda',
  pitxitxi: 'Pitxitxi',
  mvp: 'MVP',
};

/** Frame material, rating ink and glow of each edition. */
export const EDITION_STYLE: Record<Edition, { frame: string; ink: string; glow: string; accent: string; foil: boolean }> = {
  bronze: { frame: 'linear-gradient(145deg,#f6d1a8 0%,#c07a3d 30%,#7a4a24 62%,#e9bd8f 100%)', ink: 'linear-gradient(160deg,#fde2c3,#c07a3d)', glow: 'rgba(192,122,61,.55)', accent: '#e9bd8f', foil: false },
  plata: { frame: 'linear-gradient(145deg,#ffffff 0%,#cbd5e1 28%,#64748b 60%,#e2e8f0 100%)', ink: 'linear-gradient(160deg,#ffffff,#94a3b8)', glow: 'rgba(203,213,225,.5)', accent: '#e2e8f0', foil: false },
  or: { frame: 'linear-gradient(145deg,#fff3c4 0%,#fbbf24 30%,#b45309 62%,#fde68a 100%)', ink: 'linear-gradient(160deg,#fef3c7,#f59e0b)', glow: 'rgba(251,191,36,.6)', accent: '#fde68a', foil: true },
  llegenda: { frame: 'linear-gradient(120deg,#0b0b0b 0%,#fbbf24 18%,#1c1917 34%,#fde68a 50%,#0b0b0b 66%,#f59e0b 82%,#0b0b0b 100%)', ink: 'linear-gradient(160deg,#fffbeb,#fbbf24 55%,#b45309)', glow: 'rgba(251,191,36,.8)', accent: '#fbbf24', foil: true },
  pitxitxi: { frame: 'linear-gradient(130deg,#fff7ed 0%,#fb923c 22%,#dc2626 48%,#7f1d1d 66%,#fde68a 100%)', ink: 'linear-gradient(160deg,#ffedd5,#f97316)', glow: 'rgba(249,115,22,.75)', accent: '#fb923c', foil: true },
  mvp: { frame: 'linear-gradient(130deg,#ffe4e6 0%,#e11d48 26%,#4c0519 55%,#fbbf24 80%,#fff1f2 100%)', ink: 'linear-gradient(160deg,#fff1f2,#fb7185 55%,#fbbf24)', glow: 'rgba(225,29,72,.7)', accent: '#fda4af', foil: true },
};

/** Special editions beat the rating tiers: best scorer and most MVPs of the category. */
export function editionOf(player: Player, categoryPlayers: Player[]): Edition {
  const topScorer = [...categoryPlayers].sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists)[0];
  const topMvp = [...categoryPlayers].sort((a, b) => b.stats.mvpAwards - a.stats.mvpAwards || b.stats.goals - a.stats.goals)[0];
  if (topScorer?.id === player.id && player.stats.goals > 0) return 'pitxitxi';
  if (topMvp?.id === player.id && player.stats.mvpAwards > 0) return 'mvp';
  const r = playerRating(player);
  return r >= 85 ? 'llegenda' : r >= 75 ? 'or' : r >= 65 ? 'plata' : 'bronze';
}

/** FIFA-like attributes (40–99) built only from real numbers of the league. */
export function attributesOf(p: Player) {
  const s = p.stats;
  const pj = Math.max(1, s.matchesPlayed);
  const att = (v: number) => Math.round(clamp(v, 40, 99));
  return [
    { key: 'GOL', label: 'Gol', value: att(44 + (s.goals / pj) * 30 + s.goals * 0.9) },
    { key: 'ASS', label: 'Assistència', value: att(44 + (s.assists / pj) * 36 + s.assists * 1.1) },
    { key: 'IMP', label: 'Impacte', value: att(48 + s.mvpAwards * 9 + s.goals * 0.4) },
    { key: 'REG', label: 'Regularitat', value: att(45 + s.matchesPlayed * 4.2) },
    { key: 'DIS', label: 'Disciplina', value: att(96 - s.yellowCards * 4 - s.redCards * 12) },
  ];
}

/** Collector number: unique-looking and stable for the player. */
export const serialOf = (id: string) => String((seedOf(id) % 997) + 1).padStart(3, '0');

/** Generative background: wavy contour rings + glass shards in the team colours. */
export function artOf(id: string) {
  const r = rng(seedOf(id));
  const cx = 40 + r() * 120;
  const cy = 50 + r() * 130;
  const rings = Array.from({ length: 9 }, (_, i) => {
    const base = 16 + i * 17;
    const amp = 3 + r() * 7;
    const freq = 3 + Math.floor(r() * 4);
    const phase = r() * Math.PI * 2;
    const pts = Array.from({ length: 49 }, (_, k) => {
      const a = (k / 48) * Math.PI * 2;
      const rr = base + Math.sin(a * freq + phase) * amp;
      return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
    });
    return `M${pts.join('L')}Z`;
  });
  const shards = Array.from({ length: 7 }, () => {
    const x = r() * 200;
    const y = r() * 300;
    const s = 30 + r() * 70;
    const a = r() * Math.PI;
    const p = (k: number) => `${(x + Math.cos(a + k * 2.1 + r() * 0.6) * s).toFixed(1)},${(y + Math.sin(a + k * 2.1 + r() * 0.6) * s).toFixed(1)}`;
    return { d: `M${p(0)}L${p(1)}L${p(2)}Z`, o: 0.05 + r() * 0.12 };
  });
  // Personal "signature": a small constellation.
  const stars = Array.from({ length: 7 }, () => ({ x: 10 + r() * 80, y: 10 + r() * 80 }));
  const bars = Array.from({ length: 26 }, () => 1 + Math.floor(r() * 3));
  return { rings, shards, stars, bars };
}
