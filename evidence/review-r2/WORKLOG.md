# Review round 2: meal editing

Review: `/tmp/flacid-review-t_6a6739e5-r2/REVIEW.md`.
Starting commit: `9194a70d5c2d4ec3a0b02b08af40d691c2bae890`.
Original base: `48330f8d5a848b934d3e4f913eeaaafa14d25d0a`.
Same sole implementation owner. Forge provides the independent review.
Local changes and commits only. No cleanup helper, push, PR, merge, deployment, production writes, auth changes, model/provider configuration changes, personal communication reads, or delegated writers.

The supplied instructions, repository README and proof/test notes, and previous worklogs remain applicable. Read all three new findings and the affected source/tests. The review's refuted findings stay out of scope.

## Findings, reproduction, and fixes

| Finding | Before | Fix | Evidence |
|---|---|---|---|
| 1. Clearing a portion and leaving the field loses nutrition | Browser: 100 g rice at 250 kcal/10 g becomes 150 g at 0 kcal/0 g after clear, blur, refocus, type. The new test fails. | A blank field is a temporary edit. It changes neither grams nor nutrition. Blur restores the last amount. Entering an explicit number still scales nutrition; explicit zero retains its existing semantics. | New tests cover blank/blur/refocus, save while blank, reload, another unchanged item, new estimates, and removal followed by editing the remaining item. Existing zero and clear-and-type tests remain unchanged and pass. Real API/SQL checks verify persisted amounts. |
| 2. Detailed meal editors lose keyboard focus | Browser: after Edit, Description is not focused. The new keyboard test fails. | Attach the existing focus ref to Description in the items view. Detailed editors focus in a layout effect before paint. New meal dialogs retain their existing post-open focus effect. Switching to estimate items also focuses Description; ordinary item edits do not. | Both engines check Enter and Space opening, Description focus, Tab to the first item, reopening after reload, and new-estimate focus. Manual browser inspection reports `TEXTAREA`, label `Description`. |
| 3. Malformed model text makes meals unsaveable with the wrong message | Unit: grounded names retain NUL/lone surrogates. Device validation reports calorie limits for bad text. Browser: the grounded meal does not save, and a raw malformed response gives a generic error. | Clean names before food lookup and clean returned match text with the existing `clip` function. Share text-specific validation between meal saving and device bounds. | Grounded USDA and unmatched items retain nutrition and valid emoji, pass validation, and persist through PostgreSQL. Browser tests save without manual repair. A deliberately malformed response shows a text error, saves nothing, then saves correct nutrition after the name is edited. |

Blank input is distinct from explicit zero. It cannot silently clear nutrition on blur or Save. Existing meal totals corrected by older clients remain unchanged when the only action is clearing and leaving a portion field. No record format or database migration changes.

## Environment and setup

macOS, Node v26.7.0, Next 16.3.4, PostgreSQL 14. Dependencies remain locked. The browser uses the production build and real local HTTP. No production credential file is read.

`/tmp/flacid-review-r2.env` is generated with Python `secrets.token_hex(24)` and `secrets.token_hex(32)` for test credentials, and `os.chmod(path, 0o600)`. It names `postgresql://127.0.0.1:55496/flacid_review_r2` and `http://localhost:3096`. Credentials are not copied into evidence. Browser output passes through the established redactor.

```sh
mkdir -p evidence/review-r2
/opt/homebrew/opt/postgresql@14/bin/pg_ctl -D /tmp/flacid-t_6a6739e5-pg -l /tmp/flacid-t_6a6739e5-pg.log -o '-h 127.0.0.1 -p 55496' start
/opt/homebrew/opt/postgresql@14/bin/createdb -h 127.0.0.1 -p 55496 flacid_review_r2
node --env-file=/tmp/flacid-review-r2.env scripts/migrate.mjs
node --env-file=/tmp/flacid-review-r2.env node_modules/next/dist/bin/next start --hostname localhost --port 3096 > evidence/review-r2/server-before.txt 2>&1
```

The server is restarted after each build. `server-final.txt` serves the first fix; `server-handoff.txt` serves the first layout-effect build. `server-complete.txt` serves the final application build.

## Exact verification commands and results

| Command | Result |
|---|---|
| `node --import tsx --test tests/food.test.ts tests/bounds.test.ts > evidence/review-r2/unit-before.txt 2>&1` | Exit 1; both new assertions fail before fixes. |
| `node --import tsx --test tests/food.test.ts tests/bounds.test.ts tests/meal.test.ts > evidence/review-r2/unit-after.txt 2>&1` | Exit 0; 13/13 after correcting the fixture described below. |
| `npm run check > evidence/review-r2/check.txt 2>&1` | Exit 0; 72 units, lint, typecheck, scans, build and budgets. This first implementation still has the focus timing problem below. |
| `npm run check > evidence/review-r2/check-final.txt 2>&1` | Exit 0; 72 units and all checks after the focus timing fix. This build still has the dialog timing issue described below. |
| `npm run check > evidence/review-r2/check-handoff.txt 2>&1` | Exit 0; all 72 units and required checks after the dialog timing fix. This is the final browser-tested build. |
| `node --env-file=/tmp/flacid-review-r2.env --import tsx scripts/integration.ts > evidence/review-r2/database.txt 2>&1` | Exit 0; 274 operations in a fresh disposable schema, including malformed model text cleanup and persistence. Previous walk, meal, receipts, concurrency, and validation checks remain. |
| `node --import tsx --test tests/evidence-redaction.test.ts > evidence/review-r2/redaction.txt 2>&1` | Exit 0; scanner now includes this round's folder. Negative controls remain. |
| `node scripts/check-timer-mutations.mjs > evidence/review-r2/timer-mutations.txt 2>&1` | Exit 0; original runtime passes, missing/empty/constant ID mutations fail. |

Before browser command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-review-r2.env node_modules/@playwright/test/cli.js test tests/e2e/review-r2.spec.ts --project=chromium --reporter=list 2>&1 | node --env-file=/tmp/flacid-review-r2.env scripts/redact-test-output.mjs > evidence/review-r2/browser-before.txt
```

Exit 1, four expected behavioral failures. `before-*.png` captures accompany the failing assertions.

Focused browser command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-review-r2.env node_modules/@playwright/test/cli.js test tests/e2e/review-r2.spec.ts tests/e2e/review-r1.spec.ts tests/e2e/daily-logs.spec.ts tests/e2e/daily-logs-extra.spec.ts --reporter=list 2>&1 | node --env-file=/tmp/flacid-review-r2.env scripts/redact-test-output.mjs > evidence/review-r2/browser-focused.txt
```

The same command reruns with output `browser-focused-final.txt`: exit 0, **44/44** across Chromium and WebKit on the final build. The existing dialog keyboard test also passes 2/2 with `test tests/e2e/wellness.spec.ts -g 'keyboard: tabbing' --output=/tmp/flacid-review-r2-keyboard --reporter=list`, captured in `browser-dialog-final.txt`.

Full browser command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-review-r2.env node_modules/@playwright/test/cli.js test --reporter=list 2>&1 | node --env-file=/tmp/flacid-review-r2.env scripts/redact-test-output.mjs > evidence/review-r2/browser-full.txt
```

Exit 0: **227/227 pass** across Chromium and WebKit in 10.1 minutes on the final build. No skipped or failed cases.

Real API/database browser command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-review-r2.env --import tsx scripts/review-r2-browser.mjs 2>&1 | node --env-file=/tmp/flacid-review-r2.env scripts/redact-test-output.mjs > evidence/review-r2/browser-real-db.txt
```

The same command reruns with output `browser-real-db-final.txt` on the final build. Both engines pass. The harness creates distinct synthetic meals and checks live server/SQL state. It verifies cleaned names, source details, Description focus, Tab order, blank/blur preserving nutrition, doubling a portion, saving while blank, reload, and a 320 px no-overflow probe. No API mocks run in this harness. Model inputs are synthetic; the actual grounding function runs locally, then its output goes through the real sync route. No external model request is made. `browser-real-db-initial.txt` records the earlier build's separate successful direct run.

The database command also reruns as `database-final.txt`: exit 0, 274 operations, all assertions pass. `npm run lint > evidence/review-r2/lint-final-tests.txt 2>&1` and `npm run typecheck > evidence/review-r2/typecheck-final-tests.txt 2>&1` both exit 0 after the final harness edits. Final build version: `bc6f5b683708`; critical gzip JavaScript is 35,816/40,960 bytes, total is 56,735/65,536 bytes.

Generated credential scan command (prints paths and counts only; tests detection on plain and compressed credential bytes first):

```sh
node --env-file=/tmp/flacid-review-r2.env --input-type=module > evidence/review-r2/generated-credential-scan.txt <<'JS'
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const values=[process.env.APP_PASSPHRASE,process.env.SESSION_SECRET].map(v=>{assert.ok(v&&v.length>20);return Buffer.from(v);});
function exposed(bytes){const decoded=bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes;return values.some(v=>decoded.includes(v));}
for(const value of values){assert.ok(exposed(value));assert.ok(exposed(gzipSync(value)));}
const findings=[];let files=0;
function scan(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())scan(path);else if(entry.isFile()){files++;if(exposed(readFileSync(path)))findings.push(path);}}}
for(const dir of ['evidence','scripts','tests'])scan(dir);
console.log(JSON.stringify({files,plainAndCompressedNegativeControls:true,findings}));
assert.deepEqual(findings,[]);
JS
```

## Failures found during implementation

1. `browser-loader-before.txt`: Playwright's loader cannot import the USDA JSON table through the estimate module. No tests run. The relevant browser fixture now calls the actual TypeScript grounding function in a local tsx subprocess. This leaves product loading unchanged. The subsequent four behavioral failures are in `browser-before.txt`.
2. `unit-fixture-before.txt` and `check-fixture-before.txt`: the supposed unmatched “mystery stew” fixture matches a USDA food. The test incorrectly expects `estimate`. Replace only that synthetic name with an unmatched one. The new test then exercises both source paths. The initial code-cleanup reproduction remains valid.
3. `browser-focus-timing-before.txt`: 42 pass, two existing clear-and-type tests fail. A normal effect can focus Description after typing begins. Its blur handler restores the previous number, so more typing appends digits. Move focus to a layout effect. The unchanged existing tests then pass with all 44 focused cases. No assertion is weakened.
4. `browser-dialog-focus-before.txt`: the full suite finds one existing keyboard failure after the broad layout-effect change. A new dialog is not yet open when its child layout effect runs. Stop the run (112 pass, one fail, one interrupted, 113 not run). Retain the original passive focus effect for new entry dialogs and use the layout effect only for the items view. Both the original dialog test and all 44 focused cases then pass. Rerun the full suite from the start.

## Manual browser and images

Use the isolated `t_6a6739e5-r2` browser session. Open the local Food page and unlock with the generated test credential through a subprocess that suppresses credential output. Set viewport to 320 × 740. Focus the first Edit button and press Enter. Inspect the focused node: `TEXTAREA`, label `Description`, width and scroll width both 320 (`manual-focus.json`).

Clear the first portion, take a snapshot, focus Description, and take another snapshot. The portion returns to 200 g and retains 298 kcal/20 g. Enter 400 g: the fields show 596 kcal/40 g (`manual-scaled.txt`, `manual-320.png`). This manual edit is not saved; the direct harness supplies the SQL persistence proof. The manual frame predates the final dialog-only timing correction; the detailed-editor behavior is unchanged. Final-build screenshots and SQL results come from the repeated direct harness. Error output is empty. Close only the owned browser session and confirm it disappears; other sessions remain untouched.

Commands include:

```sh
agent-browser --session t_6a6739e5-r2 open http://localhost:3096/#food
agent-browser --session t_6a6739e5-r2 set viewport 320 740
agent-browser --session t_6a6739e5-r2 snapshot
agent-browser --session t_6a6739e5-r2 focus @e7
agent-browser --session t_6a6739e5-r2 press Enter
agent-browser --session t_6a6739e5-r2 snapshot
agent-browser --session t_6a6739e5-r2 fill @e19 ''
agent-browser --session t_6a6739e5-r2 snapshot
agent-browser --session t_6a6739e5-r2 focus @e15
agent-browser --session t_6a6739e5-r2 snapshot
agent-browser --session t_6a6739e5-r2 fill @e19 400
agent-browser --session t_6a6739e5-r2 snapshot
agent-browser --session t_6a6739e5-r2 close
agent-browser session list
```

Each action uses the latest snapshot's references. Screenshot capture has a 30-second external timeout. Opened and inspected the before blank/blur failure, both `portion-*-320.png` images, both `direct-*-320.png` images, and `manual-320.png`. The before image shows 150 g with zero nutrition. Final portion images show 150 g, 375 kcal/15 g, and a focused Description.

## Limits and handoff

Physical iPhone testing is not performed. These are Chromium/WebKit browser checks and local database checks. Synthetic malformed model output proves handling of that shape, not that a real model emitted it. No auth or provider setup changes occur. Source and documentation whitespace checks pass; raw logs retain their output formatting except credential redaction.

All three findings are fixed. Final verification: 72 unit tests, lint, typecheck, scans, production build and budgets; 44 focused browser cases; 227 full browser cases; both real API/PostgreSQL browser runs; 274 isolated database operations. Every required command exits 0. Timer ID mutations fail as expected. The credential scanner finds no generated credential bytes and its plain/compressed negative controls pass.

The integration schemas are gone: the following read-only query returns `0`, saved in `database-schemas-after.txt`.

```sh
/opt/homebrew/opt/postgresql@14/bin/psql -h 127.0.0.1 -p 55496 -d flacid_review_r2 -Atc "SELECT count(*) AS disposable_schemas FROM pg_namespace WHERE nspname LIKE 'flaccid75_test_%'" > evidence/review-r2/database-schemas-after.txt
```

Restore only the historical evidence files overwritten by this run. Delete only the two new historical-folder screenshots generated by the suite. Retain this round's full evidence. Verify the server PID with `lsof -nP -iTCP:3096 -sTCP:LISTEN` and `ps -p 88416 -o pid=,command=` before stopping it. These commands exit 0:

```sh
git restore --source=HEAD -- evidence/local-followup evidence/review-r1 evidence/my-wellness evidence/v3
rm evidence/my-wellness/stale-timer-webkit.png evidence/my-wellness/water-stanley-webkit.png
kill -TERM 88416
/opt/homebrew/opt/postgresql@14/bin/pg_ctl -D /tmp/flacid-t_6a6739e5-pg stop -m fast > evidence/review-r2/services-stopped.txt 2>&1
```

Only the owned browser session, application server and PostgreSQL cluster are stopped. The synthetic database remains available for independent review. No cleanup helper runs. This wave is committed locally after verification, then pauses for Forge's independent review. No push or deployment follows.

Final evidence validation: `node --import tsx --test tests/evidence-redaction.test.ts > evidence/review-r2/redaction-final.txt 2>&1` passes 3/3. The generated credential scan checks 1,271 files with zero findings. `ports-after.json` confirms neither owned service listens. `git diff --check -- components lib scripts tests evidence/review-r2/WORKLOG.md` exits 0. The local commit command is `git commit -m "Fix meal portion drafts, editor focus, and model text"`; the handoff supplies its hash and final worktree status.
