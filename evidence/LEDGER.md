# Flaccid75 delivery ledger

## Version 2 · gamify · 2026-09-09

Goal: `flaccid75-v2-gamify.txt`. Acceptance for this version: [ACCEPTANCE-V2.md](ACCEPTANCE-V2.md). Mascot rounds: [blind/v2/rounds.md](blind/v2/rounds.md).

### Decisions

| Decision | Why |
|---|---|
| Flossing is the seventh habit and counts toward the streak from the start, with no grandfathering. | The account had no complete days when this shipped, so nothing breaks retroactively. Backfilling a past day now requires floss too, which keeps one rule for every day. |
| Walking stays one tap; Pip walks the whole track on the tap. | Version 1 settled that walk has no detail. "In proportion to the day's walk" therefore means done or not done. |
| Photos also go through OpenRouter; the Claude Agent SDK, its encrypted credential table and the model-auth scripts are removed. | One provider, one fallback chain, one secret. The photo request drops from about 11 s to a few seconds. Manual entry remains the fallback. |
| Every animation is decoration. State changes synchronously in `dispatch`; a class is added afterwards and cleared by a timer; a second tap replaces it. | The tap must register instantly and be interruptible. |
| Sync is invisible. The pending-count banner, the offline banner and the "changes stay on this device" notice are gone; storage failures still surface as a toast because they lose data. | Nothing may shift layout when she taps. |
| The weigh-in is a chip in the top row, shown only in the morning until logged. The rest-day control is one line above the nav. | Nothing sits over the footer. |
| Undo replaces confirmation. Habit taps toggle; water and meals get a five-second Undo toast. | Version 1 rule, kept. |
| The remote agent probe and the local Playwright launch both fail inside this session's sandbox. Browser checks are written and committed, not executed. | Recorded plainly rather than claimed. See ACCEPTANCE-V2. |

### Version 2 food

| Item | Choice |
|---|---|
| Provider | OpenRouter, free models only, server side. Key in `.env.local` and the Vercel Production and Preview environments. |
| Model, chosen 2026-09-09 from `GET /api/v1/models` | `google/gemma-4-26b-a4b-it:free` first: about 1–3 s, JSON output, accepts photos. Fallbacks in order: `nex-agi/nex-n2.5-mini:free`, `google/gemma-4-31b-it:free`, `nex-agi/nex-n2.5-pro:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `openrouter/free`. Each gets a 22 s budget inside a 50 s total; a 429 or 5xx moves to the next. Probe timings: gemma-4-26b 2.4 s, nex-mini 0.3 s (rate-limited that minute), nemotron 0.4 s (overloaded), nex-pro 25 s, gemma-4-31b 11–34 s. |
| Food database | USDA FoodData Central, SR Legacy (2018-04) plus Foundation Foods (2025-04-24), public domain, compacted to `lib/foods.json` (7,747 foods; kcal and protein per 100 g, up to two portions). Bundled server side, so no API key and no rate limit. Open Food Facts was considered for packaged goods and not used: it needs a network call per lookup and its coverage is uneven. |
| Grounding | The model lists items as USDA-style names with grams and its own estimate. Each name is matched against the local table (token scoring; the row's head food must appear in the query; "mix", "dry", "low-fat" and similar are penalised). A match whose calories fall outside 0.4×–2.5× of the model's figure is treated as a wrong row and the model estimate is kept. Each item is labelled `usda` (with the matched description) or `estimate`. |
| Probe results | "two eggs and toast" → Egg, whole, cooked, scrambled 100 g + Bread, white, toasted 50 g = 294 kcal, 14.5 g, 1.8 s. "chipotle bowl with chicken" → chicken breast, white rice, black beans (USDA) + corn salsa (estimate) = 776 kcal, 54 g, 3.0 s. "half a costco muffin" → Muffins, blueberry, toaster-type 75 g = 235 kcal, 1.1 s. "brb" → 422 "That does not look like food." |
| Confirmation | The sheet shows every item with its source and editable numbers, then "Add to today" or "Not this". Nothing is dispatched before "Add". |

### Copy

Every string was read. Removed: "little" (12 uses), all Claude mentions, "six", the wordmark, tag lines, captions under controls, hint text, and every line that narrated what the user just did. Kept warm: "Good morning.", "Nearly there.", "Every one.", "Rest day.", "A missed day." No guilt, no pleading.

### Removed from the Today screen

Wordmark and icon; week strip; sync and offline banners; "Your daily six" heading and count; per-habit captions ("A little movement", "estimate" captions); the second text button row.

### Deployment

See the bottom of this file for the version 2 deployment record.

---

## Current scope

The [stable Vercel preview](https://flaccid75-preview.vercel.app) serves the shipped app.
Michael authorizes squash integration into `main`, overriding the original goal's merge ban.
Physical iPhone verification remains unfinished. The merge does not imply full acceptance.
The [acceptance record](ACCEPTANCE.md) lists every remaining gap; the [evidence index](README.md) identifies current captures.

The initial brief permits preview deployment and pushing, but prohibits merging.
That earlier restriction describes the implementation phase only; Michael's subsequent instruction supersedes it for this integration.
No production promotion is part of this delivery.

## Shipped design

The home screen answers what remains today, without page scrolling at the tested 390×844 size.
Six compact cards sit below Pip's greeting, followed by food actions and weekly progress.
Cream, blush, lilac, and muted green distinguish actions without using clinical styling.
Controls use system sans-serif type; the greeting uses Georgia. No font download is required.

Pip has hello, cheering, and cozy poses, with gentle copy after a missed day.
The mascot and interface icons are hand-authored SVG; raster icons and startup art derive from those sources.
No generated artwork or third-party illustration pack ships.
Visual preferences and source authorship do not prove universal originality or the required blind comparison wins.

## Competitor references

| Piece | Named competitor | Reference used | Evidence limit |
|---|---|---|---|
| Food totals and correction | Cronometer | [Mobile diary documentation](https://support.cronometer.com/hc/en-us/articles/360018593112-Mobile-Diary-Overview) and published screenshots. | Native use and blind win unfinished. |
| Photo estimates and weight trend | MacroFactor | [AI food logging](https://macrofactor.com/ai-food-logging/) and published screenshots. | Native use and blind win unfinished. |
| Habits and calendar | Streaks | [Official site](https://streaksapp.com/) and published screenshots. | Native use and blind win unfinished. |
| Workout completion | Strong | [Official site](https://www.strong.app/) and published screenshots. | Native use and blind win unfinished. |
| Warm companion | Finch | [Official site](https://finchcare.com/) and published screenshots. | Native use and blind win unfinished. |
| Mascot and home appearance | Duolingo | [Design reference](https://design.duolingo.com/) and published screenshots. | Two critics prefer Pip but recognize Duo and flag framing. Strict mascot and home wins are unproven. |

The [character review record](blind/reviews.md) retains both rounds and their limits.
Published references do not substitute for installation and use of the native apps.
Competitor images stay outside the deployed app.

## Core actions

Counts assume an unlocked app unless launch is listed. Text entry counts as one interaction, not one action per keystroke.

| Intent | Actions | Count and qualification |
|---|---|---|
| Mark a habit | Tap the card. | 1 |
| Add water | Tap +250 ml. | 1 |
| Photograph lunch | Open app, camera, shutter, confirm. | 4; first-use camera permission adds an OS action. File-picker fallback may add OS confirmation. |
| Correct a saved estimate | Open food list, choose correction, edit, save. | 4; typing may require several keystrokes. |
| Spend a rest day | Rest, confirm. | 2 |
| Rescue a selected broken day | Rescue, confirm. | 2 from that day's detail; opening the calendar and selecting a date add navigation. |
| Backfill a habit | Open week/month, select day, tap habit. | 3 for a visible day; older dates require date selection. |
| Record morning weight | Open prompt, enter value, save. | 3 |
| Skip weight | Not today. | 1 |
| Read this week | Week tab. | 1; week is the default progress view. |
| Read this month | Week tab, Month. | 2 |

The normal camera sequence is exercised with a simulated camera and a mocked estimate.
It completes in 631 ms in that desktop check. Physical-device counts and timings remain unmeasured.

## Target calculations

Calories use the adult female [Mifflin–St Jeor equation](https://pubmed.ncbi.nlm.nih.gov/2305711/):
`RMR = 10 × kg + 6.25 × cm − 5 × age − 161`.

| Target | Shipped calculation |
|---|---|
| Calorie center | RMR × activity multiplier × goal factor, rounded to 50 kcal. |
| Activity multiplier | 1.2, 1.375, 1.55, or 1.725. These are planning defaults. |
| Goal factor | Maintain: 1.0; lose: 0.9; gain: 1.1. |
| Calorie range | Center ±100 kcal; lower endpoint at least 1500, upper endpoint at least 1700. |
| Protein | 1.6 g/kg, rounded to 5 g. [Research reference](https://pubmed.ncbi.nlm.nih.gov/28698222/). |
| Water | 30 ml/kg, rounded to 250 ml, bounded to 1500–3500 ml. A planning heuristic. |
| Steps | Activity-based 6000/7000/8000/10000; multiplied by 0.8 at age 65 or above, then rounded to 500. A planning heuristic. |

No single standard formula supports all four targets from these inputs.
All targets remain editable. A 2% smoothed-weight shift refreshes calculated targets while preserving explicit overrides.
Weight smoothing uses elapsed days and a seven-day exponential time constant.
The trend appears after two entries; raw inputs remain stored for calculation.

## Streaks, time, and storage

All six habits must be complete to add a streak day.
Manual checks record an attestation and do not fabricate water or food totals.
Logged totals can also complete water, protein, or calories when no manual override applies.
A missed closed day resets the count. Today's unfinished day preserves yesterday's count until midnight.

Rest and rescue preserve the chain without adding completed days.
Rest is limited to one per Monday–Sunday week. Rescue is unlimited and separately marked.
Backfilled days are marked, and supported dates start at 2000-01-01.

UTC event timestamps accompany civil day labels.
Travel re-anchors today without relabeling history, skipping a streak day, or awarding a duplicate day.
Later local midnights advance the day sequence. Domain tests cover 23:59, DST, and date-line changes in both directions.

PostgreSQL locks the account row and deduplicates operation IDs within a batch transaction.
Local storage holds state and pending operations before the UI updates.
Reconnection rebases unacknowledged operations onto server state.
Existing past-day targets remain fixed; a newly created past day uses the current targets.

## Measured implementation

| Check | Recorded result | Capture |
|---|---|---|
| Phone JavaScript | 21,411 gzip bytes; enforced limit 40,960. | [Current budget](budget-current.json) and [final build check](check-final.txt). |
| Deployed cold entry | FCP and interactive at 0.766 seconds; zero blocking time. | [Performance summary](performance.json). |
| Lighthouse scores | 100 performance, 100 accessibility, 100 best practices. | [Full report](lighthouse-current.json). |
| Local cold entry | FCP and interactive at 0.908 seconds. | [Local summary](performance-local.json). |
| Offline open / habit change | Chromium 39 ms / 1 ms; WebKit 22 ms / 2 ms. | [Offline integration](offline-integration.json). |
| Offline replay | Three queued operations; explicit replay leaves one copy of each change. | [Offline integration](offline-integration.json). |
| Database concurrency | Duplicate water totals 250 ml; independent checks survive; second weekly rest is rejected. | [Integration capture](integration-final.txt). |
| Browser suite | Nine checks pass across Chromium and WebKit. | [Final E2E capture](e2e-final.txt). |
| Fault detection | Partial completion, unlimited rests, and travel remapping all cause test failures. | [Mutation results](mutation.json). |
| Deployed real-image flow | 480 kcal / 25 g; 10.734 seconds total, including a 10.578-second request. | [Live photo result](live-photo.json). |

Lighthouse measures the public entry screen with 150 ms RTT, about 1.6 Mbps, and 4× CPU slowdown.
These are desktop-engine measurements. They do not prove installed-phone performance.
Current Lighthouse has [no PWA score category](https://github.com/GoogleChrome/lighthouse/issues/15535); direct installability checks find zero errors.

Chromium tests browser-offline behavior. WebKit suspends the origin server to exercise the real service-worker cache.
Browser-level offline emulation fails in the retained WebKit diagnostic; that diagnostic is not a passing result.
The passing 390×844 checks report zero home overflow.

Earlier framework clients ship 272,691 and then 186,504 gzip bytes; those captures are historical.
The shipped phone renderer uses Preact compatibility inside a Next.js application.
Fixes include local WebKit cookie handling, manifest caching, midnight action dates, and restoring meal values on Undo.

## Claude and privacy evidence

Server-only estimation uses the configured Claude subscription through the Agent SDK.
The app disables tools, project settings, transcript persistence, telemetry, and error reporting for these requests.
The SDK still writes credential, configuration, and process metadata in a private temporary directory.
Model failures leave manual meal entry available.

The local Linux ARM64 check traces the estimator and its SDK descendants, with syscall data buffers suppressed.
It records 64,200 trace lines and returns 500 kcal / 22 g in 8.180 seconds with tracing enabled.
Synthetic controls detect a file write, its deletion, and a content match.
The final model-file scan finds no image markers. Account state and operation-row count stay unchanged.

[The process result](photo-process-trace.json), [compressed trace](photo-syscalls.txt.gz), and [write calls](photo-write-calls.txt) retain that evidence.
The audit uses temporary memory filesystems because the local Docker disk is full.
It does not inspect deleted-file contents, memory-mapped writes, the deployed host, or provider retention.
The [strace reference](https://man7.org/linux/man-pages/man1/strace.1.html) documents buffer suppression and descriptor decoding.

Exact-value credential scans decompress gzip files before scanning them.
A synthetic compressed value escapes a raw-byte check and is detected after decompression.
The initial source-goal read exposes the database credential in private tool output.
The credential is absent from scanned repository and client artifacts; rotation is not recorded.

## Deployment and integration

The Vercel project initially treats its first deployment as production despite a preview request.
Those bootstrap deployments have no configured production account environment and fail closed.
They are removed; the retained install endpoint is a stable preview alias.
Sensitive preview variables hold the gate and database configuration. Model refresh credentials remain encrypted in PostgreSQL.
Git-triggered deployment is disabled, so source integration does not promote the site to production.

The build branch retains detailed implementation and verification history.
`main` is the authorized squash-integration destination; its squash commit identifies the reviewed source revision.
The [delivery note](DELIVERY.md) records this integration method and the physical checks that remain open.
