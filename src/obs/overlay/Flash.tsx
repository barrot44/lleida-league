import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';
import type { ObsFlash } from '@/obs/types';
import { POSITION_LABEL } from '@/config/site';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { EASE_OUT, GOLD_GRADIENT, PANEL_BG, alpha, goldText } from '@/obs/overlay/kit';

/** How long each one-shot animation stays on screen (ms). */
export const FLASH_DURATION: Record<ObsFlash['kind'], number> = { goal: 7500, yellow_card: 6000, red_card: 6000, timeout: 6000 };

export const flashActive = (f: ObsFlash | null, now: number): f is ObsFlash => !!f && now - f.at >= -2000 && now - f.at < FLASH_DURATION[f.kind];

/** Big goal celebration band across the screen. */
export function GoalFlash({ f }: { f: ObsFlash }) {
  const color = f.team.primaryColor;
  const title = f.ownGoal ? 'Gol en pròpia' : f.double ? 'Gol doble!' : 'Gooool!';
  return (
    <motion.div className="absolute inset-x-0 top-[560px] h-[300px] font-display" exit={{ opacity: 0, transition: { duration: 0.4 } }}>
      {/* Band */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        exit={{ scaleX: 0, originX: 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
        className="absolute inset-0 origin-left overflow-hidden"
        style={{ skewY: -3, background: `linear-gradient(90deg, ${alpha(color, 0.95)} 0%, ${alpha(color, 0.75)} 30%, rgba(8,11,17,0.94) 62%)`, boxShadow: `0 0 120px ${alpha(color, 0.55)}` }}
      >
        <span className="absolute inset-x-0 top-0 h-[8px]" style={{ background: GOLD_GRADIENT }} />
        <span className="absolute inset-x-0 bottom-0 h-[8px]" style={{ background: GOLD_GRADIENT }} />
        <motion.span
          className="absolute inset-y-0 w-[380px]"
          style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.38), transparent)' }}
          initial={{ x: -500 }}
          animate={{ x: 2400 }}
          transition={{ delay: 0.5, duration: 1.3, ease: 'easeInOut' }}
        />
        <div aria-hidden className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'repeating-linear-gradient(115deg, #fff 0 2px, transparent 2px 26px)' }} />
      </motion.div>

      {/* GOL! */}
      <motion.div
        initial={{ scale: 2.6, opacity: 0, rotate: -6 }}
        animate={{ scale: 1, opacity: 1, rotate: -3 }}
        transition={{ delay: 0.25, type: 'spring', damping: 11, stiffness: 140 }}
        className="absolute left-[110px] top-[40px] flex items-center gap-8"
      >
        <TeamCrest team={f.team} size={190} />
        <span
          className="whitespace-nowrap font-black uppercase italic leading-none"
          style={{ ...goldText, fontSize: f.ownGoal ? 130 : 210, filter: 'drop-shadow(0 8px 0 rgba(0,0,0,.55)) drop-shadow(0 0 30px rgba(251,191,36,.6))' }}
        >
          {title}
        </span>
      </motion.div>

      {/* Scorer */}
      {f.player && (
        <motion.div
          initial={{ x: 120, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.55, ease: EASE_OUT }}
          className="absolute right-[110px] top-[60px] flex items-center gap-6"
        >
          <div className="text-right leading-none">
            <p className="text-[24px] font-bold uppercase tracking-[0.3em] text-amber-300">
              {f.minute ? `Minut ${f.minute}’` : 'Golejador'}
            </p>
            <p className="mt-2 max-w-[620px] truncate text-[68px] font-black uppercase text-white">{f.player.name}</p>
            <p className="mt-2 text-[26px] font-bold uppercase tracking-[0.18em] text-slate-300">
              #{f.player.dorsal} · {POSITION_LABEL[f.player.position]} · {f.team.shortName}
            </p>
          </div>
          <div className="rounded-full p-[6px]" style={{ background: GOLD_GRADIENT, boxShadow: '0 0 40px rgba(251,191,36,.55)' }}>
            <PlayerAvatar player={f.player} team={f.team} size={160} />
          </div>
        </motion.div>
      )}

      {/* New score */}
      {f.home && f.away && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5, ease: EASE_OUT }}
          className="absolute left-1/2 top-[262px] flex -translate-x-1/2 items-center gap-5 rounded-2xl border border-amber-400/40 px-7 py-3"
          style={{ background: PANEL_BG, boxShadow: '0 20px 50px -10px rgba(0,0,0,.8)' }}
        >
          <TeamCrest team={f.home} size={44} />
          <span className="text-[34px] font-black uppercase text-white">{f.home.shortName}</span>
          <span className="digital text-[50px] leading-none text-amber-300">
            {f.homeScore} - {f.awayScore}
          </span>
          <span className="text-[34px] font-black uppercase text-white">{f.away.shortName}</span>
          <TeamCrest team={f.away} size={44} />
        </motion.div>
      )}
    </motion.div>
  );
}

/** Yellow / red card and time-out notice, under the scoreboard (placed by the stage's column). */
export function SideFlash({ f }: { f: ObsFlash }) {
  const card = f.kind === 'yellow_card' || f.kind === 'red_card';
  const cardColor = f.kind === 'red_card' ? '#EF4444' : '#FACC15';
  const title = f.kind === 'timeout' ? 'Temps mort' : f.kind === 'red_card' ? 'Targeta vermella' : 'Targeta groga';
  return (
    <motion.div
      initial={{ x: -520, opacity: 0 }}
      animate={{ x: 0, opacity: 1, transition: { duration: 0.55, ease: EASE_OUT } }}
      exit={{ x: -520, opacity: 0, transition: { duration: 0.35 } }}
      className="flex w-fit items-center gap-5 overflow-hidden rounded-2xl border border-white/10 py-4 pl-5 pr-8 font-display"
      style={{ background: PANEL_BG, boxShadow: `0 20px 60px -10px rgba(0,0,0,.85), inset 6px 0 0 ${card ? cardColor : '#FBBF24'}` }}
    >
      {card ? (
        <motion.span
          initial={{ rotateY: 180, rotate: -20 }}
          animate={{ rotateY: 0, rotate: -8 }}
          transition={{ delay: 0.25, type: 'spring', damping: 12 }}
          className="ml-2 block h-[84px] w-[60px] rounded-md"
          style={{ background: cardColor, boxShadow: `0 0 30px ${alpha(cardColor, 0.7)}` }}
        />
      ) : (
        <span className="grid h-[76px] w-[76px] place-items-center rounded-full text-slate-950" style={{ background: GOLD_GRADIENT }}>
          <Timer size={44} strokeWidth={2.6} />
        </span>
      )}
      {f.player ? (
        <PlayerAvatar player={f.player} team={f.team} size={76} />
      ) : (
        <TeamCrest team={f.team} size={70} />
      )}
      <div className="leading-none">
        <p className="text-[20px] font-bold uppercase tracking-[0.28em]" style={{ color: card ? cardColor : '#FBBF24' }}>
          {title}
          {f.minute ? ` · ${f.minute}’` : ''}
        </p>
        <p className="mt-2 max-w-[520px] truncate text-[44px] font-black uppercase text-white">{f.player ? f.player.name : f.team.name}</p>
        <p className="mt-1.5 flex items-center gap-2 text-[20px] font-bold uppercase tracking-[0.16em] text-slate-300">
          {f.player && <TeamCrest team={f.team} size={22} />}
          {f.player ? `#${f.player.dorsal} · ${f.team.name}` : 'Un minut d’aturada'}
        </p>
      </div>
    </motion.div>
  );
}

