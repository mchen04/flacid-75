# My Wellness

A private wellness companion for one person, as a PWA. Formerly Flaccid75; the account, history, streaks and storage key are unchanged.
Open the [live app](https://flaccid75-preview.vercel.app) in Safari.
The passphrase stays in the owner's private installation note, outside this repository.

## Version 4 · My Wellness

- One dashboard. Every activity is a row with its art, one line of status, a chevron that opens its page and a separate one-tap action (Log/Undo, +Glass, +Meal, Rest). No bottom navigation: Home, the streak badge (Progress) and Settings sit in the top bar on every page, and the browser's back button works because pages are hash routes (`#walk`, `#workout`, `#abs`, `#floss`, `#water`, `#food`, `#rest`, `#meditate`, `#focus`, `#rewards`, `#progress`, `#you`, `#rules`).
- Dedicated activity pages: a walk timer with start, pause and finish; a workout checklist with an editable plan and a session clock; a guided ab library with instructions, timed work and rest intervals, visual cues and optional sound; a floss scene; a water page; a food page with in-place edit and remove.
- Timers count from the clock, not from ticks (`lib/timer.ts`), so a locked phone, a backgrounded tab or a reopened app shows the right time. Interval phases are derived from elapsed time, so a routine or a focus block that ends while the app is away is credited on return.
- Two planned rest days per Monday–Sunday week, plannable ahead. Rest keeps the streak and is shown as rest, never as a miss. Earlier weeks keep what they had.
- Optional meditation and focus (work/break) pages, logged but never counted toward the streak. The app does not block other apps.
- Points and treats: ten points per required habit and thirty for a complete day; treats are whatever the user names, at the cost they choose, undoable the same day. Food is never a reward or a debt. Milestones at 3, 7, 14, 21, 30, 50, 75 and 100 days.
- Water by container: name and size your own containers (a 30 oz Stanley is seeded as the default), log by share ("half my Stanley" logs exactly 15 oz), one tap logs a whole default container, and progress reads as "about 1½ of 2¼ Stanleys" (both numbers to the nearest quarter, so they agree with the exact volume beside them). The water target is shown and edited in your volume unit. The app multiplies; a model may only name the container and the share; anything unclear asks once.
- Units: lb and ft-in by default, kg and cm one tap away; volumes in oz or ml; measurements are stored once in kg, cm and ml and never rounded by a switch.
- Food estimates use free OpenRouter models only: every id must carry `:free` (or be `openrouter/free`) and every request sets a zero `max_price`. When no model answers, the numbers path still logs the meal.
- The rules of the day (local day, required versus optional, completion, rest, rollover, points, timers, data) are written out in the app under How it works and in [evidence/my-wellness/RULES.md](evidence/my-wellness/RULES.md).
- Free text (plan moves, treat names, water labels, container names) is measured in characters, may not contain NUL or a split emoji, and is clipped by character on entry; the account refuses such a change by id rather than rolling back a batch. Water completion allows a hundredth of a millilitre so an exactly met target counts. "3/4 of the Stanley" is three quarters of one container.
- Every account answer carries a receipt (recently applied ids and a revision, from one database snapshot), so a change another tab made during this tab's request is counted once whatever order the answers arrive in.
- The device store (`lib/client-store.ts`) is safe across open tabs: every change is journaled under its own key until the account acknowledges it; the acknowledged ids are recorded so no tab re-queues or re-applies an acknowledged change; an account answer that began before a newer answer was saved is not installed; a refusal is kept until its record saves; Lock and clear clears the device first (before any network), writes a marker that locks every open tab, including one restored from the back-forward cache, and advances a local generation so a stale tab or a late answer from before the clear can never write into the store after a new unlock. Outgoing batches are bounded by count and by bytes. Regressions: `tests/e2e/review165.spec.ts`, `tests/e2e/review164.spec.ts`, `tests/e2e/wellness.spec.ts` (R163-1 to R163-8).

Capture provenance: `evidence/my-wellness/after/` is the historical full baseline (pre-dating the final privacy wording); `evidence/my-wellness/changed-172/` holds the changed water, food and rules surfaces captured from the final source. Acceptance and evidence for version 4, commit-bound, with the independent review outcomes (the latest, review 175, approved application commit b370965 as delivered at 38b978f with physical-device and minor limitations recorded): [evidence/my-wellness/ACCEPTANCE.md](evidence/my-wellness/ACCEPTANCE.md). Whether version 4 is pushed, merged and deployed is verified from the GitHub pull request and deployment state; the live link above serves whatever `main` last deployed. Design references viewed and the direction taken: [evidence/my-wellness/DESIGN.md](evidence/my-wellness/DESIGN.md).

## Version 3 · illustrated

- The mascot is retired. Warmth now comes from hand-authored flat vector scenes, a warm cream ground, white floating cards, one apricot accent and a sage secondary.
- Every color, radius, space and type size is a token in `lib/tokens.ts`; `npm run scan` fails on any one-off value and on any leftover reference to the retired character.
- The home screen: a hero scene that is also the walk (the marker walks the path to the flag), round habit chips, and the water and food cards. The progress screen: one large streak number, a chart of thick rounded bars with today in the accent, the calendar and the day detail.
- Water goes down by one tap on the small minus. Nothing transient exists: no toast, snackbar, banner or popup. State changes are shown by the state itself, and the day-complete celebration is the hero scene, not an overlay.
- The icon, maskable icon, apple-touch icon and splash carry the new brand and are regenerated by `npm run art`.

Acceptance for version 3: [evidence/ACCEPTANCE-V3.md](evidence/ACCEPTANCE-V3.md). Blind comparison rounds: [evidence/blind/v3/rounds.md](evidence/blind/v3/rounds.md).

## Version 2 · a game, not a form

- Seven habits: workout, abs, walk, water, protein, calories and floss. All seven count toward the one streak.
- Every habit is an interaction. Tap the glass and water pours in; log a meal and the bowl fills; tap the scene and the marker walks to the flag; workout, abs and floss each have their own moment. Calories and protein are filling meters. Finishing the day is a celebration.
- Food is conversational. Type "two eggs and toast"; the app looks it up through a free OpenRouter model, grounds each item in the USDA FoodData Central table bundled in `lib/foods.json`, shows what it found with a USDA or estimate label, and adds nothing until you tap "Add to today". Photos still work and go through the same path.
- Version 2 shipped with a mascot that won a blind cuteness comparison ([rounds](evidence/blind/v2/rounds.md)); version 3 retired it.
- No wordmark, no calendar strip on Today, no sync notices, no captions. Nothing scrolls sideways.
- Every animation is decoration: the tap registers first, motion follows, and reduced-motion turns it all off.

Acceptance for version 2: [evidence/ACCEPTANCE-V2.md](evidence/ACCEPTANCE-V2.md). Decisions and measurements: [evidence/LEDGER.md](evidence/LEDGER.md).
Browser-driven checks live in `tests/e2e/`. In a sandbox that forbids listening sockets they run against the production build through request interception: `npm run build && VIRTUAL_SERVER=1 npm run test:e2e -- --project=chromium`. Against a real server: `npm run build && npx next start -p 3075` then `npm run test:e2e`.

**Physical iPhone verification remains unfinished.** See the version 1 [acceptance record](evidence/ACCEPTANCE.md) and the [evidence index](evidence/README.md).

## What shipped in versions 1 to 3 (historical; version 4 above supersedes where they differ)

- Seven home-screen habits: workout, abs, walk, water, protein, calories and floss. Each is one tap.
- Water additions of 250 ml, editable meal estimates, and daily calorie and protein totals.
- An in-app camera, photo upload fallback, text estimates, and manual entry when the model fails.
- A weekly progress view by default, plus a month calendar with missing habits and backfill markers.
- Two planned rest days per Monday–Sunday week (one in versions 1 to 3) and unlimited deliberate streak rescues.
- One-time onboarding, editable targets, optional morning weight entry, and smoothed trends.
- Offline viewing and habit changes, with queued writes and duplicate-safe replay after reconnecting.
- Original hand-authored SVG art, app icons, a manifest, and an iPhone 13-sized startup image.

All seven habits must be complete to add a streak day.
Rest and rescue preserve a chain but do not add completed days.
A missed closed day resets the chain; today's unfinished day preserves yesterday's count until midnight.
Manual habit checks record an attestation without inventing food or water totals.

There are no notifications, workout details, social features, payments, saved meals, photo galleries, or wearable integrations.

## Known gaps

| Gap | Current evidence |
|---|---|
| Physical iPhone install and Safari behavior | Unfinished. No observed home-screen install, airplane-mode run, safe-area check, focus-zoom check, or suspension/resume check. |
| Physical-device timing and camera capture | Unmeasured. Desktop browser and simulated-camera results do not replace these checks. |
| Native competitor use | Unfinished. Published screenshots are retained. Version 3 blind rounds compare screens against the two reference designs. |
| Photo response speed | The deployed food-image check takes 10.734 seconds, including upload, startup, and model time. The brief's “few seconds” target is not proven. |
| Photo privacy proof | Local traces find no image markers in scanned model files. Deleted-file contents, memory-mapped writes, provider retention, and the deployed host remain unobserved. |
| Credential exposure | The initial goal read exposed the database credential in private tool output. Git and client scans are clean; rotation is not recorded. |
| Target formulas | Calories use a published equation. Activity, goal, water, and step adjustments are planning defaults, not validated personal measurements. |
| Version 4 release state | Independent review 175 approved application commit b370965 (183 of 183 real-server tests on both Chromium and WebKit, unit, typecheck, lint, build, a 253-operation disposable database run, both-engine offline, live water endpoint guard checks, clean secret scan; judge APPROVE with 0 gating findings). Physical iPhone verification is still unfinished; the judge's minor findings are tracked in [evidence/my-wellness/ACCEPTANCE.md](evidence/my-wellness/ACCEPTANCE.md). Publication is the supervisor's step and is read from the GitHub pull request and deployment state. |

Michael authorizes squash integration into `main`, overriding the original merge ban.
This authorization does not complete or waive physical iPhone verification.
Git deployment is enabled in [vercel.json](vercel.json) (`deploymentEnabled: true`); the latest GitHub deployment of `main` is a successful Production deployment, and the live link at the top serves it.

## Local setup

Local checks use Node 20.19.4. The deployed preview and Linux privacy audit use Node 24.
Copy [.env.example](.env.example) to `.env.local` and supply these values through the environment:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection used by migrations and server data access. |
| `APP_PASSPHRASE` | Private single-account gate. |
| `SESSION_SECRET` | Random 32-byte secret for signed sessions. |
| `OPENROUTER_API_KEY` | Key for the free OpenRouter models used for food and water phrases. Absent: the app still tracks; estimates fall back to manual entry. |

Never commit `.env.local` or print its values.
The owner's local environment and preview environment are already configured.

```sh
npm ci
npm run migrate
npm run dev
```

Migrations apply in a transaction and record their names in PostgreSQL.
The development command builds the phone bundle once before starting Next.js.
Restart it after editing client components or styles.

For a local production build:

```sh
npm run build
npm run start -- --port 3075
```

## Verification

Run the build before browser checks. Do not replace build files while a browser check uses them.
Install the two browser engines once if needed:

```sh
npx playwright install chromium webkit
npm run check
npm run test:integration
npm run start -- --port 3075
```

With that server running, use another terminal:

```sh
npm run test:e2e
node scripts/performance.mjs
node scripts/pwa-check.mjs
```

These checks manage their own work or use no running browser server:

```sh
node scripts/offline-integration.mjs
node scripts/mutation.mjs
node scripts/secret-check.mjs
```

The database integration and offline checks create temporary schemas and remove them afterwards.
The offline check starts its own server on port 3085.
Chromium blocks browser networking; WebKit suspends the origin server to test the real cache.
Mutation checks introduce deliberate faults and restore the source after checking that the tests fail.
The credential scan includes gzip evidence and the generated phone bundle; `.env.local` supplies the values to detect.

With Docker running, the real model process audit is:

```sh
scripts/privacy/run.sh
```

It uses the configured model key and database, and checks that account data stays unchanged.
Its temporary container records file and write-family calls while suppressing data buffers.
Synthetic controls prove that file writes and content matches are detected.
See [the evidence limits](evidence/ACCEPTANCE.md#privacy-and-credential-limits) before interpreting its result.

## Architecture and data

Next.js serves the static entry route, manifest, and private API endpoints.
An esbuild bundle renders the phone interface through Preact's React compatibility layer.
The first script (the dashboard and everything it imports, followed transitively through static imports) is held to the original 40,960 gzip-byte budget; every other page and sheet is a lazily loaded chunk, prefetched after the first paint and cached by the service worker, and total JavaScript has its own 65,536-byte ceiling. `node scripts/budget.mjs` prints both; `node scripts/chunk-check.mjs` proves every chunk is in the shell and the worker's install scan.
Critical styles are inline, typography uses system faces, and all shipped illustrations are local assets.

The local storage key (`flaccid75-v1`), the session cookie name, the service-worker cache prefix and the database tables keep their original names so an installed app updates in place without losing data.

The service worker caches the shell, phone script, manifest, icons, and startup image.
Its version hashes the client code, styles, and worker template.
API responses stay outside its cache.
Authenticated account data and queued operations stay in local storage for offline use.
Locking clears that device only after pending changes sync while online.

The public shell contains no account data.
Account reads require the signed HttpOnly cookie; writes and estimates also check the request origin.
The server rate-limits gate attempts and model requests through PostgreSQL.
A row lock applies each operation batch, and operation IDs prevent duplicate delivery.
UTC timestamps accompany civil day labels; a timezone change re-anchors today without relabeling existing history.
Existing past-day targets stay fixed; a newly backfilled day starts with the current targets.

## Food estimates and photos

Food estimates use free OpenRouter models only (`lib/estimate.ts`): every model id must carry `:free` (or be `openrouter/free`), the request refuses any other id before it is built, and every request sets a zero `max_price` so no provider can charge. There is no paid fallback. When no free model answers, the app shows a message and the numbers path still logs the meal, so tracking never depends on the model.

Photo bytes travel through memory to the model and the app drops its image reference after estimation or cancellation. Only calorie and protein numbers, with their meal id and day, enter meal state. Water phrases send the note and the container names; the model may only name the container and the share, and the app multiplies. The application has no photo storage path or object-store integration. These implementation choices do not prove zero retention by the provider.

The earlier Claude Agent SDK integration and its encrypted credential table are gone (version 2). `OPENROUTER_API_KEY` is the only model credential.

## Targets and art

Calories use the adult female [Mifflin–St Jeor equation](https://pubmed.ncbi.nlm.nih.gov/2305711/).
Protein starts at [1.6 g/kg](https://pubmed.ncbi.nlm.nih.gov/28698222/).
The [ledger](evidence/LEDGER.md#target-calculations) records rounding, bounds, activity defaults, water, and steps.
Every computed target remains editable.
A 2% smoothed-weight change refreshes calculated targets while preserving explicit overrides.
Raw weigh-ins are stored for calculation; the trend view appears after two entries and displays smoothed values.

The [scenes](components/Scenes.tsx) and the [icons](components/Icon.tsx) are hand-authored SVG components.
The [art script](scripts/art.tsx) creates raster icons and the startup image from those SVGs.
Competitor images are evidence only and stay outside deployments.
