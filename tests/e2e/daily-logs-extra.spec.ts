import {test, expect} from './fixtures';
import {open, seed, todayIn, complete, op} from './helpers';
import {apply, streaks, type State} from '../../lib/domain';

test('logged walks append to legacy time, rapid submissions add once, and completion preserves all entries',async({page})=>{
 let state=seed();const today=todayIn();state=apply(state,op(today,{type:'session',habit:'walk',seconds:300,done:true}));delete state.days[today].walkLog;
 const box=await open(page,state,{hash:'walk'});
 await page.getByLabel('Walk minutes').fill('15');
 await page.getByRole('button',{name:'Log walk',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
 await expect.poll(()=>Object.keys(box.state.days[today].walkLog??{}).length).toBe(2);
 await expect.poll(()=>box.state.days[today].sessions?.walk?.seconds).toBe(1200);
 await page.getByRole('checkbox',{name:'Walk complete'}).click();
 await page.reload();await expect(page.getByRole('checkbox',{name:'Walk complete'})).not.toBeChecked();
 await expect(page.getByRole('group',{name:'Walk entries'}).locator('.meal-row')).toHaveCount(2);
 await page.getByRole('checkbox',{name:'Walk complete'}).click();await page.reload();
 await expect(page.getByRole('checkbox',{name:'Walk complete'})).toBeChecked();
 await expect(page.getByRole('group',{name:'Walk entries'})).toContainText('20:00 total');
});

test('manual and legacy meals keep distinct descriptions, totals and edits after reload',async({page})=>{
 const today=todayIn();const state=apply(seed(),op(today,{type:'meal',mealId:crypto.randomUUID(),calories:100,protein:5}));const box=await open(page,state,{hash:'food'});
 await page.getByRole('button',{name:'Log a meal',exact:true}).click();await page.getByRole('button',{name:'Enter numbers'}).click();
 await page.getByLabel('Description',{exact:true}).fill('Soup with beans');await page.getByLabel('Calories · kcal').fill('350');await page.getByLabel('Protein · g').fill('20');
 await page.getByRole('button',{name:'Add to today'}).evaluate((b:HTMLButtonElement)=>{b.click();b.click();});
 await expect.poll(()=>Object.keys(box.state.days[today].meals).length).toBe(2);await page.reload();
 await expect(page.getByRole('group',{name:'Meals'})).toContainText('Meal 1');await expect(page.getByRole('group',{name:'Meals'})).toContainText('Soup with beans');
 await page.getByRole('button',{name:'Correct meal 2'}).click();await expect(page.getByLabel('Description',{exact:true})).toHaveValue('Soup with beans');
 await page.getByLabel('Description',{exact:true}).fill('Soup and bread');await page.getByLabel('Calories · kcal').fill('400');await page.getByRole('button',{name:'Save',exact:true}).click();await page.reload();
 await expect(page.locator('.food-copy .big')).toHaveText('500 kcal');
 await page.getByRole('button',{name:'Correct meal 1'}).click();await expect(page.getByLabel('Calories · kcal')).toHaveValue('100');await page.getByLabel('Description',{exact:true}).fill('Fruit');await page.getByRole('button',{name:'Save',exact:true}).click();await page.reload();
 await expect(page.getByRole('group',{name:'Meals'})).toContainText('Fruit');await expect(page.getByRole('group',{name:'Meals'})).toContainText('Soup and bread');
});

test('every activity and rest completion control works with Enter and Space across reloads',async({page})=>{
 const today=todayIn();const box=await open(page,complete(seed(),today));
 for(const habit of ['Walk','Workout','Abs','Floss']){
  const control=page.getByRole('checkbox',{name:habit+' complete',exact:true});
  await control.focus();await page.keyboard.press('Enter');await expect(control).not.toBeChecked();await page.reload();await expect(control).not.toBeChecked();
  await expect.poll(()=>streaks(box.state,today).current).toBe(0);
  await page.getByRole('button',{name:'Open '+habit.toLowerCase(),exact:true}).click();
  const detail=page.getByRole('checkbox',{name:habit+' complete',exact:true});await detail.focus();await page.keyboard.press('Space');await expect(detail).toBeChecked();await page.reload();await expect(detail).toBeChecked();
  await expect.poll(()=>streaks(box.state,today).current).toBe(1);
  await page.getByRole('button',{name:'Home'}).click();
 }
 const rest=page.getByRole('checkbox',{name:'Rest day',exact:true});await rest.focus();await page.keyboard.press('Space');await page.reload();await expect(rest).toBeChecked();await rest.focus();await page.keyboard.press('Enter');await page.reload();await expect(rest).not.toBeChecked();
});

for(const width of [320,375])test(`affected screens and full meal details fit a ${width}px mobile viewport`,async({page})=>{
 await page.setViewportSize({width,height:640});const today=todayIn();let state:State=complete(seed(),today);
 state=apply(state,op(today,{type:'session',habit:'walk',seconds:600,done:true}));
 state=apply(state,op(today,{type:'meal',mealId:crypto.randomUUID(),description:'A'.repeat(1000),calories:100,protein:5,items:[{name:'B'.repeat(120),grams:100,calories:100,protein:5,source:'estimate'}]}));
 await open(page,state);
 const fit=async()=>{
  const bad=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('.page,.row,.meal-row,.items,.found,.completion-row,.controls,.sheet-inner')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.className));expect(bad).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  await expect(page.getByText(/\bUndo\b/)).toHaveCount(0);
 };
 for(const hash of ['','walk','workout','abs','floss','water','food','rest','meditate','focus','rewards']){await page.goto('/'+(hash?'#'+hash:''));await page.locator('.app-shell').waitFor();await fit();}
 await page.goto('/#food');await page.getByRole('button',{name:'Correct meal 1'}).click();await expect(page.getByLabel('Item name')).toHaveValue('B'.repeat(120));await fit();
 await page.screenshot({path:`evidence/local-followup/meal-edit-${width}-${test.info().project.name}.png`});
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Log a meal',exact:true}).click();await page.getByRole('button',{name:'Enter numbers'}).click();await fit();
});

test('requested filler is absent while optional meditation and focus do not affect streaks',async({page})=>{
 const box=await open(page,seed(),{hash:'meditate'});
 await expect(page.getByText('Optional · never counted toward the streak',{exact:true})).toHaveCount(0);
 await expect(page.getByText(/Sit, breathe, let the count run/)).toHaveCount(0);
 await expect(page.locator('.sr-only').filter({hasText:'does not affect the streak'})).toHaveCount(1);
 await page.goto('/#focus');await expect(page.getByText('Optional · never counted toward the streak',{exact:true})).toHaveCount(0);
 await page.goto('/#rewards');await expect(page.getByText(/socks/)).toHaveCount(0);
 expect(streaks(box.state,todayIn()).current).toBe(0);
});

test('account key reordering cannot swap walks or meal edit targets after reload',async({page})=>{
 const today=todayIn();const first='ffffffff-ffff-4fff-8fff-ffffffffffff',second='11111111-1111-4111-8111-111111111111';let state=seed();
 for(const [walkId,seconds] of [[first,420],[second,780]] as const)state=apply(state,op(today,{type:'session',habit:'walk',walkId,seconds,done:true}));
 for(const [mealId,description] of [[first,'First meal'],[second,'Second meal']])state=apply(state,op(today,{type:'meal',mealId,description,calories:100,protein:5}));
 const box=await open(page,state,{hash:'walk'});
 const reorder=()=>{box.state.days[today].walkLog=Object.fromEntries(Object.entries(box.state.days[today].walkLog!).sort());box.state.days[today].meals=Object.fromEntries(Object.entries(box.state.days[today].meals).sort());};
 reorder();await page.reload();await expect(page.getByRole('group',{name:'Walk entries'}).locator('.meal-row p')).toHaveText(['7:00','13:00']);
 await page.goto('/#food');await expect(page.getByRole('group',{name:'Meals'}).locator('.meal-row strong')).toHaveText(['First meal','Second meal']);
 await page.getByRole('button',{name:'Correct meal 1'}).click();await expect(page.getByLabel('Description',{exact:true})).toHaveValue('First meal');await page.getByLabel('Description',{exact:true}).fill('First meal edited');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>box.state.days[today].meals[first].description).toBe('First meal edited');reorder();await page.reload();
 await expect(page.getByRole('group',{name:'Meals'}).locator('.meal-row strong')).toHaveText(['First meal edited','Second meal']);
});
