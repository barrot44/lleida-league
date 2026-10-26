import type { ObsState } from '@/obs/types';
import { sendPush, type PushMessage } from '@/lib/push';
import { supabaseEnabled } from '@/lib/supabase';
import { useUiStore } from '@/store/useUiStore';

export type AutoKind = 'goal' | 'start' | 'final' | 'poll';

/** Builds the automatic phone notification for something that just happened in the control room. */
export function autoMessage(kind: AutoKind, s: ObsState, pollTitle?: string): PushMessage | null {
  const sb = s.scoreboard;
  if (!sb.home || !sb.away) return null;
  const score = `${sb.home.shortName} ${sb.homeScore}-${sb.awayScore} ${sb.away.shortName}`;
  switch (kind) {
    case 'goal': {
      const f = s.flash;
      if (!f || f.kind !== 'goal') return null;
      const who = f.player ? (f.ownGoal ? `Gol en pròpia de ${f.player.name}` : `Gol de ${f.player.name}`) : `Gol del ${f.team.shortName}`;
      return { title: `⚽ ${f.double ? 'GOL DOBLE! ' : 'GOL! '}${score}`, body: `${who}${f.minute ? ` (${f.minute}’)` : ''}. Segueix-ho en directe.`, url: '/directe', tag: 'score' };
    }
    case 'start':
      return { title: `🔴 En directe: ${sb.home.name} vs ${sb.away.name}`, body: 'Comença la retransmissió. Entra i no et perdis res!', url: '/directe', tag: 'live' };
    case 'final':
      return { title: `🏁 Final: ${score}`, body: 'Mira el resum i vota l’MVP del partit.', url: '/directe', tag: 'score' };
    case 'poll':
      return { title: `🗳️ ${pollTitle ?? 'Votació oberta'}`, body: 'Vota des del mòbil: els resultats surten en directe.', url: '/vota', tag: 'poll' };
  }
}

/** Sends it when the automatic notifications are on. Never blocks the control room. */
export function autoNotify(kind: AutoKind, s: ObsState, pollTitle?: string) {
  if (!s.notify.auto || !supabaseEnabled) return;
  const msg = autoMessage(kind, s, pollTitle);
  if (!msg) return;
  sendPush(msg).catch((e: unknown) => useUiStore.getState().toast(`Avís al mòbil no enviat: ${e instanceof Error ? e.message : 'error'}`, 'error'));
}
