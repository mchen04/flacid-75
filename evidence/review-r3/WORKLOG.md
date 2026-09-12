# Review round 3

Review source: `/tmp/flacid-review-t_6a6739e5-r3/REVIEW.md`.
Starting commit: `a8464025fdacb3b528c9929a088c45c30a6ada90`.
Original base: `48330f8d5a848b934d3e4f913eeaaafa14d25d0a`.
Same sole owner. Forge supplies independent review after this local commit.

Scope: all four surviving findings. No refuted findings are reopened. No push, PR, merge, deployment, cleanup helper, production mutation, auth change, model/provider configuration change, personal communication read, or delegated implementation. The estimate route change only corrects description length validation. Read the current review, repository README, evidence index, existing acceptance/proof notes, and previous worklogs. User instructions override historical merge/deployment permissions in the README.

## Findings and evidence

| Finding | Reproduction before fixing | Change | Verification |
|---|---|---|---|
| Decimal keystrokes corrupt portion, calories and protein | `browser-before.txt`: all three fields in new and saved meals display `512` after `pressSequentially('12.5')`, in Chromium and WebKit. Empty/select/delete uses key events too. The decimal correction case also fails. | Replace the empty-portion flag with one text draft for the active numeric field. All three controlled values are strings. Finite, nonempty input updates bounded numeric state. Blank/partial input retains the last accepted number; blur restores it. Add decimal input mode to Portion. Keep scaling from the portion at focus. | Six field/mode cases in each engine check the displayed value, item fields, totals, Save and reload. More key events cover a trailing decimal, Backspace correction, blank blur, removal, `0.5`, and saving with blank protein. Actual API/PostgreSQL runs check all three fields after Save and reload. |
| Long manual Description fails as if missing | `text-before.txt`: type 600 rice emoji in manual Description, choose Describe it instead, then Look it up. Actual route returns 400. The 1,000-emoji boundary also returns 400, and 1,001 emoji gets the generic missing-input message. | Count code points using existing `chars` and the shared meal-description limit. Return a specific length error before the other existing input guards. | Both real browsers repeat the manual transition. 600 and 1,000 emoji pass validation and reach the missing-model-key fallback (503). 1,001 emoji gets 400 with a length message. Full-suite API cases cover ASCII/emoji overflow, empty input and invalid image. No model request occurs. |
| Session walkId client validation lacks a regression | New bounds cases reject bad and empty IDs on both client and server, and accept a UUID. The mutation removes only the client clause; the new test fails at runtime. | Add cases to existing bounds tests. No application change is needed. | `walkid-mutation.txt`: baseline passes; removed client validation fails. The mutation uses a scratch copy, never the worktree source. |
| Empty meditation paragraph | Both engines fail the fresh-card assertion: expected zero fine-print paragraphs, received one. | Render the paragraph only for logged minutes or a timer from another day. | Browser verifies no empty paragraph at rest or while running, retains optional/streak text, logged minutes and the prior-day notice. |

The before suite exits 1 with 16/16 failures at the intended assertions on the original compiled app. The fixes are not built until that run exits. `before-*.png` files retain the numeric and meditation states. Existing zero-portion and independent walk completion behavior remains covered by the earlier focused specs. Item values retain decimal precision; meal calorie totals keep their existing whole-kcal rounding. A 12.5 g portion saves item calories 31.3 and protein 1.3, with a 31 kcal meal total.

## Local environment and commands

macOS, Node v26.7.0, PostgreSQL 14, existing locked dependencies. Production build, real loopback HTTP, Chromium and WebKit iPhone 13 profiles. Physical iPhone testing is not performed.

Generate `/tmp/flacid-review-r3.env` exclusively for this run. Python `secrets.token_hex(24)` and `secrets.token_hex(32)` supply test credentials; `os.chmod(path, 0o600)` restricts the file. The URL is `postgresql://127.0.0.1:55496/flacid_review_r3`; browser base is `http://localhost:3096`. Credential values are never written to evidence. Verify `OPENROUTER_API_KEY` is absent and `.env.local` does not exist before the real route check; the output reports only booleans. No production credential file is opened.

```sh
mkdir -p evidence/review-r3
/opt/homebrew/opt/postgresql@14/bin/pg_ctl -D /tmp/flacid-t_6a6739e5-pg -l /tmp/flacid-t_6a6739e5-pg.log -o '-h 127.0.0.1 -p 55496' start
/opt/homebrew/opt/postgresql@14/bin/createdb -h 127.0.0.1 -p 55496 flacid_review_r3
node --env-file=/tmp/flacid-review-r3.env scripts/migrate.mjs
node --env-file=/tmp/flacid-review-r3.env node_modules/next/dist/bin/next start --hostname localhost --port 3096 > evidence/review-r3/server-before.txt 2>&1
```

All setup commands succeed. The pre-fix server uses the prior committed build. After the check builds the fixes, inspect the owned listener PID and stop it with `kill -TERM 9597`. Restart the same server command with output `server-final.txt`. Do not rebuild while browsers use it.

| Exact command | Result |
|---|---|
| `npm run check > evidence/review-r3/check.txt 2>&1` | Exit 0; 72 units, lint, typecheck, scans, production build and budgets. |
| `node scripts/check-walkid-mutation.mjs > evidence/review-r3/walkid-mutation.txt 2>&1` | Exit 0; baseline passes and the missing-client-clause mutant fails. |
| `node --env-file=/tmp/flacid-review-r3.env --import tsx scripts/integration.ts > evidence/review-r3/database.txt 2>&1` | Exit 0; 274 operations in a disposable schema, all assertions true. |
| `npm run lint > evidence/review-r3/lint-final-tests.txt 2>&1 && npm run typecheck > evidence/review-r3/typecheck-final-tests.txt 2>&1` | Exit 0 after adding the API and prior-day browser assertions. |

First build version: `1a0387bdeb50`. Critical gzip JavaScript: 35,817 / 40,960 bytes. Total: 56,817 / 65,536 bytes. The final build after restoring immediate clamping is `9b68ae1cdc53`: critical 35,817 / 40,960, total 56,835 / 65,536. `npm run check > evidence/review-r3/check-final.txt 2>&1` exits 0 with all 72 units and required checks. Stop the earlier owned server with `kill -TERM 12515`, then repeat the server command with output `server-handoff.txt`.

Before browser command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-review-r3.env node_modules/@playwright/test/cli.js test tests/e2e/review-r3.spec.ts --reporter=list 2>&1 | node --env-file=/tmp/flacid-review-r3.env scripts/redact-test-output.mjs > evidence/review-r3/browser-before.txt
```

Exit 1, 16 expected failures. After adding the API and prior-day checks, rerun the same command into `browser-added-checks.txt`: exit 0, 18/18.

Focused regression command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-review-r3.env node_modules/@playwright/test/cli.js test tests/e2e/review-r3.spec.ts tests/e2e/review-r2.spec.ts tests/e2e/review-r1.spec.ts tests/e2e/daily-logs.spec.ts tests/e2e/daily-logs-extra.spec.ts --reporter=list 2>&1 | node --env-file=/tmp/flacid-review-r3.env scripts/redact-test-output.mjs > evidence/review-r3/browser-focused.txt
```

Exit 0, 60/60. This run predates only the added API and prior-day assertions, which separately pass 18/18 on the same application build.

Actual database/browser command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-review-r3.env scripts/review-r3-browser.mjs 2>&1 | node --env-file=/tmp/flacid-review-r3.env scripts/redact-test-output.mjs > evidence/review-r3/browser-real-db.txt
```

Exit 0. Both engines save all three decimal fields using actual keystrokes; SQL verifies each complete meal and its totals after reload. Both also run the real description route checks. No API interception runs in this harness. An earlier `--text-only` invocation into `text-before.txt` exits 1 at the expected 400-versus-503 assertion.

Harness correction: `browser-harness-initial.txt` records a successful first decimal save, then a timeout locating the second seeded meal. Changing only the URL fragment does not reload a page already at Food. Add an explicit reload after each seed, then run again. No application code changes for this issue. The harness closes its owned browser in `finally` on failure. A later attempt to locate the already-ended process finds no process and stops at its assertion; it kills nothing. The successful harness also has a 15-second action timeout.

Full browser command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-review-r3.env node_modules/@playwright/test/cli.js test --reporter=list 2>&1 | node --env-file=/tmp/flacid-review-r3.env scripts/redact-test-output.mjs > evidence/review-r3/browser-full.txt
```

Final full-suite result: exit 0, **247/247 pass** across Chromium and WebKit in 10.2 minutes. No skipped or failed cases. This is the `9b68ae1cdc53` production build.

The first full run is retained as `browser-clamp-before.txt`. It finds two failures and is interrupted with `kill -INT 14063`: exit 130, 204 pass, two fail, one interrupted, 38 not run. The progress-tail updates initially miss the two earlier failures; the later full-log scan finds them and the user is corrected before any success claim or commit.

- Existing B1 input-boundary test: filling item calories with `-40` leaves that draft visible instead of the existing immediate `0` clamp. Numeric state is bounded, but the field display regresses. When a finite input exceeds its bounds, normalize only that draft to the bounded value. In-range decimal text remains untouched. Add a new case for both bounds of every item field, save and reload; retain B1 unchanged.
- Existing WebKit meter test: it reads `.meter-range` before that element exists, producing a null-element exception. The helper waits for the app shell, not the lazy Food view. Add a visible-element wait before the measurement. Preserve every numeric assertion and all application meter code.

After those changes, rerun check, focused cases, real database browsers, the isolated database check, and the full suite. The earlier manual screenshots predate only the clamp correction; final-build decimal evidence comes from the repeated focused cases and real database harness.

Final focused command is the same five-file command above with output `browser-focused-final.txt`: exit 0, **64/64**. Final direct harness output `browser-real-db-final.txt`: exit 0, both engines pass all six decimal save/SQL checks and the text-boundary checks. The integration command into `database-final.txt` also exits 0 with 274 operations. Both initial full-suite failures pass three times per engine with this command (12/12, exit 0):

```sh
set -o pipefail
node --env-file=/tmp/flacid-review-r3.env node_modules/@playwright/test/cli.js test tests/e2e/wellness.spec.ts tests/e2e/review164.spec.ts -g 'B1: ordinary|R164-5:' --repeat-each=3 --reporter=list 2>&1 | node --env-file=/tmp/flacid-review-r3.env scripts/redact-test-output.mjs > evidence/review-r3/browser-boundaries.txt
```

The second full attempt hits the unchanged login throttle after repeated manual/direct/API runs. `browser-rate-limit-before.txt` records 429 instead of the gate test's expected 401; the subsequent onboarding cannot unlock. Stop with `kill -INT 23281`: exit 130, 45 pass, two fail, one interrupted, 199 not run. Reset only the `login` and `estimate` counters in the explicitly named disposable localhost database, then restart the full suite. No authentication code or account state changes. The command records `DELETE 2` in `test-counters-reset.txt`:

```sh
/opt/homebrew/opt/postgresql@14/bin/psql -h 127.0.0.1 -p 55496 -d flacid_review_r3 -c "SELECT current_database(); DELETE FROM flaccid75_rate_limits WHERE key IN ('login','estimate');" > evidence/review-r3/test-counters-reset.txt
```

## Manual browser check

Use only the owned `t_6a6739e5-r3` session. Unlock through a Node subprocess with credential output suppressed. At 320 × 740, open the second synthetic meal, which starts at 100 g, 250 kcal and 10 g protein. The first attempt below does not select all through this CLI: Backspace leaves `10`, then typing appends `12.5`. Opening the screenshot exposes `1012.5`; retain this failed manual attempt as `manual-selection-initial*`. Close it without saving. Reopen, clear with `fill`, verify the field is empty, and use real key events for `12.5`. The new DOM probe and opened image show 12.5 g, 31.3 kcal and 1.3 g protein. Neither manual edit saves; the direct harness supplies persistence proof. The Playwright regressions select and clear with key events and pass in both engines.

```sh
agent-browser --session t_6a6739e5-r3 open http://localhost:3096/#food
agent-browser --session t_6a6739e5-r3 set viewport 320 740
agent-browser --session t_6a6739e5-r3 snapshot
agent-browser --session t_6a6739e5-r3 click @e9
agent-browser --session t_6a6739e5-r3 snapshot
agent-browser --session t_6a6739e5-r3 focus @e26
agent-browser --session t_6a6739e5-r3 press ControlOrMeta+A
agent-browser --session t_6a6739e5-r3 press Backspace
agent-browser --session t_6a6739e5-r3 keyboard type '12.5'
agent-browser --session t_6a6739e5-r3 snapshot > evidence/review-r3/manual-decimal.txt
agent-browser --session t_6a6739e5-r3 eval '(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,focused:document.activeElement?.getAttribute("inputmode")}))()' > evidence/review-r3/manual-fit.json
agent-browser --session t_6a6739e5-r3 errors > evidence/review-r3/manual-errors.txt
```

Refs come from the preceding snapshot. The successful repeat uses:

```sh
agent-browser --session t_6a6739e5-r3 find label 'Portion · g' fill ''
agent-browser --session t_6a6739e5-r3 eval '(() => ({portion:document.activeElement.value}))()' > evidence/review-r3/manual-empty.json
agent-browser --session t_6a6739e5-r3 keyboard type '12.5'
agent-browser --session t_6a6739e5-r3 eval '(() => ({portion:document.activeElement.value,fields:[...document.querySelectorAll(".found input[type=number]")].map(i=>i.value),width:innerWidth,scrollWidth:document.documentElement.scrollWidth}))()' > evidence/review-r3/manual-values.json
agent-browser --session t_6a6739e5-r3 snapshot > evidence/review-r3/manual-decimal.txt
agent-browser --session t_6a6739e5-r3 close
agent-browser session list > evidence/review-r3/browser-sessions-after.txt
```

Screenshot capture uses an external 30-second timeout. Opened the original Chromium decimal failure, both focused decimal screenshots, and both manual screenshots. The successful manual probe reports width and scroll width 320. Error output is empty. Close the owned session and confirm it is absent; leave other sessions alone. Initial direct-harness screenshots clip the numeric fields, so change only their capture to the editor element and repeat the direct harness. SQL and input assertions already pass independently of these images.

The repeated direct harness exits 0. Opened both final `direct-*-320.png` editor captures: each shows 12.5 g, 31.3 kcal, 1.3 g protein, and the Save button. `browser-real-db-initial.txt` retains the preceding passing run. `npm run lint > evidence/review-r3/lint-handoff.txt 2>&1` exits 0 after the capture-only change. `node --import tsx --test tests/evidence-redaction.test.ts > evidence/review-r3/redaction.txt 2>&1` passes 3/3, including its deliberately unredacted controls.

## Credential scan

The byte scan reads only generated test credentials and emits paths/counts. It includes compressed evidence and the generated browser assets. Plain and gzip controls must be detected before scanning:

```sh
node --env-file=/tmp/flacid-review-r3.env --input-type=module > evidence/review-r3/generated-credential-scan.txt <<'JS'
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const values=[process.env.APP_PASSPHRASE,process.env.SESSION_SECRET].map(v=>{assert.ok(v&&v.length>20);return Buffer.from(v);});
function exposed(bytes){const decoded=bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes;return values.some(v=>decoded.includes(v));}
for(const value of values){assert.ok(exposed(value));assert.ok(exposed(gzipSync(value)));}
const findings=[];let files=0;
function scan(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())scan(path);else if(entry.isFile()){files++;if(exposed(readFileSync(path)))findings.push(path);}}}
for(const dir of ['evidence','scripts','tests','public'])scan(dir);
console.log(JSON.stringify({files,plainAndCompressedNegativeControls:true,findings}));
assert.deepEqual(findings,[]);
JS
```

Source and worklog whitespace check: `git diff --check -- app components scripts tests evidence/review-r3/WORKLOG.md` exits 0. Raw command logs retain their formatting except credential redaction.

## Handoff

All four findings are fixed and verified. Final checks pass: 72 units, lint, typecheck, scans, build and budgets; 64 focused browser cases; 12 repeated boundary/meter cases; 247 full browser cases; both real API/PostgreSQL browser runs; 274 isolated database operations. The client walk-ID mutation fails as intended. No physical-device or real-model success claim is made.

Read-only schema check returns `0`, captured in `database-schemas-after.txt`:

```sh
/opt/homebrew/opt/postgresql@14/bin/psql -h 127.0.0.1 -p 55496 -d flacid_review_r3 -Atc "SELECT count(*) FROM pg_namespace WHERE nspname LIKE 'flaccid75_test_%'" > evidence/review-r3/database-schemas-after.txt
```

Inspect the generated historical-file diff, then restore only those PNG/JSON artifacts. Delete only the two untracked historical-folder screenshots made by this run. This round's evidence remains. Exact restoration:

```python
from pathlib import Path
import subprocess
paths=subprocess.check_output(['git','diff','--name-only','-z','--','evidence/local-followup','evidence/review-r1','evidence/review-r2','evidence/my-wellness','evidence/v3']).decode().split('\0')
paths=[p for p in paths if p]
assert all(Path(p).suffix in ('.png','.json') for p in paths)
if paths:subprocess.run(['git','restore','--source=HEAD','--',*paths],check=True)
for name in ['stale-timer-webkit.png','water-stanley-webkit.png']:(Path('evidence/my-wellness')/name).unlink()
```

Verify `ps -p 21761 -o pid=,command=` identifies the owned Next server. Stop only that server and the owned PostgreSQL cluster:

```sh
kill -TERM 21761
/opt/homebrew/opt/postgresql@14/bin/pg_ctl -D /tmp/flacid-t_6a6739e5-pg stop -m fast > evidence/review-r3/services-stopped.txt 2>&1
```

Both commands succeed. `ports-after.json` confirms no listener on 3096 or 55496. The synthetic database is retained for review. The owned manual browser session is closed; other sessions remain untouched. No cleanup helper, push or deployment runs. Commit locally after the final evidence scan, then pause for Forge's independent review.

Final generated-credential scan: exit 0, 1,349 files, no findings, plain/gzip detection controls pass. Final redaction test command is `node --import tsx --test tests/evidence-redaction.test.ts > evidence/review-r3/redaction-final.txt 2>&1`; 3/3 pass. The source/worklog whitespace check passes. Local commit command: `git commit -m "Fix decimal meal entry and remaining review findings"`. The session handoff supplies its hash and final worktree status.
