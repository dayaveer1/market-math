/** Small cognitive-task engines. All mechanics are ORIGINAL designs built from one-line public descriptions. */
import { type Rng, randInt, pick, shuffle, sample } from '../rng';

/* ---------- Task Switch ---------- */
export type SwitchRule = 'parity' | 'magnitude';
export interface SwitchTrial { digit: number; rule: SwitchRule; key: 'F' | 'J'; isSwitch: boolean }
export function switchKey(digit: number, rule: SwitchRule): 'F' | 'J' {
  if (rule === 'parity') return digit % 2 === 1 ? 'F' : 'J';
  return digit < 5 ? 'F' : 'J';
}
export function nextSwitchTrial(rng: Rng, prev: SwitchTrial | null, switchProb: number): SwitchTrial {
  const digit = pick(rng, [1, 2, 3, 4, 6, 7, 8, 9]);
  const rule: SwitchRule = prev === null ? pick(rng, ['parity', 'magnitude'] as const) : rng() < switchProb ? (prev.rule === 'parity' ? 'magnitude' : 'parity') : prev.rule;
  return { digit, rule, key: switchKey(digit, rule), isSwitch: prev !== null && prev.rule !== rule };
}

/* ---------- Response Conflict (Flanker / Simon) ---------- */
export interface ConflictTrial { task: 'flanker' | 'simon'; display: string; color?: 'red' | 'blue'; side?: 'left' | 'right'; key: 'F' | 'J'; congruent: boolean }
export function nextConflictTrial(rng: Rng, task: 'flanker' | 'simon' | 'mixed', congruentProb = 0.5): ConflictTrial {
  const t = task === 'mixed' ? pick(rng, ['flanker', 'simon'] as const) : task;
  const congruent = rng() < congruentProb;
  if (t === 'flanker') {
    const target = pick(rng, ['<', '>'] as const);
    const flank = congruent ? target : target === '<' ? '>' : '<';
    return { task: t, display: `${flank}${flank}${target}${flank}${flank}`, key: target === '<' ? 'F' : 'J', congruent };
  }
  const color = pick(rng, ['red', 'blue'] as const);
  const key = color === 'red' ? 'F' : 'J';
  const side = congruent ? (key === 'F' ? 'left' : 'right') : key === 'F' ? 'right' : 'left';
  return { task: t, display: '■', color, side, key, congruent };
}

/* ---------- Pincode ---------- */
export type PinMode = 'forward' | 'reverse' | 'sorted';
export const genPin = (rng: Rng, len: number) => Array.from({ length: len }, () => randInt(rng, 0, 9));
export function expectedPin(digits: number[], mode: PinMode): string {
  if (mode === 'reverse') return digits.slice().reverse().join('');
  if (mode === 'sorted') return digits.slice().sort((a, b) => a - b).join('');
  return digits.join('');
}
/** Staircase: +1 after a correct answer, −1 after two consecutive errors. */
export function nextPinLength(len: number, correct: boolean, errorStreak: number, min = 3, max = 14): { len: number; errorStreak: number } {
  if (correct) return { len: Math.min(max, len + 1), errorStreak: 0 };
  if (errorStreak + 1 >= 2) return { len: Math.max(min, len - 1), errorStreak: 0 };
  return { len, errorStreak: errorStreak + 1 };
}

/* ---------- Code Match ---------- */
export const LOOKALIKES: Record<string, string[]> = {
  O: ['0', 'Q', 'D'], '0': ['O', 'D'], Q: ['O', '0'], D: ['0', 'O'], I: ['1', 'L'], '1': ['I', '7'], L: ['1', 'I'],
  S: ['5'], '5': ['S'], B: ['8'], '8': ['B', '3'], Z: ['2'], '2': ['Z'], G: ['6', 'C'], '6': ['G', 'b'.toUpperCase()],
  E: ['F'], F: ['E'], M: ['N'], N: ['M'], U: ['V'], V: ['U'], '7': ['1'], '3': ['8'], C: ['G'],
};
const POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'.split('');
export function genCode(rng: Rng, len: number): string {
  const chars = Array.from({ length: len }, () => pick(rng, POOL));
  const mid = Math.floor(len / 2);
  return chars.slice(0, mid).join('') + '-' + chars.slice(mid).join('');
}
export function mutateCode(rng: Rng, code: string): string {
  const chars = code.split('');
  const idx = chars.map((c, i) => (c === '-' ? -1 : i)).filter((i) => i >= 0);
  if (rng() < 0.5) {
    const i = pick(rng, idx.filter((j) => idx.includes(j + 1)));
    [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
  } else {
    const swappable = idx.filter((i) => LOOKALIKES[chars[i]]);
    const i = swappable.length ? pick(rng, swappable) : pick(rng, idx);
    chars[i] = LOOKALIKES[chars[i]] ? pick(rng, LOOKALIKES[chars[i]]) : pick(rng, POOL.filter((c) => c !== chars[i]));
  }
  return chars.join('');
}
export function codeRound(rng: Rng, len: number, nOptions: number): { target: string; options: string[] } {
  const target = genCode(rng, len);
  const opts = new Set<string>([target]);
  let guard = 0;
  while (opts.size < nOptions && guard++ < 200) {
    const m = mutateCode(rng, target);
    if (m !== target) opts.add(m);
  }
  return { target, options: shuffle(rng, Array.from(opts)) };
}

/* ---------- Grid Recall ---------- */
export const genPattern = (rng: Rng, size: number, k: number) => sample(rng, Array.from({ length: size * size }, (_, i) => i), k).sort((a, b) => a - b);
export function gradePattern(target: number[], chosen: number[]) {
  const t = new Set(target);
  const hits = chosen.filter((c) => t.has(c)).length;
  return { hits, falseAlarms: chosen.length - hits, perfect: hits === target.length && chosen.length === target.length };
}

/* ---------- Pump (balloon risk task) ---------- */
/** Explosion point uniform on 1..maxPumps: the balloon pops on that pump. */
export const explosionPoint = (rng: Rng, maxPumps: number) => randInt(rng, 1, maxPumps);
/** Expected value of planning to pump n times (pop point uniform 1..M): n·v·P(pop > n) = n·v·(M − n)/M. */
export const pumpEV = (n: number, maxPumps: number, value: number) => n * value * Math.max(0, maxPumps - n) / maxPumps;
export function optimalPumps(maxPumps: number): number {
  let best = 0, bestEV = -1;
  for (let n = 0; n <= maxPumps; n++) { const e = pumpEV(n, maxPumps, 1); if (e > bestEV) { bestEV = e; best = n; } }
  return best;
}

/* ---------- Hold Fire (go / no-go with switching cue) ---------- */
export type Shape = 'circle' | 'square' | 'triangle';
export type Hue = 'blue' | 'orange' | 'green';
export interface HoldCue { kind: 'color' | 'shape'; value: Hue | Shape }
export interface HoldStim { shape: Shape; hue: Hue }
export const SHAPES: Shape[] = ['circle', 'square', 'triangle'];
export const HUES: Hue[] = ['blue', 'orange', 'green'];
export const isGo = (cue: HoldCue, s: HoldStim) => (cue.kind === 'color' ? s.hue === cue.value : s.shape === cue.value);
export const randomCue = (rng: Rng): HoldCue => (rng() < 0.5 ? { kind: 'color', value: pick(rng, HUES) } : { kind: 'shape', value: pick(rng, SHAPES) });
export function nextStim(rng: Rng, cue: HoldCue, goProb: number): HoldStim {
  for (let i = 0; i < 50; i++) {
    const s = { shape: pick(rng, SHAPES), hue: pick(rng, HUES) };
    if (isGo(cue, s) === rng() < goProb || i > 40) return s;
  }
  return { shape: 'circle', hue: 'blue' };
}

/* ---------- Intercept ---------- */
/** Time (s) at which a projectile fired upward at t=fireAt from y=H meets a ball falling from y0 at vb; null if never. */
export function meetTime(y0: number, vb: number, H: number, vp: number, fireAt: number): number | null {
  // ball y(t) = y0 + vb t ; projectile y(t) = H − vp (t − fireAt), t ≥ fireAt
  const t = (H + vp * fireAt - y0) / (vb + vp);
  return t >= fireAt ? t : null;
}

/* ---------- Sweet Spot ---------- */
export const normAngle = (a: number) => ((a % 360) + 360) % 360;
/** True when angle lies inside the arc starting at `start` spanning `width` degrees clockwise. */
export function inArc(angle: number, start: number, width: number): boolean {
  return normAngle(angle - start) <= width;
}
