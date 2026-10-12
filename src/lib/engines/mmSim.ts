/**
 * Market-making simulator (ORIGINAL design) shared by the four strategy trainers.
 * Each tick: the instrument's fair value moves, traders arrive (Poisson), informed traders trade on knowledge of the
 * next fair value (or the event outcome), noise traders trade with a probability that falls as your spread widens.
 * You can hedge net delta in the underlying at a cost. P&L is marked to fair and settled at the end.
 */
import { type Rng, normal, randInt, pick, shuffle, round } from '../rng';

/* ---------- maths helpers ---------- */
/** Standard normal CDF (Abramowitz & Stegun 7.1.26 erf approximation, |error| < 1.5e-7). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}
export function bsCall(S: number, K: number, T: number, sigma: number, r = 0): number {
  if (T <= 0 || sigma <= 0) return Math.max(0, S - K * Math.exp(-r * Math.max(T, 0)));
  const d1 = (Math.log(S / K) + (r + sigma ** 2 / 2) * T) / (sigma * Math.sqrt(T));
  return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d1 - sigma * Math.sqrt(T));
}
export function bsDelta(S: number, K: number, T: number, sigma: number, r = 0): number {
  if (T <= 0 || sigma <= 0) return S > K ? 1 : 0;
  return normCdf((Math.log(S / K) + (r + sigma ** 2 / 2) * T) / (sigma * Math.sqrt(T)));
}
export function poisson(rng: Rng, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L && k < 200);
  return k - 1;
}

/* ---------- instruments ---------- */
export interface InstState { t: number; ticks: number; d: Record<string, number>; arr: Record<string, number[]>; news: string | null; outcome?: boolean }
export interface InfoRow { label: string; value: string }
export interface Instrument {
  id: string;
  name: string;
  priceTick: number;
  /** Spread at which noise-trader participation falls to 1/e of its maximum. */
  spreadScale: number;
  init(rng: Rng, ticks: number, vol: number): InstState;
  step(rng: Rng, s: InstState, vol: number, newsProb: number): InstState;
  fair(s: InstState): number;
  /** Units of the hedge instrument with the same exposure as +1 quoted unit (0 = cannot hedge). */
  hedgeRatio(s: InstState): number;
  hedgePrice(s: InstState): number;
  hedgeName: string;
  /** Value an informed trader acts on, given the next state. */
  informedValue(next: InstState): number;
  settle(s: InstState): number;
  info(s: InstState): InfoRow[];
}

const fx = (x: number, dp = 2) => x.toFixed(dp);

export const ETF_INST: Instrument = {
  id: 'etf', name: 'ETF', priceTick: 0.01, spreadScale: 0.12, hedgeName: 'basket',
  init(rng, ticks) {
    return { t: 0, ticks, d: {}, news: null, arr: { w: shuffle(rng, [0.5, 1, 1.5, 2]).slice(0, 3), p: [0, 0, 0].map(() => round(20 + rng() * 40, 2)) } };
  },
  step(rng, s, vol, newsProb) {
    const shock = rng() < newsProb ? normal(rng) * vol * 6 : 0;
    const p = s.arr.p.map((x) => Math.max(1, round(x + normal(rng) * vol + shock, 2)));
    return { ...s, t: s.t + 1, arr: { ...s.arr, p }, news: shock ? `Sector news moved all three stocks ${shock > 0 ? 'up' : 'down'}.` : null };
  },
  fair: (s) => round(s.arr.w.reduce((a, w, i) => a + w * s.arr.p[i], 0), 4),
  hedgeRatio: () => 1,
  hedgePrice(s) { return this.fair(s); },
  informedValue(n) { return this.fair(n); },
  settle(s) { return this.fair(s); },
  info: (s) => s.arr.w.map((w, i) => ({ label: `${['KRNL', 'VLTA', 'OXBO'][i]} × ${w}`, value: fx(s.arr.p[i]) })),
};

export const OPTION_INST: Instrument = {
  id: 'option', name: 'Call option', priceTick: 0.05, spreadScale: 0.2, hedgeName: 'shares',
  init(rng, ticks, vol) {
    const S = 100, K = pick(rng, [95, 100, 105]);
    return { t: 0, ticks, news: null, arr: {}, d: { S, K, T: 30 / 365, T0: 30 / 365, sigma: Math.max(0.05, vol) } };
  },
  step(rng, s, _vol, newsProb) {
    const dt = s.d.T0 / s.ticks;
    const jump = rng() < newsProb ? normal(rng) * 0.03 : 0;
    const S = round(s.d.S * Math.exp(s.d.sigma * Math.sqrt(dt) * normal(rng) - 0.5 * s.d.sigma ** 2 * dt + jump), 4);
    return { ...s, t: s.t + 1, d: { ...s.d, S, T: Math.max(0, s.d.T - dt) }, news: jump ? `Headline: the stock gapped ${jump > 0 ? 'up' : 'down'}.` : null };
  },
  fair: (s) => bsCall(s.d.S, s.d.K, s.d.T, s.d.sigma),
  hedgeRatio: (s) => bsDelta(s.d.S, s.d.K, s.d.T, s.d.sigma),
  hedgePrice: (s) => s.d.S,
  informedValue(n) { return this.fair(n); },
  settle(s) { return this.fair(s); },
  info: (s) => [{ label: 'Stock', value: fx(s.d.S) }, { label: 'Strike', value: String(s.d.K) }, { label: 'Days to expiry', value: (s.d.T * 365).toFixed(1) }, { label: 'Implied vol', value: `${Math.round(s.d.sigma * 100)}%` }, { label: 'Rate', value: '0%' }],
};

export const FUTURES_INST: Instrument = {
  id: 'futures', name: 'Index future', priceTick: 0.25, spreadScale: 0.4, hedgeName: 'index (cash)',
  init(rng, ticks) {
    return { t: 0, ticks, news: null, arr: {}, d: { S: randInt(rng, 3800, 4200), r: pick(rng, [0.03, 0.04, 0.05]), days: pick(rng, [60, 90, 120]), D: randInt(rng, 5, 25) } };
  },
  step(rng, s, vol, newsProb) {
    const jump = rng() < newsProb ? normal(rng) * vol * 8 : 0;
    const days = Math.max(0, s.d.days - 30 / s.ticks);
    return { ...s, t: s.t + 1, d: { ...s.d, S: round(s.d.S + normal(rng) * vol + jump, 2), days }, news: jump ? `Macro data: the index jumped ${jump > 0 ? 'higher' : 'lower'}.` : null };
  },
  fair: (s) => s.d.S * (1 + (s.d.r * s.d.days) / 365) - s.d.D,
  hedgeRatio: (s) => 1 + (s.d.r * s.d.days) / 365,
  hedgePrice: (s) => s.d.S,
  informedValue(n) { return this.fair(n); },
  settle(s) { return this.fair(s); },
  info: (s) => [{ label: 'Index (cash)', value: fx(s.d.S) }, { label: 'Rate', value: `${(s.d.r * 100).toFixed(1)}%` }, { label: 'Days to expiry', value: s.d.days.toFixed(1) }, { label: 'Dividends before expiry', value: fx(s.d.D) }],
};

export const PREDICTION_INST: Instrument = {
  id: 'prediction', name: 'YES contract (pays 100)', priceTick: 1, spreadScale: 4, hedgeName: '—',
  init(rng, ticks) {
    const prior = pick(rng, [0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
    return { t: 0, ticks, arr: {}, d: { prior, p: prior, acc: pick(rng, [0.6, 0.65, 0.7]) }, news: null, outcome: rng() < prior };
  },
  step(rng, s, _vol, newsProb) {
    if (rng() >= newsProb) return { ...s, t: s.t + 1, news: null };
    const a = s.d.acc;
    const saysYes = rng() < (s.outcome ? a : 1 - a);
    const lr = saysYes ? a / (1 - a) : (1 - a) / a;
    const p = (s.d.p * lr) / (s.d.p * lr + 1 - s.d.p);
    return { ...s, t: s.t + 1, d: { ...s.d, p }, news: `A source that is right ${Math.round(a * 100)}% of the time says ${saysYes ? 'YES' : 'NO'}.` };
  },
  fair: (s) => s.d.p * 100,
  hedgeRatio: () => 0,
  hedgePrice: () => 0,
  informedValue: (n) => (n.outcome ? 100 : 0),
  settle: (s) => (s.outcome ? 100 : 0),
  info: (s) => [{ label: 'Base rate', value: `${Math.round(s.d.prior * 100)}%` }, { label: 'Source accuracy', value: `${Math.round(s.d.acc * 100)}%` }],
};

export const INSTRUMENTS: Record<string, Instrument> = { etf: ETF_INST, option: OPTION_INST, futures: FUTURES_INST, prediction: PREDICTION_INST };

/* ---------- simulation ---------- */
export interface SimParams { ticks: number; traders: number; informedPct: number; maxPos: number; lot: number; hedgeCost: number; vol: number; newsPct: number }
export interface SimFill { t: number; side: 'buy' | 'sell'; qty: number; price: number; fair: number; informed: boolean; markout: number | null }
export interface SimState {
  inst: InstState; pos: number; hedgePos: number; cash: number; fills: SimFill[];
  hedgeCostPaid: number; maxAbsPos: number; sumAbsDelta: number; pnlPath: number[]; log: string[];
}
export interface Quote { bid: number; ask: number }

export function initSim(rng: Rng, inst: Instrument, P: SimParams): SimState {
  const s = inst.init(rng, P.ticks, P.vol);
  return { inst: s, pos: 0, hedgePos: 0, cash: 0, fills: [], hedgeCostPaid: 0, maxAbsPos: 0, sumAbsDelta: 0, pnlPath: [0], log: [] };
}
export const netDelta = (inst: Instrument, st: SimState) => st.pos * inst.hedgeRatio(st.inst) + st.hedgePos;
export const markToMarket = (inst: Instrument, st: SimState) => st.cash + st.pos * inst.fair(st.inst) + st.hedgePos * inst.hedgePrice(st.inst);
export const settlementPnl = (inst: Instrument, st: SimState) => st.cash + st.pos * inst.settle(st.inst) + st.hedgePos * inst.hedgePrice(st.inst);

/** Advance one tick. `q` null means you are not quoting. Pure given rng. */
export function simTick(rng: Rng, inst: Instrument, st: SimState, q: Quote | null, P: SimParams): SimState {
  const fairNow = inst.fair(st.inst);
  const next = inst.step(rng, st.inst, P.vol, P.newsPct / 100);
  const fills: SimFill[] = [];
  let { pos, cash } = st;
  const log: string[] = [];
  if (next.news) log.push(next.news);
  if (q && q.ask > q.bid) {
    const k = poisson(rng, P.traders);
    const half = (q.ask - q.bid) / 2;
    for (let i = 0; i < k; i++) {
      const informed = rng() < P.informedPct / 100;
      let side: 'buy' | 'sell' | null = null; // trader's side
      if (informed) {
        const v = inst.informedValue(next);
        if (v > q.ask) side = 'buy'; else if (v < q.bid) side = 'sell';
      } else if (rng() < Math.exp(-half / inst.spreadScale)) side = rng() < 0.5 ? 'buy' : 'sell';
      if (!side) continue;
      // trader buys → you sell at ask
      if (side === 'buy' && pos - P.lot >= -P.maxPos) { pos -= P.lot; cash += q.ask * P.lot; fills.push({ t: st.inst.t, side: 'sell', qty: P.lot, price: q.ask, fair: fairNow, informed, markout: null }); }
      else if (side === 'sell' && pos + P.lot <= P.maxPos) { pos += P.lot; cash -= q.bid * P.lot; fills.push({ t: st.inst.t, side: 'buy', qty: P.lot, price: q.bid, fair: fairNow, informed, markout: null }); }
    }
  }
  const fairNext = inst.fair(next);
  // One-tick markout from your side: positive = the fill was good after the move.
  for (const f of fills) f.markout = f.side === 'buy' ? (fairNext - f.price) * f.qty : (f.price - fairNext) * f.qty;
  const nst: SimState = { ...st, inst: next, pos, cash, fills: [...st.fills, ...fills], log: [...log, ...st.log].slice(0, 40), maxAbsPos: Math.max(st.maxAbsPos, Math.abs(pos)) };
  nst.sumAbsDelta = st.sumAbsDelta + Math.abs(netDelta(inst, nst));
  nst.pnlPath = [...st.pnlPath, markToMarket(inst, nst)];
  return nst;
}

/** Trade the hedge instrument to bring net delta as close to zero as whole units allow. */
export function hedgeAll(inst: Instrument, st: SimState, P: SimParams): SimState {
  if (inst.hedgeRatio(st.inst) === 0 && st.hedgePos === 0) return st;
  const qty = -Math.round(netDelta(inst, st));
  if (qty === 0) return st;
  const px = inst.hedgePrice(st.inst);
  const cost = Math.abs(qty) * P.hedgeCost;
  return { ...st, hedgePos: st.hedgePos + qty, cash: st.cash - qty * px - cost, hedgeCostPaid: st.hedgeCostPaid + cost, log: [`Hedged: ${qty > 0 ? 'bought' : 'sold'} ${Math.abs(qty)} ${inst.hedgeName} at ${px.toFixed(2)}`, ...st.log].slice(0, 40) };
}

export function summary(inst: Instrument, st: SimState) {
  const edge = st.fills.reduce((a, f) => a + (f.side === 'buy' ? f.fair - f.price : f.price - f.fair) * f.qty, 0);
  const informedFills = st.fills.filter((f) => f.informed);
  const informedMarkout = informedFills.reduce((a, f) => a + (f.markout ?? 0), 0);
  return {
    pnl: settlementPnl(inst, st), fills: st.fills.length, informedFills: informedFills.length,
    edgeCaptured: edge, informedMarkout, hedgeCost: st.hedgeCostPaid, maxAbsPos: st.maxAbsPos,
    avgAbsDelta: st.sumAbsDelta / Math.max(1, st.inst.t),
  };
}
