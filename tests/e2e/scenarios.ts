/**
 * Per-game interaction scenarios. The same scenarios were run in the authoring sandbox against a
 * standalone harness (see docs/VERIFICATION.md); here they run against the real Next.js app.
 */
import type { Page } from '@playwright/test';
import { TEST_SPECS } from '../../src/lib/assessments';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const finished = async (p: Page) => (await p.getByTestId('results').count()) > 0;
async function untilDone(p: Page, step: (i: number) => Promise<void>, max = 200) {
  for (let i = 0; i < max && !(await finished(p)); i++) await step(i);
}
type Fw = { answer: string; value: number; isOption?: boolean };
async function answerQuiz(p: Page, wrongFirst: boolean) {
  let i = 0;
  await untilDone(p, async () => {
    const fw = (await p.evaluate(() => (window as unknown as { __fw: Fw }).__fw)) as Fw;
    const inp = p.getByTestId('answer-input');
    if (fw.isOption) {
      await p.keyboard.press(String(i === 0 && wrongFirst ? ((fw.value + 1) % 2) + 1 : fw.value + 1));
    } else if (await inp.count()) {
      await inp.fill(i === 0 && wrongFirst ? '-987654' : String(fw.value));
      await inp.press('Enter');
    } else {
      const btns = p.locator('[data-testid=quiz] button');
      const labels = await btns.allInnerTexts();
      const k = labels.findIndex((t) => Math.abs(parseFloat(t.replace(/^\d\s*/, '').replace(/[,%\s]/g, '')) - fw.value) < 1e-3 * Math.max(1, Math.abs(fw.value)));
      await btns.nth(Math.max(0, k)).click();
    }
    i++;
    await sleep(30);
  });
}

async function answerQuizN(p: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const fw = (await p.evaluate(() => (window as unknown as { __fw: Fw }).__fw)) as Fw;
    await p.getByTestId('answer-input').fill(String(fw.value));
    await p.getByTestId('answer-input').press('Enter');
    await sleep(30);
  }
}

export interface Scenario { game: string; s: Record<string, unknown>; run: (p: Page) => Promise<void>; expectMistakes?: boolean }
const quiz = (game: string, extra: Record<string, unknown> = {}): Scenario => ({ game, s: { duration: 0, questions: 5, perQuestion: 0, format: 'typed', ...extra }, run: (p) => answerQuiz(p, true), expectMistakes: true });

export const SCENARIOS: Record<string, Scenario> = {
  math: quiz('math'), sequence: quiz('sequence'), fractions: quiz('fractions'), probability: quiz('probability'), 'fermi-questions': quiz('fermi-questions'),
  'etf-drills': quiz('etf-drills'), 'options-drills': quiz('options-drills'), 'futures-drills': quiz('futures-drills'), 'prediction-drills': quiz('prediction-drills'),
  'math (multiple choice)': { game: 'math', s: { duration: 0, questions: 4, format: 'choice' }, run: (p) => answerQuiz(p, false) },
  'math (session timer expiry)': { game: 'math', s: { duration: 3, questions: 0 }, run: async () => { await sleep(3800); } },
  'sequence (per-question timeout)': { game: 'sequence', s: { duration: 0, questions: 2, perQuestion: 1 }, run: async () => { await sleep(3000); }, expectMistakes: true },
  dice: { game: 'dice', s: { rounds: 2, decisionTime: 0 }, expectMistakes: true, run: async (p) => {
    await p.getByLabel('Quantity').press('p');
    await p.getByLabel('Return this round').fill('0'); await p.getByLabel('Return this round').press('Enter');
    await p.keyboard.press('Enter');
    await p.getByLabel('Quantity').fill('1'); await p.getByLabel('Quantity').press('Enter');
    await p.getByLabel('Return this round').fill('99999'); await p.getByLabel('Return this round').press('Enter');
    await p.keyboard.press('Enter');
  } },
  'dice (invalid order, timeout)': { game: 'dice', s: { rounds: 1, decisionTime: 1 }, run: async (p) => {
    await p.getByLabel('Quantity').fill('100000'); await p.getByLabel('Quantity').press('Enter');
    await p.getByText('more than your balance').waitFor();
    await sleep(1500);
    await p.getByLabel('Return this round').fill('0'); await p.getByLabel('Return this round').press('Enter'); await p.keyboard.press('Enter');
  } },
  'card-game': { game: 'card-game', s: { rounds: 3, decisionTime: 0 }, run: async (p) => { for (let i = 0; i < 3; i++) { if (i === 1) await p.locator('table button').first().click(); else await p.keyboard.press('p'); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); } } },
  'higher-lower': { game: 'higher-lower', s: { cards: 5, decisionTime: 0 }, run: async (p) => { await p.keyboard.press('3'); for (let i = 0; i < 5 && !(await finished(p)); i++) { await p.keyboard.press(i % 2 ? 'h' : 'l'); await sleep(50); } } },
  'fermi-game': { game: 'fermi-game', s: { questions: 2, decisionTime: 0 }, run: async (p) => { for (let i = 0; i < 2; i++) { await p.getByLabel('Low estimate').fill(i ? '1' : '5'); await p.getByLabel('High estimate').fill(i ? '1e30' : '6'); await p.getByLabel('High estimate').press('Enter'); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); } } },
  'event-contracts': { game: 'event-contracts', s: { rounds: 2, decisionTime: 0 }, run: async (p) => { for (let i = 0; i < 2; i++) { await p.getByLabel('Bid').fill('40'); await p.getByLabel('Ask').fill('50'); await p.getByLabel('Ask').press('Enter'); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); } } },
  'trading-game': { game: 'trading-game', s: { draws: 3, decisionTime: 0 }, run: async (p) => { await untilDone(p, async () => {
    if (await p.getByLabel('Bid').count()) { await p.getByLabel('Bid').fill('28'); await p.getByLabel('Ask').fill('33'); await p.getByLabel('Ask').press('Enter'); }
    else if (await p.getByText('See results').count()) await p.keyboard.press('Enter');
    else await p.keyboard.press('b');
    await sleep(60);
  }, 40); } },
  'etf-arb': { game: 'etf-arb', s: { duration: 4, tickMs: 400 }, run: async (p) => { for (const k of ['1', 'q', '2', 'w', '3', 'e']) { await p.keyboard.press(k); await sleep(300); } await sleep(2500); } },
  'task-switch': { game: 'task-switch', s: { duration: 4, window: 1500 }, run: async (p) => { for (let i = 0; i < 15; i++) { await p.keyboard.press(i % 2 ? 'f' : 'j'); await sleep(150); } await sleep(2000); } },
  'response-conflict': { game: 'response-conflict', s: { trials: 8, window: 1500 }, run: async (p) => { for (let i = 0; i < 8; i++) { await p.keyboard.press('f'); await sleep(400); } await sleep(1500); } },
  pincode: { game: 'pincode', s: { trials: 2, startLength: 3, flashMs: 200 }, run: async (p) => { for (let i = 0; i < 2; i++) { await p.getByLabel('Digits').waitFor({ timeout: 5000 }); await p.getByLabel('Digits').fill('000'); await p.getByLabel('Digits').press('Enter'); await sleep(1100); } } },
  'cube-folding': { game: 'cube-folding', s: { questions: 3, perQuestion: 0 }, run: async (p) => { for (let i = 0; i < 3; i++) { await p.keyboard.press('1'); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); } } },
  'code-match': { game: 'code-match', s: { rounds: 4 }, run: async (p) => { for (let i = 0; i < 4; i++) { await p.keyboard.press(String(i + 1)); await sleep(80); } } },
  'grid-recall': { game: 'grid-recall', s: { trials: 2, flashMs: 300, decoys: 1 }, run: async (p) => { for (let i = 0; i < 2; i++) { await p.getByText('Submit').waitFor({ timeout: 4000 }); await p.getByLabel('cell 1', { exact: true }).click(); await p.keyboard.press('Enter'); await sleep(1400); } } },
  intercept: { game: 'intercept', s: { duration: 4, spawnMs: 500, ballSpeed: 200 }, run: async (p) => { for (let i = 0; i < 16; i++) { await p.keyboard.press('dfjk'[i % 4]); await sleep(200); } await sleep(1500); } },
  'hold-fire': { game: 'hold-fire', s: { trials: 12, startWindow: 500, minWindow: 300, cueEvery: 4 }, run: async (p) => { for (let i = 0; i < 12; i++) { if (i % 2) await p.keyboard.press(' '); await sleep(450); } await sleep(4000); } },
  'target-number': { game: 'target-number', s: { rounds: 2, roundTime: 0 }, run: async (p) => {
    await p.getByLabel('Expression').fill('1+1'); await p.getByLabel('Expression').press('Enter');
    await p.getByText('exactly once').waitFor();
    for (let i = 0; i < 2; i++) { await p.getByRole('button', { name: 'Skip' }).click(); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); }
  } },
  pump: { game: 'pump', s: { balloons: 3 }, run: async (p) => { for (let i = 0; i < 3; i++) { await p.keyboard.press(' '); await p.keyboard.press(' '); await p.keyboard.press('Enter'); await sleep(800); } } },
  skyline: { game: 'skyline', s: { puzzles: 1, minMoves: 1, maxMoves: 1 }, run: async (p) => {
    for (const [a, b] of [[1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2]]) {
      if (await p.getByText('Solved in').count()) break;
      await p.keyboard.press(String(a)); await p.keyboard.press(String(b)); await sleep(50);
      if (!(await p.getByText('Solved in').count())) await p.keyboard.press('u');
    }
    await p.keyboard.press('Enter');
  } },
  'mystery-figure': { game: 'mystery-figure', s: { length: 3, symbols: 3, puzzles: 1 }, run: async (p) => {
    outer: for (let a = 1; a <= 3; a++) for (let b = 1; b <= 3; b++) for (let c = 1; c <= 3; c++) {
      if (await p.getByText('Solved in').count()) break outer;
      for (const k of [a, b, c]) await p.keyboard.press(String(k));
      await p.keyboard.press('Enter'); await sleep(20);
    }
    await p.keyboard.press('Enter');
  } },
  'etf-sim (step mode)': { game: 'etf-sim', s: { ticks: 20, tickMs: 0, showFair: true }, run: async (p) => { await p.keyboard.press('ArrowRight'); for (let i = 0; i < 20 && !(await finished(p)); i++) { if (i % 5 === 4) await p.keyboard.press('h'); await p.keyboard.press(i % 2 ? 'ArrowUp' : 'ArrowDown'); await p.keyboard.press('n'); await sleep(20); } } },
  'options-sim (real time)': { game: 'options-sim', s: { ticks: 15, tickMs: 150 }, run: async (p) => { for (let i = 0; i < 6; i++) { await p.keyboard.press('h'); await sleep(250); } await sleep(2500); } },
  'futures-sim (pull quote, end early)': { game: 'futures-sim', s: { ticks: 200, tickMs: 0 }, run: async (p) => { for (let i = 0; i < 5; i++) await p.keyboard.press('n'); await p.keyboard.press('q'); await p.keyboard.press('n'); await p.keyboard.press('f'); } },
  'prediction-sim': { game: 'prediction-sim', s: { ticks: 25, tickMs: 0, newsPct: 50 }, run: async (p) => { for (let i = 0; i < 25 && !(await finished(p)); i++) { await p.keyboard.press('n'); await sleep(15); } } },
  'bet-grid': { game: 'bet-grid', s: { rounds: 3, roundTime: 0 }, expectMistakes: false, run: async (p) => { for (let i = 0; i < 3; i++) { await p.keyboard.press('1'); await p.keyboard.press('Enter'); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); } } },
  'cube-folding (orientation)': { game: 'cube-folding', s: { questions: 3, perQuestion: 0, orientation: true, options: 5 }, run: async (p) => { for (let i = 0; i < 3; i++) { await p.keyboard.press('2'); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); } } },
  'math (decimals)': { game: 'math', s: { mode: 'decimals', duration: 0, questions: 4 }, run: (p) => answerQuiz(p, true), expectMistakes: true },
  'math (mixed, choice)': { game: 'math', s: { mode: 'mixed', duration: 0, questions: 6, format: 'choice' }, run: (p) => answerQuiz(p, false) },
  'probability (adaptive)': { game: 'probability', s: { duration: 0, questions: 8, format: 'typed', adaptive: true }, run: (p) => answerQuiz(p, false) },
  'sequence (unlimited, finish button)': { game: 'sequence', s: { duration: 0, questions: 0 }, run: async (p) => { await answerQuizN(p, 3); await p.getByTestId('finish').click(); } },
  'task-switch (adaptive)': { game: 'task-switch', s: { duration: 3, window: 800, adaptive: true }, run: async (p) => { for (let i = 0; i < 10; i++) { await p.keyboard.press('f'); await sleep(150); } await sleep(2000); } },
  'sweet-spot': { game: 'sweet-spot', s: { duration: 4, maxDials: 4, lifeMs: 2000 }, run: async (p) => { for (let i = 0; i < 12; i++) { await p.keyboard.press(String((i % 6) + 1)); await sleep(250); } await sleep(1500); } },
};
for (const t of TEST_SPECS) SCENARIOS[t.id] = { game: t.id, s: { questions: 6, duration: 0 }, run: (p) => answerQuiz(p, true), expectMistakes: true };
