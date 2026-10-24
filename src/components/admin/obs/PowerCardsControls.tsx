import { useState } from 'react';
import { ChevronDown, EyeOff, Hand, Layers, Send, Shuffle, Square, Trash2, X } from 'lucide-react';
import type { ObsCardDef, ObsTeam } from '@/obs/types';
import { cardIcon, cardIsLive, cardRemaining, mmss } from '@/obs/cards';
import { clockElapsed } from '@/obs/state';
import { useObsStore } from '@/obs/useObsStore';
import { useNow } from '@/hooks/useNow';
import { useUiStore } from '@/store/useUiStore';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { SectionCard } from '@/components/admin/fields';
import { Toggle } from '@/components/admin/obs/Toggle';
import { CARD_REVEAL_MS } from '@/obs/overlay/CardsLayer';
import type { useObsActions } from '@/components/admin/obs/useObsActions';
import { cn, uid } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

/** Kings League-style power cards: a team asks, a card is drawn at random, its power applies. */
export function PowerCardsControls({ actions }: { actions: Actions }) {
  const cards = useObsStore((s) => s.state.cards);
  const sb = useObsStore((s) => s.state.scoreboard);
  const toast = useUiStore((s) => s.toast);
  const now = useNow(500);
  const [noRepeat, setNoRepeat] = useState(true);
  const [manual, setManual] = useState('');
  const [editing, setEditing] = useState(false);

  const deck = cards.deck;
  const byId = (id: string) => deck.find((c) => c.id === id);
  const teams = [sb.home, sb.away].filter((t): t is ObsTeam => !!t);
  const requester = cards.request && (!cards.draw || cards.draw.at < cards.request.at) ? cards.request : null;
  const revealOn = !!cards.draw && now - cards.draw.at < CARD_REVEAL_MS;
  const live = cardIsLive(cards.active, sb.clock, now) ? cards.active : null;
  const liveDef = live ? byId(live.cardId) : undefined;

  const setCards = (fn: (c: typeof cards) => Partial<typeof cards>) => actions.update((s) => ({ ...s, cards: { ...s.cards, ...fn(s.cards) } }));

  const request = (team: ObsTeam) => setCards(() => ({ request: { id: uid('rq'), at: Date.now(), team } }));

  const draw = (card: ObsCardDef, team: ObsTeam) => {
    const t = Date.now();
    const clockInUse = sb.clock.running || sb.clock.baseMs > 0;
    setCards((c) => ({
      request: null,
      draw: { id: uid('dr'), at: t, team, cardId: card.id },
      history: [...c.history, { id: uid('h'), at: t, teamId: team.id, teamShort: team.shortName, cardId: card.id }].slice(-30),
      // Timed cards start once the reveal is over (or when the match clock runs again).
      active:
        card.minutes > 0
          ? { id: uid('ac'), cardId: card.id, team, mode: clockInUse ? 'clock' : 'real', startAt: t + 4500, startElapsed: clockElapsed(sb.clock), durationMs: card.minutes * 60_000 }
          : c.active,
    }));
  };

  const drawRandom = () => {
    const team = requester?.team;
    if (!team) return toast('Primer un equip ha de demanar la carta.', 'error');
    const enabled = deck.filter((c) => c.enabled);
    if (!enabled.length) return toast('No hi ha cap carta activada a la baralla.', 'error');
    const used = new Set(cards.history.filter((h) => h.teamId === team.id).map((h) => h.cardId));
    const pool = noRepeat ? enabled.filter((c) => !used.has(c.id)) : enabled;
    const from = pool.length ? pool : enabled;
    draw(from[Math.floor(Math.random() * from.length)], team);
  };

  const drawManual = () => {
    const card = byId(manual);
    const team = requester?.team ?? null;
    if (!card) return toast('Tria quina carta vols mostrar.', 'error');
    if (!team) return toast('Primer un equip ha de demanar la carta.', 'error');
    draw(card, team);
  };

  const patchDeck = (id: string, patch: Partial<ObsCardDef>) => setCards((c) => ({ deck: c.deck.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));

  return (
    <SectionCard
      title="Cartes de poder"
      actions={
        <button className="btn-danger !py-2" disabled={!revealOn} onClick={() => setCards(() => ({ draw: null }))}>
          <EyeOff size={15} /> Amaga la carta
        </button>
      }
    >
      {/* 1. Request */}
      <p className="label flex items-center gap-1.5">
        <Hand size={12} /> 1 · Quin equip demana carta?
      </p>
      {teams.length < 2 ? (
        <p className="text-xs text-slate-500">Tria els dos equips al marcador.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => request(t)}
              className={cn('flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 font-display text-sm font-black uppercase tracking-wide transition', requester?.team.id === t.id ? 'border-amber-400 bg-amber-400/15 text-amber-100 shadow-glow' : 'border-white/10 text-slate-200 hover:border-amber-400/50')}
            >
              <TeamCrest team={t} size={24} /> {t.shortName} demana carta
            </button>
          ))}
        </div>
      )}
      {requester && (
        <p className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100">
          🃏 A la pantalla: «{requester.team.name} ha demanat una carta»
          <button className="text-amber-300 hover:text-white" aria-label="Cancel·la la petició" onClick={() => setCards(() => ({ request: null }))}>
            <X size={14} />
          </button>
        </p>
      )}

      {/* 2. Draw */}
      <p className="label mt-5 flex items-center gap-1.5">
        <Shuffle size={12} /> 2 · Treu la carta
      </p>
      <button className="btn-gold w-full !py-3.5 text-base" disabled={!requester} onClick={drawRandom}>
        <Shuffle size={18} /> Treu una carta a l’atzar
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <Toggle small checked={noRepeat} onChange={setNoRepeat} label="Que un equip no repeteixi carta" />
        <div className="flex items-center gap-2">
          <select className="input !w-auto !py-1.5 text-xs" value={manual} onChange={(e) => setManual(e.target.value)} aria-label="Triar carta a mà">
            <option value="">Triar a mà…</option>
            {deck.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={!manual || !requester} onClick={drawManual}>
            <Send size={13} /> Mostra-la
          </button>
        </div>
      </div>

      {/* 3. Card in force */}
      {live && liveDef && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border px-3 py-2.5" style={{ borderColor: liveDef.color, background: `${liveDef.color}1a` }}>
          {(() => {
            const Icon = cardIcon(liveDef.id);
            return <Icon size={22} style={{ color: liveDef.color }} />;
          })()}
          <span className="min-w-0 flex-1 text-sm">
            <span className="block truncate font-display font-black uppercase text-white">{liveDef.name}</span>
            <span className="text-xs text-slate-400">
              {live.team.shortName} · {live.mode === 'clock' ? 'segons el rellotge del partit' : 'temps real'}
            </span>
          </span>
          <span className="digital text-2xl text-amber-300">{mmss(cardRemaining(live, sb.clock, now))}</span>
          <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => setCards(() => ({ active: null }))}>
            <Square size={12} /> Acaba-la
          </button>
        </div>
      )}

      {/* History */}
      {cards.history.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="label !mb-0">Cartes del partit</p>
            <button className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-white" onClick={() => setCards(() => ({ history: [], active: null, draw: null, request: null }))}>
              <Trash2 size={11} className="mr-1 inline" /> Reinicia
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cards.history.map((h) => {
              const d = byId(h.cardId);
              return (
                <span key={h.id} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300">
                  <strong className="text-white">{h.teamShort}</strong> · {d?.name ?? h.cardId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Deck editor */}
      <button className="mt-5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white" onClick={() => setEditing((v) => !v)}>
        <ChevronDown size={14} className={cn('transition', editing && 'rotate-180')} /> <Layers size={13} /> La baralla ({deck.filter((c) => c.enabled).length}/{deck.length} cartes)
      </button>
      {editing && (
        <ul className="mt-3 space-y-3">
          {deck.map((c) => {
            const Icon = cardIcon(c.id);
            return (
              <li key={c.id} className={cn('rounded-2xl border p-3 transition', c.enabled ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 opacity-50')}>
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: c.color }}>
                    <Icon size={17} color="#fff" />
                  </span>
                  <input className="input !py-1.5 font-display font-black uppercase" value={c.name} onChange={(e) => patchDeck(c.id, { name: e.target.value })} aria-label="Nom de la carta" />
                  <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400" title="Minuts que dura (0 = immediata)">
                    <input type="number" min={0} max={10} className="input !w-14 !px-2 !py-1.5 text-center" value={c.minutes} onChange={(e) => patchDeck(c.id, { minutes: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })} aria-label="Minuts" />
                    min
                  </label>
                  <Toggle small checked={c.enabled} onChange={(v) => patchDeck(c.id, { enabled: v })} label="Activa" />
                </div>
                <textarea className="input mt-2 min-h-[64px] resize-y !py-2 text-xs" value={c.desc} onChange={(e) => patchDeck(c.id, { desc: e.target.value })} aria-label="Explicació de la carta" />
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
