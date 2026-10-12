import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/rng';
import * as C from '@/lib/engines/cards';
import * as HL from '@/lib/engines/higherLower';
import * as F from '@/lib/engines/fermi';
import * as E from '@/lib/engines/events';
import * as ETF from '@/lib/engines/etf';
import * as T from '@/lib/engines/tradingGame';

describe('card game', () => {
  it('deck sum and conditional fair value', () => {
    expect(C.DECK_SUM).toBe(364);
    expect(C.fairValue([13, 5], [true, false])).toBeCloseTo(13 + (364 - 13) / 51, 10);
    expect(C.fairValue([1, 1, 1], [false, false, false])).toBeCloseTo(21, 10);
  });
  it('best action picks max edge or pass', () => {
    const r: C.CardRound = { cards: [7, 7], revealed: [false, false], quotes: [{ name: 'a', bid: 10, ask: 12 }, { name: 'b', bid: 17, ask: 19 }] };
    expect(C.bestAction(r)).toEqual({ kind: 'sell', quote: 1 });
    expect(C.actionPnl(r, { kind: 'sell', quote: 1 }, 2)).toBe(6);
    const flat: C.CardRound = { ...r, quotes: [{ name: 'a', bid: 13, ask: 15 }] };
    expect(C.bestAction(flat)).toEqual({ kind: 'pass' });
  });
});
describe('higher or lower', () => {
  it('probabilities and kelly', () => {
    expect(HL.probHigher(7, [1, 8, 9, 7])).toBe(0.5);
    expect(HL.probLower(7, [1, 8, 9, 7])).toBe(0.25);
    expect(HL.kellyEvenMoney(0.75)).toBe(0.5);
    expect(HL.kellyEvenMoney(0.4)).toBe(0);
    expect(HL.settleBet('higher', 5, 5, 10)).toBe(-10);
    expect(HL.settleBet('lower', 5, 2, 10)).toBe(10);
  });
});
describe('fermi scoring', () => {
  it('intervals', () => {
    expect(F.scoreInterval(100, 1000, 500, 0).points).toBe(75);
    expect(F.scoreInterval(100, 1000, 5000, 1).points).toBe(0);
    expect(F.scoreInterval(400, 400, 400, 1).points).toBe(120);
    expect(F.scoreInterval(-1, 10, 5, 1).valid).toBe(false);
  });
  it('point credit', () => {
    expect(F.pointCredit(100, 100)).toBe(1);
    expect(F.pointCredit(1000, 100)).toBeCloseTo(0, 10);
    expect(F.pointCredit(0, 100)).toBe(0);
  });
  it('bank answers are positive and ids unique', () => {
    expect(new Set(F.FERMI_BANK.map((q) => q.id)).size).toBe(F.FERMI_BANK.length);
    expect(F.FERMI_BANK.every((q) => q.answer > 0)).toBe(true);
  });
});
describe('event contracts', () => {
  it('bayes in odds form', () => {
    expect(E.posterior(0.5, 3)).toBeCloseTo(0.75, 10);
    expect(E.posterior(0.2, 4)).toBeCloseTo(0.5, 10);
  });
  it('settlement and calibration', () => {
    const fills: E.Fill[] = [{ trader: 'noise', side: 'buy', price: 60 }, { trader: 'informed', side: 'sell', price: 55 }];
    expect(E.settleFills(fills, true)).toBe(-40 + 45);
    expect(E.settleFills(fills, false)).toBe(60 - 55);
    expect(E.calibrationPoints(100, true)).toBe(10);
    expect(E.calibrationPoints(50, false)).toBe(0);
    expect(E.validateQuote(40, 45, 10)).toBeNull();
    expect(E.validateQuote(45, 40, 10)).not.toBeNull();
  });
  it('informed flow always trades against a wrong-side quote', () => {
    const rng = mulberry32(3);
    const sc = { ...E.generateScenario(rng, 1), outcome: true };
    const fills = E.simulateFlow(rng, sc, 40, 45, 20, 1);
    expect(fills.length).toBe(20);
    expect(fills.every((f) => f.side === 'buy')).toBe(true);
  });
});
describe('etf arbitrage', () => {
  it('nav and pnl', () => {
    const b: ETF.Basket = { tickers: ['A', 'B', 'C'], weights: [1, 2, 0.5], prices: [10, 20, 40] };
    expect(ETF.nav(b)).toBe(70);
    expect(ETF.tradePnl('buy', 69.5, 70, 10)).toBe(5);
    expect(ETF.tradePnl('sell', 69.5, 70, 10)).toBe(-5);
    expect(ETF.isCrossed({ mm: 'x', bid: 70.1, ask: 70.3, crossedAt: null }, 70)).toBe(true);
  });
});
describe('trading game', () => {
  it('public fair and settlement', () => {
    expect(T.publicFair([3, 9, 20], 1)).toBe(3 + 2 * 10.5);
    expect(T.settleValue([3, 9, 20])).toBe(32);
    expect(T.accountPnl(-30, 1, 32)).toBe(2);
    expect(T.validateQuote(10, 12, 4)).toBeNull();
    expect(T.validateQuote(10, 20, 4)).not.toBeNull();
  });
  it('book is sorted best-first', () => {
    const b = T.makeBook(mulberry32(1), [5, 6, 7, 8], 2, 2);
    for (let i = 1; i < b.bids.length; i++) expect(b.bids[i - 1].px).toBeGreaterThanOrEqual(b.bids[i].px);
    for (let i = 1; i < b.asks.length; i++) expect(b.asks[i - 1].px).toBeLessThanOrEqual(b.asks[i].px);
  });
});
