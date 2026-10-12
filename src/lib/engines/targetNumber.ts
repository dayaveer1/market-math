/** Target Number: combine four numbers with + − × ÷ to reach a target. Includes an exact solver and a safe evaluator. */
import { type Rng, randInt, pick } from '../rng';

type Item = { v: number; e: string };
const EPS = 1e-9;

/** All values reachable using every number exactly once (exact for small integers within floating precision). */
export function solve(nums: number[], target: number): string | null {
  const rec = (items: Item[]): string | null => {
    if (items.length === 1) return Math.abs(items[0].v - target) < EPS ? items[0].e : null;
    for (let i = 0; i < items.length; i++)
      for (let j = 0; j < items.length; j++) {
        if (i === j) continue;
        const a = items[i], b = items[j];
        const rest = items.filter((_, k) => k !== i && k !== j);
        const cands: Item[] = [{ v: a.v + b.v, e: `(${a.e}+${b.e})` }, { v: a.v - b.v, e: `(${a.e}-${b.e})` }, { v: a.v * b.v, e: `(${a.e}*${b.e})` }];
        if (Math.abs(b.v) > EPS) cands.push({ v: a.v / b.v, e: `(${a.e}/${b.e})` });
        for (const c of cands) { const r = rec([...rest, c]); if (r) return r; }
      }
    return null;
  };
  const r = rec(nums.map((n) => ({ v: n, e: String(n) })));
  return r ? stripOuter(r) : null;
}
const stripOuter = (s: string) => (s.startsWith('(') && s.endsWith(')') ? s.slice(1, -1) : s);

export function reachableTargets(nums: number[], lo: number, hi: number): number[] {
  const out = new Set<number>();
  const rec = (vals: number[]) => {
    if (vals.length === 1) { const v = vals[0]; if (Math.abs(v - Math.round(v)) < EPS && v >= lo && v <= hi) out.add(Math.round(v)); return; }
    for (let i = 0; i < vals.length; i++) for (let j = 0; j < vals.length; j++) {
      if (i === j) continue;
      const a = vals[i], b = vals[j], rest = vals.filter((_, k) => k !== i && k !== j);
      rec([...rest, a + b]); rec([...rest, a - b]); rec([...rest, a * b]); if (Math.abs(b) > EPS) rec([...rest, a / b]);
    }
  };
  rec(nums);
  return Array.from(out).sort((a, b) => a - b);
}

export function generatePuzzle(rng: Rng, maxNum: number, lo: number, hi: number): { nums: number[]; target: number } {
  for (let tries = 0; tries < 50; tries++) {
    const nums = Array.from({ length: 4 }, () => randInt(rng, 1, maxNum));
    const t = reachableTargets(nums, lo, hi).filter((x) => !nums.includes(x));
    if (t.length) return { nums, target: pick(rng, t) };
  }
  return { nums: [2, 3, 4, 6], target: 24 };
}

/** Tokenise and evaluate + − × ÷ with parentheses. Returns value and the literal numbers used. */
export function evaluate(expr: string): { value: number; numbers: number[] } {
  const src = expr.replace(/×|x/gi, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
  if (!/^[0-9+\-*/().]+$/.test(src)) throw new Error('Use only numbers, + − × ÷ and brackets.');
  let pos = 0;
  const numbers: number[] = [];
  const peek = () => src[pos];
  const expr_ = (): number => { let v = term(); while (peek() === '+' || peek() === '-') { const op = src[pos++]; const r = term(); v = op === '+' ? v + r : v - r; } return v; };
  const term = (): number => { let v = factor(); while (peek() === '*' || peek() === '/') { const op = src[pos++]; const r = factor(); if (op === '/' && Math.abs(r) < EPS) throw new Error('Division by zero.'); v = op === '*' ? v * r : v / r; } return v; };
  const factor = (): number => {
    if (peek() === '(') { pos++; const v = expr_(); if (src[pos++] !== ')') throw new Error('Unbalanced brackets.'); return v; }
    const m = src.slice(pos).match(/^\d+(\.\d+)?/);
    if (!m) throw new Error('Expected a number.');
    pos += m[0].length; const n = parseFloat(m[0]); numbers.push(n); return n;
  };
  const value = expr_();
  if (pos !== src.length) throw new Error('Unexpected characters.');
  return { value, numbers };
}
export function checkSolution(expr: string, nums: number[], target: number): { ok: boolean; reason?: string } {
  let res: { value: number; numbers: number[] };
  try { res = evaluate(expr); } catch (e) { return { ok: false, reason: (e as Error).message }; }
  const a = res.numbers.slice().sort((x, y) => x - y).join(','), b = nums.slice().sort((x, y) => x - y).join(',');
  if (a !== b) return { ok: false, reason: 'Use each of the four numbers exactly once.' };
  if (Math.abs(res.value - target) > 1e-6) return { ok: false, reason: `That makes ${Math.round(res.value * 1000) / 1000}, not ${target}.` };
  return { ok: true };
}
