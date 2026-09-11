# CLEANUP

## Passes
1. Pass 1 was a no-op, so the loop stopped. Since the last cleanup (be8da98), the source changes are the water target fix in `components/Settings.tsx` and its tests in `tests/e2e/review171.spec.ts`. Both already read cleanly.

## Rebase
Not needed. HEAD at start was fd036b1. After `git fetch origin`, `refs/heads/main` (de2ee46) is an ancestor of HEAD, so the branch is 0 behind.

## Removed
- Nothing. The three-line comment in `TargetForm` explains why the water field has no native bounds. It does not restate code, so it stays.
- The new limit check reuses `parseVolume`, `formatVolume` and `limits.overrides`. It adds no parallel helper.

## Tests deleted
- None. R171-6 and R173-1 pin the water limits and the exact stored boundary values. Both can fail.

## Docs updated
- None. The branch already updated `README.md` and `evidence/my-wellness/ACCEPTANCE.md` for review 173.

## Verified
- I built this worktree and served it on spare port 3091, because another checkout owns 3075.
- I ran R171-6 and R173-1 against that build in Chromium and WebKit: 4 of 4 passed. They cover these cases:
  - An oz edit above the limit gets a reason on the sheet.
  - 16 oz is refused.
  - Stored 6000 ml and 500 ml stay exact across unit toggles and unrelated edits.
  - 6001 ml and 499 ml are refused.
- The runs rewrote `evidence/my-wellness/e2e-results.json` and `evidence/v3/mascot-scan.json`. I restored both.

## Checks
- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm test`: pass, 56 of 56.
- `npm run scan`: pass, 0 findings.
- `npm run build`: pass. The JS budget is 35,213 of 40,960 gzip bytes.
- `npm run test:e2e` (the two changed tests, both engines): pass, 4 of 4.
- `npm run test:integration`: not run. It needs the private database credential.
- There is no Makefile or pyproject.

## Commits
- No pass commits. The pass changed nothing.
- The CLEANUP.md commit follows.

## Reverted
- None.

## Keep
- `tests/domain.test.ts`, "review 171: water completion tolerates float summation…", the past-day block. It fails when the tolerance is 0. Do not prune it.
