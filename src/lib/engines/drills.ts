/**
 * Trading desk drills (ETF, Options, Futures & Basis, Prediction Markets).
 * The reference trainers are courses (lessons + simulators + drills) whose content was not accessible.
 * Everything here is an ORIGINAL drill bank built from standard textbook relationships.
 */
import { type Rng, randInt, pick, round } from '../rng';
import type { Question, Settings } from '../types';
import { makeChoices } from './quizUtil';
import { withinTolerance } from '../parse';

type Gen = (r: Rng) => Omit<Question, 'display'> & { display?: string };
const money = { abs: 0.011 };

export const etfDrills: Record<string, Gen> = {
  nav: (r) => { const w = [randInt(r, 1, 4), randInt(r, 1, 4), randInt(r, 1, 4)], p = [randInt(r, 10, 80), randInt(r, 10, 80), randInt(r, 10, 80)]; const v = w[0] * p[0] + w[1] * p[1] + w[2] * p[2];
    return { prompt: 'Each ETF unit holds the basket below. What is the fair value (NAV) of one unit?', detail: `${w[0]} × A @ ${p[0]},  ${w[1]} × B @ ${p[1]},  ${w[2]} × C @ ${p[2]}`, answer: v, tolerance: money, explanation: 'Σ shares × price.' }; },
  arbEdge: (r) => { const nav = randInt(r, 9000, 11000) / 100; const side = r() < 0.5; const off = randInt(r, 5, 40) / 100; const bid = side ? round(nav + off, 2) : round(nav - off - 0.1, 2); const ask = side ? round(bid + 0.08, 2) : round(nav - off, 2);
    return { prompt: 'NAV and the ETF market are shown. What is your edge per unit on the best arbitrage (0 if none)?', detail: `NAV ${nav.toFixed(2)},  ETF ${bid.toFixed(2)} / ${ask.toFixed(2)}`, answer: round(Math.max(bid - nav, nav - ask, 0), 2), tolerance: money, explanation: 'Sell ETF if bid > NAV, buy ETF if ask < NAV; edge is the gap.' }; },
  hedgeShares: (r) => { const units = randInt(r, 2, 20) * 100, sh = randInt(r, 2, 6); return { prompt: `You sold ${units} ETF units. Each unit contains ${sh} shares of stock A. How many A shares do you buy to hedge that leg?`, answer: units * sh, explanation: `${units} × ${sh}.` }; },
  creation: (r) => { const nav = randInt(r, 40, 120), cu = pick(r, [10_000, 25_000, 50_000]), fee = pick(r, [500, 1000, 2000]); return { prompt: `NAV is ${nav}. A creation unit is ${cu.toLocaleString()} ETF shares with a fixed fee of ${fee}. What is the all-in cost per ETF share of creating?`, answer: round(nav + fee / cu, 4), tolerance: { abs: 0.0005 }, explanation: `${nav} + ${fee}/${cu}.` }; },
};

export const optionDrills: Record<string, Gen> = {
  parity: (r) => { const S = randInt(r, 80, 120), K = pick(r, [90, 95, 100, 105, 110]), C = randInt(r, 2, 25); const P = C - S + K;
    if (P <= 0) return optionDrills.intrinsic(r);
    return { prompt: 'Zero rates, no dividends. Use put–call parity: what should the put be worth?', detail: `S = ${S},  K = ${K},  call = ${C}`, answer: P, tolerance: money, explanation: 'P = C − S + K.' }; },
  parityRate: (r) => { const S = 100, K = pick(r, [95, 100, 105]), C = randInt(r, 5, 15), rate = pick(r, [0.02, 0.04, 0.05]), T = pick(r, [0.5, 1]); const P = round(C - S + K / (1 + rate * T), 2);
    return { prompt: 'Simple interest, no dividends. What is the put worth by put–call parity?', detail: `S = ${S}, K = ${K}, call = ${C}, r = ${rate * 100}% simple, T = ${T}y`, answer: P, tolerance: { abs: 0.02 }, explanation: 'P = C − S + K/(1 + rT).' }; },
  straddle: (r) => { const K = pick(r, [50, 75, 100]), C = randInt(r, 2, 8), P = randInt(r, 2, 8); return { prompt: `A ${K}-strike straddle costs ${C} (call) + ${P} (put). What is the upper breakeven at expiry?`, answer: K + C + P, explanation: 'K + total premium.' }; },
  deltaHedge: (r) => { const n = randInt(r, 5, 50), d = pick(r, [0.25, 0.4, 0.5, 0.6, 0.75]); return { prompt: `You are long ${n} call contracts (100 shares each) with delta ${d}. How many shares do you sell to be delta-neutral?`, answer: Math.round(n * d * 100), explanation: `${n} × ${d} × 100.` }; },
  intrinsic: (r) => { const S = randInt(r, 80, 120), K = pick(r, [90, 100, 110]), call = r() < 0.5; return { prompt: `What is the intrinsic value of a ${K}-strike ${call ? 'call' : 'put'} with the stock at ${S}?`, answer: Math.max(0, call ? S - K : K - S), explanation: call ? 'max(S − K, 0)' : 'max(K − S, 0)' }; },
  box: (r) => { const K1 = pick(r, [90, 95, 100]), w = pick(r, [5, 10, 15]); return { prompt: `Zero rates. What is a ${K1}/${K1 + w} box spread worth?`, answer: w, explanation: 'A box pays K₂ − K₁ in every state.' }; },
};

export const futuresDrills: Record<string, Gen> = {
  fair: (r) => { const S = randInt(r, 50, 200), rate = pick(r, [0.02, 0.03, 0.04, 0.06]), m = pick(r, [3, 6, 12]), D = pick(r, [0, 0, 1, 2]); const F = round(S * (1 + (rate * m) / 12) - D, 2);
    return { prompt: 'Simple carry: what is the fair futures price?', detail: `Spot ${S},  rate ${rate * 100}%,  ${m} months,  dividends paid before expiry ${D}`, answer: F, tolerance: { abs: 0.02 }, explanation: 'F = S(1 + r·t) − D.' }; },
  basis: (r) => { const S = randInt(r, 100, 300), F = S + randInt(r, -5, 8); return { prompt: `Spot is ${S} and the futures trade at ${F}. What is the basis (futures − spot)?`, answer: F - S }; },
  impliedRate: (r) => { const S = 100, m = pick(r, [3, 6, 12]), rate = pick(r, [2, 3, 4, 5, 6]); const F = round(S * (1 + (rate / 100) * (m / 12)), 2);
    return { prompt: `No dividends. Spot 100, ${m}-month futures ${F}. What annual simple rate (in %) is implied?`, answer: rate, tolerance: { abs: 0.05 }, unit: '%', explanation: 'r = (F/S − 1) / t.' }; },
  cashCarry: (r) => { const S = 100, m = 6, rate = 4, Ff = 102, Fm = Ff + randInt(r, 1, 4); return { prompt: `Fair futures is ${Ff} (spot ${S}, ${rate}% for ${m} months). The market futures is ${Fm}. Profit per unit from cash-and-carry at expiry?`, answer: Fm - Ff, explanation: 'Buy spot, sell futures, finance: earn market − fair.' }; },
  calendar: (r) => { const S = 200, rate = pick(r, [3, 6]), m1 = 3, m2 = pick(r, [6, 9, 12]); const v = round(S * (rate / 100) * ((m2 - m1) / 12), 2); return { prompt: `No dividends, simple carry. Spot ${S}, rate ${rate}%. Fair value of the ${m2}-month minus ${m1}-month calendar spread?`, answer: v, tolerance: { abs: 0.02 }, explanation: 'S·r·(t₂ − t₁).' }; },
};

export const predictionDrills: Record<string, Gen> = {
  decimalOdds: (r) => { const o = pick(r, [1.25, 1.5, 2, 2.5, 4, 5, 8]); return { prompt: `Decimal odds are ${o}. What implied probability (%) does that represent, ignoring margin?`, answer: round(100 / o, 2), tolerance: { abs: 0.1 }, unit: '%', explanation: '1 / odds.' }; },
  overround: (r) => { const p = [randInt(r, 20, 50), randInt(r, 20, 40), randInt(r, 15, 35)]; return { prompt: 'Three mutually exclusive outcomes have YES prices (¢) below. What is the overround in ¢ (sum − 100)?', detail: p.join('¢,  ') + '¢', answer: p[0] + p[1] + p[2] - 100 }; },
  normalise: (r) => { const p = [randInt(r, 30, 60), randInt(r, 20, 40), randInt(r, 10, 30)]; const s = p[0] + p[1] + p[2]; return { prompt: 'Normalise these YES prices into probabilities. What is the first outcome\'s probability (%)?', detail: p.join('¢,  ') + '¢', answer: round((100 * p[0]) / s, 2), tolerance: { abs: 0.2 }, unit: '%', explanation: 'price / sum of prices.' }; },
  ev: (r) => { const c = randInt(r, 10, 90), p = randInt(r, 5, 95); return { prompt: `A YES contract pays 100¢. It costs ${c}¢ and you believe the event is ${p}% likely. Expected profit per contract in ¢?`, answer: p - c, explanation: '100·p − price.' }; },
  bayesOdds: (r) => { const p0 = pick(r, [20, 25, 40, 50, 60]), lr = pick(r, [2, 3, 4]); const post = (p0 * lr) / (p0 * lr + (100 - p0)); return { prompt: `Prior ${p0}%. News arrives that is ${lr}× as likely under YES as under NO. Posterior probability (%)?`, answer: round(post * 100, 2), tolerance: { abs: 0.3 }, unit: '%', explanation: 'Posterior odds = prior odds × LR.' }; },
  kelly: (r) => { const c = pick(r, [20, 30, 40, 50]), p = c + pick(r, [5, 10, 15, 20]); return { prompt: `A YES contract costs ${c}¢ and you believe ${p}%. What Kelly fraction (%) of bankroll should you stake?`, answer: round((100 * (p - c)) / (100 - c), 2), tolerance: { abs: 0.3 }, unit: '%', explanation: 'f = (p − c)/(1 − c).' }; },
};

export function drillGenerator(bank: Record<string, Gen>) {
  return (rng: Rng, s: Settings): Question => {
    const q = bank[pick(rng, Object.keys(bank))](rng);
    const display = (Number.isInteger(q.answer) ? String(q.answer) : String(round(q.answer, 4))) + (q.unit === '%' ? '%' : '');
    return { ...q, display, choices: s.format === 'choice' ? makeChoices(rng, q.answer, Number.isInteger(q.answer) ? 'int' : 'decimal', 4, (c) => withinTolerance(c, q.answer, q.tolerance)) : undefined };
  };
}
