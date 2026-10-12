/** Fractions to Decimals: ORIGINAL generator. Answers accepted to 3 decimal places (±0.001) or as a percentage when set. */
import { type Rng, randInt, pick } from '../rng';
import type { Question, Settings } from '../types';
import { makeChoices } from './quizUtil';
import { withinTolerance } from '../parse';

export const DENOMS: Record<string, number[]> = {
  easy: [2, 3, 4, 5, 8, 10, 20, 25],
  medium: [3, 6, 7, 8, 9, 11, 12, 16, 40],
  hard: [7, 9, 11, 13, 14, 15, 17, 18, 19, 21, 24, 32],
};
export function generateFraction(rng: Rng, s: Settings): Question {
  const level = String(s.level ?? 'easy');
  const d = pick(rng, DENOMS[level] ?? DENOMS.easy);
  let n = randInt(rng, 1, d - 1);
  if (s.improper === true) n = randInt(rng, 1, d * 3);
  const val = n / d;
  const pct = s.output === 'percent';
  const answer = pct ? val * 100 : val;
  return {
    prompt: `${n}/${d} = ${pct ? '?%' : '?'}`,
    answer,
    display: pct ? `${answer.toFixed(2)}%` : answer.toFixed(4),
    tolerance: { abs: pct ? 0.1 : 0.001 },
    unit: pct ? '%' : undefined,
    choices: s.format === 'choice' ? makeChoices(rng, answer, 'decimal', 4, (c) => withinTolerance(c, answer, { abs: pct ? 0.1 : 0.001 })) : undefined,
  };
}
