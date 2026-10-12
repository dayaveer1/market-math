/**
 * Original question families used by trainers and the timed assessments.
 * Every family returns exact answers computed in code. Levels: easy | medium | hard.
 */
import { type Rng, randInt, pick, shuffle, round } from '../rng';
import type { Question } from '../types';
import { choose, gcd, makeChoices } from './quizUtil';
import { generateArithmetic } from './mathTrainer';
import { generateSequence } from './sequence';
import { generateProbability } from './probability';
import { FERMI_BANK, pointCredit } from './fermi';
import { fmtNum, withinTolerance } from '../parse';

export type Level = 'easy' | 'medium' | 'hard';
type Fam = (r: Rng, level: Level) => Omit<Question, 'display'> & { display?: string };
const lv = <T,>(l: Level, e: T, m: T, h: T): T => (l === 'easy' ? e : l === 'medium' ? m : h);

/* ---------- numerical ---------- */
const decimals: Fam = (r, l) => {
  const dp = lv(l, 1, 2, 2);
  const a = randInt(r, 1, lv(l, 99, 999, 9999)) / 10 ** dp, b = randInt(r, 1, lv(l, 99, 99, 999)) / 10 ** dp;
  const op = pick(r, ['+', '−', '×'] as const);
  const ans = op === '+' ? a + b : op === '−' ? a - b : a * b;
  return { prompt: `${a} ${op} ${b} =`, answer: round(ans, 6), tolerance: { abs: 1e-6 } };
};
const fractionOps: Fam = (r, l) => {
  const D = lv(l, [2, 3, 4, 5, 6, 8], [3, 4, 5, 6, 7, 8, 9, 12], [6, 7, 9, 11, 12, 13, 15]);
  const b = pick(r, D), d = pick(r, D), a = randInt(r, 1, b - 1 || 1), c = randInt(r, 1, d - 1 || 1);
  const op = pick(r, ['+', '−', '×', '÷'] as const);
  const num = op === '+' ? a * d + c * b : op === '−' ? a * d - c * b : op === '×' ? a * c : a * d;
  const den = op === '+' || op === '−' ? b * d : op === '×' ? b * d : b * c;
  const g = gcd(num, den) || 1;
  return { prompt: `${a}/${b} ${op} ${c}/${d} =`, answer: num / den, tolerance: { abs: 0.001 }, display: `${num / g}/${den / g} (${(num / den).toFixed(4)})`, explanation: 'Fractions or decimals (to 3 dp) are accepted.' };
};
const percent: Fam = (r, l) => {
  const kind = pick(r, ['of', 'change', 'reverse'] as const);
  if (kind === 'of') { const p = pick(r, lv(l, [10, 20, 25, 50, 75], [5, 12.5, 15, 35, 60], [3.5, 7.5, 17.5, 33, 62.5])), x = randInt(r, 2, lv(l, 40, 200, 999)) * 10; return { prompt: `${p}% of ${x} =`, answer: round((p * x) / 100, 6), tolerance: { abs: 0.001 } }; }
  if (kind === 'change') { const a = randInt(r, 20, 400), b = a + randInt(r, -a + 1, a); return { prompt: `Percentage change from ${a} to ${b} (in %) =`, answer: round(((b - a) / a) * 100, 4), tolerance: { abs: 0.05 }, unit: '%' }; }
  const p = pick(r, [10, 20, 25, 50]), base = randInt(r, 2, 50) * 4; return { prompt: `A price rises ${p}% to ${base * (1 + p / 100)}. Original price =`, answer: base, tolerance: { abs: 0.001 } };
};
const largeMult: Fam = (r, l) => { const a = randInt(r, lv(l, 11, 101, 201), lv(l, 99, 999, 999)), b = randInt(r, lv(l, 11, 11, 101), lv(l, 19, 99, 999)); return { prompt: `${a} × ${b} =`, answer: a * b }; };
const arithmetic: Fam = (r, l) => { const q = generateArithmetic(r, { level: l }); return { prompt: q.prompt, answer: q.answer }; };
const wordProblem: Fam = (r, l) => {
  const t = randInt(r, 0, 3);
  if (t === 0) { const v = randInt(r, 40, 120), h = pick(r, [1.5, 2, 2.5, 3, 0.75]); return { prompt: `A train travels at ${v} km/h for ${h} hours. Distance in km?`, answer: v * h }; }
  if (t === 1) { const n = randInt(r, 3, 9), p = randInt(r, 12, 60) / 4; return { prompt: `${n} items cost ${round(n * p, 2)} in total. Cost of ${n + 3} items?`, answer: round((n + 3) * p, 4), tolerance: { abs: 0.01 } }; }
  if (t === 2) { const a = randInt(r, 2, 6), b = randInt(r, 2, 6); return { prompt: `One worker finishes a job in ${a} hours, another in ${b} hours. Together, hours needed?`, answer: (a * b) / (a + b), tolerance: { abs: 0.01 } }; }
  const x = randInt(r, 100, 900) * 10, rate = lv(l, 10, 5, 4), yrs = lv(l, 2, 3, 3); return { prompt: `${x} grows at ${rate}% a year, compounded annually. Value after ${yrs} years?`, answer: round(x * (1 + rate / 100) ** yrs, 4), tolerance: { abs: 0.5 } };
};

/* ---------- probability (hard) ---------- */
export function stopOptimalEV(rolls: number, sides = 6): number {
  let v = (sides + 1) / 2;
  for (let k = 2; k <= rolls; k++) { let s = 0; for (let f = 1; f <= sides; f++) s += Math.max(f, v); v = s / sides; }
  return v;
}
export const harmonic = (n: number) => Array.from({ length: n }, (_, i) => 1 / (i + 1)).reduce((a, b) => a + b, 0);
export function derangements(n: number): number { const d = [1, 0]; for (let i = 2; i <= n; i++) d[i] = (i - 1) * (d[i - 1] + d[i - 2]); return d[n]; }
const fib = (n: number) => { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; };
export function ruin(p: number, i: number, N: number): number { if (p === 0.5) return i / N; const q = (1 - p) / p; return (q ** i - 1) / (q ** N - 1); }
const probHard: Fam = (r) => {
  const t = randInt(r, 0, 9);
  switch (t) {
    case 0: { const m = randInt(r, 1, 3), p = m / 6; return { prompt: `A fair die is rolled until a face from a fixed set of ${m} face${m > 1 ? 's' : ''} appears twice in a row. Expected number of rolls?`, answer: (1 + p) / p ** 2, tolerance: { abs: 0.01 }, explanation: 'E = (1 + p)/p².' }; }
    case 1: { const n = randInt(r, 2, 6); return { prompt: `What is the expected maximum of ${n} independent Uniform(0,1) draws?`, answer: n / (n + 1), tolerance: { abs: 0.001 }, explanation: 'n/(n+1).' }; }
    case 2: { const k = randInt(r, 2, 4); return { prompt: `You may roll a fair die up to ${k} times and keep the last roll. Optimal expected payout?`, answer: stopOptimalEV(k), tolerance: { abs: 0.01 }, explanation: 'Backward induction: keep a roll only if it beats the continuation value.' }; }
    case 3: { const i = randInt(r, 2, 6), N = i + randInt(r, 2, 6), p = pick(r, [0.4, 0.5, 0.6]); return { prompt: `A gambler with ${i} chips bets 1 per round, winning with probability ${p}. Probability of reaching ${N} chips before 0?`, answer: ruin(p, i, N), tolerance: { abs: 0.005 }, explanation: p === 0.5 ? 'Fair game: i/N.' : '((q/p)^i − 1)/((q/p)^N − 1).' }; }
    case 4: { const n = pick(r, [4, 6, 8]); return { prompt: `Expected number of rolls of a fair ${n}-sided die to see every face at least once?`, answer: n * harmonic(n), tolerance: { abs: 0.01 }, explanation: 'Coupon collector: n·H(n).' }; }
    case 5: { const n = randInt(r, 3, 10); return { prompt: `${n} fair coins are flipped in a row. Probability that no two consecutive coins are both heads?`, answer: fib(n + 2) / 2 ** n, tolerance: { abs: 0.002 }, explanation: `F(${n + 2})/2^${n}.` }; }
    case 6: { const s = randInt(r, 8, 11); let num = 0, den = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a === 6 || b === 6) { den++; if (a + b >= s) num++; } return { prompt: `Two dice are rolled and at least one shows a 6. Probability the sum is at least ${s}?`, answer: num / den, tolerance: { abs: 0.002 }, explanation: `${num}/${den}.` }; }
    case 7: { const n = randInt(r, 3, 7); return { prompt: `${n} letters are put into ${n} addressed envelopes at random. Probability no letter is in its own envelope?`, answer: derangements(n) / Array.from({ length: n }, (_, i) => i + 1).reduce((a, b) => a * b, 1), tolerance: { abs: 0.002 }, explanation: '!n / n!.' }; }
    case 8: { const N = pick(r, [20, 30, 52]), m = pick(r, [2, 4, 5]); return { prompt: `A shuffled deck of ${N} cards contains ${m} aces. Expected position of the first ace?`, answer: (N + 1) / (m + 1), tolerance: { abs: 0.01 }, explanation: '(N + 1)/(m + 1).' }; }
    default: { const k = randInt(r, 10, 40); let p = 1; for (let i = 0; i < k; i++) p *= (365 - i) / 365; return { prompt: `Probability that at least two of ${k} people share a birthday (365 equally likely days)?`, answer: 1 - p, tolerance: { abs: 0.005 } }; }
  }
};
const probability: Fam = (r, l) => { const q = generateProbability(r, { level: l }); return { prompt: q.prompt, answer: q.answer, tolerance: q.tolerance, explanation: q.explanation }; };

/* ---------- combinatorics ---------- */
export function multinomialWord(w: string): number {
  const counts: Record<string, number> = {};
  for (const c of w) counts[c] = (counts[c] ?? 0) + 1;
  let r = 1; for (let i = 2; i <= w.length; i++) r *= i;
  for (const c of Object.values(counts)) for (let i = 2; i <= c; i++) r /= i;
  return Math.round(r);
}
const combinatorics: Fam = (r) => {
  const t = randInt(r, 0, 5);
  if (t === 0) { const a = randInt(r, 2, 6), b = randInt(r, 2, 6); return { prompt: `Moving only right or up, how many shortest paths cross a ${a}×${b} grid from corner to corner?`, answer: choose(a + b, a), explanation: `C(${a + b},${a}).` }; }
  if (t === 1) { const n = randInt(r, 5, 9), k = randInt(r, 2, 3), m = randInt(r, 4, 7), j = randInt(r, 1, 2); return { prompt: `Choose a committee of ${k} from ${n} traders and ${j} from ${m} quants. How many committees?`, answer: choose(n, k) * choose(m, j) }; }
  if (t === 2) { const w = pick(r, ['LEVEL', 'BANANA', 'PEPPER', 'STATS', 'ARRAY', 'COFFEE', 'LETTER']); return { prompt: `How many distinct arrangements of the letters of ${w}?`, answer: multinomialWord(w), explanation: 'n! divided by the factorial of each repeat count.' }; }
  if (t === 3) { const n = randInt(r, 4, 8); return { prompt: `In how many ways can ${n} people sit around a round table (rotations count as the same)?`, answer: Array.from({ length: n - 1 }, (_, i) => i + 1).reduce((a, b) => a * b, 1), explanation: '(n − 1)!' }; }
  if (t === 4) { const n = randInt(r, 4, 10), k = randInt(r, 2, 4); return { prompt: `In how many ways can ${n} identical chips be split among ${k} distinct players (zero allowed)?`, answer: choose(n + k - 1, k - 1), explanation: 'Stars and bars: C(n + k − 1, k − 1).' }; }
  const n = randInt(r, 5, 12); return { prompt: `${n} traders each shake hands with every other exactly once. How many handshakes?`, answer: choose(n, 2) };
};

/* ---------- statistics ---------- */
const statistics: Fam = (r) => {
  const t = randInt(r, 0, 5);
  const xs = Array.from({ length: randInt(r, 5, 7) }, () => randInt(r, 1, 20));
  if (t === 0) return { prompt: `Mean of: ${xs.join(', ')}`, answer: xs.reduce((a, b) => a + b, 0) / xs.length, tolerance: { abs: 0.01 } };
  if (t === 1) { const s = xs.slice().sort((a, b) => a - b); const m = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; return { prompt: `Median of: ${xs.join(', ')}`, answer: m, tolerance: { abs: 0.001 } }; }
  if (t === 2) { const ys = xs.slice(0, 4); const mu = ys.reduce((a, b) => a + b, 0) / 4; return { prompt: `Population variance of: ${ys.join(', ')}`, answer: ys.reduce((a, b) => a + (b - mu) ** 2, 0) / 4, tolerance: { abs: 0.01 } }; }
  if (t === 3) { const a = randInt(r, 2, 5), b = randInt(r, -10, 10), s = randInt(r, 2, 6); return { prompt: `X has standard deviation ${s}. What is the standard deviation of ${a}X ${b >= 0 ? '+' : '−'} ${Math.abs(b)}?`, answer: a * s }; }
  if (t === 4) { const s1 = randInt(r, 3, 6), s2 = randInt(r, 3, 6); return { prompt: `X and Y are independent with standard deviations ${s1} and ${s2}. Standard deviation of X − Y?`, answer: Math.sqrt(s1 ** 2 + s2 ** 2), tolerance: { abs: 0.01 }, explanation: 'Variances add for independent variables, even for a difference.' }; }
  const sx = randInt(r, 2, 5), sy = randInt(r, 2, 5), rho = pick(r, [0.2, 0.5, -0.4, 0.8]); return { prompt: `Corr(X,Y) = ${rho}, SD(X) = ${sx}, SD(Y) = ${sy}. Cov(X,Y)?`, answer: round(rho * sx * sy, 6), tolerance: { abs: 0.01 } };
};

/* ---------- logic (option answers) ---------- */
const NAMES = ['Ava', 'Ben', 'Cai', 'Dee', 'Eli', 'Fay'];
const logic: Fam = (r, l) => {
  const n = lv(l, 4, 5, 6);
  const order = shuffle(r, NAMES.slice(0, n)); // tallest first
  const clues = shuffle(r, order.slice(0, -1).map((x, i) => `${x} is taller than ${order[i + 1]}.`));
  const k = randInt(r, 1, n);
  const opts = shuffle(r, order.slice());
  return { prompt: `${clues.join(' ')} Who is ${k === 1 ? 'the tallest' : k === n ? 'the shortest' : `number ${k} in height (tallest = 1)`}?`, options: opts, answer: opts.indexOf(order[k - 1]), display: order[k - 1] };
};
const ANALOGIES: [string, string, string, string, string[]][] = [
  ['Hot', 'Cold', 'Up', 'Down', ['Over', 'High', 'Sky']], ['Bird', 'Nest', 'Bee', 'Hive', ['Honey', 'Flower', 'Wing']], ['Author', 'Novel', 'Composer', 'Symphony', ['Piano', 'Concert', 'Note']],
  ['Glove', 'Hand', 'Sock', 'Foot', ['Shoe', 'Toe', 'Wool']], ['Seed', 'Tree', 'Egg', 'Bird', ['Shell', 'Yolk', 'Nest']], ['Thermometer', 'Temperature', 'Scale', 'Weight', ['Fish', 'Music', 'Height']],
  ['Ink', 'Pen', 'Paint', 'Brush', ['Canvas', 'Colour', 'Wall']], ['Lock', 'Key', 'Problem', 'Solution', ['Door', 'Puzzle', 'Question']], ['Day', 'Night', 'Bull market', 'Bear market', ['Stock', 'Rally', 'Profit']],
  ['Bid', 'Buy', 'Offer', 'Sell', ['Price', 'Spread', 'Quote']], ['Captain', 'Ship', 'Pilot', 'Aircraft', ['Runway', 'Sky', 'Crew']], ['Drought', 'Rain', 'Famine', 'Food', ['Hunger', 'Crop', 'Farm']],
  ['Chapter', 'Book', 'Scene', 'Play', ['Actor', 'Stage', 'Script']], ['Minute', 'Hour', 'Month', 'Year', ['Week', 'Day', 'Calendar']], ['Fragile', 'Break', 'Flammable', 'Burn', ['Fire', 'Smoke', 'Heat']],
  ['Wheel', 'Car', 'Wing', 'Plane', ['Feather', 'Engine', 'Fly']], ['Teacher', 'School', 'Doctor', 'Hospital', ['Patient', 'Medicine', 'Nurse']], ['Square', 'Cube', 'Circle', 'Sphere', ['Ring', 'Cone', 'Round']],
  ['Hungry', 'Eat', 'Tired', 'Sleep', ['Bed', 'Yawn', 'Night']], ['Dividend', 'Share', 'Coupon', 'Bond', ['Interest', 'Yield', 'Bank']], ['Oak', 'Acorn', 'Apple', 'Pip', ['Core', 'Tree', 'Fruit']],
  ['Volume', 'Litre', 'Distance', 'Metre', ['Road', 'Speed', 'Map']], ['Brave', 'Coward', 'Generous', 'Miser', ['Gift', 'Rich', 'Kind']], ['Spider', 'Web', 'Beaver', 'Dam', ['River', 'Tail', 'Wood']],
];
const analogy: Fam = (r) => {
  const [a, b, c, d, distractors] = pick(r, ANALOGIES);
  const opts = shuffle(r, [d, ...distractors]);
  return { prompt: `${a} is to ${b} as ${c} is to …`, options: opts, answer: opts.indexOf(d), display: d };
};
const pattern: Fam = (r, l) => {
  const t = randInt(r, 0, 2);
  if (t === 0) { const cyc = shuffle(r, ['▲', '■', '●', '◆', '★']).slice(0, lv(l, 3, 4, 4)); const len = cyc.length * 2 + randInt(r, 0, cyc.length - 1); const seq = Array.from({ length: len }, (_, i) => cyc[i % cyc.length]); const ans = cyc[len % cyc.length]; const opts = shuffle(r, Array.from(new Set([ans, ...cyc, '✚'])).slice(0, 4)); if (!opts.includes(ans)) opts[0] = ans; return { prompt: `${seq.join(' ')} ?`, options: opts, answer: opts.indexOf(ans), display: ans }; }
  if (t === 1) { const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']; const step = pick(r, lv(l, [2], [1, 2, 3], [3, 5])); const s0 = randInt(r, 0, 7); const seq = Array.from({ length: 5 }, (_, i) => arrows[(s0 + i * step) % 8]); const ans = arrows[(s0 + 5 * step) % 8]; const opts = shuffle(r, Array.from(new Set([ans, ...shuffle(r, arrows)])).slice(0, 4)); return { prompt: `${seq.join('  ')}  ?`, options: opts, answer: opts.indexOf(ans), display: ans }; }
  const a = randInt(r, 1, 2), d = randInt(r, 1, 2); const seq = Array.from({ length: 4 }, (_, i) => '●'.repeat(a + i * d)); const ans = '●'.repeat(a + 4 * d); const opts = shuffle(r, [ans, '●'.repeat(a + 4 * d - 1), '●'.repeat(a + 4 * d + 1), '●'.repeat(a + 3 * d + 2 * d)]).filter((x, i, arr) => arr.indexOf(x) === i); return { prompt: `${seq.join('   ')}   ?`, options: opts, answer: opts.indexOf(ans), display: ans };
};

/* ---------- equity research ---------- */
const equity: Fam = (r) => {
  const t = randInt(r, 0, 5);
  if (t === 0) { const eps = randInt(r, 10, 80) / 10, pe = randInt(r, 8, 30); return { prompt: `EPS is ${eps}. At a P/E of ${pe}, what is the share price?`, answer: round(eps * pe, 4), tolerance: { abs: 0.01 } }; }
  if (t === 1) { const rev = randInt(r, 200, 900), m = randInt(r, 5, 35); return { prompt: `Revenue ${rev}m, operating margin ${m}%. Operating profit (m)?`, answer: (rev * m) / 100, tolerance: { abs: 0.01 } }; }
  if (t === 2) { const a = randInt(r, 100, 300), g = pick(r, [5, 10, 20]), n = 2; const b = round(a * (1 + g / 100) ** n, 2); return { prompt: `Revenue grew from ${a} to ${b} over ${n} years. Annual growth rate (CAGR, %)?`, answer: g, tolerance: { abs: 0.1 }, unit: '%' }; }
  if (t === 3) { const ebitda = randInt(r, 50, 300), mult = randInt(r, 5, 14), debt = randInt(r, 50, 400), cash = randInt(r, 10, 100); return { prompt: `EBITDA ${ebitda}m, EV/EBITDA ${mult}×, debt ${debt}m, cash ${cash}m. Equity value (m)?`, answer: ebitda * mult - debt + cash, explanation: 'Equity = EV − net debt.' }; }
  if (t === 4) { const div = randInt(r, 5, 40) / 10, px = randInt(r, 20, 120); return { prompt: `Annual dividend ${div}, share price ${px}. Dividend yield (%)?`, answer: round((div / px) * 100, 4), tolerance: { abs: 0.05 }, unit: '%' }; }
  const ni = randInt(r, 50, 400), sh = randInt(r, 20, 200); return { prompt: `Net income ${ni}m and ${sh}m shares outstanding. EPS?`, answer: round(ni / sh, 4), tolerance: { abs: 0.01 } };
};

/* ---------- estimation ---------- */
const estimation: Fam = (r) => { const it = pick(r, FERMI_BANK); return { prompt: it.q, answer: it.answer, credit: (g) => pointCredit(g, it.answer), display: fmtNum(it.answer, 2), explanation: it.note }; };
const sequence: Fam = (r, l) => { const q = generateSequence(r, { level: l, length: 5 }); return { prompt: q.prompt, answer: q.answer, explanation: q.explanation }; };

export const FAMILIES: Record<string, { label: string; gen: Fam; numericChoices: 'int' | 'decimal' }> = {
  arithmetic: { label: 'Arithmetic', gen: arithmetic, numericChoices: 'int' },
  decimals: { label: 'Decimals', gen: decimals, numericChoices: 'decimal' },
  fractions: { label: 'Fractions', gen: fractionOps, numericChoices: 'decimal' },
  percent: { label: 'Percentages', gen: percent, numericChoices: 'decimal' },
  largeMult: { label: 'Large multiplication', gen: largeMult, numericChoices: 'int' },
  wordProblem: { label: 'Numerical reasoning', gen: wordProblem, numericChoices: 'decimal' },
  sequence: { label: 'Sequences', gen: sequence, numericChoices: 'int' },
  probability: { label: 'Probability', gen: probability, numericChoices: 'decimal' },
  probHard: { label: 'Advanced probability & EV', gen: probHard, numericChoices: 'decimal' },
  combinatorics: { label: 'Combinatorics', gen: combinatorics, numericChoices: 'int' },
  statistics: { label: 'Statistics', gen: statistics, numericChoices: 'decimal' },
  logic: { label: 'Logical deduction', gen: logic, numericChoices: 'int' },
  analogy: { label: 'Verbal analogies', gen: analogy, numericChoices: 'int' },
  pattern: { label: 'Pattern recognition', gen: pattern, numericChoices: 'int' },
  equity: { label: 'Equity analysis', gen: equity, numericChoices: 'decimal' },
  estimation: { label: 'Estimation', gen: estimation, numericChoices: 'decimal' },
};

/** Generate one question from a weighted family mix. */
export function generateFromMix(r: Rng, mix: Record<string, number>, level: Level, format: 'typed' | 'choice'): Question {
  const entries = Object.entries(mix).filter(([k, w]) => w > 0 && FAMILIES[k]);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = r() * total, fam = entries[0][0];
  for (const [k, w] of entries) { if ((x -= w) < 0) { fam = k; break; } }
  const f = FAMILIES[fam];
  const q = f.gen(r, level);
  const display = q.display ?? (Number.isInteger(q.answer) ? String(q.answer) : String(round(q.answer, 4))) + (q.unit === '%' ? '%' : '');
  const choices = format === 'choice' && !q.options && !q.credit ? makeChoices(r, q.answer, f.numericChoices === 'int' && Number.isInteger(q.answer) ? 'int' : 'decimal', 4, (c) => withinTolerance(c, q.answer, q.tolerance)) : undefined;
  return { ...q, display, family: fam, choices };
}
