/**
 * Trading Game. Reference description: combine market making and market taking in one round —
 * quote spreads, then trade against the book.
 * ORIGINAL mechanics: the asset settles at the sum of K hidden draws, each uniform on 1..20 (mean 10.5).
 * One draw is revealed per turn. Each turn: (1) you quote bid/ask, a counterparty with a noisy private estimate
 * may trade one lot against you; (2) a book of bot quotes appears and you may take liquidity.
 */
import { type Rng, randInt, normal } from '../rng';

export const DRAW_MAX = 20;
export const DRAW_MEAN = (DRAW_MAX + 1) / 2;

export interface Book { bids: { who: string; px: number; size: number }[]; asks: { who: string; px: number; size: number }[] }

export const drawValues = (rng: Rng, k: number) => Array.from({ length: k }, () => randInt(rng, 1, DRAW_MAX));
export const publicFair = (values: number[], nRevealed: number) =>
  values.slice(0, nRevealed).reduce((a, b) => a + b, 0) + (values.length - nRevealed) * DRAW_MEAN;
export const settleValue = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** Counterparty response to your quote. Its estimate is centred on the true value, noise shrinking as draws are revealed. */
export function counterpartyTrade(rng: Rng, values: number[], nRevealed: number, bid: number, ask: number, informedness: number): 'buys' | 'sells' | 'none' {
  const remaining = values.length - nRevealed;
  const sdUnknown = Math.sqrt(remaining * ((DRAW_MAX ** 2 - 1) / 12));
  const center = informedness * settleValue(values) + (1 - informedness) * publicFair(values, nRevealed);
  const est = center + normal(rng) * Math.max(1, sdUnknown * 0.5);
  if (est > ask) return 'buys';
  if (est < bid) return 'sells';
  return 'none';
}
export function makeBook(rng: Rng, values: number[], nRevealed: number, noise: number): Book {
  const fair = publicFair(values, nRevealed);
  const who = ['Ivo', 'Juno', 'Kai'];
  const bids = who.map((w) => ({ who: w, px: Math.round(fair - 1 - Math.abs(normal(rng)) * noise + normal(rng) * noise), size: randInt(rng, 1, 3) }));
  const asks = who.map((w) => ({ who: w, px: Math.round(fair + 1 + Math.abs(normal(rng)) * noise + normal(rng) * noise), size: randInt(rng, 1, 3) }));
  bids.sort((a, b) => b.px - a.px);
  asks.sort((a, b) => a.px - b.px);
  return { bids, asks };
}
export function validateQuote(bid: number, ask: number, maxWidth: number): string | null {
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) return 'Enter both a bid and an ask.';
  if (bid >= ask) return 'Bid must be below ask.';
  if (ask - bid > maxWidth) return `Spread must be at most ${maxWidth}.`;
  return null;
}
/** Mark-to-settlement P&L of a cash + position account. */
export const accountPnl = (cash: number, position: number, settle: number) => cash + position * settle;
