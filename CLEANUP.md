# CLEANUP

## Passes
4. Passes 1 to 3 changed code. Pass 4 was a no-op, so the loop stopped.

## Rebase
Not needed. HEAD at start was d140349. The branch is 21 commits ahead of `refs/heads/main` (de2ee46) and 0 behind, after `git fetch origin`.

## Removed
- Duplicate imports in `components/Food.tsx` and `components/Activities.tsx`, merged into one each.
- `journalRemove` in `lib/client-store.ts` had its own copy of the sent-mark key. It now calls the existing `sentRemove`.
- A repeated comment in `arrivedMeanwhile`. A stale comment in `lib/water.ts` that said halves, when the code rounds to quarters.
- A needless type annotation in the chunk prefetch map in `app/route.ts`.
- Dead exports: `operationsSchema` (validation), `optionalHabits` and `OptionalHabit` (domain).
- Unused re-exports of `names`, `habits` and `Mark` in `App.tsx`, `Settings.tsx` and `Activities.tsx`.
- `scripts/ui-shots.mjs`: a `sizes` list that copied `viewports`. The unreached list is now computed once. It now also names unreached extras, which already failed the run.
- `scripts/offline-integration.mjs`: an unused `reload` argument. A comment moved off the end of an assert line.
- `scripts/integration.ts`: a mid-test import moved to the top.
- `tests/e2e/helpers.ts`: an unused helper, `reduced`, that returned its input. Its import went with it.

## Tests deleted
- None. `reduced` was an unused helper, not a test. Every unit and browser test pins real behavior.

## Docs updated
- None. The README still matches the code; every file, script and command it names exists.

## Verified
- Water page in a real browser: logging half a Stanley gave 15 oz and "about ½ of 2¼ Stanleys".
- Meal sheet: entering 650 kcal and 40 g by number showed the meal and totals on the food page.
- Home, Settings and walk pages after pass 3 render with no page errors. The walk timer starts and counts.
- Lock and clear stays disabled while changes wait to sync. Without a database they never sync, so I could not finish it by hand.
- Browser tests cover lock and clear instead. They ran with no server, in Chromium. After pass 1: `review164` and `review165`, 22 of 22 passed. After pass 3: `wellness`, `app` and `review165`, 63 passed and 1 skipped. The skipped test was already skipped before this cleanup: it needs a real server.
- `inContainers`, called directly: 15 oz of a 67.5 oz target gave "about ½ of 2¼ Stanleys". The edge case, zero of zero, gave "0 of 0 Stanleys".
- `validateBatch`, called directly: a mixed batch gave 1 valid and flagged the bad change by id. An empty batch and a 101-change batch both returned null.
- `ui-shots.mjs`, run with no server on the phone size: no failures and nothing unreached.
- `offline-integration.mjs` passes a syntax check. It and `integration.ts` need a database and `.env.local`, which this checkout lacks, so neither ran.
- The build refreshed the service-worker version hash in `public/sw.js`, which is expected. The browser test runs overwrote evidence screenshots, so I restored them.

## Checks
- `npm run lint`: pass, both at baseline and at the end.
- `npm run typecheck`: pass, both at baseline and at the end.
- `npm test`: pass, 49 of 49, both at baseline and at the end.
- `npm run build`, with its budget and chunk checks: pass. The first script is 34,568 gzip bytes against a 40,960 limit.
- The repo has no Makefile or pyproject.

## Commits
- ae0aee1: pass 1
- 47b44c9: pass 2
- 4daa68c: pass 3
- The CLEANUP.md commit follows these.

## Reverted
- None.
