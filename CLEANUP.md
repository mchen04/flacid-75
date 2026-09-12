# CLEANUP

## Passes
3. Pass 3 was a no-op, so the loop stopped. The diff base is `origin/main` (48330f8), the merged line this branch grows from.

## Rebase
Not needed. HEAD at start was 2be8faa. `origin/main` is an ancestor (0 behind). `feat/flaccid75` has no common history with this branch. Its tree is identical to branch commit f74dc68, so all of its content is already here. A rebase would only rewrite merged history.

## Removed
- `lib/domain.ts`: the legacy walk-log lookup, repeated three times, is now `walkLogOf`. The walk-seconds sum, repeated twice, is now `walkSeconds`. `op.walkId ?? op.id`, repeated three times, is now one local.
- `lib/domain.ts`: `totals` and the Food editor used two copies of one nutrition reducer. Both now use `sumNutrition`.
- `lib/domain.ts`: the water-log comment had moved above the new walk fields. It is back above `waterLog`.
- `components/Activities.tsx`: the inline legacy lookup now uses `walkLogOf`.
- `components/Food.tsx`: two inline reducers now use `sumNutrition`.
- `components/Home.tsx`: two stray blank lines left by deleted code.
- `lib/validation.ts`: a double `export type`/`import type` of `EstimateItem` is now one import and one alias.
- `next-env.d.ts`: restored after `next dev` rewrote it to dev-only type paths.

## Tests deleted
- None. Every changed unit test pins behavior: walk ids, legacy import, ordering, meal bounds, portion scaling, redaction.

## Docs updated
- None needed. The README already says "completion checkbox". No other doc names the removed Undo or Log controls.

## Verified
- Library, called directly with tsx: `walkLogOf` returns `{}` for an empty day and `{legacy}` for an old day. `sumNutrition([])` returns zeros, and two items sum correctly. A legacy 300 s walk plus a 600 s walk totals 900 s. A repeated walk id adds nothing. Removing entries recomputes the total and clears the walk when none remain.
- UI, in a real browser on a local dev server with a throwaway Postgres database:
  - Walk page: logging 20 then 10 minutes shows "30 minutes total". Removing walk 1 shows 10 minutes. "Walk complete" stays checked. Focus moves to the next Remove button.
  - Food page: a seeded two-item meal lists 295 kcal and 34 g. The editor sum matches. Removing Rice drops it to 165 kcal and 31 g.
  - Home: shows "Walked · 10 min" with the checkbox checked.
- Found, not changed: a pointer click from the browser tool does not remove a meal item, but a DOM click does. The committed code fails the same way, so this pass did not cause it. It comes from the double-click guard in `removeItem`.
- Cleanup: the browser session is closed, the server is stopped, the database is dropped, and `AGENTS.md`/`CLAUDE.md` (written by `next dev`) are deleted.

## Checks
- `npm run lint`: pass (baseline and final).
- `npm run typecheck`: pass (baseline and final).
- `npm test`: 73 passed, 0 failed (baseline and final).
- Not run: `build`, `scan`, `test:e2e` and `test:integration`. They are not test, lint or typecheck commands, and the integration run needs private credentials.

## Commits
- dd96ee2 cleanup: pass 1 (deslop, simplify, prune-tests, docs). It also includes the `public/sw.js` shell version, which the client build regenerated for the changed components.
- 3b45dde cleanup: pass 2 (deslop, simplify, prune-tests, docs)
- This file is committed separately after these.

## Reverted
- None.
