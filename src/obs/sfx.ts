import type { ObsState, SfxKind } from '@/obs/types';

/**
 * Arena sounds synthesised with the Web Audio API (no audio files to host or license). The overlay inside OBS plays
 * them; with "Control audio via OBS" on the browser source they reach the stream mix like any other source.
 */

export const SFX_LIST: { id: SfxKind; label: string; emoji: string }[] = [
  { id: 'horn', label: 'Botzina', emoji: '📯' },
  { id: 'whistle', label: 'Xiulet', emoji: '🔔' },
  { id: 'cheer', label: 'Ovació', emoji: '🙌' },
  { id: 'drumroll', label: 'Redoble', emoji: '🥁' },
  { id: 'sting', label: 'Transició', emoji: '✨' },
  { id: 'card', label: 'Carta', emoji: '🃏' },
  { id: 'dice', label: 'Daus', emoji: '🎲' },
];

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noiseBuffer(c: AudioContext) {
  if (noise) return noise;
  const len = c.sampleRate * 4;
  noise = c.createBuffer(1, len, c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

/** Gain with an envelope of [time offset, value] points (linear ramps). */
function envGain(c: AudioContext, out: AudioNode, t: number, points: [number, number][]) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  for (const [dt, v] of points) g.gain.linearRampToValueAtTime(v, t + dt);
  g.connect(out);
  return g;
}

function noiseSrc(c: AudioContext, t: number, dur: number) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  src.start(t, Math.random() * 3);
  src.stop(t + dur + 0.05);
  return src;
}

function filter(c: AudioContext, type: BiquadFilterType, freq: number, q = 1) {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function osc(c: AudioContext, type: OscillatorType, freq: number, t: number, dur: number) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}

/** Futsal end-of-period buzzer. */
function horn(c: AudioContext, out: AudioNode, t: number, dur = 1.4, level = 0.22) {
  const lp = filter(c, 'lowpass', 2200, 0.7);
  lp.connect(envGain(c, out, t, [[0.03, level], [dur - 0.12, level * 0.9], [dur, 0]]));
  for (const f of [233, 294, 349.5]) {
    osc(c, 'sawtooth', f, t, dur).connect(lp);
    osc(c, 'square', f * 1.004, t, dur).connect(lp);
  }
}

/** Referee whistle: a pea whistle trills, hence the fast vibrato. */
function whistle(c: AudioContext, out: AudioNode, t: number, blasts: [number, number][] = [[0, 0.9]]) {
  for (const [start, dur] of blasts) {
    const t0 = t + start;
    const g = envGain(c, out, t0, [[0.015, 0.16], [dur - 0.05, 0.14], [dur, 0]]);
    const o = osc(c, 'sine', 2950, t0, dur);
    const lfo = osc(c, 'sine', 34, t0, dur);
    const depth = c.createGain();
    depth.gain.value = 140;
    lfo.connect(depth).connect(o.frequency);
    o.connect(g);
    const breath = filter(c, 'bandpass', 3000, 6);
    noiseSrc(c, t0, dur).connect(breath).connect(envGain(c, out, t0, [[0.02, 0.05], [dur, 0]]));
  }
}

/** Crowd: several bands of noise breathing at different rates, plus scattered claps. */
function cheer(c: AudioContext, out: AudioNode, t: number, dur = 4.2) {
  const master = envGain(c, out, t, [[0.35, 0.55], [1.2, 0.5], [dur, 0]]);
  for (const [f, q, rate] of [
    [450, 0.9, 5.5],
    [900, 1.1, 7.3],
    [1600, 1.3, 4.1],
    [2600, 1.6, 8.9],
  ] as const) {
    const band = filter(c, 'bandpass', f, q);
    const g = c.createGain();
    g.gain.value = 0.5;
    const lfo = osc(c, 'sine', rate, t, dur);
    const depth = c.createGain();
    depth.gain.value = 0.25;
    lfo.connect(depth).connect(g.gain);
    noiseSrc(c, t, dur).connect(band).connect(g).connect(master);
  }
  for (let i = 0; i < 46; i++) {
    const tc = t + 0.2 + Math.random() * (dur - 1);
    const hp = filter(c, 'bandpass', 1200 + Math.random() * 1400, 1.4);
    noiseSrc(c, tc, 0.06).connect(hp).connect(envGain(c, out, tc, [[0.003, 0.18 * Math.random() + 0.05], [0.05, 0]]));
  }
}

/** Low thump + noise burst, for reveals. */
function impact(c: AudioContext, out: AudioNode, t: number, level = 0.6) {
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.45);
  o.start(t);
  o.stop(t + 0.6);
  o.connect(envGain(c, out, t, [[0.008, level], [0.55, 0]]));
  noiseSrc(c, t, 0.5).connect(filter(c, 'lowpass', 900)).connect(envGain(c, out, t, [[0.005, level * 0.6], [0.4, 0]]));
  noiseSrc(c, t, 1.4).connect(filter(c, 'highpass', 5000)).connect(envGain(c, out, t, [[0.01, level * 0.18], [1.4, 0]]));
}

/** Rising whoosh that ends in an impact (logo transition). */
function sting(c: AudioContext, out: AudioNode, t: number) {
  const bp = filter(c, 'bandpass', 400, 2);
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(5000, t + 0.55);
  noiseSrc(c, t, 0.6).connect(bp).connect(envGain(c, out, t, [[0.5, 0.35], [0.6, 0]]));
  impact(c, out, t + 0.55, 0.5);
}

function drumroll(c: AudioContext, out: AudioNode, t: number, dur = 2.6) {
  for (let x = 0; x < dur; x += 1 / 24) {
    const tt = t + x;
    const level = 0.05 + 0.2 * (x / dur);
    noiseSrc(c, tt, 0.05).connect(filter(c, 'highpass', 1800)).connect(envGain(c, out, tt, [[0.002, level], [0.045, 0]]));
    osc(c, 'triangle', 190, tt, 0.04).connect(envGain(c, out, tt, [[0.002, level * 0.6], [0.035, 0]]));
  }
  impact(c, out, t + dur, 0.7);
}

/** Small clicks: dice rattling, or a deck being riffled. */
function clicks(c: AudioContext, out: AudioNode, t: number, dur: number, n: number, base: number) {
  for (let i = 0; i < n; i++) {
    const tc = t + (i / n) * dur + Math.random() * (dur / n);
    const f = base * (0.7 + Math.random() * 0.8);
    osc(c, 'square', f, tc, 0.025).connect(filter(c, 'bandpass', f, 4)).connect(envGain(c, out, tc, [[0.002, 0.12 + Math.random() * 0.1], [0.025, 0]]));
  }
}

/** Plays one sound now (or `delayMs` later). Silently does nothing where Web Audio is missing. */
export function playSfx(kind: SfxKind, volume = 0.8, delayMs = 0) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.03 + Math.max(0, delayMs) / 1000;
  const master = c.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  const comp = c.createDynamicsCompressor();
  master.connect(comp).connect(c.destination);
  switch (kind) {
    case 'horn':
      return horn(c, master, t);
    case 'whistle':
      return whistle(c, master, t);
    case 'cheer':
      return cheer(c, master, t);
    case 'drumroll':
      return drumroll(c, master, t);
    case 'sting':
      return sting(c, master, t);
    case 'card':
      // Riffle while the deck shuffles, whoosh and hit when the card flips (2.9 s, like the animation).
      clicks(c, master, t + 0.2, 2.2, 38, 2400);
      return sting(c, master, t + 2.35);
    case 'dice':
      clicks(c, master, t + 0.1, 1.9, 22, 1500);
      return impact(c, master, t + 2.9, 0.55);
  }
}

/** Short whistle pattern for cards (two quick blasts). */
export function playCardWhistle(volume = 0.8) {
  const c = audio();
  if (!c) return;
  const master = c.createGain();
  master.gain.value = volume;
  master.connect(c.destination);
  whistle(c, master, c.currentTime + 0.03, [
    [0, 0.22],
    [0.32, 0.55],
  ]);
}

/** Things that happened in the state: [unique id, epoch ms, what to play]. */
type Cue = [string, number, () => void];

/**
 * Inside OBS only: plays the arena sounds when something happens on air (goal, card, dice, power card…) and the
 * manual ones sent from the panel. Old events (page reloads) are ignored.
 */
export function arenaCues(state: ObsState): Cue[] {
  const snd = state.sound;
  if (!snd.enabled) return [];
  const v = snd.volume;
  const cues: Cue[] = [];
  if (snd.last) {
    const kind = snd.last.kind;
    cues.push([snd.last.id, snd.last.at, () => playSfx(kind, v)]);
  }
  if (!snd.auto) return cues;
  const f = state.flash;
  if (f) {
    if (f.kind === 'goal')
      cues.push([
        f.id,
        f.at,
        () => {
          playSfx('horn', v);
          playSfx('cheer', v, 250);
        },
      ]);
    else if (f.kind === 'timeout') cues.push([f.id, f.at, () => playSfx('horn', v)]);
    else cues.push([f.id, f.at, () => playCardWhistle(v)]);
  }
  const d = state.dice.last;
  if (d) cues.push([d.id, d.at, () => playSfx('dice', v)]);
  const draw = state.cards.draw;
  if (draw) cues.push([draw.id, draw.at, () => playSfx('card', v)]);
  return cues;
}
