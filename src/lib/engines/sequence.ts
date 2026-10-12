/** Sequence Trainer: ORIGINAL pattern families. Each returns visible terms and the next term. */
import { type Rng, randInt, pick } from '../rng';
import type { Question, Settings } from '../types';
import { makeChoices } from './quizUtil';

export type Family = 'arithmetic' | 'geometric' | 'quadratic' | 'fibonacci' | 'interleaved' | 'affine' | 'powers' | 'alternatingOps';
export const FAMILIES_BY_LEVEL: Record<string, Family[]> = {
  easy: ['arithmetic', 'geometric', 'powers'],
  medium: ['arithmetic', 'geometric', 'quadratic', 'fibonacci', 'interleaved'],
  hard: ['quadratic', 'fibonacci', 'interleaved', 'affine', 'alternatingOps', 'powers'],
};

export function buildSequence(rng: Rng, fam: Family, len: number): { terms: number[]; rule: string } {
  const t: number[] = [];
  switch (fam) {
    case 'arithmetic': { const a = randInt(rng, 1, 50), d = randInt(rng, -9, 15) || 4; for (let i = 0; i <= len; i++) t.push(a + i * d); return { terms: t, rule: `add ${d} each time` }; }
    case 'geometric': { const a = randInt(rng, 1, 6), r = pick(rng, [2, 3, -2]); for (let i = 0; i <= len; i++) t.push(a * r ** i); return { terms: t, rule: `multiply by ${r}` }; }
    case 'quadratic': { const a = randInt(rng, 1, 3), b = randInt(rng, -3, 5), c = randInt(rng, 0, 10); for (let i = 1; i <= len + 1; i++) t.push(a * i * i + b * i + c); return { terms: t, rule: `second differences constant at ${2 * a}` }; }
    case 'fibonacci': { let x = randInt(rng, 1, 6), y = randInt(rng, 1, 9); t.push(x, y); while (t.length <= len) { [x, y] = [y, x + y]; t.push(y); } return { terms: t, rule: 'each term is the sum of the previous two' }; }
    case 'interleaved': { const a = randInt(rng, 1, 20), d = randInt(rng, 2, 7), b = randInt(rng, 30, 60), e = -randInt(rng, 1, 5); for (let i = 0; i <= len; i++) t.push(i % 2 === 0 ? a + (i / 2) * d : b + ((i - 1) / 2) * e); return { terms: t, rule: `two interleaved sequences (+${d} and ${e})` }; }
    case 'affine': { const m = pick(rng, [2, 3]), c = randInt(rng, -3, 4) || 1; let x = randInt(rng, 1, 5); for (let i = 0; i <= len; i++) { t.push(x); x = m * x + c; } return { terms: t, rule: `×${m} then ${c >= 0 ? '+' : '−'}${Math.abs(c)}` }; }
    case 'powers': { const p = pick(rng, [2, 3]), off = randInt(rng, -2, 3), s0 = randInt(rng, 1, 4); for (let i = s0; i <= s0 + len; i++) t.push(i ** p + off); return { terms: t, rule: `n^${p} ${off >= 0 ? '+' : '−'} ${Math.abs(off)}` }; }
    case 'alternatingOps': { const a = randInt(rng, 2, 6), k = randInt(rng, 2, 9); let x = a; for (let i = 0; i <= len; i++) { t.push(x); x = i % 2 === 0 ? x * 2 : x + k; } return { terms: t, rule: `alternately ×2 and +${k}` }; }
  }
}

export function generateSequence(rng: Rng, s: Settings): Question {
  const level = String(s.level ?? 'easy');
  const fam = pick(rng, FAMILIES_BY_LEVEL[level] ?? FAMILIES_BY_LEVEL.easy);
  const len = Number(s.length ?? 5);
  const { terms, rule } = buildSequence(rng, fam, len);
  const answer = terms[len];
  return {
    prompt: terms.slice(0, len).join(',  ') + ',  ?',
    answer,
    display: String(answer),
    explanation: `Rule: ${rule}.`,
    choices: s.format === 'choice' ? makeChoices(rng, answer) : undefined,
  };
}
