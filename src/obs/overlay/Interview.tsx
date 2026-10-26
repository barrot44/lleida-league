import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Mic } from 'lucide-react';
import type { ObsInterview, ObsSponsorItem } from '@/obs/types';
import { Logo } from '@/components/ui/Logo';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { EASE_OUT, GOLD_GRADIENT, alpha } from '@/obs/overlay/kit';

/** Interview at the side of the court: one bar at the bottom centre with who speaks and the question next to the name. */
export function InterviewLayer({ iv, sponsors, raised }: { iv: ObsInterview; sponsors: ObsSponsorItem[]; raised: boolean }) {
  const color = iv.team?.primaryColor ?? '#FBBF24';
  const showSponsors = iv.sponsors && sponsors.length > 0;
  const question = iv.question.trim();
  return (
    <motion.div className="pointer-events-none absolute inset-0 font-display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}>
      <div className="absolute inset-x-0 flex justify-center" style={{ bottom: (raised ? 96 : 50) + (showSponsors ? 120 : 0) }}>
        <motion.div layout initial={{ y: 220, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: EASE_OUT, layout: { duration: 0.45, ease: EASE_OUT } }} className="flex max-w-[1760px] items-stretch overflow-hidden rounded-2xl" style={{ boxShadow: '0 24px 60px -14px rgba(0,0,0,.9)' }}>
          <span className="w-[14px] shrink-0" style={{ background: GOLD_GRADIENT, boxShadow: '0 0 30px rgba(251,191,36,.6)' }} />
          <motion.div layout="position" className="flex shrink-0 items-center gap-6 py-5 pl-7 pr-10" style={{ background: `linear-gradient(90deg, ${alpha(color, 0.6)}, rgba(8,11,17,.96) 80%)` }}>
            {iv.team ? <TeamCrest team={iv.team} size={104} /> : <Logo size={96} />}
            <div className="leading-none">
              <p className="flex items-center gap-2 text-[22px] font-black uppercase tracking-[0.3em] text-red-300">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white">
                  <Mic size={16} />
                </span>
                Entrevista
              </p>
              <p className="mt-3 max-w-[760px] truncate text-[68px] font-black uppercase leading-[0.9] text-white">{iv.name}</p>
              {(iv.role || iv.team) && <p className="mt-3 text-[28px] font-bold uppercase tracking-[0.16em] text-amber-200">{[iv.role, iv.team?.name].filter(Boolean).join(' · ')}</p>}
            </div>
          </motion.div>
          <AnimatePresence mode="popLayout">
            {question && (
              <motion.div
                key={question}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                transition={{ delay: 0.25, duration: 0.45, ease: EASE_OUT }}
                className="flex max-w-[820px] items-center gap-4 border-l border-white/10 bg-[rgba(8,11,17,.96)] py-5 pl-8 pr-10"
              >
                <MessageCircle size={40} className="shrink-0 text-amber-300" />
                <p className="text-[38px] font-black uppercase leading-[1.05] text-white">{question}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {showSponsors && (
        <motion.div
          initial={{ y: 160 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: EASE_OUT }}
          className="absolute inset-x-0 flex h-[110px] items-center justify-center gap-6 border-t border-amber-400/40"
          style={{ bottom: raised ? 64 : 0, background: 'rgba(5,7,12,.9)' }}
        >
          <span className="text-[18px] font-bold uppercase tracking-[0.3em] text-slate-400">Amb el suport de</span>
          {sponsors.slice(0, 7).map((s) => (
            <span key={s.name} className="grid h-[76px] w-[150px] place-items-center rounded-xl bg-white p-2">
              {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="max-h-[60px] max-w-[134px] object-contain" /> : <span className="text-center text-[16px] font-black uppercase leading-none text-slate-900">{s.name}</span>}
            </span>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
