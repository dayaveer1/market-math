import { createRoot } from 'react-dom/client';
import { createElement, useState } from 'react';
import { GAME_BY_ID } from '@/lib/registry';
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
const p = new URLSearchParams(location.hash.slice(1));
const id = p.get('game')!;
const settings = { ...GAME_BY_ID[id].presets[(p.get('level') ?? 'easy') as 'easy'], ...JSON.parse(p.get('s') ?? '{}') };
function App() {
  const [res, setRes] = useState<any>(null);
  const [mist, setMist] = useState<any[]>([]);
  return res
    ? createElement('pre', { id: 'result' }, JSON.stringify({ ...res, mistakes: mist.length }))
    : createElement(C[id], { settings, seed: Number(p.get('seed') ?? 7), onFinish: setRes, onMistake: (m: any) => setMist((x) => [...x, m]) });
}
createRoot(document.getElementById('root')!).render(createElement(App));
window.addEventListener('error', (e) => { (window as any).__errors = [...((window as any).__errors ?? []), e.message]; });
