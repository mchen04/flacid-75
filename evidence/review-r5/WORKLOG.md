# Repair return five

Review source: `/tmp/flacid-review-t_6a6739e5-r5/REVIEW.md`.
Starting commit: `d173fe8644807cd31706a8486a3e22351352de8c`.
Original base: `48330f8d5a848b934d3e4f913eeaaafa14d25d0a`.
Same sole implementation owner. Forge performs the independent review after this local commit.

Scope: the ten surviving findings. Keep earlier data compatibility, independent completion, meal detail, timer and optional/streak requirements. Do not reopen refuted findings. No delegated implementation, personal communication read, Kanban edit, push, PR, merge, deployment, production mutation, auth/model/provider change, or cleanup helper. Read the review, repository README, existing evidence index and acceptance/test instructions. Earlier worklogs remain applicable. The address-review, fix-bug and agent-browser instructions guide the work; the user's local-only scope overrides historical publication instructions in repository documents.

## Findings and proof

| # | Before | Change | Evidence |
|---|---|---|---|
| 1 | Middle insertion into 1,000 characters keeps the new character and loses the final Z. | Refuse over-limit `beforeinput` and paste using the selected text's code-point length. Keep the existing normalization fallback. Normal insertion and undo use the browser's edit history. | Four R5 cases cover new manual/saved item meals × ASCII/emoji, actual Q keystrokes, unchanged caret/tail, simulated clipboard paste refusal, selection replacement, undo, Save/reload. Actual API/SQL harness preserves all 1,000 code points. |
| 2 | Enter and double-click remove the following item because an index-keyed row reuses its button. | Use stable editor-only IDs; focus the next name field, previous name field at the end, or the sum when empty. Ignore a repeated pointer click within 600 ms and 8 px of the last removal. | R5 keyboard/double-click/double-tap cases retain the same Soup fieldset node, remove one item, save/reload the remaining items, and focus the sum after the last removal. IDs never enter the saved record. Actual API/SQL verifies the exact remaining items. |
| 3 | Correcting a zero-start portion's calories and protein leaves its warning. Not this also leaves it. | Track the warning separately from save/validation errors by stable item ID. Clear it on that item's valid correction, its removal, a new estimate, or Not this. | R5 zero case checks that another item's edit does not clear the warning, the affected item's correction does, and Not this clears it. R1 zero regression gains an alert-removal assertion. Real SQL verifies 750 kcal / 37.5 g after correction. |
| 4 | Removing a walk leaves focus on BODY. | Focus the next Remove button, the previous one at the end, or Walk minutes when empty. Move only after an accepted change. | R5 three-walk case uses Enter and pointer clicks, checks focus, reload, order, total and independent completion. Real API/SQL harness checks the same path. |
| 5 | Blank item names produce `Remove item 1:`. | Use the same Unnamed item fallback as the legend. | Each R5 removal variant blanks the retained name and locates `Remove item 1: Unnamed item`. |
| 6 | Visible completion text is not linked to its checkbox and cannot activate it. | Give the checkbox an ID and the text a span ID. Use a native associated label for pointer activation and `aria-labelledby` for the name. | R5 Walk/Workout/Abs/Floss cases click the visible text both ways, use Space/Enter, save/reload, and check 320 px width. The manual snapshot and DOM check verify the label/control link and visible checkbox state. |
| 7 | A completed Floss stage contains an empty subtitle span. | Render the subtitle only when incomplete. | R5 DOM assertion, real browser harness and opened Chromium/WebKit stage captures. |
| 8 | Four obsolete code paths remain after earlier copy removal. | Remove the unused small selector, optional tag selector, undo icon, and lastMeal state/context/write. Remove the adjacent obsolete Undo comment. | `dead-code-scan.json`, lint/typecheck/build and full browser coverage. Keep the live `.row-action.is-done` rule. |
| 9 | Random IDs let an accidental sort after walk removal escape tests. | Add a three-fixed-ID unit case that removes the middle entry. Give the integration case fixed reverse-lexical retained IDs. | `walk-order-mutation.txt`: baseline passes, changing removal to sorted IDs fails. Integration retains 274 operations and deterministically checks order. R5 browser and real SQL harness leave two walks after removal. |
| 10 | The untick assertion checks only visibility. | Require `checked:false` in the existing Floss spec. | `floss-toggle-mutation.txt`: a scratch build of the real CompletionToggle stuck at aria-checked=true still passes the old visibility assertion and fails the new assertion in both engines, while internal state is false. |

## Reproduction and intermediate findings

The initial production server uses the previous committed build. The new R5 browser file runs before rebuilding any application changes: **26 expected failures**, exit 1, in `browser-before.txt`. Representative middle-description and walk-focus screenshots remain as `before-*.png`.

The first implementation fails lint because stable render IDs are read from refs. Move render IDs into state; keep a live ID ref only for event-time duplicate removal checks. `lint-second.txt` and `typecheck-second.txt` pass. No suppression is added.

The first rebuilt application passes 21 of 26 R5 cases. `browser-after-first.txt` records the five failures: two double-click removals and three WebKit undo assertions. Stable keys and focus alone do not stop a second physical click landing on a shifted button, so add the narrow pointer-location/time guard. Keyboard activation bypasses this guard.

The undo issue also reproduces in a plain native textarea, with no application code. WebKit combines Playwright's fill and the later replacement into one undo group. Blur/refocus and arrow keys do not separate that group (`native-undo-probe.txt`, `native-undo-keystrokes.txt`). Exact commands are in [native-undo-commands.md](native-undo-commands.md). A textarea initialized with saved text restores the full value on undo in both engines (`native-undo-reopened.txt`). The regression therefore saves and reopens before testing replacement/undo. It still checks the original middle-insertion refusal in each new/manual and saved form before that reload. This changes test setup, not application undo behavior.

The final production build is **90b9350d817e**. Critical gzip JavaScript is **35,865 / 40,960 bytes**; total is **57,661 / 65,536 bytes**. No application source or build files change while the final browser suites run.

## Environment and commands

macOS, Node v26.7.0, PostgreSQL 14, existing locked dependencies. Browser suites use the repository's Chromium and WebKit iPhone 13 profiles. The real SQL harness uses desktop engines at 320 × 740. No physical iPhone or real screen reader is tested.

Create `/tmp/flacid-implementation-t_6a6739e5-r5.env` exclusively with `os.open(..., O_CREAT|O_EXCL|O_WRONLY, 0o600)`. Generate the passphrase with `secrets.token_hex(24)` and session secret with `secrets.token_hex(32)`. The file holds only those generated values, `DATABASE_URL=postgresql://127.0.0.1:55496/flacid_review_r5`, and `TEST_BASE_URL=http://localhost:3096`. No model key is supplied. Never print the generated values.

```sh
mkdir -p evidence/review-r5
python3 - <<'PYENV'
import os,secrets
p='/tmp/flacid-implementation-t_6a6739e5-r5.env'
fd=os.open(p,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
with os.fdopen(fd,'w') as f:
 f.write('DATABASE_URL=postgresql://127.0.0.1:55496/flacid_review_r5\nTEST_BASE_URL=http://localhost:3096\nAPP_PASSPHRASE='+secrets.token_hex(24)+'\nSESSION_SECRET='+secrets.token_hex(32)+'\n')
print('Created exclusive local test environment; credential values suppressed.')
PYENV
/opt/homebrew/opt/postgresql@14/bin/pg_ctl -D /tmp/flacid-t_6a6739e5-pg -l /tmp/flacid-t_6a6739e5-pg.log -o '-h 127.0.0.1 -p 55496' start
/opt/homebrew/opt/postgresql@14/bin/createdb -h 127.0.0.1 -p 55496 flacid_review_r5
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env scripts/migrate.mjs
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env node_modules/next/dist/bin/next start --hostname localhost --port 3096 > evidence/review-r5/server-before.txt 2>&1
```

All setup commands succeed. Migration applies `001_initial.sql` and reports current. Verify and stop the first owned server with `kill -TERM 7468` before rebuilding. After the first check, start the same command with `server-after-first.txt`. Verify and stop that listener with `kill -TERM 11376` before the final check. Start the final server with the same command and output `server-final.txt`.

Each browser pipeline enables `set -o pipefail`. Every tool exit is checked. `scripts/redact-test-output.mjs` receives the same generated environment and removes credential values from failure snapshots before writing evidence.

```sh
set -o pipefail
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env node_modules/@playwright/test/cli.js test tests/e2e/review-r5.spec.ts --reporter=list 2>&1 | node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env scripts/redact-test-output.mjs > evidence/review-r5/browser-before.txt
```

Run the same command against the first rebuilt app with output `browser-after-first.txt`. Results are above.

| Exact command | Result |
|---|---|
| `node scripts/check-walk-order-mutation.mjs > evidence/review-r5/walk-order-mutation.txt 2>&1` | Exit 0. Baseline exits 0; sorted-order mutant exits 1. |
| `node scripts/check-floss-toggle-mutation.mjs > evidence/review-r5/floss-toggle-mutation.txt 2>&1` | Exit 0. Both engines pass baseline; both reject stuck-checked output. Only scratch source copies are changed and removed by the script's finally block. |
| `node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env --import tsx scripts/integration.ts > evidence/review-r5/database.txt 2>&1` | Exit 0. 274 operations, all flags true, disposable schema removed. |
| `npm run lint > evidence/review-r5/lint-first.txt 2>&1 && npm run typecheck > evidence/review-r5/typecheck-first.txt 2>&1` | Exit 1 at lint: two render-ref errors and one dependency warning. Typecheck does not run. |
| `npm run lint > evidence/review-r5/lint-second.txt 2>&1 && npm run typecheck > evidence/review-r5/typecheck-second.txt 2>&1` | Exit 0 after moving render IDs into state and narrowing effect dependencies. |
| `npm run check > evidence/review-r5/check-first.txt 2>&1` | Exit 0 for the first implementation. Superseded by the final check. |
| `npm run check > evidence/review-r5/check.txt 2>&1` | Exit 0. 73 units, lint, typecheck, scans, production build and budgets pass. |
| `npm run lint > evidence/review-r5/lint-final-tests.txt 2>&1 && npm run typecheck > evidence/review-r5/typecheck-final-tests.txt 2>&1` | Exit 0 after the added test harnesses; repeat after the final mutation assertion. |

Focused browser command:

```sh
set -o pipefail
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env node_modules/@playwright/test/cli.js test tests/e2e/review-r5.spec.ts tests/e2e/review-r4.spec.ts tests/e2e/review-r3.spec.ts tests/e2e/review-r2.spec.ts tests/e2e/review-r1.spec.ts tests/e2e/daily-logs.spec.ts tests/e2e/daily-logs-extra.spec.ts --reporter=list 2>&1 | node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env scripts/redact-test-output.mjs > evidence/review-r5/browser-focused.txt
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env node_modules/@playwright/test/cli.js test tests/e2e/review-r5.spec.ts --grep 'double tap' --reporter=list 2>&1 | node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env scripts/redact-test-output.mjs > evidence/review-r5/browser-touch.txt
```

Both exit 0: **106/106 focused**, then **2/2 added touch cases**. Earlier decimal typing, zero handling, item removal, independent completion, timer recovery, bounds and reload regressions pass.

```sh
set -o pipefail
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env scripts/review-r5-browser.mjs 2>&1 | node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env scripts/redact-test-output.mjs > evidence/review-r5/browser-real-db.txt
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env node_modules/@playwright/test/cli.js test --reporter=list 2>&1 | node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env scripts/redact-test-output.mjs > evidence/review-r5/browser-full.txt
```

Real browser/SQL harness exits 0 in both engines. It asserts the loopback host and exact disposable database before writes, logs in through the real gate, uses actual API operations, and checks SQL records. No mocked endpoint or model request occurs. Full suite exits 0: **291/291** pass in 10.5 minutes, with no failures, skips or retries. All tests use the final production build.

## Manual check and images

Inspect the existing browser sessions and create only `t_6a6739e5-r5-impl`. Authenticate using `execFileSync` with `stdio:'ignore'`; the passphrase argument comes from the generated environment. Catch errors and report only a fixed failure message. Do not print command arguments on failure.

```sh
agent-browser --session t_6a6739e5-r5-impl open http://localhost:3096/#floss
agent-browser --session t_6a6739e5-r5-impl snapshot
agent-browser --session t_6a6739e5-r5-impl set viewport 320 740
agent-browser --session t_6a6739e5-r5-impl snapshot > evidence/review-r5/manual-floss.txt
agent-browser --session t_6a6739e5-r5-impl click @e6
agent-browser --session t_6a6739e5-r5-impl snapshot > evidence/review-r5/manual-floss-unchecked.txt
agent-browser --session t_6a6739e5-r5-impl eval '(() => {const row=document.querySelector(".completion-row"),button=row.querySelector("button"),label=row.querySelector("label");return {checked:button.getAttribute("aria-checked"),textLabelsButton:label.htmlFor===button.id,nameFromVisibleText:button.getAttribute("aria-labelledby")===label.querySelector("span").id,width:innerWidth,scrollWidth:document.documentElement.scrollWidth};})()' > evidence/review-r5/manual-label-link.json
agent-browser --session t_6a6739e5-r5-impl errors > evidence/review-r5/manual-errors.txt
agent-browser --session t_6a6739e5-r5-impl close
agent-browser session list > evidence/review-r5/browser-sessions-after.txt
```

The text click changes Floss from checked to unchecked. Both label links are true; document width and scroll width are 320. The browser errors output is empty. The immediate session list briefly includes the closing session; a second list confirms it is gone. Leave other sessions alone.

Opened all four final captures: `items-chromium-320.png`, `items-webkit-320.png`, `floss-chromium-320.png`, `floss-webkit-320.png`. They show two retained, named item fieldsets fitting the narrow width and the completed Floss stage without an empty subtitle line.

## Evidence checks

The redaction regression uses deliberate unredacted examples. The byte scan additionally checks the exact generated credentials, including gzip evidence, and reports paths only.

```sh
node --import tsx --test tests/evidence-redaction.test.ts > evidence/review-r5/redaction.txt 2>&1
node --env-file=/tmp/flacid-implementation-t_6a6739e5-r5.env --input-type=module > evidence/review-r5/generated-credential-scan.txt <<'JS'
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

Both exit 0. Redaction passes 3/3; the byte scan finds no generated credential. Repeat both after the final evidence is written.

The scoped dead-code check also exits 0:

```sh
python3 - <<'PYSCAN'
from pathlib import Path
import json,re
checks={
 'deadSmallSelector':('app/globals.css',r'\.row-action\.is-done small'),
 'optionalTag':('app/globals.css',r'\.optional-tag'),
 'undoIcon':('components/Icon.tsx',r'\bundo\s*:'),
}
results={name:bool(re.search(pattern,Path(file).read_text())) for name,(file,pattern) in checks.items()}
results['lastMeal']=any('lastMeal' in p.read_text() or 'setLastMeal' in p.read_text() for p in Path('components').glob('*.tsx'))
Path('evidence/review-r5/dead-code-scan.json').write_text(json.dumps(results)+'\n')
assert not any(results.values()),results
print(results)
PYSCAN
```

## Final service and evidence state

After the full suite, restore only the historical screenshots and JSON captures generated by this run:

```sh
python3 - <<'PYRESTORE'
import subprocess
from pathlib import Path
prefixes=('evidence/local-followup/','evidence/review-r1/','evidence/review-r2/','evidence/review-r3/','evidence/review-r4/','evidence/my-wellness/','evidence/v3/')
paths=[p for p in subprocess.check_output(['git','diff','--name-only'],text=True).splitlines() if p.startswith(prefixes)]
assert all(Path(p).suffix in ('.png','.json') for p in paths),paths
Path('evidence/review-r5/restored-generated-files.txt').write_text('\n'.join(paths)+'\n')
if paths:subprocess.run(['git','restore','--source=HEAD','--',*paths],check=True)
for name in ('stale-timer-webkit.png','water-stanley-webkit.png'):
 p=Path('evidence/my-wellness')/name
 if p.exists() and subprocess.run(['git','ls-files','--error-unmatch',str(p)],capture_output=True).returncode:p.unlink()
print(f'Restored {len(paths)} generated historical captures; retained new repair evidence.')
PYRESTORE
/opt/homebrew/opt/postgresql@14/bin/psql -h 127.0.0.1 -p 55496 -d flacid_review_r5 -Atc "SELECT count(*) FROM pg_namespace WHERE nspname LIKE 'flaccid75_test_%'" > evidence/review-r5/database-schemas-after.txt
lsof -nP -iTCP:3096 -sTCP:LISTEN
ps -p 13705 -o pid=,ppid=,command=
kill -TERM 13705
/opt/homebrew/opt/postgresql@14/bin/pg_ctl -D /tmp/flacid-t_6a6739e5-pg stop -m fast > evidence/review-r5/services-stopped.txt 2>&1
python3 - <<'PYPORTS'
import json,subprocess
from pathlib import Path
result={str(port):subprocess.run(['lsof','-nP',f'-iTCP:{port}','-sTCP:LISTEN'],capture_output=True).returncode==1 for port in (3096,55496)}
Path('evidence/review-r5/ports-after.json').write_text(json.dumps(result)+'\n')
assert all(result.values()),result
print(result)
PYPORTS
```

All commands exit 0. Restore 33 generated historical captures. The integration schema count is zero. Verify the owned Next listener before stopping it; both owned ports are closed afterward. Keep the database and generated environment file for independent review. No cleanup helper runs.

Repeat the redaction test and byte scan above after these logs and this worklog are written: exit 0, 3/3 redaction tests, no generated credential findings, and successful plain/compressed leak controls.

## Limits and handoff

All ten findings are fixed and locally verified. No physical iPhone, real screen reader, voice control or IME composition test is claimed. Paste is a simulated clipboard event; typing, undo, keyboard navigation, double-clicks and touch taps use browser input APIs. Non-cancellable IME/drop paths retain the existing clipping fallback and are not claimed newly verified. The label relationship is verified through native HTML and accessibility state; no spoken browse-mode behavior is claimed.

Local commit commands:

```sh
git add app/globals.css components/Activities.tsx components/App.tsx components/Food.tsx components/Icon.tsx components/shared.tsx public/sw.js scripts/integration.ts scripts/check-floss-toggle-mutation.mjs scripts/check-walk-order-mutation.mjs scripts/review-r5-browser.mjs tests/daily-logs.test.ts tests/e2e/review-r1.spec.ts tests/e2e/review-r5.spec.ts tests/e2e/wellness.spec.ts tests/evidence-redaction.test.ts evidence/review-r5
git diff --cached --check -- app components scripts tests public/sw.js evidence/review-r5/WORKLOG.md evidence/review-r5/native-undo-commands.md
git commit -m "Fix input limits, removal focus and completion labels"
git rev-parse HEAD
git status --short
```

The commit ID is returned in the session because this worklog belongs to that commit. Check passes 73 units plus lint, typecheck, scans, build and budgets. Database integration passes 274 operations. Focused browsers pass 106 cases plus two added touch cases. Full browsers pass 291/291. Both mutation checks reject the deliberate faults. Pause for Forge's independent review. No cleanup helper or deployment follows.
