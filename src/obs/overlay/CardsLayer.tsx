import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';
import type { ObsActiveCard, ObsCardDef, ObsClock, ObsTeam } from '@/obs/types';
import { cardIcon, cardRemaining, mmss } from '@/obs/cards';
import { Logo } from '@/components/ui/Logo';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { EASE_OUT, GOLD_GRADIENT, PANEL_BG, alpha } from '@/obs/overlay/kit';

/** How long the shuffle + reveal stays on screen (ms). */
export const CARD_REVEAL_MS = 13_000;

const CW = 500;
const CH = 720;
const FLIP_AT = 2.9;

// ───────────────────────── card faces ─────────────────────────

export function CardBack({ w = CW, h = CH }: { w?: number; h?: number }) {
  const k = w / CW;
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: w,
        height: h,
        borderRadius: 36 * k,
        background: 'linear-gradient(160deg, #1a2542 0%, #0b1226 55%, #05070c 100%)',
        boxShadow: `inset 0 0 0 ${6 * k}px #FBBF24, inset 0 0 0 ${14 * k}px rgba(5,7,12,.9), inset 0 0 0 ${17 * k}px rgba(251,191,36,.45), 0 ${30 * k}px ${60 * k}px -${20 * k}px rgba(0,0,0,.8)`,
      }}
    >
      <div aria-hidden className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: `repeating-linear-gradient(45deg, #FBBF24 0 ${2 * k}px, transparent ${2 * k}px ${26 * k}px), repeating-linear-gradient(-45deg, #FBBF24 0 ${2 * k}px, transparent ${2 * k}px ${26 * k}px)` }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: 24 * k }}>
        <Logo size={220 * k} />
        <p className="text-center font-display font-black uppercase leading-none text-amber-300" style={{ fontSize: 34 * k, letterSpacing: `${0.3 * k}em` }}>
          Carta de poder
        </p>
      </div>
    </div>
  );
}

export function CardFront({ card, team, w = CW }: { card: ObsCardDef; team: ObsTeam | null; w?: number }) {
  const k = w / CW;
  const Icon = cardIcon(card.id);
  return (
    <div
      className="relative flex flex-col items-center overflow-hidden font-display text-white"
      style={{
        width: w,
        height: CH * k,
        borderRadius: 36 * k,
        padding: `${30 * k}px ${34 * k}px`,
        background: `linear-gradient(165deg, ${alpha(card.color, 0.95)} 0%, ${alpha(card.color, 0.55)} 30%, #0b1226 62%, #05070c 100%)`,
        boxShadow: `inset 0 0 0 ${6 * k}px #FBBF24, inset 0 0 ${60 * k}px ${alpha(card.color, 0.35)}, 0 ${30 * k}px ${70 * k}px -${20 * k}px rgba(0,0,0,.85)`,
      }}
    >
      <div aria-hidden className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `repeating-linear-gradient(115deg, #fff 0 ${2 * k}px, transparent ${2 * k}px ${30 * k}px)` }} />
      <div className="relative flex w-full items-center justify-between">
        <Logo size={54 * k} />
        <span className="font-black uppercase text-white/85" style={{ fontSize: 20 * k, letterSpacing: '0.28em' }}>
          Carta de poder
        </span>
      </div>
      <div
        className="relative grid place-items-center rounded-full"
        style={{ marginTop: 26 * k, width: 200 * k, height: 200 * k, background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.35), rgba(255,255,255,.06) 60%)', boxShadow: `0 0 ${60 * k}px ${alpha(card.color, 0.9)}, inset 0 0 0 ${4 * k}px rgba(255,255,255,.45)` }}
      >
        <Icon size={112 * k} strokeWidth={2.2} color="#fff" />
        {card.id === 'double-goal' && (
          <span className="absolute -bottom-1 -right-2 rounded-full px-3 font-black text-slate-950" style={{ fontSize: 40 * k, background: GOLD_GRADIENT }}>
            ×2
          </span>
        )}
      </div>
      <h3 className="relative text-center font-black uppercase leading-[0.92]" style={{ marginTop: 26 * k, fontSize: (card.name.length > 18 ? 50 : 60) * k, textShadow: '0 4px 0 rgba(0,0,0,.35)' }}>
        {card.name}
      </h3>
      {card.minutes > 0 && (
        <span className="relative mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1 font-black uppercase text-slate-950" style={{ fontSize: 22 * k, background: GOLD_GRADIENT }}>
          <Timer size={22 * k} strokeWidth={3} /> {card.minutes} minuts
        </span>
      )}
      <span className="relative my-4 h-[3px] w-1/3 rounded-full" style={{ background: GOLD_GRADIENT }} />
      <p className="relative text-center font-semibold leading-snug text-slate-100" style={{ fontSize: 25 * k, fontFamily: '"Inter Variable", Inter, system-ui, sans-serif' }}>
        {card.desc}
      </p>
      {team && (
        <div className="absolute inset-x-0 flex items-center justify-center gap-3" style={{ bottom: 26 * k }}>
          <span className="font-bold uppercase text-white/70" style={{ fontSize: 18 * k, letterSpacing: '0.25em' }}>
            Per a
          </span>
          <TeamCrest team={team} size={40 * k} />
          <span className="font-black uppercase" style={{ fontSize: 28 * k }}>
            {team.shortName}
          </span>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 1) a team asks for a card ─────────────────────────

export function CardRequestAlert({ team }: { team: ObsTeam }) {
  return (
    <motion.div
      initial={{ y: -220, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { type: 'spring', damping: 16, stiffness: 160 } }}
      exit={{ y: -220, opacity: 0, transition: { duration: 0.35 } }}
      className="absolute right-[56px] top-[150px] flex w-[940px] items-center gap-7 rounded-[28px] border-2 border-amber-400/70 px-8 py-5 font-display"
      style={{ background: PANEL_BG }}
    >
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-[28px]"
        animate={{ boxShadow: ['0 0 30px rgba(251,191,36,.35)', '0 0 80px rgba(251,191,36,.85)', '0 0 30px rgba(251,191,36,.35)'] }}
        transition={{ repeat: Infinity, duration: 1.4 }}
      />
      <motion.div className="relative shrink-0" animate={{ rotate: [-8, 8, -8], y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}>
        <CardBack w={92} h={132} />
      </motion.div>
      <div className="relative min-w-0 flex-1 leading-none">
        <p className="text-[22px] font-black uppercase tracking-[0.32em] text-amber-300">🃏 Carta demanada</p>
        <p className="mt-3 flex items-center gap-4 truncate text-[54px] font-black uppercase text-white">
          <TeamCrest team={team} size={58} /> {team.name}
        </p>
        <p className="mt-2 text-[24px] font-bold uppercase tracking-[0.14em] text-slate-300">Ha demanat una carta de poder</p>
      </div>
    </motion.div>
  );
}

// ───────────────────────── 2) shuffle + reveal ─────────────────────────

const BACKS = 7;

export function CardReveal({ card, team }: { card: ObsCardDef; team: ObsTeam }) {
  const R = 380;
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-40 font-display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(5,7,12,.45) 0%, rgba(5,7,12,.9) 70%)' }} />

      {/* Light rays behind the revealed card */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[1500px] w-[1500px] -ml-[750px] -mt-[750px]"
        style={{ background: `repeating-conic-gradient(from 0deg, ${alpha(card.color, 0.22)} 0deg 8deg, transparent 8deg 22deg)`, maskImage: 'radial-gradient(circle, #000 15%, transparent 60%)', WebkitMaskImage: 'radial-gradient(circle, #000 15%, transparent 60%)' }}
        initial={{ opacity: 0, rotate: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0, 1], rotate: 60, scale: 1 }}
        transition={{ opacity: { times: [0, 0.3, 0.42], duration: 10 }, rotate: { duration: 12, ease: 'linear' }, scale: { delay: FLIP_AT, duration: 0.6 } }}
      />

      {/* The deck, shuffled in a whirl */}
      <motion.div className="absolute left-1/2 top-1/2" initial={{ rotate: 0 }} animate={{ rotate: 300 }} transition={{ duration: 2.4, ease: [0.5, 0, 0.3, 1] }}>
        {Array.from({ length: BACKS }, (_, i) => {
          const a = (i / BACKS) * Math.PI * 2;
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{ left: -CW / 2, top: -CH / 2 }}
              initial={{ x: 0, y: 0, rotate: 0, scale: 0.4, opacity: 0 }}
              animate={{
                x: [0, Math.cos(a) * R, Math.cos(a + 1.2) * R * 0.8, 0],
                y: [0, Math.sin(a) * R * 0.75, Math.sin(a + 1.2) * R * 0.6, 0],
                rotate: [0, (a * 180) / Math.PI + 90, (a * 180) / Math.PI + 200, 360],
                scale: [0.4, 0.5, 0.5, 0.45],
                opacity: [0, 1, 1, 0],
              }}
              transition={{ duration: 2.5, times: [0, 0.3, 0.75, 1], ease: 'easeInOut', delay: 0.15 + i * 0.03 }}
            >
              <CardBack />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Flash when it flips */}
      <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0.55, 0] }} transition={{ duration: FLIP_AT + 0.6, times: [0, FLIP_AT / (FLIP_AT + 0.6), (FLIP_AT + 0.12) / (FLIP_AT + 0.6), 1] }} />

      {/* The chosen card: rises from the deck and flips */}
      <div className="absolute left-1/2 top-1/2 -ml-[250px] -mt-[360px]" style={{ perspective: 1800 }}>
        <motion.div
          style={{ width: CW, height: CH, transformStyle: 'preserve-3d', position: 'relative' }}
          initial={{ scale: 0.3, opacity: 0, rotateY: 180, y: 40 }}
          animate={{ scale: [0.3, 0.3, 0.95, 1], opacity: [0, 0, 1, 1], rotateY: [180, 180, 180, 0], y: [40, 40, -10, 0] }}
          transition={{ duration: FLIP_AT + 0.6, times: [0, 2.3 / (FLIP_AT + 0.6), FLIP_AT / (FLIP_AT + 0.6), 1], ease: EASE_OUT }}
        >
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
            <CardFront card={card} team={team} />
          </div>
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <CardBack />
          </div>
        </motion.div>
        {/* Gentle float once revealed */}
        <motion.span aria-hidden className="absolute -inset-6 rounded-[44px]" style={{ boxShadow: `0 0 90px ${alpha(card.color, 0.8)}` }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 0.6, 1] }} transition={{ duration: 6, times: [0, 0.5, 0.58, 0.8, 1] }} />
      </div>

      <motion.p
        className="absolute inset-x-0 top-[50px] text-center text-[40px] font-black uppercase tracking-[0.32em] text-amber-300"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        🃏 Carta de poder · {team.shortName}
      </motion.p>
    </motion.div>
  );
}

// ───────────────────────── 3) timed card in force ─────────────────────────

export function ActiveCardBug({ active, card, clock, now }: { active: ObsActiveCard; card: ObsCardDef; clock: ObsClock; now: number }) {
  const left = cardRemaining(active, clock, now);
  const frac = left / active.durationMs;
  const Icon = cardIcon(card.id);
  const hurry = left < 10_000;
  return (
    <motion.div
      initial={{ x: -520, opacity: 0 }}
      animate={{ x: 0, opacity: 1, transition: { duration: 0.5, ease: EASE_OUT } }}
      exit={{ x: -520, opacity: 0, transition: { duration: 0.35 } }}
      className="w-[460px] overflow-hidden rounded-2xl border border-white/10 font-display"
      style={{ background: PANEL_BG, boxShadow: `0 18px 50px -12px rgba(0,0,0,.85), inset 6px 0 0 ${card.color}` }}
    >
      <div className="flex items-center gap-4 py-3 pl-5 pr-4">
        <span className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-xl" style={{ background: card.color, boxShadow: `0 0 24px ${alpha(card.color, 0.7)}` }}>
          <Icon size={34} color="#fff" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1 leading-none">
          <p className="flex items-center gap-2 text-[15px] font-bold uppercase tracking-[0.22em] text-slate-400">
            <TeamCrest team={active.team} size={18} /> Carta {active.team.shortName}
          </p>
          <p className="mt-1.5 truncate text-[30px] font-black uppercase text-white">{card.name}</p>
        </div>
        <motion.span
          className="digital text-[44px] leading-none"
          style={{ color: hurry ? '#f87171' : '#fcd34d' }}
          animate={hurry ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={hurry ? { repeat: Infinity, duration: 1 } : undefined}
        >
          {mmss(left)}
        </motion.span>
      </div>
      <div className="h-[6px] bg-white/10">
        <div className="h-full transition-[width] duration-300" style={{ width: `${frac * 100}%`, background: hurry ? '#ef4444' : card.color }} />
      </div>
    </motion.div>
  );
}
