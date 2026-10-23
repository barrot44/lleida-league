import type { Player, Team } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { POSITION_SHORT } from '@/config/site';
import { squadOrder } from '@/obs/state';

interface Option {
  label: string;
  hint?: string;
  onPick: () => void;
}

interface Props {
  open: boolean;
  title: string;
  team?: Team;
  players: Player[];
  onPick: (p: Player) => void;
  onClose: () => void;
  /** Extra buttons on top (e.g. "unknown scorer", "own goal"). */
  extra?: Option[];
}

/** Big touch-friendly grid to choose a player in one tap (works well from a phone during the match). */
export function PlayerPicker({ open, title, team, players, onPick, onClose, extra = [] }: Props) {
  const list = [...players].sort(squadOrder);
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={title} size="lg">
      <div className="space-y-4 p-5">
        {extra.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {extra.map((o) => (
              <button
                key={o.label}
                className="btn-ghost"
                onClick={() => {
                  o.onPick();
                  onClose();
                }}
              >
                {o.label}
                {o.hint && <span className="text-[10px] font-normal normal-case tracking-normal text-slate-400">{o.hint}</span>}
              </button>
            ))}
          </div>
        )}
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-sm text-slate-500">Aquest equip no té jugadors donats d’alta.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onPick(p);
                  onClose();
                }}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition hover:border-amber-400/60 hover:bg-amber-400/10 active:scale-[0.98]"
              >
                <PlayerAvatar player={p} team={team} size={44} />
                <span className="min-w-0">
                  <span className="block truncate font-display text-base font-black uppercase leading-tight text-white">
                    <span className="text-amber-300">{p.dorsal}</span> {p.name}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{POSITION_SHORT[p.position]}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
