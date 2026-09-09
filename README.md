# Flaccid75

A private daily fitness PWA for one person, with Pip the penguin.

## Run

Use Node 20.19 or later. Create `.env.local` with `DATABASE_URL`, `APP_PASSPHRASE`, and a random 32-byte `SESSION_SECRET`.
Never commit that file. The environment is already configured on the owner's machine and preview host.

```sh
npm ci
npm run migrate
npm run dev
```

For the production build locally:

```sh
npm run build
npm run start
```

## Verify

```sh
npm run check
npm run test:integration
npm run start -- --port 3075
# In a second terminal, after the server is ready:
npm run test:e2e
node scripts/offline-integration.mjs
node scripts/performance.mjs
node scripts/mutation.mjs
```

The database integration checks use temporary schemas and remove them afterwards.
Do not build while a browser check is running: a build replaces the files that its server serves.
The real offline check starts and stops its own server on port 3085.
The current performance check uses Lighthouse mobile throttling, with fourfold CPU slowdown and a 4G network profile.
For the real model process privacy audit, with Docker running:

```sh
scripts/privacy/run.sh
```

This uses the configured subscription and database. It retains a syscall trace with data buffers suppressed.
Synthetic controls prove that file writes and content matches are detected. The account data stays unchanged.
The isolated container uses temporary memory storage and removes itself after the check.
Deleted-file contents and the deployed host remain outside this audit.
All retained evidence and limitations live in [the ledger](evidence/LEDGER.md).

## Architecture

Next.js serves a static HTML route, the manifest, and four private API routes.
The phone runs a 21 KB gzip Preact renderer. It uses the same React-compatible components and domain functions as the tests.
This keeps Next.js framework navigation code off the phone; one screen switch needs no server request.
Critical CSS is inline. No external fonts, analytics, image assets, or notification services load.
The service worker caches a versioned shell, its script, the manifest, icons, and splash image.
A build hashes the phone script and styles, then generates its service worker version.

The gate uses a high-entropy passphrase, a signed HttpOnly cookie, strict same-site cookies, origin checks, and database-backed rate limits.
The shell is public but contains no account data. Every account read, write, and model call requires authentication.
Authenticated device data stays in local storage for offline use. Locking clears that device after all pending changes sync.

Each operation has an ID and UTC timestamp. PostgreSQL locks the single state row while it applies each batch.
Duplicate delivery is harmless. Concurrent operations merge under the row lock. Past-day targets stay frozen.
Rest days and rescues preserve the chain; complete days alone increase the count.
The timezone clock re-anchors the current civil day during travel and keeps historic labels stable.

## Claude

The server uses the official Claude Agent SDK and the owner's existing subscription.
No tools, project settings, transcript persistence, telemetry, or error reporting are enabled.
The request sends only the image in memory. Only calorie and protein numbers enter the app state.
The app drops its photo reference as soon as estimation ends or is cancelled.

The preview stores the subscription credential encrypted with `SESSION_SECRET` in `flaccid75_model_auth`.
A separate row lock serializes refreshes. Refreshed credentials persist encrypted after each call.
The SDK needs a private temporary credential/configuration directory; the photo audit scans it for image data.
No image enters a blob store, account table, or application log.
This does not promise anything about Anthropic's own retention policies.

If the existing subscription sign-in is revoked or expires, sign into Claude locally, then run:

```sh
node --env-file=.env.local --import tsx scripts/configure-model.ts
```

A model failure leaves manual meal entry available. No other model provider is configured.

## Targets

Calories use the adult female [Mifflin–St Jeor equation](https://pubmed.ncbi.nlm.nih.gov/2305711/).
Protein starts at [1.6 g/kg](https://pubmed.ncbi.nlm.nih.gov/28698222/).
Activity, goal adjustment, water, and steps are documented planning defaults, not universal medical formulas.
The app explains the calculation and lets the user edit each target.
A 2% change in the seven-day smoothed weight recalculates targets while preserving explicit overrides.
Weight displays only after two entries, and only as a smoothed trend.

## Art and delivery

Every shipped illustration is an original SVG written in `components/Pip.tsx` or `components/Icon.tsx`.
The icon and splash PNGs rasterize the authored SVG using `scripts/art.tsx`.
Third-party competitor screenshots remain in evidence only; `.vercelignore` excludes them from deployment.

Preview deployment and branch pushes are authorized. No pull request or merge is authorized.
The stable install link and passphrase are in the owner's private installation note outside this repository.
Physical iPhone installation and native-app comparisons require device access and remain separate from browser emulation.
