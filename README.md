# Flaccid75

A private fitness PWA for one person, with Pip the penguin.
Open the [shipped preview](https://flaccid75-preview.vercel.app) in Safari.
The passphrase stays in the owner's private installation note, outside this repository.

**Physical iPhone verification remains unfinished.** The preview is usable, but the full original acceptance goal is not complete.
See the [acceptance record](evidence/ACCEPTANCE.md) for each requirement and the [evidence index](evidence/README.md) for retained results.

## What ships

- Six home-screen habits: workout, abs, walk, water, protein, and calories. Each has a one-tap check.
- Water additions of 250 ml, editable meal estimates, and daily calorie and protein totals.
- An in-app camera, photo upload fallback, text estimates, and manual entry when the model fails.
- A weekly progress view by default, plus a month calendar with missing habits and backfill markers.
- One deliberate rest day per Monday–Sunday week and unlimited deliberate streak rescues.
- One-time onboarding, editable targets, optional morning weight entry, and smoothed trends.
- Offline viewing and habit changes, with queued writes and duplicate-safe replay after reconnecting.
- Original hand-authored SVG art, app icons, a manifest, and an iPhone 13-sized startup image.

All six habits must be complete to add a streak day.
Rest and rescue preserve a chain but do not add completed days.
A missed closed day resets the chain; today's unfinished day preserves yesterday's count until midnight.
Manual habit checks record an attestation without inventing food or water totals.

There are no notifications, workout details, social features, payments, saved meals, photo galleries, or wearable integrations.

## Known gaps

| Gap | Current evidence |
|---|---|
| Physical iPhone install and Safari behavior | Unfinished. No observed home-screen install, airplane-mode run, safe-area check, focus-zoom check, or suspension/resume check. |
| Physical-device timing and camera capture | Unmeasured. Desktop browser and simulated-camera results do not replace these checks. |
| Native competitor use and blind comparisons | Unfinished. Published screenshots are retained; two critics prefer Pip but recognize Duo and flag framing bias. |
| Photo response speed | The deployed food-image check takes 10.734 seconds, including upload, startup, and model time. The brief's “few seconds” target is not proven. |
| Photo privacy proof | Local traces find no image markers in scanned model files. Deleted-file contents, memory-mapped writes, provider retention, and the deployed host remain unobserved. |
| Credential exposure | The initial goal read exposed the database credential in private tool output. Git and client scans are clean; rotation is not recorded. |
| Target formulas | Calories use a published equation. Activity, goal, water, and step adjustments are planning defaults, not validated personal measurements. |

Michael authorizes squash integration into `main`, overriding the original merge ban.
This authorization does not complete or waive physical iPhone verification.
The installed endpoint remains a Vercel preview; Git deployment is disabled in [vercel.json](vercel.json).

## Local setup

Local checks use Node 20.19.4. The deployed preview and Linux privacy audit use Node 24.
Copy [.env.example](.env.example) to `.env.local` and supply these values through the environment:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection used by migrations and server data access. |
| `APP_PASSPHRASE` | Private single-account gate. |
| `SESSION_SECRET` | Random 32-byte secret for signed sessions and encrypted model credentials. |

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

It uses the configured Claude subscription and database, and checks that account data stays unchanged.
Its temporary container records file and write-family calls while suppressing data buffers.
Synthetic controls prove that file writes and content matches are detected.
See [the evidence limits](evidence/ACCEPTANCE.md#privacy-and-credential-limits) before interpreting its result.

## Architecture and data

Next.js serves the static entry route, manifest, and private API endpoints.
An esbuild bundle renders the phone interface through Preact's React compatibility layer.
The measured bundle is 21,411 gzip bytes; the build enforces a 40,960-byte limit.
Critical styles are inline, typography uses system faces, and all shipped illustrations are local assets.

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

## Claude and photos

The server uses the official Claude Agent SDK with the owner's existing subscription.
The app configures no tools, project settings, transcript persistence, telemetry, or error reporting for estimates.
Photo bytes travel through memory to the model. The app drops its image reference after estimation or cancellation.
Only calorie and protein numbers, with their meal ID and day, enter meal state.
The application has no photo storage path or object-store integration.
These implementation choices do not prove zero retention by the provider or every underlying runtime component.

The preview stores the model credential encrypted with `SESSION_SECRET` in `flaccid75_model_auth`.
The SDK uses a private temporary credential/configuration directory.
A row lock serializes calls and saves refreshed credentials encrypted after each call.
Changing `SESSION_SECRET` invalidates existing gate cookies and requires model credential reconfiguration.

After restoring the local Claude sign-in, configure the preview credential with:

```sh
node --env-file=.env.local --import tsx scripts/configure-model.ts
```

Model errors leave manual meal entry available. No alternate model provider is configured.

## Targets and art

Calories use the adult female [Mifflin–St Jeor equation](https://pubmed.ncbi.nlm.nih.gov/2305711/).
Protein starts at [1.6 g/kg](https://pubmed.ncbi.nlm.nih.gov/28698222/).
The [ledger](evidence/LEDGER.md#target-calculations) records rounding, bounds, activity defaults, water, and steps.
Every computed target remains editable.
A 2% smoothed-weight change refreshes calculated targets while preserving explicit overrides.
Raw weigh-ins are stored for calculation; the trend view appears after two entries and displays smoothed values.

[Pip](components/Pip.tsx) and the [icons](components/Icon.tsx) are hand-authored SVG components.
The [art script](scripts/art.tsx) creates raster icons and the startup image from those SVGs.
Competitor images are evidence only and stay outside deployments.
