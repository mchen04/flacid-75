# My Wellness · the rules, written down

These are the defaults the app ships with. Each one is deliberate, visible in the app under Settings → How it works (`#rules`), and reversible without losing history: every rule reads state that older versions already stored, and every new field is optional on read.

## What a day is
- A day is the local calendar day in the anchored timezone (`lib/domain.ts` `dayAt`). The zone is anchored at setup. If the device's zone changes, a banner offers to re-anchor; today keeps its place and the next day starts at the new local midnight. Past days are never relabelled.
- Operations carry an ISO instant and a civil day. The server rejects an instant more than five minutes ahead of its own clock.

## Required and optional
- Seven required habits: workout, abs, walk, water, protein, calories, floss. A day is **complete** when all seven are done.
- Optional practices: meditation and focus (Pomodoro-style work/break blocks). They are logged and shown on the dashboard and never influence completion, the streak, or points (`tests/domain.test.ts` "meditation and focus are logged but never touch…").

## Completion per habit
- Workout, abs, walk, floss: done when the user says so, by finishing a session on the activity page or tapping **Log** on the dashboard. Tapping again undoes.
- Water: done when the day's millilitres reach the target (see Water by container; the minus undoes the last pour).
- Protein: done when the day's protein total reaches the target.
- Calories: done when the day's total lands inside the range [lower, upper].
- Explicit manual checks (`check` operations) on water, protein and calories are cleared by the next water or meal change so the derived value wins again.

## Rest days
- **Two planned rest days per Monday–Sunday week** (`restDaysPerWeek = 2`). Plan them ahead on the Rest page for any day up to the end of the current week, or tap **Rest** on the day. A third in the same week is refused with a message.
- A rest day **keeps** the streak exactly where it is: it is not a miss and it does not add a day. Rest is shown distinctly from a miss everywhere: the dashboard row, the Rest page, the week bars (lilac with a moon), the month grid (☾), and the day detail ("Rest keeps the streak. Not a miss.").
- History recorded under the earlier one-per-week rule stays valid and unchanged (`tests/domain.test.ts` "existing history with one rest per week is preserved…").

## Rollover
- At local midnight an unfinished day becomes a missed day and the current streak returns to zero, unless it was a rest day or is later rescued from Progress. During the day the streak shows the count as of yesterday until the day is complete.
- A timer that runs past midnight credits the day it was **started** on. The client passes the timer's start day; the domain accepts it as a backfilled past day. (Verified: `wellness.spec.ts` "local midnight rolls the day over…".)

## Points and treats
- 10 points per required habit done, plus 30 for a complete day, so a full day is 100. Rest days earn nothing and cost nothing.
- Treats are entirely user-defined (name and point cost) and can be redeemed when the balance covers them. Redeeming is idempotent per operation id, guarded against a double tap, and undoable from the day it was logged on. Nothing in the app frames food as a reward or a debt, and no thresholds are presented as science.

## Timers
- Timers store only a start instant and the time banked before the last pause (`lib/timer.ts`); elapsed time is recomputed from the clock on every render. A locked phone, a backgrounded tab, or a closed and reopened app therefore shows the right count. Interval phases (abs routines, focus blocks) are derived from elapsed time, so blocks that finish while the app is away are credited on return.
- Cues are visual by default (ring, flash, colour). Sound is off until turned on in Settings (device-local preference), and vibration follows the phone.
- The screen wake lock is requested while a timer runs, where the browser offers one.

## Water by container
- Water is stored in millilitres. Containers are named by the user and sized in her unit; the seeded default is a 30 oz Stanley (887.2 ml), with a 250 ml glass alongside.
- A pour is container size × share × count, computed by the app. A typed phrase is read by a deterministic parser (half, a quarter, three quarters, a third, most, the whole thing, refilled N times, N containers). Only when the parser cannot read it does a free model get to name the container and the share; it never returns a volume. Anything still unclear asks once with share buttons; nothing is guessed.
- One tap on the dashboard logs a whole default container. Every pour is kept in the day's log with its label, and the last pour can be undone from the dashboard or the page.
- Progress reads in her terms ("about 1½ of 3 Stanleys") next to the volume in her unit.

## Units
- Measurements are stored in kilograms and centimetres. The display unit defaults to lb and ft-in; kg and cm are one tap away in Settings. Conversion never rounds the stored value (`tests/units.test.ts`).

## Data
- Logs live in local storage under the existing key and sync to the private account. Two things are also sent to a third-party model, and only to free OpenRouter models (per-request `max_price` of zero and an id check that refuses any non-free model): a described or photographed meal, for a food estimate; and a typed water note with the container names, only when the local parser cannot read it. No other log is sent to a third party. What the provider retains is not promised by the app.

## Bounds and refusals
- Every change is checked against the account's bounds on the device before it is queued (`lib/bounds.ts`, held to the server schema by `tests/bounds.test.ts`), and forms cannot produce a change outside them.
- The account validates each change on its own: a malformed change is refused by id with a reason and never blocks the valid ones behind it. Refused changes are set aside on the device, listed under Settings with their reason, and can be discarded; everything else keeps saving.
