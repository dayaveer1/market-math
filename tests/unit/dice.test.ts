import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/rng';
import * as D from '@/lib/engines/dice';

const round = (faces: number[], hidden: boolean[], bid: number, ask: number, event: D.DiceEvent = 'none'): D.DiceRound => ({ faces, hidden, bid, ask, event });

describe('dice engine', () => {
  it('expected die values per event', () => {
    expect(D.expectedDie('none')).toBe(3.5);
    expect(D.expectedDie('high')).toBe(5.5);
    expect(D.expectedDie('even')).toBe(4);
    expect(D.expectedDie('oneIsSeven')).toBe(27 / 6);
    expect(D.maxDie('oneIsSeven')).toBe(7);
  });
  it('fair value uses visible dice plus hidden expectation', () => {
    const r = round([6, 2, 4], [false, true, true], 12, 14);
    expect(D.fairValue(r)).toBe(13);
    expect(D.maxSettlement(r)).toBe(18);
    expect(D.minSettlement(r)).toBe(8);
    expect(D.settlement(r)).toBe(12);
  });
  it('validates longs against cost and shorts against max loss', () => {
    const r = round([6, 2, 4], [false, true, true], 12, 14);
    expect(D.validateOrder(r, 'buy', 35, 500).ok).toBe(true); // 490
    expect(D.validateOrder(r, 'buy', 36, 500).ok).toBe(false); // 504
    expect(D.validateOrder(r, 'sell', 83, 500).ok).toBe(true); // 83 × 6 = 498
    expect(D.validateOrder(r, 'sell', 84, 500).ok).toBe(false);
    expect(D.validateOrder(r, 'buy', 0, 500).ok).toBe(false);
    expect(D.maxQty(r, 'sell', 500)).toBe(83);
  });
  it('settles P&L correctly for both sides', () => {
    const r = round([6, 2, 4], [false, true, true], 12, 14);
    expect(D.pnl(r, 'buy', 10)).toBe(-20);
    expect(D.pnl(r, 'sell', 10)).toBe(0);
  });
  it('one-is-seven event changes settlement and bounds', () => {
    const r = round([1, 1, 3], [false, true, true], 10, 12, 'oneIsSeven');
    expect(D.settlement(r)).toBe(17);
    expect(D.maxSettlement(r)).toBe(21);
  });
  it('generated rounds are consistent', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const r = D.generateRound(rng, 1 + (i % 6), true);
      expect(r.ask).toBeGreaterThan(r.bid);
      expect(r.hidden.some(Boolean)).toBe(true);
      expect(r.faces.every((f) => D.faceSet(r.event).includes(f))).toBe(true);
      expect(r.bid).toBeGreaterThanOrEqual(D.minSettlement(r));
    }
  });
});
