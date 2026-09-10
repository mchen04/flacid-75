# My Wellness · acceptance matrix (t_7531365d)

Date: 2026-09-10. Owner: Claude Fable 5.1 (sole implementation owner). Status: **ready for independent review; not accepted until Forge's review is done.**

**Environment.** This session's sandbox forbids listening sockets (`listen EPERM`), outbound loopback (`connect EPERM 127.0.0.1`), shared memory for PostgreSQL (`shmget` fails in `initdb`), and WebKit (`webkit.launch` times out). Chromium runs only single-process. Every browser check here therefore runs against the production build served through request interception (`scripts/virtual-server.mjs`, `VIRTUAL_SERVER=1`), with API routes mocked by the real domain code. What that cannot cover is listed under *For Forge to run outside the sandbox* and *Limitations*.

## Commands and results

| Command | Result | Capture |
|---|---|---|
| `npm run check` (lint, typecheck, unit, token scan, mascot scan, build, budget) | pass; 26 unit tests; budget 38,899 of 40,960 gzip bytes | [check.txt](check.txt) |
| `VIRTUAL_SERVER=1 npx playwright test --project=chromium` | 25 passed, 1 skipped (gate needs a real server) | [e2e-chromium.txt](e2e-chromium.txt), [e2e-results.json](e2e-results.json) |
| `VIRTUAL_SERVER=1 node --import tsx scripts/ui-shots.mjs evidence/my-wellness/after` | 18 screens × 3 viewports, no sideways overflow, no clipped content | [after/fit.json](after/fit.json), `after/{phone,small,desktop}/*.png` (`*-full.png` = whole scrolling page) |
| Before captures (same script, previous build) | retained | [before/fit.json](before/fit.json), `before/*/*.png`; earlier evidence untouched under `evidence/ui/`, `evidence/v3/` |
| `curl https://openrouter.ai/api/v1/models` (public, no credential) | all six configured ids listed, prompt and completion price `0`, five accept images | [openrouter-models.json](openrouter-models.json) |
| Baseline build before any change | pass, 26,118 gzip bytes | [build-baseline.txt](build-baseline.txt) |

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
