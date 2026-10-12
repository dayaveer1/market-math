import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GAMES, GAME_BY_ID } from '@/lib/registry';
import { TEST_SPECS } from '@/lib/assessments';
import { dailyPlan } from '@/lib/daily';
import { suggestLevel, streakDays, accuracy } from '@/lib/stats';
import type { SessionRecord } from '@/lib/store';

describe('registry', () => {
  it('has 29 original activities + 4 simulators + Bet Grid + every assessment spec, with unique ids', () => {
    expect(GAMES.length).toBe(29 + 4 + 1 + TEST_SPECS.length);
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length);
  });
  it('every game has a component and complete presets for its settings', () => {
    const index = readFileSync('src/games/index.tsx', 'utf8');
    for (const g of GAMES) {
      if (g.category !== 'assessment' || g.id === 'bet-grid') expect(index.includes(`'${g.id}':`) || index.includes(`${g.id}:`)).toBe(true);
      else expect(index.includes('TEST_SPECS.map')).toBe(true);
      for (const level of ['easy', 'medium', 'hard'] as const)
        for (const s of g.settings) {
          const v = g.presets[level][s.key];
          expect(v === undefined ? `${g.id}.${level}.${s.key} missing` : 'ok').toBe('ok');
          if (s.type === 'number') { expect(v as number).toBeGreaterThanOrEqual(s.min); expect(v as number).toBeLessThanOrEqual(s.max); }
        }
      expect(g.unverified.length).toBeGreaterThan(0);
    }
  });
});
describe('daily plan', () => {
  it('is deterministic per date and covers three categories', () => {
    const d = new Date(2026, 9, 11);
    expect(dailyPlan(d)).toEqual(dailyPlan(d));
    const cats = dailyPlan(d).ids.map((id) => GAME_BY_ID[id].category);
    expect(cats[0]).toBe('market');
    expect(cats[2]).toBe('cognitive');
  });
});
describe('stats', () => {
  const rec = (score: number, correct: number, total: number, daysAgo = 0): SessionRecord => ({ id: String(Math.random()), gameId: 'math', difficulty: 'easy', mode: 'standard', settings: {}, startedAt: Date.now() - daysAgo * 864e5, durationMs: 1000, result: { score, correct, total } });
  it('accuracy and adaptive suggestion', () => {
    const rs = [rec(10, 9, 10), rec(10, 9, 10), rec(10, 10, 10)];
    expect(accuracy(rs)).toBeCloseTo(28 / 30, 10);
    expect(suggestLevel(rs, GAME_BY_ID.math, 'easy')?.level).toBe('medium');
    expect(suggestLevel(rs.slice(0, 2), GAME_BY_ID.math, 'easy')).toBeNull();
    expect(suggestLevel([rec(1, 2, 10), rec(1, 3, 10), rec(1, 1, 10)].map((r) => ({ ...r, difficulty: 'medium' as const })), GAME_BY_ID.math, 'medium')?.level).toBe('easy');
  });
  it('streaks', () => {
    expect(streakDays([rec(1, 1, 1, 0), rec(1, 1, 1, 1), rec(1, 1, 1, 3)])).toBe(2);
    expect(streakDays([])).toBe(0);
  });
});
