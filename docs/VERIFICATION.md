# VERIFICATION.md

What has actually been executed, where, and with what result. Nothing here should be read as "the real build passes" until section 3 is filled in.

## 1. Authoring sandbox (11 Oct 2026, sessions 1–3)

**Environment:** Ubuntu 24, Node 22.22, TypeScript 6.0 (`tsc`), `tsx`, `esbuild` 0.2x, React/ReactDOM 18 (runtime only, no type packages) and Playwright with Chromium 1194. **No internet:** `npm install` was impossible, so Next.js, Tailwind, Zustand, Recharts, Vitest and `@playwright/test` were unavailable.

| Check | How it was run | Result |
|---|---|---|
| Package integrity | `floorwork.zip` unzipped into an empty directory; a script resolved every relative/`@/` import in all 107 TS/JS files and checked every bare import against `package.json` | **0 unresolved imports, 0 undeclared packages** |
| Unit tests | All files in `tests/unit/` (incl. the session-3 `audit.test.ts`) run from the clean unzip with `tsx` against a ~40-line Vitest-compatible shim. Not the real Vitest. | **168 passed, 0 failed** |
| Type-check | `tsc --strict --noEmit` over `src/`, `tests/`, `investigation/` with approximate ambient stubs for react, next/*, zustand, recharts, vitest, @playwright/test | Clean for app code; remaining errors are stub artefacts in Playwright test callbacks (`page` untyped by the stub) |
| Server render | `tools/harness/ssr.tsx` bundled with esbuild; every activity × easy/medium/hard × seeds 1/42/9999 rendered with `react-dom/server` | **459/459 renders**, 51 components for 51 registry entries |
| Game scenarios | From the clean unzip, `tools/harness/drive-games.cjs`: each game mounted standalone in headless Chromium and driven with real keyboard/mouse to its results screen, including wrong answers, timeouts, invalid orders, choice mode, adaptive mode, unlimited mode, skip, simulator step and real-time modes, and all 17 tests. A follow-up script confirmed every one of the 51 activity ids reached its results screen. | **63/63 scenarios; 51/51 activities** |
| App flows | `tools/harness/drive-app.cjs`: the real pages and GameShell, with sandbox stand-ins for next/link, next/navigation, next/dynamic, zustand (incl. persist + migrate) and recharts | **21/21** (library count/filter/search, all difficulties, practice mode, Esc, settings link, results, persistence v2, restart, review, stats, battery end-to-end + history, preset plan, custom session, daily, theme, simulator in shell, global shortcuts suspended during an assessment, no page errors) |

### Bugs found and fixed by these runs
- **Session 3 audit:** in multiple-choice mode, distractors could fall inside the answer tolerance, so 2–3 options were graded correct (probability, drills, fractions, percentages, advanced probability, equity). Distractors are now generated with the grader's own acceptance rule; `audit.test.ts` checks exactly one accepted option for every generator, level and family.
- **Session 3:** `/daily` computed the date-based plan during prerender (wrong date and hydration mismatch after build day). It is now computed on the client only.
- **Session 3:** the prediction simulator exposed a placeholder "Unused for this instrument" setting; removed.
- **Session 3:** header shortcuts (G = library, T = theme) were live during assessments, custom sessions and daily challenges; a stray G would abandon the session. They are now suspended while any game is in play.
- Response Conflict / Task Switch reported a misleading "0 ms" cost when a condition had no correct trials.
- Bet Grid odds rounding could land exactly on fair odds (EV = 0).
- The 100-minute test's Easy preset exceeded the duration setting's maximum.
- In custom sessions and the battery, the Enter that finished a drill also clicked the auto-focused "Next" button and skipped the between-sections screen. It now uses a 400 ms-guarded Enter shortcut.
- Several test expectations were wrong (tie cases, valid intercepts, battery minimum length); the tests were fixed, not the engines.

### What the sandbox could NOT verify
- Real library behaviour: Next.js routing/build, Zustand persist, Recharts rendering, Tailwind CSS (the UI has never been seen styled)
- ESLint rules applied by `next build`
- The Playwright e2e suite in `tests/e2e/` against the real dev server
- Agreement of Cube Folding handedness and letter orientation with a physical paper cube (internally consistent and tested, not physically checked)
- Anything about the reference site beyond public listing text (see GAME_CATALOG.md)

## 1b. GitHub Pages / static export (session 4)

| Check | How | Result |
|---|---|---|
| Static compatibility of the source | `scripts/check-static.mjs`: no route handlers, server actions, `next/headers`, middleware, dynamic/revalidate config or `next/image`; all dynamic routes have `generateStaticParams`; search-param pages wrapped in Suspense; no raw `/…` links, fetches or location changes that would skip the base path; `output: 'export'`; `.nojekyll` present | **Passed** (76 files). Also confirmed it **fails** on an injected `<a href="/stats">` |
| Export verifier logic | `scripts/verify-export.mjs` run against a hand-made mock `out/` with 57 routes | **Passes** on the complete mock; **fails** when one game page is removed |
| GitHub-Pages-like server | `scripts/serve-out.mjs` against the mock, probed with curl: `/floorwork/` 200, `/floorwork/stats` → 301 `/floorwork/stats/`, query string kept on redirect, `/floorwork/play/math/` 200, unknown path → `404.html` with status 404, paths outside the base → 404 | **As GitHub Pages behaves** |
| Workflows | `deploy.yml` and `e2e.yml` parsed as YAML; jobs `build`→`deploy` and `e2e`; permissions `pages: write`, `id-token: write` | Parsed. **Not run** (needs GitHub) |
| Regression after the changes | unit 168/168, stub type-check clean, SSR 459/459, game scenarios 63/63 (51/51 activities), app flows 21/21 | **Passed** |

**Not verified (needs `npm install`, i.e. the first local build or the first GitHub Actions run):**
- `next build` with `output: 'export'` actually succeeds (incl. ESLint and type-checking with real types) and produces the 57 routes; the workflow runs `verify-export.mjs` to confirm this automatically
- Base path applied to every asset, link and client-side navigation in the real export
- Direct loads and refreshes of every page on GitHub Pages; the 404 page; navigation with the base path (covered by `tests/e2e/static.spec.ts`, not yet run)
- Persistence across refresh, the daily challenge using the visitor's date, desktop and mobile layout without horizontal scroll (also in `static.spec.ts`)
- The deployed site at `https://USERNAME.github.io/floorwork/`

## 2. Mathematical checks covered by unit tests
Session-3 audit (`tests/unit/audit.test.ts`): for every question generator and family × level, multiple choice accepts exactly one option and the displayed answer is accepted when typed; for all 51 activities, documentation exists, Easy ≠ Hard presets, battery section settings stay inside every setting's bounds at 1/5/30-minute sections, and normalised scores stay within 0–100; Cube Folding yields the requested 3–6 options with exactly one true; Bet Grid works for every revealed/bets combination.

Dice fair value, bounds, order validation and settlement (incl. events) · card conditional expectation and best action · Kelly · Fermi interval scoring · Bayes in odds form and contract settlement · ETF NAV and arbitrage P&L · trading-game accounting · arithmetic/sequence/fraction/probability generators (incl. Monte Carlo cross-check of reroll EV) · drill banks self-consistency · 16 assessment question families at every level and format, including a uniqueness proof for logic puzzles · closed forms (optimal stopping, derangements, multinomials, gambler's ruin, coupon collector) · Black–Scholes price and delta vs textbook values · Poisson sampler mean · simulator accounting identity, position limits, informed-trader rationality and hedge neutrality for all four instruments · Bet Grid exact probabilities vs Monte Carlo · adaptive staircases · battery section sizing, normalisation bounds and monotonicity, plan budgets · target-number solver/evaluator · Skyline BFS · Mystery Figure solver · cube nets, 24 distinct oriented views per net, exactly one valid option per question.

## 3. Local verification (fill in)

| Date | Where | typecheck | unit | build + verify-export | test:e2e (dev) | test:static desktop | test:static mobile | Deployed URL works | Notes |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |
