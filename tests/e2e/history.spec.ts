import {test,expect} from './fixtures';
import {addDays} from '../../lib/domain';
import {open,seed,todayIn} from './helpers';
test('rest in one tap with undo, two per week, planned ahead; backfill, rescue, targets and trends',async({page})=>{
 const today=todayIn(),past=addDays(today,-1);const box=await open(page,seed(1));
 // Rest is one tap, undoable with one more, and never a confirmation dialog.
 await page.getByRole('checkbox',{name:'Rest day'}).click();await expect(page.locator('dialog[open]')).toHaveCount(0);await expect(page.getByRole('checkbox',{name:'Rest day'})).toHaveAttribute('aria-checked','true');await expect(page.getByRole('heading',{name:'Rest day.'})).toBeVisible();await expect(page.getByText('Resting today · the streak stays')).toBeVisible();
 await page.getByRole('checkbox',{name:'Rest day'}).click();await expect(page.getByText('2 of 2 left this week')).toBeVisible();
 // Plan the week: two rest days, a third refused; the page says so.
 await page.getByRole('button',{name:'Open rest'}).click();await expect(page.getByRole('heading',{name:'Rest days'})).toBeVisible();
 // The page body is a lazily loaded chunk: wait for the week list itself before counting its rows.
 await page.getByRole('group',{name:'This week'}).waitFor();
 const free=page.locator('.plan-row .row-action[aria-checked="false"]:not([disabled])');await expect.poll(()=>free.count()).toBeGreaterThanOrEqual(2);
 await free.nth(0).click();await expect(page.getByText(/1 rest day left this week/)).toBeVisible();await free.nth(0).click();await expect(page.getByText('Both rest days planned.')).toBeVisible();
 expect(Object.values(box.state.days).filter(d=>d.rest)).toHaveLength(2);
 await expect(page.locator('.plan-row .row-action[aria-checked="false"]:not([disabled])')).toHaveCount(0);
 await page.screenshot({path:`evidence/my-wellness/rest-planned-${test.info().project.name}.png`});
 // Progress: a missed day can be rescued and backfilled; markers are honest.
 await page.getByRole('button',{name:/day streak\. Open progress/}).click();await page.getByLabel('Open any past day').fill(past);await expect(page.getByText('Not checked: Workout, Abs, Walk, Water, Protein, Calories, Floss.')).toBeVisible();await page.getByRole('button',{name:'Rescue day',exact:true}).click();expect(box.state.days[past]?.rescued??false).toBe(false);await page.getByRole('button',{name:'Rescue this day'}).click();await expect(page.getByRole('button',{name:past+' rescued backfilled',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Backfill this day'}).click();await expect(page.getByText(`Editing`)).toBeVisible();await page.getByRole('checkbox',{name:'Workout complete'}).click();await expect(page.getByRole('checkbox',{name:'Workout complete'})).toHaveAttribute('aria-checked','true');expect(box.state.days[past].backfilled).toBe(true);expect(box.state.days[past].checks.workout).toBe(true);
 await page.getByRole('button',{name:'Back to today'}).click();await expect(page.getByRole('checkbox',{name:'Workout complete'})).toHaveAttribute('aria-checked','false');
 await page.getByLabel('Settings').click();await page.getByRole('button',{name:'Daily targets'}).click();await page.getByLabel('Protein · g',{exact:true}).fill('125');await page.getByLabel('Walk · minutes').fill('45');await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('0 kcal · 0/125 g')).toBeVisible();await expect(page.getByText('45 min today')).toBeVisible();
 await page.getByRole('button',{name:/day streak\. Open progress/}).click();await page.getByRole('tab',{name:'Trends'}).click();await expect(page.getByText('Two weigh-ins start a trend')).toBeVisible();await page.screenshot({path:`evidence/my-wellness/trends-${test.info().project.name}.png`});
});
