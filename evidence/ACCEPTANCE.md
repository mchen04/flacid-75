# Acceptance record

The app ships at the [stable preview](https://flaccid75-preview.vercel.app).
Michael authorizes squash integration into `main`, superseding the original merge ban.
**Physical iPhone verification remains unfinished.** Merging does not complete the original acceptance goal.

The [evidence index](README.md) separates final implementation checks from earlier diagnostics.
The [ledger](LEDGER.md) records behavior, measurements, and decisions.

## Requirement coverage

| Requirement | Shipped behavior and evidence | Remaining gap |
|---|---|---|
| iPhone home-screen install, icon, standalone, airplane mode | Manifest, icons, startup image, service worker; [installability check](pwa.json) finds no errors. | Physical installation and airplane-mode use are unfinished. |
| Physical Safari: safe areas, no rubber-banding, no focus zoom, standalone chrome, resume | CSS and lifecycle handling ship; Chromium and WebKit checks exist. | No physical iPhone screenshots or verification. |
| Core tap counts | [Ledger](LEDGER.md#core-actions); [simulated-camera check](camera-actions.json) records four actions. | Physical counts and timings are unmeasured; first-use camera permission adds an OS action. |
| Weekly default and month calendar | [Browser checks](e2e-final.txt), week/month controls, retained month screenshots. | Native competitor comparison unfinished. |
| Two-step rescue with a visible marker | Domain and browser history checks pass. Rescue is unlimited. | The two actions begin on the selected day's detail. Calendar navigation is separate. |
| Required performance measurements | [Deployed Lighthouse](performance.json), [offline timings](offline-integration.json), and bundle check. | Measurements use desktop engines. Installed-phone timing is missing. |
| Photograph real food and correct an estimate | [Live image check](live-photo.json) returns 480 kcal and 25 g protein in 10.734 seconds. Editable numeric fields ship. | A published food image substitutes for physical camera capture; “few seconds” is not proven. |
| Model unavailable: manual meal entry and explanation | Browser fallback checks pass in both engines. | No claim that the model is always available. |
| Six one-tap habits and strict streak | Domain tests and browser checks pass; deliberate partial-completion fault fails. | None identified in the exercised behavior. |
| Missed day resets streak and shows missing habits | Domain tests and month-detail checks pass. Today remains open until midnight. | Physical-device behavior unverified. |
| One rest per week, deliberate confirmation, visible allowance | Domain, browser, and database race checks pass. | Rest preserves the count; it does not add a completed day. |
| Calculated, editable targets | Onboarding, settings, and formula checks pass. | Water and steps use planning defaults; no single standard formula supports all targets. |
| Smoothed weight; skipped weight does not affect streak | Date-aware smoothing; trend hides the initial raw seed. | Raw inputs remain stored for calculation. |
| Local midnight, 23:59, travel, DST | Domain tests cover boundaries and date-line changes in both directions. | Physical travel/resume behavior is unverified. |
| No notifications | No notification, push, email, or badge integration ships. | None identified in source review. |
| Photo discarded without storage | [Linux process trace](photo-process-trace.json), marker scan, and synthetic detection controls pass. Account data stays unchanged. | Deleted-file contents, memory-mapped writes, deployed-host behavior, and provider retention are unobserved. |
| Past-day backfill and visible marker | Domain and calendar checks pass; supported dates start at 2000-01-01. | “Any past day” is bounded by the shipped date guard. |
| Offline changes, reconnect, no duplicate or lost writes | [Real service worker and isolated Neon check](offline-integration.json) passes for both browser engines. | WebKit uses origin suspension; physical airplane mode remains unfinished. |
| No page scroll at 390×844 | Geometry checks report zero home overflow; screenshots are retained. | Physical safe-area behavior remains unverified. |
| Each piece beats its named native competitor | Official site and App Store references are retained. | Native installation/use and piece-by-piece blind wins are unfinished. |
| Penguin and home beat Duo in blind comparisons | [Two critics prefer Pip](blind/reviews.md). | They recognize Duo and flag framing. Neither strict mascot superiority nor the home comparison is proven. |
| Original hand-authored SVG | Source components and generated SVG files are retained. | Reviews identify no specific matching penguin; this does not prove resemblance to every existing mascot is impossible. |
| Warm copy without guilt | Visible strings are reviewed; the missed-day state stays forgiving. | No strict blind copy comparison is recorded. |
| Credential absent from Git, logs, and client | Exact-value and portable scans pass, including compressed trace evidence. | The initial goal read exposed it in private tool output. Rotation is not recorded. |
| Lint, types, unit, integration, E2E, build | [Final combined check](check-final.txt), [integration check](integration-final.txt), [nine browser checks](e2e-final.txt). | These capture the shipped implementation; doc-only edits do not imply new physical evidence. |
| Clean commits, push, delivery | Implementation and verification commits are pushed. Michael now authorizes a squash merge into `main`. | The former merge ban is superseded. Physical acceptance stays unfinished. |

## Recorded performance

| Measurement | Result | Scope |
|---|---|---|
| FCP and interaction readiness | 0.766 seconds | Public entry screen; 150 ms RTT, 1.6 Mbps, 4× CPU slowdown. |
| Lighthouse scores | 100 performance, 100 accessibility, 100 best practices | Desktop Lighthouse mobile profile; no current PWA score category. |
| Browser script | 21,411 gzip bytes; 40,960-byte limit | Actual generated phone bundle. |
| Offline open and habit update | Chromium: 39 ms / 1 ms; WebKit: 22 ms / 2 ms | Desktop engines; browser offline / origin suspension respectively. |
| Four camera actions | 631 ms | Simulated camera and mocked estimate; no physical timing claim. |
| Deployed real-image meal flow | 10.734 seconds total; 156 ms outside the request | Request includes upload, startup, and model work; thinking time is not isolated. |

## Privacy and credential limits

The process trace covers a local Linux ARM64 estimator and its SDK descendants.
It records file calls and write-family calls while suppressing data buffers.
Synthetic controls confirm detection of a file write, its deletion, and a content match.
The marker scan checks final model-directory files under 20 MB.
It finds no image markers, and account state and operation-row count stay unchanged.

The audit does not inspect deleted-file contents, memory-mapped writes, the Vercel host, or provider retention.
These limits prevent an absolute “no image ever reaches any storage” claim.

The initial source-goal read prints a live database credential into private tool output.
Repository and client scans find no copy. Those scans cannot undo that exposure.
Credential rotation remains an owner follow-up; no rotation is recorded.
