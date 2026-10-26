import { motion } from 'framer-motion';
import { MessageCircle, Mic } from 'lucide-react';
import type { ObsInterview, ObsSponsorItem } from '@/obs/types';
import { Logo } from '@/components/ui/Logo';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { EASE_OUT, GOLD_GRADIENT, PANEL_BG, alpha } from '@/obs/overlay/kit';

/** Interview at the side of the court: big name plate, the question on top and a sponsors strip. */
export function InterviewLayer({ iv, sponsors, raised }: { iv: ObsInterview; sponsors: ObsSponsorItem[]; raised: boolean }) {
  const color = iv.team?.primaryColor ?? '#FBBF24';
  const showSponsors = iv.sponsors && sponsors.length > 0;
  return (
    <motion.div className="pointer-events-none absolute inset-0 font-display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}>
      {iv.question.trim() && (
        <motion.div
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5, ease: EASE_OUT }}
          className="absolute left-1/2 top-[170px] flex max-w-[1300px] items-center gap-4 rounded-2xl border border-white/10 px-7 py-4"
          // framer-motion owns `transform` here, so the centring goes through it (a Tailwind translate would be lost).
          style={{ x: '-50%', background: PANEL_BG, boxShadow: '0 20px 50px -12px rgba(0,0,0,.85)' }}
        >
          <MessageCircle size={34} className="shrink-0 text-amber-300" />
          <p className="text-[34px] font-black uppercase leading-tight text-white">{iv.question}</p>
        </motion.div>
      )}

      <motion.div className="absolute left-[80px] flex items-stretch" style={{ bottom: (raised ? 96 : 50) + (showSponsors ? 120 : 0) }} initial={{ x: -700 }} animate={{ x: 0 }} transition={{ duration: 0.6, ease: EASE_OUT }}>
        <span className="w-[14px] rounded-l-lg" style={{ background: GOLD_GRADIENT, boxShadow: '0 0 30px rgba(251,191,36,.6)' }} />
        <div className="flex items-center gap-6 rounded-r-2xl py-5 pl-7 pr-12" style={{ background: `linear-gradient(90deg, ${alpha(color, 0.55)}, rgba(8,11,17,.95) 45%)`, boxShadow: '0 24px 60px -14px rgba(0,0,0,.9)' }}>
          {iv.team ? <TeamCrest team={iv.team} size={110} /> : <Logo size={100} />}
          <div className="leading-none">
            <p className="flex items-center gap-2 text-[22px] font-black uppercase tracking-[0.3em] text-red-300">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white">
                <Mic size={16} />
              </span>
              Entrevista
            </p>
            <p className="mt-3 max-w-[1100px] truncate text-[72px] font-black uppercase leading-[0.9] text-white">{iv.name}</p>
            {(iv.role || iv.team) && (
              <p className="mt-3 text-[30px] font-bold uppercase tracking-[0.16em] text-amber-200">
                {[iv.role, iv.team?.name].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
      </motion.div>

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

/** A message from the stands, approved from the panel. */
export function FanMessageBubble({ name, text, low }: { name: string; text: string; low: boolean }) {
  return (
    <motion.div
      initial={{ x: 620, opacity: 0, rotate: 3 }}
      animate={{ x: 0, opacity: 1, rotate: 0 }}
      exit={{ x: 620, opacity: 0, transition: { duration: 0.35 } }}
      transition={{ type: 'spring', damping: 16, stiffness: 150 }}
      className="absolute right-[56px] w-[560px] font-display"
      style={{ bottom: low ? 300 : 220 }}
    >
      <div className="relative rounded-[26px] rounded-br-md border border-cyan-300/40 px-6 py-4" style={{ background: 'linear-gradient(160deg, rgba(14,116,144,.95), rgba(8,11,17,.95) 70%)', boxShadow: '0 24px 60px -14px rgba(0,0,0,.85), 0 0 40px -14px rgba(34,211,238,.7)' }}>
        <p className="flex items-center gap-2 text-[18px] font-black uppercase tracking-[0.25em] text-cyan-200">
          <MessageCircle size={20} /> Missatge de l’afició
        </p>
        <p className="mt-2 text-[32px] font-bold leading-snug text-white" style={{ fontFamily: '"Inter Variable", Inter, system-ui, sans-serif' }}>
          “{text}”
        </p>
        <p className="mt-2 text-right text-[24px] font-black uppercase text-amber-300">— {name}</p>
      </div>
    </motion.div>
  );
}
