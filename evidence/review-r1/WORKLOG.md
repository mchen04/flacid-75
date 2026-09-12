# Review followup: five findings

Review source: `/tmp/flacid-review-t_6a6739e5-r1/REVIEW.md`.
Starting commit: `ac7697921b652c487c193842d741f9f31a1e08ef`.
Original expected base: `48330f8d5a848b934d3e4f913eeaaafa14d25d0a`.
Sole implementation owner; Forge supplies the independent review.
Scope stays local. No push, PR, merge, deployment, production mutation, auth/provider/model change, Kanban change, or delegated writer. No cleanup helper runs.

Read the review, supplied instructions, README, existing acceptance/proof notes, prior worklog, relevant tests, and address-review instructions. The repository has no AGENTS.md. The prior instructions remain in force.

## Finding to proof

| Finding | Reproduction | Change | Verification |
|---|---|---|---|
| 1. Walk removal | Two walk cases fail because Remove walk 1 is absent. Reducer tests retain 19,800 seconds after deletion; legacy removal also fails. | `deleteWalk` removes one UUID or the legacy entry, prunes order, and updates the aggregate. Removing the last entry clears only the aggregate. Completion remains independent. Home shows logged time while unchecked. | New reducer tests check both completion states, streaks, replay, missing ids, legacy data, unrelated sessions, and validation. Browser cases cover keyboard removal, both completion states, Home, reload, new walks, and 320 px. PostgreSQL checks duplicate removal and persisted totals. |
| 2. Portion scaling | Changing chicken from 100 g to 200 g leaves 165 kcal and 31 g protein. | Positive portions scale both nutrients for USDA and estimate items. A focus-time basis preserves the ratio while the field is cleared and typed. Nutrition rounds to one decimal. | Browser doubles chicken to 330 kcal/62 g and halves rice to 65 kcal/1.5 g. Saved total is 395 kcal/63.5 g. Description, source details, other meals, and reload remain intact. |
| 3. Item removal | Remove item 1: Chicken is absent in the saved meal editor. | Each item has an accessible Remove item button. Removal recalculates totals, including the last item and legacy corrected totals. Saving an empty list explicitly persists `items: []`. | Browser removes the first and last items, checks zero totals, preserves description and the other meal, and reloads. A separate case removes a zero-valued last item with old nonzero meal totals. Real API/database runs verify each removal. |
| 4. Weak timer test | A scratch mutation replaces the finish id with `undefined`; the old test still passes. The mutation runner therefore exits 1. | The test requires a nonempty id, exact `stableId('finish|'+run)`, stable retries/recovery, and a different id for the next run. | Scratch runtime baseline exits 0. Missing, empty, and constant-id mutations each exit 1 from assertions. This is executed JavaScript through tsx, not a TypeScript failure. |
| 5. Plaintext evidence | The redaction test fails on the earlier worklog. A second probe also catches its gate-fill example. | Test credential assignments and the gate example use placeholders. A stream filter removes generated test values before new browser output reaches evidence. | Redaction tests reject raw assignments, gate commands, and password snapshots. Negative controls verify detection. Current evidence scans pass. |

## Zero portions and bounds

A positive starting portion changed to zero produces zero nutrition. Clearing and retyping during the same edit retains the original density. A saved zero starting portion has no defined ratio: its numeric values remain finite and unchanged, and the editor asks for calories and protein. Explicit correction then saves normally. The browser tests execute this complete flow. Existing meal limits still reject excessive totals; scaling does not silently clamp nutrition to a false ratio.

Removing a walk never changes `checks.walk`, even when no entries remain. Required-habit completion and streak calculations keep their existing meaning. Existing legacy session and meal records still load. No migration is needed.

## Environment and command record

macOS, Node v26.7.0, Next 16.3.4, installed locked dependencies from the preceding implementation. PostgreSQL 14 uses only this task's loopback instance on port 55496. Browser checks use the production build and real HTTP. Most suite fixtures mock account replies using the actual validation and reducer. The separate direct harness uses real API routes and SQL reads.

The generated `/tmp/flacid-review-r1.env` contains random test-only credentials, a loopback database URL, and the test base URL. It has mode 0600. No production environment file is read. Its credential values never belong in this record.

Setup commands:

```sh
mkdir -p evidence/review-r1
/opt/homebrew/opt/postgresql@14/bin/pg_ctl -D /tmp/flacid-t_6a6739e5-pg -l /tmp/flacid-t_6a6739e5-pg.log -o '-h 127.0.0.1 -p 55496' start
/opt/homebrew/opt/postgresql@14/bin/createdb -h 127.0.0.1 -p 55496 flacid_review_r1
node --env-file=/tmp/flacid-review-r1.env scripts/migrate.mjs
```

Environment generation uses Python `secrets.token_hex(24)` and `secrets.token_hex(32)`, then `os.chmod(path, 0o600)`. Database URL is `postgresql://127.0.0.1:55496/flacid_review_r1`. The final test URL is `http://localhost:3096`.

| Exact command | Result and artifact |
|---|---|
| `node --env-file=/tmp/flacid-review-r1.env node_modules/@playwright/test/cli.js test tests/e2e/review-r1.spec.ts --project=chromium --reporter=list > evidence/review-r1/browser-before.txt 2>&1` | Exit 1; four expected failures before fixing. |
| `node --import tsx --test tests/daily-logs.test.ts > evidence/review-r1/walk-before.txt 2>&1` | Exit 1; two new deletion tests fail. |
| `node scripts/check-timer-mutations.mjs > evidence/review-r1/timer-before.txt 2>&1` | Exit 1; missing-id mutant incorrectly passes the old runtime test. |
| `node --import tsx --test tests/evidence-redaction.test.ts > evidence/review-r1/redaction-before.txt 2>&1` | Exit 1; detects the old worklog. |
| `node --import tsx --test tests/evidence-redaction.test.ts > evidence/review-r1/redaction-gate-before.txt 2>&1` | Exit 1; detects the remaining gate-fill example after assignment redaction. |
| `node --import tsx --test tests/daily-logs.test.ts tests/meal.test.ts tests/sessions.test.ts tests/evidence-redaction.test.ts > evidence/review-r1/unit-focused.txt 2>&1` | Exit 0; 16/16 at this stage. |
| `npm run check > evidence/review-r1/check.txt 2>&1` | Exit 0; 69 unit tests, lint, types, scans, production build. |
| `npm run check > evidence/review-r1/check-final.txt 2>&1` | Exit 0; 69 tests and all checks after retaining the existing checked Home wording. This is the application build used by the browser runs. |
| `node --env-file=/tmp/flacid-review-r1.env --import tsx scripts/integration.ts > evidence/review-r1/database.txt 2>&1` | Exit 0; 273 operations in a fresh schema. The script drops only that schema in finally. |
| `node --env-file=/tmp/flacid-review-r1.env node_modules/@playwright/test/cli.js test tests/e2e/review-r1.spec.ts tests/e2e/daily-logs.spec.ts tests/e2e/daily-logs-extra.spec.ts --reporter=list > evidence/review-r1/browser-focused.txt 2>&1` | Exit 0; 34/34 across Chromium and WebKit. |
| `node scripts/check-timer-mutations.mjs > evidence/review-r1/timer-after.txt 2>&1` | Exit 0; baseline passes, all three runtime mutants fail. Scratch copies are removed; repository production source is never mutated. |
| `node --import tsx --test tests/evidence-redaction.test.ts > evidence/review-r1/redaction-after.txt 2>&1` | Exit 0; three tests, including negative controls. |
| `npm run lint > evidence/review-r1/lint-final-tests.txt 2>&1 && npm run typecheck > evidence/review-r1/typecheck-final-tests.txt 2>&1 && npm test > evidence/review-r1/units-final.txt 2>&1` | Exit 0; final scripts and tests, 70/70 unit tests. |

Final server and browser commands:

```sh
node --env-file=/tmp/flacid-review-r1.env node_modules/next/dist/bin/next start --hostname localhost --port 3096 > evidence/review-r1/server-localhost.txt 2>&1
set -o pipefail
node --env-file=/tmp/flacid-review-r1.env scripts/review-r1-browser.mjs 2>&1 | node --env-file=/tmp/flacid-review-r1.env scripts/redact-test-output.mjs > evidence/review-r1/browser-real-db.txt
node --env-file=/tmp/flacid-review-r1.env node_modules/@playwright/test/cli.js test --reporter=list 2>&1 | node --env-file=/tmp/flacid-review-r1.env scripts/redact-test-output.mjs > evidence/review-r1/browser-full.txt
```

The direct harness passes on both engines. Each logs 300 and 30 minutes, removes one walk, then unchecks and removes the last walk. It verifies checked and unchecked persistence. It scales a saved USDA item, removes the second item, saves, reloads, and reads the exact record from PostgreSQL. It then removes the last item and verifies empty details and zero totals in SQL. Both 320 px no-overflow checks pass. No estimate/model request is made; detailed synthetic meals enter through the real sync API.

## Harness failures and limits

- The first server binds `127.0.0.1`, while this Next runtime's request origin uses localhost. Real auth correctly rejects the mismatch. The focused mocked-account suite passes, but the first full attempt stops early. `browser-full-origin-before.txt` records that attempt. The server/test URL changes to localhost; a wrong-passphrase control then returns 401, not 403. No auth source changes.
- The first direct run has the same origin failure (`browser-real-db-origin-before.txt`). Playwright's error object includes the test password in its accessibility snapshot. That generated value is redacted immediately. Later runs stream through the credential filter. A second direct attempt checks onboarding too early; `browser-real-db-onboarding-before.txt` records it. The harness now waits for either onboarding or Home before choosing the path.
- The expanded evidence scan initially treats a quoted source-code lookup as an assignment. The scanner now distinguishes `startsWith` source text, with a regression assertion. This is a scanner correction, not an ignored credential match.
- The unit-only run started before that correction fails. `units-final.txt` is the later successful rerun. The source build remains unchanged during the entire final browser suite.
- Physical iPhone testing is not performed. Chromium/WebKit phone viewports and local browser interactions do not prove physical device behavior.
- Earlier commit history is not rewritten. Current worklog values are redacted. The historical values are test-only, and this run uses new random values.

## Manual browser and images

Task-owned agent-browser sessions are isolated and closed after use. Other sessions remain untouched. Commands use `--session` on every interaction. Gate filling occurs through a Node subprocess that reads only the generated test environment; output suppresses credentials.

The manual flow logs 300 and 30 minutes on the real API/database. Initial CLI pointer clicks on the offscreen remove control report success without changing state. `manual-click-inspect.json` shows the button below the viewport. These attempts are not claimed as removal proof; `manual-click-no-change.png` visibly retains 330 minutes. Focus plus Enter removes the first walk. Reload then retains one 30-minute entry and checked completion. `manual-keyboard-reload.txt`, `manual-keyboard-fit.txt`, and `manual-keyboard-320.png` record that result. The fit probe reports width 320, scroll width 320, pending 0. Browser error output is empty. The project browser tests separately prove pointer removal on both engines.

Manual command sequence includes:

```sh
agent-browser --session t_6a6739e5-r1 open http://localhost:3096/#walk
agent-browser --session t_6a6739e5-r1 set viewport 320 740
agent-browser --session t_6a6739e5-r1 snapshot
# Fill Walk minutes with 300, click Log walk, snapshot; repeat with 30; reload and snapshot.
# Click Remove walk 1; snapshot shows no change. Close this session.
agent-browser --session t_6a6739e5-r1 close
agent-browser --session t_6a6739e5-r1-retry open http://localhost:3096/#walk
# Unlock, snapshot, inspect the offscreen control.
agent-browser --session t_6a6739e5-r1-retry focus @e10
agent-browser --session t_6a6739e5-r1-retry press Enter
agent-browser --session t_6a6739e5-r1-retry reload
agent-browser --session t_6a6739e5-r1-retry set viewport 320 740
agent-browser --session t_6a6739e5-r1-retry snapshot
# Scroll the Walk entries group into view with DOM scrollIntoView; capture with a 30-second external timeout.
agent-browser --session t_6a6739e5-r1-retry close
agent-browser session list
```

Opened and inspected: the before portion image, a before walk image, both `items-320` images, both direct database images, the failed manual capture, and the successful manual keyboard capture. The direct images show the scaled 200 g/330 kcal/62 g item and Remove item control. The item-removal images show only Rice remaining. The successful manual image shows one 30-minute walk and Remove.


## Additional evidence checks

`generated-credential-scan.txt` records a read-only scan of 1,281 tracked and new files. It uses only the two generated test credentials. Plain and gzip-compressed negative controls both trigger detection; actual findings are empty. It does not read `.env.local` or any personal data.

`redaction-cli.txt` records an executed stdin test of `scripts/redact-test-output.mjs`. The test splits the credential across writes, includes an emoji, and omits the final newline. The output retains the emoji and replaces the complete credential with a placeholder. Exit 0.

Raw command output retains its formatting except credential redaction. Source and worklog whitespace checks pass. Browser-generated historical images and metrics are restored before commit; this revision's evidence stays in this folder.

The direct database harness starts with no walks for today. For an independent rerun, use a fresh disposable database with the documented name and generated credentials. The isolated-schema integration script can run repeatedly without resetting the browser dataset.

## Final handoff

All five findings are fixed and verified. The full production-server suite exits 0: **217 passed, 0 failed, 0 skipped**, across Chromium and WebKit in 9.9 minutes. The focused suite passes 34/34. The direct real API/PostgreSQL harness passes on both engines. The isolated schema run records 273 operations and leaves zero temporary schemas.

`npm run check > evidence/review-r1/check-handoff.txt 2>&1` exits 0: lint, typecheck, **70/70 unit tests**, scans, production build, bundle budget and chunk checks. The final rebuild retains client version `0d1687b8a86f`, exactly matching the tested application build. Critical JavaScript is 35,717/40,960 gzip bytes; total JavaScript is 56,537/65,536.

`git diff --check -- components lib scripts tests evidence/review-r1/WORKLOG.md evidence/local-followup/WORKLOG.md` exits 0. Historical test-generated artifacts are restored: 26 tracked files, excluding the intentionally redacted prior worklog. Two untracked images from these browser tests are removed. No cleanup helper is used.

Shutdown commands:

```sh
kill 32541
/opt/homebrew/opt/postgresql@14/bin/pg_ctl -D /tmp/flacid-t_6a6739e5-pg stop -m fast > evidence/review-r1/shutdown.txt 2>&1
agent-browser session list >> evidence/review-r1/shutdown.txt
```

The server and PostgreSQL stop successfully. Both owned browser sessions are closed; the two unrelated browser sessions remain untouched. The synthetic database stays available for inspection after restart. The generated environment file remains owner-readable only.

Ready for the local commit and Forge's independent re-review. No independent verdict is claimed by the implementation owner. No push, deployment, or cleanup helper follows this handoff.
