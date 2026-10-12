/**
 * Interview assessment battery: several drills run back to back as timed sections with one overall score.
 * The 0–100 normalisation rubric and grade bands are ORIGINAL and NOT calibrated against real hiring data.
 */
import type { GameMeta, GameResult, PresetLevel, Settings } from './types';
import { GAME_BY_ID } from './registry';
import { TEST_BY_ID } from './assessments';

export interface BatteryPreset { id: string; name: string; description: string; minutes: number; level: PresetLevel; sections: { gameId: string; weight: number }[] }
export const BATTERY_PRESETS: BatteryPreset[] = [
  { id: 'trader-screen', name: 'Trader online screen', description: 'The typical first round: mental math, sequences and probability, then a short market-making game and a task-switching test.', minutes: 30, level: 'medium',
    sections: [{ gameId: 'math', weight: 2 }, { gameId: 'sequence', weight: 1.5 }, { gameId: 'probability', weight: 1.5 }, { gameId: 'dice', weight: 1.5 }, { gameId: 'task-switch', weight: 1 }] },
  { id: 'market-making', name: 'Market-making interview', description: 'Pricing under uncertainty: dice and card markets, the combined trading game and two live simulators.', minutes: 40, level: 'medium',
    sections: [{ gameId: 'dice', weight: 1 }, { gameId: 'card-game', weight: 1 }, { gameId: 'trading-game', weight: 1 }, { gameId: 'etf-sim', weight: 1 }, { gameId: 'options-sim', weight: 1 }] },
  { id: 'quant-battery', name: 'Quant reasoning battery', description: 'Harder probability and statistics, estimation, betting decisions and event pricing.', minutes: 45, level: 'hard',
    sections: [{ gameId: 'oa-prob-stats-advanced', weight: 2 }, { gameId: 'fermi-game', weight: 1 }, { gameId: 'bet-grid', weight: 1 }, { gameId: 'event-contracts', weight: 1 }, { gameId: 'higher-lower', weight: 1 }] },
  { id: 'cognitive', name: 'Cognitive battery', description: 'Gamified aptitude tests: switching, conflict, working memory, perceptual speed and inhibition.', minutes: 20, level: 'medium',
    sections: [{ gameId: 'task-switch', weight: 1 }, { gameId: 'response-conflict', weight: 1 }, { gameId: 'pincode', weight: 1 }, { gameId: 'grid-recall', weight: 1 }, { gameId: 'code-match', weight: 1 }, { gameId: 'hold-fire', weight: 1 }] },
  { id: 'full-day', name: 'Full assessment day', description: 'A long mixed session across every skill area.', minutes: 75, level: 'hard',
    sections: [{ gameId: 'oa-math-80', weight: 2 }, { gameId: 'oa-sequences-26', weight: 1.5 }, { gameId: 'probability', weight: 1.5 }, { gameId: 'dice', weight: 1 }, { gameId: 'event-contracts', weight: 1 }, { gameId: 'futures-sim', weight: 1 }, { gameId: 'cube-folding', weight: 1 }, { gameId: 'task-switch', weight: 1 }] },
];

/** Seconds a single unit (round, question, trial…) takes, used to size round-based sections. */
const SECONDS_PER_UNIT: Record<string, number> = {
  dice: 45, 'card-game': 20, 'fermi-game': 40, 'event-contracts': 45, 'higher-lower': 10, 'response-conflict': 2, pincode: 12,
  'cube-folding': 25, 'code-match': 5, 'grid-recall': 8, 'hold-fire': 1.5, 'target-number': 60, pump: 15, skyline: 40,
  'mystery-figure': 120, 'bet-grid': 50, 'fermi-questions': 40,
};
const COUNT_KEYS = ['rounds', 'questions', 'trials', 'cards', 'balloons', 'puzzles'];
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Settings that make a game fill roughly `seconds` of assessment time at the given level. */
export function sectionSettings(meta: GameMeta, seconds: number, level: PresetLevel): Settings {
  const s: Settings = { ...meta.presets[level] };
  const def = (k: string) => meta.settings.find((d) => d.key === k);
  const dur = def('duration');
  if (dur && dur.type === 'number') {
    s.duration = clamp(Math.round(seconds), Math.max(dur.min, 1), dur.max);
    if (def('questions')) s.questions = 0;
    return s;
  }
  const ticks = def('ticks');
  if (ticks && ticks.type === 'number') {
    const ms = Number(s.tickMs) || 1000;
    s.ticks = clamp(Math.floor((seconds * 1000) / ms), ticks.min, ticks.max);
    return s;
  }
  const key = COUNT_KEYS.find((k) => def(k));
  const d = key ? def(key) : undefined;
  if (key && d && d.type === 'number') s[key] = clamp(Math.floor(seconds / (SECONDS_PER_UNIT[meta.id] ?? 30)), Math.max(d.min, 1), d.max);
  return s;
}

/** Correct answers per second that count as a strong pace in timed quiz sections. */
function targetRate(gameId: string): number {
  const t = TEST_BY_ID[gameId];
  if (t) return t.questions / (t.minutes * 60);
  return ({ math: 0.25, sequence: 0.07, fractions: 0.2, probability: 0.035 } as Record<string, number>)[gameId] ?? 0.035;
}
const MONEY_SCALE: Record<string, number> = { dice: 50, 'trading-game': 20, 'etf-arb': 5, 'card-game': 5, 'etf-sim': 5, 'options-sim': 5, 'futures-sim': 20, 'prediction-sim': 100 };

/** Map a game result to 0–100. Original rubric (see docs/VERIFICATION.md). */
export function normalize(meta: GameMeta, r: GameResult, settings: Settings): number {
  const acc = r.total ? (r.correct ?? 0) / r.total : null;
  let v: number;
  if (meta.id === 'higher-lower') { const b = Number(settings.bankroll) || 1000; v = 50 + 50 * Math.tanh((r.score - b) / (0.3 * b)); }
  else if (meta.id === 'pump') { const ev = Number(settings.balloons) * (Number(settings.maxPumps || 64) / 4) * (Number(settings.cents) / 100); v = 100 * (ev > 0 ? r.score / ev : 0); }
  else if (meta.scoreFormat === 'money') v = 50 + 50 * Math.tanh(r.score / (MONEY_SCALE[meta.id] ?? 20));
  else if (meta.scoreFormat === 'percent') v = r.score;
  else if (meta.id === 'fermi-game') v = (r.score / (Math.max(1, Number(settings.questions)) * 120)) * 100;
  else if (meta.id === 'fermi-questions') v = r.score / Math.max(1, Number(settings.questions));
  else if (meta.id === 'event-contracts') v = 50 + 50 * Math.tanh(r.score / (Math.max(1, Number(settings.rounds)) * 20));
  else if (Number(settings.duration) > 0 && meta.settings.some((d) => d.key === 'questions') && acc !== null) {
    const pace = Math.min(1, (r.correct ?? 0) / (Number(settings.duration) * targetRate(meta.id)));
    v = 100 * (0.5 * acc + 0.5 * pace);
  } else v = acc === null ? 50 : 100 * acc;
  return Math.round(clamp(v, 0, 100));
}
export function overallScore(parts: { norm: number; weight: number }[]): number {
  const w = parts.reduce((a, p) => a + p.weight, 0);
  return w ? Math.round(parts.reduce((a, p) => a + p.norm * p.weight, 0) / w) : 0;
}
export function band(score: number): string {
  return score >= 80 ? 'Strong' : score >= 60 ? 'Competitive' : score >= 40 ? 'Borderline' : 'Needs work';
}
/** Split total minutes across sections by weight (each at least 1 minute). */
export function planSections(sections: { gameId: string; weight: number }[], minutes: number) {
  const w = sections.reduce((a, s) => a + s.weight, 0) || 1;
  return sections.filter((s) => GAME_BY_ID[s.gameId]).map((s) => ({ ...s, seconds: Math.max(60, Math.round((minutes * 60 * s.weight) / w)) }));
}
