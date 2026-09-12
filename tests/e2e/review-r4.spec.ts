import {test,expect} from './fixtures';
import {open,seed,todayIn,op} from './helpers';
import {apply} from '../../lib/domain';
const items=[{name:'Rice',grams:100,calories:200,protein:5,source:'estimate' as const},{name:'Soup',grams:200,calories:300,protein:15,source:'estimate' as const}];
function savedMeal(){const day=todayIn(),id=crypto.randomUUID();return {day,id,state:apply(seed(),op(day,{type:'meal',mealId:id,description:'Two bowls',calories:450,protein:18,items}))};}

for(const mode of ['saved','manual'])for(const character of ['x','🍚'])test(`R4 ${mode} description shows exactly what saves at the ${character==='x'?'ASCII':'emoji'} limit`,async({page})=>{
 const {day,id,state}=savedMeal();const box=await open(page,mode==='saved'?state:seed(),{hash:'food'});
 if(mode==='saved')await page.getByRole('button',{name:'Correct meal 1'}).click();
 else {await page.getByRole('button',{name:'Log a meal',exact:true}).click();await page.getByRole('button',{name:'Enter numbers'}).click();await page.getByLabel('Calories · kcal').fill('450');await page.getByLabel('Protein · g').fill('18');}
 const description=page.getByLabel('Description',{exact:true}),atLimit=character.repeat(1000);
 await description.fill(atLimit);await description.press('End');await description.pressSequentially('HELLO');expect(await description.inputValue()).toBe(atLimit);
 await description.press('Backspace');await description.pressSequentially('Z');expect(await description.inputValue()).toBe(character.repeat(999)+'Z');
 await page.getByRole('button',{name:mode==='saved'?'Save':'Add to today',exact:true}).click();const meal=()=>mode==='saved'?box.state.days[day].meals[id]:Object.values(box.state.days[day]?.meals??{})[0];
 await expect.poll(()=>meal()?.description).toBe(character.repeat(999)+'Z');expect(meal()).toMatchObject({calories:450,protein:18});
 await page.reload();await page.getByRole('button',{name:'Correct meal 1'}).click();await expect(description).toHaveValue(character.repeat(999)+'Z');
});

for(const field of ['calories','protein'])test(`R4 ${field} edits that cancel out retire the older total correction`,async({page})=>{
 const {day,id,state}=savedMeal();const box=await open(page,state,{hash:'food'});await page.getByRole('button',{name:'Correct meal 1'}).click();
 const label=field==='calories'?'Calories · kcal':'Protein · g';const values=field==='calories'?['250','250']:['7.5','12.5'];
 await page.getByLabel(label,{exact:true}).first().fill(values[0]);await page.getByLabel(label,{exact:true}).last().fill(values[1]);
 await expect(page.locator('.sum')).toHaveText('500 kcal · 20 g protein estimate');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>box.state.days[day].meals[id]).toMatchObject({calories:500,protein:20});await page.reload();await page.getByRole('button',{name:'Correct meal 1'}).click();await expect(page.locator('.sum')).toHaveText('500 kcal · 20 g protein estimate');
});

test('R4 description-only and blank numeric drafts keep older total corrections',async({page})=>{
 const {day,id,state}=savedMeal();const box=await open(page,state,{hash:'food'});await page.getByRole('button',{name:'Correct meal 1'}).click();
 await page.getByLabel('Calories · kcal').first().fill('');await page.getByLabel('Description',{exact:true}).fill('Two bowls, extra herbs');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>box.state.days[day].meals[id]).toEqual({description:'Two bowls, extra herbs',calories:450,protein:18,items});
});

test('R4 item fieldsets name their controls through rename, removal and reload at 320px',async({page})=>{
 const {day,id,state}=savedMeal();const box=await open(page,state,{hash:'food'});await page.setViewportSize({width:320,height:740});await page.getByRole('button',{name:'Correct meal 1'}).click();
 const rice=page.getByRole('group',{name:'Item 1: Rice',exact:true});const soup=page.getByRole('group',{name:'Item 2: Soup',exact:true});
 for(const group of [rice,soup]){await expect(group).toBeVisible();expect(await group.evaluate(el=>el.tagName)).toBe('FIELDSET');await expect(group.locator('legend')).toBeVisible();for(const label of ['Item name','Portion · g','Calories · kcal','Protein · g'])await expect(group.getByLabel(label,{exact:true})).toBeVisible();}
 await soup.getByLabel('Calories · kcal').focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.press('Backspace');await page.keyboard.type('12.5');await expect(soup.getByLabel('Calories · kcal')).toHaveValue('12.5');
 await soup.getByLabel('Item name').fill('Herbed soup');await expect(page.getByRole('group',{name:'Item 2: Herbed soup',exact:true})).toBeVisible();await rice.getByRole('button',{name:'Remove item 1: Rice',exact:true}).click();
 const remaining=page.getByRole('group',{name:'Item 1: Herbed soup',exact:true});await expect(remaining.getByLabel('Calories · kcal')).toHaveValue('12.5');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>box.state.days[day].meals[id].items?.length).toBe(1);
 await page.reload();await page.getByRole('button',{name:'Correct meal 1'}).click();await expect(remaining).toBeVisible();await expect(remaining.getByLabel('Calories · kcal')).toHaveValue('12.5');
 const longName='Soup '.repeat(24);await remaining.getByLabel('Item name').fill(longName);await expect(page.getByRole('group',{name:`Item 1: ${longName.trim()}`,exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.items fieldset').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+1))).toBe(true);
 await page.locator('.found').screenshot({path:`evidence/review-r4/fieldset-${test.info().project.name}-320.png`});
});
