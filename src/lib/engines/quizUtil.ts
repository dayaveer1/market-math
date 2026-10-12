import { type Rng, randInt, shuffle } from '../rng';

/**
 * Plausible multiple-choice distractors around a correct numeric answer.
 * Guarantees: the exact answer is included once; every distractor is rejected by `accepted` (the same rule the
 * grader uses), and all options display differently at 4 significant decimals.
 */
export function makeChoices(rng: Rng, answer: number, kind: 'int' | 'decimal' = 'int', n = 4, accepted: (c: number) => boolean = (c) => c === answer): number[] {
  const isInt = kind === 'int' && Number.isInteger(answer);
  const show = (x: number) => (Math.round(x * 1e4) / 1e4).toString();
  const out: number[] = [answer];
  const seen = new Set([show(answer)]);
  const add = (c: number) => {
    if (out.length >= n || !Number.isFinite(c)) return;
    const v = isInt ? Math.round(c) : Math.round(c * 1e4) / 1e4;
    if (accepted(v) || seen.has(show(v))) return;
    if (answer > 0 && v <= 0 && !isInt) return; // keep positive answers' distractors positive
    seen.add(show(v)); out.push(v);
  };
  const mag = Math.max(Math.abs(answer), isInt ? 1 : 0.01);
  const near = isInt
    ? [answer + 10, answer - 10, answer + 1, answer - 1, answer + 2, answer - 2, Math.round(answer * 1.1), Math.round(answer * 0.9), answer + 100, answer - 100]
    : [answer * 1.25, answer * 0.8, answer * 1.5, answer * 0.6, answer + 0.1 * mag, answer - 0.1 * mag, answer * 2, answer / 2];
  for (const c of shuffle(rng, near)) add(c);
  // Widen until enough clearly-wrong options exist.
  for (let k = 1; out.length < n && k < 200; k++) {
    const step = isInt ? randInt(rng, 3, 30) * k : mag * 0.2 * k;
    add(answer + step * (rng() < 0.5 ? -1 : 1));
  }
  return shuffle(rng, out);
}
export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}
