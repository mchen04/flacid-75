# My Wellness · acceptance record (t_7531365d)

Owner: Claude Fable 5.1 (sole implementation owner). Status: **review 163, triage 163 and visual-confirmed 163 repairs done; awaiting the supervisor's final verification and the next independent review. Not accepted until those pass. No exhaustive visual approval is claimed.**

## Current summary · commit b10f0c7 (2026-09-10)

Everything in this section was produced from this commit's build in this session, except the rows marked supervisor, which name their own artifact.

| Check | Result | Artifact |
|---|---|---|
| Unit (`npm test`) | 49 passed | [check.txt](check.txt) |
| Typecheck, lint, token scan, mascot scan | clean | [check.txt](check.txt) |
| Bundle: critical path (entry plus every transitively static-imported chunk) | 33,042 of 40,960 gzip bytes (limit unchanged) | [check.txt](check.txt) |
| Bundle: total JavaScript including lazy page chunks | 53,328 of 65,536 gzip bytes (explicit ceiling); every chunk in the shell prefetch list and the worker's install scan | [check.txt](check.txt) |
| Chromium via virtual server (sandbox; mock account runs the real schema and dedupes by id) | 59 passed, 1 skipped (gate needs a real server) | [e2e-chromium.txt](e2e-chromium.txt), [e2e-results.json](e2e-results.json) |
| Captures (fresh page and fixture per state, expected text per state, overlap probe) | 193 states, all reached: 273 PNG frames (a scrolling state also gets a `-full` frame, so frames exceed states) | [after/fit.json](after/fit.json), `after/{phone,small,desktop}/`, `after/extras/` |
| Supervisor, snapshot v163 (predates the R-extra readiness fix and the parser fix): unit 47, typecheck, lint, build; disposable database integration 18 operations; real offline integration Chromium and WebKit (3 queued, 3 replayed, 5 rows, lazy pages offline) | passed, as reported by the supervisor | supervisor's log (not in this folder) |
| Supervisor, real server, Chromium and WebKit, on the copy before the last two test-readiness edits | 115 of 117 passed; the two WebKit failures (workout-ring probe before the checklist rendered; the water phrase typed before the remounted page settled) are repaired in this commit by readiness waits, not skips | supervisor's log (not in this folder); final run on b10f0c7 pending |

**Cross-tab note**: writers are not serialized. `dispatch`, `mergeFromStorage` and the sync save all write the snapshot key, and the Web Lock covers only the sync's read-merge-save. What keeps a change safe is that every dispatched change is first written to its own key (`my-wellness-op:<id>`), removed only when the account has accepted it or storage is locked, and unioned back into the queue at every start, sync and storage event. A snapshot overwritten by a stale save therefore cannot lose an acknowledged change; the journal key outlives it. Refused changes have no journal key (the account has answered), so they are protected differently: `persist` merges the refused list by id with the saved snapshot on every write, and an explicit discard is recorded by id so it holds across tabs. Proof: `wellness.spec.ts` "R163-4…" writes another tab's change exactly between this tab's read and its save (a hook on `localStorage.setItem` fires on the post-sync snapshot with an empty queue), then shows the change reaching the account with no other tab open and surviving a reload with one account write.

**Physical-device limitations stay as before**: no physical phone, WebKit and the real service worker not run here, sound while locked not observable. Real-server, WebKit, database and offline runs are the supervisor's.

## Review 163 · finding to proof

| # | Finding | Repair | Proof |
|---|---|---|---|
| 1 | An automatically finishing timer was cleared (and a focus block marked logged) before its change was dispatched, so a refused write lost it | `applySettled` dispatches first; only an accepted change clears its timer or records the block as logged; `settle()` no longer moves `logged` itself; a refused change leaves everything in place and the next settle retries with the same stable ids (queued once on the device, applied once by the account) | `tests/settle.test.ts` "automatic settlement dispatches first…" (refusal keeps the meditation timer and the focus `logged`, the retry carries the same id, acceptance clears); `wellness.spec.ts` "R163-1…" (device storage refuses the app store: a finishing meditation, a finished focus block and a manual walk finish all keep their timers, and each lands exactly once when storage is back) |
| 2 | A 400 during a slow sync saved this tab's queue over a change another tab queued meanwhile | The 400 path merges changes that arrived meanwhile into both the queue and the state before saving, as the success path does; both read-merge-save steps run under a Web Lock where the browser has one | `wellness.spec.ts` "R163-2…" (A's sync answers 400 after 3 s, B logs floss and closes; floss stays queued and on A's screen, and reaches the account after a reload) |
| low | Setup form rounded untouched measurements after an in-form unit toggle | The untouched check compares the field's string to its pre-fill in the form's current unit only; an untouched field keeps the exact stored value across a toggle | `wellness.spec.ts` "R163-3…" (143.4 lb stored exactly, reopened, toggled to kg, saved untouched: still exact) |
| low (triage 163) | Narrow read-merge-save window between tabs; the lock does not cover `dispatch` or `mergeFromStorage`, so "two tabs cannot interleave" was not proved | Per-operation durable journal: `dispatch` writes `my-wellness-op:<id>` before the snapshot and rolls it back if the snapshot save fails; the sync queue is the snapshot's pending list unioned with the journal; accepted ids are removed from the journal after the account answers; a 400 removes only the set-aside head; `lock()` clears it; storage events on journal keys merge like snapshot events; after a sync the loop re-checks the union, so a journaled change lands without waiting for the next dispatch. Writers are still not serialized, and the record says so | `wellness.spec.ts` "R163-4…" (injected write between read and save; change reaches the account with no other tab and no reload; survives reload; exactly one account write; journal empty afterwards); R163-2 still passes under the same code |
| low | A refused `units` change after a profile save still closed the sheet | The sheet closes only when both changes are accepted | source (`components/App.tsx`) |

## Triage 163 and visual-confirmed 163 · finding to repair

Supervisor opened the c21ff6d frames; these are the confirmed items, with what changed and the proof. No cosmetic redesign; Home, Back and one-tap Undo are untouched.

| # | Confirmed finding | Repair | Proof |
|---|---|---|---|
| T1 | `backfill-home-full` heading reads TODAY while editing an earlier day; Workout says "Today's plan" | Home row head reads THAT DAY and the workout heading "That day's plan" whenever a day is selected | `after/*/backfill-home*.png`, `after/*/backfill-workout*.png`; source `components/Home.tsx`, `components/Activities.tsx` |
| T2 | Meal estimate column "g" beside item mass is ambiguous | Estimate labels read "Calories · kcal" and "Protein · g" (same words as the targets sheet); fits at 375 px | `after/*/meal-estimate*.png` |
| T3 | Night hero left three isolated trunks | Night canopies are drawn in lilac, so every trunk has a visible canopy | `after/*/home-rest-day*.png` |
| T4 | Progress numeral | Confirmed readable, tree behind it; not changed | — |
| V1 | Pour card bottom spacing: `.pour-card{padding-bottom}` lost to `.list{padding:0 …}` declared later | Rule is now `.list.pour-card{padding-bottom:var(--s-5)}`, which wins on specificity regardless of order | `after/*/water*.png`, `after/*/water-say*.png` |
| V2 | Targets sheet showed water in ml for an oz user | Water target field is in her volume unit (label "Water · oz" or "Water · ml"); an untouched field keeps the exact stored millilitres; typed values convert exactly; bounds 17–203 oz or 500–6000 ml | `wellness.spec.ts` "the water target is shown and edited in her volume unit…" (oz untouched save keeps exact ml; 64 oz stores 64 × 29.5735295625 ml; ml view shows the rounded ml; 2250 ml stores 2250); `after/*/targets-sheet.png` |
| V3 | "of N Stanleys" counted whole containers rounded up, so the count disagreed with the exact volume beside it and 3 of 3 could read as complete before the target | Both numbers are shown to the nearest quarter container ("1½ of 2¼ Stanleys · 45 oz"); at the target the two numbers match; completion itself is still the exact millilitres against the exact target | `tests/water.test.ts` (0, ¼, ¾, 1 of 1, 2¼ of 2¼ at target), `app.spec.ts`, `v3.spec.ts`, `wellness.spec.ts` home and water strings |
| F1 | Abs done pose put the head below the mat with a ghost body under it | The up-pose group rotates the other way about the hips (`rotate(36 244 458)`): head lifts above the mat; the rest pose stays where it was | `after/*/abs-done*.png`, `after/*/abs-active*.png` |
| F2 | A running or paused walk, workout or abs session put its Pause/Resume and Finish below the first viewport at phone and small sizes (regression from the stage-first order) | A live session (`.activity.is-live`) orders its stage after the controls at every size, not only under 700 px; footer navigation is unchanged | `wellness.spec.ts` "a live session keeps its controls in the first viewport…" (bounding boxes of Pause, Resume and Finish at 390×844, 375×667 and 1280×900 for walk running and paused, workout running, abs running and paused, written to `live-controls-viewport.json`) |
| F3 | Effective contrast of unreached milestone labels, unit segments and the off switch, and (added by the supervisor) unchecked workout checkbox rings | Milestone: the 0.35 opacity moves from the whole medal to the icon only, labels use the muted ink token (reached labels use ink). Unit segments: the active segment gets a hairline inset boundary in ink2. Switch: off track uses the muted token instead of the hairline line colour; on track uses the deeper accent token so it also clears 3:1 on white. Workout ring: border uses the muted token. All from existing tokens; no new colours | `wellness.spec.ts` "non-text contrast…" measures each control's effective ratio with every ancestor opacity multiplied in and writes `nontext-contrast.json` (3:1 for boundaries and states, 4.5:1 for labels) |

| J1 (journal follow-up) | Startup merged journal-only changes into the queue but not into the shown state, so an offline reload of a stale snapshot showed stale UI | `startStore` applies journal-only changes (those absent from the saved queue) on top of the saved state before `ready` | `wellness.spec.ts` "R163-5…" (stale snapshot with an empty queue plus a journal-only pour; offline reload shows the pour once and queues it once before any server answer; back online it is replayed once, deduplicated, and the journal is empty) |
| J2 (journal follow-up) | A refused journal write returned false with no notice, and a full device fails that first write | The journal write is the earliest failure and sets the device-storage notice; the app shell now shows the store notice on every page that has no notice region of its own (settings and the pour form keep theirs); the timer is retained by the existing dispatch-first settlement | `wellness.spec.ts` "R163-6…" (only `my-wellness-op:` keys are refused; a home change is not applied and the notice is visible on the page; a meditation finishing under refusal keeps its timer and lands once when storage is back; the notice clears with the next accepted change) |
| F163-1 (focused review) | A refusal saved by tab A could be dropped when tab B's slow sync (which defers storage events) saved its stale refused list afterwards, and A's merge then took B's list | The refused list and a discard record are merged inside `persist` itself, so every snapshot write (dispatch, discard, storage-event merge, the sync success and 400 paths, startup) unions refused changes by operation id with what is saved; an explicit discard records the ids it removed (last 200) so a later merge cannot bring them back | `wellness.spec.ts` "R163-7…" (B's sync answers after 3 s; A's floss is refused and set aside; after B saves, floss is still refused in A, in B and after A's reload; A's discard empties both tabs and B's next save does not restore it) |
| F163-2 (focused recheck) | `dispatch` and `discardFailed` still saved a stale refused list, so A's refusal was lost if A closed and B saved a new change before B's sync answered | Same central merge in `persist`; call sites no longer merge themselves | `wellness.spec.ts` "R163-8…" (A's floss refused, A closes; B logs a workout while its sync is pending: floss stays refused in B, on B's settings page and after B's reload; B's discard holds through B's later saves and another reload) |
| J3 (journal follow-up) | The 400 path removed the refused change's journal key before the set-aside list holding it was saved | The key is removed only after that save succeeds; a failed save leaves the refused change in the journal | source (`lib/client-store.ts`, 400 branch); R163-2 |

**Rejected as cosmetic preference (kept as designed)**: the progress numeral with the tree behind it (T4); the moon top crop on the night hero (decorative, supervisor agreed not a blocker). The one-tap Undo, the Home and Back placement and the stage-first order for idle pages are unchanged. Per the supervisor, all 273 baseline frames were reviewed and there are no further redesign asks.

## Review 162 · finding to proof

| # | Finding | Repair | Proof |
|---|---|---|---|
| 1 HIGH | Focus sessions on one day shared block ids | Each focus session carries its own `run` id from start; the block id includes it (timers stored before this key fall back to their start instant); the same session settled in two tabs still shares ids | `tests/sessions.test.ts` "two focus sessions on the same day credit separately…"; `wellness.spec.ts` "R1: two focus sessions… 25 + 25 = 50 minutes, after a reload and after an offline replay" (three sessions: 25, 50 after reload, 75 after an offline replay; three distinct ids on the account) |
| 2 MED | A long container name made a label the bound refused, silently | Label bound raised to 60 on both server and device and labels trimmed to it at the action; a refused pour shows the account's reason in the pour card; the parser now prefers the longest container name and never reads a fraction word or a number in the name as a count | `tests/water.test.ts` (label trim, worst-case length, "refilled my Stanley twice", whole-name reading); `wellness.spec.ts` "R2: a pour from a long-named container…" (¾ of a 22-character name via button and via phrase; a forced refusal shows on the page) |
| 3 MED | A sync in one tab could erase another tab's queued change | Storage events are never ignored: during a sync they are held and merged when it settles; a merge takes the other tab's state, re-applies this tab's queue on top and saves the union; a completed sync merges changes that arrived meanwhile before saving | `wellness.spec.ts` "R3: a slow sync in one tab cannot erase a change another tab queued meanwhile" (A syncs slowly, B is cut off, B's floss survives A's save, both tabs show it, A reloads and delivers it) |
| 4 MED | Timers cleared before the change was accepted; over 24 h refused and lost | `lib/sessions.ts`: elapsed is capped at 24 h, the change is queued first, the timer is cleared only when accepted; a refusal leaves the timer; the walk page says long sessions log as 24 h | `tests/sessions.test.ts` (cap, refusal keeps the timer, acceptance clears it); `wellness.spec.ts` "R4: a walk left running for 26 hours…" (86,400 s credited to the start day, nothing refused, timer cleared) |
| 5 VISUAL | Read it / input flush with the card's rounded bottom on desktop | Bottom padding on the pour card and margins on the phrase form and the confirm/ask states | `after/desktop/water*.png`, `water-confirm.png`, `water-ask.png` (opened in this session; see the visual note below) |
| 6 EVIDENCE | Mixed current and stale numbers | This record: one commit-bound summary above; older checkpoints below are labelled historical | this file |
| extra | Weight unit toggle reinterpreted a typed number | The weight and height fields are keyed by unit, so a toggle gives a fresh field with the stored value | `wellness.spec.ts` "R-extra…" (150 typed as lb, toggle to kg, field shows 65) |
| extra | A refused queued change made unlock report "offline" | Queued changes are re-applied with a guard on unlock, as in sync | `wellness.spec.ts` "R-extra…" (unlock with a refused redeem queued succeeds) |
| extra | "refilled my Stanley twice" counted one | Refill counting reads "twice/thrice/N times" anywhere in the note | `tests/water.test.ts` |
| extra | Saving targets recomputed from the setup weight | A profile save that does not change the weight keeps the trend baseline and recomputes from it | `tests/domain.test.ts` "saving targets or details without editing the weight keeps the trend baseline…" |

Plan sheet (review 162): opened `after/desktop/plan-sheet.png` in this session; the text beside the header is the Settings page scrolled beneath the fixed top bar behind the dimmed backdrop, not an overlap of the sheet. Not reproduced as a defect.

Visual note: in this session I opened the phone water frames and the failing-test frames while fixing R2; the desktop water frame after the padding fix is listed above for the reviewer to open. I do not claim an exhaustive visual pass.

## Historical checkpoints (labelled; superseded by the summary above)

### Historical · final audit repairs (b324755) · finding to proof

| Finding | Repair | Proof |
|---|---|---|
| B1 · one refused change stalled all syncing silently | Server validates each change on its own and reports malformed ones by id with a reason (`validateBatch`, `app/api/sync/route.ts`); the device checks bounds before queueing (`lib/bounds.ts`, no schema library in the bundle) and refuses with a message; forms are bounded (treat cost and count, plan line length and count, estimate item clamps and meal total); refused changes are set aside on the device (`failed`, persisted), shown under Settings with their reason, and discardable; a wholly unreadable batch sets aside its head and moves on | `tests/bounds.test.ts` (browser bounds held to the server schema on 13 bad and 9 good changes; invalid-first batch); `wellness.spec.ts` "B1: a malformed change never strands the queue…" (poison first, valid lands, visible reason, reload, discard, 400 recovery) and "B1: ordinary input cannot queue a refused change…"; browser mock sync now runs the real `validateBatch` (`tests/e2e/helpers.ts`); `scripts/integration.ts` malformed-first batch (supervisor) |
| B2 · small edits to height or weight discarded by a numeric tolerance | A field keeps the exact stored value only when it still holds the exact pre-filled string in the same unit; any other string is taken as typed | `wellness.spec.ts` "B2: a re-save keeps exact stored measurements only for untouched fields; a one-centimetre or a tenth-of-a-pound edit is taken as typed" |
| B3 · sound switch unnamed; sheets unnamed | `aria-labelledby` on the switch; sheets are `dialog` elements labelled by their heading; Week/Month/Trends tabs control a real tab panel | `wellness.spec.ts` "B3: the sound switch and the sheet dialogs have accessible names" |
| Duplicate timer credit across tabs | Settlements carry a stable id derived from the timer's identity and block (`stableId`, a valid version-8 UUID); the device queues an id once; the account applies an id once | `tests/settle.test.ts` "settlement ids are stable…"; `wellness.spec.ts` "two tabs settling the same meditation credit it once" |
| Optional timers could start for a past day | Meditate and Focus show a note and no Start in backfill mode | `wellness.spec.ts` "optional timers cannot be started for a past day" |
| Stale README and offline script | README: free OpenRouter models only, `OPENROUTER_API_KEY` in the table, two rest days, chunked budget; `scripts/offline-integration.mjs` uses the dashboard controls and opens Settings, Rules and Walk offline after the reload | source; supervisor runs the offline script |
| H1 · hero words overlapped on a short viewport | The hero's words are a stacked flex overlay: copy card and chip on the top row, pill on the bottom row; the hero grows rather than overlaps | `wellness.spec.ts` "H1: hero and stage copy, chips and pills never overlap…" (pairwise intersection at 390×844, 375×640 and 320×568 on six pages, and every hero word inside the hero); the capture probe now records `overlapping` per state and fails on any |
| H2 · states never captured | Food estimate loading, error and not-food; camera failure; wrong passphrase; gate, onboarding, timezone banner and reduced motion at phone, small and desktop | `after/{phone,small,desktop}/meal-loading.png`, `meal-error.png`, `meal-not-food.png`, `camera-failed.png`; `after/extras/gate-*.png`, `gate-wrong-passphrase-*.png`, `onboarding-*.png`, `timezone-banner-*.png`, `reduced-motion-*-*.png`; each with an expected-text check in `fit.json` |
| M2 · primary control below the fold on short screens | Below 700 px of height the scene is ordered after the controls; no clipping, no footer nav | `after/extras/short-walk.png`, `short-abs.png` |
| M3 · Floss unlike the other pages | Primary "Mark flossed", then a "Floss logged · Undo" card; the stage is decorative | `wellness.spec.ts` "Floss has the same shape…"; `after/*/floss.png`, `floss-done.png` |
| M4 · Undo the loudest thing on a complete day | Done state is a quiet sage "Done" pill with a small underlined Undo; the accessible name stays "Undo walk" etc. | `after/*/home-complete.png`; `gamify.spec.ts` layout-shift check still passes with the fixed pill height |
| L1 · label chip over the character | Abs copy sits top-left (the window is top-right); workout and floss keep bottom-left | `after/*/abs-done.png`, `abs-guided.png`; overlap probe |
| L2 · past-day screens said "today" | "that day" on the dashboard and activity pages in backfill mode; "Add to <date>" on the meal sheet | `wellness.spec.ts` Floss test, last block |
| L3 · hero chip said Walk under "Next: workout" | The chip says "Open <next>" (or "Walked" once walked) and matches where the hero goes | `after/*/home.png` |
| L4 · crowded header with the Weigh in chip | The chip sits in its own row under the header | `after/extras/timezone-banner-*.png` |
| L6 · disabled Rest buttons looked active | Explicit disabled style (flat ground, muted text, hairline) | `after/*/rest.png` |
| L7 · duplicate "Every one.", tiny helper text, wrapping button, rescue copy | Title reads "All done." while the hero says "Every one."; helper text 13 px; "Finish"; rescue copy no longer claims checks that were not made | `after/*/home-complete.png`, `rescue-sheet.png` |

Rejected or deferred, with rationale: **M1** (an illustration on every page) is not a requirement of the brief; minimal pages for meditate, focus, rules and onboarding keep the primary control first, and the visual language is carried by tokens, cards and type. **L5** (the date field showing a system focus highlight in captures) is the capture's own fill action focusing the field; it is not autofocused by the app. **L7 "the Abs icon reads as a globe"** is noted; the mark is the existing torso glyph and unchanged. **No in-app Back button**: Home is on every page and hash routes keep the platform back gesture working in Safari and in the installed app on iOS 16+; a second back control would duplicate it.

### Historical · water by container (64e5c9d)

| Ask | Done | Proof |
|---|---|---|
| Named containers with sizes; seeded "Stanley", 30 oz | `profile.containers` with a seeded 30 oz Stanley (887.2 ml, stored in millilitres) and a 250 ml glass; editor under Water → Containers and Settings | `tests/water.test.ts`; `wellness.spec.ts` "containers are hers to name and size…" |
| Log by fraction of a container; half, a quarter, most of it, the whole thing, refilled it twice | Deterministic parser (`lib/water.ts`) reads the share and count; half a Stanley is 15 oz exactly | `tests/water.test.ts` "half a Stanley is exactly 15 oz…", "a quarter, most of it…" |
| The model only extracts container and fraction; the app does the math | `/api/water` returns `{container, fraction, count}` only (schema drops anything else); the client multiplies; the parser runs first and the model is a fallback | `wellness.spec.ts` "half a Stanley…" (mocked model returns container and fraction; the app shows 15 oz); `tests/timer.test.ts` free-only request body |
| Respect her unit; one canonical unit | Millilitres stored; oz or ml displayed (Settings → Water), defaulting to oz with lb | `tests/units.test.ts`, `tests/water.test.ts`; containers test switches to ml with the stored ml unchanged |
| One-tap logging for the default container | Dashboard "+" logs a whole default container; undo removes the last pour | `v3.spec.ts` water test; `wellness.spec.ts` hero/water test |
| Progress in her terms | "about 1½ of 3 Stanleys" on the page, "1½ of 3 Stanleys · 45 oz" on the row | `tests/water.test.ts` progress test; captures `water.png`, `home.png` |
| Ambiguous phrase asks once, never guesses | "some of my Stanley" and a model failure both show "How much of the Stanley?" with share buttons; nothing is logged until one is picked | `wellness.spec.ts` "half a Stanley…" ambiguity and model-down blocks; `after/*/water-ask.png` |
| Real browser: half a Stanley twice, exactly 15 oz each, fill and total match | Chromium via the virtual server: two pours of 443.603 ml, each shown as 15 oz, total 30 oz, the glass fill lower after each, the dashboard agreeing | `wellness.spec.ts` "half a Stanley is exactly 15 oz, twice…" → [water-stanley-chromium.png](water-stanley-chromium.png); the supervisor's real-server run covers WebKit |

### Historical · bundle budget after the repairs (b324755)

The original 40,960 gzip-byte limit is unchanged and still enforced, on the critical path: the first script plus every chunk it reaches through static imports, transitively (`scripts/budget.mjs`). Every other page and sheet is a lazily loaded chunk, prefetched by the shell after the first paint and precached by the service worker (`scripts/chunk-check.mjs` fails the build if any chunk is missing from the shell's prefetch links or the worker's install scan). Total JavaScript is reported alongside and has its own explicit ceiling of 65,536 bytes. Before splitting, the single file had reached 45,015 bytes with the water feature and the repairs; the numbers now are in [check.txt](check.txt).

### Historical · real-suite follow-up on b324755 (85 passed, 2 failed) and be53778

| Failure | Cause | Repair | Check |
|---|---|---|---|
| Two-tab settlement timed out on the real server | The second tab had no mocked account, so on a real server it reached the gate; the sandbox run had passed only because that tab was effectively offline | The helper exposes `mock(page, box)` and the second tab shares the same mocked account, which now applies each id once like the real server. Making both tabs live exposed a real race: on a storage event each tab replaced its queue with the other tab's copy, so a queued change could be dropped before it synced. Queues are now merged by id on storage events (`lib/client-store.ts`) | `wellness.spec.ts` "two tabs settling the same meditation credit it once", run three times consecutively in the sandbox: 3/3 |
| WebKit counted the rest rows before the lazy page body rendered | Readiness, not behaviour | The spec waits for the week list and polls the count; the assertion is unchanged | `history.spec.ts` |
| `scripts/offline-integration.mjs` timed out on its reloads | Two stale waits for "Log workout" (the reload helper, and the return home after the offline page tour), which no longer exists once the workout is logged; and a stale operation-row count (onboarding now stores profile and units, so five rows, not four) | Both waits target the dashboard and the logged state; the row count is five; the replay must accept exactly the three queued ids and reject none. **No offline success is claimed here**: the script needs a real service worker and runs only in the supervisor's environment | supervisor rerun |

### Historical · review round 1 (findings-1.txt)

| # | Finding | Fix | Check |
|---|---|---|---|
| 1 | Scenes collided with or cropped out of the stage copy | The four character scenes are shown through their canvas band (viewBox `0 200 360 440`) and the stage keeps that band's aspect ratio, so nothing is cropped at any width; copy sits bottom-left and the tag bottom-right on white cards (rest keeps its copy top-left over sky); the Gym plant and Mat bottle moved out of the copy corner | `after/*/abs-*.png`, `workout*.png`, `floss*.png`, `rest*.png`; contrast audit now measures hero and stage copy |
| 2 | Captures predated the CSS; fit reports missing | Captures are rebuilt from the final build, each state from a fresh document and fixture; `fit.json` records sideways, clipped and scroll results per state; an unreachable state fails the run | `after/fit.json`, `after/extras/` |
| 3, 9 | Dashboard log left a timer counting; undo left the session behind | A dashboard log finishes a running timer with its elapsed time and ticks and clears it; dashboard undo removes a timed session so a later plain log carries no minutes | `wellness.spec.ts` "logging from the dashboard while a timer runs…" |
| 4 | A paused timer from another day was silently backfilled | A paused timer from another day shows a card: "Log to <day>" or "Start fresh"; the timer card states which day it counts for; a running timer that crosses midnight keeps counting and credits its start day (documented) | `wellness.spec.ts` "a timer left from another day…" → [stale-timer-chromium.png](stale-timer-chromium.png) |
| 5 | Hero said "Next: abs" but opened Walk | The hero opens the page for the next habit (food for protein/calories, rest on a rest day, progress when complete) | `wellness.spec.ts` "the hero opens whatever comes next…" |
| 6 | Integration expected one rest per week | Two allowed, third rejected, rest beyond the week rejected; sessions, optional minutes, units, plan, rewards and idempotent redeems persisted under concurrent duplicate delivery; points fixture corrected to 30 | `scripts/integration.ts` (supervisor ran it against a disposable database: passed) |
| 7 | Re-saving details rewrote measurements from rounded display values | A field left at its displayed value keeps the exact stored kg/cm | `wellness.spec.ts` "re-saving your details…" |
| 8 | Backfill mode let the checklist start a hidden timer | Checklist inputs are disabled in backfill mode and ticking is a no-op | `wellness.spec.ts` "in backfill mode the workout checklist is read-only…" |
| 10 | Balance could read negative after undoing habits | Displayed balance floors at 0 with a one-line explanation; nothing is owed | `wellness.spec.ts` treats test, last block |
| 11 | Header tag and dial rounded differently | Both use the ceiling | source |
| 12 | No one-tap undo for water or meals on the dashboard | Water row has a minus; the meal action becomes Undo for six seconds after a log | `wellness.spec.ts` "the hero opens…" |
| 13 | Auto-finish only ran on the open page; focus never ended | `lib/settle.ts` settles finished routines, meditations and focus blocks from any page on a one-second poll and on every return; focus caps at 8 blocks | `tests/settle.test.ts`; `wellness.spec.ts` "finished timers settle from any page…" |
| 14, 15 | Copy overstated cues and data flow | Settings and the walk page say no chime or buzz can play while locked; Food says only the described meal goes to the estimator and logs sync to the private account | source, `after/*/settings*.png`, `food.png` |
| 16 | Comment on vision models was stale | Comment reconciled with [openrouter-models.json](openrouter-models.json): five of six accept images | source |
| T | Contrast skipped text over art | Only the progress hero numeral (over a gradient) is excluded; hero and stage copy are measured | [contrast-audit.json](contrast-audit.json) |
| T | Overflow only at 390×844 | Audited at 390×844, 375×640 and 1280×900 | `horizontal-audit-*.json` |
| T | Duplicate-redeem test could not catch a double charge | A 30-point treat with a 200 balance: a double tap charges once, a later tap charges again | `wellness.spec.ts` treats test |
| T | Free-model test was circular | The exact request body is tested: zero `max_price` and a refusal before any request for a non-free id | `tests/timer.test.ts` |
| WebKit | Water and food rows wrapped in WebKit, shifting layout; Tab did not move focus | Shorter row status text and icon-only water actions; the keyboard test uses Option-Tab on WebKit | supervisor's frozen-build run: 67 passed on both engines ([e2e-real-supervisor.txt](e2e-real-supervisor.txt)) |

The JavaScript budget stays at 40,960 gzip bytes; the bundle is 40,066. No verification threshold was changed.

### Historical · supervisor outputs on earlier checkpoints
- `evidence/pwa.json`: Chromium installability against the local production server, no errors; `physicalInstallVerified` stays false.
- `evidence/performance.json`, `evidence/lighthouse-current.json`: throttled Lighthouse of the public gate screen on the local server; scores 1.0/1.0/1.0. This measures the gate, not the signed-in dashboard.
- Real-server browser run on the frozen build (Chromium and WebKit, localhost, test-only auth): 67 passed, 0 failed, 0 skipped, in 6.1 minutes: [e2e-real-supervisor.txt](e2e-real-supervisor.txt).
- Database integration against a disposable PostgreSQL, isolated schema: passed, 17 operations recorded, every check true: [integration-supervisor.txt](integration-supervisor.txt).

### Historical · commands and results at b324755

| Command | Result | Capture |
|---|---|---|
| `npm run check` (lint, typecheck, unit, scans, build, budget, chunk check) | pass; 42 unit tests; critical path 31,956 of 40,960 gzip bytes; total JavaScript 51,983 of 65,536; every chunk in the shell and the worker's install scan | [check.txt](check.txt) |
| `VIRTUAL_SERVER=1 npx playwright test --project=chromium` (sandbox, virtual server, mock sync running the real schema) | 43 passed, 1 skipped (gate needs a real server) | [e2e-chromium.txt](e2e-chromium.txt), [e2e-results.json](e2e-results.json) |
| `ONLY_VIEWPORT=<phone|small|desktop> VIRTUAL_SERVER=1 node --import tsx scripts/ui-shots.mjs <dir>`, three bounded runs merged | 193 states (57 per viewport plus 22 extras), every state from a fresh page and fixture, every expected text found, 0 sideways, 0 clipped, 0 overlapping words | [after/fit.json](after/fit.json), `after/{phone,small,desktop}/*.png`, `after/extras/*.png` |
| Earlier checkpoints | retained: the review-round-1 run (33 passed) and the supervisor's frozen-build real-server run (67 passed) and database integration | [check-review1.txt](check-review1.txt), [e2e-real-supervisor.txt](e2e-real-supervisor.txt), [integration-supervisor.txt](integration-supervisor.txt) |
| Before captures (previous build) | retained | [before/fit.json](before/fit.json), `before/*/*.png`; earlier evidence untouched under `evidence/ui/`, `evidence/v3/` |
| `curl https://openrouter.ai/api/v1/models` (public, no credential) | all six configured ids listed, prompt and completion price `0`, five accept images | [openrouter-models.json](openrouter-models.json) |
| Baseline build before any change | pass, 26,118 gzip bytes | [build-baseline.txt](build-baseline.txt) |

For the supervisor, on the new checkpoint (localhost only, test-only auth, disposable database, never production credentials):
```sh
DATABASE_URL='postgres://michaelchen@127.0.0.1:55475/postgres' node --import tsx scripts/integration.ts
APP_PASSPHRASE='<test-only>' TEST_BASE_URL='http://localhost:3078' npx playwright test
node scripts/offline-integration.mjs      # real service worker: Settings, Rules and Walk render offline after the reload
node scripts/pwa-check.mjs && node scripts/performance.mjs
```

### Scope items 1–19 (how each is met; proofs reference the current specs)

| # | Item | How it is met | Evidence |
|---|---|---|---|
| 1 | No unintended horizontal scrolling | `.page` is `overflow-x:hidden`; every page audited for width overflow and a real sideways drag | `horizontal.spec.ts` (16 screens, drag delta 0) → [horizontal-audit.json](horizontal-audit.json); `after/fit.json` `sideways: []` everywhere |
| 2 | No clipping; intentional vertical scroll | The page scrolls inside `.page` when content needs it (home, abs, rest, progress, settings, rules); the probe fails on any element hiding overflow with content beyond its box | `after/fit.json` `clipped: []`, `pageScrollsY` per page; `*-full.png` show the whole page |
| 3 | Dedicated activity pages; walk start/pause/finish | `#walk` with ring dial, Start/Pause/Resume/Finish, done card with Undo; `#workout`, `#abs`, `#floss`, `#water`, `#food`, `#rest` | `wellness.spec.ts` "the walk timer starts, pauses, survives a reload…"; [timer-walk-chromium.json](timer-walk-chromium.json); `after/phone/walk.png` |
| 4 | Workout planner/checklist | Editable plan (Settings or Edit plan), checklist with session clock, Finish records moves and seconds | `wellness.spec.ts` "the workout page is a checklist…"; `after/phone/workout.png` |
| 5 | Guided ab library, instructions, intervals, optional audio | `lib/abs.ts`: 4 routines, 12 cued moves, work/rest intervals; phase derived from elapsed time; flash cues, optional chime (Settings) | `wellness.spec.ts` "the guided ab routine…" (cues, next move, pause, sleep catch-up, single log); `tests/timer.test.ts`; `after/phone/abs-guided.png` |
| 6 | Cute milestones/celebrations/progress | Milestone stars 3…100 on Progress, "n days to next" pill on the hero, "+100 points" and petals on a complete day | `wellness.spec.ts` "milestones show…"; `app.spec.ts` celebration → [celebration-chromium.png](celebration-chromium.png); `after/phone/progress.png` |
| 7 | Two planned rest days/week; rest ≠ failure; history preserved | `restDaysPerWeek=2`, plannable ahead within the week, third refused; rest shown as rest in rows, bars (lilac + moon), grid (☾), detail copy; legacy one-rest weeks unchanged | `tests/domain.test.ts` (3 rest tests incl. legacy history); `history.spec.ts` → [rest-planned-chromium.png](rest-planned-chromium.png); `wellness.spec.ts` "a rest day yesterday keeps the streak across midnight" |
| 8 | Optional meditation outside the streak | `#meditate`: 3–20 min countdown, logs minutes; never in `completion`/`streaks`/points | `tests/domain.test.ts` "meditation and focus are logged but never touch…"; `wellness.spec.ts` "meditation and focus are optional…" |
| 9 | Optional Pomodoro outside the streak; no OS blocking | `#focus`: work/break blocks, each finished work block logged once (also when finished while away); copy says it does not block other apps | same as 8; `after/phone/focus.png` |
| 10 | User-chosen reward points/treats; no food-must-be-earned, no invented thresholds | 10/habit + 30/day; treats are user-named with user costs; copy states food is never a reward or debt; nothing cites a threshold as science | `tests/domain.test.ts` points test; `wellness.spec.ts` "treats are user-chosen…"; `after/phone/rewards.png` |
| 11 | Concise dashboard cards with separate one-tap log and one-tap open | Every row: open target (chevron/body) and a separate action button (Log/Undo, +Glass, +Meal, Rest) | `gamify.spec.ts` tap latency (all <2 ms, no layout shift) → [tap-latency-chromium.json](tap-latency-chromium.json); `wellness.spec.ts` "every page is one tap from the dashboard…" |
| 12 | lb/kg and ft-in/cm, defaults lb/ft-in, preserved measurements | `lib/units.ts`; onboarding and details forms in the chosen unit; weigh-in parses to kg; display converts; stored kg/cm never rounded | `tests/units.test.ts`; `app.spec.ts` onboarding (5′5″ / 143.3 lb → 165 cm / 65 kg stored); `wellness.spec.ts` "units switch…" |
| 13 | Verify OpenRouter model; free-only, no paid fallback; tracking works without AI; no credentials printed | Live model list checked without a key; `isFree` id guard + `provider.max_price` 0 on every request; 503 path shows a message and manual numbers still log | [openrouter-models.json](openrouter-models.json); `tests/timer.test.ts` "only free OpenRouter models…"; `app.spec.ts` → [ai-unavailable-chromium.png](ai-unavailable-chromium.png) |
| 14 | Remove footer/bottom nav; dashboard links every page; obvious Home/Back; settings/history accessible | No `nav.bottom-nav`; top bar has Home (on every sub-page), streak badge → Progress, gear → Settings; hash routes make browser Back work | `wellness.spec.ts` "every page is one tap…" (asserts no bottom nav, Home/Settings/Progress on every page, `goBack`) |
| 15 | My Wellness rebrand incl. installed-app label; storage compatibility | Title, manifest name/short_name, `apple-mobile-web-app-title`, gate heading, install note; storage key, cookie, SW cache prefix, tables unchanged | `v3.spec.ts` "the served manifest, icons and splash carry the My Wellness name" → [brand-served.json](brand-served.json); `tests/domain.test.ts` legacy-history test |
| 16 | Undo/edit logs/history; duplicate log/reward prevention | Toggle-to-undo on every habit; done cards with Undo; food edit/remove in place; treat Undo; op ids deduped server-side; double-tap guards on Add, Finish and Redeem | `wellness.spec.ts` "…duplicate finish cannot log twice", "treats… redeem once per tap"; `app.spec.ts` correction; `scripts/integration.ts` (for Forge) |
| 17 | Timers accurate across background/lock/reopen; optional sound/visual cues | Wall-clock timers, phase from elapsed; wake lock when available; ring/flash cues, optional chime | `wellness.spec.ts` walk (reload + 20-minute sleep → 30:00), abs (sleep to end → logged once), focus (block finished while away credited); `tests/timer.test.ts`. **Device limits below.** |
| 18 | Explicit completion/rest/rollover rules; optional vs required; documented defaults | In-app `#rules` page and [RULES.md](RULES.md) | `wellness.spec.ts` midnight rollover and rest-across-midnight tests; `after/phone/rules-full.png` |
| 19 | Accessible, responsive, reduced motion, data-preserving, no unnecessary AI transmission | Keyboard order and visible focus ring; WCAG AA contrast audit of every text node on every page; reduced-motion disables all animation on every page; three viewports; only the described meal is ever sent | `wellness.spec.ts` keyboard + contrast → [contrast-audit.json](contrast-audit.json) (0 failures on 16 screens); `gamify.spec.ts` reduced motion; `after/{phone,small,desktop}` |

### Retained features
| Feature | Check |
|---|---|
| Seven-habit all-or-nothing streak, midnight boundary, rescue, backfill | `tests/domain.test.ts`; `history.spec.ts`; `wellness.spec.ts` backfill |
| Offline queue and duplicate-safe replay | `app.spec.ts` offline test → [offline-chromium.png](offline-chromium.png) |
| Conversational food with USDA grounding, "Not this", correction | `app.spec.ts` onboarding test; `tests/food.test.ts` |
| Camera path, image never persisted | `camera.chromium.spec.ts` → [camera-actions.json](camera-actions.json), [camera-estimate.png](camera-estimate.png) |
| Water minus, no dialog, never below zero | `v3.spec.ts` |
| No toast/snackbar/banner; no layout shift on log | `v3.spec.ts` → [transient-check-chromium.json](transient-check-chromium.json) |
| Tokens only, no mascot leftovers | `npm run scan` in [check.txt](check.txt) |
| Trends (weight in chosen unit, protein, streak) | `history.spec.ts` → [trends-chromium.png](trends-chromium.png) |

### States inventoried
Gate (loading scene, error line) · onboarding (validation error) · dashboard (0 of 7, partial, complete/celebration, rest day, past-day banner, "a fresh start" after a miss) · walk/workout/abs (ready, running, paused, done card, backfill mode) · abs guided (work, rest, finished flash) · food (empty list, meals, edit form, estimate loading "Looking…", estimate error with manual fallback, "Not this") · rest (planned, used, none left, before-start, missed) · meditate/focus (ready, running, break, logged) · treats (empty, affordable, "n more", redeemed with undo) · progress (in progress, complete, rest, planned rest, rescued, missed, ahead, before start; empty trends) · settings (storage notice row) · timezone banner · lock sheet (pending changes). Each is reachable in the captures or the specs above.

### For the supervisor to run outside the sandbox
```sh
# database integration, disposable localhost database only (never the production URL)
DATABASE_URL='postgres://michaelchen@127.0.0.1:55475/postgres' node --import tsx scripts/integration.ts
# real-server browser checks (Chromium and WebKit), test-only auth in the environment, no credential files
APP_PASSPHRASE='<test-only>' TEST_BASE_URL='http://127.0.0.1:3078' npx playwright test
# optional: PWA installability and the performance probe against the same server
node scripts/pwa-check.mjs
node scripts/performance.mjs
```
The gate test (`app.spec.ts` "gate rejects wrong passphrase…") is the one skipped here; it runs unmodified against a real server.

### Limitations, stated plainly
- **Not verified on a physical device.** Wall-clock timers are verified with a virtual clock in Chromium (reload, 20-minute sleep, midnight). iOS may terminate a backgrounded PWA; on reopen the timer resumes from storage, but no notification or sound fires while the app is closed, and the wake lock only holds while the page is visible. Sound needs a user gesture first, which Start provides.
- **WebKit not run here** (launch timeout in the sandbox). Specs are engine-agnostic and committed.
- **Database integration not run here** (no loopback). The script is updated for the new rules and fields; Forge runs it.
- **Bundle budget headroom is small:** 38,899 of 40,960 gzip bytes.
- **The blind visual comparison** against the references was not repeated; references were viewed and the direction recorded in [DESIGN.md](DESIGN.md).
- **Fixtures are synthetic.** No real personal data or credentials appear in tests or evidence.
