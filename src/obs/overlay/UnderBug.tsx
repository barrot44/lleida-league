import { motion } from 'framer-motion';
import { Crown, Smartphone, Star, Target } from 'lucide-react';
import type { ObsStripItem } from '@/obs/types';
import { isPrediction, ranked, useTally, type MvpPoll } from '@/lib/mvp';
import { CandidateMark } from '@/components/vote/CandidateMark';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { QrCode } from '@/components/ui/QrCode';
import { POSITION_LABEL } from '@/config/site';
import { EASE_OUT, GOLD_GRADIENT, PANEL_BG, alpha, goldText } from '@/obs/overlay/kit';

/** Same width as the scoreboard above it, so both read as one block. */
export const STRIP_W = 834;

const shell = {
  initial: { y: -24, opacity: 0, clipPath: 'inset(0 0 100% 0)' },
  animate: { y: 0, opacity: 1, clipPath: 'inset(0 0 0% 0)', transition: { duration: 0.5, ease: EASE_OUT } },
  exit: { y: -16, opacity: 0, transition: { duration: 0.3 } },
};

type PollItem = Extract<ObsStripItem, { kind: 'poll' }>;
type PlayerItem = Extract<ObsStripItem, { kind: 'player' }>;

function PollStrip({ it }: { it: PollItem }) {
  const tally = useTally(it.pollId, 2500);
  const poll: MvpPoll = { id: it.pollId, matchId: null, title: it.title, candidates: it.candidates, status: it.closed ? 'closed' : 'open', createdAt: '' };
  const { rows: all, total } = ranked(poll, tally);
  const prediction = isPrediction(poll);
  // Predictions keep the order of the answers; the MVP vote shows the top 4.
  const rows = prediction ? [...all].sort((a, b) => a.i - b.i) : all.slice(0, 4);
  const leader = all[0] && all[0].votes > 0 ? all[0].c.id : null;
  return (
    <div className="flex overflow-hidden rounded-2xl border border-amber-400/30" style={{ width: STRIP_W, background: PANEL_BG, boxShadow: '0 18px 50px -12px rgba(0,0,0,.85)' }}>
      <div className="min-w-0 flex-1 px-5 py-4">
        <p className="flex items-center gap-3 leading-none">
          <span className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[15px] font-black uppercase tracking-[0.2em] text-slate-950" style={{ background: GOLD_GRADIENT }}>
            {prediction ? <Target size={15} /> : <Crown size={15} />} {it.closed ? 'Resultat' : prediction ? 'Porra' : 'Vota l’MVP'}
          </span>
          <span className="truncate text-[26px] font-black uppercase text-white">{it.title}</span>
          <span className="ml-auto shrink-0 text-[16px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {total} {total === 1 ? 'vot' : 'vots'}
          </span>
        </p>
        <ul className="mt-3 space-y-2">
          {rows.map((r) => {
            const win = it.closed && r.c.id === leader;
            const color = r.c.primaryColor;
            return (
              <li key={r.c.id} className="flex items-center gap-3">
                <CandidateMark c={r.c} size={34} />
                <span className="w-[210px] shrink-0 truncate text-[22px] font-black uppercase leading-none text-white">
                  {win && <Crown size={18} className="mr-1 inline -translate-y-0.5 text-amber-300" />}
                  {r.c.option ? r.c.name : r.c.nickname || r.c.name}
                </span>
                <span className="relative h-[14px] min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${r.pct}%` }}
                    transition={{ duration: 0.8, ease: EASE_OUT }}
                    style={{ background: win ? GOLD_GRADIENT : `linear-gradient(90deg, ${alpha(color, 0.75)}, ${color})`, boxShadow: `0 0 14px ${alpha(win ? '#FBBF24' : color, 0.7)}` }}
                  />
                </span>
                <span className="digital w-[78px] shrink-0 text-right text-[30px] leading-none" style={win || r.c.id === leader ? goldText : { color: '#fff' }}>
                  {r.pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      {!it.closed && (
        <div className="flex w-[150px] shrink-0 flex-col items-center justify-center gap-1.5 border-l border-white/10 bg-white/[0.04] px-3">
          <span className="rounded-lg bg-white p-1.5">
            <QrCode value={it.voteUrl} size={104} border={1} />
          </span>
          <span className="flex items-center gap-1 text-[13px] font-black uppercase tracking-[0.14em] text-amber-300">
            <Smartphone size={13} /> Vota
          </span>
        </div>
      )}
    </div>
  );
}

function PlayerStrip({ it }: { it: PlayerItem }) {
  const p = it.player;
  const color = it.team.primaryColor;
  const stats: [string, number][] = [
    ['Gols', it.stats.goals],
    ['Assist.', it.stats.assists],
    ['MVP', it.stats.mvpAwards],
    ['Partits', it.stats.matchesPlayed],
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-400/30" style={{ width: STRIP_W, background: `linear-gradient(90deg, ${alpha(color, 0.45)}, rgba(8,11,17,.95) 45%)`, boxShadow: '0 18px 50px -12px rgba(0,0,0,.85)' }}>
      <div className="flex items-center gap-5 px-5 py-4">
        <span className="relative shrink-0 rounded-full p-[4px]" style={{ background: GOLD_GRADIENT }}>
          <PlayerAvatar player={p} team={it.team} size={104} />
          <span className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-slate-950 font-display text-[18px] font-black text-amber-300 ring-2 ring-amber-400">{p.dorsal}</span>
        </span>
        <div className="min-w-0 flex-1 leading-none">
          <p className="flex items-center gap-2 text-[16px] font-black uppercase tracking-[0.24em] text-amber-300">
            <Star size={15} fill="currentColor" /> {it.title}
          </p>
          <p className="mt-2 truncate text-[46px] font-black uppercase leading-[0.95] text-white">{p.nickname || p.name}</p>
          <p className="mt-2 flex items-center gap-2 text-[18px] font-bold uppercase tracking-[0.14em] text-slate-300">
            <TeamCrest team={it.team} size={22} /> {it.team.shortName} · {POSITION_LABEL[p.position]}
            {it.matchLine && <span className="truncate normal-case tracking-normal text-amber-200">· {it.matchLine.replace(/^En aquest partit: /, '')}</span>}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {stats.map(([label, v]) => (
            <span key={label} className="flex w-[66px] flex-col items-center rounded-xl bg-black/40 py-2">
              <span className="digital text-[32px] leading-none text-white">{v}</span>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Compact graphic under the scoreboard. */
export function UnderBug({ item }: { item: ObsStripItem }) {
  return <motion.div {...shell}>{item.kind === 'poll' ? <PollStrip it={item} /> : <PlayerStrip it={item} />}</motion.div>;
}
