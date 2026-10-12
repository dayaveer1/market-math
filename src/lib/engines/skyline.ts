/** Skyline: a tower-rearrangement planning puzzle (Tower-of-London style). ORIGINAL implementation with BFS optimum. */
import { type Rng, shuffle, pick } from '../rng';

export type State = string[][]; // pegs, bottom → top
export const CAPACITY = [3, 2, 1];
export const key = (s: State) => s.map((p) => p.join('')).join('|');

export function legalMoves(s: State, cap = CAPACITY): [number, number][] {
  const m: [number, number][] = [];
  for (let a = 0; a < s.length; a++) for (let b = 0; b < s.length; b++)
    if (a !== b && s[a].length > 0 && s[b].length < cap[b]) m.push([a, b]);
  return m;
}
export function applyMove(s: State, [a, b]: [number, number]): State {
  const n = s.map((p) => p.slice());
  n[b].push(n[a].pop()!);
  return n;
}
export function minMoves(start: State, goal: State, cap = CAPACITY): number {
  const g = key(goal);
  const seen = new Set([key(start)]);
  let frontier = [start], d = 0;
  while (frontier.length) {
    if (frontier.some((s) => key(s) === g)) return d;
    const next: State[] = [];
    for (const s of frontier) for (const mv of legalMoves(s, cap)) {
      const t = applyMove(s, mv), k = key(t);
      if (!seen.has(k)) { seen.add(k); next.push(t); }
    }
    frontier = next; d++;
  }
  return -1;
}
export function allStates(colors: string[], cap = CAPACITY): State[] {
  const out: State[] = [];
  const perms = (arr: string[]): string[][] => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p])));
  for (const p of perms(colors))
    for (let a = 0; a <= cap[0]; a++) for (let b = 0; b <= cap[1]; b++) {
      const c = p.length - a - b;
      if (c < 0 || c > cap[2]) continue;
      out.push([p.slice(0, a), p.slice(a, a + b), p.slice(a + b)]);
    }
  return out;
}
export function generateProblem(rng: Rng, targetMoves: number): { start: State; goal: State; optimal: number } {
  const states = shuffle(rng, allStates(['R', 'G', 'B']));
  const start = states[0];
  const candidates = states.filter((s) => minMoves(start, s) === targetMoves);
  const goal = candidates.length ? pick(rng, candidates) : states[1];
  return { start, goal, optimal: minMoves(start, goal) };
}
