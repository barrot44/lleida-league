import { Modal } from '@/components/ui/Modal';
import { SocialCard } from '@/components/social/SocialCard';
import { quintetCaption } from '@/components/social/captions';
import { FORMATS, QuintetTemplate } from '@/components/social/templates';
import { CATEGORY_BY_ID } from '@/config/site';
import type { QuintetSlot } from '@/lib/quintet';
import type { CategoryId } from '@/types';

/** Public "share the ideal five" dialog. */
export function ShareQuintetModal({ category, slots, label, open, onClose }: { category: CategoryId; slots: QuintetSlot[]; label: string; open: boolean; onClose: () => void }) {
  const cat = CATEGORY_BY_ID[category];
  const { width, height } = FORMATS.post;
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Comparteix el quintet ideal" size="md">
      <div className="p-5 sm:p-6">
        <SocialCard width={width} height={height} filename={`quintet-${category}`} caption={quintetCaption(cat, slots, label)}>
          <QuintetTemplate format="post" category={cat} slots={slots} label={label} />
        </SocialCard>
      </div>
    </Modal>
  );
}
