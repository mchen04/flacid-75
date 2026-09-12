import {test,expect} from './fixtures';
import {open,seed,todayIn,op} from './helpers';
import {apply,type MealItem} from '../../lib/domain';
import {execFileSync} from 'node:child_process';
const rice={name:'Rice',grams:100,calories:250,protein:10,source:'estimate' as const};
const soup={name:'Soup',grams:200,calories:100,protein:5,source:'estimate' as const};
function mealState(items=[rice,soup]) {const day=todayIn(),id=crypto.randomUUID();return {day,id,state:apply(seed(),op(day,{type:'meal',mealId:id,description:'Rice and soup',calories:items.reduce((n,i)=>n+i.calories,0),protein:items.reduce((n,i)=>n+i.protein,0),items}))};}

test('R2 empty portion and blur preserve nutrition, then a new amount scales and survives reload',async({page})=>{
 const {state,day,id}=mealState();const box=await open(page,state,{hash:'food'});await page.setViewportSize({width:320,height:740});
 await page.getByRole('button',{name:'Correct meal 1'}).click();const portion=page.getByLabel('Portion · g').first();
 await portion.fill('');await page.getByLabel('Description',{exact:true}).click();
 await portion.fill('150');await expect(page.getByLabel('Calories · kcal').first()).toHaveValue('375');await expect(page.getByLabel('Protein · g').first()).toHaveValue('15');
 await portion.fill('');await page.getByLabel('Item name').last().click();await expect(portion).toHaveValue('150');
 await expect(page.getByLabel('Calories · kcal').first()).toHaveValue('375');
 await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>box.state.days[day].meals[id].calories).toBe(475);
 await page.reload();await page.getByRole('button',{name:'Correct meal 1'}).click();await expect(portion).toHaveValue('150');
 await expect(page.getByLabel('Calories · kcal').first()).toHaveValue('375');expect(box.state.days[day].meals[id].items?.[1]).toEqual(soup);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`evidence/review-r2/portion-${test.info().project.name}-320.png`,fullPage:true});
});

test('R2 editing a detailed meal focuses its description and keyboard reaches the first item',async({page})=>{
 const {state}=mealState();await open(page,state,{hash:'food'});const edit=page.getByRole('button',{name:'Correct meal 1'});await edit.focus();await page.keyboard.press('Enter');
 await expect(page.getByLabel('Description',{exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByLabel('Item name').first()).toBeFocused();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await edit.focus();await page.keyboard.press('Space');await expect(page.getByLabel('Description',{exact:true})).toBeFocused();
});

test('R2 malformed model item text is grounded into a saveable meal without user repair',async({page})=>{
 const day=todayIn();const box=await open(page,seed(),{hash:'food'});
 const raw={items:[{name:'egg, whole, cooked, scrambled\u0000\uD83D',grams:100,calories:150,protein:10},{name:'zzqx 🍲\uDFFF',grams:150,calories:200,protein:8}]};
 const items=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {readFileSync} from 'node:fs';import {ground} from './lib/estimate.ts';import {estimateSchema} from './lib/validation.ts';console.log(JSON.stringify(ground(estimateSchema.parse(JSON.parse(readFileSync(0,'utf8'))).items)));"],{input:JSON.stringify(raw),encoding:'utf8'})) as MealItem[];
 await page.route('**/api/estimate',r=>r.fulfill({json:{items,calories:items.reduce((n,i)=>n+i.calories,0),protein:items.reduce((n,i)=>n+i.protein,0),model:'fixture'}}));
 await page.getByRole('button',{name:'Log a meal',exact:true}).click();await page.getByLabel('What did you eat?').fill('Eggs and stew');await page.getByRole('button',{name:'Look it up'}).click();
 await page.getByRole('button',{name:'Add to today',exact:true}).click();await expect(page.getByRole('group',{name:'Meals'})).toContainText('Eggs and stew');
 await expect.poll(()=>Object.keys(box.state.days[day]?.meals??{}).length).toBe(1);await page.reload();await page.getByRole('button',{name:'Correct meal 1'}).click();
 await expect(page.getByLabel('Item name').first()).toHaveValue('egg, whole, cooked, scrambled');await expect(page.getByLabel('Item name').last()).toHaveValue('zzqx 🍲');
 const saved=Object.values(box.state.days[day].meals)[0];expect(saved.items?.[0]).toMatchObject({source:'usda',match:'Egg, whole, cooked, scrambled',fdcId:172187});expect(saved.items?.[1].source).toBe('estimate');
 expect(saved.calories).toBe(items.reduce((n,i)=>n+i.calories,0));expect(box.rejected).toEqual([]);
});

test('R2 malformed meal text reports a text error and can be corrected without losing nutrition',async({page})=>{
 const day=todayIn();const box=await open(page,seed(),{hash:'food'});
 await page.route('**/api/estimate',r=>r.fulfill({json:{items:[{...rice,name:'Rice\u0000'}],calories:250,protein:10,model:'fixture'}}));
 await page.getByRole('button',{name:'Log a meal',exact:true}).click();await page.getByLabel('What did you eat?').fill('Rice');await page.getByRole('button',{name:'Look it up'}).click();await page.getByRole('button',{name:'Add to today',exact:true}).click();
 await expect(page.locator('.found').getByRole('alert')).toContainText('text');await expect(page.locator('.found').getByRole('alert')).not.toContainText('kcal');
 expect(Object.keys(box.state.days[day]?.meals??{})).toHaveLength(0);await page.getByLabel('Item name').fill('Rice');await page.getByRole('button',{name:'Add to today',exact:true}).click();
 await expect.poll(()=>Object.values(box.state.days[day]?.meals??{})[0]?.calories).toBe(250);await page.reload();await expect(page.getByRole('group',{name:'Meals'})).toContainText('250 kcal · 10 g protein');
});

test('R2 a new estimate preserves blank portions and removal keeps the remaining item editable',async({page})=>{
 const box=await open(page,seed(),{hash:'food'});await page.route('**/api/estimate',r=>r.fulfill({json:{items:[rice,soup],calories:350,protein:15,model:'fixture'}}));
 await page.getByRole('button',{name:'Log a meal',exact:true}).click();await page.getByLabel('What did you eat?').fill('Rice and soup');await page.getByRole('button',{name:'Look it up'}).click();
 await expect(page.getByLabel('Description',{exact:true})).toBeFocused();await page.getByLabel('Portion · g').first().fill('');await page.getByLabel('Item name').last().click();
 await expect(page.getByLabel('Portion · g').first()).toHaveValue('100');await expect(page.getByLabel('Calories · kcal').first()).toHaveValue('250');
 await page.getByRole('button',{name:'Remove item 1: Rice',exact:true}).click();const portion=page.getByLabel('Portion · g');await expect(portion).toHaveValue('200');
 await portion.fill('');await page.getByLabel('Description',{exact:true}).click();await expect(portion).toHaveValue('200');await portion.fill('100');await expect(page.getByLabel('Calories · kcal')).toHaveValue('50');await expect(page.getByLabel('Protein · g')).toHaveValue('2.5');
 await page.getByRole('button',{name:'Add to today',exact:true}).click();await expect.poll(()=>Object.values(box.state.days[todayIn()]?.meals??{})[0]?.calories).toBe(50);await page.reload();
 await page.getByRole('button',{name:'Correct meal 1'}).click();await expect(page.getByLabel('Description',{exact:true})).toBeFocused();await expect(portion).toHaveValue('100');await expect(page.getByLabel('Item name')).toHaveValue('Soup');
});
