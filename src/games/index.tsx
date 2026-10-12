'use client';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { GameProps } from '@/lib/types';
import { TEST_SPECS } from '@/lib/assessments';

const q = (name: string) => dynamic(() => import('./quizGames').then((m) => (m as unknown as Record<string, ComponentType<GameProps>>)[name]), { ssr: false });
const sim = (instrumentId: string) => dynamic(() => import('./MarketMakingSim').then((m) => { const C = m.default; return function Sim(p: GameProps) { return <C {...p} instrumentId={instrumentId} />; }; }), { ssr: false });
const test = (specId: string) => dynamic(() => import('./TestGame').then((m) => { const C = m.default; return function Test(p: GameProps) { return <C {...p} specId={specId} />; }; }), { ssr: false });
const d = (loader: () => Promise<{ default: ComponentType<GameProps> }>) => dynamic(loader, { ssr: false });

/** Maps registry ids to playable components. Every id in GAMES must resolve here (checked by tests/unit/registry.test.ts). */
export const GAME_COMPONENTS: Record<string, ComponentType<GameProps>> = {
  dice: d(() => import('./DiceGame')),
  'trading-game': d(() => import('./TradingGame')),
  'etf-arb': d(() => import('./EtfArbGame')),
  'card-game': d(() => import('./CardGame')),
  'fermi-game': d(() => import('./FermiGame')),
  'event-contracts': d(() => import('./EventContractsGame')),
  'higher-lower': d(() => import('./HigherLowerGame')),
  math: q('MathTrainer'),
  sequence: q('SequenceTrainer'),
  fractions: q('FractionsTrainer'),
  probability: q('ProbabilityTrainer'),
  'fermi-questions': q('FermiQuestions'),
  'etf-drills': q('EtfDrills'),
  'options-drills': q('OptionsDrills'),
  'futures-drills': q('FuturesDrills'),
  'prediction-drills': q('PredictionDrills'),
  'task-switch': d(() => import('./TaskSwitch')),
  'response-conflict': d(() => import('./ResponseConflict')),
  pincode: d(() => import('./Pincode')),
  'cube-folding': d(() => import('./CubeFolding')),
  'code-match': d(() => import('./CodeMatch')),
  'grid-recall': d(() => import('./GridRecall')),
  intercept: d(() => import('./Intercept')),
  'hold-fire': d(() => import('./HoldFire')),
  'target-number': d(() => import('./TargetNumber')),
  pump: d(() => import('./Pump')),
  skyline: d(() => import('./Skyline')),
  'mystery-figure': d(() => import('./MysteryFigure')),
  'sweet-spot': d(() => import('./SweetSpot')),
  'etf-sim': sim('etf'),
  'options-sim': sim('option'),
  'futures-sim': sim('futures'),
  'prediction-sim': sim('prediction'),
  'bet-grid': d(() => import('./BetGrid')),
  ...Object.fromEntries(TEST_SPECS.map((t) => [t.id, test(t.id)])),
};
