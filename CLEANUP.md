# CLEANUP

## Passes
2. Pass 2 was a no-op, so the loop stopped. Since the last cleanup (3718c3a), only evidence and docs changed (82fecbe). No application or test source changed.

## Rebase
Not needed. HEAD at start was 82fecbe. After `git fetch origin`, `refs/heads/main` (de2ee46) is an ancestor of HEAD, so the branch is 0 behind.

## Removed
- `README.md`, "Version 4 shipment" row: a garbled tail left by the last evidence edit. It said "still pending; they are repaired at the commit named in … and await a fresh review", which repeated "pending" and pointed at an unnamed repair. It now reads "still pending; see ACCEPTANCE.md".
- No code removed. No source files changed since the last cleanup, so there was nothing to deslop or simplify.

## Tests deleted
- None. No tests changed since the last cleanup. All 56 unit tests pin behaviour.

## Docs updated
- `README.md` (one table row, above).

## Verified
- The README links resolve: `evidence/my-wellness/ACCEPTANCE.md` and `evidence/my-wellness/final174/` exist.
- The README claims match the evidence files:
  - `final174/e2e174.txt` ends "183 passed".
  - `final174/units174.txt` records 56 unit tests.
  - `final174/integration174.txt` records the database run.
- No UI, command, API or library code changed, so no browser or direct-call check applied.
- The build rewrote `evidence/v3/mascot-scan.json`. I restored it.

## Checks
- `npm run lint`: pass (baseline and final).
- `npm run typecheck`: pass (baseline and final).
- `npm test`: pass, 56 of 56 (baseline and final).
- `npm run scan`: pass, 0 findings (baseline and final).
- `npm run build`: pass at baseline. Critical path 35,213 of 40,960 gzip bytes; total 55,794 of 65,536. Not rerun after pass 1, which changed one README line only.
- `npm run test:e2e`: not run. No UI or test source changed.
- `npm run test:integration`: not run. It needs the private database credential.
- There is no Makefile or pyproject.

## Commits
- 0687445 cleanup: pass 1 (deslop, simplify, prune-tests, docs)
- The CLEANUP.md commit follows.

## Reverted
- None.

## Keep
- `tests/domain.test.ts`, "review 171: water completion tolerates float summation…", the past-day block. It fails when the tolerance is 0. Do not prune it.
