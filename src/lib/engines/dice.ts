/**
 * Market Making Dice Game engine.
 * OBSERVED (public rules panel): dice 1-6, some hidden; MM quote "bid at ask"; buy at ask / sell at bid;
 * settlement = sum of dice; start budget 500; longs must be affordable; shorts must have max loss covered;
 * optional market events (listed below); player reports return each round.
 * INFERRED here: hidden-dice count, quote distribution, spread, event probability, timeout = no trade.
 */
import { type Rng, randInt, normal, sample } from '../rng';

export type DiceEvent = 'none' | 'high' | 'low' | 'extremes' | 'even' | 'odd' | 'oneIsSeven';
export const DICE_EVENTS: DiceEvent[] = ['high', 'low', 'extremes', 'even', 'odd', 'oneIsSeven'];
export const EVENT_LABEL: Record<DiceEvent, string> = {
  none: 'No event',
  high: 'Dice only show 5 or 6 this round',
  low: 'Dice only show 1 or 2 this round',
  extremes: 'Dice only show 1 or 6 this round',
  even: 'Dice only show even numbers this round',
  odd: 'Dice only show odd numbers this round',
  oneIsSeven: 'A die showing 1 is worth 7 this round',
};

export function faceSet(e: DiceEvent): number[] {
  switch (e) {
    case 'high': return [5, 6];
    case 'low': return [1, 2];
    case 'extremes': return [1, 6];
    case 'even': return [2, 4, 6];
    case 'odd': return [1, 3, 5];
    default: return [1, 2, 3, 4, 5, 6];
  }
}
export const faceValue = (face: number, e: DiceEvent) => (e === 'oneIsSeven' && face === 1 ? 7 : face);
export const dieValues = (e: DiceEvent) => faceSet(e).map((f) => faceValue(f, e));
export const expectedDie = (e: DiceEvent) => dieValues(e).reduce((a, b) => a + b, 0) / faceSet(e).length;
export const maxDie = (e: DiceEvent) => Math.max(...dieValues(e));
export const minDie = (e: DiceEvent) => Math.min(...dieValues(e));

export interface DiceRound {
  faces: number[];
  hidden: boolean[];
  event: DiceEvent;
  bid: number;
  ask: number;
}
export type Side = 'buy' | 'sell';

const visibleSum = (r: DiceRound) => r.faces.reduce((s, f, i) => s + (r.hidden[i] ? 0 : faceValue(f, r.event)), 0);
const hiddenCount = (r: DiceRound) => r.hidden.filter(Boolean).length;

export const fairValue = (r: DiceRound) => visibleSum(r) + hiddenCount(r) * expectedDie(r.event);
export const maxSettlement = (r: DiceRound) => visibleSum(r) + hiddenCount(r) * maxDie(r.event);
export const minSettlement = (r: DiceRound) => visibleSum(r) + hiddenCount(r) * minDie(r.event);
export const settlement = (r: DiceRound) => r.faces.reduce((s, f) => s + faceValue(f, r.event), 0);

export function generateRound(rng: Rng, nDice: number, eventsOn: boolean, eventProb = 0.35): DiceRound {
  const event: DiceEvent = eventsOn && rng() < eventProb ? DICE_EVENTS[randInt(rng, 0, DICE_EVENTS.length - 1)] : 'none';
  const set = faceSet(event);
  const faces = Array.from({ length: nDice }, () => set[randInt(rng, 0, set.length - 1)]);
  const nHidden = nDice === 1 ? 1 : randInt(rng, 1, nDice - 1);
  const hiddenIdx = new Set(sample(rng, faces.map((_, i) => i), nHidden));
  const hidden = faces.map((_, i) => hiddenIdx.has(i));
  const base: DiceRound = { faces, hidden, event, bid: 0, ask: 0 };
  // The reference states quotes are random. Here: mid = fair + noise scaled by hidden uncertainty.
  const fair = fairValue(base);
  const sd = Math.max(1, Math.sqrt(nHidden) * 1.7);
  const mid = fair + normal(rng) * sd;
  const spread = randInt(rng, 1, 3);
  let bid = Math.round(mid - spread / 2);
  bid = Math.max(minSettlement(base), Math.min(bid, maxSettlement(base) - spread));
  return { ...base, bid, ask: bid + spread };
}

export function validateOrder(r: DiceRound, side: Side, qty: number, balance: number): { ok: boolean; reason?: string } {
  if (!Number.isInteger(qty) || qty < 1) return { ok: false, reason: 'Quantity must be a whole number of at least 1.' };
  if (side === 'buy') {
    const cost = qty * r.ask;
    if (cost > balance) return { ok: false, reason: `Buying ${qty} at ${r.ask} costs ${cost}, more than your balance of ${balance}.` };
  } else {
    const maxLoss = qty * Math.max(0, maxSettlement(r) - r.bid);
    if (maxLoss > balance) return { ok: false, reason: `Selling ${qty} at ${r.bid} risks up to ${maxLoss}, more than your balance of ${balance}.` };
  }
  return { ok: true };
}
/** Largest valid quantity for a side given the balance. */
export function maxQty(r: DiceRound, side: Side, balance: number): number {
  if (side === 'buy') return Math.floor(balance / r.ask);
  const per = maxSettlement(r) - r.bid;
  return per <= 0 ? Infinity : Math.floor(balance / per);
}
export const pnl = (r: DiceRound, side: Side, qty: number) => (side === 'buy' ? qty * (settlement(r) - r.ask) : qty * (r.bid - settlement(r)));
export const edgePerUnit = (r: DiceRound, side: Side) => (side === 'buy' ? fairValue(r) - r.ask : r.bid - fairValue(r));
