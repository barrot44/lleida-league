import { Ban, Crosshair, Crown, Rocket, Target, UserX, Zap, type LucideIcon } from 'lucide-react';
import type { ObsActiveCard, ObsCardDef, ObsClock } from '@/obs/types';
import { clockElapsed } from '@/obs/state';

/**
 * Power cards (as in the Kings League): a team asks for a card, one is drawn at random and its power applies.
 * Names and texts can be edited from the panel; these are the defaults.
 */
export const DEFAULT_DECK: ObsCardDef[] = [
  {
    id: 'no-hands',
    name: 'Porter rival sense mans',
    desc: 'Durant 2 minuts, el porter rival no pot tocar la pilota amb les mans. Si ho fa, penal a favor.',
    minutes: 2,
    color: '#06B6D4',
    enabled: true,
  },
  {
    id: 'one-v-keeper',
    name: '1 contra el porter',
    desc: 'Un jugador surt amb la pilota des del centre de la pista, sol davant del porter rival, i té un temps limitat per marcar. El porter pot sortir a aturar-lo.',
    minutes: 0,
    color: '#8B5CF6',
    enabled: true,
  },
  {
    id: 'double-penalty',
    name: 'Doble penal',
    desc: 'Llançament directe des del punt de 10 metres, sense barrera, contra el porter rival.',
    minutes: 0,
    color: '#EF4444',
    enabled: true,
  },
  {
    id: 'double-goal',
    name: 'Gol doble',
    desc: 'Durant 2 minuts, cada gol de l’equip que ha tret la carta val per dos.',
    minutes: 2,
    color: '#F59E0B',
    enabled: true,
  },
  {
    id: 'presidential-penalty',
    name: 'Penal presidencial',
    desc: 'El president de l’equip baixa a la pista i llança un penal contra el porter rival.',
    minutes: 0,
    color: '#EAB308',
    enabled: true,
  },
  {
    id: 'rival-expulsion',
    name: 'Expulsió rival',
    desc: 'Un jugador de l’equip rival surt de la pista durant 2 minuts. Si l’equip que ha tret la carta marca, el rival recupera el jugador i la carta s’acaba.',
    minutes: 2,
    color: '#F97316',
    enabled: true,
  },
  {
    id: 'own-area-shot',
    name: 'Tir des de la pròpia àrea',
    desc: 'Tots els jugadors surten de la pista. Un jugador es queda dins la seva àrea i, d’un sol tir i sense que la pilota toqui a terra, ha de marcar a la porteria contrària.',
    minutes: 0,
    color: '#10B981',
    enabled: true,
  },
];

export const CARD_ICONS: Record<string, LucideIcon> = {
  'no-hands': Ban,
  'one-v-keeper': Crosshair,
  'double-penalty': Target,
  'double-goal': Zap,
  'presidential-penalty': Crown,
  'rival-expulsion': UserX,
  'own-area-shot': Rocket,
};

export const cardIcon = (id: string): LucideIcon => CARD_ICONS[id] ?? Zap;

/** Keeps edited texts but adds any default card that is missing (and drops unknown ones). */
export function mergeDeck(deck: ObsCardDef[] | undefined): ObsCardDef[] {
  const saved = new Map((deck ?? []).map((c) => [c.id, c]));
  return DEFAULT_DECK.map((d) => ({ ...d, ...saved.get(d.id) }));
}

/** Milliseconds left on a timed card (match clock when it was in use, wall clock otherwise). */
export function cardRemaining(active: ObsActiveCard, clock: ObsClock, now = Date.now()) {
  const used = active.mode === 'clock' ? clockElapsed(clock, now) - active.startElapsed : now - active.startAt;
  return Math.max(0, active.durationMs - Math.max(0, used));
}

export const cardIsLive = (active: ObsActiveCard | null, clock: ObsClock, now = Date.now()): active is ObsActiveCard =>
  !!active && cardRemaining(active, clock, now) > 0;

export const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
