/** Probability Trainer: ORIGINAL problem families with exact answers. Answers as decimals (±0.005) or fractions. */
import { type Rng, randInt, pick } from '../rng';
import type { Question, Settings } from '../types';
import { choose, makeChoices } from './quizUtil';
import { withinTolerance } from '../parse';

export const diceSumWays = (s: number) => (s < 2 || s > 12 ? 0 : 6 - Math.abs(7 - s));
/** Expected value of an n-sided die where you may reroll once (optimal: reroll when below the mean of a fresh roll). */
export function rerollEV(n: number): number {
  const fresh = (n + 1) / 2;
  let tot = 0;
  for (let f = 1; f <= n; f++) tot += Math.max(f, fresh);
  return tot / n;
}
/** E[max of two fair n-sided dice] */
export function expectedMax2(n: number): number {
  let tot = 0;
  for (let a = 1; a <= n; a++) for (let b = 1; b <= n; b++) tot += Math.max(a, b);
  return tot / (n * n);
}
export const bayes = (prior: number, sens: number, fpr: number) => (prior * sens) / (prior * sens + (1 - prior) * fpr);

type Gen = (r: Rng) => Omit<Question, 'display'> & { display?: string };
const PROB_TOL = { abs: 0.005 };
const fams: Record<string, Gen> = {
  diceSum: (r) => { const s = randInt(r, 2, 12); return { prompt: `Two fair dice are rolled. What is the probability their sum is ${s}?`, answer: diceSumWays(s) / 36, tolerance: PROB_TOL, explanation: `${diceSumWays(s)} of 36 outcomes.` }; },
  atLeastOneSix: (r) => { const n = randInt(r, 2, 6); return { prompt: `What is the probability of at least one six in ${n} rolls of a fair die?`, answer: 1 - (5 / 6) ** n, tolerance: PROB_TOL, explanation: `1 − (5/6)^${n}.` }; },
  kHeads: (r) => { const n = randInt(r, 3, 8), k = randInt(r, 0, n); return { prompt: `A fair coin is flipped ${n} times. What is the probability of exactly ${k} heads?`, answer: choose(n, k) / 2 ** n, tolerance: PROB_TOL, explanation: `C(${n},${k}) / 2^${n} = ${choose(n, k)}/${2 ** n}.` }; },
  twoSameSuit: (r) => { const kind = pick(r, ['hearts', 'aces'] as const); const ans = kind === 'hearts' ? (13 / 52) * (12 / 51) : (4 / 52) * (3 / 51); return { prompt: `Two cards are drawn without replacement. What is the probability both are ${kind}?`, answer: ans, tolerance: { abs: 0.0005 }, explanation: kind === 'hearts' ? '13/52 × 12/51' : '4/52 × 3/51' }; },
  bayesTest: (r) => { const prior = pick(r, [0.01, 0.02, 0.05, 0.1]); const sens = pick(r, [0.9, 0.95, 0.99]); const fpr = pick(r, [0.05, 0.1, 0.02]); return { prompt: `A condition affects ${prior * 100}% of people. A test detects it ${sens * 100}% of the time and gives a false positive ${fpr * 100}% of the time. Given a positive test, what is the probability of having the condition?`, answer: bayes(prior, sens, fpr), tolerance: PROB_TOL, explanation: `${prior}×${sens} / (${prior}×${sens} + ${1 - prior}×${fpr}).` }; },
  waitTime: (r) => { const m = randInt(r, 1, 3); return { prompt: `You roll a fair die until you see a number in a fixed set of ${m} faces. What is the expected number of rolls?`, answer: 6 / m, tolerance: { abs: 0.01 }, explanation: `Geometric with p = ${m}/6, mean 6/${m}.` }; },
  reroll: (r) => { const n = pick(r, [4, 6, 8, 10, 12, 20]); return { prompt: `You roll a fair ${n}-sided die and may reroll once, keeping the second roll. With optimal play, what is your expected payout (equal to the final face)?`, answer: rerollEV(n), tolerance: { abs: 0.01 }, explanation: `Reroll when the first roll is below ${(n + 1) / 2}.` }; },
  max2: (r) => { const n = pick(r, [4, 6, 8]); return { prompt: `Two fair ${n}-sided dice are rolled. What is the expected value of the larger one?`, answer: expectedMax2(n), tolerance: { abs: 0.01 }, explanation: 'Σ k·P(max = k), with P(max = k) = (2k − 1)/n².' }; },
  noRepeat: (r) => { const k = randInt(r, 2, 5); let p = 1; for (let i = 0; i < k; i++) p *= (6 - i) / 6; return { prompt: `${k} fair dice are rolled. What is the probability they all show different numbers?`, answer: p, tolerance: PROB_TOL, explanation: `6×5×…/6^${k}.` }; },
};
export const PROB_FAMILIES = Object.keys(fams);
export function generateProbability(rng: Rng, s: Settings): Question {
  const allowed = String(s.level ?? 'easy') === 'easy' ? ['diceSum', 'atLeastOneSix', 'kHeads', 'waitTime', 'noRepeat'] : PROB_FAMILIES;
  const q = fams[pick(rng, allowed)](rng);
  const display = Number.isInteger(q.answer) ? String(q.answer) : q.answer.toFixed(4);
  return { ...q, display, choices: s.format === 'choice' ? makeChoices(rng, q.answer, 'decimal', 4, (c) => withinTolerance(c, q.answer, q.tolerance)) : undefined };
}
