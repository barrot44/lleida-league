import { useCallback, useEffect, useState } from 'react';
import { Check, EyeOff, MessageCircle, MonitorUp, RefreshCw, Trash2, X } from 'lucide-react';
import { clearHandled, listFanMessages, setFanStatus, type FanMessage } from '@/lib/fanMessages';
import { useObsStore } from '@/obs/useObsStore';
import { FAN_MSG_MS } from '@/obs/overlay/Stage';
import { useUiStore } from '@/store/useUiStore';
import { useNow } from '@/hooks/useNow';
import { SectionCard } from '@/components/admin/fields';
import type { useObsActions } from '@/components/admin/obs/useObsActions';
import { cn, uid } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return s < 60 ? `fa ${s} s` : s < 3600 ? `fa ${Math.floor(s / 60)} min` : `fa ${Math.floor(s / 3600)} h`;
};

/** Moderation of the messages sent from /directe: approve one and it pops up on screen for a few seconds. */
export function FanMessagesControls({ actions }: { actions: Actions }) {
  const fanMsg = useObsStore((s) => s.state.fanMsg);
  const toast = useUiStore((s) => s.toast);
  const now = useNow(1000);
  const [list, setList] = useState<FanMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await listFanMessages());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No s’han pogut carregar.');
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 6000);
    const onStorage = (e: StorageEvent) => e.key === 'lleida-league:fan-messages' && void load();
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, [load]);

  const mark = async (m: FanMessage, status: FanMessage['status']) => {
    setList((l) => l.map((x) => (x.id === m.id ? { ...x, status } : x)));
    try {
      await setFanStatus(m.id, status);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut desar.', 'error');
      void load();
    }
  };

  const onAir = (m: FanMessage) => {
    actions.update((s) => ({ ...s, fanMsg: { id: uid('fm'), at: Date.now(), name: m.name, text: m.text } }));
    if (m.status !== 'approved') void mark(m, 'approved');
  };

  const removeHandled = async () => {
    try {
      await clearHandled();
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut esborrar.', 'error');
    }
  };

  const pending = list.filter((m) => m.status === 'pending');
  const done = list.filter((m) => m.status !== 'pending');
  const live = fanMsg && now - fanMsg.at < FAN_MSG_MS ? fanMsg : null;

  return (
    <SectionCard
      title="Missatges de l’afició"
      actions={
        <span className="flex items-center gap-2">
          {pending.length > 0 && <span className="rounded-full bg-cyan-400 px-2.5 py-1 text-[11px] font-black text-slate-950">{pending.length} nous</span>}
          <button className="btn-ghost !p-2" aria-label="Actualitza" onClick={() => void load()}>
            <RefreshCw size={14} />
          </button>
        </span>
      }
    >
      {live && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-cyan-300/50 bg-cyan-400/10 px-3 py-2 text-sm">
          <MessageCircle size={16} className="shrink-0 text-cyan-300" />
          <span className="min-w-0 flex-1 truncate text-cyan-50">
            En pantalla: «{live.text}» — <strong>{live.name}</strong>
          </span>
          <span className="digital text-cyan-200">{Math.ceil((FAN_MSG_MS - (now - live.at)) / 1000)}s</span>
          <button className="btn-ghost !p-1.5" aria-label="Treu-lo de la pantalla" onClick={() => actions.update((s) => ({ ...s, fanMsg: null }))}>
            <EyeOff size={13} />
          </button>
        </div>
      )}
      {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}

      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-slate-500">
          Encara no hi ha missatges nous. La gent els envia des de la pàgina <strong className="text-slate-300">/directe</strong>.
        </p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {pending.map((m) => (
            <li key={m.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-sm text-white">«{m.text}»</p>
              <p className="mt-1 flex items-center justify-between gap-2 text-xs">
                <strong className="text-amber-300">{m.name}</strong>
                <span className="text-slate-500">{ago(m.createdAt, now)}</span>
              </p>
              <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-1.5">
                <button className="btn-gold !py-1.5 text-xs" onClick={() => onAir(m)}>
                  <MonitorUp size={13} /> En pantalla
                </button>
                <button className="btn-ghost !px-2.5 !py-1.5 text-xs" title="Aprova sense mostrar-lo" aria-label="Aprova sense mostrar-lo" onClick={() => void mark(m, 'approved')}>
                  <Check size={13} />
                </button>
                <button className="btn-ghost !px-2.5 !py-1.5 text-xs hover:!text-red-300" title="Descarta" aria-label="Descarta" onClick={() => void mark(m, 'rejected')}>
                  <X size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <button className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white" onClick={() => setShowDone((v) => !v)}>
              {showDone ? '▾' : '▸'} Ja revisats ({done.length})
            </button>
            <button className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-white" onClick={() => void removeHandled()}>
              <Trash2 size={11} className="mr-1 inline" /> Esborra’ls
            </button>
          </div>
          {showDone && (
            <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {done.map((m) => (
                <li key={m.id} className={cn('flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs', m.status === 'approved' ? 'border-emerald-500/30' : 'border-white/[0.06] opacity-50')}>
                  <span className="min-w-0 flex-1 truncate text-slate-200">
                    <strong className="text-amber-300">{m.name}:</strong> {m.text}
                  </span>
                  {m.status === 'approved' && (
                    <button className="btn-ghost !p-1.5" aria-label="Torna’l a posar en pantalla" onClick={() => onAir(m)}>
                      <MonitorUp size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SectionCard>
  );
}
