import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/rng';
import { generateArithmetic } from '@/lib/engines/mathTrainer';
import { buildSequence, generateSequence, type Family } from '@/lib/engines/sequence';
import { generateFraction } from '@/lib/engines/fractions';
import * as P from '@/lib/engines/probability';
import { drillGenerator, etfDrills, optionDrills, futuresDrills, predictionDrills } from '@/lib/engines/drills';
import { choose, makeChoices } from '@/lib/engines/quizUtil';
import { parseAnswer, withinTolerance } from '@/lib/parse';

function evalPrompt(p: string): number {
  const expr = p.replace('=', '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  return Function(`return (${expr})`)();
}

describe('math trainer', () => {
  it('answers match the prompt for every level and op', () => {
    const rng = mulberry32(11);
    for (const level of ['easy', 'medium', 'hard'])
      for (let i = 0; i < 300; i++) {
        const q = generateArithmetic(rng, { level, add: true, sub: true, mul: true, div: true });
        expect(evalPrompt(q.prompt)).toBe(q.answer);
        expect(Number.isInteger(q.answer)).toBe(true);
      }
  });
  it('choice mode includes the answer once', () => {
    const q = generateArithmetic(mulberry32(1), { level: 'easy', format: 'choice' });
    expect(q.choices!.filter((c) => c === q.answer).length).toBe(1);
    expect(new Set(q.choices).size).toBe(4);
  });
});
describe('sequences', () => {
  const fams: Family[] = ['arithmetic', 'geometric', 'quadratic', 'fibonacci', 'interleaved', 'affine', 'powers', 'alternatingOps'];
  it('fibonacci rule holds', () => {
    const { terms } = buildSequence(mulberry32(2), 'fibonacci', 6);
    for (let i = 2; i < terms.length; i++) expect(terms[i]).toBe(terms[i - 1] + terms[i - 2]);
  });
  it('quadratic has constant second differences', () => {
    const { terms } = buildSequence(mulberry32(5), 'quadratic', 6);
    const d2 = terms.slice(2).map((t, i) => t - 2 * terms[i + 1] + terms[i]);
    expect(new Set(d2).size).toBe(1);
  });
  it('every family produces len+1 terms and a matching answer', () => {
    const rng = mulberry32(9);
    for (const f of fams) expect(buildSequence(rng, f, 5).terms.length).toBe(6);
    const q = generateSequence(rng, { level: 'hard', length: 5 });
    expect(q.prompt.split(',').length).toBe(6);
  });
});
describe('fractions', () => {
  it('decimal answers', () => {
    const rng = mulberry32(4);
    for (let i = 0; i < 200; i++) {
      const q = generateFraction(rng, { level: 'hard' });
      const [n, d] = q.prompt.split(' ')[0].split('/').map(Number);
      expect(q.answer).toBeCloseTo(n / d, 12);
      expect(withinTolerance(parseFloat(q.answer.toFixed(3)), q.answer, q.tolerance)).toBe(true);
    }
  });
});
describe('probability', () => {
  it('closed forms', () => {
    expect(P.diceSumWays(7)).toBe(6);
    expect(P.diceSumWays(2)).toBe(1);
    expect(P.rerollEV(6)).toBeCloseTo(4.25, 10);
    expect(P.expectedMax2(6)).toBeCloseTo(161 / 36, 10);
    expect(P.bayes(0.01, 0.99, 0.05)).toBeCloseTo(0.0099 / (0.0099 + 0.0495), 10);
    expect(choose(5, 2)).toBe(10);
  });
  it('monte carlo agrees with reroll EV', () => {
    const rng = mulberry32(99);
    let tot = 0;
    const N = 200_000;
    for (let i = 0; i < N; i++) { const a = 1 + Math.floor(rng() * 6); tot += a <= 3 ? 1 + Math.floor(rng() * 6) : a; }
    expect(tot / N).toBeCloseTo(4.25, 1);
  });
  it('generated questions have finite answers', () => {
    const rng = mulberry32(8);
    for (let i = 0; i < 300; i++) {
      const q = P.generateProbability(rng, { level: 'hard' });
      expect(Number.isFinite(q.answer)).toBe(true);
    }
  });
});
describe('trading drills', () => {
  it('every bank generates finite answers accepted by their own display', () => {
    const rng = mulberry32(21);
    for (const bank of [etfDrills, optionDrills, futuresDrills, predictionDrills]) {
      const gen = drillGenerator(bank);
      for (let i = 0; i < 200; i++) {
        const q = gen(rng, {});
        expect(Number.isFinite(q.answer)).toBe(true);
        const typed = parseAnswer(q.display.replace('%', ''));
        expect(typed).not.toBeNull();
        expect(withinTolerance(typed!, q.answer, q.tolerance ?? { abs: 1e-6 })).toBe(true);
      }
    }
  });
});
describe('choices', () => {
  it('distinct and contain answer', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const c = makeChoices(rng, 0.375, 'decimal');
      expect(new Set(c).size).toBe(4);
      expect(c).toContain(0.375);
    }
  });
});
