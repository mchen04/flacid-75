import {test, expect} from './fixtures';
import {open, seed, todayIn} from './helpers';

test('multiple walks keep earlier times after reload and allow another timer', async ({page}) => {
 const box = await open(page, seed(), {hash:'walk'});
 await page.getByRole('button', {name:'Start', exact:true}).click();
 await page.evaluate(() => {const all=JSON.parse(localStorage.getItem('my-wellness-timers')!);all.walk.startedAt=Date.now()-600000;localStorage.setItem('my-wellness-timers',JSON.stringify(all));});
 await page.getByRole('button', {name:'Finish', exact:true}).click();
 await expect(page.getByRole('button', {name:'Start', exact:true})).toBeVisible();
 await page.getByRole('button', {name:'Start', exact:true}).click();
 await page.evaluate(() => {const all=JSON.parse(localStorage.getItem('my-wellness-timers')!);all.walk.startedAt=Date.now()-1200000;localStorage.setItem('my-wellness-timers',JSON.stringify(all));});
 await page.reload();
 await expect(page.getByRole('button', {name:'Pause', exact:true})).toBeVisible();
 await page.getByRole('button', {name:'Finish', exact:true}).evaluate((b:HTMLButtonElement)=>{b.click();b.click();});
 await expect.poll(()=>box.state.days[todayIn()]?.sessions?.walk?.seconds).toBe(1800);
 await page.reload();
 await expect(page.getByRole('group', {name:'Walk entries'}).locator('.meal-row')).toHaveCount(2);
 await expect(page.getByRole('group', {name:'Walk entries'})).toContainText('10:00');
 await expect(page.getByRole('group', {name:'Walk entries'})).toContainText('20:00');
});

test('meal descriptions and item details survive creation, individual editing and reload', async ({page}) => {
 const box=await open(page,seed(),{hash:'food'});
 await page.route('**/api/estimate',r=>r.fulfill({json:{items:[{name:'Eggs',grams:100,calories:150,protein:12,source:'usda',match:'Egg, whole',fdcId:123}],calories:150,protein:12,model:'fixture'}}));
 await page.getByRole('button',{name:'Log a meal',exact:true}).click();
 await page.getByLabel('What did you eat?').fill('Eggs with pepper');
 await page.getByRole('button',{name:'Look it up'}).click();
 await page.getByRole('button',{name:'Add to today'}).click();
 await expect(page.getByRole('group',{name:'Meals'})).toContainText('Eggs with pepper');
 await page.reload();
 await page.getByRole('button',{name:'Correct meal 1'}).click();
 await expect(page.getByLabel('Description',{exact:true})).toHaveValue('Eggs with pepper');
 await expect(page.getByLabel('Item name')).toHaveValue('Eggs');
 await page.getByLabel('Description',{exact:true}).fill('Eggs and toast');
 await page.getByLabel('Item name').fill('Eggs with toast');await page.getByLabel('Portion · g').fill('150');await page.getByLabel('Protein · g').fill('15');
 await page.getByLabel('Calories · kcal').fill('250');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>Object.values(box.state.days[todayIn()].meals)[0].calories).toBe(250);
 await page.reload();
 await expect(page.getByRole('group',{name:'Meals'})).toContainText('Eggs and toast');
 await expect(page.getByRole('group',{name:'Meals'})).toContainText('250 kcal');
 await page.getByRole('button',{name:'Correct meal 1'}).click();await expect(page.getByLabel('Item name')).toHaveValue('Eggs with toast');await expect(page.getByLabel('Portion · g')).toHaveValue('150');await expect(page.getByLabel('Protein · g')).toHaveValue('15');
 expect(Object.values(box.state.days[todayIn()].meals)[0].items?.[0]).toMatchObject({name:'Eggs with toast',grams:150,calories:250,protein:15,source:'usda',match:'Egg, whole',fdcId:123});
});

test('completion has a stable checked control in both directions after reload',async({page})=>{
 await open(page,seed());
 const toggle=page.getByRole('checkbox',{name:'Floss complete',exact:true});
 await expect(toggle).not.toBeChecked();
 await toggle.focus();await page.keyboard.press('Space');
 await expect(toggle).toBeChecked();await page.reload();await expect(toggle).toBeChecked();
 await toggle.focus();await page.keyboard.press('Space');await expect(toggle).not.toBeChecked();
 await page.reload();await expect(toggle).not.toBeChecked();
 await expect(page.getByText('Undo',{exact:true})).toHaveCount(0);
});
