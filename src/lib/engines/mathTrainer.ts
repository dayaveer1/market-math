/** Math Trainer: ORIGINAL generator for + − × ÷ drills. Ranges per level are original choices. */
import { type Rng, randInt, pick } from '../rng';
import type { Question, Settings } from '../types';
import { makeChoices } from './quizUtil';

type Op = 'add' | 'sub' | 'mul' | 'div';
const RANGES: Record<string, Record<Op, [[number, number], [number, number]]>> = {
  easy: { add: [[10, 99], [10, 99]], sub: [[20, 99], [10, 99]], mul: [[2, 12], [2, 12]], div: [[2, 12], [2, 12]] },
  medium: { add: [[100, 999], [10, 999]], sub: [[100, 999], [10, 999]], mul: [[11, 99], [3, 19]], div: [[3, 19], [11, 60]] },
  hard: { add: [[1000, 9999], [100, 9999]], sub: [[1000, 9999], [100, 9999]], mul: [[12, 99], [12, 99]], div: [[11, 40], [12, 99]] },
};

export function opsFromSettings(s: Settings): Op[] {
  const ops = (['add', 'sub', 'mul', 'div'] as Op[]).filter((o) => s[o] !== false);
  return ops.length ? ops : ['add'];
}

export function generateArithmetic(rng: Rng, s: Settings): Question {
  const level = String(s.level ?? 'easy');
  const op = pick(rng, opsFromSettings(s));
  const [[a0, a1], [b0, b1]] = (RANGES[level] ?? RANGES.easy)[op];
  let a = randInt(rng, a0, a1);
  let b = randInt(rng, b0, b1);
  let prompt: string;
  let answer: number;
  switch (op) {
    case 'add': prompt = `${a} + ${b}`; answer = a + b; break;
    case 'sub': if (b > a && s.allowNegative !== true) [a, b] = [b, a]; prompt = `${a} − ${b}`; answer = a - b; break;
    case 'mul': prompt = `${a} × ${b}`; answer = a * b; break;
    default: { const q = b; const prod = a * q; prompt = `${prod} ÷ ${a}`; answer = q; }
  }
  return {
    prompt: `${prompt} =`,
    answer,
    display: String(answer),
    choices: s.format === 'choice' ? makeChoices(rng, answer) : undefined,
  };
}
