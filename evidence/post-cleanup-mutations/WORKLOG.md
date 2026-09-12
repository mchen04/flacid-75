# Mutation target repair after cleanup

Starting commit: `c29cce05766183c30340267fc806dde1ecd6e2dd`.
Scope: repair the stale replay mutation clause, run every mutation script, commit locally, then pause. Read the cleanup report and existing mutation/test instructions. No application change, database access, deployment, or cleanup helper.

## Reproduced failures

`node scripts/check-walk-replay-mutation.mjs > evidence/post-cleanup-mutations/replay-before.txt 2>&1` exits 1 before reaching the runtime test. Cleanup extracts `op.walkId ?? op.id` into `walkId`, so the old assignment text no longer exists.

Update the target and replacement from `day.walkLog[op.walkId ?? op.id]` to `day.walkLog[walkId]`. The deliberate fault still replaces `??=` with `=`. The existing different-seconds replay regression proves that the first value cannot be overwritten.

The requested all-script run also finds stale spacing in `scripts/mutation.mjs`. Its first invocation exits 1 with `Mutation target changed`; the log is retained as `domain-before.txt`. Update its rest-limit and timezone target/replacement strings to match the current source. Do not change the faults or application logic.

## Commands and results

Run the five scratch-copy scripts independently. Run the older domain script separately because it temporarily changes `lib/domain.ts`. Check each exit status. Its `finally` restores the source; `git diff -- lib/domain.ts` is empty afterward.

| Command | Result |
|---|---|
| `npm test > evidence/post-cleanup-mutations/unit-baseline.txt 2>&1` | Exit 0; 73 passed, zero failed. Run before the final domain mutation run to establish a healthy baseline. |
| `node scripts/check-walk-replay-mutation.mjs > evidence/post-cleanup-mutations/check-walk-replay-mutation.txt 2>&1` | Exit 0; baseline passes, overwrite mutant fails at runtime. |
| `node scripts/check-walk-order-mutation.mjs > evidence/post-cleanup-mutations/check-walk-order-mutation.txt 2>&1` | Exit 0; baseline passes, sorted-order mutant fails. |
| `node scripts/check-walkid-mutation.mjs > evidence/post-cleanup-mutations/check-walkid-mutation.txt 2>&1` | Exit 0; baseline passes, removed validation fails. |
| `node scripts/check-timer-mutations.mjs > evidence/post-cleanup-mutations/check-timer-mutations.txt 2>&1` | Exit 0; baseline passes, missing/empty/constant timer IDs each fail. |
| `node scripts/check-floss-toggle-mutation.mjs > evidence/post-cleanup-mutations/check-floss-toggle-mutation.txt 2>&1` | Exit 0; Chromium and WebKit pass baseline and reject the stuck checkbox. The old visibility assertion still passes, proving the stronger assertion matters. |
| `node scripts/mutation.mjs > evidence/post-cleanup-mutations/domain.txt 2>&1` | Exit 0 after repair; partial-day, unlimited-rest and timezone faults are all caught. |
| `npm run lint > evidence/post-cleanup-mutations/lint.txt 2>&1 && npm run typecheck > evidence/post-cleanup-mutations/typecheck.txt 2>&1` | Exit 0. |
| `git diff --check -- scripts evidence/post-cleanup-mutations/WORKLOG.md` | Exit 0. |

All six mutation scripts succeed and catch all ten distinct injected faults. Browser mutation checks create and close their own browsers. Scratch scripts remove only their own temporary copies. No server or database is started. No credential is read or supplied.

## Handoff

Only mutation target strings and repair evidence change. Existing regression tests provide the failure proof; no duplicate test is added. Full application build, end-to-end suite and database checks are not rerun for this script-only repair.

```sh
git add scripts/check-walk-replay-mutation.mjs scripts/mutation.mjs evidence/post-cleanup-mutations
git diff --cached --check -- scripts evidence/post-cleanup-mutations/WORKLOG.md
git commit -m "Update mutation targets after walk refactor"
git rev-parse HEAD
git status --short
```

Return the commit in the session and pause for review. No push or deployment.
