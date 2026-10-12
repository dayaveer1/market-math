import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { GAMES } from '@/lib/registry';
import DiceGame from '@/games/DiceGame';
import TradingGame from '@/games/TradingGame';
import EtfArbGame from '@/games/EtfArbGame';
import CardGame from '@/games/CardGame';
import FermiGame from '@/games/FermiGame';
import EventContractsGame from '@/games/EventContractsGame';
import HigherLowerGame from '@/games/HigherLowerGame';
import * as Q from '@/games/quizGames';
import TaskSwitch from '@/games/TaskSwitch';
import ResponseConflict from '@/games/ResponseConflict';
import Pincode from '@/games/Pincode';
import CubeFolding from '@/games/CubeFolding';
import CodeMatch from '@/games/CodeMatch';
import GridRecall from '@/games/GridRecall';
import Intercept from '@/games/Intercept';
import HoldFire from '@/games/HoldFire';
import TargetNumber from '@/games/TargetNumber';
import Pump from '@/games/Pump';
import Skyline from '@/games/Skyline';
import MysteryFigure from '@/games/MysteryFigure';
import SweetSpot from '@/games/SweetSpot';
import MarketMakingSim from '@/games/MarketMakingSim';
import BetGrid from '@/games/BetGrid';
import TestGame from '@/games/TestGame';
import { TEST_SPECS } from '@/lib/assessments';
import { createElement as h } from 'react';

const C: Record<string, any> = {
  dice: DiceGame, 'trading-game': TradingGame, 'etf-arb': EtfArbGame, 'card-game': CardGame, 'fermi-game': FermiGame, 'event-contracts': EventContractsGame, 'higher-lower': HigherLowerGame,
  math: Q.MathTrainer, sequence: Q.SequenceTrainer, fractions: Q.FractionsTrainer, probability: Q.ProbabilityTrainer, 'fermi-questions': Q.FermiQuestions,
  'etf-drills': Q.EtfDrills, 'options-drills': Q.OptionsDrills, 'futures-drills': Q.FuturesDrills, 'prediction-drills': Q.PredictionDrills,
  'task-switch': TaskSwitch, 'response-conflict': ResponseConflict, pincode: Pincode, 'cube-folding': CubeFolding, 'code-match': CodeMatch, 'grid-recall': GridRecall,
  intercept: Intercept, 'hold-fire': HoldFire, 'target-number': TargetNumber, pump: Pump, skyline: Skyline, 'mystery-figure': MysteryFigure, 'sweet-spot': SweetSpot,
  'etf-sim': (p: any) => h(MarketMakingSim, { ...p, instrumentId: 'etf' }), 'options-sim': (p: any) => h(MarketMakingSim, { ...p, instrumentId: 'option' }),
  'futures-sim': (p: any) => h(MarketMakingSim, { ...p, instrumentId: 'futures' }), 'prediction-sim': (p: any) => h(MarketMakingSim, { ...p, instrumentId: 'prediction' }),
  'bet-grid': BetGrid,
  ...Object.fromEntries(TEST_SPECS.map((t) => [t.id, (p: any) => h(TestGame, { ...p, specId: t.id })])),
};
(globalThis as any).performance ??= { now: () => Date.now() };
let ok = 0, fail = 0;
for (const g of GAMES) for (const level of ['easy', 'medium', 'hard'] as const) for (const seed of [1, 42, 9999]) {
  try {
    const html = renderToString(createElement(C[g.id], { settings: g.presets[level], seed, onFinish: () => {}, onMistake: () => {} }));
    if (html.length < 50) throw new Error('suspiciously empty render');
    ok++;
  } catch (e) { fail++; console.log('FAIL', g.id, level, seed, (e as Error).message); }
}
console.log(`${ok} renders ok, ${fail} failed, ${Object.keys(C).length} components for ${GAMES.length} registry entries`);
