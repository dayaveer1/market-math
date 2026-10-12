const { chromium } = require('@playwright/test');
const BASE = 'file://' + __dirname + '/out/app.html#';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const ok = (name, cond, extra = '') => { checks.push([name, !!cond]); console.log(cond ? 'PASS' : 'FAIL', name, extra); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE + '/'); await sleep(300);
  const rows = await p.locator('[data-testid^=game-]').count();
  ok('library lists all activities', rows === 51, rows);
  await p.getByRole('button', { name: /Online assessments/ }).click();
  ok('assessment category count', (await p.locator('[data-testid^=game-]').count()) === 18);
  await p.getByRole('button', { name: /^All/ }).click();
  await p.keyboard.press('/'); await p.keyboard.type('Sweet Spot');
  ok('search filters', (await p.locator('[data-testid^=game-]').count()) === 1);

  // Game shell: difficulty, custom, practice, escape, play to results, restart
  await p.goto(BASE + '/play/math'); await sleep(300);
  for (const d of ['easy', 'medium', 'hard', 'custom']) await p.getByRole('button', { name: d, exact: true }).click();
  ok('all four difficulties selectable', (await p.getByRole('button', { name: 'custom', exact: true }).getAttribute('aria-pressed')) === 'true');
  await p.getByRole('button', { name: 'hard', exact: true }).click();
  await p.getByRole('radio', { name: 'practice' }).click();
  await p.getByTestId('start').click(); await sleep(400);
  ok('practice mode: no timer, finish button present', (await p.getByLabel('Time remaining').count()) === 0 && (await p.getByTestId('finish').count()) === 1);
  await p.keyboard.press('Escape'); await sleep(100);
  ok('Esc returns to setup', (await p.getByTestId('start').count()) === 1);
  await p.getByRole('radio', { name: 'standard' }).click();
  await p.goto(BASE + '/play/math?' + new URLSearchParams({ s: JSON.stringify({ duration: 0, questions: 3, format: 'typed' }), autostart: '1', seed: '5' })); await sleep(400);
  for (let i = 0; i < 3; i++) { const fw = await p.evaluate(() => window.__fw); await p.getByTestId('answer-input').fill(i === 0 ? '-1' : String(fw.value)); await p.getByTestId('answer-input').press('Enter'); await sleep(50); }
  ok('settings link autostarts and reaches results', (await p.getByTestId('results').count()) === 1);
  ok('results show score', (await p.getByTestId('final-score').innerText()).trim() === '2');
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('floorwork:v1')));
  ok('record and mistake persisted', saved.state.records.length === 1 && saved.state.mistakes.length === 1 && saved.version === 2);
  await p.keyboard.press('r'); await sleep(300);
  ok('R restarts', (await p.getByTestId('quiz').count()) === 1);

  await p.goto(BASE + '/review'); await sleep(300);
  ok('review lists the mistake', (await p.getByText('You:').count()) >= 1);
  await p.goto(BASE + '/stats'); await sleep(300);
  ok('stats shows history', (await p.getByText('Score history').count()) === 1);

  // Interview battery (custom: Bet Grid + Cube Folding, 2 minutes)
  await p.goto(BASE + '/assessment'); await sleep(300);
  await p.getByRole('spinbutton').first().fill('5');
  await p.getByRole('button', { name: 'Bet Grid' }).click();
  await p.getByRole('button', { name: 'Cube Folding' }).click();
  await p.getByRole('button', { name: /Use 2 sections/ }).click();
  await p.getByTestId('start-battery').click(); await sleep(500);
  await p.keyboard.press('g'); await sleep(200);
  ok('global G shortcut is suspended during an assessment', (await p.getByText('Drill 1 of 2').count()) === 1);
  for (let i = 0; i < 20 && !(await p.getByRole('button', { name: /^Next:/ }).count()); i++) { await p.keyboard.press('Enter'); await sleep(120); }
  await p.getByRole('button', { name: /^Next:/ }).click(); await sleep(500);
  for (let i = 0; i < 20 && !(await p.getByTestId('battery-results').count()); i++) { await p.keyboard.press('1'); await sleep(80); await p.keyboard.press('Enter'); await sleep(120); }
  await sleep(300);
  const overall = await p.getByTestId('overall').innerText().catch(() => '');
  ok('battery completes with overall score', /\/100/.test(overall), overall);
  await p.reload(); await sleep(300);
  ok('battery saved in history', (await p.getByText('Past assessments').count()) === 1);
  // preset plan shows sections
  await p.getByRole('button', { name: /Trader online screen/ }).click();
  ok('preset plan lists 5 sections', (await p.locator('ol li').count()) === 5);

  await p.goto(BASE + '/session'); await sleep(300);
  await p.getByRole('button', { name: 'Fractions to Decimals' }).click();
  await p.getByRole('button', { name: 'Bet Grid' }).click();
  await p.getByRole('button', { name: /Start 2 drills/ }).click(); await sleep(400);
  ok('custom session starts', (await p.getByText('Drill 1 of 2').count()) === 1);
  await p.goto(BASE + '/daily'); await sleep(300);
  ok('daily lists three drills', (await p.locator('ol li').count()) === 3);
  const btn = p.getByRole('button', { name: 'Change theme' });
  await btn.click(); await btn.click();
  ok('theme toggles to dark', await p.evaluate(() => document.documentElement.classList.contains('dark')));
  // simulator inside the shell
  await p.goto(BASE + '/play/options-sim?' + new URLSearchParams({ s: JSON.stringify({ ticks: 10, tickMs: 0 }), autostart: '1' })); await sleep(500);
  for (let i = 0; i < 10; i++) { await p.keyboard.press('n'); await sleep(20); }
  ok('options simulator in shell reaches results', (await p.getByTestId('results').count()) === 1);
  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close();
  const f = checks.filter((c) => !c[1]).length;
  console.log(`\n${checks.length - f} passed, ${f} failed`);
})();
