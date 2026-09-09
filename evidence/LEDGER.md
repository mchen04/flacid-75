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
| Photograph lunch | Open app, camera, shutter, confirm | 4; OS camera review may add a device-dependent tap |
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
