# IMPLEMENTATION_STATUS.md

Last updated: 11 Oct 2026 (third authoring session: stability audit). **51 playable activities**, every difficulty and setting unlocked.

## Legend

**Fidelity** — how much of the reference was observable. Only the Dice Game had public rules. Assessment formats come from public listing text (see GAME_CATALOG.md §E). Everything else is an original design and is labelled as such on each game's setup screen.

**Sandbox checks** (authoring environment: Node 22, tsc, tsx, esbuild, React 18, headless Chromium; no internet, so no `npm install`):

- **U**: engine and audit unit tests passed under a minimal Vitest-compatible shim (168/168 across the suite).
- **R**: server-rendered without error at easy/medium/hard × 3 seeds (459/459 renders).
- **B**: played to the results screen in headless Chromium with real keyboard/mouse input via `tools/harness` (63/63 scenarios; all 51 activity ids reached results).
- **A**: exercised through the app shell (GameShell, routing, persistence) in Chromium with stand-ins for next/*, zustand and recharts (21/21 checks).

**Local checks** — real Vitest, `tsc` with real types, `next build`, ESLint and Playwright e2e — have **not been run yet**. They are the first item in PROGRESS.md.

## Activities

| # | Activity | App id | Fidelity | Implementation | Sandbox | Local |
|---|---|---|---|---|---|---|
| 1 | Market Making Dice Game | `dice` | Rules observed | Complete | U R B | Not run |
| 2 | Trading Game | `trading-game` | Description | Complete | U R B | Not run |
| 3 | ETF Arbitrage Game | `etf-arb` | Description | Complete | U R B | Not run |
| 4 | Card Game | `card-game` | Description | Complete | U R B | Not run |
| 5 | Fermi Estimation Game | `fermi-game` | Description | Complete | U R B | Not run |
| 6 | Event Contracts Game | `event-contracts` | Description + FAQ | Complete | U R B | Not run |
| 7 | Higher or Lower Game | `higher-lower` | Description | Complete | U R B | Not run |
| 8 | Math Trainer | `math` | Description + teaser | Complete; 6 question types incl. decimals/fractions/percent/large multiplication; adaptive option | U R B A | Not run |
| 9 | Sequence Trainer | `sequence` | Description | Complete; adaptive option | U R B | Not run |
| 10 | Fractions to Decimals | `fractions` | Description | Complete; adaptive option | U R B A | Not run |
| 11 | Probability Trainer | `probability` | Description | Complete; adaptive option | U R B | Not run |
| 12 | Fermi Questions | `fermi-questions` | Description | Complete | U R B | Not run |
| 13 | ETF Market Making: Drills | `etf-drills` | Description (premium course) | Complete drill bank; adaptive option | U R B | Not run |
| 14 | Options Market Making: Drills | `options-drills` | Description (premium course) | Complete drill bank; adaptive option | U R B | Not run |
| 15 | Futures & Basis: Drills | `futures-drills` | Description (premium course) | Complete drill bank; adaptive option | U R B | Not run |
| 16 | Prediction Markets: Drills | `prediction-drills` | Description (premium course) | Complete drill bank; adaptive option | U R B | Not run |
| 17 | ETF Market Making: Simulator | `etf-sim` | Original (premium trainer not accessed) | Complete: live quoting, basket fair value, informed/noise flow, inventory limit, basket hedge, P&L attribution | U R B | Not run |
| 18 | Options Market Making: Simulator | `options-sim` | Original | Complete: Black–Scholes fair value, theta decay, delta hedging in shares | U R B A | Not run |
| 19 | Futures & Basis: Simulator | `futures-sim` | Original | Complete: cost-of-carry fair value, decaying carry, cash hedge with exact hedge ratio | U R B | Not run |
| 20 | Prediction Markets: Simulator | `prediction-sim` | Original | Complete: Bayesian news, outcome-informed traders, binary settlement (placeholder volatility setting removed) | U R B | Not run |
| 21 | Task Switch | `task-switch` | Description | Complete; adaptive response window | U R B | Not run |
| 22 | Response Conflict | `response-conflict` | Description | Complete; adaptive response window | U R B | Not run |
| 23 | Pincode Game | `pincode` | Description | Complete; adaptive length | U R B | Not run |
| 24 | Cube Folding | `cube-folding` | Description | Complete; letter orientation modelled (on by default from Medium); 3–6 options | U R B A | Not run |
| 25 | Code Match | `code-match` | Description | Complete | U R B | Not run |
| 26 | Grid Recall | `grid-recall` | Description | Complete; adaptive size | U R B | Not run |
| 27 | Intercept | `intercept` | Description | Complete | U R B | Not run |
| 28 | Hold Fire | `hold-fire` | Description | Complete | U R B | Not run |
| 29 | Target Number | `target-number` | Description | Complete | U R B | Not run |
| 30 | Pump | `pump` | Description | Complete | U R B | Not run |
| 31 | Skyline | `skyline` | Description | Complete | U R B | Not run |
| 32 | Mystery Figure | `mystery-figure` | Description | Complete | U R B | Not run |
| 33 | Sweet Spot | `sweet-spot` | Description | Complete | U R B | Not run |
| 34 | Bet Grid | `bet-grid` | One-line public description (premium) | Complete: exact enumerated probabilities, +EV selection, odds never fair | U R B A | Not run |
| 35 | Aptitude Test (37 in 15) | `oa-aptitude-37` | Format from public listing (Mako Trading aptitude assessment) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 36 | Second-Round Quant MC (28 in 30) | `oa-round2-28` | Format from public listing (Mako Trading second-round assessment) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 37 | Cognitive Aptitude Test | `oa-cognitive-aptitude` | Format from public listing (Chicago Trading Company cognitive aptitude assessment) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 38 | Mental Math Test (mixed) | `oa-math-50` | Format from public listing (Maven Securities numerical test) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 39 | Sequences Test (20) | `oa-sequences-20` | Format from public listing (Maven Securities / Akuna Capital sequences tests) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 40 | Probability Test | `oa-probability-15` | Format from public listing (Maven Securities probability assessment) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 41 | Numerical Quiz | `oa-numerical-quiz` | Format from public listing (Da Vinci Trading numerical quiz) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 42 | Quantitative Evaluation | `oa-quant-evaluation` | Format from public listing (SIG quantitative evaluation) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 43 | Problem Solving Assessment | `oa-problem-solving` | Format from public listing (SIG problem solving assessment) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 44 | Equity Research Test | `oa-equity-research` | Format from public listing (SIG equity research assessment) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 45 | Hard Six (45 min) | `oa-hard-six` | Format from public listing (DRW round-1 online assessment) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 46 | Mental Math Test (40) | `oa-math-40` | Format from public listing (Akuna Capital math test) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 47 | Advanced Probability & Statistics | `oa-prob-stats-advanced` | Format from public listing (Citadel Securities trading assessment) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 48 | Open-Ended Quant (12 in 100) | `oa-open-ended-12` | Format from public listing (Wincent quant assessment) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 49 | Mental Math Test (60) | `oa-math-60` | Format from public listing (Flow Traders math test) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 50 | Mental Math Test (80) | `oa-math-80` | Format from public listing (All Options math test) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |
| 51 | Sequences Test (26 in 25) | `oa-sequences-26` | Format from public listing (Flow Traders / All Options sequences tests) | Complete timed test; original questions; skip, negative marking, per-topic breakdown | U R B | Not run |

Known differences per game are listed in each game's “not checked against the reference” panel (`unverified` in `src/lib/registry.ts` / `src/lib/assessments.ts`).

## Platform features

| Feature | Status | Sandbox | Notes |
|---|---|---|---|
| Library (51 activities, 7 categories, search) | Done | A | |
| Setup: Easy/Medium/Hard/Custom for every activity, Standard/Practice/Interview modes | Done | A | Nothing is locked. Practice removes optional timers and switches simulators to step mode. |
| Unlimited sessions | Done | B A | Untimed quizzes with 0 questions run until **Finish session**; setting maxima raised (up to 1000 questions / 2 h). |
| Results, personal bests, accuracy, response time | Done | A | |
| Local persistence (v2 schema with migration), export/import/reset | Done | A (stand-in zustand) | Real zustand persist not yet run. |
| Progress charts | Done | A (charts stubbed) | Recharts rendering not yet seen. |
| Mistake review | Done | A | |
| Adaptive difficulty: within session | Done | U B | Quiz level staircase; reaction-window staircase; Pincode/Grid Recall size staircase. |
| Adaptive difficulty: between sessions | Done | U | Suggestion on the setup screen from the last 3 sessions. |
| Interview assessment battery (5 presets + custom builder, 5–240 min, weighted sections, 0–100 rubric, history) | Done | U A | Rubric is original and uncalibrated. |
| Online assessments (17 timed tests) | Done | U R B | |
| Custom sessions, daily challenge | Done | A | |
| Settings links (`?s=…&seed=…&autostart=1`) | Done | A | |
| Light/dark/system theme | Done | A | Visual design never seen with real Tailwind CSS. |
| Playwright e2e suite (all activities, desktop + mobile) | Written | Not run | |
| Investigation harness for public reference pages | Written | Not run (no internet) | Development tool only; not part of the website. |
| GitHub Pages static export (base path, trailing slashes, 404, `.nojekyll`) | Configured | Static check passed; export verifier and Pages-like server tested on a mock | Real `next build` export not yet run |
| Deploy workflow (typecheck → unit → static check → build → verify → upload → deploy) | Written | YAML parsed | Not yet run on GitHub |
| Static-export browser tests (`tests/e2e/static.spec.ts`: direct load/refresh of all pages and 51 activities, base-path navigation, 404, persistence, visitor-date daily, no horizontal overflow) | Written | Not run | Run via `npm run test:static` or the e2e workflow |
| Premium written courses, brainteaser database, coding problems | **Not implemented** | — | See PROGRESS.md backlog. |
| Da Vinci-style “Career Match” questionnaire | **Not implemented** | — | Not a skill test; format unknown. |
