/**
 * ETF Arbitrage. Reference description: spot ETF vs underlying mispricings; trade against 3 AI market makers for P&L.
 * ORIGINAL mechanics: ETF = weighted basket of 3 stocks (NAV = Σ wᵢpᵢ). Each AI market maker quotes the ETF around NAV
 * with its own noise; occasionally a quote crosses NAV. Taking a crossed quote earns the edge, which is assumed to be
 * locked in instantly by hedging the basket at NAV. Competing arbitrageurs remove crossed quotes after a reaction delay.
 */
import { type Rng, randInt, normal, round, shuffle } from '../rng';

export interface Basket { tickers: string[]; weights: number[]; prices: number[] }
export interface EtfQuote { mm: string; bid: number; ask: number; crossedAt: number | null }

export const nav = (b: Basket) => round(b.weights.reduce((s, w, i) => s + w * b.prices[i], 0), 2);

export function newBasket(rng: Rng): Basket {
  const tickers = shuffle(rng, ['KRNL', 'VLTA', 'OXBO', 'PRSM', 'TALC', 'QUIL']).slice(0, 3);
  const weights = tickers.map(() => [0.5, 1, 1.5, 2][randInt(rng, 0, 3)]);
  const prices = tickers.map(() => round(20 + rng() * 40, 2));
  return { tickers, weights, prices };
}
export function stepBasket(rng: Rng, b: Basket, vol: number): Basket {
  return { ...b, prices: b.prices.map((p) => Math.max(1, round(p + normal(rng) * vol, 2))) };
}
/** One MM quote. With probability `crossProb` the MM is stale/wrong and its quote crosses NAV. */
export function makeQuote(rng: Rng, mm: string, navNow: number, halfSpread: number, crossProb: number, now: number): EtfQuote {
  let mid = navNow + normal(rng) * halfSpread * 0.4;
  let crossed = false;
  if (rng() < crossProb) {
    const dir = rng() < 0.5 ? -1 : 1;
    mid = navNow + dir * (halfSpread + 0.05 + rng() * halfSpread * 1.5);
    crossed = true;
  }
  const bid = round(mid - halfSpread, 2);
  const ask = round(mid + halfSpread, 2);
  return { mm, bid, ask, crossedAt: crossed || bid > navNow || ask < navNow ? now : null };
}
export const isCrossed = (q: EtfQuote, navNow: number) => q.bid > navNow || q.ask < navNow;
export const tradePnl = (side: 'buy' | 'sell', price: number, navNow: number, qty: number) =>
  round(side === 'buy' ? (navNow - price) * qty : (price - navNow) * qty, 2);
