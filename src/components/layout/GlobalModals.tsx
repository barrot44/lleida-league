import { useEffect, useState } from 'react';
import { useUiStore, type ModalState } from '@/store/useUiStore';
import { TeamModal } from '@/components/standings/TeamModal';
import { PlayerModal } from '@/components/stats/PlayerModal';
import { MatchSheetModal } from '@/components/calendar/MatchSheetModal';

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
    <>
      {shown.kind === 'team' && <TeamModal id={shown.id} open={top?.kind === 'team'} onClose={closeModal} />}
      {shown.kind === 'player' && <PlayerModal id={shown.id} open={top?.kind === 'player'} onClose={closeModal} />}
      {shown.kind === 'match' && <MatchSheetModal id={shown.id} open={top?.kind === 'match'} onClose={closeModal} />}
    </>
  );
}
