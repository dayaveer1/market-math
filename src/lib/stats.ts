/** Pure analytics over session records (unit-testable, no React). */
import type { Difficulty, GameMeta, PresetLevel } from './types';
import type { SessionRecord } from './store';

export function forGame(records: SessionRecord[], gameId: string, difficulty?: Difficulty) {
  return records.filter((r) => r.gameId === gameId && (!difficulty || r.difficulty === difficulty));
}
export function best(records: SessionRecord[], meta: GameMeta, difficulty?: Difficulty): number | null {
  const rs = forGame(records, meta.id, difficulty);
  if (!rs.length) return null;
  const xs = rs.map((r) => r.result.score);
  return meta.higherIsBetter ? Math.max(...xs) : Math.min(...xs);
}
export function accuracy(records: SessionRecord[]): number | null {
  let c = 0, t = 0;
  for (const r of records) if (r.result.total) { c += r.result.correct ?? 0; t += r.result.total; }
  return t ? c / t : null;
}
export function avgResponseMs(records: SessionRecord[]): number | null {
  const xs = records.map((r) => r.result.avgMs).filter((x): x is number => typeof x === 'number' && x > 0);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
/** Consecutive days (ending today or yesterday) with at least one session. */
export function streakDays(records: SessionRecord[], now = new Date()): number {
  const days = new Set(records.map((r) => new Date(r.startedAt).toDateString()));
  let n = 0;
  const d = new Date(now);
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
/**
 * Adaptive difficulty suggestion from the last three sessions at a level.
 * Accuracy ≥ 85% → step up; < 50% → step down. Games without accuracy use score trend vs personal best.
 */
export function suggestLevel(records: SessionRecord[], meta: GameMeta, current: PresetLevel): { level: PresetLevel; reason: string } | null {
  const order: PresetLevel[] = ['easy', 'medium', 'hard'];
  const recent = forGame(records, meta.id, current).slice(-3);
  if (recent.length < 3) return null;
  const acc = accuracy(recent);
  const i = order.indexOf(current);
  if (acc !== null) {
    if (acc >= 0.85 && i < 2) return { level: order[i + 1], reason: `${Math.round(acc * 100)}% accuracy over your last 3 ${current} sessions` };
    if (acc < 0.5 && i > 0) return { level: order[i - 1], reason: `${Math.round(acc * 100)}% accuracy over your last 3 ${current} sessions` };
    return null;
  }
  const scores = recent.map((r) => r.result.score);
  if (meta.scoreFormat === 'money' && scores.every((s) => s > 0) && i < 2) return { level: order[i + 1], reason: `Profitable in each of your last 3 ${current} sessions` };
  return null;
}
export function dailySeries(records: SessionRecord[], gameId: string) {
  return forGame(records, gameId).map((r, i) => ({ n: i + 1, date: new Date(r.startedAt).toLocaleDateString(), score: r.result.score, accuracy: r.result.total ? Math.round(((r.result.correct ?? 0) / r.result.total) * 100) : null }));
}
export function fmtScore(meta: GameMeta, x: number): string {
  switch (meta.scoreFormat) {
    case 'money': return (x < 0 ? '−' : '') + Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 2 });
    case 'percent': return `${Math.round(x)}%`;
    default: return x.toLocaleString('en-US', { maximumFractionDigits: 1 });
  }
}
