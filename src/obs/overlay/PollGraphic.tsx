import { motion } from 'framer-motion';
import { Crown, Smartphone } from 'lucide-react';
import type { ObsGraphic } from '@/obs/types';
import { candidateTeam, isPrediction, ranked, useTally, type MvpPoll } from '@/lib/mvp';
import { POSITION_LABEL } from '@/config/site';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { QrCode } from '@/components/ui/QrCode';
import { CandidateMark } from '@/components/vote/CandidateMark';
import { Board, EASE_OUT, GOLD_GRADIENT, PANEL_BG, alpha, goldText, listItem, listParent } from '@/obs/overlay/kit';

type G = Extract<ObsGraphic, { kind: 'poll' }>;

/** Live public MVP vote or prediction (bars + QR), or the winner once the vote is closed. */
export function PollGraphic({ g, accent }: { g: G; accent: string }) {
  const tally = useTally(g.pollId, 2500);
  const poll: MvpPoll = { id: g.pollId, matchId: null, title: g.title, candidates: g.candidates, status: g.closed ? 'closed' : 'open', createdAt: '' };
  const { rows, total } = ranked(poll, tally);
  const prediction = isPrediction(poll);

  if (g.closed && rows[0]) {
    const win = rows[0];
    const team = candidateTeam(win.c);
    return (
      <div className="relative flex w-[1400px] items-center gap-14 overflow-hidden rounded-[32px] border border-amber-400/40 px-16 py-12 font-display text-white" style={{ background: PANEL_BG, boxShadow: `0 50px 140px -30px rgba(0,0,0,.9), 0 0 120px -30px ${alpha('#FBBF24', 0.7)}` }}>
        <div aria-hidden className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: alpha(win.c.primaryColor, 0.35) }} />
        <motion.div initial={{ scale: 0.3, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', damping: 12 }} className="relative shrink-0">
          <motion.span className="absolute -top-16 left-1/2 -translate-x-1/2 text-amber-300" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
            <Crown size={84} fill="currentColor" strokeWidth={1.5} />
          </motion.span>
          <div className="rounded-full p-[8px]" style={{ background: GOLD_GRADIENT, boxShadow: '0 0 80px rgba(251,191,36,.7)' }}>
            <CandidateMark c={win.c} size={340} />
          </div>
        </motion.div>
        <div className="relative min-w-0 flex-1">
          <motion.p initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="inline-block rounded-full px-6 py-2 text-[26px] font-black uppercase tracking-[0.3em] text-slate-950" style={{ background: GOLD_GRADIENT }}>
            {prediction ? 'Resultat de la porra' : 'MVP del públic'}
          </motion.p>
          <motion.h2 initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55, duration: 0.6, ease: EASE_OUT }} className="mt-5 truncate text-[104px] font-black uppercase leading-[0.9]">
            {win.c.name}
          </motion.h2>
          {prediction ? (
            <p className="mt-4 text-[30px] font-bold uppercase tracking-[0.14em] text-slate-300">{g.title}</p>
          ) : (
            <p className="mt-4 flex items-center gap-3 text-[30px] font-bold uppercase tracking-[0.14em] text-slate-300">
              <TeamCrest team={team} size={46} /> {win.c.teamName} · #{win.c.dorsal}
            </p>
          )}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-8 flex items-end gap-6">
            <span className="digital text-[120px] leading-none" style={goldText}>
              {win.pct}%
            </span>
            <span className="pb-3 text-[30px] font-bold uppercase tracking-[0.18em] text-slate-300">
              {win.votes} de {total} vots
            </span>
          </motion.div>
          {rows.slice(1).some((r) => r.votes > 0) && (
            <p className="mt-6 truncate text-[24px] font-bold uppercase tracking-wide text-slate-400">
              {rows
                .slice(1, 4)
                .filter((r) => r.votes > 0)
                .map((r) => `${r.c.name} ${r.pct}%`)
                .join('  ·  ')}
            </p>
          )}
        </div>
      </div>
    );
  }

  const shown = rows.slice(0, 6);
  return (
    <Board eyebrow={g.closed ? 'Votació tancada' : prediction ? 'Porra en directe' : 'Votació en directe'} title={g.title} accent={accent} width={1560}>
      <div className="flex gap-10">
        <div className="flex w-[380px] shrink-0 flex-col items-center rounded-3xl border border-amber-400/30 bg-white/[0.04] p-6 text-center">
          <p className="flex items-center gap-2 text-[24px] font-black uppercase tracking-[0.2em] text-amber-300">
            <Smartphone size={26} /> {prediction ? 'Escaneja i participa' : 'Escaneja i vota'}
          </p>
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, type: 'spring', damping: 14 }} className="mt-4 rounded-2xl bg-white p-2.5 shadow-glow">
            <QrCode value={g.voteUrl} size={300} border={1} />
          </motion.div>
          <p className="mt-4 text-[22px] font-bold text-slate-300">{g.voteUrl.replace(/^https?:\/\//, '')}</p>
          <p className="mt-5 leading-none">
            <span className="digital block text-[80px]" style={goldText}>
              {total}
            </span>
            <span className="text-[18px] font-bold uppercase tracking-[0.3em] text-slate-400">{total === 1 ? 'vot' : 'vots'}</span>
          </p>
        </div>
        <motion.ul variants={listParent} initial="hidden" animate="show" className="min-w-0 flex-1 space-y-3">
          {shown.map((r, i) => {
            const team = candidateTeam(r.c);
            return (
              <motion.li key={r.c.id} variants={listItem} layout transition={{ layout: { duration: 0.5, ease: EASE_OUT } }} className="relative flex h-[92px] items-center gap-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5">
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 left-0 origin-left"
                  initial={false}
                  animate={{ width: `${Math.max(r.pct, 1)}%` }}
                  transition={{ duration: 0.8, ease: EASE_OUT }}
                  style={{ background: i === 0 && r.votes > 0 ? `linear-gradient(90deg, ${alpha('#FBBF24', 0.45)}, ${alpha('#FBBF24', 0.12)})` : `linear-gradient(90deg, ${alpha(r.c.primaryColor, 0.4)}, ${alpha(r.c.primaryColor, 0.08)})` }}
                />
                <span className="relative w-[44px] text-center text-[36px] font-black" style={{ color: i === 0 && r.votes > 0 ? '#FBBF24' : '#94a3b8' }}>
                  {i + 1}
                </span>
                <span className="relative">
                  <CandidateMark c={r.c} size={68} />
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className="block truncate text-[34px] font-black uppercase leading-none text-white">{r.c.name}</span>
                  {!r.c.option && (
                    <span className="mt-1.5 flex items-center gap-2 text-[19px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      <TeamCrest team={team} size={22} /> {r.c.teamShort} · #{r.c.dorsal} · {POSITION_LABEL[r.c.position]}
                    </span>
                  )}
                </span>
                <span className="digital relative text-[56px] leading-none" style={goldText}>
                  {r.pct}%
                </span>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </Board>
  );
}
