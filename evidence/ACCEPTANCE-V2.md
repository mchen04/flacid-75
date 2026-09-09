# Acceptance record, version 2 (gamify)

Goal file: `~/Documents/Goals/flacid-75/flaccid75-v2-gamify.txt`. Date: 2026-09-09.
Live: https://flaccid75-preview.vercel.app (production alias; passphrase unchanged).

**Environment limit that shaped this record.** The build session ran inside a sandbox that forbids binding any local TCP port and forbids launching Chromium or WebKit (Mach bootstrap denied). Every browser-driven check below is therefore written, committed and ready, but was not executed in this session. Node-only checks, the live API, and the blind mascot rounds were executed. Run `npm run test:e2e` (after `npm run build && npx next start -p 3075`) outside the sandbox to execute the browser checks; each one writes its evidence file into `evidence/`.

| Check | Status | Evidence |
|---|---|---|
| Pip wins a blind cuteness comparison against every listed mascot; rounds recorded | **Done.** Round 11: 15 of 15, no brand named. Eleven rounds, 165 judgments, all recorded. | [blind/v2/rounds.md](blind/v2/rounds.md), `blind/v2/panels/r*/` |
| All seven habits, including flossing, have distinct animated interactions; captures retained | **Built; capture not executed.** Walk track, pouring glass, Pip eating, dumbbell lift, crunch, floss sparkle, meters. The gamify spec screenshots each one. | `components/App.tsx`, `app/globals.css`, `tests/e2e/gamify.spec.ts` |
| Water fills, Pip eats, Pip walks the track, verified in a real browser | **Built; browser run blocked by sandbox.** | `tests/e2e/gamify.spec.ts` |
| A tap changes state in under 100 ms regardless of animation, proven by measurement | **Test written; not executed here.** State changes synchronously in `dispatch`; animation classes are timer-driven decoration. | `tests/e2e/gamify.spec.ts` writes `tap-latency-*.json` |
| Reduced motion respected everywhere | **Built; test written.** One global media rule disables all animation and transition; confetti particles are skipped in script. | `app/globals.css` last rule, `tests/e2e/gamify.spec.ts` |
| Typing a meal returns a grounded estimate, asks for confirmation, adds nothing until approved; verified live | **Done live for the API; client confirm flow tested in spec.** Live production request in [live-estimate.json](live-estimate.json). Nothing is written until "Add to today". | [live-estimate.json](live-estimate.json), `tests/e2e/app.spec.ts` |
| Chosen free OpenRouter model and food database named with the date | **Done.** See the ledger. | [LEDGER.md](LEDGER.md#version-2-food) |
| OpenRouter key in no commit, log or client bundle, proven by scan | **Done.** Exact-value scan over the working tree, full history and the client bundle. | [secret-check.json](secret-check.json) |
| Weigh-in no longer overlaps the footer; wordmark gone; Today calendar gone; sync notice gone | **Done by construction.** Weigh-in is a chip in the top row; the wordmark, the week strip and the sync banner no longer exist in source. | `components/App.tsx` |
| No layout shift when checking or unchecking a habit, proven by measurement | **Test written; not executed here.** Tiles have fixed heights; toasts are absolutely positioned. | `tests/e2e/gamify.spec.ts` compares bounding boxes before and after |
| No horizontal scroll, drag or bounce on any screen at 390×844, proven by a test shown to fail first | **Test written; could not be run in either state.** The test audits every element for horizontal overflow and performs a real drag on every screen. Scroll regions now set `overflow-x:hidden` and the calendar grid uses `minmax(0,1fr)` columns. | `tests/e2e/horizontal.spec.ts` |
| Every string reviewed; filler and "little" removed | **Done.** `grep` for "little", "Claude", "six" over source returns nothing; the client bundle contains zero occurrences. | this record |
| Lint, types, unit, integration, e2e, build all pass | **Lint, types, unit, build pass.** Integration needs Neon (run `npm run test:integration`); e2e blocked by sandbox. | [check-v2.txt](check-v2.txt) |
| Committed in clean waves, pushed, deployed to production; live URL works with the passphrase | See the ledger's deployment section. | [LEDGER.md](LEDGER.md) |

Still unfinished and still true: physical iPhone install, real Safari behaviour and real-device timing; native competitor apps; the Neon credential exposed in tool output in version 1 has not been rotated.
