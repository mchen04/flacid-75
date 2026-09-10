# Evidence index

Version 4 (My Wellness, 2026-09-10; repaired after independent review 164, fresh review pending, not shipped): start with [my-wellness/ACCEPTANCE.md](my-wellness/ACCEPTANCE.md) (scope matrix 1–19, commands, limitations), [my-wellness/RULES.md](my-wellness/RULES.md) and [my-wellness/DESIGN.md](my-wellness/DESIGN.md); captures under `my-wellness/before/` and `my-wellness/after/`. Earlier evidence below is retained unchanged.

Version 3 (rebrand): start with [ACCEPTANCE-V3.md](ACCEPTANCE-V3.md), the version 3 section of [LEDGER.md](LEDGER.md), the blind rounds in [blind/v3/rounds.md](blind/v3/rounds.md), and the `v3/` folder (token scan, mascot scan, icon hashes, transient check, captures).

Version 2 (gamify): start with [ACCEPTANCE-V2.md](ACCEPTANCE-V2.md), the version 2 section of [LEDGER.md](LEDGER.md), the mascot rounds in [blind/v2/rounds.md](blind/v2/rounds.md), [check-v2.txt](check-v2.txt), [live-estimate.json](live-estimate.json) and [secret-check.json](secret-check.json).

Start with the [acceptance record](ACCEPTANCE.md), [delivery ledger](LEDGER.md), and [delivery note](DELIVERY.md).
They describe the shipped implementation and its gaps.
**Physical iPhone verification remains unfinished**, including installation, airplane mode, Safari behavior, and real-device timing.

## Evidence for the shipped implementation

| Question | Primary capture | Meaning and limit |
|---|---|---|
| Does the implementation pass its checks? | [check-final.txt](check-final.txt), [integration-final.txt](integration-final.txt), [e2e-final.txt](e2e-final.txt) | Lint, types, unit, build, database integration, and nine browser checks pass. These are retained implementation captures. |
| Is the client within budget? | [budget-current.json](budget-current.json) | Actual generated script; 21,411 gzip bytes against 40,960. |
| How fast is the preview entry? | [performance.json](performance.json), [lighthouse-current.json](lighthouse-current.json) | Throttled desktop Lighthouse profile, public entry screen. Physical timing is missing. |
| How does the local entry compare? | [performance-local.json](performance-local.json), [lighthouse-local.json](lighthouse-local.json) | Local server measurement, separate from the deployed result. |
| Does the manifest qualify for installation? | [pwa.json](pwa.json) | No Chromium installability errors; `physicalInstallVerified` is false. |
| Do offline writes replay correctly? | [offline-integration.json](offline-integration.json), [offline-final-log.txt](offline-final-log.txt) | Real worker and isolated Neon schema. WebKit uses origin suspension. |
| Do real database races preserve changes? | [integration-final.txt](integration-final.txt) | Duplicate delivery, concurrent checks, weekly rest race, invalid range. |
| Can the tests detect deliberate faults? | [mutation.json](mutation.json) | All three injected faults are caught. |
| Does the camera path fit four actions? | [camera-actions.json](camera-actions.json), [camera-estimate.png](camera-estimate.png) | Simulated camera with mocked model; physical timing is missing. |
| Does the deployed model estimate a real food image? | [live-photo.json](live-photo.json), [live-photo-estimate.png](live-photo-estimate.png) | Real Claude request and published food image; numeric save uses an isolated browser fixture. |
| What does the process write? | [photo-process-trace.json](photo-process-trace.json), [photo-write-calls.txt](photo-write-calls.txt), [photo-syscalls.txt.gz](photo-syscalls.txt.gz) | Local Linux trace, with buffers suppressed. Synthetic controls pass; deleted-file contents and mapped writes remain outside scope. |
| Does the gate protect the preview? | [deployment-check.json](deployment-check.json) | Unauthorized reads/writes and cross-origin writes fail; verified client matches the deployed script at capture time. |
| Are known credentials absent? | [secret-check.json](secret-check.json), [portable-secret-scan.txt](portable-secret-scan.txt), [history-secret-scan.txt](history-secret-scan.txt) | Scope and counts belong to each scan. Private initial tool-output exposure remains a separate unresolved incident. |
| Did the mascot win a strict blind comparison? | [blind/reviews.md](blind/reviews.md) | No. Both critics prefer Pip, but recognize Duo and identify framing bias. |

`home-complete-*`, `month-*`, `trends-*`, and `real-offline-*` retain Chromium and WebKit screenshots.
[The overview](screens-overview.png) collects several of those views.
The [competitor records](competitors/README.md) identify published reference images; they do not prove native use.

## Historical captures and diagnostics

Raw command captures stay unchanged so failures and earlier measurements remain visible.
File names such as “final” describe the capture's implementation stage, not completion of every original goal requirement.

| Files | How to read them |
|---|---|
| `check-wave*`, `build-wave2.txt`, `e2e-wave*` | Earlier checks. Use the final implementation captures above for the shipped behavior. |
| [budget-early.txt](budget-early.txt) | Earlier 186,504-byte client with a 266,240-byte limit. This is command output, not JSON or the current budget. |
| `deployment-*.txt` | CLI build/deployment records, including bootstrap attempts. Some recorded endpoints are removed. Use [preview-url.txt](preview-url.txt). |
| `offline-*-log.txt`, `offline-commit-navigation.txt`, `offline-origin-suspended.txt`, `offline-webkit-*.txt` | Diagnostics, including failed attempts. They are not evidence that every offline mode passes. |
| `offline-*-requests.json` | Request-event snapshots from a particular run. No request bodies are retained. |
| `offline-origin-integration.json` | Earlier passing origin-suspension capture; current summarized replay evidence is `offline-integration.json`. |
| [preview-estimate.json](preview-estimate.json) | Earlier real text estimate against an earlier preview. |
| [photo-audit.json](photo-audit.json) | Earlier macOS model-directory watcher and marker scan. The later Linux process trace has broader syscall evidence and explicit limits. |
| [push-before-merge.json](push-before-merge.json) | Historical push snapshot from before Michael authorizes merging. Its `merged: false` value is not the current integration policy. |
| `home-initial.png`, `offline-chromium.png`, `offline-webkit.png` | Earlier visual captures; use the named final/offline captures above for the verified shipped behavior. |
| `integration.json` | Earlier database check. The final command capture contains the expanded race and validation checks. |

Reports are scoped observations, not guarantees about all devices or provider behavior.
Rerunning a script can replace its report; retain the command result and inspect the diff before committing refreshed evidence.
