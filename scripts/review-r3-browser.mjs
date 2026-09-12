import {chromium,webkit,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
const url=process.env.TEST_BASE_URL,dbUrl=new URL(process.env.DATABASE_URL);
assert.equal(new URL(url).hostname,'localhost');assert.equal(dbUrl.hostname,'127.0.0.1');assert.equal(dbUrl.pathname,'/flacid_review_r3');assert.ok(!process.env.OPENROUTER_API_KEY);
const database=new pg.Client({connectionString:dbUrl.toString()});await database.connect();
try {for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch();const context=await browser.newContext({viewport:{width:320,height:740},serviceWorkers:'block'});const page=await context.newPage();page.setDefaultTimeout(15000);
 try {
  await page.goto(url);await page.getByLabel('Passphrase').fill(process.env.APP_PASSPHRASE);await page.getByRole('button',{name:'Open',exact:true}).click();
  await expect(page.locator('.home-view').or(page.getByRole('heading',{name:'Welcome to My Wellness.'}))).toBeVisible();
  if(await page.getByRole('heading',{name:'Welcome to My Wellness.'}).isVisible()) {
   await page.getByRole('button',{name:'kg · cm'}).click();await page.getByLabel('Height · cm').fill('165');await page.getByLabel('Weight · kg',{exact:true}).fill('65');await page.getByLabel('Age',{exact:true}).fill('30');await page.getByRole('button',{name:'Start',exact:true}).click();
  }
  await expect(page.locator('.home-view')).toBeVisible();const saved=async()=>{await page.waitForFunction(()=>JSON.parse(localStorage.getItem('flaccid75-v1')).pending.length===0);};await saved();
  if(!process.argv.includes('--text-only')) {
   const current=await (await context.request.get(url+'/api/state')).json(),zone=current.clock.zone;
   const day=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const rice={name:'Rice',grams:100,calories:250,protein:10,source:'estimate'};
   for(const [label,field] of [['Portion · g','grams'],['Calories · kcal','calories'],['Protein · g','protein']]) {
    const mealId=randomUUID(),description=`Decimal ${field} ${mealId.slice(0,8)}`;
    const seeded=await context.request.post(url+'/api/sync',{headers:{Origin:url},data:[{id:randomUUID(),at:new Date().toISOString(),day,zone,type:'meal',mealId,description,calories:250,protein:10,items:[rice]}]});assert.equal(seeded.status(),200);assert.deepEqual((await seeded.json()).rejected,[]);
    await page.goto(url+'/#food');await page.reload();const edit=async()=>{await page.locator('.meal-row').filter({hasText:description}).getByRole('button',{name:/Correct meal/}).click();};await edit();
    const input=page.getByLabel(label,{exact:true});await input.focus();await input.press('ControlOrMeta+A');await input.press('Backspace');await input.pressSequentially('12.5');await expect(input).toHaveValue('12.5');
    await page.getByRole('button',{name:'Save',exact:true}).click();await saved();await page.reload();await edit();await expect(input).toHaveValue('12.5');
    const expected=field==='grams'?{...rice,grams:12.5,calories:31.3,protein:1.3}:{...rice,[field]:12.5};
    const stored=(await database.query('SELECT data FROM flaccid75_state WHERE id=1')).rows[0].data.days[day].meals[mealId];assert.deepEqual(stored,{description,items:[expected],calories:Math.round(expected.calories),protein:expected.protein});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);if(field==='grams')await page.locator('.found').screenshot({path:`evidence/review-r3/direct-${name}-320.png`});
    await page.getByRole('button',{name:'Cancel',exact:true}).click();console.log(JSON.stringify({engine:name,field,keystrokes:'12.5',realAPI:true,realPostgres:true,exactItemAndTotals:true,reload:true,noOverflow:true}));
   }
  }
  await page.goto(url+'/#food');await page.getByRole('button',{name:'Log a meal',exact:true}).click();await page.getByRole('button',{name:'Enter numbers'}).click();
  await page.getByLabel('Description',{exact:true}).fill('🍚'.repeat(600));await page.getByRole('button',{name:'Describe it instead'}).click();await expect(page.getByLabel('What did you eat?')).toHaveValue('🍚'.repeat(600));
  const response=page.waitForResponse(r=>r.url().endsWith('/api/estimate'));await page.getByRole('button',{name:'Look it up'}).click();const result=await response;
  const boundary=await context.request.post(url+'/api/estimate',{headers:{Origin:url},data:{text:'🍚'.repeat(1000)}});
  const long=await context.request.post(url+'/api/estimate',{headers:{Origin:url},data:{text:'🍚'.repeat(1001)}});const longBody=await long.json();
  console.log(JSON.stringify({engine:name,manual600EmojiStatus:result.status(),boundary1000EmojiStatus:boundary.status(),over1000Status:long.status(),over1000Message:longBody.error}));
  // Missing model credentials give 503 only after valid text passes route validation. No model request leaves the server.
  assert.equal(result.status(),503);assert.equal(boundary.status(),503);assert.equal(long.status(),400);assert.match(longBody.error,/too long/i);await expect(page.getByRole('alert')).toContainText('could not be looked up');
 } finally {await context.close();await browser.close();}
}} finally {await database.end();}
