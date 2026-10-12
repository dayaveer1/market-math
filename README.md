# Floorwork

**Free, open-source practice for quantitative trading interviews.** It includes market-making games, live trading simulators, mental-math and probability trainers, cognitive aptitude drills, timed online-assessment practice tests and a multi-section interview battery.

Floorwork is a static website: everything runs in the visitor's browser. There are no accounts, subscriptions or limits, and progress is saved in the browser's local storage.

> Floorwork is an independent practice platform. It is **not affiliated with, endorsed by or connected to TraderMath, any trading firm or any financial institution.** Where an activity follows a publicly described test format, the firm is named only to describe that format; every question, game and line of code is original. Nothing here is financial advice.

**Live site:** `https://USERNAME.github.io/floorwork/` (replace with your link after deploying)

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

## Put it online with GitHub Pages (free)

You need a free GitHub account. No local install is required for this route.

**1. Create the repository**
- On github.com click **+ → New repository**.
- Name it `floorwork`, which gives you the address `https://USERNAME.github.io/floorwork/`. Choose **Public**, leave "Add a README" unticked, then click **Create repository**.

**2. Upload the project**

The easiest way is in the browser:
- Unzip `floorwork.zip`, then open the inner `floorwork` folder (the one containing `package.json`).
- On the new repository's page, click **uploading an existing file**.
- Drag in **everything inside** that folder, including the `.github` folder. On Windows, turn on **View → Show → Hidden items** to see `.github` and `.gitignore`.
- Click **Commit changes** (onto the `main` branch).

> If the browser upload skips the `.github` folder, create the workflow by hand: **Add file → Create new file**, name it `.github/workflows/deploy.yml`, paste in the contents of that file from the zip, and commit.

Or use git from PowerShell (requires [Git for Windows](https://git-scm.com/download/win)):

```powershell
cd "$HOME\Downloads\floorwork\floorwork"
git init -b main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/floorwork.git
git push -u origin main
```

**3. Turn on GitHub Pages**
- In the repository, go to **Settings → Pages**.
- Under **Build and deployment → Source**, choose **GitHub Actions**. Nothing else needs configuring.

**4. Trigger the first deployment**
- Open the **Actions** tab. If the upload's "Deploy to GitHub Pages" run started before Pages was enabled and failed, open it and click **Re-run all jobs**.
- Otherwise click **Deploy to GitHub Pages → Run workflow → Run workflow**.
- The run installs dependencies, type-checks, runs the unit tests, checks static compatibility, builds and deploys. It takes about 3–5 minutes.

**5. Open the site**
- When the run shows a green tick, the address appears on the **deploy** job and under **Settings → Pages**: `https://USERNAME.github.io/floorwork/`. Share that link; visitors need nothing installed.

**6. Update the site later**
- Edit or upload changed files on github.com (or `git add . ; git commit -m "…" ; git push`). Every push to `main` rebuilds and redeploys automatically.
- If a run fails, open it in **Actions**, expand the red step and read the error. Copy it into an issue or your notes so it can be fixed. The previous version stays live until a run succeeds.

The workflow works out the base path from the repository name. If you rename the repository, the site moves to the new name automatically. A repository named `USERNAME.github.io` is served at the root.

## Run it on your own computer (optional)

Requires Node.js 20 LTS (18.18+). In PowerShell, inside the folder containing `package.json`:

```powershell
npm install            # once
npm run dev            # development server → http://localhost:3000
npm run preview        # production static build served like GitHub Pages → http://localhost:4173/floorwork/
```

If PowerShell says "running scripts is disabled", use `npm.cmd` instead of `npm`, use Command Prompt, or run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once. If Windows' "Extract All" made `floorwork\floorwork`, use the inner folder.

## Tests

```powershell
npm run typecheck        # TypeScript (strict)
npm test                 # unit tests: game maths, scoring, grading, registry
npm run check:static     # static-hosting compatibility of the source
npm run build            # static export to out/ (then verifies every route exists)
npx playwright install chromium     # once
npm run test:e2e         # browser tests against the dev server (desktop + mobile)
npm run test:static      # browser tests against the static export under /floorwork/
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
