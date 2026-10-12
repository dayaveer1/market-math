import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/rng';
import * as M from '@/lib/engines/mmSim';
import * as BG from '@/lib/engines/betGrid';
import * as F from '@/lib/engines/families';
import { adaptStep, adaptWindow, initAdapt } from '@/lib/adaptive';
import { BATTERY_PRESETS, normalize, overallScore, planSections, sectionSettings, band } from '@/lib/battery';
import { TEST_SPECS } from '@/lib/assessments';
import { GAME_BY_ID } from '@/lib/registry';
import { parseAnswer, withinTolerance } from '@/lib/parse';

describe('Black–Scholes and helpers', () => {
  it('matches textbook values', () => {
    expect(M.bsCall(100, 100, 1, 0.2)).toBeCloseTo(7.9656, 3);
    expect(M.bsDelta(100, 100, 1, 0.2)).toBeCloseTo(0.5398, 3);
    expect(M.normCdf(0)).toBeCloseTo(0.5, 6);
    expect(M.normCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(M.bsCall(120, 100, 0, 0.2)).toBe(20);
  });
  it('poisson sample mean ≈ λ', () => {
    const r = mulberry32(5); let s = 0; const N = 20000;
    for (let i = 0; i < N; i++) s += M.poisson(r, 1.7);
    expect(s / N).toBeCloseTo(1.7, 1);
  });
});

const P: M.SimParams = { ticks: 200, traders: 2, informedPct: 30, maxPos: 5, lot: 1, hedgeCost: 0.01, vol: 0.05, newsPct: 5 };
describe('market-making simulator', () => {
  for (const id of Object.keys(M.INSTRUMENTS)) {
    it(`${id}: accounting identity, position limit and informed-trader behaviour`, () => {
      const inst = M.INSTRUMENTS[id];
      const rng = mulberry32(42);
      let st = M.initSim(rng, inst, { ...P, vol: id === 'option' ? 0.3 : id === 'futures' ? 1 : 0.05 });
      for (let t = 0; t < P.ticks; t++) {
        const f = inst.fair(st.inst);
        const q = { bid: f - 0.5 * inst.spreadScale - (t % 3) * inst.priceTick, ask: f + 0.5 * inst.spreadScale + (t % 2) * inst.priceTick };
        const before = st.fills.length;
        const prevCash = st.cash, prevPos = st.pos;
        st = M.simTick(rng, inst, st, t % 7 === 0 ? null : q, P);
        expect(Math.abs(st.pos)).toBeLessThanOrEqual(P.maxPos);
        // cash moves exactly by fills
        const nf = st.fills.slice(before);
        const cashDelta = nf.reduce((a, x) => a + (x.side === 'sell' ? x.price : -x.price) * x.qty, 0);
        const posDelta = nf.reduce((a, x) => a + (x.side === 'buy' ? x.qty : -x.qty), 0);
        expect(st.cash - prevCash).toBeCloseTo(cashDelta, 9);
        expect(st.pos - prevPos).toBe(posDelta);
        if (t % 7 === 0) expect(nf.length).toBe(0);
        // informed traders never trade at a loss to their information (so your markout vs them is ≤ 0 for value-based instruments)
        if (id !== 'prediction') for (const x of nf.filter((y) => y.informed)) expect(x.markout!).toBeLessThanOrEqual(1e-9);
        if (id !== 'prediction' && t % 10 === 0) { st = M.hedgeAll(inst, st, P); expect(Math.abs(M.netDelta(inst, st))).toBeLessThanOrEqual(0.5 + 1e-9); }
      }
      const s = M.summary(inst, st);
      expect(Number.isFinite(s.pnl)).toBe(true);
      expect(st.pnlPath.length).toBe(P.ticks + 1);
    });
  }
  it('prediction fair value is the exact Bayesian posterior and stays in (0,100)', () => {
    const inst = M.PREDICTION_INST, rng = mulberry32(9);
    let st = M.initSim(rng, inst, { ...P, newsPct: 100 });
    for (let t = 0; t < 30; t++) { st = M.simTick(rng, inst, st, null, { ...P, newsPct: 100 }); const f = inst.fair(st.inst); expect(f).toBeGreaterThan(0); expect(f).toBeLessThan(100); }
    expect([0, 100]).toContain(inst.settle(st.inst));
  });
  it('futures fair value and hedge ratio follow cost of carry', () => {
    const s: M.InstState = { t: 0, ticks: 10, arr: {}, news: null, d: { S: 4000, r: 0.05, days: 73, D: 10 } };
    expect(M.FUTURES_INST.fair(s)).toBeCloseTo(4000 * (1 + 0.05 * 0.2) - 10, 9);
    expect(M.FUTURES_INST.hedgeRatio(s)).toBeCloseTo(1.01, 9);
  });
});

describe('bet grid', () => {
  it('winning row needs a strict maximum', () => {
    expect(BG.winningRow([6, 6, 6, 1, 1, 1, 2, 2, 2])).toBe(0);
    expect(BG.winningRow([3, 3, 3, 3, 3, 3, 1, 1, 1])).toBeNull();
  });
  it('enumerated probabilities agree with Monte Carlo and fully revealed grids are 0/1', () => {
    const rng = mulberry32(3);
    const g = BG.generateGridRound(rng, 5, 4);
    const kinds = g.bets.map((b) => b.kind);
    let hits = kinds.map(() => 0); const N = 40000;
    for (let n = 0; n < N; n++) {
      const d = g.dice.map((v, i) => (g.revealed[i] ? v : 1 + Math.floor(rng() * 6)));
      kinds.forEach((k, j) => { if (BG.betWins(k, d)) hits[j]++; });
    }
    hits.forEach((h, j) => expect(Math.abs(h / N - g.probs[j])).toBeLessThan(0.015));
    const full = BG.betProbabilities(g.dice, g.dice.map(() => true), kinds);
    full.forEach((p) => expect([0, 1]).toContain(p));
  });
  it('offered odds are never exactly fair and EV formula is right', () => {
    expect(BG.betEV(0.25, 3)).toBeCloseTo(0, 12);
    expect(BG.betEV(0.5, 1.5)).toBeCloseTo(0.25, 12);
    const rng = mulberry32(8);
    for (let i = 0; i < 30; i++) { const g = BG.generateGridRound(rng, 6, 3); g.bets.forEach((b, j) => expect(Math.abs(BG.betEV(g.probs[j], b.odds))).toBeGreaterThan(1e-6)); }
  });
});

describe('question families', () => {
  it('closed forms', () => {
    expect(F.stopOptimalEV(2)).toBeCloseTo(4.25, 10);
    expect(F.stopOptimalEV(3)).toBeCloseTo(14 / 3, 10);
    expect(F.derangements(4)).toBe(9);
    expect(F.multinomialWord('BANANA')).toBe(60);
    expect(F.ruin(0.5, 3, 10)).toBeCloseTo(0.3, 12);
    expect(F.harmonic(6) * 6).toBeCloseTo(14.7, 10);
  });
  it('every family produces answerable questions at every level, in both formats', () => {
    const rng = mulberry32(31);
    for (const fam of Object.keys(F.FAMILIES)) for (const level of ['easy', 'medium', 'hard'] as const) for (const format of ['typed', 'choice'] as const) for (let k = 0; k < 25; k++) {
      const q = F.generateFromMix(rng, { [fam]: 1 }, level, format);
      expect(q.family).toBe(fam);
      expect(Number.isFinite(q.answer)).toBe(true);
      if (q.options) { expect(q.answer).toBeGreaterThanOrEqual(0); expect(q.answer).toBeLessThan(q.options.length); expect(new Set(q.options).size).toBe(q.options.length); }
      else if (q.choices) expect(q.choices.some((c) => withinTolerance(c, q.answer, q.tolerance ?? { abs: 1e-4 }) || Math.abs(c - q.answer) < 1e-3)).toBe(true);
      else if (!q.credit) { const typed = parseAnswer(String(q.answer)); expect(withinTolerance(typed!, q.answer, q.tolerance)).toBe(true); }
    }
  });
  it('logic puzzles have a unique, consistent answer', () => {
    const rng = mulberry32(2);
    for (let k = 0; k < 50; k++) {
      const q = F.generateFromMix(rng, { logic: 1 }, 'hard', 'choice');
      const clues = q.prompt.match(/(\w+) is taller than (\w+)/g)!.map((c) => c.split(' is taller than '));
      const names = q.options!;
      const above = (a: string, b: string): boolean => clues.some(([x, y]) => x === a && (y === b || above(y, b)));
      const ranks = names.map((n) => names.filter((m) => above(m, n)).length + 1);
      expect(new Set(ranks).size).toBe(names.length); // total order
      const want = /tallest\?/.test(q.prompt) && !/number/.test(q.prompt) ? 1 : /shortest/.test(q.prompt) ? names.length : Number(q.prompt.match(/number (\d+)/)![1]);
      expect(ranks[q.answer]).toBe(want);
    }
  });
});

describe('adaptive rules', () => {
  it('steps up after 3 fast correct, down after 2 misses, slow correct does not build streak', () => {
    let s = initAdapt('easy');
    s = adaptStep(s, true, 1000, 5000); s = adaptStep(s, true, 1000, 5000); expect(s.level).toBe('easy');
    s = adaptStep(s, true, 1000, 5000); expect(s.level).toBe('medium');
    s = adaptStep(s, true, 9000, 5000); expect(s.streak).toBe(0);
    s = adaptStep(s, false, 1000, 5000); s = adaptStep(s, false, 1000, 5000); expect(s.level).toBe('easy');
    s = adaptStep(s, false, 1000, 5000); s = adaptStep(s, false, 1000, 5000); expect(s.level).toBe('easy');
    expect(adaptWindow(1000, true, 400, 2000)).toBe(950);
    expect(adaptWindow(1000, false, 400, 2000)).toBe(1100);
    expect(adaptWindow(410, true, 400, 2000)).toBe(400);
  });
});

describe('assessments and battery', () => {
  it('every test spec is registered with its real format as the hard preset', () => {
    for (const t of TEST_SPECS) {
      const m = GAME_BY_ID[t.id];
      expect(m.category).toBe('assessment');
      expect(m.presets.hard.questions).toBe(t.questions);
      expect(m.presets.hard.duration).toBe(t.minutes * 60);
      expect(t.observed.length).toBeGreaterThan(0);
    }
  });
  it('section settings fit the time budget', () => {
    expect(sectionSettings(GAME_BY_ID.math, 300, 'medium').duration).toBe(300);
    expect(sectionSettings(GAME_BY_ID.math, 300, 'medium').questions).toBe(0);
    expect(sectionSettings(GAME_BY_ID.dice, 270, 'easy').rounds).toBe(6);
    expect(sectionSettings(GAME_BY_ID['etf-sim'], 300, 'hard').ticks).toBe(375);
    expect(sectionSettings(GAME_BY_ID['oa-math-80'], 600, 'hard').duration).toBe(600);
  });
  it('normalisation is bounded and monotone in score', () => {
    const dice = GAME_BY_ID.dice, s = GAME_BY_ID.dice.presets.easy;
    expect(normalize(dice, { score: 0 }, s)).toBe(50);
    expect(normalize(dice, { score: 1000 }, s)).toBe(100);
    expect(normalize(dice, { score: -40 }, s)).toBeLessThan(normalize(dice, { score: 40 }, s));
    const m = GAME_BY_ID.math, ms = { ...m.presets.easy, duration: 60 };
    expect(normalize(m, { score: 15, correct: 15, total: 15 }, ms)).toBe(100);
    expect(normalize(m, { score: 5, correct: 5, total: 10 }, ms)).toBe(42);
    expect(overallScore([{ norm: 80, weight: 2 }, { norm: 50, weight: 1 }])).toBe(70);
    expect(band(70)).toBe('Competitive');
  });
  it('presets reference real games and plans sum to the budget', () => {
    for (const p of BATTERY_PRESETS) {
      const plan = planSections(p.sections, p.minutes);
      expect(plan.length).toBe(p.sections.length);
      expect(Math.abs(plan.reduce((a, x) => a + x.seconds, 0) - p.minutes * 60)).toBeLessThanOrEqual(p.sections.length);
    }
  });
});
