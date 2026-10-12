/** Mystery Figure: hidden sequence of symbols, count-only feedback (number of positions exactly right). ORIGINAL design. */
import { type Rng, randInt } from '../rng';

export function allCodes(len: number, nSym: number): number[][] {
  const out: number[][] = [];
  const total = nSym ** len;
  for (let i = 0; i < total; i++) { const c: number[] = []; let x = i; for (let j = 0; j < len; j++) { c.push(x % nSym); x = Math.floor(x / nSym); } out.push(c); }
  return out;
}
export const feedback = (secret: number[], guess: number[]) => secret.reduce((n, s, i) => n + (s === guess[i] ? 1 : 0), 0);
export const randomCode = (rng: Rng, len: number, nSym: number) => Array.from({ length: len }, () => randInt(rng, 0, nSym - 1));

/** Benchmark: a simple consistent-guess strategy (always play the first code consistent with all feedback so far). */
export function consistentSolverAttempts(secret: number[], nSym: number): number {
  let pool = allCodes(secret.length, nSym);
  for (let attempt = 1; attempt <= 50; attempt++) {
    const g = pool[0];
    const f = feedback(secret, g);
    if (f === secret.length) return attempt;
    pool = pool.filter((c) => feedback(c, g) === f);
  }
  return 50;
}
/** How many candidate codes remain consistent with a history of guesses. */
export function remainingCandidates(history: { guess: number[]; score: number }[], len: number, nSym: number): number {
  return allCodes(len, nSym).filter((c) => history.every((h) => feedback(c, h.guess) === h.score)).length;
}
