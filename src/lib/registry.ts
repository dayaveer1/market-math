/**
 * Single source of truth for the 29 activities: metadata, settings schema, presets and verification notes.
 * Medium/Hard preset VALUES are original choices for every game (reference tiers are paywalled and were not observed).
 */
import type { GameMeta, SettingDef, Category } from './types';
import { TEST_SPECS, testMeta } from './assessments';

const n = (key: string, label: string, min: number, max: number, step = 1, unit?: string, help?: string): SettingDef => ({ key, label, type: 'number', min, max, step, unit, help });
const b = (key: string, label: string, help?: string): SettingDef => ({ key, label, type: 'boolean', help });
const sel = (key: string, label: string, options: [string, string][], help?: string): SettingDef => ({ key, label, type: 'select', options: options.map(([value, label]) => ({ value, label })), help });

const LEVEL = sel('level', 'Question level', [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]);
const DURATION = n('duration', 'Session length', 0, 7200, 15, 's', '0 = untimed (Finish button)');
const QUESTIONS = n('questions', 'Questions', 0, 1000, 1, undefined, '0 = unlimited');
const PERQ = n('perQuestion', 'Time per question', 0, 120, 1, 's', '0 = no per-question limit');
const FORMAT = sel('format', 'Answer format', [['typed', 'Type the answer'], ['choice', 'Multiple choice']]);
const ADAPT = b('adaptive', 'Adapt level as you go', 'Up after 3 fast correct, down after 2 misses');
const QUIZ_SETTINGS = [LEVEL, DURATION, QUESTIONS, PERQ, FORMAT];
const QUIZ_CONTROLS = ['Enter submits', '1–4 pick a choice in multiple-choice mode', 'Esc leaves the session'];
const DESC_ONLY = 'Only a one-line public description was available; the full mechanics here are an original design.';

export const CATEGORY_LABEL: Record<Category, string> = {
  market: 'Market games', numerical: 'Numerical', trading: 'Trading desk', probability: 'Probability', estimation: 'Estimation', cognitive: 'Cognitive', assessment: 'Online assessments',
};
export const CATEGORY_ORDER: Category[] = ['market', 'trading', 'numerical', 'probability', 'estimation', 'cognitive', 'assessment'];

const SIM_COMMON = (extra: SettingDef[] = []): SettingDef[] => [
  n('ticks', 'Session length', 20, 2000, 10, 'ticks'), n('tickMs', 'Tick speed', 0, 5000, 100, 'ms', '0 = step manually with N'),
  n('traders', 'Traders per tick (average)', 0.2, 6, 0.1), n('informedPct', 'Informed traders', 0, 90, 5, '%'), n('maxPos', 'Position limit', 2, 200),
  n('newsPct', 'News chance per tick', 0, 50, 1, '%'), b('showFair', 'Show fair value'), ...extra,
];
const SIM_HOWTO = (specific: string[]): string[] => [
  ...specific,
  'Your two-sided quote stays live every tick. Noise traders trade with you more often when your spread is tight; informed traders only hit quotes that are stale relative to where fair value is going.',
  'Inventory is marked to fair value and settled at the end. Position beyond the limit is refused.',
  'Results break P&L into edge captured at fill, losses to informed flow, inventory and hedging.',
];
const SIM_CONTROLS = ['↑/↓ move mid · ←/→ narrow/widen · PageUp/PageDown move 10 ticks', 'Q pull or restore quote · H hedge delta · P pause · N step · F end', 'Esc leaves'];
const SIM_UNVERIFIED = ['The reference strategy trainer (lessons, simulators, live case) is paid content on the reference site and was not accessed; this simulator is an original design.', 'Flow model (Poisson arrivals, exponential noise participation, informed traders who know next-tick fair value) is original and uncalibrated.'];
const simPresets = (vols: [number, number, number], scale = 1) => ({
  easy: { ticks: 120, tickMs: 1500, traders: 1.2, informedPct: 10, maxPos: 20, newsPct: 3, showFair: true, vol: vols[0], hedgeCost: 0.01 * scale },
  medium: { ticks: 180, tickMs: 1100, traders: 1.6, informedPct: 25, maxPos: 15, newsPct: 6, showFair: false, vol: vols[1], hedgeCost: 0.02 * scale },
  hard: { ticks: 240, tickMs: 800, traders: 2, informedPct: 40, maxPos: 10, newsPct: 10, showFair: false, vol: vols[2], hedgeCost: 0.03 * scale },
});
const SIMS: GameMeta[] = [
  { id: 'etf-sim', name: 'ETF Market Making: Simulator', category: 'trading', summary: 'Quote an ETF live against its moving basket, manage inventory and hedge in the basket.',
    howTo: SIM_HOWTO(['The ETF holds a fixed basket of three stocks; fair value is the weighted sum of their prices, which move every tick.', 'Hedge (H) trades the basket at fair value plus a per-unit cost to flatten your delta.']),
    controls: SIM_CONTROLS, verification: 'description-only', unverified: SIM_UNVERIFIED,
    settings: SIM_COMMON([n('vol', 'Stock volatility per tick', 0.01, 1, 0.01), n('hedgeCost', 'Hedge cost per unit', 0, 1, 0.01)]), presets: simPresets([0.04, 0.06, 0.09]),
    scoreLabel: 'P&L', scoreFormat: 'money', higherIsBetter: true },
  { id: 'options-sim', name: 'Options Market Making: Simulator', category: 'trading', summary: 'Make a market in a call option as the stock moves and time decays; delta-hedge in shares.',
    howTo: SIM_HOWTO(['Fair value is the Black–Scholes price (zero rates) of a 30-day call, given the stock price, strike, time left and implied volatility.', 'Your option position carries delta exposure; Hedge (H) trades shares to flatten it, at a cost per share.']),
    controls: SIM_CONTROLS, verification: 'description-only', unverified: [...SIM_UNVERIFIED, 'Implied volatility is constant and equals realised volatility (no vol-surface or vega P&L)'],
    settings: SIM_COMMON([n('vol', 'Implied & realised vol', 0.05, 1.5, 0.05), n('hedgeCost', 'Hedge cost per share', 0, 0.5, 0.005)]), presets: simPresets([0.2, 0.3, 0.45]),
    scoreLabel: 'P&L', scoreFormat: 'money', higherIsBetter: true },
  { id: 'futures-sim', name: 'Futures & Basis: Simulator', category: 'trading', summary: 'Quote an index future around cost-of-carry fair value and hedge in the cash index.',
    howTo: SIM_HOWTO(['Fair value = spot × (1 + r × days/365) − dividends. Time to expiry runs down over the session.', 'Hedge (H) trades the cash index; the hedge ratio is 1 + r × days/365 per future.']),
    controls: SIM_CONTROLS, verification: 'description-only', unverified: SIM_UNVERIFIED,
    settings: SIM_COMMON([n('vol', 'Index volatility per tick (points)', 0.2, 20, 0.1), n('hedgeCost', 'Hedge cost per unit', 0, 5, 0.05)]), presets: simPresets([1, 1.5, 2.5], 10),
    scoreLabel: 'P&L', scoreFormat: 'money', higherIsBetter: true },
  { id: 'prediction-sim', name: 'Prediction Markets: Simulator', category: 'trading', summary: 'Quote a YES contract as noisy sources report, against traders who may know the outcome.',
    howTo: SIM_HOWTO(['The event has a stated base rate. Sources of stated accuracy report YES or NO from time to time; update in odds form.', 'The contract settles at 100 if the event happens, 0 if not. Informed traders know the outcome. There is no hedge.']),
    controls: SIM_CONTROLS.map((c) => c.replace(' · H hedge delta', '')), verification: 'description-only', unverified: SIM_UNVERIFIED,
    settings: SIM_COMMON(), // prediction contracts move only on news; no volatility setting
    presets: { easy: { ticks: 120, tickMs: 1500, traders: 1.2, informedPct: 5, maxPos: 20, newsPct: 12, showFair: true, vol: 0 }, medium: { ticks: 180, tickMs: 1100, traders: 1.6, informedPct: 15, maxPos: 15, newsPct: 10, showFair: false, vol: 0 }, hard: { ticks: 240, tickMs: 800, traders: 2, informedPct: 25, maxPos: 10, newsPct: 8, showFair: false, vol: 0 } },
    scoreLabel: 'P&L', scoreFormat: 'money', higherIsBetter: true },
];
const BET_GRID: GameMeta = {
  id: 'bet-grid', name: 'Bet Grid', category: 'assessment',
  summary: 'Price bets on a 3×3 grid of dice and take only the ones with positive expected value.',
  howTo: ['Each row is the sum of three fair dice; some dice are revealed. The winning row has the strictly highest sum (a tie for the top means no winner).', 'Bets are offered at odds X:1 (win X per 1 staked). Select every bet whose expected value is positive before the clock runs out.', 'Results show the exact probability and EV of each bet.'],
  controls: ['1–6 toggle a bet', 'Enter locks in / next', 'Esc leaves'], verification: 'description-only',
  unverified: ['Public listing describes only "a timed grid game where you price and compare bets against a winning row" (Akuna Capital trader assessment practice). Grid size, dice, bet types, odds and scoring are original.', 'Not affiliated with or endorsed by the firm named.'],
  settings: [n('rounds', 'Rounds', 1, 100), n('roundTime', 'Time per round', 0, 300, 5, 's', '0 = untimed'), n('revealed', 'Revealed dice', 3, 8), n('bets', 'Bets per round', 2, 6)],
  presets: { easy: { rounds: 6, roundTime: 0, revealed: 6, bets: 3 }, medium: { rounds: 8, roundTime: 60, revealed: 5, bets: 4 }, hard: { rounds: 10, roundTime: 40, revealed: 4, bets: 5 } },
  scoreLabel: 'Correct calls', scoreFormat: 'count', higherIsBetter: true,
};

export const GAMES: GameMeta[] = [
  /* ---------------- Market games ---------------- */
  {
    id: 'dice', name: 'Market Making Dice Game', category: 'market',
    summary: 'Trade against a market maker quoting the sum of dice, some of them face down.',
    howTo: [
      'Each round shows a set of six-sided dice. Some are face up; the rest are hidden.',
      'The market maker quotes "bid at ask". Buy at the ask or sell at the bid, choosing a quantity, before the timer runs out.',
      'You start with 500. A long must be affordable; a short must have its worst-case loss covered by your balance.',
      'The dice are revealed and settle at their sum. Then report your return for the round.',
      'Market events (optional) restrict the faces the dice can show or make a 1 worth 7.',
    ],
    controls: ['B buy · S sell · P pass', 'Enter confirms', 'Esc leaves'],
    verification: 'rules-observed',
    unverified: ['How many dice are hidden each round', 'How the market maker\'s random quote is generated (spread, distance from fair)', 'Probability of a market event', 'Timeout behaviour (here: no trade)', 'Whether a wrong return report is penalised (here: tracked as accuracy only)', 'Medium/Hard setting values'],
    settings: [n('dice', 'Number of dice', 1, 8), n('rounds', 'Number of rounds', 1, 30), n('decisionTime', 'Time to answer', 0, 180, 5, 's', '0 = untimed'), b('showBalance', 'Show balance'), b('events', 'Enable market events')],
    presets: {
      easy: { dice: 3, rounds: 3, decisionTime: 60, showBalance: true, events: false },
      medium: { dice: 4, rounds: 5, decisionTime: 45, showBalance: true, events: true },
      hard: { dice: 5, rounds: 8, decisionTime: 30, showBalance: false, events: true },
    },
    scoreLabel: 'P&L', scoreFormat: 'money', higherIsBetter: true,
  },
  {
    id: 'trading-game', name: 'Trading Game', category: 'market',
    summary: 'Make a market, then take liquidity from the book, on an asset revealed one draw at a time.',
    howTo: [
      'The asset settles at the sum of several hidden draws, each a whole number from 1 to 20 (average 10.5).',
      'One draw is revealed per turn. First quote a bid and ask within the maximum spread; a counterparty with a noisy private estimate may trade one lot against you.',
      'Then a book of bot quotes appears. Buy from the best ask, sell to the best bid, or pass.',
      'Your position is settled at the true value at the end. Position is limited to ±10 lots.',
    ],
    controls: ['Enter submits your quote', 'B buy · S sell · P pass in the taking phase', 'Esc leaves'],
    verification: 'description-only', unverified: [DESC_ONLY, 'Asset definition, counterparty model and book model are all original'],
    settings: [n('draws', 'Hidden draws', 3, 8), n('decisionTime', 'Time per decision', 0, 120, 5, 's', '0 = untimed'), n('maxWidth', 'Maximum spread', 1, 12), n('informed', 'Counterparty informedness', 0, 100, 10, '%'), b('showFair', 'Show public fair value')],
    presets: {
      easy: { draws: 4, decisionTime: 45, maxWidth: 6, informed: 30, showFair: true },
      medium: { draws: 5, decisionTime: 30, maxWidth: 4, informed: 50, showFair: false },
      hard: { draws: 6, decisionTime: 20, maxWidth: 3, informed: 70, showFair: false },
    },
    scoreLabel: 'P&L', scoreFormat: 'money', higherIsBetter: true,
  },
  {
    id: 'etf-arb', name: 'ETF Arbitrage Game', category: 'market',
    summary: 'Spot an ETF quote that crosses its basket value and take it before three rival market makers fix it.',
    howTo: [
      'The ETF holds a fixed basket of three stocks. Its fair value (NAV) is the weighted sum of their prices, which move every tick.',
      'Three AI market makers quote the ETF. When a bid is above NAV, sell to it; when an ask is below NAV, buy from it.',
      'Each trade is assumed to be hedged at NAV immediately, so your P&L is the gap you captured.',
      'Rival arbitrageurs remove mispriced quotes after a reaction delay. Bad trades lose money.',
    ],
    controls: ['1/2/3 buy from market maker 1/2/3', 'Q/W/E sell to market maker 1/2/3', 'Esc leaves'],
    verification: 'description-only', unverified: [DESC_ONLY, 'Instant-hedge P&L simplification', 'Quote and competitor models'],
    settings: [n('duration', 'Session length', 30, 300, 15, 's'), n('reaction', 'Rival reaction time', 300, 5000, 100, 'ms'), n('lot', 'Units per click', 1, 100), b('showNav', 'Show NAV'), n('tickMs', 'Tick interval', 400, 3000, 100, 'ms')],
    presets: {
      easy: { duration: 90, reaction: 2500, lot: 10, showNav: true, tickMs: 1500 },
      medium: { duration: 120, reaction: 1500, lot: 10, showNav: false, tickMs: 1200 },
      hard: { duration: 150, reaction: 800, lot: 10, showNav: false, tickMs: 900 },
    },
    scoreLabel: 'P&L', scoreFormat: 'money', higherIsBetter: true,
  },
  {
    id: 'card-game', name: 'Card Game', category: 'market',
    summary: 'Read several two-way quotes on a sum of cards and take the single best-value trade, or pass.',
    howTo: [
      'Cards are dealt from one standard deck without replacement (A = 1, J = 11, Q = 12, K = 13). Some are face up.',
      'The contract settles at the sum of all dealt cards. Hidden cards are equally likely to be any card still in the deck.',
      'Several quoters show bid/ask prices. Buy from one, sell to one, or pass. Trade size is fixed at 1.',
      'You score the P&L, and the round also records whether you picked the highest-expected-value action.',
    ],
    controls: ['Click a bid or ask, or press P to pass', 'Esc leaves'],
    verification: 'description-only', unverified: [DESC_ONLY, 'Deck, settlement rule and quoter model are original'],
    settings: [n('rounds', 'Rounds', 3, 30), n('cards', 'Cards dealt', 2, 8), n('revealed', 'Face-up cards', 0, 6), n('quoters', 'Quoters', 1, 4), n('decisionTime', 'Time per round', 0, 120, 5, 's', '0 = untimed')],
    presets: {
      easy: { rounds: 8, cards: 3, revealed: 1, quoters: 2, decisionTime: 30 },
      medium: { rounds: 10, cards: 4, revealed: 1, quoters: 3, decisionTime: 20 },
      hard: { rounds: 12, cards: 5, revealed: 2, quoters: 4, decisionTime: 12 },
    },
    scoreLabel: 'P&L', scoreFormat: 'money', higherIsBetter: true,
  },
  {
    id: 'fermi-game', name: 'Fermi Estimation Game', category: 'market',
    summary: 'Give a low–high range you are 90% sure contains the answer; tight, correct, fast ranges score most.',
    howTo: [
      'Enter a low and a high estimate. You score only if the true value lies in your range.',
      'A hit scores 50, plus up to 50 for tightness (ranges two orders of magnitude wide get no tightness points), plus up to 20 for speed.',
      'Shorthand like 3k, 4.5m, 2b or 1e6 is accepted.',
    ],
    controls: ['Tab moves between low and high', 'Enter submits', 'Esc leaves'],
    verification: 'description-only', unverified: [DESC_ONLY, 'Scoring formula is original', 'Question bank is original'],
    settings: [n('questions', 'Questions', 3, 30), n('decisionTime', 'Time per question', 0, 180, 5, 's', '0 = untimed')],
    presets: { easy: { questions: 5, decisionTime: 60 }, medium: { questions: 8, decisionTime: 45 }, hard: { questions: 10, decisionTime: 30 } },
    scoreLabel: 'Points', scoreFormat: 'points', higherIsBetter: true,
  },
  {
    id: 'event-contracts', name: 'Event Contracts Game', category: 'market',
    summary: 'Turn a base rate and news into a probability, quote it two-sided, and survive informed flow.',
    howTo: [
      'Each event pays 100¢ if it happens. You see a base rate and one or more reports with stated likelihood ratios.',
      'Quote a bid and ask in cents within the maximum spread. Traders arrive: noise traders trade on rough views; informed traders know the outcome.',
      'The event resolves. Your score per round is P&L in cents plus calibration points for your mid (+10 perfect, 0 at 50¢ when unsure, down to −30).',
    ],
    controls: ['Enter submits your quote', 'Esc leaves'],
    verification: 'description-only', unverified: [DESC_ONLY, 'Flow model and calibration points formula are original'],
    settings: [n('rounds', 'Rounds', 3, 30), n('signals', 'Reports per event', 0, 4), n('informed', 'Informed traders', 0, 80, 5, '%'), n('maxWidth', 'Maximum spread', 2, 40, 1, '¢'), n('traders', 'Traders per round', 4, 40), n('decisionTime', 'Time per quote', 0, 180, 5, 's', '0 = untimed')],
    presets: {
      easy: { rounds: 5, signals: 1, informed: 10, maxWidth: 20, traders: 10, decisionTime: 60 },
      medium: { rounds: 8, signals: 2, informed: 25, maxWidth: 12, traders: 12, decisionTime: 45 },
      hard: { rounds: 10, signals: 3, informed: 40, maxWidth: 8, traders: 15, decisionTime: 30 },
    },
    scoreLabel: 'Points', scoreFormat: 'points', higherIsBetter: true,
  },
  {
    id: 'higher-lower', name: 'Higher or Lower Game', category: 'market',
    summary: 'Call each card higher or lower and size the bet to your edge without going bust.',
    howTo: [
      'Cards come from a 52-card deck without replacement (A = 1 … K = 13). Ties lose.',
      'Choose higher or lower and a stake. Wins pay even money.',
      'The deck reshuffles when fewer than six cards are left. Bust and the game ends.',
      'Optimal sizing for an even-money bet with win probability p is the Kelly fraction 2p − 1.',
    ],
    controls: ['H higher · L lower', 'Number keys 1–5 pick stake presets', 'Esc leaves'],
    verification: 'description-only', unverified: [DESC_ONLY, 'Tie rule, payout and reshuffle rule are original'],
    settings: [n('cards', 'Calls to make', 5, 60), n('bankroll', 'Starting bankroll', 100, 10000, 100), b('showProb', 'Show probabilities'), n('decisionTime', 'Time per call', 0, 60, 1, 's', '0 = untimed')],
    presets: {
      easy: { cards: 20, bankroll: 1000, showProb: true, decisionTime: 0 },
      medium: { cards: 30, bankroll: 1000, showProb: false, decisionTime: 15 },
      hard: { cards: 40, bankroll: 1000, showProb: false, decisionTime: 8 },
    },
    scoreLabel: 'Final bankroll', scoreFormat: 'money', higherIsBetter: true,
  },
  /* ---------------- Numerical ---------------- */
  {
    id: 'math', name: 'Math Trainer', category: 'numerical',
    summary: 'Timed addition, subtraction, multiplication and division.',
    howTo: ['Answer as many arithmetic questions as you can. Division always comes out exact.', 'With negative marking on, each wrong answer costs a point.'],
    controls: QUIZ_CONTROLS, verification: 'description-only', unverified: ['Operand ranges, time limits and scoring are original choices'],
    settings: [...QUIZ_SETTINGS, sel('mode', 'Question type', [['integers', 'Integers (+ − × ÷)'], ['decimals', 'Decimals'], ['fractions', 'Fractions'], ['percent', 'Percentages'], ['largeMult', 'Large multiplication'], ['mixed', 'Mixed test style']]), b('add', 'Addition'), b('sub', 'Subtraction'), b('mul', 'Multiplication'), b('div', 'Division'), b('negativeMarking', 'Negative marking'), ADAPT],
    presets: {
      easy: { level: 'easy', mode: 'integers', adaptive: false, duration: 120, questions: 0, perQuestion: 0, format: 'typed', add: true, sub: true, mul: true, div: true, negativeMarking: false },
      medium: { level: 'medium', mode: 'integers', adaptive: false, duration: 120, questions: 0, perQuestion: 0, format: 'typed', add: true, sub: true, mul: true, div: true, negativeMarking: false },
      hard: { level: 'hard', mode: 'integers', adaptive: false, duration: 120, questions: 0, perQuestion: 0, format: 'typed', add: true, sub: true, mul: true, div: true, negativeMarking: true },
    },
    scoreLabel: 'Score', scoreFormat: 'count', higherIsBetter: true,
  },
  {
    id: 'sequence', name: 'Sequence Trainer', category: 'numerical',
    summary: 'Find the next number in the pattern.',
    howTo: ['Spot the rule and type the next term. Patterns include arithmetic, geometric, quadratic, Fibonacci-style, interleaved and mixed-operation sequences.'],
    controls: QUIZ_CONTROLS, verification: 'description-only', unverified: ['Pattern families and timing are original'],
    settings: [...QUIZ_SETTINGS, n('length', 'Terms shown', 4, 8), ADAPT],
    presets: {
      easy: { level: 'easy', duration: 0, questions: 15, perQuestion: 0, format: 'typed', length: 5, adaptive: false },
      medium: { level: 'medium', duration: 180, questions: 0, perQuestion: 0, format: 'typed', length: 5, adaptive: false },
      hard: { level: 'hard', duration: 120, questions: 0, perQuestion: 0, format: 'typed', length: 5, adaptive: false },
    },
    scoreLabel: 'Correct', scoreFormat: 'count', higherIsBetter: true,
  },
  {
    id: 'fractions', name: 'Fractions to Decimals', category: 'numerical',
    summary: 'Convert fractions to decimals (or percentages) until it is instant.',
    howTo: ['Type the decimal to at least three places (answers within 0.001 count). In percentage mode, answers within 0.1 percentage points count.'],
    controls: QUIZ_CONTROLS, verification: 'description-only', unverified: ['Denominator sets and tolerance are original'],
    settings: [...QUIZ_SETTINGS, sel('output', 'Answer as', [['decimal', 'Decimal'], ['percent', 'Percentage']]), b('improper', 'Include improper fractions'), ADAPT],
    presets: {
      easy: { level: 'easy', duration: 90, questions: 0, perQuestion: 0, format: 'typed', output: 'decimal', improper: false, adaptive: false },
      medium: { level: 'medium', duration: 90, questions: 0, perQuestion: 0, format: 'typed', output: 'decimal', improper: false, adaptive: false },
      hard: { level: 'hard', duration: 90, questions: 0, perQuestion: 0, format: 'typed', output: 'decimal', improper: true, adaptive: false },
    },
    scoreLabel: 'Correct', scoreFormat: 'count', higherIsBetter: true,
  },
  /* ---------------- Probability ---------------- */
  {
    id: 'probability', name: 'Probability Trainer', category: 'probability',
    summary: 'Timed probability and expected-value problems.',
    howTo: ['Answer with a decimal, a fraction like 5/36, or a percentage. Probabilities within 0.005 count.'],
    controls: QUIZ_CONTROLS, verification: 'description-only', unverified: ['Problem families and tolerance are original'],
    settings: [...QUIZ_SETTINGS, ADAPT],
    presets: {
      easy: { level: 'easy', duration: 0, questions: 10, perQuestion: 0, format: 'choice', adaptive: false },
      medium: { level: 'medium', duration: 300, questions: 0, perQuestion: 0, format: 'typed', adaptive: false },
      hard: { level: 'hard', duration: 180, questions: 0, perQuestion: 30, format: 'typed', adaptive: false },
    },
    scoreLabel: 'Correct', scoreFormat: 'count', higherIsBetter: true,
  },
  /* ---------------- Estimation ---------------- */
  {
    id: 'fermi-questions', name: 'Fermi Questions', category: 'estimation',
    summary: 'Single-number order-of-magnitude estimates with partial credit.',
    howTo: ['Give one number. Exact scores 100; the score falls linearly to 0 at a factor of ten away. Within a factor of two counts as correct.'],
    controls: ['Enter submits', 'Esc leaves'], verification: 'description-only', unverified: ['Scoring formula and question bank are original'],
    settings: [QUESTIONS, PERQ],
    presets: { easy: { questions: 8, perQuestion: 0 }, medium: { questions: 10, perQuestion: 45 }, hard: { questions: 12, perQuestion: 25 } },
    scoreLabel: 'Points', scoreFormat: 'points', higherIsBetter: true,
  },
  /* ---------------- Trading desk drills ---------------- */
  ...([
    ['etf-drills', 'ETF Market Making: Drills', 'NAV, arbitrage edge, hedge ratios and creation costs.'],
    ['options-drills', 'Options Market Making: Drills', 'Put–call parity, breakevens, delta hedging and spreads.'],
    ['futures-drills', 'Futures & Basis: Drills', 'Cost-of-carry fair value, basis, implied rates and calendar spreads.'],
    ['prediction-drills', 'Prediction Markets: Drills', 'Implied probabilities, overround, odds-form Bayes and Kelly sizing.'],
  ] as const).map(([id, name, summary]): GameMeta => ({
    id, name, category: 'trading', summary,
    howTo: ['Answer each desk question. Money answers within a cent count; percentages within the stated tolerance. A short explanation follows each answer.'],
    controls: QUIZ_CONTROLS, verification: 'description-only',
    unverified: ['The reference trainer (lessons, simulators, drills, live case) is paid content on the reference site and was not accessed. This drill bank is original; the matching interactive simulator is a separate activity.'],
    settings: [...QUIZ_SETTINGS, ADAPT],
    presets: {
      easy: { level: 'easy', duration: 0, questions: 10, perQuestion: 0, format: 'choice', adaptive: false },
      medium: { level: 'medium', duration: 0, questions: 12, perQuestion: 60, format: 'typed', adaptive: false },
      hard: { level: 'hard', duration: 240, questions: 0, perQuestion: 30, format: 'typed', adaptive: false },
    },
    scoreLabel: 'Correct', scoreFormat: 'count', higherIsBetter: true,
  })),
  ...SIMS,
  /* ---------------- Cognitive ---------------- */
  {
    id: 'task-switch', name: 'Task Switch', category: 'cognitive',
    summary: 'Classify each digit by the rule its frame shows: odd/even or below/above 5.',
    howTo: ['Blue frame: odd → F, even → J.', 'Amber frame: below 5 → F, above 5 → J.', 'The rule can change on any trial. Respond before the window closes.'],
    controls: ['F left answer · J right answer', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY],
    settings: [n('duration', 'Session length', 30, 1800, 15, 's'), n('switchPct', 'Switch probability', 10, 90, 5, '%'), n('window', 'Response window', 600, 5000, 100, 'ms'), b('adaptive', 'Adapt response window', '−5% after correct, +10% after errors')],
    presets: { easy: { duration: 60, switchPct: 30, window: 3000, adaptive: false }, medium: { duration: 90, switchPct: 50, window: 2000, adaptive: false }, hard: { duration: 120, switchPct: 70, window: 1300, adaptive: true } },
    scoreLabel: 'Net correct', scoreFormat: 'count', higherIsBetter: true,
  },
  {
    id: 'response-conflict', name: 'Response Conflict', category: 'cognitive',
    summary: 'Flanker and Simon tasks: respond to the relevant feature, ignore the conflicting one.',
    howTo: ['Flanker: press the direction of the middle arrow (F for ←, J for →).', 'Simon: press by colour, wherever the square appears (F for red, J for blue).'],
    controls: ['F · J', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY],
    settings: [sel('task', 'Task', [['flanker', 'Flanker'], ['simon', 'Simon'], ['mixed', 'Mixed']]), n('trials', 'Trials', 10, 1000, 10), n('congruentPct', 'Congruent trials', 0, 100, 5, '%'), n('window', 'Response window', 400, 5000, 100, 'ms'), b('adaptive', 'Adapt response window', '−5% after correct, +10% after errors')],
    presets: { easy: { task: 'flanker', trials: 40, congruentPct: 60, window: 2500, adaptive: false }, medium: { task: 'mixed', trials: 60, congruentPct: 50, window: 1800, adaptive: false }, hard: { task: 'mixed', trials: 80, congruentPct: 35, window: 1200, adaptive: true } },
    scoreLabel: 'Accuracy', scoreFormat: 'percent', higherIsBetter: true,
  },
  {
    id: 'pincode', name: 'Pincode Game', category: 'cognitive',
    summary: 'Memorise a flashing digit sequence and type it back in order, reversed or sorted.',
    howTo: ['Digits flash one at a time. Then type them back in the order requested.', 'The sequence grows by one after a correct answer and shrinks after two misses in a row.'],
    controls: ['Type digits', 'Enter submits', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY, 'Adaptive staircase is original'],
    settings: [sel('mode', 'Order', [['forward', 'In order'], ['reverse', 'Reversed'], ['sorted', 'Sorted'], ['mixed', 'Mixed']]), n('startLength', 'Starting length', 3, 10), n('trials', 'Trials', 5, 40), n('flashMs', 'Digit display time', 200, 2000, 50, 'ms')],
    presets: { easy: { mode: 'forward', startLength: 4, trials: 12, flashMs: 800 }, medium: { mode: 'mixed', startLength: 5, trials: 15, flashMs: 650 }, hard: { mode: 'mixed', startLength: 6, trials: 20, flashMs: 500 } },
    scoreLabel: 'Digits recalled', scoreFormat: 'count', higherIsBetter: true,
  },
  {
    id: 'cube-folding', name: 'Cube Folding', category: 'cognitive',
    summary: 'Pick the cube corner view that could be folded from the net.',
    howTo: ['The net is printed on the outside of the cube. Each option shows the top, front and right faces of a cube.', 'Exactly one option is foldable. Wrong options show two opposite faces together, are a mirror image, or (with letter orientation on) have a letter turned the wrong way.', 'With orientation on, faces carry asymmetric letters, so you must track how each letter turns as the net folds.'],
    controls: ['1–6 choose', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY, 'Fold handedness and letter orientation are derived mathematically and unit-tested, but have not been compared with a physical paper net'],
    settings: [n('questions', 'Questions', 3, 100), n('perQuestion', 'Time per question', 0, 120, 5, 's', '0 = untimed'), b('orientation', 'Letter orientation matters'), n('options', 'Options per question', 3, 6)],
    presets: { easy: { questions: 8, perQuestion: 0, orientation: false, options: 4 }, medium: { questions: 10, perQuestion: 30, orientation: true, options: 4 }, hard: { questions: 15, perQuestion: 20, orientation: true, options: 5 } },
    scoreLabel: 'Correct', scoreFormat: 'count', higherIsBetter: true,
  },
  {
    id: 'code-match', name: 'Code Match', category: 'cognitive',
    summary: 'Find the exact match among near-identical codes before the shrinking clock runs out.',
    howTo: ['Click the option identical to the target. Distractors swap neighbouring characters or use lookalikes (0/O, 1/I, 5/S, 8/B…).', 'The time allowed shrinks every round.'],
    controls: ['1–8 choose', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY],
    settings: [n('rounds', 'Rounds', 5, 60), n('length', 'Code length', 4, 10), n('options', 'Options', 3, 8), n('startMs', 'Starting time', 1500, 12000, 250, 'ms'), n('shrinkPct', 'Shrink per round', 0, 10, 1, '%')],
    presets: { easy: { rounds: 15, length: 6, options: 4, startMs: 6000, shrinkPct: 3 }, medium: { rounds: 20, length: 6, options: 5, startMs: 4500, shrinkPct: 4 }, hard: { rounds: 25, length: 8, options: 6, startMs: 3500, shrinkPct: 5 } },
    scoreLabel: 'Correct', scoreFormat: 'count', higherIsBetter: true,
  },
  {
    id: 'grid-recall', name: 'Grid Recall', category: 'cognitive',
    summary: 'Rebuild a flashed pattern of cells from memory while red decoys try to get into your answer.',
    howTo: ['A pattern flashes on the grid. Then click the cells that were lit.', 'During recall, red decoy cells flash. They were never part of the pattern.', 'Perfect answers grow the pattern; misses shrink it.'],
    controls: ['Click cells', 'Enter submits', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY, 'Decoy timing and adaptive rule are original'],
    settings: [n('size', 'Grid size', 3, 7), n('startCells', 'Starting cells', 2, 12), n('trials', 'Trials', 5, 40), n('decoys', 'Decoys per trial', 0, 4), n('flashMs', 'Pattern display time', 300, 3000, 100, 'ms')],
    presets: { easy: { size: 4, startCells: 3, trials: 10, decoys: 1, flashMs: 1200 }, medium: { size: 5, startCells: 4, trials: 12, decoys: 2, flashMs: 1000 }, hard: { size: 6, startCells: 5, trials: 15, decoys: 3, flashMs: 800 } },
    scoreLabel: 'Cells recalled', scoreFormat: 'count', higherIsBetter: true,
  },
  {
    id: 'intercept', name: 'Intercept', category: 'cognitive',
    summary: 'Balls fall along four lines; fire early enough that your shot meets them.',
    howTo: ['Each line has a cannon at the bottom. Shots take time to travel, so fire before the ball arrives.', 'Hits score. Missed balls and wasted shots cost a point.'],
    controls: ['D F J K fire lines 1–4', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY],
    settings: [n('duration', 'Session length', 30, 300, 15, 's'), n('ballSpeed', 'Ball speed', 40, 300, 10, 'px/s'), n('shotSpeed', 'Shot speed', 150, 800, 10, 'px/s'), n('spawnMs', 'Ball interval', 500, 4000, 100, 'ms')],
    presets: { easy: { duration: 60, ballSpeed: 90, shotSpeed: 360, spawnMs: 1800 }, medium: { duration: 75, ballSpeed: 120, shotSpeed: 340, spawnMs: 1400 }, hard: { duration: 90, ballSpeed: 150, shotSpeed: 320, spawnMs: 1000 } },
    scoreLabel: 'Net hits', scoreFormat: 'count', higherIsBetter: true,
  },
  {
    id: 'hold-fire', name: 'Hold Fire', category: 'cognitive',
    summary: 'Fire fast at targets that match the cue and hold fire for everything else.',
    howTo: ['The cue names a colour or a shape. Press Space only when the stimulus matches it.', 'The cue changes every few trials and the response window tightens as you go.'],
    controls: ['Space fire', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY],
    settings: [n('trials', 'Trials', 20, 200, 10), n('startWindow', 'Starting window', 500, 2500, 50, 'ms'), n('minWindow', 'Fastest window', 250, 1500, 50, 'ms'), n('cueEvery', 'Cue changes every', 3, 30, 1, 'trials'), n('goPct', 'Target frequency', 20, 80, 5, '%')],
    presets: { easy: { trials: 60, startWindow: 1200, minWindow: 700, cueEvery: 15, goPct: 60 }, medium: { trials: 80, startWindow: 1000, minWindow: 550, cueEvery: 10, goPct: 55 }, hard: { trials: 100, startWindow: 850, minWindow: 400, cueEvery: 7, goPct: 50 } },
    scoreLabel: 'Accuracy', scoreFormat: 'percent', higherIsBetter: true,
  },
  {
    id: 'target-number', name: 'Target Number', category: 'cognitive',
    summary: 'Combine four numbers with + − × ÷ to hit the target.',
    howTo: ['Use each number exactly once, with brackets as needed. Every puzzle has at least one solution.', 'Skip reveals a solution and scores nothing.'],
    controls: ['Type an expression', 'Enter submits', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY],
    settings: [n('rounds', 'Rounds', 1, 20), n('roundTime', 'Time per round', 0, 300, 5, 's', '0 = untimed'), n('maxNum', 'Largest number', 6, 25), n('targetMax', 'Largest target', 24, 500, 1)],
    presets: { easy: { rounds: 5, roundTime: 90, maxNum: 9, targetMax: 50 }, medium: { rounds: 6, roundTime: 60, maxNum: 13, targetMax: 100 }, hard: { rounds: 8, roundTime: 45, maxNum: 20, targetMax: 200 } },
    scoreLabel: 'Solved', scoreFormat: 'count', higherIsBetter: true,
  },
  {
    id: 'pump', name: 'Pump', category: 'cognitive',
    summary: 'Pump a balloon for money and cash in before it pops.',
    howTo: ['Each pump adds money to the balloon. Cash in to bank it. If it pops, the balloon\'s money is lost.', 'Pop points are random. In mixed mode each colour has a different maximum size; learn them.'],
    controls: ['Space pump', 'Enter cash in', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY, 'Pop distribution (uniform) and colours are original'],
    settings: [n('balloons', 'Balloons', 5, 60), sel('type', 'Balloons', [['single', 'One kind'], ['mixed', 'Three colours']]), n('maxPumps', 'Maximum pumps (one kind)', 8, 128, 8), n('cents', 'Value per pump', 1, 50, 1, '¢')],
    presets: { easy: { balloons: 20, type: 'single', maxPumps: 64, cents: 5 }, medium: { balloons: 30, type: 'mixed', maxPumps: 64, cents: 5 }, hard: { balloons: 40, type: 'mixed', maxPumps: 64, cents: 5 } },
    scoreLabel: 'Banked', scoreFormat: 'money', higherIsBetter: true,
  },
  {
    id: 'skyline', name: 'Skyline', category: 'cognitive',
    summary: 'Rearrange coloured blocks to match the goal in the fewest moves. No clock.',
    howTo: ['Towers hold at most 3, 2 and 1 blocks. Move the top block of one tower onto another.', 'Each puzzle scores optimal moves ÷ your moves. Planning time before your first move is recorded.'],
    controls: ['Click a tower to pick up, click another to drop', 'Keys 1/2/3 do the same', 'U undo', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY],
    settings: [n('puzzles', 'Puzzles', 2, 20), n('minMoves', 'Shortest solution from', 1, 7), n('maxMoves', 'Shortest solution to', 2, 8)],
    presets: { easy: { puzzles: 6, minMoves: 2, maxMoves: 4 }, medium: { puzzles: 8, minMoves: 3, maxMoves: 5 }, hard: { puzzles: 10, minMoves: 4, maxMoves: 7 } },
    scoreLabel: 'Efficiency', scoreFormat: 'percent', higherIsBetter: true,
  },
  {
    id: 'mystery-figure', name: 'Mystery Figure', category: 'cognitive',
    summary: 'Deduce a hidden row of symbols when feedback only tells you how many are in the right place.',
    howTo: ['Build a guess and submit it. You learn only how many positions are exactly right.', 'There is no clock. Fewer attempts are better; results compare you to a simple consistent-guess strategy.'],
    controls: ['Click symbols or press 1–8', 'Backspace removes', 'Enter submits', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY],
    settings: [n('length', 'Figure length', 3, 5), n('symbols', 'Symbols', 3, 8), n('puzzles', 'Puzzles', 1, 10)],
    presets: { easy: { length: 3, symbols: 4, puzzles: 3 }, medium: { length: 4, symbols: 6, puzzles: 3 }, hard: { length: 5, symbols: 6, puzzles: 2 } },
    scoreLabel: 'Attempts vs benchmark', scoreFormat: 'percent', higherIsBetter: true,
  },
  {
    id: 'sweet-spot', name: 'Sweet Spot', category: 'cognitive',
    summary: 'Click each rotating dial while its needle is inside the target arc.',
    howTo: ['Dials appear and expire. Each takes one click: inside the arc scores, outside or expired costs a point.'],
    controls: ['Click a dial, or press its number', 'Esc leaves'], verification: 'description-only', unverified: [DESC_ONLY],
    settings: [n('duration', 'Session length', 30, 300, 15, 's'), n('maxDials', 'Dials at once', 1, 6), n('speed', 'Needle speed', 60, 400, 10, '°/s'), n('arc', 'Target arc', 15, 90, 5, '°'), n('lifeMs', 'Dial lifetime', 2000, 10000, 250, 'ms')],
    presets: { easy: { duration: 60, maxDials: 2, speed: 120, arc: 50, lifeMs: 6000 }, medium: { duration: 75, maxDials: 3, speed: 170, arc: 40, lifeMs: 5000 }, hard: { duration: 90, maxDials: 5, speed: 220, arc: 30, lifeMs: 4000 } },
    scoreLabel: 'Net hits', scoreFormat: 'count', higherIsBetter: true,
  },
];

GAMES.push(BET_GRID, ...TEST_SPECS.map(testMeta));

export const GAME_BY_ID: Record<string, GameMeta> = Object.fromEntries(GAMES.map((g) => [g.id, g]));

export const TIMING_KEYS = ['duration', 'decisionTime', 'perQuestion', 'roundTime', 'tickMs'];
