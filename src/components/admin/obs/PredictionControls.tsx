import { useState } from 'react';
import { EyeOff, Loader2, Lock, Maximize2, PanelTop, Plus, QrCode as QrIcon, Target, Trophy, X } from 'lucide-react';
import { isPrediction, openPoll, optionCandidate, ranked, setPollStatus, useOpenPoll, useOpenPollStore, useTally, voteUrl, type MvpCandidate, type MvpPoll } from '@/lib/mvp';
import type { ObsTeam } from '@/obs/types';
import { useObsStore } from '@/obs/useObsStore';
import { useUiStore } from '@/store/useUiStore';
import { SectionCard } from '@/components/admin/fields';
import type { useObsActions } from '@/components/admin/obs/useObsActions';
import { autoNotify } from '@/components/admin/obs/autoNotify';
import { cn } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

const COLORS = ['#F59E0B', '#22D3EE', '#A855F7', '#22C55E'];

interface Preset {
  id: string;
  title: string;
  build: (home: ObsTeam, away: ObsTeam) => MvpCandidate[];
}

const PRESETS: Preset[] = [
  { id: 'winner', title: 'Qui guanyarà el partit?', build: (h, a) => [optionCandidate('opt-home', h.name, h.primaryColor, h), optionCandidate('opt-draw', 'Empat', '#64748B'), optionCandidate('opt-away', a.name, a.primaryColor, a)] },
  { id: 'next-goal', title: 'Qui marcarà el proper gol?', build: (h, a) => [optionCandidate('opt-home', h.name, h.primaryColor, h), optionCandidate('opt-none', 'Ningú', '#64748B'), optionCandidate('opt-away', a.name, a.primaryColor, a)] },
  { id: 'goals', title: 'Quants gols més hi haurà?', build: () => ['0', '1-2', '3-4', '5 o més'].map((l, i) => optionCandidate(`opt-${i}`, l, COLORS[i])) },
  { id: 'dice', title: 'Quin número sortirà al dau?', build: () => ['1', '2', '3', '4'].map((l, i) => optionCandidate(`opt-${i}`, l, COLORS[i])) },
];

/** Live prediction ("porra") with a QR: the public answers from the phone and the bars move on air. */
export function PredictionControls({ actions }: { actions: Actions }) {
  const sb = useObsStore((s) => s.state.scoreboard);
  const main = useObsStore((s) => s.state.main);
  const strip = useObsStore((s) => s.state.strip);
  const qr = useObsStore((s) => s.state.qr);
  const toast = useUiStore((s) => s.toast);
  const anyOpen = useOpenPoll();
  const open = isPrediction(anyOpen) ? anyOpen : null;
  const [last, setLast] = useState<MvpPoll | null>(null);
  const poll = open ?? (last && isPrediction(last) ? last : null);
  const tally = useTally(poll?.id, 3000);
  const [custom, setCustom] = useState({ title: '', options: ['', ''] });
  const [busy, setBusy] = useState(false);
  const url = voteUrl();
  const { rows, total } = poll ? ranked(poll, tally) : { rows: [], total: 0 };
  const bigId = main.visible && main.graphic?.kind === 'poll' ? main.graphic.pollId : null;
  const stripId = strip.visible && strip.item?.kind === 'poll' ? strip.item.pollId : null;
  const under = (p: MvpPoll, closed: boolean, sec = 0) => actions.showStrip({ kind: 'poll', pollId: p.id, title: p.title, candidates: p.candidates, closed, voteUrl: url }, sec);
  const big = (p: MvpPoll, closed: boolean, sec = 0) => actions.showGraphic({ kind: 'poll', pollId: p.id, title: p.title, candidates: p.candidates, closed, voteUrl: url }, sec);
  const qrIsVote = qr.visible && qr.url === url;

  const start = async (title: string, candidates: MvpCandidate[]) => {
    if (candidates.length < 2) return toast('Calen com a mínim 2 respostes.', 'error');
    setBusy(true);
    try {
      if (anyOpen && !isPrediction(anyOpen)) toast('S’ha tancat la votació de l’MVP que estava oberta.', 'info');
      const p = await openPoll({ matchId: sb.matchId, title, candidates });
      setLast(p);
      under(p, false);
      toast('Porra oberta i en pantalla sota el marcador!');
      autoNotify('poll', useObsStore.getState().state, title);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut obrir.', 'error');
    } finally {
      setBusy(false);
      void useOpenPollStore.getState().refresh();
    }
  };

  const close = async () => {
    if (!poll) return;
    setBusy(true);
    try {
      await setPollStatus(poll.id, 'closed');
      const closed = { ...poll, status: 'closed' as const };
      setLast(closed);
      if (bigId === poll.id) big(closed, true, 15);
      else under(closed, true, 15);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut tancar.', 'error');
    } finally {
      setBusy(false);
      void useOpenPollStore.getState().refresh();
    }
  };

  const startCustom = () => {
    const opts = custom.options.map((o) => o.trim()).filter(Boolean);
    if (!custom.title.trim()) return toast('Escriu la pregunta.', 'error');
    void start(
      custom.title.trim(),
      opts.map((l, i) => optionCandidate(`opt-${i}`, l, COLORS[i % COLORS.length])),
    );
  };

  return (
    <SectionCard
      title="Porra en directe"
      actions={
        poll && (
          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider', poll.status === 'open' ? 'bg-red-500 text-white' : 'bg-white/10 text-slate-300')}>
            {poll.status === 'open' ? '● Oberta' : 'Tancada'} · {total} {total === 1 ? 'resposta' : 'respostes'}
          </span>
        )
      }
    >
      {!open && (
        <>
          <p className="label flex items-center gap-1.5">
            <Target size={12} /> Preguntes ràpides
          </p>
          {!sb.home || !sb.away ? (
            <p className="text-xs text-slate-500">Tria els dos equips al marcador.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {PRESETS.map((p) => (
                <button key={p.id} disabled={busy} onClick={() => void start(p.title, p.build(sb.home!, sb.away!))} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left text-sm font-bold text-white transition hover:border-amber-400/60 hover:bg-amber-400/10">
                  {p.title}
                </button>
              ))}
            </div>
          )}

          <p className="label mt-5">O la teva pregunta</p>
          <input className="input" value={custom.title} onChange={(e) => setCustom((c) => ({ ...c, title: e.target.value }))} placeholder="Ex.: Hi haurà penal aquesta part?" />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {custom.options.map((o, i) => (
              <div key={i} className="flex gap-1.5">
                <span className="mt-3 h-3 w-3 shrink-0 rounded-full" style={{ background: COLORS[i] }} />
                <input className="input !py-2" value={o} onChange={(e) => setCustom((c) => ({ ...c, options: c.options.map((x, j) => (j === i ? e.target.value : x)) }))} placeholder={`Resposta ${i + 1}`} />
                {custom.options.length > 2 && (
                  <button className="btn-ghost !p-2" aria-label="Treu la resposta" onClick={() => setCustom((c) => ({ ...c, options: c.options.filter((_, j) => j !== i) }))}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            {custom.options.length < 4 && (
              <button className="btn-ghost !py-2 text-xs" onClick={() => setCustom((c) => ({ ...c, options: [...c.options, ''] }))}>
                <Plus size={13} /> Resposta
              </button>
            )}
            <button className="btn-gold flex-1 !py-2" disabled={busy} onClick={startCustom}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Target size={15} />} Obre la porra
            </button>
          </div>
        </>
      )}

      {poll && (
        <div className={cn('space-y-3', !open && 'mt-5 border-t border-white/10 pt-4')}>
          <p className="font-display text-lg font-black uppercase text-white">{poll.title}</p>
          <ul className="space-y-1.5">
            {rows.map((r) => (
              <li key={r.c.id} className="relative overflow-hidden rounded-lg border border-white/[0.07] px-3 py-1.5 text-sm">
                <span className="absolute inset-y-0 left-0 transition-all duration-700" style={{ width: `${r.pct}%`, background: `${r.c.primaryColor}40` }} />
                <span className="relative flex items-center justify-between gap-2">
                  <span className="truncate font-bold text-white">{r.c.name}</span>
                  <span className="digital text-amber-300">
                    {r.pct}% · {r.votes}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-2">
            {poll.status === 'open' ? (
              <>
                {stripId === poll.id || bigId === poll.id ? (
                  <button className="btn-ghost" onClick={() => (bigId === poll.id ? actions.hideGraphic() : actions.hideStrip())}>
                    <EyeOff size={15} /> Amaga-la (segueix oberta)
                  </button>
                ) : (
                  <button className="btn-gold" onClick={() => under(poll, false)}>
                    <PanelTop size={15} /> Sota el marcador
                  </button>
                )}
                <button className="btn-ghost" onClick={() => big(poll, false)}>
                  <Maximize2 size={15} /> Gran amb QR
                </button>
                <button className="btn-danger" disabled={busy} onClick={() => void close()}>
                  <Lock size={15} /> Tanca i mostra el resultat
                </button>
              </>
            ) : (
              <>
                <button className="btn-gold" onClick={() => under(poll, true, 15)}>
                  <Trophy size={15} /> Resultat sota el marcador
                </button>
                <button className="btn-ghost" onClick={() => big(poll, true, 15)}>
                  <Maximize2 size={15} /> Resultat en gran
                </button>
                <button className="btn-ghost" onClick={() => setLast(null)}>
                  <Plus size={15} /> Porra nova
                </button>
              </>
            )}
            <button
              className={cn('btn-ghost sm:col-span-2', qrIsVote && '!border-amber-400/60 !text-amber-200')}
              onClick={() => actions.update((s) => ({ ...s, qr: qrIsVote ? { ...s.qr, visible: false } : { visible: true, url, label: 'Participa a la porra!' } }))}
            >
              <QrIcon size={15} /> {qrIsVote ? 'Treu el QR petit' : 'QR petit a la cantonada'}
            </button>
          </div>
        </div>
      )}
      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        La gent respon des de <strong className="text-slate-300">{url.replace(/^https?:\/\//, '')}</strong> (el mateix QR que l’MVP). Només hi pot haver una votació oberta alhora: obrir la porra tanca la de l’MVP i al revés.
      </p>
    </SectionCard>
  );
}
