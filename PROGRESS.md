# PROGRESS.md: development checklist

Update this file at the end of every session. Tick only what was actually run or verified, and say how.

## Session log

| Date | Session | Summary |
|---|---|---|
| 11 Oct 2026 | Authoring 1 | Scaffold, 29 activities, shell, persistence, analytics, e2e specs, investigation harness. Sandbox-only verification. |
| 11 Oct 2026 | Authoring 2 | +4 trading simulators, +17 timed assessments, +Bet Grid (51 total). Cube orientation, in-session adaptivity, unlimited sessions, interview battery. Fixed Enter skipping the between-sections screen. Sandbox verification: 90 unit, 459 SSR, 63 browser, 20 app-flow. Packaged. |
| 11 Oct 2026 | Authoring 3 | Stability audit, no new features. Package integrity check (0 unresolved imports). New audit tests. Fixed: multiple correct MC options, daily-page hydration, placeholder setting, shortcuts during assessments. Windows README corrected (nested folder, execution policy). Verification from clean unzip: 168 unit, 459 SSR, 63 browser (51/51 activities), 21 app-flow. |
| 12 Oct 2026 | Authoring 5 | First Actions run failed at configure-pages (Pages site not yet created). Workflow restructured: build independent of Pages API, deploy-job preflight with clear errors, optional PAT enablement, Node-24 action majors, Node 22, repo-specific base path `/market-math` via site.config.json. Awaiting the next GitHub run. |
| 11 Oct 2026 | Authoring 4 | GitHub Pages: static export with base path, trailing slashes, 404 page, `.nojekyll`; static-compatibility checker; export verifier; Pages-like preview server; static e2e suite; deploy + e2e workflows; MIT licence; footer disclaimer; README deployment guide. Regression all green; real build/deploy not yet run. |

## 0. First deployment (do this first)

- [x] Pushed to github.com/dayaveer1/market-math (commit ac8f329); first run failed at configure-pages (Pages not yet enabled). See docs/VERIFICATION.md §1c
- [ ] Commit the updated workflow and scripts, confirm Settings → Pages → Source: GitHub Actions, and get a green **build** job (install → type-check → tests → build → verify)
- [ ] Green **deploy** job; site reachable at https://dayaveer1.github.io/market-math/
- [ ] If any step fails, copy the failing step's log. Likely first-run fixes: real type errors, ESLint findings during `next build`, `verify-export` complaints
- [ ] Open `https://dayaveer1.github.io/market-math/`: library loads, a game plays, refresh on `/play/dice/` works, progress survives a refresh
- [ ] Run the **Browser tests (static export)** workflow (or `npm run test:static` locally) and record results in docs/VERIFICATION.md §3
- [ ] Generate screenshots (`npm run dev`, then `npm run screenshots`), commit `docs/screenshots/`, un-comment the README images
- [ ] Commit `package-lock.json` after the first `npm install`, so CI uses `npm ci` with exact versions

## 1. First local run

- [ ] `npm install` succeeds (Windows and/or macOS/Linux)
- [ ] `npm run typecheck` clean with real React/Next/Zustand/Recharts types. Sandbox checks used approximate stubs; expect a few fixes.
- [ ] `npm test` (real Vitest) green. The same tests passed under a sandbox shim (168/168).
- [ ] `npm run build` succeeds; fix any ESLint errors it reports
- [ ] `npx playwright install chromium` then `npm run test:e2e` green on desktop and mobile projects
- [ ] `npm run harness` green (same scenarios as the sandbox run)
- [ ] Record results in docs/VERIFICATION.md (date, OS, Node version, pass counts)

## 2. Visual and UX QA (never seen rendered with real Tailwind)

- [ ] Screenshot every page and every game at 390 px and 1280 px, light and dark
- [ ] Check focus rings, contrast and reduced-motion behaviour
- [ ] Simulators: confirm the quote controls are usable on touch devices
- [ ] Cube Folding: rendered letters are not mirrored and sit flat on each face
- [ ] Recharts charts on Progress and Interview assessment render in both themes

## 3. Mathematical verification still open

- [ ] Cube Folding handedness and letter orientation: build one physical paper net (e.g. NETS[0] with letters F R P J L G) and compare with the app's correct option for several questions. The unit tests check internal consistency, not agreement with the physical world.
- [ ] Event Contracts / Prediction simulator: sanity-check a long run of honest quoting at fair value yields roughly zero P&L before spread capture
- [ ] Options simulator: compare a few `bsCall` outputs with an independent calculator at short expiries (T < 5 days)
- [ ] Battery rubric: play each preset several times and check section scores feel sensible; tune MONEY_SCALE / targetRate in `src/lib/battery.ts`

## 4. Reference fidelity (needs a real browser and internet; public, logged-out pages only)

- [ ] `npm run investigate -- -g "public pages"` and read `investigation/output/*/page.txt`
- [ ] For each of the 7 market games, observe one free Easy session (`HEADED=1 GAME=<id>`) and update GAME_CATALOG.md (O/I/?), then the engine and registry
- [ ] Same for the free trainers and cognitive games (all were designed from one-line descriptions)
- [ ] Free assessment previews: check question styles and timing against our specs (format facts only; never copy questions)
- [ ] Do **not** log in or open paid content. Premium formats stay "designed here" unless shown publicly.

## 5. Not implemented yet (backlog, in suggested order). Not shown in the app; listed in README "Not included yet"

- [ ] **Brainteaser library**: original problems with worked solutions, tagged by topic and difficulty, with a search and "mark solved". Original content only.
- [ ] **Courses**: original lesson content for the reference's course topics (probability and statistics fundamentals/advanced, markets and risk, asset classes, quant finance basics, game theory, prediction markets, digital assets, research validation, ML for quant research, programming for quant devs, systems programming). Large writing effort; start with probability fundamentals, reusing `families.ts` for graded questions.
- [ ] **Strategy trainer "lessons" and "live case"**: short interactive lessons in front of each simulator, then a scripted multi-stage case
- [ ] **Coding practice** (quant-dev problems with an in-browser runner): out of scope so far
- [ ] **Career-Match-style questionnaire**: skipped (not a skill test, format unknown)
- [ ] Vol-surface / vega P&L in the options simulator (currently implied = realised, constant)
- [ ] Per-section custom settings in custom sessions and the battery (currently presets plus time fitting)
- [ ] Optional sound and haptics for reaction games
- [ ] PWA/offline install

## 6. Known issues / risks

- QuizRunner's `__fw` debug hook exists only when `NODE_ENV !== 'production'`; e2e tests rely on the dev server.
- `useKeys` ignores keystrokes while focus is in an input (except Esc). Games that need letter keys while typing handle them on the input itself.
- Battery sections are sized by time; round-based games estimate seconds per round (`SECONDS_PER_UNIT`), so real section lengths vary.
- Market/assessment formats marked "designed here" may differ from what firms use.
