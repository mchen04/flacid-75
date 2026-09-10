# Design direction and references · My Wellness

## References actually viewed
From `evidence/competitors/` (published App Store and website images, see that folder's README), opened and looked at during this task:

| File | What was taken from it |
|---|---|
| `streaks-app-0.jpg` | A single screen of large, evenly sized habit targets with one clear state each. Informed the dashboard's uniform rows and one-tap **Log**. |
| `streaks-app-1.jpg` | Stats screen: one large number, then simple bars per weekday. Kept as the shape of Progress (big streak numeral, week bars). |
| `finch-app-0.jpg`, `finch-app-2.jpg` | Warm illustrated scenes and rounded, friendly cards; celebration without pressure. Reinforced keeping the hand-drawn scenes and soft palette rather than a dashboard of numbers. |
| `duolingo-app-1.jpg` | Selectable cards with one bold accent for the chosen state and a single primary action pinned at the bottom. Informed the guided-abs routine picker and the dark primary button. |
| `strong-app-0.jpg` | A session with a running clock, a checklist of sets, and a Finish action. Directly informed the Workout page (checklist + session clock + Finish). |
| `strong-app-1.jpg` | Exercise detail with illustration and numbered instructions. Informed the guided ab routine: name, cue text, next move. |

Also viewed: the previous build's own captures (`evidence/ui/after/phone/*.png`) to keep continuity, and every new capture under `evidence/my-wellness/after/` to check the result.

## Direction
- **One visual language everywhere.** Cream ground, white cards, one apricot accent, sage for done states, lilac for rest, sky for water, the existing hand-authored scenes. Every colour, radius, space and type size is a token (`npm run scan` still passes with zero findings).
- **Dashboard first.** The home page is a list of activity rows in one shape: art, name, one line of status, a chevron that opens the page, and a separate one-tap action (Log/Undo, +Glass, +Meal, Rest). Rest, optional practices and "More" sit in labelled groups. No bottom navigation; Home, the streak badge (Progress) and Settings sit in the top bar on every page.
- **Pages, not tabs.** Each activity is a hash-addressed page (`#walk`, `#workout`, …) so the browser's back button works and any page is one tap from home.
- **Timers as the centre of a page.** A ring dial with a large tabular numeral, Start/Pause/Finish in the thumb zone, and a done card with Undo afterwards.
- **Calm gamification.** Points and milestones are visible but small: a "days to next milestone" pill on the hero, a row of stars on Progress, a points balance on Treats. Nothing scolds; a missed day reads "A day to rescue."
- **Contrast fixed by tokens.** Muted text darkened (`#6f675e`, 5.6:1 on white), accent-ink darkened (`#9c4b18`), a sage-ink added for done text, and primary buttons use ink backgrounds. The browser check `text contrast meets WCAG AA on every page` walks every text node on every page.
- **Vertical scroll is allowed, sideways never.** The page scrolls inside `.page` when its content asks; the capture script fails on any horizontal overflow or clipped element and captures the full scrolling page so nothing below the fold is hidden from review.
