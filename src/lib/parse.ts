/**
 * Lenient numeric answer parser. Accepts: 12, -3.5, 1,250, 1/3, 2 1/2, 25%, 3k, 4.2m, 1.5b, 2e6, 3x10^5.
 * Returns null when the string cannot be read as a number.
 */
export function parseAnswer(raw: string): number | null {
  let s = raw.trim().toLowerCase().replace(/[\s_]+/g, ' ').replace(/,/g, '').replace(/^\$/, '');
  if (!s) return null;
  const pct = s.endsWith('%');
  if (pct) s = s.slice(0, -1).trim();
  let v: number | null = null;
  const sci = s.match(/^(-?\d*\.?\d+)\s*[x*×]\s*10\^(-?\d+)$/);
  if (sci) v = parseFloat(sci[1]) * 10 ** parseInt(sci[2], 10);
  const mixed = s.match(/^(-?)(\d+) (\d+)\/(\d+)$/);
  if (v === null && mixed) {
    const d = parseInt(mixed[4], 10);
    if (d === 0) return null;
    v = (parseInt(mixed[2], 10) + parseInt(mixed[3], 10) / d) * (mixed[1] ? -1 : 1);
  }
  const frac = s.match(/^(-?\d*\.?\d+)\s*\/\s*(-?\d*\.?\d+)$/);
  if (v === null && frac) {
    const d = parseFloat(frac[2]);
    if (d === 0) return null;
    v = parseFloat(frac[1]) / d;
  }
  const suf = s.match(/^(-?\d*\.?\d+(?:e[+-]?\d+)?)\s*(k|m|mm|bn|b|t|tn)?$/);
  if (v === null && suf) {
    const mult: Record<string, number> = { k: 1e3, m: 1e6, mm: 1e6, b: 1e9, bn: 1e9, t: 1e12, tn: 1e12 };
    v = parseFloat(suf[1]) * (suf[2] ? mult[suf[2]] : 1);
  }
  if (v === null || !Number.isFinite(v)) return null;
  return pct ? v / 100 : v;
}

export interface Tolerance { abs?: number; rel?: number; ratio?: number }

/** True when `given` is within any of the supplied tolerances of `expected` (exact match if none given). */
export function withinTolerance(given: number, expected: number, tol: Tolerance = {}): boolean {
  const eps = 1e-9;
  if (Math.abs(given - expected) <= eps + (tol.abs ?? 0)) return true;
  if (tol.rel !== undefined && Math.abs(given - expected) <= Math.abs(expected) * tol.rel + eps) return true;
  if (tol.ratio !== undefined && given > 0 && expected > 0) {
    return Math.abs(Math.log10(given / expected)) <= Math.log10(tol.ratio) + eps;
  }
  return false;
}

export function fmtNum(x: number, dp = 3): string {
  if (!Number.isFinite(x)) return String(x);
  const ax = Math.abs(x);
  if (ax !== 0 && (ax >= 1e9 || ax < 1e-3)) return x.toExponential(3).replace('e+', 'e');
  const r = Math.round(x * 10 ** dp) / 10 ** dp;
  return r.toLocaleString('en-US', { maximumFractionDigits: dp });
}
export const fmtMoney = (x: number, dp = 2) =>
  (x < 0 ? '−$' : '$') + Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const fmtSigned = (x: number, dp = 2) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(dp);
