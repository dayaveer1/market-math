import type { Rng } from './rng';
import type { Tolerance } from './parse';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'custom';
export type PresetLevel = Exclude<Difficulty, 'custom'>;
export type SettingValue = number | boolean | string;
export type Settings = Record<string, SettingValue>;

export type SettingDef =
  | { key: string; label: string; type: 'number'; min: number; max: number; step?: number; unit?: string; help?: string }
  | { key: string; label: string; type: 'boolean'; help?: string }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; help?: string };

export type Category = 'market' | 'numerical' | 'trading' | 'probability' | 'estimation' | 'cognitive' | 'assessment';

/**
 * How closely a game's mechanics are grounded in the reference site.
 * - rules-observed: public "How to play" text was read; specifics may still be inferred.
 * - description-only: only a short public description was available; mechanics are original designs.
 */
export type Verification = 'rules-observed' | 'description-only';

export interface GameMeta {
  id: string;
  name: string;
  category: Category;
  summary: string;
  howTo: string[];
  controls: string[];
  verification: Verification;
  /** Mechanics designed here that must be checked against the reference before claiming fidelity. */
  unverified: string[];
  settings: SettingDef[];
  presets: Record<PresetLevel, Settings>;
  scoreLabel: string;
  scoreFormat: 'money' | 'points' | 'count' | 'percent';
  higherIsBetter: boolean;
}

export interface Mistake {
  prompt: string;
  given: string;
  expected: string;
  explanation?: string;
}

export interface GameResult {
  score: number;
  correct?: number;
  total?: number;
  avgMs?: number;
  /** Short lines shown on the results screen. */
  lines?: string[];
}

export interface GameProps {
  settings: Settings;
  seed: number;
  onFinish: (r: GameResult) => void;
  onMistake: (m: Mistake) => void;
}

/** A single quiz item produced by an original question generator. */
export interface Question {
  prompt: string;
  detail?: string;
  answer: number;
  display: string;
  tolerance?: Tolerance;
  /** Partial-credit grading (e.g. Fermi). Returns 0..1; >= 0.5 counts as correct. */
  credit?: (given: number) => number;
  choices?: number[];
  explanation?: string;
  unit?: string;
  /** Text options (logic, analogies, patterns). When present, `answer` is the index of the correct option. */
  options?: string[];
  /** Question family id, used for per-topic breakdowns in tests. */
  family?: string;
}
export type QuestionGenerator = (r: Rng, s: Settings, index: number) => Question;
