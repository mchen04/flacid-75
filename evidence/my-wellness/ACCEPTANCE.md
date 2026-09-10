# My Wellness · acceptance matrix (t_7531365d)

Date: 2026-09-10. Owner: Claude Fable 5.1 (sole implementation owner). Status: **review round 1 findings fixed; awaiting the final independent audit. Not accepted until that audit passes.**

**Environment.** This session's sandbox forbids listening sockets (`listen EPERM`), outbound loopback (`connect EPERM 127.0.0.1`), shared memory for PostgreSQL (`shmget` fails in `initdb`), and WebKit (`webkit.launch` times out). Chromium runs only single-process. Every browser check here therefore runs against the production build served through request interception (`scripts/virtual-server.mjs`, `VIRTUAL_SERVER=1`), with API routes mocked by the real domain code. What that cannot cover is listed under *For Forge to run outside the sandbox* and *Limitations*.

## Review round 1 (findings-1.txt) · what changed

| # | Finding | Fix | Check |
|---|---|---|---|
| 1 | Scenes collided with or cropped out of the stage copy | The four character scenes are shown through their canvas band (viewBox `0 200 360 440`) and the stage keeps that band's aspect ratio, so nothing is cropped at any width; copy sits bottom-left and the tag bottom-right on white cards (rest keeps its copy top-left over sky); the Gym plant and Mat bottle moved out of the copy corner | `after/*/abs-*.png`, `workout*.png`, `floss*.png`, `rest*.png`; contrast audit now measures hero and stage copy |
| 2 | Captures predated the CSS; fit reports missing | Captures are rebuilt from the final build, each state from a fresh document and fixture; `fit.json` records sideways, clipped and scroll results per state; an unreachable state fails the run | `after/fit.json`, `after/extras/` |
| 3, 9 | Dashboard log left a timer counting; undo left the session behind | A dashboard log finishes a running timer with its elapsed time and ticks and clears it; dashboard undo removes a timed session so a later plain log carries no minutes | `wellness.spec.ts` "logging from the dashboard while a timer runs…" |
| 4 | A paused timer from another day was silently backfilled | A paused timer from another day shows a card: "Log to <day>" or "Start fresh"; the timer card states which day it counts for; a running timer that crosses midnight keeps counting and credits its start day (documented) | `wellness.spec.ts` "a timer left from another day…" → [stale-timer-chromium.png](stale-timer-chromium.png) |
| 5 | Hero said "Next: abs" but opened Walk | The hero opens the page for the next habit (food for protein/calories, rest on a rest day, progress when complete) | `wellness.spec.ts` "the hero opens whatever comes next…" |
| 6 | Integration expected one rest per week | Two allowed, third rejected, rest beyond the week rejected; sessions, optional minutes, units, plan, rewards and idempotent redeems persisted under concurrent duplicate delivery; points fixture corrected to 30 | `scripts/integration.ts` (supervisor ran it against a disposable database: passed) |
| 7 | Re-saving details rewrote measurements from rounded display values | A field left at its displayed value keeps the exact stored kg/cm | `wellness.spec.ts` "re-saving your details…" |
| 8 | Backfill mode let the checklist start a hidden timer | Checklist inputs are disabled in backfill mode and ticking is a no-op | `wellness.spec.ts` "in backfill mode the workout checklist is read-only…" |
| 10 | Balance could read negative after undoing habits | Displayed balance floors at 0 with a one-line explanation; nothing is owed | `wellness.spec.ts` treats test, last block |
| 11 | Header tag and dial rounded differently | Both use the ceiling | source |
| 12 | No one-tap undo for water or meals on the dashboard | Water row has a minus; the meal action becomes Undo for six seconds after a log | `wellness.spec.ts` "the hero opens…" |
| 13 | Auto-finish only ran on the open page; focus never ended | `lib/settle.ts` settles finished routines, meditations and focus blocks from any page on a one-second poll and on every return; focus caps at 8 blocks | `tests/settle.test.ts`; `wellness.spec.ts` "finished timers settle from any page…" |
| 14, 15 | Copy overstated cues and data flow | Settings and the walk page say no chime or buzz can play while locked; Food says only the described meal goes to the estimator and logs sync to the private account | source, `after/*/settings*.png`, `food.png` |
| 16 | Comment on vision models was stale | Comment reconciled with [openrouter-models.json](openrouter-models.json): five of six accept images | source |
| T | Contrast skipped text over art | Only the progress hero numeral (over a gradient) is excluded; hero and stage copy are measured | [contrast-audit.json](contrast-audit.json) |
| T | Overflow only at 390×844 | Audited at 390×844, 375×640 and 1280×900 | `horizontal-audit-*.json` |
| T | Duplicate-redeem test could not catch a double charge | A 30-point treat with a 200 balance: a double tap charges once, a later tap charges again | `wellness.spec.ts` treats test |
| T | Free-model test was circular | The exact request body is tested: zero `max_price` and a refusal before any request for a non-free id | `tests/timer.test.ts` |
| WebKit | Water and food rows wrapped in WebKit, shifting layout; Tab did not move focus | Shorter row status text and icon-only water actions; the keyboard test uses Option-Tab on WebKit | supervisor's frozen-build run: 67 passed on both engines ([e2e-real-supervisor.txt](e2e-real-supervisor.txt)) |

The JavaScript budget stays at 40,960 gzip bytes; the bundle is 40,066. No verification threshold was changed.

## Supervisor outputs (produced outside this sandbox, included as they are)
- `evidence/pwa.json`: Chromium installability against the local production server, no errors; `physicalInstallVerified` stays false.
- `evidence/performance.json`, `evidence/lighthouse-current.json`: throttled Lighthouse of the public gate screen on the local server; scores 1.0/1.0/1.0. This measures the gate, not the signed-in dashboard.
- Real-server browser run on the frozen build (Chromium and WebKit, localhost, test-only auth): 67 passed, 0 failed, 0 skipped, in 6.1 minutes: [e2e-real-supervisor.txt](e2e-real-supervisor.txt).
- Database integration against a disposable PostgreSQL, isolated schema: passed, 17 operations recorded, every check true: [integration-supervisor.txt](integration-supervisor.txt).

## Commands and results

| Command | Result | Capture |
|---|---|---|
| `npm run check` on the pre-review build | pass; 26 unit tests; budget 38,899 of 40,960 gzip bytes | [check.txt](check.txt) |
| Lint, typecheck, unit, scans and budget on the frozen review build (no rebuild) | pass; 31 unit tests; 0 lint problems; token and mascot scans 0 findings; bundle 40,066 of 40,960 gzip bytes | [check-review1.txt](check-review1.txt) |
| `VIRTUAL_SERVER=1 npx playwright test --project=chromium` (sandbox, virtual server) | 33 passed, 1 skipped (gate needs a real server) | [e2e-chromium.txt](e2e-chromium.txt), [e2e-results.json](e2e-results.json) |
| Real server, both engines, frozen build (supervisor) | 67 passed, 0 failed, 0 skipped | [e2e-real-supervisor.txt](e2e-real-supervisor.txt) |
| Real database integration (supervisor, disposable PostgreSQL) | passed | [integration-supervisor.txt](integration-supervisor.txt) |
| `ONLY_VIEWPORT=<phone|small|desktop> VIRTUAL_SERVER=1 node --import tsx scripts/ui-shots.mjs <dir>`, three bounded runs merged | 159 states (50 per viewport plus 9 extras), every state reached and its expected text found, 0 sideways, 0 clipped, reduced motion: 0 animated elements | [after/fit.json](after/fit.json), `after/{phone,small,desktop}/*.png` (`*-full.png` = whole scrolling page), `after/extras/*.png` |
| Before captures (previous build) | retained | [before/fit.json](before/fit.json), `before/*/*.png`; earlier evidence untouched under `evidence/ui/`, `evidence/v3/` |
| `curl https://openrouter.ai/api/v1/models` (public, no credential) | all six configured ids listed, prompt and completion price `0`, five accept images | [openrouter-models.json](openrouter-models.json) |
| Baseline build before any change | pass, 26,118 gzip bytes | [build-baseline.txt](build-baseline.txt) |

Captured states (each from a fresh page and fixture): home (partial, complete, rest day, empty), walk (ready, running, paused, done), workout (checklist, ticked, done), abs (library, guided, done), floss (ready, done), water, food (meals, empty), meal sheet, meal estimate, meal numbers, camera sheet, rest (available, planned, none left), meditate (ready, running), focus (ready, running), treats (list, empty, redeemed, edit sheet), progress (week, month, trends, missed day, rescue sheet), backfill (home, walk, workout), settings, targets, details, weigh-in, plan, lock and about sheets, rules; extras: gate, onboarding, timezone banner, reduced motion (home, walk running), 375×640 (home, abs, walk, progress).

## Scope items 1–19

| # | Item | How it is met | Evidence |
|---|---|---|---|
| 1 | No unintended horizontal scrolling | `.page` is `overflow-x:hidden`; every page audited for width overflow and a real sideways drag | `horizontal.spec.ts` (16 screens, drag delta 0) → [horizontal-audit.json](horizontal-audit.json); `after/fit.json` `sideways: []` everywhere |
| 2 | No clipping; intentional vertical scroll | The page scrolls inside `.page` when content needs it (home, abs, rest, progress, settings, rules); the probe fails on any element hiding overflow with content beyond its box | `after/fit.json` `clipped: []`, `pageScrollsY` per page; `*-full.png` show the whole page |
| 3 | Dedicated activity pages; walk start/pause/finish | `#walk` with ring dial, Start/Pause/Resume/Finish, done card with Undo; `#workout`, `#abs`, `#floss`, `#water`, `#food`, `#rest` | `wellness.spec.ts` "the walk timer starts, pauses, survives a reload…"; [timer-walk-chromium.json](timer-walk-chromium.json); `after/phone/walk.png` |
| 4 | Workout planner/checklist | Editable plan (Settings or Edit plan), checklist with session clock, Finish records moves and seconds | `wellness.spec.ts` "the workout page is a checklist…"; `after/phone/workout.png` |
| 5 | Guided ab library, instructions, intervals, optional audio | `lib/abs.ts`: 4 routines, 12 cued moves, work/rest intervals; phase derived from elapsed time; flash cues, optional chime (Settings) | `wellness.spec.ts` "the guided ab routine…" (cues, next move, pause, sleep catch-up, single log); `tests/timer.test.ts`; `after/phone/abs-guided.png` |
| 6 | Cute milestones/celebrations/progress | Milestone stars 3…100 on Progress, "n days to next" pill on the hero, "+100 points" and petals on a complete day | `wellness.spec.ts` "milestones show…"; `app.spec.ts` celebration → [celebration-chromium.png](celebration-chromium.png); `after/phone/progress.png` |
| 7 | Two planned rest days/week; rest ≠ failure; history preserved | `restDaysPerWeek=2`, plannable ahead within the week, third refused; rest shown as rest in rows, bars (lilac + moon), grid (☾), detail copy; legacy one-rest weeks unchanged | `tests/domain.test.ts` (3 rest tests incl. legacy history); `history.spec.ts` → [rest-planned-chromium.png](rest-planned-chromium.png); `wellness.spec.ts` "a rest day yesterday keeps the streak across midnight" |
| 8 | Optional meditation outside the streak | `#meditate`: 3–20 min countdown, logs minutes; never in `completion`/`streaks`/points | `tests/domain.test.ts` "meditation and focus are logged but never touch…"; `wellness.spec.ts` "meditation and focus are optional…" |
| 9 | Optional Pomodoro outside the streak; no OS blocking | `#focus`: work/break blocks, each finished work block logged once (also when finished while away); copy says it does not block other apps | same as 8; `after/phone/focus.png` |
| 10 | User-chosen reward points/treats; no food-must-be-earned, no invented thresholds | 10/habit + 30/day; treats are user-named with user costs; copy states food is never a reward or debt; nothing cites a threshold as science | `tests/domain.test.ts` points test; `wellness.spec.ts` "treats are user-chosen…"; `after/phone/rewards.png` |
| 11 | Concise dashboard cards with separate one-tap log and one-tap open | Every row: open target (chevron/body) and a separate action button (Log/Undo, +Glass, +Meal, Rest) | `gamify.spec.ts` tap latency (all <2 ms, no layout shift) → [tap-latency-chromium.json](tap-latency-chromium.json); `wellness.spec.ts` "every page is one tap from the dashboard…" |
| 12 | lb/kg and ft-in/cm, defaults lb/ft-in, preserved measurements | `lib/units.ts`; onboarding and details forms in the chosen unit; weigh-in parses to kg; display converts; stored kg/cm never rounded | `tests/units.test.ts`; `app.spec.ts` onboarding (5′5″ / 143.3 lb → 165 cm / 65 kg stored); `wellness.spec.ts` "units switch…" |
| 13 | Verify OpenRouter model; free-only, no paid fallback; tracking works without AI; no credentials printed | Live model list checked without a key; `isFree` id guard + `provider.max_price` 0 on every request; 503 path shows a message and manual numbers still log | [openrouter-models.json](openrouter-models.json); `tests/timer.test.ts` "only free OpenRouter models…"; `app.spec.ts` → [ai-unavailable-chromium.png](ai-unavailable-chromium.png) |
| 14 | Remove footer/bottom nav; dashboard links every page; obvious Home/Back; settings/history accessible | No `nav.bottom-nav`; top bar has Home (on every sub-page), streak badge → Progress, gear → Settings; hash routes make browser Back work | `wellness.spec.ts` "every page is one tap…" (asserts no bottom nav, Home/Settings/Progress on every page, `goBack`) |
| 15 | My Wellness rebrand incl. installed-app label; storage compatibility | Title, manifest name/short_name, `apple-mobile-web-app-title`, gate heading, install note; storage key, cookie, SW cache prefix, tables unchanged | `v3.spec.ts` "the served manifest, icons and splash carry the My Wellness name" → [brand-served.json](brand-served.json); `tests/domain.test.ts` legacy-history test |
| 16 | Undo/edit logs/history; duplicate log/reward prevention | Toggle-to-undo on every habit; done cards with Undo; food edit/remove in place; treat Undo; op ids deduped server-side; double-tap guards on Add, Finish and Redeem | `wellness.spec.ts` "…duplicate finish cannot log twice", "treats… redeem once per tap"; `app.spec.ts` correction; `scripts/integration.ts` (for Forge) |
| 17 | Timers accurate across background/lock/reopen; optional sound/visual cues | Wall-clock timers, phase from elapsed; wake lock when available; ring/flash cues, optional chime | `wellness.spec.ts` walk (reload + 20-minute sleep → 30:00), abs (sleep to end → logged once), focus (block finished while away credited); `tests/timer.test.ts`. **Device limits below.** |
| 18 | Explicit completion/rest/rollover rules; optional vs required; documented defaults | In-app `#rules` page and [RULES.md](RULES.md) | `wellness.spec.ts` midnight rollover and rest-across-midnight tests; `after/phone/rules-full.png` |
| 19 | Accessible, responsive, reduced motion, data-preserving, no unnecessary AI transmission | Keyboard order and visible focus ring; WCAG AA contrast audit of every text node on every page; reduced-motion disables all animation on every page; three viewports; only the described meal is ever sent | `wellness.spec.ts` keyboard + contrast → [contrast-audit.json](contrast-audit.json) (0 failures on 16 screens); `gamify.spec.ts` reduced motion; `after/{phone,small,desktop}` |

## Retained features
| Feature | Check |
|---|---|
| Seven-habit all-or-nothing streak, midnight boundary, rescue, backfill | `tests/domain.test.ts`; `history.spec.ts`; `wellness.spec.ts` backfill |
| Offline queue and duplicate-safe replay | `app.spec.ts` offline test → [offline-chromium.png](offline-chromium.png) |
| Conversational food with USDA grounding, "Not this", correction | `app.spec.ts` onboarding test; `tests/food.test.ts` |
| Camera path, image never persisted | `camera.chromium.spec.ts` → [camera-actions.json](camera-actions.json), [camera-estimate.png](camera-estimate.png) |
| Water minus, no dialog, never below zero | `v3.spec.ts` |
| No toast/snackbar/banner; no layout shift on log | `v3.spec.ts` → [transient-check-chromium.json](transient-check-chromium.json) |
| Tokens only, no mascot leftovers | `npm run scan` in [check.txt](check.txt) |
| Trends (weight in chosen unit, protein, streak) | `history.spec.ts` → [trends-chromium.png](trends-chromium.png) |

## Empty, loading, error and completed states inventoried
Gate (loading scene, error line) · onboarding (validation error) · dashboard (0 of 7, partial, complete/celebration, rest day, past-day banner, "a fresh start" after a miss) · walk/workout/abs (ready, running, paused, done card, backfill mode) · abs guided (work, rest, finished flash) · food (empty list, meals, edit form, estimate loading "Looking…", estimate error with manual fallback, "Not this") · rest (planned, used, none left, before-start, missed) · meditate/focus (ready, running, break, logged) · treats (empty, affordable, "n more", redeemed with undo) · progress (in progress, complete, rest, planned rest, rescued, missed, ahead, before start; empty trends) · settings (storage notice row) · timezone banner · lock sheet (pending changes). Each is reachable in the captures or the specs above.

## For Forge to run outside the sandbox
```sh
# database integration, disposable localhost database only (never the production URL)
DATABASE_URL='postgres://michaelchen@127.0.0.1:55475/postgres' node --import tsx scripts/integration.ts
# real-server browser checks (Chromium and WebKit), test-only auth in the environment, no credential files
APP_PASSPHRASE='<test-only>' TEST_BASE_URL='http://127.0.0.1:3078' npx playwright test
# optional: PWA installability and the performance probe against the same server
node scripts/pwa-check.mjs
node scripts/performance.mjs
```
The gate test (`app.spec.ts` "gate rejects wrong passphrase…") is the one skipped here; it runs unmodified against a real server.

## Limitations, stated plainly
- **Not verified on a physical device.** Wall-clock timers are verified with a virtual clock in Chromium (reload, 20-minute sleep, midnight). iOS may terminate a backgrounded PWA; on reopen the timer resumes from storage, but no notification or sound fires while the app is closed, and the wake lock only holds while the page is visible. Sound needs a user gesture first, which Start provides.
- **WebKit not run here** (launch timeout in the sandbox). Specs are engine-agnostic and committed.
- **Database integration not run here** (no loopback). The script is updated for the new rules and fields; Forge runs it.
- **Bundle budget headroom is small:** 38,899 of 40,960 gzip bytes.
- **The blind visual comparison** against the references was not repeated; references were viewed and the direction recorded in [DESIGN.md](DESIGN.md).
- **Fixtures are synthetic.** No real personal data or credentials appear in tests or evidence.
