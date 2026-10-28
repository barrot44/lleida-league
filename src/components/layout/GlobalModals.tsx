import { Suspense, lazy, useEffect, useState } from 'react';
import { useUiStore, type ModalState } from '@/store/useUiStore';

// Loaded the first time one is opened (they bring the cards, stats and social-image code with them).
const TeamModal = lazy(() => import('@/components/standings/TeamModal').then((m) => ({ default: m.TeamModal })));
const PlayerModal = lazy(() => import('@/components/stats/PlayerModal').then((m) => ({ default: m.PlayerModal })));
const MatchSheetModal = lazy(() => import('@/components/calendar/MatchSheetModal').then((m) => ({ default: m.MatchSheetModal })));

/** Renders the top of the modal stack (team → player → match sheets can chain and go back). */
export function GlobalModals() {
  const top = useUiStore((s) => s.modalStack[s.modalStack.length - 1]);
  const closeModal = useUiStore((s) => s.closeModal);
  // Keep the last modal mounted while it plays its exit animation.
  const [shown, setShown] = useState<ModalState | undefined>(top);

  useEffect(() => {
    if (top) setShown(top);
  }, [top]);

  if (!shown) return null;
  return (
    <Suspense fallback={null}>
      {shown.kind === 'team' && <TeamModal id={shown.id} open={top?.kind === 'team'} onClose={closeModal} />}
      {shown.kind === 'player' && <PlayerModal id={shown.id} open={top?.kind === 'player'} onClose={closeModal} />}
      {shown.kind === 'match' && <MatchSheetModal id={shown.id} open={top?.kind === 'match'} onClose={closeModal} />}
    </Suspense>
  );
}
