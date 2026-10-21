import { Modal } from '@/components/ui/Modal';
import { SocialCard } from '@/components/social/SocialCard';
import { matchCaption } from '@/components/social/captions';
import { FORMATS, MatchResultTemplate } from '@/components/social/templates';
import { CATEGORY_BY_ID } from '@/config/site';
import type { Match, Player, Team } from '@/types';

/** Public "share this match" dialog: Instagram-ready artwork for one match. */
export function ShareMatchModal({ match, home, away, mvp, open, onClose }: { match: Match; home: Team; away: Team; mvp?: Player; open: boolean; onClose: () => void }) {
  const cat = CATEGORY_BY_ID[match.category];
  const { width, height } = FORMATS.post;
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Comparteix el partit" size="md">
      <div className="p-5 sm:p-6">
        <SocialCard width={width} height={height} filename={`lleida-league-${match.id}`} caption={matchCaption(match, home, away, cat, mvp)}>
          <MatchResultTemplate format="post" category={cat} match={match} home={home} away={away} mvp={mvp} />
        </SocialCard>
      </div>
    </Modal>
  );
}
