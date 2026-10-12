# Reference investigation harness

Tools for completing Phase 1 (observing the reference site) from a machine with a real browser.

## Ground rules (enforced or expected)

- Only public, logged-out pages. Never log in, never use an account, never try Medium/Hard/Custom tiers that require a subscription.
- `robots.txt` is checked before every capture; disallowed paths are skipped.
- One worker, a 4-second delay between pages. Keep it that way.
- Record what you **observe**. Anything you conclude from observation is **inferred** and must be labelled so in `GAME_CATALOG.md`.
- Don't copy the site's text, question banks, images or code into the app. Mechanics only, re-implemented and re-worded.
- Network request URLs are logged only to understand flow and timing. Don't call private endpoints.

## Commands

```bash
npx playwright install chromium            # once
npm run investigate -- -g "public pages"    # capture all 29 public pages → investigation/output/<id>/
ONLY=dice,card-game npm run investigate -- -g "public pages"
HEADED=1 GAME=dice DURATION_S=120 npm run investigate -- -g "observe session"   # play one free session while it records
```

Windows PowerShell equivalents:

```powershell
$env:ONLY="dice,card-game"; npm run investigate -- -g "public pages"
$env:HEADED="1"; $env:GAME="dice"; $env:DURATION_S="120"; npm run investigate -- -g "observe session"
Remove-Item Env:ONLY, Env:HEADED, Env:GAME, Env:DURATION_S -ErrorAction SilentlyContinue   # clear afterwards
```

## After capturing

1. Read `investigation/output/<id>/page.txt` and `controls.json`.
2. Update that game's entry in `GAME_CATALOG.md` (observed vs inferred).
3. Update `src/lib/registry.ts` (settings, defaults, `unverified` list) and the engine in `src/lib/engines/`.
4. Add or adjust unit tests, run `npm test`, and update `IMPLEMENTATION_STATUS.md` and `PROGRESS.md`.
