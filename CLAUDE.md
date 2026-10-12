# CLAUDE.md: working on Floorwork

Read `PROGRESS.md` first and continue from its first unchecked item. Update it, `IMPLEMENTATION_STATUS.md` and `docs/VERIFICATION.md` before ending a session.

## Ground rules
- Never claim something passed unless you ran it in this session; record the command and the counts.
- Keep observed vs designed separate. The reference site may be studied only through public, logged-out pages (`investigation/`). No logins, no paid content, no copying of text, questions, images or code.
- Everything in the app stays free and unlocked. No paywall, account or limit logic.
- Mathematics lives in pure functions under `src/lib/engines/` with Vitest tests. Components only render and route input.

## Commands
`npm run dev` · `npm test` · `npm run typecheck` · `npm run check:static` · `npm run build` (static export + verify) · `npm run preview` (served like GitHub Pages at /floorwork/) · `npm run test:e2e` · `npm run test:static` · `npm run harness` · `npm run investigate`

## Static hosting rules (GitHub Pages)
- No server code: no route handlers, server actions, `next/headers`, middleware, `dynamic`/`revalidate` exports or `next/image`. `npm run check:static` enforces this.
- Internal links go through `next/link` / `useRouter` so the base path is applied. Never hard-code `/…` URLs in `<a>`, `fetch` or `location`.
- Anything date- or storage-dependent renders only after hydration (`useHydrated`), because pages are prerendered at build time.
- New dynamic routes need `generateStaticParams` and `dynamicParams = false`.
- In e2e tests use `p('/path')` from `tests/e2e/base.ts`.

## Adding or changing an activity
1. Engine: `src/lib/engines/<name>.ts` (pure, seeded `Rng`), plus tests in `tests/unit/`.
2. Component: `src/games/<Name>.tsx` implementing `GameProps` (`settings`, `seed`, `onFinish`, `onMistake`). Reuse `QuizRunner` for question-and-answer formats and `MarketMakingSim` (new `Instrument` in `mmSim.ts`) for quoting games.
3. Register: an entry in `src/lib/registry.ts` (settings schema, easy/medium/hard presets covering **every** setting key, honest `unverified` notes), and the id in `src/games/index.tsx`. Timed tests: add a `TestSpec` in `src/lib/assessments.ts`, which maps automatically.
4. Scenario: add a Playwright scenario in `tests/e2e/scenarios.ts` and `tools/harness/drive-games.cjs`.
5. If the battery should use it: update `SECONDS_PER_UNIT` / normalisation in `src/lib/battery.ts`.

## Conventions
- Settings keys used by modes: `duration`, `decisionTime`, `perQuestion`, `roundTime`, `tickMs` (Practice sets them to 0 when the minimum is 0).
- Results: `score` (+ `correct`/`total` when accuracy is meaningful), `avgMs`, short `lines`.
- `data-testid` hooks: `start`, `results`, `final-score`, `quiz`, `answer-input`, `finish`, `game-<id>`, `battery-results`, `overall`.
- Copy: sentence case, plain verbs, no "premium/upgrade/unlock" language.
