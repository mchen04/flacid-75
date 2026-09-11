# Review round 5: `task/t_7531365d-my-wellness` against `refs/heads/main`

Commit under review: `38b978f`. Range `refs/heads/main...38b978f`: 43 commits, 450 files, +19329/−1822. About 3,660 of the added lines are code and tests; the rest is evidence.

**12 candidates raised, 2 refuted, 10 survived (0 blocker, 1 material, 9 minor).** Nothing gating survived.

The author did not do this review. Each candidate was attacked by a refuter that had not seen the hunter's reasoning.

## Surviving findings

### Material

1. **The new `/api/water` endpoint has no test that it refuses a locked request.** Disposition: **pre-merge ask**.
   - `tests/e2e/app.spec.ts:9` loops over `/api/sync` and `/api/estimate` only.
   - The only water tests (`tests/e2e/wellness.spec.ts:267`, `:270`) mock the route with `page.route`. `scripts/integration.ts` never calls it, and no middleware exists.
   - The guard is present today (`app/api/water/route.ts:7`). If someone removes it, every test still passes, and the paid model call is open to anyone who reaches the server.
   - Ask: add `/api/water` to the path list. Show the test fails with the guard removed.

### Minor

2. **Some pour phrases log the wrong amount.** Disposition: **pre-merge ask**. `lib/water.ts:8`, `lib/water.ts:28`. Executed at HEAD:
   - "3 quarters of a glass" gives 250 ml ("a Glass").
   - "2 thirds of a stanley" gives 887.2 ml ("a Stanley").
   - "my third glass" gives 83 ml ("a third of a Glass").
   - The confirm card (`components/Activities.tsx:163`) shows the amount before she adds it, so this is minor.

3. **"1 1/2 glasses" parses as half a glass.** Disposition: **pre-merge ask**. `lib/water.ts:17`, `lib/water.ts:23`. Executed: 125 ml instead of 375 ml. "1½ glasses" is correct. The confirm card is the same mitigation as in item 2.

4. **Limits shown in oz are refused when typed.** Disposition: **post-merge tracker**.
   - `components/Settings.tsx:69`: in oz mode, 16.9 oz is 499.79 ml and 202.9 oz is 6000.47 ml. Both are refused by a message that names exactly these values as the limits.
   - `components/Settings.tsx:81`, `:84`: the container message says "between 1 and 200 oz" and the input has `min="1"`. But 1 oz is 29.57 ml, below the 30 ml floor, so 1 oz is refused. 200 oz is also below the real 6000 ml cap.

5. **Switching units in "Your details" drops a typed edit.** Disposition: **post-merge tracker**. `components/Settings.tsx:50-54`, `:45`.
   - `key={units.weight}` remounts the inputs with the stored value. The save then treats the field as untouched and keeps the old value.
   - This is visible, because the field refills. The separate weigh-in form is not affected.

6. **A refused water undo shows no message.** Disposition: **post-merge tracker**.
   - `components/Activities.tsx:136` ignores the result of `change`, and `components/App.tsx:64` hides the global notice on the Water page.
   - Reachable only by a storage or persist failure.

7. **The setup and profile sheet can half-save (plausible).** Disposition: **post-merge tracker**.
   - `components/App.tsx:72` saves the profile and the units as two separate changes. If the units change is refused, the profile is saved, the sheet stays open, and the reason sits behind the modal.
   - Reachable only by a storage failure. Not reproduced.

8. **`/api/water` validates input by hand.** Disposition: **post-merge tracker**. `app/api/water/route.ts:10-13`.
   - It has no content-length cap and no length limit on container names, which go into the model prompt.
   - A JSON `null` body returns 503, not 400.
   - The route sits behind the gate and a limit of 60 requests per hour.

9. **The sent-mark comment overstates certainty.** Disposition: **post-merge tracker**. `lib/client-store.ts:24-26`, with the paths at `:150` and `:152`.
   - An answer lost after the server commits leaves the change unmarked, so it is not "pending for certain".
   - After an unlock with a receipt that is not complete, the screen can briefly count the change twice. The next sync corrects this, and the server is idempotent by id. Fix the comment, or document the case.

10. **Every state read counts the whole operations table.** Disposition: **post-merge tracker**. `lib/db.ts:12` runs `count(*)` over `flaccid75_operations`, under the row lock during sync. This is negligible at one user's volume.

Top priority: item 1. Items 2–3 should be fixed before merge but do not gate it. Everything else is minor.

## Refuted

- **Receipt ordering by `received_at`** (`lib/db.ts:12`). The mechanism is real. To drop a committed change from a receipt that looks complete, 200 or more changes must commit ahead of it within one round-trip gap. With one user, at most 100 changes per batch and 3 connections, that does not happen, and the next write would correct it.
- **Refusal with an empty id** (`lib/validation.ts:36`). The client never sends a change without an id, and a hand-made request never reaches the client store.

## Checked and solid

- **Checks at `38b978f`:** lint passes, typecheck passes, and all 56 unit tests pass.
- **Auth:** `lib/auth.ts` is unchanged from main. Its compare is timing-safe (lines 4–5). `app/api/sync/route.ts:4` and `app/api/water/route.ts:7` call `guard` first. `lib/sessions.ts` and `lib/tokens.ts` are timer and design-token code, not auth.
- **Sync batches:** each item is validated with zod and refused by its own id (`lib/validation.ts:26-37`). A batch over 100 KB gets 413. Text rules count characters, not bytes, and refuse NUL and lone surrogate halves (`lib/bounds.ts:10-11`). The database layer checks each change again before insert (`lib/db.ts:17`, `:26`), so one bad change cannot roll back a batch.
- **No double apply on the server:** duplicate ids are checked under the row lock (`lib/db.ts:22`, `:27`). The receipt is read inside the same transaction, before COMMIT.
- **Lock-and-clear and late answers:** the generation is checked again after every await (`lib/client-store.ts:153`, `:161`, `:166`) and inside `persist` (`:58`).
- **Queued changes:** the journal key is written before the snapshot, and removed only after the save that records the acknowledgement (`lib/client-store.ts:182`). A sync requested mid-flight runs again (`:183`).
- **Client and server bounds agree:** `lib/bounds.ts` matches `lib/validation.ts` for water, containers and targets. An untouched water target keeps the exact stored millilitres (`components/Settings.tsx:69`).
- **Timers:** elapsed time is rebuilt from the stored start and clamped at zero (`lib/timer.ts:11`, `:15`). Settlement ids come from the timer, so a retry or a second tab cannot credit twice (`lib/settle.ts:19`, `:27`).
- **Schema:** the new queries use only columns that exist in `migrations/001_initial.sql`. New change types live in the existing JSON column, so no migration is needed.
- **Service worker and secrets:** `public/sw.js` changes only the cache version and still skips `/api/`. The diff contains no real keys or passwords. The committed `DATABASE_URL` values are local and have no password. The local username and home path do appear in the evidence text.

## Coverage caveat

- **Not run in this round:** the Playwright suites, the database integration script and the offline script. This worktree has no `.env.local` and no database. All database and sync claims are from reading code, not from running it.
- **Light treatment:** `evidence/` (most of the added lines), `app/globals.css`, `scripts/ui-shots.mjs` and the e2e spec bodies got only a sweep. No test was checked for whether it can fail, except the gate test in item 1 and `tests/sessions.test.ts`.
- **Blockers:** nothing gating was found, so nothing needed reproducing to block. Items 2–4 were executed. The other survivors were reasoned from source, not executed.

VERDICT: APPROVE
