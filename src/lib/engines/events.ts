/**
 * Event Contracts. Reference description: quote two-sided markets on binary events against noise and informed flow;
 * scored on P&L and calibration; base rate + news → probability (odds-form Bayes); more informed flow at higher levels.
 * ORIGINAL mechanics: abstract events with a stated base rate and 1–3 signals with stated likelihood ratios.
 * Contracts pay 100¢ on YES. Each trader trades 1 contract against your quote.
 */
import { type Rng, pick, randInt, normal } from '../rng';

export const posterior = (p: number, lr: number) => (p * lr) / (p * lr + (1 - p));
export const toOdds = (p: number) => p / (1 - p);

export interface Signal { text: string; lr: number }
export interface EventScenario { title: string; baseRate: number; signals: Signal[]; trueProb: number; outcome: boolean }

const TOPICS = [
  'a delivery arrives before noon', 'the home team wins on Saturday', 'the product ships on its target date',
  'the central bank raises rates', 'it rains at the stadium tonight', 'the merger is approved this quarter',
  'the new restaurant is still open in a year', 'the candidate clears the first round', 'the flight lands on time',
  'the trial reports a positive result',
];
const LRS = [1 / 4, 1 / 3, 1 / 2, 2, 3, 4];

export function lrText(lr: number): string {
  return lr >= 1
    ? `A report arrives that is ${lr}× as likely to be seen if the answer is YES as if it is NO.`
    : `A report arrives that is ${Math.round(1 / lr)}× as likely to be seen if the answer is NO as if it is YES.`;
}

export function generateScenario(rng: Rng, nSignals: number): EventScenario {
  const baseRate = pick(rng, [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8]);
  const signals: Signal[] = Array.from({ length: nSignals }, () => {
    const lr = pick(rng, LRS);
    return { lr, text: lrText(lr) };
  });
  const trueProb = signals.reduce((p, s) => posterior(p, s.lr), baseRate);
  return { title: `Will ${pick(rng, TOPICS)}?`, baseRate, signals, trueProb, outcome: rng() < trueProb };
}

export interface Fill { trader: 'informed' | 'noise'; side: 'buy' | 'sell'; price: number }

/** Simulate flow against the quote. A trader "buy" means you sell at your ask. */
export function simulateFlow(rng: Rng, sc: EventScenario, bid: number, ask: number, nTraders: number, informedShare: number): Fill[] {
  const fills: Fill[] = [];
  for (let i = 0; i < nTraders; i++) {
    if (rng() < informedShare) {
      if (sc.outcome && ask < 100) fills.push({ trader: 'informed', side: 'buy', price: ask });
      else if (!sc.outcome && bid > 0) fills.push({ trader: 'informed', side: 'sell', price: bid });
    } else {
      const v = sc.trueProb * 100 + normal(rng) * 15;
      if (v > ask) fills.push({ trader: 'noise', side: 'buy', price: ask });
      else if (v < bid) fills.push({ trader: 'noise', side: 'sell', price: bid });
    }
  }
  return fills;
}
/** Your P&L in cents after settlement. */
export function settleFills(fills: Fill[], outcome: boolean): number {
  const payoff = outcome ? 100 : 0;
  return fills.reduce((s, f) => s + (f.side === 'buy' ? f.price - payoff : payoff - f.price), 0);
}
export const brier = (probPct: number, outcome: boolean) => (probPct / 100 - (outcome ? 1 : 0)) ** 2;
/** ORIGINAL calibration points: +10 for a perfect forecast, 0 for a coin-flip 50¢ mid, down to −30. */
export const calibrationPoints = (midPct: number, outcome: boolean) => Math.round(40 * (0.25 - brier(midPct, outcome)));
export function validateQuote(bid: number, ask: number, maxWidth: number): string | null {
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) return 'Enter a bid and an ask.';
  if (bid < 0 || ask > 100) return 'Prices must be between 0 and 100.';
  if (bid >= ask) return 'Your bid must be below your ask.';
  if (ask - bid > maxWidth) return `Your spread may be at most ${maxWidth}.`;
  return null;
}
export const traderCount = (rng: Rng, lo: number, hi: number) => randInt(rng, lo, hi);
