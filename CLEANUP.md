# CLEANUP

## Passes
2. Pass 1 changed one test. Pass 2 was a no-op, so the loop stopped.

## Rebase
Not needed. HEAD at start was 4069f43. After `git fetch origin`, `refs/heads/main` (de2ee46) is the merge base, so the branch is 0 behind.

## Removed
- `tests/domain.test.ts`: one duplicate assertion (see below).
- Nothing else. An earlier cleanup (57a8240) already covered the source diff. Since then, only `README.md`, `scripts/ui-shots.mjs` and this test changed. The README line and the `ONLY_STATES` filter are clear and needed.

## Tests deleted
- In "review 171: water completion tolerates float summation…", the last line "read back later, the stored day still scores complete". It repeated the assertion two lines above on the same unchanged object, so it could never fail on its own. The rest of the past-day block stays, as the Keep note below asks.

## Docs updated
- None. The change removed a redundant line and changed no behavior. The repo has no docs/ folder and no CHANGELOG.

## Verified
- The kept past-day block, by mutation: I set `waterTolerance` in `lib/domain.ts` to 0 and ran `tests/domain.test.ts`. One test failed, as it should. I restored the file, and all 19 tests in the file passed.
- No UI, command or API code changed, so I ran no browser, command or API checks.
- The scan rewrote `evidence/v3/mascot-scan.json`. I restored it.

## Checks
- `npm run lint`: pass at baseline and at the end.
- `npm run typecheck`: pass at baseline and at the end.
- `npm test`: pass, 56 of 56, at baseline and at the end.
- `npm run scan`: pass, 0 findings, at baseline and at the end.
- `npm run build`: not run. Only a test file changed, and tests are not part of the build.
- There is no Makefile or pyproject.

## Commits
- 83be93a: pass 1
- The CLEANUP.md commit comes after this one.

## Reverted
- None.

## Keep
- `tests/domain.test.ts`, "review 171: water completion tolerates float summation…", the past-day block. It applies an exact 120 oz override and sixteen quarter pours through the real change log. Then it asserts fixed booleans against the production `completion`. It fails when the tolerance is 0 (checked above). Do not prune it.
