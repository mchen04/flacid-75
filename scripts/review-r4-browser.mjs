import {chromium,webkit,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
const url=process.env.TEST_BASE_URL,dbUrl=new URL(process.env.DATABASE_URL);
assert.equal(new URL(url).hostname,'localhost');assert.equal(dbUrl.hostname,'127.0.0.1');assert.equal(dbUrl.pathname,'/flacid_review_r4');
const database=new pg.Client({connectionString:dbUrl.toString()});await database.connect();
try {for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch();const context=await browser.newContext({viewport:{width:320,height:740},serviceWorkers:'block'});const page=await context.newPage();page.setDefaultTimeout(15000);
 try {
  await page.goto(url);await page.getByLabel('Passphrase').fill(process.env.APP_PASSPHRASE);await page.getByRole('button',{name:'Open',exact:true}).click();
  await expect(page.locator('.home-view').or(page.getByRole('heading',{name:'Welcome to My Wellness.'}))).toBeVisible();
  if(await page.getByRole('heading',{name:'Welcome to My Wellness.'}).isVisible()) {await page.getByRole('button',{name:'kg · cm'}).click();await page.getByLabel('Height · cm').fill('165');await page.getByLabel('Weight · kg',{exact:true}).fill('65');await page.getByLabel('Age',{exact:true}).fill('30');await page.getByRole('button',{name:'Start',exact:true}).click();}
  await expect(page.locator('.home-view')).toBeVisible();const saved=async()=>{await page.waitForFunction(()=>JSON.parse(localStorage.getItem('flaccid75-v1')).pending.length===0);};await saved();
  const current=await (await context.request.get(url+'/api/state')).json(),zone=current.clock.zone;
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const base={at:new Date().toISOString(),day,zone};const sync=async ops=>{const response=await context.request.post(url+'/api/sync',{headers:{Origin:url},data:ops});assert.equal(response.status(),200);assert.deepEqual((await response.json()).rejected,[]);};
  const state=async()=>(await database.query('SELECT data FROM flaccid75_state WHERE id=1')).rows[0].data;
  const walkId=randomUUID();await sync([{...base,id:randomUUID(),type:'session',habit:'walk',walkId,seconds:600,done:true}]);await sync([{...base,id:randomUUID(),type:'session',habit:'walk',walkId,seconds:1800,done:true}]);
  const walks=(await state()).days[day];assert.equal(walks.walkLog[walkId].seconds,600);assert.equal(walks.sessions.walk.seconds,Object.values(walks.walkLog).reduce((n,w)=>n+w.seconds,0));
  for(const field of ['calories','protein']) {
   const mealId=randomUUID(),prefix=`${name} ${field} ${mealId.slice(0,8)} `,description=prefix+'🍚'.repeat(1000-prefix.length);
   const items=[{name:'Rice',grams:100,calories:200,protein:5,source:'estimate'},{name:'Soup',grams:200,calories:300,protein:15,source:'estimate'}];
   await sync([{...base,id:randomUUID(),type:'meal',mealId,description:prefix.trim(),calories:500,protein:20,items},{...base,id:randomUUID(),type:'meal',mealId,calories:450,protein:18}]);
   await page.goto(url+'/#food');await page.reload();const edit=async()=>{await page.locator('.meal-row').filter({hasText:prefix.trim()}).getByRole('button',{name:/Correct meal/}).click();};await edit();
   const textarea=page.getByLabel('Description',{exact:true});await textarea.fill(description);await textarea.pressSequentially('HELLO');assert.equal(await textarea.inputValue(),description);
   await page.getByRole('button',{name:'Save',exact:true}).click();await saved();assert.deepEqual((await state()).days[day].meals[mealId],{description,calories:450,protein:18,items});await page.reload();await edit();
   const groups=[page.getByRole('group',{name:'Item 1: Rice',exact:true}),page.getByRole('group',{name:'Item 2: Soup',exact:true})];
   const values=field==='calories'?['250','250']:['7.5','12.5'],label=field==='calories'?'Calories · kcal':'Protein · g';
   for(let i=0;i<2;i++){assert.equal(await groups[i].evaluate(el=>el.tagName),'FIELDSET');await expect(groups[i].locator('legend')).toBeVisible();const input=groups[i].getByLabel(label,{exact:true});await input.focus();await input.press('ControlOrMeta+A');await input.press('Backspace');await input.pressSequentially(values[i]);}
   await expect(page.locator('.sum')).toHaveText('500 kcal · 20 g protein estimate');await page.getByRole('button',{name:'Save',exact:true}).click();await saved();await page.reload();await edit();
   assert.deepEqual((await state()).days[day].meals[mealId],{description,calories:500,protein:20,items:items.map((item,i)=>({...item,[field]:Number(values[i])}))});await expect(textarea).toHaveValue(description);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.items fieldset').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+1)),true);await page.locator('.items').screenshot({path:`evidence/review-r4/direct-${name}-${field}-320.png`});await page.getByRole('button',{name:'Cancel',exact:true}).click();
   console.log(JSON.stringify({engine:name,field,realAPI:true,realPostgres:true,descriptionLimitMatchesSavedText:true,legacyCorrectionPreservedBeforeNumberEdits:true,changedItemTotalsPersist:true,namedFieldsets:true,walkReplayFirstValueWins:true,noOverflow:true}));
  }
  const manualDescription=`Manual ${name} ${randomUUID()} `.padEnd(1000,'x');await page.getByRole('button',{name:'Log a meal',exact:true}).click();await page.getByRole('button',{name:'Enter numbers'}).click();await page.getByLabel('Calories · kcal').fill('100');await page.getByLabel('Protein · g').fill('2');await page.getByLabel('Description',{exact:true}).fill(manualDescription);await page.getByLabel('Description',{exact:true}).pressSequentially('HELLO');await expect(page.getByLabel('Description',{exact:true})).toHaveValue(manualDescription);await page.getByRole('button',{name:'Add to today',exact:true}).click();await saved();await page.reload();assert.ok(Object.values((await state()).days[day].meals).some(m=>m.description===manualDescription&&m.calories===100&&m.protein===2));console.log(JSON.stringify({engine:name,manualDescriptionLimitPersisted:true}));
 } finally {await context.close();await browser.close();}
}} finally {await database.end();}
