# Repair return four

Review: `/tmp/flacid-review-t_6a6739e5-r4/REVIEW.md`.
Starting commit: `9c2e83e6ccf6e8fc2784ab7fcd7bfd7d72287ed8`.
Original base: `48330f8d5a848b934d3e4f913eeaaafa14d25d0a`.
Same sole implementation owner. Forge independently reviews after the local commit.

Scope is the four surviving findings, with per-item fieldset/legend as requested. Earlier repository instructions, README, proof/test documents and worklogs remain applicable. No refuted findings are reopened. No cleanup helper, push, PR, merge, deployment, production mutation, auth/model/provider change, personal communication read, or delegated implementation.

## Findings and proof

| Finding | Before | Fix | Verification |
|---|---|---|---|
| Description shows text that Save drops | New browser cases fill 1,000 ASCII characters or emoji, then type `HELLO`. Both new manual meals and saved itemized meals show the extra text. | The shared description handler clips by code point and also writes the clipped value to the textarea when needed. Thus the DOM stays correct even when Preact skips an unchanged state update. | Browser cases check the field immediately, Backspace/replacement, Save and reload. Real API/SQL checks compare the complete saved description with the visible value in both manual and itemized paths. |
| Older total correction returns after cancelling item edits | Items contain 200 + 300 kcal, total corrected to 450. Editing them to 250 + 250 returns the displayed total to 450. Protein has the same failure. | Every finite item-number edit sets `itemsChanged`, including calories and protein. Blank drafts and description-only edits leave old corrections intact. | Separate calorie/protein cases expect 500 kcal and 20 g after cancelling edits, then Save and reload. An unchanged-number case preserves 450/18. Real database harness creates an actual numbers-only legacy correction, then verifies both stages through SQL. |
| Stable walk replay test misses overwrite | The old test repeats the same seconds. | Repeat the same walk ID with a fresh operation ID and different seconds in both unit and integration checks. No domain behavior changes. | Unit expects the first 600 seconds and the 900-second total including the legacy walk. SQL expects 600/1,200 entries and a 1,800-second total after an attempted 1,800-second overwrite. A scratch mutation replacing `??=` with `=` fails the unit at runtime. |
| Repeated item labels lack item context | New group assertions cannot find named item groups. | Wrap each item in a native fieldset and visible legend: `Item N: name`. Use `Unnamed item` for an empty name. Move the existing two-column layout inside each fieldset. Legends wrap long names. | Both engines find each native fieldset by accessible group name and find its four fields within it. Rename, removal, renumbering, decimal keystrokes and reload preserve grouping. DOM and screenshots verify 320 px fit. A manual accessibility snapshot exposes both groups. |

The description fix intentionally preserves the existing 1,000-code-point limit, including 1,000 emoji. Adding an HTML `maxLength=1000` to these Description fields would instead impose a UTF-16-unit limit and cut that capacity in half. The direct DOM correction prevents hidden truncation without changing accepted data. The existing describe box retains its native maximum and uses the same handler.

## Environment and setup

macOS, Node v26.7.0, PostgreSQL 14, existing locked dependencies, production build. Browser engines use the repository's Chromium/WebKit iPhone 13 profiles. No physical iPhone, VoiceOver, or other physical screen-reader test is claimed. Accessibility evidence is native HTML grouping, browser accessibility state, and keyboard behavior.

Setup collision: `/tmp/flacid-review-r4.env` already exists. Exclusive file creation refuses to overwrite it, but the initial shell proceeds to a migration attempt with that existing file. Migration fails with connection details suppressed. The audit in `setup-collision.txt` confirms that its target is loopback; no production endpoint is used. Stop the owned preliminary browser and server (`kill -INT 47769`, `kill -TERM 47765`). Leave the existing environment file unchanged. `browser-setup-initial.txt` records one expected description failure and 15 unrun cases; it is not the final reproduction run.

Create a new exclusive file, `/tmp/flacid-implementation-t_6a6739e5-r4.env`, using Python `secrets.token_hex(24)` and `secrets.token_hex(32)` and mode `0600`. It points only to `postgresql://127.0.0.1:55496/flacid_review_r4` and `http://localhost:3096`. No credential values are copied to evidence. All subsequent commands use this file.

```sh
mkdir -p evidence/review-r4
/opt/homebrew/opt/postgresql@14/bin/pg_ctl -D /tmp/flacid-t_6a6739e5-pg -l /tmp/flacid-t_6a6739e5-pg.log -o '-h 127.0.0.1 -p 55496' start
/opt/homebrew/opt/postgresql@14/bin/createdb -h 127.0.0.1 -p 55496 flacid_review_r4
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r4.env scripts/migrate.mjs
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r4.env node_modules/next/dist/bin/next start --hostname localhost --port 3096 > evidence/review-r4/server-before.txt 2>&1
```

The cluster and database creation succeed. Migration through the new environment file applies `001_initial.sql` and reports current. The reproduction server uses the prior committed build. After building the fixes, verify the owned listener, stop it with `kill -TERM 48164`, then repeat the server command with output `server-final.txt`.

## Commands and results

Before browser command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r4.env node_modules/@playwright/test/cli.js test tests/e2e/review-r4.spec.ts --reporter=list 2>&1 | node --env-file=/tmp/flacid-implementation-t_6a6739e5-r4.env scripts/redact-test-output.mjs > evidence/review-r4/browser-before.txt
```

Exit 1: 14 expected failures and two passing unchanged-number cases. This run completes before the application fix is built. `before-*.png` files retain representative states.

| Command | Result |
|---|---|
| `node scripts/check-walk-replay-mutation.mjs > evidence/review-r4/walk-replay-mutation.txt 2>&1` | Exit 0. Baseline runtime test passes; overwriting the first walk value fails. Scratch files are removed by the test's own `finally`, with no worktree mutation. |
| `node --env-file=/tmp/flacid-implementation-t_6a6739e5-r4.env --import tsx scripts/integration.ts > evidence/review-r4/database.txt 2>&1` | Exit 0. 274 operations, all assertions pass, including different-seconds replay. Disposable schema removed. |
| `npm run check > evidence/review-r4/check.txt 2>&1` | Exit 0. 72 units, lint, typecheck, scans, build and budgets pass. |
| `npm run lint > evidence/review-r4/lint-final-tests.txt 2>&1 && npm run typecheck > evidence/review-r4/typecheck-final-tests.txt 2>&1` | Exit 0 after the real database/browser harness is added. |

Build version: `911326d1383f`. Critical gzip JavaScript: 35,818 / 40,960 bytes. Total: 56,895 / 65,536 bytes. No application changes occur after this build during browser verification.

Focused browser command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r4.env node_modules/@playwright/test/cli.js test tests/e2e/review-r4.spec.ts tests/e2e/review-r3.spec.ts tests/e2e/review-r2.spec.ts tests/e2e/review-r1.spec.ts tests/e2e/daily-logs.spec.ts tests/e2e/daily-logs-extra.spec.ts --reporter=list 2>&1 | node --env-file=/tmp/flacid-implementation-t_6a6739e5-r4.env scripts/redact-test-output.mjs > evidence/review-r4/browser-focused.txt
```

Exit 0: **80/80** across both engines. Earlier decimal typing, bounds, zero handling, removal, independent completion, timer recovery and persistence regressions remain unchanged and pass.

Real database/browser command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r4.env scripts/review-r4-browser.mjs 2>&1 | node --env-file=/tmp/flacid-implementation-t_6a6739e5-r4.env scripts/redact-test-output.mjs > evidence/review-r4/browser-real-db.txt
```

Exit 0, both engines. The harness asserts loopback URLs and the exact disposable database before any write. No API mocks run. It checks actual walk replay, legacy total correction, description limits, manual creation, item edits, grouping, Save/reload and SQL records. No model request occurs.

Full browser command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r4.env node_modules/@playwright/test/cli.js test --reporter=list 2>&1 | node --env-file=/tmp/flacid-implementation-t_6a6739e5-r4.env scripts/redact-test-output.mjs > evidence/review-r4/browser-full.txt
```

Exit 0: **263/263** pass in 10.5 minutes, with no failures, skips or retries. Both engines run against the same final production build.

## Manual structure and images

Use only `t_6a6739e5-r4-impl`. Unlock through a subprocess with credential output suppressed. Set 320 × 740. A first immediate click leaves the page in its list state; inspect it, take a fresh snapshot, focus the current Edit ref and press Enter. Verify the resulting editor rather than treating the click response as success.

```sh
agent-browser --session t_6a6739e5-r4-impl open http://localhost:3096/#food
agent-browser --session t_6a6739e5-r4-impl set viewport 320 740
agent-browser --session t_6a6739e5-r4-impl snapshot
agent-browser --session t_6a6739e5-r4-impl focus @e7
agent-browser --session t_6a6739e5-r4-impl press Enter
agent-browser --session t_6a6739e5-r4-impl snapshot > evidence/review-r4/manual-fieldsets.txt
agent-browser --session t_6a6739e5-r4-impl eval '(() => ({groups:[...document.querySelectorAll(".items fieldset")].map(f=>({legend:f.querySelector("legend").textContent,fields:[...f.querySelectorAll("label")].map(l=>l.textContent),width:f.clientWidth,scrollWidth:f.scrollWidth})),width:innerWidth,scrollWidth:document.documentElement.scrollWidth}))()' > evidence/review-r4/manual-groups.json
agent-browser --session t_6a6739e5-r4-impl press Tab
agent-browser --session t_6a6739e5-r4-impl eval '(() => ({label:document.activeElement.closest("label")?.textContent,group:document.activeElement.closest("fieldset")?.querySelector("legend")?.textContent}))()' > evidence/review-r4/manual-keyboard.json
agent-browser --session t_6a6739e5-r4-impl errors > evidence/review-r4/manual-errors.txt
agent-browser --session t_6a6739e5-r4-impl close
agent-browser session list > evidence/review-r4/browser-sessions-after.txt
```

The snapshot exposes `Item 1: Rice` and `Item 2: Soup` as groups, with Item name, Portion, Calories and Protein inside each. Each fieldset reports equal width/scroll width (225); the document reports 320/320. No manual edit is saved. Opened and inspected both long-name `fieldset-*-320.png` captures, `direct-chromium-calories-320.png`, and `direct-webkit-protein-320.png`. Long legends wrap and both numeric columns stay inside the fieldsets.

## Final evidence checks

The byte scan below detects both generated credentials in plain and gzip-compressed controls before scanning the evidence. It reports paths only, never credential values.

```sh
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r4.env --input-type=module > evidence/review-r4/generated-credential-scan.txt <<'JS'
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

After the full suite, restore only historical captures generated by that run:

```sh
python3 - <<'PYRESTORE'
import subprocess
from pathlib import Path
prefixes=('evidence/local-followup/','evidence/review-r1/','evidence/review-r2/','evidence/review-r3/','evidence/my-wellness/','evidence/v3/')
paths=[p for p in subprocess.check_output(['git','diff','--name-only'],text=True).splitlines() if p.startswith(prefixes)]
assert all(Path(p).suffix in ('.png','.json') for p in paths),paths
Path('evidence/review-r4/restored-generated-files.txt').write_text('\n'.join(paths)+'\n')
if paths:subprocess.run(['git','restore','--source=HEAD','--',*paths],check=True)
for name in ('stale-timer-webkit.png','water-stanley-webkit.png'):
 p=Path('evidence/my-wellness')/name
 if p.exists() and subprocess.run(['git','ls-files','--error-unmatch',str(p)],capture_output=True).returncode:
  p.unlink()
print(f'Restored {len(paths)} generated historical captures; retained new repair evidence.')
PYRESTORE
/opt/homebrew/opt/postgresql@14/bin/psql -h 127.0.0.1 -p 55496 -d flacid_review_r4 -Atc "SELECT count(*) FROM pg_namespace WHERE nspname LIKE 'flaccid75_test_%'" > evidence/review-r4/database-schemas-after.txt
lsof -nP -iTCP:3096 -sTCP:LISTEN
ps -p 50502 -o pid=,ppid=,command=
kill -TERM 50502
/opt/homebrew/opt/postgresql@14/bin/pg_ctl -D /tmp/flacid-t_6a6739e5-pg stop -m fast > evidence/review-r4/services-stopped.txt 2>&1
python3 - <<'PYPORTS'
import json,subprocess
from pathlib import Path
result={str(port):subprocess.run(['lsof','-nP',f'-iTCP:{port}','-sTCP:LISTEN'],capture_output=True).returncode==1 for port in (3096,55496)}
Path('evidence/review-r4/ports-after.json').write_text(json.dumps(result)+'\n')
assert all(result.values()),result
print(result)
PYPORTS
node --import tsx --test tests/evidence-redaction.test.ts > evidence/review-r4/redaction.txt 2>&1
```

These commands exit 0. Restore 33 generated historical captures. The temporary integration-schema count is zero. Verify the owned Next listener before stopping it; both owned ports are closed afterward. The database and environment file remain available for independent review. No cleanup helper runs.

The final redaction regression passes 3/3. Rerun the byte scan above after writing this worklog and all final logs: exit 0, no findings. Both plain and compressed leak controls are detected.

## Handoff

Local commit command:

```sh
git add app/globals.css components/Food.tsx public/sw.js scripts/integration.ts scripts/check-walk-replay-mutation.mjs scripts/review-r4-browser.mjs tests/daily-logs.test.ts tests/evidence-redaction.test.ts tests/e2e/review-r4.spec.ts evidence/review-r4
git diff --cached --check -- app/globals.css components/Food.tsx public/sw.js scripts tests evidence/review-r4/WORKLOG.md
git commit -m "Fix meal editor limits, totals and item grouping"
git rev-parse HEAD
git status --short
```

The commit identifier is returned in the session handoff because this file belongs to that commit. All four findings are fixed. Check passes 72 units plus lint, typecheck, scans, build and budgets; the isolated database passes 274 operations; focused browsers pass 80/80; full browsers pass 263/263. The walk overwrite mutation fails as required. Physical iPhone and physical screen-reader behavior remain untested. Pause for Forge's independent review. No cleanup helper or deployment follows.
