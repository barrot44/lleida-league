import { motion } from 'framer-motion';
import { Dices } from 'lucide-react';
import { EASE_OUT, GOLD_GRADIENT, PANEL_BG, goldText } from '@/obs/overlay/kit';

/** How long the dice animation stays on screen (ms). */
export const DICE_DURATION = 12_000;

const S = 240;

/** Pips on a 3×3 grid (cells 0–8). */
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

/** Where each face sits on the cube, and the cube rotation that brings it to the front. */
const FACES: { n: number; transform: string; show: { x: number; y: number } }[] = [
  { n: 1, transform: `translateZ(${S / 2}px)`, show: { x: 0, y: 0 } },
  { n: 6, transform: `rotateY(180deg) translateZ(${S / 2}px)`, show: { x: 0, y: 180 } },
  { n: 3, transform: `rotateY(90deg) translateZ(${S / 2}px)`, show: { x: 0, y: -90 } },
  { n: 4, transform: `rotateY(-90deg) translateZ(${S / 2}px)`, show: { x: 0, y: 90 } },
  { n: 5, transform: `rotateX(90deg) translateZ(${S / 2}px)`, show: { x: -90, y: 0 } },
  { n: 2, transform: `rotateX(-90deg) translateZ(${S / 2}px)`, show: { x: 90, y: 0 } },
];

function Face({ n, transform, winner }: { n: number; transform: string; winner: boolean }) {
  return (
    <div
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-2 rounded-[38px] p-7"
      style={{
        transform,
        backfaceVisibility: 'hidden',
        background: 'linear-gradient(145deg, #1a2542 0%, #0b1226 60%, #05070c 100%)',
        boxShadow: `inset 0 0 0 7px #FBBF24, inset 0 0 40px rgba(251,191,36,${winner ? 0.55 : 0.2})`,
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="grid place-items-center">
          {PIPS[n].includes(i) && <span className="h-[44px] w-[44px] rounded-full" style={{ background: GOLD_GRADIENT, boxShadow: '0 0 16px rgba(251,191,36,.8), inset 0 -4px 6px rgba(0,0,0,.35)' }} />}
        </span>
      ))}
    </div>
  );
}

/** The public's dice throw: a 3D die tumbles in, lands on the face that came out and reveals the result. */
export function DiceRoll({ face, result, label }: { face: number; result: number; label: string }) {
  const target = FACES.find((f) => f.n === face)?.show ?? { x: 0, y: 0 };
  const spinX = target.x + 720;
  const spinY = target.y + 1080;
  const counts = face !== result;

  return (
    <motion.div className="pointer-events-none absolute inset-0 z-40 font-display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 42%, rgba(5,7,12,.35) 0%, rgba(5,7,12,.82) 70%)' }} />

      <motion.p initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="absolute inset-x-0 top-[120px] flex items-center justify-center gap-4 text-[44px] font-black uppercase tracking-[0.3em] text-amber-300">
        <Dices size={48} /> El dau del públic
      </motion.p>

      {/* Shadow on the floor */}
      <motion.span
        className="absolute left-1/2 top-[560px] h-[40px] w-[300px] rounded-[50%] bg-black/70 blur-xl"
        style={{ x: '-50%' }}
        initial={{ opacity: 0, scaleX: 0.3 }}
        animate={{ opacity: [0, 0.4, 0.8], scaleX: [0.3, 0.7, 1] }}
        transition={{ duration: 2.2, ease: EASE_OUT }}
      />

      {/* Landing burst */}
      <motion.span
        className="absolute left-1/2 top-[420px] h-[300px] w-[300px] rounded-full border-[8px] border-amber-300"
        style={{ x: '-50%', y: '-50%' }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 2.4], opacity: [0, 0.9, 0] }}
        transition={{ delay: 2.15, duration: 0.8 }}
      />

      <div className="absolute left-1/2 top-[420px] -translate-x-1/2 -translate-y-1/2" style={{ perspective: 1400 }}>
        <motion.div
          style={{ width: S, height: S, transformStyle: 'preserve-3d', position: 'relative' }}
          initial={{ x: -1150, y: -380, rotateX: 0, rotateY: 0, scale: 0.55 }}
          animate={{
            x: [-1150, -560, -180, 0],
            y: [-380, 40, -90, 0],
            rotateX: [0, spinX * 0.45, spinX * 0.85, spinX],
            rotateY: [0, spinY * 0.45, spinY * 0.85, spinY],
            scale: [0.55, 0.85, 0.95, 1.15],
          }}
          transition={{ duration: 2.2, times: [0, 0.45, 0.75, 1], ease: 'easeOut' }}
        >
          {FACES.map((f) => (
            <Face key={f.n} n={f.n} transform={f.transform} winner={f.n === face} />
          ))}
        </motion.div>
      </div>

      {counts && (
        <motion.p
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.6, type: 'spring', damping: 12 }}
          className="absolute inset-x-0 top-[600px] text-center text-[40px] font-black uppercase tracking-[0.2em] text-white"
        >
          Ha sortit un {face} <span className="text-amber-300">→ compta com a {result}</span>
        </motion.p>
      )}

      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: counts ? 3.3 : 2.7, duration: 0.6, ease: EASE_OUT }}
        className="absolute left-1/2 top-[680px] flex items-center gap-10 whitespace-nowrap rounded-[32px] border border-amber-400/50 px-14 py-6"
        style={{ x: '-50%', background: PANEL_BG, boxShadow: '0 30px 90px -20px rgba(0,0,0,.9), 0 0 80px -20px rgba(251,191,36,.6)' }}
      >
        <div className="text-center leading-none">
          <p className="text-[22px] font-bold uppercase tracking-[0.3em] text-slate-400">Resultat</p>
          <p className="digital text-[170px] leading-[0.9]" style={goldText}>
            {result}
          </p>
        </div>
        {label && <p className="max-w-[900px] text-[64px] font-black uppercase leading-[0.95] text-white">{label}</p>}
      </motion.div>
    </motion.div>
  );
}
