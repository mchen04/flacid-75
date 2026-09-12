import {test,expect,virtual} from './fixtures';
import {open,seed,todayIn,op} from './helpers';
import {apply,addDays} from '../../lib/domain';
const rice={name:'Rice',grams:100,calories:250,protein:10,source:'estimate' as const};

for(const mode of ['saved','new']) for(const [label,field,value] of [['Portion · g','grams',12.5],['Calories · kcal','calories',12.5],['Protein · g','protein',12.5]] as const) {
 test(`R3 ${mode} meal ${field} accepts decimal keystrokes and persists the exact item`,async({page})=>{
  const day=todayIn(),id=crypto.randomUUID();const state=mode==='saved'?apply(seed(),op(day,{type:'meal',mealId:id,description:'Rice',calories:250,protein:10,items:[rice]})):seed();
  const box=await open(page,state,{hash:'food'});await page.setViewportSize({width:320,height:740});
  if(mode==='saved')await page.getByRole('button',{name:'Correct meal 1'}).click();
  else {await page.route('**/api/estimate',r=>r.fulfill({json:{items:[rice],calories:250,protein:10,model:'fixture'}}));await page.getByRole('button',{name:'Log a meal',exact:true}).click();await page.getByLabel('What did you eat?').fill('Rice');await page.getByRole('button',{name:'Look it up'}).click();}
  const input=page.getByLabel(label,{exact:true});await input.focus();await input.press('ControlOrMeta+A');await input.press('Backspace');await input.pressSequentially('12.5');
  await expect(input).toHaveValue('12.5');await page.getByLabel('Description',{exact:true}).click();await expect(input).toHaveValue('12.5');
  if(field==='grams'){await expect(input).toHaveAttribute('inputmode','decimal');await expect(page.getByLabel('Calories · kcal')).toHaveValue('31.3');await expect(page.getByLabel('Protein · g')).toHaveValue('1.3');}
  await page.getByRole('button',{name:mode==='saved'?'Save':'Add to today',exact:true}).click();
  const expected=field==='grams'?{...rice,grams:value,calories:31.3,protein:1.3}:{...rice,[field]:value};
  await expect.poll(()=>Object.values(box.state.days[day]?.meals??{})[0]?.items).toEqual([expected]);
  await page.reload();await page.getByRole('button',{name:'Correct meal 1'}).click();await expect(input).toHaveValue('12.5');
  expect(Object.values(box.state.days[day].meals)[0]).toMatchObject({calories:Math.round(expected.calories),protein:expected.protein});expect(box.rejected).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(mode==='saved'&&field==='grams')await page.screenshot({path:`evidence/review-r3/decimal-${test.info().project.name}-320.png`,fullPage:true});
 });
}

test('R3 numeric drafts survive decimal corrections, blank blur, and item removal',async({page})=>{
 const day=todayIn(),id=crypto.randomUUID();const soup={...rice,name:'Soup'};const box=await open(page,apply(seed(),op(day,{type:'meal',mealId:id,description:'Two bowls',calories:500,protein:20,items:[rice,soup]})),{hash:'food'});
 await page.getByRole('button',{name:'Correct meal 1'}).click();const portion=page.getByLabel('Portion · g').first();
 await portion.focus();await portion.press('ControlOrMeta+A');await portion.press('Backspace');await portion.pressSequentially('12.');await portion.pressSequentially('5');await expect(portion).toHaveValue('12.5');
 await portion.press('Backspace');await portion.pressSequentially('8');await expect(portion).toHaveValue('12.8');
 await portion.press('ControlOrMeta+A');await portion.press('Backspace');await page.getByLabel('Description',{exact:true}).click();await expect(portion).toHaveValue('12.8');
 await page.getByRole('button',{name:'Remove item 1: Rice',exact:true}).click();await portion.focus();await portion.press('ControlOrMeta+A');await portion.press('Backspace');await portion.pressSequentially('0.5');await expect(portion).toHaveValue('0.5');
 const protein=page.getByLabel('Protein · g');await protein.focus();await protein.press('ControlOrMeta+A');await protein.press('Backspace');await protein.pressSequentially('12.5');
 await protein.press('ControlOrMeta+A');await protein.press('Backspace');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>box.state.days[day].meals[id].items).toEqual([{...soup,grams:0.5,calories:1.3,protein:12.5}]);await page.reload();await page.getByRole('button',{name:'Correct meal 1'}).click();await expect(protein).toHaveValue('12.5');
});

test('R3 numeric drafts retain immediate bounds in every item field',async({page})=>{
 const day=todayIn(),id=crypto.randomUUID();const box=await open(page,apply(seed(),op(day,{type:'meal',mealId:id,description:'Rice',calories:250,protein:10,items:[rice]})),{hash:'food'});
 await page.getByRole('button',{name:'Correct meal 1'}).click();
 for(const [label,max] of [['Portion · g',5000],['Calories · kcal',10000],['Protein · g',1000]] as const){const input=page.getByLabel(label,{exact:true});await input.fill('-40');expect(await input.inputValue()).toBe('0');await input.fill(String(max+1));expect(await input.inputValue()).toBe(String(max));}
 await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>box.state.days[day].meals[id].items).toEqual([{...rice,grams:5000,calories:10000,protein:1000}]);expect(box.rejected).toEqual([]);
 await page.reload();await page.getByRole('button',{name:'Correct meal 1'}).click();await expect(page.getByLabel('Portion · g')).toHaveValue('5000');await expect(page.getByLabel('Calories · kcal')).toHaveValue('10000');await expect(page.getByLabel('Protein · g')).toHaveValue('1000');
});

test('R3 meditation omits empty fine print but retains optional semantics and logged minutes',async({page})=>{
 const box=await open(page,seed(),{hash:'meditate'});const card=page.locator('.optional-card');await expect(card.locator('.fine-print')).toHaveCount(0);await expect(card.getByText('Optional; does not affect the streak.')).toBeAttached();
 await page.getByRole('button',{name:'Start 5 minutes',exact:true}).click();await expect(card.locator('.fine-print')).toHaveCount(0);await page.getByRole('button',{name:'Finish early',exact:true}).click();
 await expect.poll(()=>box.ops.some(o=>o.type==='meditate')).toBe(true);
 const logged=apply(box.state,op(todayIn(),{type:'meditate',seconds:180}));box.state=logged;await page.reload();await expect(card.locator('.fine-print')).toContainText('3 min logged today.');expect(box.state.days[todayIn()].checks.walk).not.toBe(true);
 await page.evaluate(day=>localStorage.setItem('my-wellness-timers',JSON.stringify({meditate:{key:'meditate',run:crypto.randomUUID(),day,banked:60000,startedAt:null,meta:{minutes:5}}})),addDays(todayIn(),-1));
 await page.reload();await expect(card.locator('.fine-print')).toContainText('it will log to that day.');await expect(card.locator('.fine-print')).toContainText('3 min logged today.');
});

test('R3 estimate rejects an overlong description with a length error and keeps input guards',async({request,baseURL})=>{
 test.skip(virtual,'requires the local API server');expect(process.env.APP_PASSPHRASE).toBeTruthy();
 const login=await request.post('/api/auth',{headers:{Origin:baseURL!},data:{passphrase:process.env.APP_PASSPHRASE}});expect(login.status()).toBe(200);
 for(const text of ['x'.repeat(1001),'🍚'.repeat(1001)]){const response=await request.post('/api/estimate',{headers:{Origin:baseURL!},data:{text}});expect(response.status()).toBe(400);expect((await response.json()).error).toContain('too long');}
 for(const data of [{text:''},{text:'Rice',image:'not an image'}]){const response=await request.post('/api/estimate',{headers:{Origin:baseURL!},data});expect(response.status()).toBe(400);expect((await response.json()).error).toBe('Describe the meal or add a clear photo.');}
});
