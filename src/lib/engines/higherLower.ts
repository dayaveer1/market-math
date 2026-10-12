/**
 * Higher or Lower. Reference description: call each card higher or lower, size each bet to your edge, don't bust.
 * ORIGINAL rules: 52-card deck dealt without replacement (A low = 1, K = 13); ties lose; even-money payout;
 * deck reshuffles when fewer than 6 cards remain.
 */
import { type Rng, shuffle } from '../rng';
import { FULL_DECK } from './cards';

export const newDeck = (r: Rng) => shuffle(r, FULL_DECK);
export function probHigher(current: number, remaining: number[]): number {
  return remaining.length ? remaining.filter((c) => c > current).length / remaining.length : 0;
}
export function probLower(current: number, remaining: number[]): number {
  return remaining.length ? remaining.filter((c) => c < current).length / remaining.length : 0;
}
/** Kelly fraction for an even-money bet with win probability p. */
export const kellyEvenMoney = (p: number) => Math.max(0, 2 * p - 1);
export function settleBet(call: 'higher' | 'lower', current: number, next: number, stake: number): number {
  const win = call === 'higher' ? next > current : next < current;
  return win ? stake : -stake;
}
