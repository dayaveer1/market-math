import { describe, it, expect } from 'vitest';
import { parseAnswer, withinTolerance } from '@/lib/parse';

describe('parseAnswer', () => {
  it.each([
    ['42', 42], ['-3.5', -3.5], ['1,250', 1250], ['1/4', 0.25], ['2 1/2', 2.5], ['25%', 0.25],
    ['3k', 3000], ['4.2m', 4.2e6], ['1.5b', 1.5e9], ['2e6', 2e6], ['3x10^5', 3e5], ['$12.50', 12.5],
  ] as [string, number][])('parses %s', (raw: string, v: number) => expect(parseAnswer(raw)).toBeCloseTo(v, 9));
  it('rejects junk and zero denominators', () => {
    expect(parseAnswer('abc')).toBeNull();
    expect(parseAnswer('1/0')).toBeNull();
    expect(parseAnswer('')).toBeNull();
  });
});
describe('withinTolerance', () => {
  it('exact by default', () => { expect(withinTolerance(5, 5)).toBe(true); expect(withinTolerance(5.01, 5)).toBe(false); });
  it('abs, rel, ratio', () => {
    expect(withinTolerance(0.334, 1 / 3, { abs: 0.001 })).toBe(true);
    expect(withinTolerance(105, 100, { rel: 0.05 })).toBe(true);
    expect(withinTolerance(190, 100, { ratio: 2 })).toBe(true);
    expect(withinTolerance(210, 100, { ratio: 2 })).toBe(false);
  });
});
