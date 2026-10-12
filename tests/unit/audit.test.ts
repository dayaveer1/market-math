/**
 * Cross-cutting audit of all 51 activities: grading paths, difficulty presets, battery fitting and generator robustness.
 * Mirrors exactly how QuizRunner grades (withinTolerance / option index / credit).
 */
import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/rng';
import { GAMES } from '@/lib/registry';
import { FAMILIES, generateFromMix } from '@/lib/engines/families';
import { generateArithmetic } from '@/lib/engines/mathTrainer';
import { generateSequence } from '@/lib/engines/sequence';
import { generateFraction } from '@/lib/engines/fractions';
import { generateProbability } from '@/lib/engines/probability';
import { drillGenerator, etfDrills, optionDrills, futuresDrills, predictionDrills } from '@/lib/engines/drills';
import { generateCubeQuestion, isTrueView } from '@/lib/engines/cube';
import { generateGridRound } from '@/lib/engines/betGrid';
import { normalize, sectionSettings } from '@/lib/battery';
import { parseAnswer, withinTolerance } from '@/lib/parse';
import type { Question, Settings } from '@/lib/types';

/** Same rule as QuizRunner.grade for a numeric value. */
const accepts = (q: Question, v: number) => (q.credit ? q.credit(v) >= 0.5 : withinTolerance(v, q.answer, q.tolerance));

const GENERATORS: [string, (r: () => number, s: Settings) => Question][] = [
  ['math', generateArithmetic], ['sequence', generateSequence], ['fractions', generateFraction], ['fractions%', (r, s) => generateFraction(r, { ...s, output: 'percent' })],
  ['probability', generateProbability], ['etf-drills', drillGenerator(etfDrills)], ['options-drills', drillGenerator(optionDrills)],
  ['futures-drills', drillGenerator(futuresDrills)], ['prediction-drills', drillGenerator(predictionDrills)],
  ...Object.keys(FAMILIES).map((f): [string, (r: () => number, s: Settings) => Question] => [`family:${f}`, (r, s) => generateFromMix(r, { [f]: 1 }, s.level as 'easy', s.format as 'typed')]),
];

describe('audit: grading', () => {
  for (const [name, gen] of GENERATORS) {
    it(`${name}: multiple choice has exactly one accepted option; typed display is accepted`, () => {
      const r = mulberry32(1234);
      for (const level of ['easy', 'medium', 'hard']) for (let k = 0; k < 150; k++) {
        const qc = gen(r, { level, format: 'choice', length: 5 });
        if (qc.options) {
          expect(qc.answer).toBeGreaterThanOrEqual(0);
          expect(qc.answer).toBeLessThan(qc.options.length);
        } else if (qc.choices) {
          const ok = qc.choices.filter((c) => accepts(qc, c));
          if (ok.length !== 1) throw new Error(`${name}: ${ok.length} accepted choices for "${qc.prompt}" answer ${qc.answer} choices ${qc.choices.join(', ')}`);
        }
        const qt = gen(r, { level, format: 'typed', length: 5 });
        if (!qt.options) {
          const typed = parseAnswer(qt.unit === '%' ? qt.display.replace(/%$/, '') : qt.display.split(' ')[0].replace(/,/g, ''));
          if (typed === null || !accepts(qt, typed)) throw new Error(`${name}: display "${qt.display}" not accepted for "${qt.prompt}" (answer ${qt.answer})`);
        }
      }
    });
  }
});

describe('audit: every activity', () => {
  for (const g of GAMES) {
    it(`${g.id}: documented, difficulty levels differ, battery fitting stays in bounds`, () => {
      expect(g.howTo.length).toBeGreaterThan(0);
      expect(g.controls.length).toBeGreaterThan(0);
      expect(g.scoreLabel.length).toBeGreaterThan(0);
      const { easy, medium, hard } = g.presets;
      expect(JSON.stringify(easy) !== JSON.stringify(medium) || JSON.stringify(medium) !== JSON.stringify(hard)).toBe(true);
      expect(JSON.stringify(easy)).not.toBe(JSON.stringify(hard));
      for (const level of ['easy', 'medium', 'hard'] as const) for (const secs of [60, 300, 1800]) {
        const s = sectionSettings(g, secs, level);
        for (const d of g.settings) if (d.type === 'number') {
          const v = Number(s[d.key]);
          if (!(v >= d.min && v <= d.max)) throw new Error(`${g.id} ${level} ${secs}s: ${d.key}=${v} outside [${d.min}, ${d.max}]`);
        }
        for (const res of [{ score: 0 }, { score: 5, correct: 5, total: 10 }, { score: -100 }, { score: 1e6, correct: 3, total: 3 }]) {
          const n = normalize(g, res, s);
          expect(n).toBeGreaterThanOrEqual(0);
          expect(n).toBeLessThanOrEqual(100);
        }
      }
    });
  }
});

describe('audit: generator robustness at setting extremes', () => {
  it('cube folding produces the requested number of options (3–6), exactly one true', () => {
    const r = mulberry32(77);
    for (const orientation of [true, false]) for (let n = 3; n <= 6; n++) for (let k = 0; k < 40; k++) {
      const q = generateCubeQuestion(r, n, orientation);
      expect(q.views.length).toBe(n);
      if (orientation) expect(q.views.filter((v) => isTrueView(q.net, q.symbols, v)).length).toBe(1);
    }
  });
  it('bet grid works for every revealed/bets combination', () => {
    const r = mulberry32(5);
    for (let rev = 3; rev <= 8; rev++) for (let b = 2; b <= 6; b++) {
      const g = generateGridRound(r, rev, b);
      expect(g.bets.length).toBe(b);
      expect(g.probs.every((p) => p >= 0 && p <= 1)).toBe(true);
    }
  });
});
