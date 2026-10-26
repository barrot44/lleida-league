import { useMemo, useState } from 'react';
import { Crown, ExternalLink, Loader2, Lock, MonitorUp, PanelTop, QrCode as QrIcon, Save, Vote } from 'lucide-react';
import { candidateOf, isPrediction, openPoll, ranked, setPollStatus, useOpenPoll, useOpenPollStore, useTally, voteUrl, type MvpPoll } from '@/lib/mvp';
import { squadOrder } from '@/obs/state';
import { useObsStore } from '@/obs/useObsStore';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { SectionCard } from '@/components/admin/fields';
import type { useObsActions } from '@/components/admin/obs/useObsActions';
import { autoNotify } from '@/components/admin/obs/autoNotify';
import { cn } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

/** Public MVP vote: open it, put it on air with a QR, close it and reveal (and save) the winner. */
export function MvpPollControls({ actions }: { actions: Actions }) {
  const sb = useObsStore((s) => s.state.scoreboard);
  const main = useObsStore((s) => s.state.main);
  const qr = useObsStore((s) => s.state.qr);
  const teams = useLeagueStore((s) => s.teams);
  const players = useLeagueStore((s) => s.players);
  const matches = useLeagueStore((s) => s.matches);
  const upsertMatch = useLeagueStore((s) => s.upsertMatch);
  const toast = useUiStore((s) => s.toast);
  const anyOpen = useOpenPoll();
  // The live prediction uses the same machinery; this card only handles the MVP vote.
  const open = anyOpen && !isPrediction(anyOpen) ? anyOpen : null;
  const [last, setLast] = useState<MvpPoll | null>(null);
  const poll = open ?? last;
  const tally = useTally(poll?.id, 3000);
  const [title, setTitle] = useState('Vota l’MVP del partit');
  const [excluded, setExcluded] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const squad = useMemo(() => players.filter((p) => p.teamId === sb.home?.id || p.teamId === sb.away?.id).sort((a, b) => (a.teamId === b.teamId ? squadOrder(a, b) : a.teamId === sb.home?.id ? -1 : 1)), [players, sb.home?.id, sb.away?.id]);
  const chosen = squad.filter((p) => !excluded.includes(p.id));
  const linked = matches.find((m) => m.id === sb.matchId);
  const { rows, total } = poll ? ranked(poll, tally) : { rows: [], total: 0 };
  const url = voteUrl();

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut fer.', 'error');
    } finally {
      setBusy(false);
      void useOpenPollStore.getState().refresh();
    }
  };

  const start = () =>
    run(async () => {
      const candidates = chosen.flatMap((p) => {
        const t = teams.find((x) => x.id === p.teamId);
        return t ? [candidateOf(p, t)] : [];
      });
      if (candidates.length < 2) throw new Error('Calen com a mínim 2 jugadors candidats (tria els equips al marcador).');
      const p = await openPoll({ matchId: sb.matchId, title: title.trim() || 'Vota l’MVP del partit', candidates });
      setLast(p);
      toast('Votació oberta! Ja es pot votar des de la web.');
      autoNotify('poll', useObsStore.getState().state, p.title);
    });

  const close = () =>
    run(async () => {
      if (!poll) return;
      await setPollStatus(poll.id, 'closed');
      setLast({ ...poll, status: 'closed' });
      toast('Votació tancada.', 'info');
    });

  const onAir = (closed: boolean) => {
    if (!poll) return;
    actions.showGraphic({ kind: 'poll', pollId: poll.id, title: poll.title, candidates: poll.candidates, closed, voteUrl: url }, 0);
  };

  const underBug = (closed: boolean) => {
    if (!poll) return;
    actions.showStrip({ kind: 'poll', pollId: poll.id, title: poll.title, candidates: poll.candidates, closed, voteUrl: url }, closed ? 15 : 0);
  };

  const saveMvp = () => {
    const win = rows[0];
    if (!win || !win.votes) return toast('Encara no hi ha vots.', 'error');
    const m = poll?.matchId ? matches.find((x) => x.id === poll.matchId) : linked;
    if (!m) return toast('Aquesta votació no està lligada a cap partit del calendari.', 'error');
    if (m.status !== 'finished') return toast('Primer tanca el partit a la web (botó «Tanca el partit a la web» del marcador).', 'error');
    upsertMatch({ ...m, mvpPlayerId: win.c.id });
    toast(`${win.c.name} desat com a MVP del partit.`);
  };

  const pollOnAir = main.visible && main.graphic?.kind === 'poll';
  const qrIsVote = qr.visible && qr.url === url;

  return (
    <SectionCard
      title="Votació MVP del públic"
      actions={
        poll && (
          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider', poll.status === 'open' ? 'bg-red-500 text-white' : 'bg-white/10 text-slate-300')}>
            {poll.status === 'open' ? '● Oberta' : 'Tancada'} · {total} {total === 1 ? 'vot' : 'vots'}
          </span>
        )
      }
    >
      {!open ? (
        <div className="space-y-3">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Títol de la votació" />
          {squad.length === 0 ? (
            <p className="text-xs text-slate-500">Tria els dos equips al marcador per tenir candidats.</p>
          ) : (
            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">Candidats ({chosen.length}). Toca per treure’n o tornar-ne a posar.</p>
              <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                {squad.map((p) => {
                  const on = !excluded.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setExcluded((x) => (on ? [...x, p.id] : x.filter((id) => id !== p.id)))}
                      className={cn('rounded-lg border px-2 py-1 text-xs font-bold transition', on ? (p.teamId === sb.home?.id ? 'border-amber-400/60 bg-amber-400/10 text-amber-100' : 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100') : 'border-white/10 text-slate-500 line-through')}
                    >
                      {p.dorsal} {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button className="btn-gold w-full" disabled={busy || chosen.length < 2} onClick={() => void start()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Vote size={16} />} Obre la votació
          </button>
        </div>
      ) : null}

      {poll && (
        <div className={cn('space-y-3', !open && 'mt-5 border-t border-white/10 pt-4')}>
          <p className="font-display text-lg font-black uppercase text-white">{poll.title}</p>
          <ul className="space-y-1.5">
            {rows.slice(0, 5).map((r, i) => (
              <li key={r.c.id} className="relative overflow-hidden rounded-lg border border-white/[0.07] px-3 py-1.5 text-sm">
                <span className="absolute inset-y-0 left-0 bg-amber-400/20 transition-all duration-700" style={{ width: `${r.pct}%` }} />
                <span className="relative flex items-center justify-between gap-2">
                  <span className="truncate font-bold text-white">
                    {i === 0 && r.votes > 0 && <Crown size={13} className="mr-1 inline text-amber-300" />}#{r.c.dorsal} {r.c.name} <span className="text-xs text-slate-400">{r.c.teamShort}</span>
                  </span>
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
                <button className={pollOnAir ? 'btn-ghost' : 'btn-gold'} onClick={() => onAir(false)}>
                  <MonitorUp size={15} /> {pollOnAir ? 'Torna a mostrar' : 'Mostra amb QR i %'}
                </button>
                <button className="btn-ghost" onClick={() => underBug(false)}>
                  <PanelTop size={15} /> Sota el marcador
                </button>
                <button className="btn-danger sm:col-span-2" disabled={busy} onClick={() => void close()}>
                  <Lock size={15} /> Tanca la votació
                </button>
              </>
            ) : (
              <>
                <button className="btn-gold" onClick={() => onAir(true)}>
                  <Crown size={15} /> Mostra el guanyador
                </button>
                <button className="btn-ghost" onClick={() => underBug(true)}>
                  <PanelTop size={15} /> Guanyador sota el marcador
                </button>
                <button className="btn-ghost sm:col-span-2" onClick={saveMvp}>
                  <Save size={15} /> Desa’l com a MVP del partit
                </button>
              </>
            )}
            <button
              className={cn('btn-ghost', qrIsVote && '!border-amber-400/60 !text-amber-200')}
              onClick={() => actions.update((s) => ({ ...s, qr: qrIsVote ? { ...s.qr, visible: false } : { visible: true, url, label: 'Vota l’MVP!' } }))}
            >
              <QrIcon size={15} /> {qrIsVote ? 'Treu el QR petit' : 'QR petit a la cantonada'}
            </button>
            <a className="btn-ghost" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> Obre la pàgina de vots
            </a>
          </div>
          {poll.status === 'closed' && (
            <button className="w-full text-center text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-white" onClick={() => setLast(null)}>
              Prepara una votació nova
            </button>
          )}
        </div>
      )}
      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        La gent vota des de <strong className="text-slate-300">{url.replace(/^https?:\/\//, '')}</strong>, des de la fitxa del partit o des del bàner de la pàgina d’inici (només 1 vot per mòbil).
      </p>
    </SectionCard>
  );
}
