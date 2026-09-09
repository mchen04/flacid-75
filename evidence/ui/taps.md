# Taps from launch for every daily action

The app opens on Today. A daily action must never cost more than one tap from there.

| Action | Before | After |
| --- | --- | --- |
| Add a glass of water | 1 | 1 |
| Remove a glass | 1 | 1 |
| Open the meal log | 1 | 1 |
| Walk | 1 | 1 |
| Workout | 1 | 1 |
| Abs | 1 | 1 |
| Floss | 1 | 1 |
| Rest day | 2 (chip, then confirm) | 1 (tap, with undo) |
| Weigh in | 1 | 1 |
| See progress | 1 | 1 |
| Undo any habit | 1 | 1 |
| Trends (not a daily action) | 1 | 2 |

Rest drops from two taps to one. Trends is the only surface that costs more; it is a
weekly read, not a daily action, and it moves inside Progress so every daily control
stays in the thumb zone.

Each of workout, abs, floss and rest also gets its own tab. The tab is the game screen,
never the only way in: the Today tiles still log each habit in one tap.

## How this was verified

`node --import tsx scripts/ui-shots.mjs <out>` drives every screen at 390x844, 375x667 and
1280x900, screenshots each, and measures the one-page rule in the browser: no element scrolls and
nothing is cut off by hidden overflow. It fails when either happens - reintroducing a fixed card
height made it report `clipped: div.card.water 196>132` at all three sizes.

`node --import tsx scripts/ui-interactions.mjs` proves the taps: three water taps each raise the
level (88 -> 77 -> 66 -> 55) and change the reading, logging a meal raises the fill in the bowl,
workout, abs and floss each log from Today in one tap and their tab holds the finished pose, rest
logs in one tap and offers an undo, and the plus sits at dx 0, dy 0 inside its circle.
