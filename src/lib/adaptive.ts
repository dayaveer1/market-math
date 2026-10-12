/** In-session adaptive difficulty rules (ORIGINAL). Pure functions so they are unit-testable. */
export type Lvl = 'easy' | 'medium' | 'hard';
const ORDER: Lvl[] = ['easy', 'medium', 'hard'];
export interface AdaptState { level: Lvl; streak: number; misses: number; changes: number }
export const initAdapt = (level: Lvl): AdaptState => ({ level, streak: 0, misses: 0, changes: 0 });

/**
 * Step up after 3 consecutive correct answers each faster than `fastMs`; step down after 2 consecutive misses.
 * A correct but slow answer clears the miss count without building the streak.
 */
export function adaptStep(s: AdaptState, correct: boolean, ms: number, fastMs: number): AdaptState {
  const i = ORDER.indexOf(s.level);
  if (correct) {
    if (ms > fastMs) return { ...s, misses: 0 };
    const streak = s.streak + 1;
    if (streak >= 3 && i < 2) return { level: ORDER[i + 1], streak: 0, misses: 0, changes: s.changes + 1 };
    return { ...s, streak, misses: 0 };
  }
  const misses = s.misses + 1;
  if (misses >= 2 && i > 0) return { level: ORDER[i - 1], streak: 0, misses: 0, changes: s.changes + 1 };
  return { ...s, streak: 0, misses };
}
/** Response-window staircase for reaction tasks: −5% after a correct response, +10% after an error, clamped. */
export const adaptWindow = (w: number, correct: boolean, min: number, max: number) => Math.round(correct ? Math.max(min, w * 0.95) : Math.min(max, w * 1.1));
