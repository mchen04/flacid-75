# Blind comparison rounds, version 3

Every round: this app's screen against one reference screen, both cropped to a single phone, resized to the same 420×900 panel on the same neutral grey ground, named by a random id, order shuffled (`order.json`) and judged by a fresh critic that sees only the two files. The critic is told to judge design quality only (warmth, clarity, illustration quality, hierarchy, spacing, color discipline, pleasantness) and never to identify a product; a critic that names a product voids the round. `key.json` in each panel folder maps ids back. References: `refs/a-home.png`, `refs/a-progress.png` (the journal reference's first and second phones) and `refs/b-home.png`, `refs/b-progress.png` (the travel reference's first and second phones). App captures come from `scripts/capture-v3.mjs` (production build, 390×844 at 2×, seeded lived-in account).

## Round 1 · 2026-09-09 · first rebrand build

| Screen | Reference | Order | Winner | Critic's reason (abridged) | Recognised? |
|---|---|---|---|---|---|
| Home | A | ref, app | **App** | One accent used where it matters; calm coherent hero with path and flag; tidy breathable grid. The reference fights itself with five accents and clipped cards. | No |
| Home | B | ref, app | **App** | One warm accent, hierarchy reads in one glance; hero communicates the walk state. The reference's second card introduces a cold blue and its icons are busy multi-color glyphs. | No |
| Progress | A | ref, app | Reference | One number, one sentence, one chart, one action; the app stacks four competing units that repeat "11", cuts off a raw ISO date card, and uses green plus orange as two accents. | No |
| Progress | B | app, ref | **App** | Restraint: one accent, a single muted green for done, consistent radius and padding; the reference's palette sprawls and everything shouts at the same volume. | No |

Result: 3 wins, 1 loss. Changes for round 2, from the critiques: the streak badge is hidden on the progress tab (it duplicated the big number); kept days and bars use the accent instead of sage, and today's partial bar is the soft accent, so there is one accent; the bar chart is shorter and future tracks fade; the day-detail card shows a written date instead of ISO; the legend is a sentence; the water card shows its litres as a large numeral so the two cards fill evenly; the habit marks use the accent family instead of lilac, blue and yellow; future days in the week strip keep a white circle.

## Round 2 · 2026-09-09 · one accent, formatted dates

| Screen | Reference | Order | Winner | Critic's reason (abridged) | Recognised? |
|---|---|---|---|---|---|
| Home | A | app, ref | **App** | One accent used only for state; painterly calm hero whose dotted path carries meaning; clean two-column grid. The reference spreads yellow, pink, lavender and tan and clips its right-edge cards mid-word. | No |
| Home | B | ref, app | **App** | Hierarchy reads in one pass; one accent where action or state lives. The reference fights itself with orange in three places plus a cold blue card. | No |
| Progress | A | ref, app | Reference | "One number, one sentence, one chart, one action." The app stacks three cards plus a cut-off fourth, and the week bars and the calendar row show the same days twice. | No |
| Progress | B | ref, app | Reference | The app's big number floats with no anchor, the bars and the calendar repeat the same information, the third card is cut off, and the orange plus button competes with the orange bars. | No |

Result: 2 wins, 2 losses. Changes for round 3: the progress screen is one card and one action. The streak number lives inside the card; Week and Month switch a single component (thick bars or the calendar grid), so nothing is shown twice; the bars are buttons that select a day; the day detail sits at the bottom of the same card; the one action is a full-width dark pill ("Open today", "Backfill this day", plus "Rescue day" when it applies); the legend, the current/longest pair and the separate calendar card are gone; the date picker is a compact row. The whole screen fits 390×844 without scrolling. On the home screen the water minus moved to the value row.

## Round 3 · 2026-09-09 · progress as one card and one action

| Screen | Reference | Order | Winner | Critic's reason (abridged) | Recognised? |
|---|---|---|---|---|---|
| Home | A | app, ref | **App** | "Looks like one designer made one decision"; one accent only where it means something; restrained hero matched to the palette. The reference spreads yellow, pink, lavender and taupe and clips cards mid-word. | No |
| Home | B | app, ref | **App** | One accent, hierarchy in one pass, tones inside one warm family. The reference's cards fight each other and the header. | No |
| Progress | A | ref, app | **App** | "One clear story in one glance": big number, a week of pill bars, a sentence saying what is left, one dark button. The reference's 420 has no unit and its percentages add to 148. | No |
| Progress | B | ref, app | Reference | The reference's full-bleed illustration warms the whole page; the app is "competent but cold and mechanical", beige on beige, and has three bottom controls in three styles. | No |

Result: 3 wins, 1 loss. Changes for round 4: the progress screen opens with the hills scene (marker at the flag), with the streak number set over its sky, and the card overlaps the scene as in the travel reference; the top-bar date reads "Since <start>" so the date is not repeated; today's bar uses the same accent as kept days with its height showing completion; the date picker is a text-style row, so the dark pill is the one action.

## Round 4 · 2026-09-09 · illustrated progress header

| Screen | Reference | Order | Winner | Critic's reason (abridged) | Recognised? |
|---|---|---|---|---|---|
| Home | A | ref, app | **App** | One accent used only for state; a real hierarchy that steps down calmly; "the screen I would rather open every morning". The reference spreads five colors with no lead. | No |
| Home | B | app, ref | **App** | One warm accent spent only on what matters; the hero tells one story with one pill action. The reference's search button, cards and frame all compete. | No |
| Progress | A | app, ref | **App** | One story in one glance: big number, a landscape that visualises the journey, a week strip with a single accent, one primary action. The reference's 420 has no unit and its bars do not match their percentages. | No |
| Progress | B | app, ref | **App** | One clear job; the accent appears only where it carries meaning; the hillside frames the number without competing. The reference stacks five elements with no priority and four hues at once. | No |

Result: 4 wins, 0 losses. Every comparison won on the same build. Two critics noted that the tab read "Week" under a "Progress" title, so the tab is renamed "Progress" and one low cloud is removed from behind the streak caption; round 5 confirms the final build.

## Round 5 · 2026-09-09 · confirmation on the final build (tab renamed "Progress")

| Screen | Reference | Order | Winner | Critic's reason (abridged) | Recognised? |
|---|---|---|---|---|---|
| Home | A | ref, app | **App** | One warm accent used only where it means something; calmer, better-composed hero whose path and flag tell a small story; clear reading order. The reference spreads five colors and clips cards mid-word. | No |
| Home | B | ref, app | **App** | Every orange element means "done or do this"; reads top to bottom in one pass; "feels like one hand made it". The reference's card art carries more color than the rest of the screen. | No |
| Progress | A | ref, app | **App** | One clear story: the 11, the hills, the week strip and the status all point the same way; one accent, one dark action. The reference's 420 has no unit and its four bar colors are "a palette test". | No |
| Progress | B | app, ref | **App** | One accent spent only on streak days, today and add; quiet hero behind the card; even spacing. The reference spends orange everywhere and adds a lime banner, so "nothing stands out because everything does". | No |

Result: 4 wins, 0 losses. Two consecutive rounds (4 and 5) in which this app won every comparison. No critic identified a product in any round; no round was voided.

## Tally

| Round | Home vs A | Home vs B | Progress vs A | Progress vs B |
|---|---|---|---|---|
| 1 | App | App | Reference | App |
| 2 | App | App | Reference | Reference |
| 3 | App | App | App | Reference |
| 4 | App | App | App | App |
| 5 | App | App | App | App |

Remaining critic notes on the winning build, recorded for a later pass and not acted on here: the water and food cards have different internal rhythms; the hero card is tall on shorter phones; the "Tap again to undo" line could be lighter; the "Open any past day" row still reads as a form control; the bars could carry a "/7" caption.
