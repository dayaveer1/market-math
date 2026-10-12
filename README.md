# Floorwork

**Free, open-source practice for quantitative trading interviews.** It includes market-making games, live trading simulators, mental-math and probability trainers, cognitive aptitude drills, timed online-assessment practice tests and a multi-section interview battery.

Floorwork is a static website: everything runs in the visitor's browser. There are no accounts, subscriptions or limits, and progress is saved in the browser's local storage.

> Floorwork is an independent practice platform. It is **not affiliated with, endorsed by or connected to TraderMath, any trading firm or any financial institution.** Where an activity follows a publicly described test format, the firm is named only to describe that format; every question, game and line of code is original. Nothing here is financial advice.

**Live site:** https://dayaveer1.github.io/market-math/ (available once the first deployment succeeds) · **Repository:** https://github.com/dayaveer1/market-math

<!-- Screenshots: run the site (npm run dev), then `npm run screenshots` to create these files, and remove this comment.
![Library](docs/screenshots/library-desktop.png)
![Options market-making simulator](docs/screenshots/options-sim-desktop.png)
![Interview assessment](docs/screenshots/assessment-desktop.png)
![Mobile](docs/screenshots/dice-mobile.png)
-->
_Screenshots: run `npm run screenshots` against a running site to generate `docs/screenshots/`, then un-comment the image links above._

## What's inside: 51 activities

| Category | Activities |
|---|---|
| Market games (7) | Market-Making Dice, Trading Game, ETF Arbitrage, Card Game, Fermi Estimation, Event Contracts, Higher or Lower |
| Trading desk (8) | Live market-making simulators for an ETF, an option, an index future and a prediction market, each with a drill bank |
| Numerical (3) | Math Trainer (integers, decimals, fractions, percentages, large multiplication, mixed), Sequences, Fractions to Decimals |
| Probability & estimation (2) | Probability Trainer, Fermi Questions |
| Cognitive (13) | Task Switch, Response Conflict, Pincode, Cube Folding, Code Match, Grid Recall, Intercept, Hold Fire, Target Number, Pump, Skyline, Mystery Figure, Sweet Spot |
| Online assessments (18) | 17 timed tests in recruitment-style formats, plus Bet Grid |

Also included: Easy, Medium, Hard and Custom difficulty on every activity; Standard, Practice (untimed) and Interview modes; difficulty that adapts during a session; an interview battery with section scores and an overall score; personal bests and progress charts; mistake review; custom multi-drill sessions; a daily challenge (based on the visitor's own date); shareable settings links; light and dark themes; keyboard and touch controls.

## Deployment (GitHub Pages)

The site deploys automatically from `.github/workflows/deploy.yml` on every push to `main`.

**How the workflow runs**
1. **build** (no Pages access needed): installs dependencies, type-checks, runs unit tests, checks static-hosting compatibility, builds the static export under the base path `/market-math` (derived from the repository name), verifies all 57 pages exist, and uploads the site.
2. **deploy**: confirms GitHub Pages is enabled with source "GitHub Actions" (failing with a plain explanation if not), then publishes the upload.

**One-time setup** (already done for this repository; repeat for a fork or a renamed copy)
1. **Settings → Pages → Build and deployment → Source: GitHub Actions.** Selecting it is enough; there is no Save button for this choice.
2. **Actions** tab → **Deploy to GitHub Pages** → **Run workflow** (or re-run the latest run).
3. When both jobs are green, the address is shown on the deploy job and under Settings → Pages.

**Updating the site:** commit to `main` (edit on github.com, upload files, or `git push`). Each push redeploys in a few minutes; the previous version stays live until a run succeeds.

### Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Get Pages site failed … Not Found` from `configure-pages` | The run started before Pages was enabled (typical for the very first commit). Enable Pages as above, then **Re-run all jobs**. Since this workflow version, the build no longer calls the Pages API at all, so this can only appear in the deploy job's "Check that GitHub Pages is enabled" step, with the fix in the message. |
| "Pages source is not GitHub Actions" | Settings → Pages → Source is "Deploy from a branch". Switch it to **GitHub Actions** and re-run. |
| `Resource not accessible by integration` | Something tried to create the Pages site with the built-in token, which isn't allowed. Enable Pages in Settings instead. |
| Build job fails at Type-check / Unit tests / Build | A real code issue: open the red step, copy the log, and fix it (or report it). Nothing is deployed until it passes. |
| Site loads without styles, or links go to `dayaveer1.github.io/play/…` | Wrong base path. It comes from the repository name; for a custom domain set the repository variable `PAGES_BASE_PATH` to `/`. |

**Optional: let the workflow enable Pages itself.** Create a fine-grained personal access token limited to this repository with **Pages: Read and write** and **Administration: Read and write**. Save it as the repository secret `PAGES_ENABLEMENT_TOKEN` (Settings → Secrets and variables → Actions). The deploy job then runs `actions/configure-pages` with `enablement: true` before deploying. Without the secret, that step is skipped. It isn't needed once Pages is enabled.

**Forks and copies:** change `site.config.json` (used by local preview and tests). The workflow itself needs no edits, because it reads the repository name.

## Run it on your own computer (optional)

Requires Node.js 20 LTS (18.18+). In PowerShell, inside the folder containing `package.json`:

```powershell
npm install            # once
npm run dev            # development server → http://localhost:3000
npm run preview        # production static build served like GitHub Pages → http://localhost:4173/market-math/
```

If PowerShell says "running scripts is disabled", use `npm.cmd` instead of `npm`, use Command Prompt, or run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once. If Windows' "Extract All" made a nested folder, use the inner one that contains `package.json`.

## Tests

```powershell
npm run typecheck        # TypeScript (strict)
npm test                 # unit tests: game maths, scoring, grading, registry
npm run check:static     # static-hosting compatibility of the source
npm run build            # static export to out/ (then verifies every route exists)
npx playwright install chromium     # once
npm run test:e2e         # browser tests against the dev server (desktop + mobile)
npm run test:static      # browser tests against the static export under /market-math/
npm run test:all         # typecheck → unit → build → static browser tests
```

The **Browser tests (static export)** workflow in the Actions tab runs `test:static` on GitHub when started manually.

## How it works

- **Next.js 14 static export** (`output: 'export'`, `trailingSlash: true`). Every page, including one page per activity, is pre-built as an HTML file, so direct links and refreshes work on GitHub Pages. Unknown addresses show `404.html`.
- **No server code.** Gameplay, scoring, charts and the daily challenge all run in the browser. The daily plan uses the visitor's current date.
- **Storage.** Progress lives in `localStorage` under `floorwork:v1` and can be exported and imported on the Progress page. It is per browser and per device. All `USERNAME.github.io/*` sites share one storage area, so keep the key unique if you host other apps there.

## Project layout

```
src/app/              Routes: library, play/[id] (51 pre-built pages), assessment, session, daily, review, stats, 404
src/components/       GameShell, QuizRunner, SessionRunner, Header/Footer, UI primitives
src/games/            One component per game; index.tsx maps ids → components
src/lib/engines/      Pure, unit-tested game maths
src/lib/registry.ts   Activity metadata, settings, presets and verification notes
scripts/              Static build, export verification, GitHub-Pages-like preview server, screenshots
.github/workflows/    deploy.yml (Pages), e2e.yml (optional browser tests)
tests/                Vitest unit tests and Playwright e2e
tools/harness/        Fast browser harness without Next.js
investigation/        Logged-out capture tools for public reference pages (development only)
```

## Not included yet

These parts of a full interview-prep platform are **not implemented**. They don't appear on the site and are tracked in PROGRESS.md: written courses, a brainteaser library, coding problems, a "Career Match"-style questionnaire, and lessons/a scripted live case in front of the trading simulators (the simulators and drills themselves are complete).

## Documents

`IMPLEMENTATION_STATUS.md` (every activity and what is verified) · `docs/VERIFICATION.md` (exactly what was run) · `PROGRESS.md` (open work) · `GAME_CATALOG.md` (observed vs designed mechanics) · `CLAUDE.md` (development conventions)

## Licence

MIT. See `LICENSE`.
