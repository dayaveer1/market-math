'use client';
import { useMemo } from 'react';
import QuizRunner from '@/components/QuizRunner';
import type { GameProps, QuestionGenerator } from '@/lib/types';
import { generateArithmetic } from '@/lib/engines/mathTrainer';
import { generateSequence } from '@/lib/engines/sequence';
import { generateFraction } from '@/lib/engines/fractions';
import { generateProbability } from '@/lib/engines/probability';
import { drillGenerator, etfDrills, optionDrills, futuresDrills, predictionDrills } from '@/lib/engines/drills';
import { FERMI_BANK, pointCredit } from '@/lib/engines/fermi';
import { mulberry32, shuffle } from '@/lib/rng';
import { fmtNum } from '@/lib/parse';
import { generateFromMix, type Level } from '@/lib/engines/families';

const MIXED_MATH = { arithmetic: 4, decimals: 2, fractions: 2, percent: 2, largeMult: 1 };
const mathGen: QuestionGenerator = (r, s, i) => {
  const mode = String(s.mode ?? 'integers');
  if (mode === 'integers') return generateArithmetic(r, s);
  return generateFromMix(r, mode === 'mixed' ? MIXED_MATH : { [mode]: 1 }, String(s.level ?? 'easy') as Level, s.format === 'choice' ? 'choice' : 'typed');
};
export const MathTrainer = (p: GameProps) => <QuizRunner {...p} generate={mathGen} fastMs={8000} />;
export const SequenceTrainer = (p: GameProps) => <QuizRunner {...p} generate={generateSequence} />;
export const FractionsTrainer = (p: GameProps) => <QuizRunner {...p} generate={generateFraction} />;
export const ProbabilityTrainer = (p: GameProps) => <QuizRunner {...p} generate={generateProbability} />;
const etf = drillGenerator(etfDrills), opt = drillGenerator(optionDrills), fut = drillGenerator(futuresDrills), pred = drillGenerator(predictionDrills);
export const EtfDrills = (p: GameProps) => <QuizRunner {...p} generate={etf} />;
export const OptionsDrills = (p: GameProps) => <QuizRunner {...p} generate={opt} />;
export const FuturesDrills = (p: GameProps) => <QuizRunner {...p} generate={fut} />;
export const PredictionDrills = (p: GameProps) => <QuizRunner {...p} generate={pred} />;

export function FermiQuestions(p: GameProps) {
  const gen = useMemo<QuestionGenerator>(() => {
    const order = shuffle(mulberry32(p.seed ^ 0x9e3779b9), FERMI_BANK);
    return (_r, _s, i) => {
      const item = order[i % order.length];
      return {
        prompt: item.q, answer: item.answer, display: `${fmtNum(item.answer, 2)}${item.unit ? ' ' + item.unit : ''}`,
        credit: (g) => pointCredit(g, item.answer), explanation: item.note,
      };
    };
  }, [p.seed]);
  return <QuizRunner {...p} generate={gen} scoring="points" />;
}
