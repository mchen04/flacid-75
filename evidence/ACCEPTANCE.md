# Acceptance record

This file distinguishes implemented behavior, measured evidence, and unresolved requirements.
The ledger contains decisions, formulas, sources, tap budgets, and comparison records.

| Requirement | Evidence or limit |
|---|---|
| iPhone icon, manifest, standalone, splash | Implemented; physical install not yet observed |
| Real Safari on a physical iPhone | Device is unavailable; not passed |
| All core tap counts | LEDGER.md; four actions with in-app camera; physical timing pending |
| Weekly default and month calendar | Chromium and WebKit browser checks and screenshots |
| Two-step rescue with permanent marker | Domain and browser checks pass |
| Speed | performance.json and Lighthouse captures; physical timing remains unmeasured |
| Photo estimate | live-photo.json: deployed real food image, 480 kcal / 25 g, 10.7 seconds; physical capture pending |
| Manual fallback and estimate correction | Both browser engines pass |
| Six habits / strict streak | Domain tests, browser checks, deliberate faulty variants caught |
| Broken days show missing habits | Month detail, history tests |
| One rest per week, two steps | Domain tests and database race test |
| Calculated editable targets | Formula tests and onboarding/settings |
| Only smoothed weight, no streak effect | Domain tests; trend hides the first unsmoothed seed |
| Timezone and 23:59 | Domain tests cover DST and both directions across the date line |
| No notifications | No permission request, push registration, notification API, or message provider |
| Photo discarded | Filesystem watcher and marker scan; DB unchanged; no object store. Not a kernel-wide trace |
| Backfill and markers | Domain and calendar tests |
| Offline and reconnect without duplication | offline-integration.json: actual service worker and isolated Neon schema |
| No page scroll at 390×844 | Geometry assertions and screenshots |
| Each piece wins a native blind comparison | Not passed; native competitors could not be installed or used |
| Penguin and home beat Duo blindly | Two critics prefer Pip; recognize Duo and flag framing. Strict blind criterion not passed |
| Original hand-authored SVG | Source and generated SVGs; competitor images excluded from deployment |
| Warm, forgiving copy | All visible strings reviewed; no guilt or reminder messages |
| No connection string in git/client/logs | Repository, outgoing history, and client scans; secret-bearing goal stays outside repository |
| Lint, types, unit, integration, E2E, build | Final command captures retained |
| Clean commits and push; no PR/merge | Git history and push record |

The initial read of the source goal printed its credential-bearing section into private tool output.
The credential is absent from the repository and application logs. This read-output exposure cannot be undone by a code scan.

Current Lighthouse versions no longer provide a PWA score. The manifest, service worker, and offline behavior are checked directly.

The stable preview is https://flaccid75-preview.vercel.app .
Deployed Lighthouse records 0.766 seconds for FCP and interaction readiness on its throttled mobile profile.
The entry screen scores 100 for performance, accessibility, and best practices.
The goal remains incomplete: physical installation/Safari/timing, native competitor use and strict blind wins,
and a kernel-wide image-write trace are not proven. The deployed photo response takes about 11 seconds.
