'use client';
import { useCallback } from 'react';
import QuizRunner from '@/components/QuizRunner';
import type { GameProps, QuestionGenerator } from '@/lib/types';
import { TEST_BY_ID } from '@/lib/assessments';
import { generateFromMix, type Level } from '@/lib/engines/families';

/** Timed online-assessment practice test driven by a TestSpec's topic mix. */
export default function TestGame(p: GameProps & { specId: string }) {
  const spec = TEST_BY_ID[p.specId];
  const gen = useCallback<QuestionGenerator>((r, s) => generateFromMix(r, spec.mix, String(s.level ?? 'hard') as Level, String(s.format ?? spec.format) as 'typed' | 'choice'), [spec]);
  return <QuizRunner {...p} generate={gen} fastMs={(spec.minutes * 60 * 1000) / spec.questions} />;
}
