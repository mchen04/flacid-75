# Flaccid75 delivery ledger

## Scope and decisions

Goal read 2026-09-08. Preview deployment and branch push are authorized. No PR or merge.
The physical iPhone is paired but `xcrun devicectl list devices` reports unavailable.
Native competitor installation/use and physical Safari checks remain blocked; website captures do not replace them.
The secret-bearing goal stays outside this repository. Environment files are ignored before initialization.

## Design, before implementation

Intent: open today and see what remains; log lunch; recall the week; repair an honest omission.
Palette: milk #fffaf3, ink #45434f, blush #f2ccd3, rose #9d4f68, mist #dcebe8, lilac #e8e1f1.
Type: rounded system sans for controls; Georgia for a quiet diary-like greeting. No font requests.
Layout: a pocket diary, with a horizontal mascot greeting, six compact habit cards, food action, and weekly strip.
The six cards are mandated by the brief. Vary their interiors by purpose; avoid generic dashboard charts.
Pip is a handmade pebble-shaped penguin with plum flippers, a heart-shaped face, tiny peach feet, and a small leaf tuft.
Poses: hello, cheering, cozy. All state copy remains kind after a missed day.

## Competitors selected before building

| Piece | Competitor | What to beat | Source |
|---|---|---|---|
| Today's food | Cronometer | Visible totals; direct diary editing | https://support.cronometer.com/hc/en-us/articles/360018593112-Mobile-Diary-Overview |
| Photo estimate and trend | MacroFactor | Correctable photo estimates; weight smoothing | https://macrofactor.com/ai-food-logging/ |
| Habits and calendar | Streaks | Immediate completion and compact history | https://streaksapp.com/ |
| Workout completion | Strong | Clear completion state | https://www.strong.app/ |
| Warm daily companion | Finch | Mascot gives the interface a friendly center | https://finchcare.com/ |
| Mascot / home cuteness | Duolingo | Clear expressions and strong character silhouette | https://design.duolingo.com/ |

No native-use or blind-win claim yet. Capture and critic results follow below.

## Tap budgets

| Intent | Actions after unlocked launch | Budget |
|---|---|---|
| Mark a habit | Tap its card/check | 1 |
| Add water | Tap +250 ml | 1 |
| Photograph lunch | Open app, camera, shutter, confirm | 4 using the in-app camera; first-use permission is additional |
| Correct an estimate | Food list, correct, edit, save | 4; keyboard keystrokes excluded |
| Spend rest | Rest, confirm | 2 |
| Rescue a selected broken day | Rescue, confirm | 2; calendar selection is navigation |
| Backfill | Week/month, day, habit | 3 |
| Morning weight | Prompt, enter, save | 3 |
| Skip weight | Not today | 1 |
| Weekly progress | Week tab | 1 |
| Monthly progress | Week tab, Month | 2 |

## Calculation choices

Adult female Mifflin–St Jeor: RMR = 10×kg + 6.25×cm − 5×age − 161.
Source: https://pubmed.ncbi.nlm.nih.gov/2305711/
Activity multipliers 1.2/1.375/1.55/1.725 are transparent planning defaults, not measured expenditure.
Goal adjustment: maintain 0%, lose −10%, gain +10%; range ±100 kcal, lower bound 1500 kcal.
Protein: 1.6 g/kg, rounded to 5 g. Source: https://pubmed.ncbi.nlm.nih.gov/28698222/
Water: 30 ml/kg, rounded to 250 ml, clamped 1500–3500 ml; a planning heuristic, not a universal clinical formula.
EFSA context: https://www.efsa.europa.eu/enIE/safe2eat/your-nutrition-needs
Steps: activity-based 6000/7000/8000/10000, scaled 0.8 above age 65; a starting plan, not a validated individual equation.
No accepted standard computes all four targets from these stats. The app must state this rather than invent one.
All targets remain editable. A 2% smoothed weight shift refreshes calculated fields; explicit overrides survive.
Weight uses time-aware exponential smoothing with a seven-day time constant.

## Time and storage choices

UTC event timestamps and fixed civil day labels persist. Device timezone changes re-anchor the current day;
they never remap old history, skip a streak day, or award a duplicate day. Subsequent local midnights advance days.
Monday–Sunday defines the rest allowance. Rest and rescue preserve a chain but do not add completed-habit days.
Today's incomplete day leaves yesterday's earned streak visible until midnight. A missed closed day resets it.
Six manual checkmarks are attestations; they never fabricate water or food totals. Logged totals can also meet goals.
Operations have UUIDs. PostgreSQL serializes the single account and deduplicates retried writes in one transaction.
Local durable writes render first. Reconnection rebases unacknowledged operations onto the server state.

## Claude credentials and privacy

Claude Max is signed in. Official June 15 update permits Agent SDK subscription usage:
https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan
Only the server runs the SDK, without tools, sessions, history persistence, or image logs.
Provider-side retention is outside the app's control; do not assert a provider zero-retention guarantee.


## Verification and corrections

The database migrations applied successfully to Neon. Integration tests use isolated temporary schemas.
Three duplicate water deliveries produce one 250 ml addition and one operation row.
Three simultaneous independent habit updates survive. The weekly rest race rejects the second rest.
Deliberate faulty variants (partial-day completion, unlimited rests, and travel remapping) all fail the tests.

The first browser pass found a local WebKit cookie issue, an incorrect viewport fixture, and an ambiguous test locator.
All were corrected. Final tests cover both Chromium and WebKit at 390×844.
The calendar now leaves pre-onboarding days neutral. Trend charts use date spacing and omit the raw seed weight.
A midnight tap resolves the current day at the instant of the action. Undo keeps the original action date.
A discovered stale Undo handler after meal editing is fixed; Undo restores the previous meal values.

The first framework client shipped 272,691 gzip bytes and reached interaction at 2.37 seconds.
Removing unused client validation reduced this to 186,504 bytes.
A Next.js static route with a Preact phone renderer reduces this to about 21 KB gzip.
Critical CSS is inline. Local Lighthouse records 100 performance, 100 accessibility, and 100 best practices.
Its measured FCP and interaction readiness are 0.908 seconds, with 150 ms RTT, 1.6 Mbps and 4× CPU slowdown.
The enforced browser JavaScript budget is 40 KB gzip. The checked bundle is the actual script loaded by the page.

The real offline check uses the actual service worker and an isolated Neon schema.
Chromium opens offline in 39 ms; its habit change updates the DOM in 1 ms.
WebKit opens with the origin server suspended in 22 ms; its habit update takes 2 ms.
Each queues three operations, survives reload, and retains exactly one copy after replay.
The view is 390×844, with 844-pixel page height and zero home-content overflow.
These are desktop-engine measurements, not physical iPhone timings.

WebKit's browser-level offline emulation fails on navigation; the origin-suspension check exercises the real cache instead.
A missing manifest cache response also prevented page load completion. The worker now serves the manifest offline.
The browser issue is consistent with https://github.com/microsoft/playwright/issues/42273 but is not proven to be that exact defect.

Claude subscription estimation works both locally and in the Vercel preview.
The live preview text request returns 230 kcal and 14 g protein in 7.279 seconds including startup and model time.
A real CC0 food photo from Andy Li returns 420 kcal and 25 g protein in 9.668 seconds.
The photo audit watches the model configuration directory and scans its content for binary and base64 image markers.
It finds zero markers; account state and operation-row count remain unchanged. This is not a kernel-wide trace.
SDK files contain credential/configuration/session-process metadata; session conversation persistence is disabled.
Provider retention is outside this application's control.

The normal photo flow now uses an in-app live camera: open, camera, shutter, confirm.
First-use camera permission adds a one-time OS action. The file-picker fallback can require an extra OS confirmation.
The camera stream stops on capture, closure, and suspension. No captured image is written to disk.

## Deployment constraints

On a fresh project, Vercel promoted the first deployment to production even with an explicit preview target.
Those bootstrap deployments contained no configured production account environment and failed closed.
A subsequent deployment has API target null (preview). Bootstrap production deployments are removed during final cleanup.
Preview credentials are sensitive environment values; model refresh credentials are encrypted in the database.
No PR or merge is performed.

## Evidence limits

Official website and App Store screenshots are captured and retained for all named competitors.
They do not prove native installation or actual use. Physical iPhone access remains unavailable.
Two fresh critics choose Pip, but recognize Duo and flag framing bias. Strict blind wins are not claimed.
Full native piece-by-piece comparisons and the Duolingo home-screen comparison remain unfinished.
Current Lighthouse removes the PWA category: https://github.com/GoogleChrome/lighthouse/issues/15535 .
Chrome's installability check returns zero errors; the physical home-screen install still needs observation.

## Final preview checks

Stable preview: https://flaccid75-preview.vercel.app .
The deployed cold-load test scores 100 for performance, accessibility, and best practices.
FCP and interaction readiness are 0.766 seconds at 150 ms RTT, 1.6 Mbps, and 4× CPU slowdown.
This Lighthouse run measures the public entry screen, not a physical installed app.
The browser payload is 21,411 gzip bytes against a 40,960-byte limit.
The fake-camera test performs the four-action path in 631 ms with a stubbed model response.
The real deployed photo estimate returns 480 kcal and 25 g protein in 10.734 seconds.
The request takes 10.578 seconds; browser work outside it takes 156 ms.
This request includes upload, server startup, and model time; it does not isolate model thinking.
The source is a real published food photo, not a photograph taken on the unavailable physical phone.
Nine browser checks pass across Chromium and WebKit. Database concurrency and deliberate mutation checks pass.
The final physical-device check still reports the paired iPhone unavailable.
Automated git deployment is disabled so a code push cannot promote the preview to production.

The portable secret scan initially misread a blank environment assignment as the next line's value.
Its parser now keeps whitespace inside a single line. LF/CRLF empty fixtures pass; synthetic secrets still fail.
The scanner and its instructions are corrected in the active local skill directory.
Exact credential scans find no values in tracked files, commit blobs, or the browser script.
The existing authorized GitHub account already matches this repository; no account switch or rebase is needed.

The code is committed in two verified waves and pushed to the authorized repository.
All outgoing commits pass the portable history scan and the exact-value credential scan.
No pull request or merge occurs.
Only preview deployments remain after bootstrap cleanup.
A private install note outside Git contains the stable URL and passphrase.
The physical phone stays unavailable; this runtime also lacks control of the iPhone Mirroring UI.

## Continued privacy verification

The previous goal turn made progress: it shipped verified code and the stable preview.
The next device check still reports the physical iPhone unavailable.
A local Linux container provides an independent route to process tracing.
Its disk is full, so the audit uses temporary memory filesystems without deleting existing project data.
The real estimator and its SDK descendants produce 64,200 retained syscall lines.
The response is 500 kcal and 22 g protein in 8.180 seconds with tracing enabled.
The trace records file operations and write-family calls; syscall data buffers are suppressed.
A synthetic text file proves that a write and its later deletion are visible.
A separate synthetic content match proves the marker scanner can fail.
Both controls pass. No image markers appear in the final model files.
Account state and operation-row count stay unchanged.
The file destinations are compiler cache, SDK configuration/credential/process metadata, and the numeric audit report.
The full compressed trace and extracted write calls are retained.
Reference for buffer suppression and descriptor decoding: https://man7.org/linux/man-pages/man1/strace.1.html .
This is Linux ARM64 in a local container, not instrumentation of the Vercel host.
Deleted-file contents, memory-mapped writes, and provider retention remain outside this check.
No physical-device or strict blind-comparison requirement is marked complete.

The exact-value credential scan now decompresses gzip artifacts before scanning them.
A synthetic compressed control escapes a raw-byte check and is caught after decompression.
This protects the retained syscall trace as well as ordinary text and client files.
