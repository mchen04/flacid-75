# CLEANUP

## Passes
2. Pass 1 changed code. Pass 2 was a no-op, so the loop stopped.

## Rebase
Not needed. HEAD at start was 7503c72. After `git fetch origin`, the branch is 27 commits ahead of `refs/heads/main` (de2ee46) and 0 behind.

## Removed
- `tests/e2e/review171.spec.ts`: the unused `mock` import (the one lint warning), a bad indent, and a stray trailing comma.
- `lib/db.ts`: the `storable` wrapper, which only called `cleanText`. `cleanText` now reuses `wellFormed` from `lib/bounds.ts` instead of its own copy of the rule.
- `lib/validation.ts`: `str` and `strOptional` each repeated the same two checks. They now share one helper, `fits`.
- `lib/bounds.ts`: the `clip` filter indexed back into its array instead of using its own argument.
- `components/Settings.tsx`: the target form typed its ranges out by hand. It now reads them from `limits.overrides`. The container form uses `limits.containerName` and `limits.containerMl` instead of 30 and 30–6000.

## Tests deleted
- In `tests/domain.test.ts`, test "review 171: water completion tolerates float summation…": I deleted its last assertion, the past-day block. It compared `completion()` to a copy of the formula inside `completion()`, so it could never fail. The rest of the test still covers the tolerance.

## Docs updated
- None. The README already describes the text rule, the water tolerance and slash fractions. The pass changed no behavior. The repo has no docs/ folder and no CHANGELOG.

## Verified
- `clip`, called directly: "Press-ups 💪" came back unchanged. A lone surrogate half was dropped. 60 letters plus an emoji clipped to 60 characters.
- `validateBatch`, called directly: a good emoji plan and an empty session item passed. A plan line with a lone surrogate half was refused by id with "must be well-formed text without NUL".
- `checkBounds`, called directly: a steps override of 500 passed. An override of 499 was refused.
- The settings screens, in Chromium, served from this checkout's own build: 13 of 13 browser tests passed. They cover the plan sheet with emoji, the daily targets sheet (oz cap of 202.8, refusal at 203), the containers sheet, long container labels, the details unit toggle, the workout page, water phrases and the privacy copy.
- An app from another checkout was running on port 3075. The first browser run hit that app and failed on the old code. The run against this build passed.
- I could not run `lib/db.ts` against a database, because this checkout has no `.env.local`. Typecheck, the unit tests and the mock account cover it.
- The build refreshed the service-worker version in `public/sw.js`. I committed that. I restored the evidence files that the scans and browser runs overwrote.

## Checks
- `npm run lint`: pass. Baseline had 1 warning (the unused `mock`). The end has 0.
- `npm run typecheck`: pass, at baseline and at the end.
- `npm test`: pass, 56 of 56, at baseline and at the end.
- `npm run scan`: pass, 0 findings, at baseline and at the end.
- `npm run build`, including the budget and chunk checks: pass. The first script is 35,214 of 40,960 gzip bytes.
- There is no Makefile or pyproject.

## Commits
- 57a8240: pass 1
- The CLEANUP.md commit comes after this one.

## Reverted
- None.
