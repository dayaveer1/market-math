const { chromium } = require('@playwright/test');
const URL0 = 'file://' + __dirname + '/out/games.html#';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function done(page) { return page.locator('#result').count().then((c) => c > 0); }
async function untilDone(page, step, max = 200) { for (let i = 0; i < max && !(await done(page)); i++) await step(i); }
async function answerQuiz(page, wrongFirst) {
  let i = 0;
  await untilDone(page, async () => {
    const fw = await page.evaluate(() => window.__fw);
    const inp = page.getByTestId('answer-input');
    if (fw.isOption) { await page.keyboard.press(String(i === 0 && wrongFirst ? ((fw.value + 1) % 2) + 1 : fw.value + 1)); }
    else if (await inp.count()) { await inp.fill(i === 0 && wrongFirst ? '-987654' : String(fw.value)); await inp.press('Enter'); }
    else { // multiple choice: find the button whose label contains the value
      const btns = page.locator('[data-testid=quiz] button');
      const n = await btns.count(); let clicked = false;
      const labels = await btns.allInnerTexts();
      const k = labels.findIndex((t) => Math.abs(parseFloat(t.replace(/^\d\s*/, '').replace(/[,%\s]/g, '')) - fw.value) < 1e-3 * Math.max(1, Math.abs(fw.value)));
      if (k >= 0) { await btns.nth(k).click(); clicked = true; }
      if (!clicked) await btns.first().click();
    }
    i++; await sleep(30);
  });
}
const quiz = (extra = {}) => ({ s: { duration: 0, questions: 5, perQuestion: 0, ...extra }, run: (p) => answerQuiz(p, true) });
const T = {
  math: quiz(), sequence: quiz(), fractions: quiz(), probability: quiz({ format: 'typed' }), 'fermi-questions': quiz(),
  'etf-drills': quiz({ format: 'typed' }), 'options-drills': quiz({ format: 'typed' }), 'futures-drills': quiz({ format: 'typed' }), 'prediction-drills': quiz({ format: 'typed' }),
  'math-choice': { game: 'math', s: { duration: 0, questions: 4, format: 'choice' }, run: (p) => answerQuiz(p, false) },
  'math-timed': { game: 'math', s: { duration: 3, questions: 0 }, run: async (p) => { await sleep(3800); } },
  'quiz-perq-timeout': { game: 'sequence', s: { duration: 0, questions: 2, perQuestion: 1 }, run: async (p) => { await sleep(3000); } },
  dice: { s: { rounds: 2, decisionTime: 0 }, run: async (p) => {
    await p.getByLabel('Quantity').press('p');
    await p.getByLabel('Return this round').fill('0'); await p.getByLabel('Return this round').press('Enter');
    await p.keyboard.press('Enter');
    await p.getByLabel('Quantity').fill('1'); await p.getByLabel('Quantity').press('Enter');
    await p.getByLabel('Return this round').fill('99999'); await p.getByLabel('Return this round').press('Enter');
    await p.keyboard.press('Enter');
  } },
  'dice-invalid-and-timeout': { game: 'dice', s: { rounds: 1, decisionTime: 1 }, run: async (p) => {
    await p.getByLabel('Quantity').fill('100000'); await p.getByLabel('Quantity').press('Enter');
    const err = await p.locator('text=more than your balance').count(); if (!err) throw new Error('no validation message');
    await sleep(1500); // timeout → no trade
    await p.getByLabel('Return this round').fill('0'); await p.getByLabel('Return this round').press('Enter'); await p.keyboard.press('Enter');
  } },
  'card-game': { s: { rounds: 3, decisionTime: 0 }, run: async (p) => { for (let i = 0; i < 3; i++) { if (i === 1) await p.locator('table button').first().click(); else await p.keyboard.press('p'); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); } } },
  'higher-lower': { s: { cards: 5, decisionTime: 0 }, run: async (p) => { await p.keyboard.press('3'); for (let i = 0; i < 5 && !(await done(p)); i++) { await p.keyboard.press(i % 2 ? 'h' : 'l'); await sleep(50); } } },
  'fermi-game': { s: { questions: 2, decisionTime: 0 }, run: async (p) => { for (let i = 0; i < 2; i++) { await p.getByLabel('Low estimate').fill(i ? '1' : '5'); await p.getByLabel('High estimate').fill(i ? '1e30' : '6'); await p.getByLabel('High estimate').press('Enter'); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); } } },
  'event-contracts': { s: { rounds: 2, decisionTime: 0 }, run: async (p) => { for (let i = 0; i < 2; i++) { await p.getByLabel('Bid').fill('40'); await p.getByLabel('Ask').fill('50'); await p.getByLabel('Ask').press('Enter'); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); } } },
  'trading-game': { s: { draws: 3, decisionTime: 0 }, run: async (p) => { await untilDone(p, async () => {
    if (await p.getByLabel('Bid').count()) { await p.getByLabel('Bid').fill('28'); await p.getByLabel('Ask').fill('33'); await p.getByLabel('Ask').press('Enter'); }
    else if (await p.locator('text=See results').count()) await p.keyboard.press('Enter');
    else await p.keyboard.press('b');
    await sleep(60);
  }, 40); } },
  'etf-arb': { s: { duration: 4, tickMs: 400 }, run: async (p) => { for (let i = 0; i < 6; i++) { await p.keyboard.press(['1', 'q', '2', 'w', '3', 'e'][i]); await sleep(300); } await sleep(2500); } },
  'task-switch': { s: { duration: 4, window: 1500 }, run: async (p) => { for (let i = 0; i < 15; i++) { await p.keyboard.press(i % 2 ? 'f' : 'j'); await sleep(150); } await sleep(2000); } },
  'response-conflict': { s: { trials: 8, window: 1500 }, run: async (p) => { for (let i = 0; i < 8; i++) { await p.keyboard.press('f'); await sleep(400); } await sleep(1500); } },
  pincode: { s: { trials: 2, startLength: 3, flashMs: 200 }, run: async (p) => { for (let i = 0; i < 2; i++) { await p.getByLabel('Digits').waitFor({ timeout: 5000 }); await p.getByLabel('Digits').fill('000'); await p.getByLabel('Digits').press('Enter'); await sleep(1100); } } },
  'cube-folding': { s: { questions: 3, perQuestion: 0 }, run: async (p) => { for (let i = 0; i < 3; i++) { await p.keyboard.press('1'); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); } } },
  'code-match': { s: { rounds: 4 }, run: async (p) => { for (let i = 0; i < 4; i++) { await p.keyboard.press(String((i % 4) + 1)); await sleep(80); } } },
  'grid-recall': { s: { trials: 2, flashMs: 300, decoys: 1 }, run: async (p) => { for (let i = 0; i < 2; i++) { await p.locator('text=Submit').waitFor({ timeout: 4000 }); await p.getByLabel('cell 1', { exact: true }).click(); await p.keyboard.press('Enter'); await sleep(1400); } } },
  intercept: { s: { duration: 4, spawnMs: 500, ballSpeed: 200 }, run: async (p) => { for (let i = 0; i < 16; i++) { await p.keyboard.press('dfjk'[i % 4]); await sleep(200); } await sleep(1500); } },
  'hold-fire': { s: { trials: 12, startWindow: 500, minWindow: 300, cueEvery: 4 }, run: async (p) => { for (let i = 0; i < 12; i++) { if (i % 2) await p.keyboard.press(' '); await sleep(450); } await sleep(4000); } },
  'target-number': { s: { rounds: 2, roundTime: 0 }, run: async (p) => {
    await p.getByLabel('Expression').fill('1+1'); await p.getByLabel('Expression').press('Enter');
    if (!(await p.locator('text=exactly once').count())) throw new Error('no usage validation');
    for (let i = 0; i < 2; i++) { await p.locator('button:has-text("Skip")').click(); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); }
  } },
  pump: { s: { balloons: 3 }, run: async (p) => { for (let i = 0; i < 3; i++) { await p.keyboard.press(' '); await p.keyboard.press(' '); await p.keyboard.press('Enter'); await sleep(800); } } },
  skyline: { s: { puzzles: 1, minMoves: 1, maxMoves: 1 }, run: async (p) => {
    const moves = [[1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2]];
    for (const [a, b] of moves) { if (await p.locator('text=Solved in').count()) break; await p.keyboard.press(String(a)); await p.keyboard.press(String(b)); await sleep(50); if (!(await p.locator('text=Solved in').count())) await p.keyboard.press('u'); }
    await p.keyboard.press('Enter');
  } },
  'mystery-figure': { s: { length: 3, symbols: 3, puzzles: 1 }, run: async (p) => {
    outer: for (let a = 1; a <= 3; a++) for (let b = 1; b <= 3; b++) for (let c = 1; c <= 3; c++) { if (await p.locator('text=Solved in').count()) break outer; for (const k of [a, b, c]) await p.keyboard.press(String(k)); await p.keyboard.press('Enter'); await sleep(20); }
    await p.keyboard.press('Enter');
  } },
  'etf-sim (step mode)': { game: 'etf-sim', s: { ticks: 20, tickMs: 0, showFair: true }, run: async (p) => { await p.keyboard.press('ArrowRight'); for (let i = 0; i < 20 && !(await done(p)); i++) { if (i % 5 === 4) await p.keyboard.press('h'); await p.keyboard.press(i % 2 ? 'ArrowUp' : 'ArrowDown'); await p.keyboard.press('n'); await sleep(20); } } },
  'options-sim (real time)': { game: 'options-sim', s: { ticks: 15, tickMs: 150 }, run: async (p) => { for (let i = 0; i < 6; i++) { await p.keyboard.press('h'); await sleep(250); } await sleep(2500); } },
  'futures-sim (pull quote, end early)': { game: 'futures-sim', s: { ticks: 200, tickMs: 0 }, run: async (p) => { for (let i = 0; i < 5; i++) await p.keyboard.press('n'); await p.keyboard.press('q'); await p.keyboard.press('n'); await p.keyboard.press('f'); } },
  'prediction-sim': { game: 'prediction-sim', s: { ticks: 25, tickMs: 0, newsPct: 50 }, run: async (p) => { for (let i = 0; i < 25 && !(await done(p)); i++) { await p.keyboard.press('n'); await sleep(15); } } },
  'bet-grid': { game: 'bet-grid', s: { rounds: 3, roundTime: 0 }, run: async (p) => { for (let i = 0; i < 3; i++) { await p.keyboard.press('1'); await p.keyboard.press('Enter'); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); } } },
  'cube-folding (orientation)': { game: 'cube-folding', s: { questions: 3, perQuestion: 0, orientation: true, options: 5 }, run: async (p) => { for (let i = 0; i < 3; i++) { await p.keyboard.press('2'); await sleep(50); await p.keyboard.press('Enter'); await sleep(50); } } },
  'math (decimals)': { game: 'math', s: { mode: 'decimals', duration: 0, questions: 4 }, run: (p) => answerQuiz(p, true) },
  'math (fractions)': { game: 'math', s: { mode: 'fractions', duration: 0, questions: 4 }, run: (p) => answerQuiz(p, false) },
  'math (mixed, choice)': { game: 'math', s: { mode: 'mixed', duration: 0, questions: 6, format: 'choice' }, run: (p) => answerQuiz(p, false) },
  'probability (adaptive)': { game: 'probability', s: { duration: 0, questions: 8, format: 'typed', adaptive: true }, run: (p) => answerQuiz(p, false) },
  'sequence (unlimited, finish button)': { game: 'sequence', s: { duration: 0, questions: 0 }, run: async (p) => { for (let i = 0; i < 3; i++) { const fw = await p.evaluate(() => window.__fw); await p.getByTestId('answer-input').fill(String(fw.value)); await p.getByTestId('answer-input').press('Enter'); await sleep(30); } await p.getByTestId('finish').click(); } },
  'oa-hard-six (skip)': { game: 'oa-hard-six', s: { questions: 6, duration: 0 }, run: async (p) => { await p.keyboard.press('s'); await answerQuiz(p, false); } },
  'task-switch (adaptive)': { game: 'task-switch', s: { duration: 3, window: 800, adaptive: true }, run: async (p) => { for (let i = 0; i < 10; i++) { await p.keyboard.press('f'); await sleep(150); } await sleep(2000); } },
  'sweet-spot': { s: { duration: 4, maxDials: 4, lifeMs: 2000 }, run: async (p) => { for (let i = 0; i < 12; i++) { await p.keyboard.press(String((i % 6) + 1)); await sleep(250); } await sleep(1500); } },
};
const { TEST_IDS: TESTS } = require('./out/tests.json');
for (const id of TESTS) T[id] = { game: id, s: { questions: 6, duration: 0 }, run: (p) => answerQuiz(p, true) };
(async () => {
  const browser = await chromium.launch();
  const only = process.argv[2];
  let pass = 0, fail = 0;
  for (const [name, t] of Object.entries(T)) {
    if (only && !name.startsWith(only)) continue;
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    const game = t.game ?? name;
    try {
      await page.goto(URL0 + new URLSearchParams({ game, s: JSON.stringify(t.s), seed: '11' }).toString());
      await sleep(150);
      await t.run(page);
      await page.locator('#result').waitFor({ timeout: 8000 });
      const r = JSON.parse(await page.locator('#result').innerText());
      if (errs.length) throw new Error('console errors: ' + errs.slice(0, 2).join(' | '));
      if (typeof r.score !== 'number' || Number.isNaN(r.score)) throw new Error('bad score ' + JSON.stringify(r));
      console.log('PASS', name.padEnd(26), JSON.stringify({ score: r.score, correct: r.correct, total: r.total, mistakes: r.mistakes, lines: (r.lines || []).slice(0, 2) }));
      pass++;
    } catch (e) { fail++; console.log('FAIL', name, e.message.split('\n')[0], errs.slice(0, 2)); }
    await page.close();
  }
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
})();
