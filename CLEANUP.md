# CLEANUP

## Passes
2. Pass 1 changed one e2e spec. Pass 2 was a no-op, so the loop stopped.

## Rebase
Not needed. HEAD at start was 9c058fa. After `git fetch origin`, `refs/heads/main` (de2ee46) is the merge base, so the branch is 0 behind.

## Removed
- `tests/e2e/wellness.spec.ts`: eight copies of the same comment and `test.setTimeout(150000)` call. They are now one `slowClock()` helper with one comment. The budget and the tests it covers stay the same.
- Nothing else. Earlier cleanups already covered the source diff. Since the last one, only this spec and evidence files changed.

## Tests deleted
- None. The rewritten R-extra test pins real behavior: the exact refused id, no redemption, and the set-aside list.

## Docs updated
- None. The README describes how to run e2e tests, not per-test timeouts, so nothing went stale.

## Verified
- I served this worktree's build on a spare port. I did not use port 3075, because the main checkout owns it. Then I ran the full `tests/e2e/wellness.spec.ts` in Chromium: 46 of 46 passed, including R-extra and all eight tests with the longer budget.
- The build predates only test and evidence changes, so it matches the product code under test.
- The e2e run and the scan rewrote three evidence files (two screenshots and `evidence/v3/mascot-scan.json`). I restored them.

## Checks
- `npm run lint`: pass at baseline and at the end.
- `npm run typecheck`: pass at baseline and at the end.
- `npm test`: pass, 56 of 56, at baseline and at the end.
- `npm run scan`: pass, 0 findings, at the end.
- `npm run test:e2e` (Chromium, wellness spec): pass, 46 of 46, after pass 1.
- `npm run build`: not run. Only a test file changed, and tests are not part of the build.
- There is no Makefile or pyproject.

## Commits
- b2e3550: pass 1
- The CLEANUP.md commit comes after this one.

## Reverted
- None.

## Keep
- `tests/domain.test.ts`, "review 171: water completion tolerates float summation…", the past-day block. It fails when the tolerance is 0. Do not prune it.
