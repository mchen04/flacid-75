import {test, expect} from './fixtures';
import {open, seed, todayIn, op, complete} from './helpers';
import {apply} from '../../lib/domain';

for (const checked of [true, false]) test(`R1 remove walks preserves independent completion ${checked}, totals and reload`, async ({page}) => {
 const day=todayIn();let state=complete(seed(),day);
 for(const seconds of [18000,1800])state=apply(state,op(day,{type:'session',habit:'walk',seconds,done:true}));
 state=apply(state,op(day,{type:'check',habit:'walk',value:checked}));
 const box=await open(page,state,{hash:'walk'});
 await page.setViewportSize({width:320,height:740});
 await expect(page.getByText('330 minutes total',{exact:true})).toBeVisible();
 const remove=page.getByRole('button',{name:'Remove walk 1',exact:true});
 await expect(remove).toBeVisible();await remove.focus();await page.keyboard.press('Enter');
 await expect(page.getByText('30 minutes total',{exact:true})).toBeVisible();
 await expect.poll(()=>box.state.days[day].sessions?.walk?.seconds).toBe(1800);
 await page.reload();await expect(page.getByRole('checkbox',{name:'Walk complete',exact:true})).toBeChecked({checked});
 await expect(page.getByRole('group',{name:'Walk entries'}).locator('.meal-row')).toHaveCount(1);
 await page.goto('/');await expect(page.locator('.row').filter({has:page.getByRole('checkbox',{name:'Walk complete',exact:true})})).toContainText('30 min');
 await page.goto('/#walk');await page.getByRole('button',{name:'Remove walk 1',exact:true}).click();
 await expect.poll(()=>Object.keys(box.state.days[day].walkLog??{}).length).toBe(0);
 await page.reload();await expect(page.getByRole('checkbox',{name:'Walk complete',exact:true})).toBeChecked({checked});
 await expect(page.getByRole('group',{name:'Walk entries'})).toHaveCount(0);
 expect(box.state.days[day].sessions?.walk).toBeUndefined();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

const chicken={name:'Chicken',grams:100,calories:165,protein:31,source:'usda' as const,match:'Chicken breast',fdcId:123};
const rice={name:'Rice',grams:100,calories:130,protein:3,source:'estimate' as const};
function meals(){const day=todayIn(),id=crypto.randomUUID(),other=crypto.randomUUID();let state=apply(seed(),op(day,{type:'meal',mealId:id,description:'Chicken and rice',calories:295,protein:34,items:[chicken,rice]}));state=apply(state,op(day,{type:'meal',mealId:other,description:'Soup',calories:200,protein:10}));return {state,day,id,other};}

test('R1 positive portion changes scale nutrition and persist details without changing other meals',async({page})=>{
 const {state,day,id,other}=meals();const box=await open(page,state,{hash:'food'});
 await page.getByRole('button',{name:'Correct meal 1'}).click();
 await page.getByLabel('Portion · g').nth(0).fill('200');
 await expect(page.getByLabel('Calories · kcal').nth(0)).toHaveValue('330');
 await expect(page.getByLabel('Protein · g').nth(0)).toHaveValue('62');
 await page.getByLabel('Portion · g').nth(1).fill('50');
 await expect(page.getByLabel('Calories · kcal').nth(1)).toHaveValue('65');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>box.state.days[day].meals[id].calories).toBe(395);
 await page.reload();await expect(page.getByRole('group',{name:'Meals'})).toContainText('395 kcal · 63.5 g protein');
 await page.getByRole('button',{name:'Correct meal 1'}).click();
 await expect(page.getByLabel('Portion · g').nth(0)).toHaveValue('200');
 expect(box.state.days[day].meals[id].items?.[0]).toEqual({...chicken,grams:200,calories:330,protein:62});
 expect(box.state.days[day].meals[other]).toEqual(state.days[day].meals[other]);
});

test('R1 removing individual and last meal items clears details and totals across reload at 320 px',async({page})=>{
 const {state,day,id,other}=meals();const box=await open(page,state,{hash:'food'});
 await page.setViewportSize({width:320,height:740});
 await page.getByRole('button',{name:'Correct meal 1'}).click();
 const remove=page.getByRole('button',{name:'Remove item 1: Chicken',exact:true});await expect(remove).toBeVisible();await remove.focus();await page.keyboard.press('Space');
 await expect(page.getByLabel('Item name')).toHaveValue('Rice');
 await expect(page.locator('.sum')).toContainText('130 kcal · 3 g protein');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`evidence/review-r1/items-320-${test.info().project.name}.png`,fullPage:true});
 await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>box.state.days[day].meals[id].items?.length).toBe(1);
 await page.reload();await page.getByRole('button',{name:'Correct meal 1'}).click();
 await page.getByRole('button',{name:'Remove item 1: Rice',exact:true}).click();
 await expect(page.locator('.sum')).toContainText('0 kcal · 0 g protein');
 await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>box.state.days[day].meals[id].items).toEqual([]);
 await page.reload();await expect(page.getByRole('group',{name:'Meals'})).toContainText('Chicken and rice');
 await expect(page.getByRole('group',{name:'Meals'})).toContainText('0 kcal · 0 g protein');
 expect(box.state.days[day].meals[id]).toEqual({description:'Chicken and rice',calories:0,protein:0,items:[]});
 expect(box.state.days[day].meals[other]).toEqual(state.days[day].meals[other]);
});

test('R1 zero portions remain finite, clear-and-type keeps the density, and saved zero can be corrected',async({page})=>{
 const {state,day,id}=meals();const box=await open(page,state,{hash:'food'});
 await page.getByRole('button',{name:'Correct meal 1'}).click();
 const portion=page.getByLabel('Portion · g').nth(0);
 await portion.fill('');await portion.pressSequentially('200');
 await expect(page.getByLabel('Calories · kcal').nth(0)).toHaveValue('330');
 await portion.fill('0');await expect(page.getByLabel('Calories · kcal').nth(0)).toHaveValue('0');
 await expect(page.getByLabel('Protein · g').nth(0)).toHaveValue('0');
 await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>box.state.days[day].meals[id].calories).toBe(130);
 await page.reload();await page.getByRole('button',{name:'Correct meal 1'}).click();
 await page.getByLabel('Portion · g').nth(0).fill('100');
 await expect(page.getByLabel('Calories · kcal').nth(0)).toHaveValue('0');
 await expect(page.getByRole('alert')).toContainText('starting portion was 0 g');
 await page.getByLabel('Calories · kcal').nth(0).fill('165');await page.getByLabel('Protein · g').nth(0).fill('31');await expect(page.getByRole('alert')).toHaveCount(0);
 await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>box.state.days[day].meals[id].calories).toBe(295);
 await page.reload();await expect(page.getByRole('group',{name:'Meals'})).toContainText('295 kcal · 34 g protein');
});

test('R1 removal of a zero-valued last item clears legacy total overrides',async({page})=>{
 const day=todayIn(),id=crypto.randomUUID();const state=apply(seed(),op(day,{type:'meal',mealId:id,description:'Corrected earlier',calories:200,protein:20,items:[{...chicken,grams:0,calories:0,protein:0}]}));
 const box=await open(page,state,{hash:'food'});await page.getByRole('button',{name:'Correct meal 1'}).click();
 await page.getByRole('button',{name:'Remove item 1: Chicken',exact:true}).click();
 await expect(page.locator('.sum')).toContainText('0 kcal · 0 g protein');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>box.state.days[day].meals[id]).toEqual({description:'Corrected earlier',calories:0,protein:0,items:[]});await page.reload();await expect(page.getByRole('group',{name:'Meals'})).toContainText('0 kcal · 0 g protein');
});

test('R1 legacy walk removal keeps completion checked and a new entry does not resurrect it',async({page})=>{
 const day=todayIn();const state=complete(seed(),day);state.days[day].sessions={walk:{seconds:18000}};
 const box=await open(page,state,{hash:'walk'});await page.getByRole('button',{name:'Remove walk 1',exact:true}).click();
 await expect.poll(()=>box.state.days[day].sessions?.walk).toBeUndefined();await page.reload();
 await expect(page.getByRole('checkbox',{name:'Walk complete',exact:true})).toBeChecked();
 await page.getByLabel('Walk minutes').fill('30');await page.getByRole('button',{name:'Log walk',exact:true}).click();
 await expect.poll(()=>box.state.days[day].sessions?.walk?.seconds).toBe(1800);await page.reload();
 await expect(page.getByRole('group',{name:'Walk entries'}).locator('.meal-row')).toHaveCount(1);
 await expect(page.getByText('30 minutes total',{exact:true})).toBeVisible();
});
