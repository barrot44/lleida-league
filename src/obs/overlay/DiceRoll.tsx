import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Dices } from 'lucide-react';
import { EASE_OUT, PANEL_BG, goldText } from '@/obs/overlay/kit';

/** How long the dice animation stays on screen (ms). */
export const DICE_DURATION = 12_000;

const S = 240;
const HALF = S / 2;

/** Centre of the die once it rests (stage coordinates) and the floor it bounces on. */
const REST_X = 960;
const REST_Y = 420;

// ───────────────────────── the throw (deterministic "physics") ─────────────────────────

/** Moments the die hits the floor, and how high it flies between them. */
const IMPACTS = [0.55, 1.08, 1.45, 1.69, 1.84];
const HOPS = [150, 72, 30, 10];
const ROLL_END = 2.05; // stops travelling / tumbling
const SETTLE_END = 2.75; // last wobble on the edge

const easeOutQuart = (p: number) => 1 - (1 - p) ** 4;

/** Height above the floor (px, positive = up). */
function heightAt(t: number) {
  if (t < IMPACTS[0]) return 560 * (1 - (t / IMPACTS[0]) ** 2);
  for (let i = 0; i < HOPS.length; i++) {
    const a = IMPACTS[i];
    const b = IMPACTS[i + 1];
    if (t < b) {
      const u = (t - a) / (b - a);
      return 4 * HOPS[i] * u * (1 - u);
    }
  }
  return 0;
}

/** Squash on every impact (0 → none). */
function squashAt(t: number) {
  let s = 0;
  IMPACTS.forEach((a, i) => {
    const d = (t - a) / 0.045;
    if (d > -1.5 && d < 3) s = Math.max(s, (0.13 - i * 0.022) * Math.exp(-d * d));
  });
  return s;
}

/** Final orientation for each face (cube rotation that shows it to the camera). */
const SHOW: Record<number, { x: number; y: number }> = { 1: { x: 0, y: 0 }, 6: { x: 0, y: 180 }, 3: { x: 0, y: -90 }, 4: { x: 0, y: 90 }, 5: { x: -90, y: 0 }, 2: { x: 90, y: 0 } };

interface Pose {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
  squash: number;
  h: number;
  speed: number;
}

function poseAt(t: number, face: number): Pose {
  const target = SHOW[face] ?? SHOW[1];
  // Angular "energy" drains with every bounce: fast in the air, slower and slower on the floor.
  const p = Math.min(1, t / ROLL_END);
  const spin = 1 - (1 - p) ** 2.6;
  const wobT = Math.max(0, t - ROLL_END);
  const wobble = t > ROLL_END && t < SETTLE_END + 0.3 ? Math.exp(-wobT * 6.5) : 0;
  const rx = target.x + 1080 * (1 - spin) + 9 * wobble * Math.sin(wobT * 26);
  const ry = target.y + 1440 * (1 - spin) + 4 * wobble * Math.sin(wobT * 21 + 1);
  const rz = 260 * (1 - spin) ** 1.5 + 7 * wobble * Math.cos(wobT * 24);
  const travel = easeOutQuart(Math.min(1, t / (ROLL_END + 0.1)));
  const h = heightAt(t);
  const x = REST_X - 1250 * (1 - travel);
  const y = REST_Y - h;
  const scale = 0.62 + 0.53 * easeOutQuart(Math.min(1, t / 1.6));
  return { x, y, rx, ry, rz, scale, squash: squashAt(t), h, speed: Math.abs(1 - spin) };
}

// ───────────────────────── lighting ─────────────────────────

const rad = (d: number) => (d * Math.PI) / 180;
type V3 = [number, number, number];

/** CSS `rotateX(a) rotateY(b) rotateZ(c)` applied to a vector (Rz first, then Ry, then Rx). */
function rotate([x, y, z]: V3, ax: number, ay: number, az: number): V3 {
  const [cz, sz, cy, sy, cx, sx] = [Math.cos(rad(az)), Math.sin(rad(az)), Math.cos(rad(ay)), Math.sin(rad(ay)), Math.cos(rad(ax)), Math.sin(rad(ax))];
  // rotateZ
  let x1 = x * cz - y * sz;
  let y1 = x * sz + y * cz;
  let z1 = z;
  // rotateY
  const x2 = x1 * cy + z1 * sy;
  const z2 = -x1 * sy + z1 * cy;
  x1 = x2;
  z1 = z2;
  // rotateX
  const y3 = y1 * cx - z1 * sx;
  const z3 = y1 * sx + z1 * cx;
  return [x1, y3, z3];
}

/** Key light from the top-left-front (CSS y points down). */
const LIGHT: V3 = (() => {
  const v: V3 = [-0.45, -0.75, 0.55];
  const n = Math.hypot(...v);
  return [v[0] / n, v[1] / n, v[2] / n];
})();

// ───────────────────────── die model ─────────────────────────

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

const FACES: { n: number; transform: string; normal: V3 }[] = [
  { n: 1, transform: `translateZ(${HALF}px)`, normal: [0, 0, 1] },
  { n: 6, transform: `rotateY(180deg) translateZ(${HALF}px)`, normal: [0, 0, -1] },
  { n: 3, transform: `rotateY(90deg) translateZ(${HALF}px)`, normal: [1, 0, 0] },
  { n: 4, transform: `rotateY(-90deg) translateZ(${HALF}px)`, normal: [-1, 0, 0] },
  { n: 5, transform: `rotateX(90deg) translateZ(${HALF}px)`, normal: [0, -1, 0] },
  { n: 2, transform: `rotateX(-90deg) translateZ(${HALF}px)`, normal: [0, 1, 0] },
];

const PIP_STYLE = {
  background: 'radial-gradient(circle at 38% 34%, #fff7d6 0%, #fbbf24 38%, #d97706 72%, #78350f 100%)',
  boxShadow: 'inset 0 4px 7px rgba(0,0,0,.55), inset 0 -2px 3px rgba(255,255,255,.35), 0 0 12px rgba(251,191,36,.45)',
};

function Face({ n, transform, faceRef, winner }: { n: number; transform: string; faceRef: (el: HTMLDivElement | null) => void; winner: boolean }) {
  return (
    <div
      ref={faceRef}
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-2 rounded-[22px] p-[30px]"
      style={{
        transform,
        backfaceVisibility: 'hidden',
        background: 'radial-gradient(120% 120% at 30% 22%, #22305a 0%, #0f1833 45%, #0a1124 100%)',
        // Thin gold edge + bevel: one solid die, not six framed tiles.
        boxShadow: `inset 0 0 0 3px rgba(224,169,42,${winner ? 0.95 : 0.75}), inset 6px 8px 18px rgba(255,255,255,.07), inset -8px -10px 22px rgba(0,0,0,.5)`,
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="grid place-items-center">
          {PIPS[n].includes(i) && <span className="h-[42px] w-[42px] rounded-full" style={PIP_STYLE} />}
        </span>
      ))}
    </div>
  );
}

/** Small gold sparks where the die hits the floor. */
function Sparks({ x, big }: { x: number; big: boolean }) {
  const n = big ? 16 : 9;
  return (
    <div className="absolute" style={{ left: x, top: REST_Y + HALF * 1.1 }}>
      {Array.from({ length: n }, (_, i) => {
        const a = Math.PI + (Math.PI * (i + 0.5)) / n;
        const d = (big ? 170 : 90) * (0.6 + ((i * 37) % 10) / 25);
        return (
          <motion.span
            key={i}
            className="absolute h-[7px] w-[7px] rounded-full"
            style={{ background: i % 3 ? '#fbbf24' : '#fff7d6', boxShadow: '0 0 10px rgba(251,191,36,.9)' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.55, opacity: 0, scale: 0.3 }}
            transition={{ duration: big ? 0.8 : 0.5, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

/** The public's dice throw: a 3D die is thrown, bounces, tumbles, settles on the face that came out and reveals the result. */
export function DiceRoll({ face, result }: { face: number; result: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const cube = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const faces = useRef<(HTMLDivElement | null)[]>([]);
  const [impacts, setImpacts] = useState<{ i: number; x: number }[]>([]);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let lastImpact = -1;
    let done = false;
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const ps = poseAt(t, face);
      const sq = ps.squash;
      if (outer.current) {
        outer.current.style.transform = `translate(${ps.x - HALF}px, ${ps.y - HALF}px) scale(${ps.scale * (1 + sq * 0.6)}, ${ps.scale * (1 - sq)})`;
        outer.current.style.filter = ps.speed > 0.25 ? `blur(${Math.min(2.2, ps.speed * 2.4).toFixed(2)}px)` : 'none';
      }
      if (cube.current) cube.current.style.transform = `rotateX(${ps.rx}deg) rotateY(${ps.ry}deg) rotateZ(${ps.rz}deg)`;
      if (shadow.current) {
        const k = Math.min(1, ps.h / 560);
        shadow.current.style.transform = `translate(${ps.x - 170}px, ${REST_Y + HALF * ps.scale - 18}px) scale(${(0.55 + 0.45 * ps.scale) * (1 + k * 0.6)}, ${(0.55 + 0.45 * ps.scale) * (1 + k * 0.3)})`;
        shadow.current.style.opacity = String(0.85 * (1 - k) * Math.min(1, t / 0.2));
      }
      // Lambert shading per face.
      FACES.forEach((f, i) => {
        const el = faces.current[i];
        if (!el) return;
        const nw = rotate(f.normal, ps.rx, ps.ry, ps.rz);
        const lit = Math.max(0, nw[0] * LIGHT[0] + nw[1] * LIGHT[1] + nw[2] * LIGHT[2]);
        el.style.filter = `brightness(${(0.42 + 0.95 * lit).toFixed(3)})`;
      });
      const idx = IMPACTS.filter((a) => t >= a).length - 1;
      if (idx > lastImpact) {
        lastImpact = idx;
        setImpacts((list) => [...list, { i: idx, x: ps.x }]);
      }
      if (t >= SETTLE_END && !done) {
        done = true;
        setLanded(true);
      }
      if (t < SETTLE_END + 0.5) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [face]);

  const revealAt = SETTLE_END + 0.15;

  return (
    <motion.div className="pointer-events-none absolute inset-0 z-40 font-display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 46%, rgba(5,7,12,.3) 0%, rgba(5,7,12,.84) 72%)' }} />
      {/* Spotlight on the landing spot */}
      <div className="absolute left-1/2 top-[200px] h-[620px] w-[1000px] -translate-x-1/2" style={{ background: 'radial-gradient(closest-side at 50% 60%, rgba(251,191,36,.17), rgba(251,191,36,.05) 60%, transparent 100%)' }} />

      <motion.p initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: revealAt - 0.25, duration: 0.45, ease: EASE_OUT }} className="absolute inset-x-0 top-[110px] flex items-center justify-center gap-4 text-[44px] font-black uppercase tracking-[0.3em] text-amber-300">
        <Dices size={48} /> El dau del públic
      </motion.p>

      {/* Floor shadow (grows and fades with the height) */}
      <div ref={shadow} className="absolute left-0 top-0 h-[44px] w-[340px] rounded-[50%]" style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,.85) 0%, rgba(0,0,0,.45) 45%, transparent 70%)', opacity: 0 }} />

      {impacts.map((im) => (
        <Sparks key={im.i} x={im.x} big={im.i === 0} />
      ))}

      {/* The die */}
      <div ref={outer} className="absolute left-0 top-0" style={{ width: S, height: S, transformOrigin: '50% 100%', willChange: 'transform, filter' }}>
        <div style={{ perspective: 1300, width: S, height: S }}>
          <div ref={cube} style={{ width: S, height: S, position: 'relative', transformStyle: 'preserve-3d', willChange: 'transform' }}>
            {/* Solid core: hides the gaps of the rounded corners at any angle. */}
            {['', 'rotateY(90deg)', 'rotateX(90deg)'].map((tr) => (
              <div key={tr || 'z'} className="absolute rounded-[14px]" style={{ inset: 3, transform: tr, background: '#0a1124' }} />
            ))}
            {FACES.map((f, i) => (
              <Face key={f.n} n={f.n} transform={f.transform} winner={f.n === face} faceRef={(el) => (faces.current[i] = el)} />
            ))}
          </div>
        </div>
      </div>

      {/* Winning face glow + landing ring */}
      {landed && (
        <>
          <motion.span
            className="absolute rounded-[40px] border-[5px] border-amber-300"
            style={{ left: REST_X - (S * 1.15) / 2 - 10, top: REST_Y - (S * 1.15) / 2 - 10, width: S * 1.15 + 20, height: S * 1.15 + 20, boxShadow: '0 0 60px rgba(251,191,36,.75), inset 0 0 40px rgba(251,191,36,.35)' }}
            initial={{ opacity: 0, scale: 1.25 }}
            animate={{ opacity: [0, 1, 0.75], scale: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          />
          <motion.span
            className="absolute rounded-full border-[6px] border-amber-200"
            style={{ left: REST_X - 160, top: REST_Y - 160, width: 320, height: 320 }}
            initial={{ scale: 0.6, opacity: 0.9 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </>
      )}

      {/* What happens now: 1 → 1 vs 1 … 4 → 4 vs 4 (5 counts as 1 and 6 as 2). */}
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: revealAt + 0.1, duration: 0.6, ease: EASE_OUT }}
        className="absolute left-1/2 top-[640px] flex flex-col items-center whitespace-nowrap rounded-[32px] border border-amber-400/50 px-16 py-7 text-center"
        style={{ x: '-50%', background: PANEL_BG, boxShadow: '0 30px 90px -20px rgba(0,0,0,.9), 0 0 80px -20px rgba(251,191,36,.6)' }}
      >
        <p className="text-[26px] font-bold uppercase tracking-[0.35em] text-slate-300">Ara es juga</p>
        <motion.p
          className="mt-1 flex items-center gap-8 leading-none"
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: revealAt + 0.3, type: 'spring', damping: 10, stiffness: 160 }}
        >
          <span className="digital text-[180px] leading-[0.9]" style={goldText}>
            {result}
          </span>
          <span className="text-[84px] font-black uppercase italic text-white">contra</span>
          <span className="digital text-[180px] leading-[0.9]" style={goldText}>
            {result}
          </span>
        </motion.p>
        <p className="mt-2 text-[44px] font-black uppercase tracking-[0.12em] text-amber-300">Durant 2 minuts</p>
      </motion.div>
    </motion.div>
  );
}
