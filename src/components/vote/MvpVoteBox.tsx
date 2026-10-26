import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Crown, Loader2, Vote } from 'lucide-react';
import { castVote, candidateTeam, isPrediction, myVote, ranked, useTally, type MvpCandidate, type MvpPoll } from '@/lib/mvp';
import { POSITION_SHORT } from '@/config/site';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { useUiStore } from '@/store/useUiStore';
import { CandidateMark } from '@/components/vote/CandidateMark';
import { cn } from '@/lib/utils';

/** The whole vote experience: pick a player (or a prediction answer), confirm, then follow the live results. */
export function MvpVoteBox({ poll, compact }: { poll: MvpPoll; compact?: boolean }) {
  const toast = useUiStore((s) => s.toast);
  const [voted, setVoted] = useState<string | null>(() => myVote(poll.id));
  const [picked, setPicked] = useState<MvpCandidate | null>(null);
  const [sending, setSending] = useState(false);
  const showResults = !!voted || poll.status === 'closed';
  const tally = useTally(showResults ? poll.id : null, 4000);
  const { rows, total } = ranked(poll, tally);

  const teams = [...new Map(poll.candidates.map((c) => [c.teamId, c])).values()];
  const prediction = isPrediction(poll);

  const confirm = async () => {
    if (!picked) return;
    setSending(true);
    const res = await castVote(poll, picked.id);
    setSending(false);
    if (res === 'ok') {
      setVoted(picked.id);
      toast(prediction ? `Porra enviada: ${picked.name}! 🎯` : `Vot enviat per a ${picked.name}! 🏆`);
    } else if (res === 'already') {
      setVoted(myVote(poll.id) ?? picked.id);
      toast('Ja havies votat des d’aquest dispositiu.', 'info');
    } else if (res === 'closed') toast('La votació ja s’ha tancat.', 'error');
    else toast('No s’ha pogut enviar el vot. Torna-ho a provar.', 'error');
    setPicked(null);
  };

  if (showResults) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          {poll.status === 'closed' ? 'Resultat final' : 'Resultats en directe'} · {total} {total === 1 ? 'vot' : 'vots'}
        </p>
        {rows.slice(0, compact ? 5 : 10).map((r, i) => {
          const mine = r.c.id === voted;
          return (
            <div key={r.c.id} className={cn('relative overflow-hidden rounded-xl border px-3 py-2', mine ? 'border-amber-400/60' : 'border-white/[0.08]')}>
              <motion.span className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400/30 to-amber-400/5" initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 0.8 }} />
              <span className="relative flex items-center gap-3">
                <CandidateMark c={r.c} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-black uppercase text-white">
                    {i === 0 && r.votes > 0 && <Crown size={14} className="mr-1 inline -translate-y-0.5 text-amber-300" />}
                    {r.c.name}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {!r.c.option && `${r.c.teamShort} · #${r.c.dorsal} `}
                    {mine && <span className="text-amber-300">{r.c.option ? 'El teu pronòstic' : '· El teu vot'}</span>}
                  </span>
                </span>
                <span className="digital text-2xl text-gold-gradient">{r.pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {prediction ? (
        <div className={cn('grid gap-2', poll.candidates.length === 2 ? 'grid-cols-2' : poll.candidates.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4')}>
          {poll.candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => setPicked(c)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 p-3 text-center transition hover:border-amber-400/60 active:scale-95"
              style={{ background: `linear-gradient(160deg, ${c.primaryColor}40, rgba(255,255,255,.02) 70%)` }}
            >
              <CandidateMark c={c} size={compact ? 48 : 64} />
              <span className="w-full font-display text-sm font-black uppercase leading-tight text-white sm:text-base">{c.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className={cn('grid gap-4', teams.length > 1 && 'md:grid-cols-2')}>
          {teams.map((t) => (
            <div key={t.teamId}>
              <p className="mb-2 flex items-center gap-2 font-display text-sm font-black uppercase tracking-wide text-white">
                <TeamCrest team={candidateTeam(t)} size={22} /> {t.teamName}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {poll.candidates
                  .filter((c) => c.teamId === t.teamId)
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setPicked(c)}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 text-center transition hover:border-amber-400/60 hover:bg-amber-400/10 active:scale-95"
                    >
                      <PlayerAvatar player={c} team={candidateTeam(c)} size={compact ? 48 : 60} />
                      <span className="w-full truncate font-display text-sm font-black uppercase leading-tight text-white">{c.nickname || c.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        #{c.dorsal} · {POSITION_SHORT[c.position]}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {picked && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="sticky bottom-20 z-20 mt-4 flex flex-col gap-3 rounded-2xl border border-amber-400/50 bg-surface/95 p-3 shadow-glow backdrop-blur sm:flex-row sm:items-center md:bottom-4">
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <CandidateMark c={picked} size={44} />
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{prediction ? 'La teva porra' : 'El teu MVP'}</span>
                <span className="block truncate font-display text-lg font-black uppercase text-white">{picked.name}</span>
              </span>
            </span>
            <span className="grid grid-cols-2 gap-2 sm:flex">
              <button className="btn-ghost" onClick={() => setPicked(null)}>
                Canvia
              </button>
              <button className="btn-gold" disabled={sending} onClick={() => void confirm()}>
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Vota
              </button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Vote size={13} /> Un sol vot per dispositiu. Després veuràs els resultats en directe.
      </p>
    </div>
  );
}
