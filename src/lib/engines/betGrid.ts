/**
 * Bet Grid. Reference: a public one-line description of a timed "grid game where you price and compare bets against a
 * winning row" (Akuna Capital trader assessment practice). Everything else is an ORIGINAL design:
 * a 3×3 grid of fair dice, some revealed. The winning row is the row with the strictly highest sum (a tie for top = no winner).
 * Several bets are offered at stated odds; decide which have positive expected value. Probabilities are exact (enumeration).
 */
import { type Rng, randInt, sample, shuffle, pick, round } from '../rng';

export const ROWS = 3, COLS = 3;
export type BetKind = { type: 'rowWins'; row: number } | { type: 'rowAtLeast'; row: number; k: number } | { type: 'noWinner' } | { type: 'totalOver'; k: number };
export interface Bet { kind: BetKind; odds: number; text: string }
export interface GridRound { dice: number[]; revealed: boolean[]; bets: Bet[] }

export function winningRow(dice: number[]): number | null {
  const sums = Array.from({ length: ROWS }, (_, r) => dice.slice(r * COLS, r * COLS + COLS).reduce((a, b) => a + b, 0));
  const m = Math.max(...sums);
  return sums.filter((s) => s === m).length === 1 ? sums.indexOf(m) : null;
}
export function betWins(k: BetKind, dice: number[]): boolean {
  const rowSum = (r: number) => dice.slice(r * COLS, r * COLS + COLS).reduce((a, b) => a + b, 0);
  switch (k.type) {
    case 'rowWins': return winningRow(dice) === k.row;
    case 'rowAtLeast': return rowSum(k.row) >= k.k;
    case 'noWinner': return winningRow(dice) === null;
    case 'totalOver': return dice.reduce((a, b) => a + b, 0) > k.k;
  }
}
/** Exact win probability of each bet by enumerating all hidden-dice outcomes. */
export function betProbabilities(dice: number[], revealed: boolean[], kinds: BetKind[]): number[] {
  const hidden = revealed.map((r, i) => (r ? -1 : i)).filter((i) => i >= 0);
  const wins = kinds.map(() => 0);
  const cur = dice.slice();
  const total = 6 ** hidden.length;
  for (let n = 0; n < total; n++) {
    let x = n;
    for (const i of hidden) { cur[i] = (x % 6) + 1; x = Math.floor(x / 6); }
    kinds.forEach((k, j) => { if (betWins(k, cur)) wins[j]++; });
  }
  return wins.map((w) => w / total);
}
/** EV per 1 unit staked at odds X:1 (win X, lose 1). */
export const betEV = (p: number, odds: number) => p * odds - (1 - p);
export const fairOdds = (p: number) => (p > 0 ? (1 - p) / p : Infinity);

function describe(k: BetKind): string {
  switch (k.type) {
    case 'rowWins': return `Row ${k.row + 1} wins outright`;
    case 'rowAtLeast': return `Row ${k.row + 1} totals ${k.k} or more`;
    case 'noWinner': return 'Tie for the top row (no winner)';
    case 'totalOver': return `Grid total over ${k.k}`;
  }
}
export function generateGridRound(rng: Rng, nRevealed: number, nBets: number): GridRound & { probs: number[] } {
  const dice = Array.from({ length: ROWS * COLS }, () => randInt(rng, 1, 6));
  const rev = new Set(sample(rng, dice.map((_, i) => i), Math.max(3, Math.min(9, nRevealed))));
  const revealed = dice.map((_, i) => rev.has(i));
  const pool: BetKind[] = shuffle(rng, [
    { type: 'rowWins', row: 0 }, { type: 'rowWins', row: 1 }, { type: 'rowWins', row: 2 },
    { type: 'rowAtLeast', row: randInt(rng, 0, 2), k: randInt(rng, 9, 14) }, { type: 'noWinner' }, { type: 'totalOver', k: randInt(rng, 28, 35) },
  ]);
  const kinds = pool.slice(0, nBets);
  const probs = betProbabilities(dice, revealed, kinds);
  const bets = kinds.map((k, i) => {
    const p = probs[i];
    const fo = p <= 0.001 ? 50 : p >= 0.999 ? 0.05 : fairOdds(p);
    const mult = pick(rng, [0.7, 0.8, 1.2, 1.35, 1.5]);
    let odds = Math.max(0.1, round(fo * mult, 1));
    // Rounding can land on (or next to) fair odds; push away so every bet is clearly +EV or −EV.
    let dir = mult < 1 ? -1 : 1;
    for (let k = 0; k < 100 && Math.abs(betEV(p, odds)) < 0.01; k++) {
      if (dir < 0 && odds <= 0.1) dir = 1;
      odds = round(Math.max(0.1, odds + 0.1 * dir), 1);
    }
    return { kind: k, odds, text: `${describe(k)} — pays ${odds}:1` };
  });
  return { dice, revealed, bets, probs };
}
