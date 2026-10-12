# GAME_CATALOG.md — TraderMath (Phase 1, partial)

Investigation date: 11 Oct 2026
Method: static page fetches only (no browser automation, no JavaScript execution, no login).
**No game was actually played.** Everything below comes from public descriptions and, where noted, a public "How to play" panel. Mechanics marked *unobserved* must be verified by playing in a real browser before implementation.

Legend: **O** = observed (stated on a public page) · **I** = inferred · **?** = unknown, needs live testing

## Access model (O)
- Market games: Easy difficulty free, no login. Medium / Hard / Custom require Premium.
- Signed-in free accounts store scores/history; leaderboards require login.
- Online assessments, courses, brainteasers database: largely paid (extent ? ).
- Per the brief, paid tiers were not accessed. Medium/Hard/Custom mechanics can only be documented from public text, never observed.

---

## A. Market Games (7)

### A1. Market Making Dice Game — rules panel observed
URL: `/market-games/market-making-dice-game/settings`

- **Purpose (O):** trade against a market maker quoting on the sum of a set of dice, some hidden; track your own P&L.
- **Settings (O, Easy defaults):** number of dice 3 · rounds 3 · time to answer 60s · show balance On · market events Off. Medium/Hard/Custom values ? (paywalled).
- **Loop (O):**
  1. Each round shows N six-sided dice, some face-up, some face-down.
  2. Market maker shows a quote "bid at ask".
  3. Player chooses quantity and side: buy at ask or sell at bid, within the time limit.
  4. All dice revealed; settlement price = sum of dice; P&L realised.
  5. Player is asked to report their return for the round.
- **Budget (O):** starting balance 500.
- **Order validity (O):** a long must be affordable from balance; a short must have its maximum possible loss covered by balance.
  - I: max short loss = qty × (max attainable sum − bid), where max attainable sum depends on visible dice and any active event.
- **Market events (O, optional), one may occur per round:** dice show only {5,6}; only {1,2}; only {1,6}; only evens; only odds; a die showing 1 is worth 7. Events can change order validity.
- **Quotes (O):** market maker quotes are random. Distribution, spread width and relation to fair value ?.
- **Higher difficulties (O):** player may need to track balance mentally (balance hidden).
- **Scoring (O):** leaderboard ranks by total P&L ($ formatted).
- **Unknown (?):** how many dice are hidden per round; quote generation; what happens on timeout (no trade? penalty?); how the "report your return" step is scored; whether an incorrect report is penalised; UI/keyboard controls.

### A2. Trading Game — description only
URL: `/market-games/trading-game/lobby`
- O: combines market making and market taking in one round — quote spreads, then trade against the book. "Lobby" URL suggests a pre-game screen (I).
- ?: underlying asset, book model, counterparties, scoring, settings.

### A3. ETF Arbitrage Game — description only
URL: `/market-games/etf-arbitrage-game/settings`
- O: spot mispricings between an ETF and its constituent stocks; trade against 3 AI market makers for P&L.
- ?: basket size, weights, quote dynamics, AI behaviour, timing, scoring.

### A4. Card Game (Market Taking) — description only
URL: `/market-games/market-taking-game/lobby`
- O: card-based market-taking exercise — read quotes, identify edge, take the best price. FAQ links it to expected-value questions.
- ?: deck composition, what quantity is priced, number of quoters, scoring.

### A5. Fermi Estimation Game — description only
URL: `/market-games/fermi-estimation-game/settings`
- O: estimate unknown quantities with confidence intervals; scored on accuracy, precision and speed; points-based score.
- ?: interval input format, exact scoring function, question bank (would need original questions anyway).

### A6. Event Contracts Game — description only
URL: `/market-games/event-contracts-game/settings`
- O: quote two-sided markets on binary events against noise and informed flow; scored on P&L and calibration. FAQ: base rate + news → probability, Bayesian updating in odds form; higher difficulty = more informed traders.
- ?: event generation, flow model, calibration metric.

### A7. Higher or Lower Game — description only
URL: `/market-games/higher-or-lower-game/settings`
- O: call each card higher/lower and size each bet to your edge; grow bankroll without busting (I: Kelly-style sizing).
- ?: deck, ties, payout odds, bankroll rules.

Common (O): Easy/Medium/Hard/Custom; harder = less time per decision, more rounds, events on, helper info hidden, more informed counterparties (varies per game). Best result per game and difficulty stored.

---

## B. Trainers (22 listed)

### Numerical (3)
| Name | O: description | ? |
|---|---|---|
| Math Trainer | Timed + − × ÷ drills; tracks speed and accuracy. Homepage teaser shows multiple choice ("47 × 23 =" with 4 options) | operand ranges, question count, timing, scoring |
| Sequence Trainer | Find the next number in a pattern | sequence families, input format |
| Fractions to Decimals | Fraction→decimal conversion drill | denominators, precision tolerance |

### Trading (4) — lesson + simulator + drill courses, not single games
ETF Market Making · Options Market Making · Futures & Basis · Prediction Markets. Contents ? (likely partly paywalled). These are courses; recreating lesson content is out of scope (copyright).

### Probability & Statistics (1)
Probability Trainer — timed probability / EV problems. ? question types.

### Estimation (1)
Fermi Questions — order-of-magnitude questions. ? format/scoring.

### Cognitive (13)
| Name | O: description |
|---|---|
| Task Switch | Stimulus appears under one of two rules; classify against the active rule; timed |
| Response Conflict | Flanker and Simon tasks |
| Pincode Game | Memorise flashing digits; type back in order, reversed, or sorted |
| Cube Folding | Pick which cube folds from a 2D net |
| Code Match | Find exact match among near-identical codes (swapped pairs, lookalike chars); shrinking clock |
| Grid Recall | Flashed cell pattern; rebuild from memory; red decoy cells interfere |
| Intercept | Balls fall along 4 lines; cannons have travel time; lead the target |
| Hold Fire | Go/no-go with changing cue rule and tightening window |
| Target Number | Combine 4 numbers with + − × ÷ to hit target; round clock |
| Pump | Balloon risk task: pump for money, cash in before pop |
| Skyline | Tower rearrangement puzzle scored vs. minimum move count; untimed |
| Mystery Figure | Hidden-figure deduction with count-only feedback; scored on attempts |
| Sweet Spot | Rotating dials; click while needle crosses target arc |

---

## C. Not yet investigated
- `/online-assessments` (firm-specific tests, e.g. Flow Traders "Red Test") — likely paid.
- `/brainteasers` question database — content is copyrighted text; not reproducible.
- `/coding` problems — out of scope for a games recreation.
- Individual settings/how-to pages for A2–A7 and all trainers (same fetch approach as A1 should yield rules text).

## Summary of gaps
Only **1 of ~29** games has documented rules. **0** have been played. Timing, scoring formulas, question generation and edge-case behaviour are unobserved for all of them.

---

## D. Implementation mapping (added when the app was scaffolded)

Every catalogued activity has an app id, a registry entry (`src/lib/registry.ts`) and a component (`src/games/`).
The "basis" column repeats the evidence level above; nothing in the app upgrades an item from inferred to observed.

| # | Reference name | App id | Basis | Engine |
|---|---|---|---|---|
| 1 | Market Making Dice Game | `dice` | O: rules panel | `engines/dice.ts` |
| 2 | Trading Game | `trading-game` | description only | `engines/tradingGame.ts` |
| 3 | ETF Arbitrage Game | `etf-arb` | description only | `engines/etf.ts` |
| 4 | Card Game | `card-game` | description only | `engines/cards.ts` |
| 5 | Fermi Estimation Game | `fermi-game` | description only | `engines/fermi.ts` |
| 6 | Event Contracts Game | `event-contracts` | description + FAQ | `engines/events.ts` |
| 7 | Higher or Lower Game | `higher-lower` | description only | `engines/higherLower.ts` |
| 8 | Math Trainer | `math` | description + homepage teaser | `engines/mathTrainer.ts` |
| 9 | Sequence Trainer | `sequence` | description only | `engines/sequence.ts` |
| 10 | Fractions to Decimals | `fractions` | description only | `engines/fractions.ts` |
| 11 | Probability Trainer | `probability` | description only | `engines/probability.ts` |
| 12 | Fermi Questions | `fermi-questions` | description only | `engines/fermi.ts` |
| 13 | ETF Market Making | `etf-drills` | description only (course) | `engines/drills.ts` |
| 14 | Options Market Making | `options-drills` | description only (course) | `engines/drills.ts` |
| 15 | Futures & Basis | `futures-drills` | description only (course) | `engines/drills.ts` |
| 16 | Prediction Markets | `prediction-drills` | description only (course) | `engines/drills.ts` |
| 17 | Task Switch | `task-switch` | description only | `engines/cognitive.ts` |
| 18 | Response Conflict | `response-conflict` | description only | `engines/cognitive.ts` |
| 19 | Pincode Game | `pincode` | description only | `engines/cognitive.ts` |
| 20 | Cube Folding | `cube-folding` | description only | `engines/cube.ts` |
| 21 | Code Match | `code-match` | description only | `engines/cognitive.ts` |
| 22 | Grid Recall | `grid-recall` | description only | `engines/cognitive.ts` |
| 23 | Intercept | `intercept` | description only | `engines/cognitive.ts` |
| 24 | Hold Fire | `hold-fire` | description only | `engines/cognitive.ts` |
| 25 | Target Number | `target-number` | description only | `engines/targetNumber.ts` |
| 26 | Pump | `pump` | description only | `engines/cognitive.ts` |
| 27 | Skyline | `skyline` | description only | `engines/skyline.ts` |
| 28 | Mystery Figure | `mystery-figure` | description only | `engines/mystery.ts` |
| 29 | Sweet Spot | `sweet-spot` | description only | `engines/cognitive.ts` |

To upgrade any row, capture the public page with `investigation/` (see its README), record observations in sections A–B above with the O/I/? labels, then change the engine and registry.

---

## E. Paid / premium content (public listings only, observed 11 Oct 2026)

Method: public catalogue pages and search snippets only. No login, no paid pages opened, no paywalled tier played.
O = stated on a public page · I = inferred · ? = unknown.

### E1. Premium tiers of free games (O)
Market games: Easy is free; Medium, Hard and Custom need a subscription. FAQ (O): harder levels shorten decision time, add rounds, switch on market events, hide helper info (e.g. balance) and add more informed counterparties. Exact values per game: ?

### E2. Online assessments, grouped by firm (O = the listing text)
| Listing | Public facts (O) | App id |
|---|---|---|
| Mako aptitude | 37 MC questions, 15 min; arithmetic, logic, probability, patterns | `oa-aptitude-37` |
| Mako "Codility" round 2 | 28 single-answer MC, 30 min; probability, reasoning, statistics, mental math | `oa-round2-28` |
| CTC cognitive aptitude | Mixed MC: numerical reasoning, verbal analogies, logical deduction, visual patterns | `oa-cognitive-aptitude` |
| Maven math / sequences / probability | Tests exist; formats ? | `oa-math-50`, `oa-sequences-20`, `oa-probability-15` |
| Da Vinci numerical quiz | Exists; format ? | `oa-numerical-quiz` |
| Da Vinci "Career Match" | Exists; content ? (I: fit/personality questionnaire) | **Not implemented** (not a skill test; see PROGRESS) |
| SIG quantitative evaluation / problem solving / equity research | Exist; formats ? | `oa-quant-evaluation`, `oa-problem-solving`, `oa-equity-research` |
| DRW round 1 | 6 MC, 45 min; probability, EV, combinatorics, logic | `oa-hard-six` |
| Akuna math / sequences | Exist; formats ? | `oa-math-40`, `oa-sequences-20` |
| Akuna VidCruiter grid game | "timed grid game where you price and compare bets against a winning row" | `bet-grid` |
| Citadel trading assessment | Advanced probability and statistics | `oa-prob-stats-advanced` |
| Wincent quant | 12 open-ended probability/EV questions, 100 min | `oa-open-ended-12` |
| Flow Traders math | 60 timed questions; drill pages mention fractions, decimals, large multiplication | `oa-math-60` |
| Flow Traders / All Options sequences | 26 questions in 25 min | `oa-sequences-26` |
| All Options math | 80 timed questions | `oa-math-80` |

Free accounts see a short preview; full-length tests are premium (O). Every app test uses original generated questions; none of the reference's questions were seen or used.

### E3. Strategy trainers (premium) (O: names and one-line descriptions only)
ETF Market Making, Options Market Making, Futures & Basis, Prediction Markets: "lessons, simulators and drills" ending in a "live case".
App: an original drill bank (`*-drills`) plus an original interactive simulator (`*-sim`) for each. Lessons and the live case are not recreated.

### E4. Courses (premium, written lessons) (O: titles and topic counts)
Machine Learning for Quant Research; Research Validation and Backtesting; Programming for Quant Developers; Systems Programming for Trading; Prediction Markets Trading; Game Theory and Strategic Trading; Introduction to Markets, Trading and Risk; Fundamentals of Probability and Statistics; Advanced Topics in Probability and Statistics; Asset Classes and Trading Products; Introduction to Digital Assets; Basics of Quantitative Finance.
App: **not implemented.** These are written educational content, not games; recreating them requires writing original course material. Tracked in PROGRESS.md.

### E5. Other premium areas (O)
Brainteaser question database (premium beyond samples), coding problems, role tracks. App: **not implemented**; tracked in PROGRESS.md.
