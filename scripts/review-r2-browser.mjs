// Use the documented test environment and redaction pipeline against the isolated local server.
import {chromium,webkit,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import {ground} from '../lib/estimate.ts';
import {estimateSchema} from '../lib/validation.ts';
const url=process.env.TEST_BASE_URL,dbUrl=new URL(process.env.DATABASE_URL);
assert.equal(new URL(url).hostname,'localhost');assert.equal(dbUrl.hostname,'127.0.0.1');assert.equal(dbUrl.pathname,'/flacid_review_r2');
const database=new pg.Client({connectionString:dbUrl.toString()});await database.connect();
try {for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch();const context=await browser.newContext({viewport:{width:320,height:740},serviceWorkers:'block'});const page=await context.newPage();
 try {
  await page.goto(url);await page.getByLabel('Passphrase').fill(process.env.APP_PASSPHRASE);await page.getByRole('button',{name:'Open',exact:true}).click();
  await expect(page.locator('.home-view').or(page.getByRole('heading',{name:'Welcome to My Wellness.'}))).toBeVisible();
  if(await page.getByRole('heading',{name:'Welcome to My Wellness.'}).isVisible()) {
   await page.getByRole('button',{name:'kg · cm'}).click();await page.getByLabel('Height · cm').fill('165');await page.getByLabel('Weight · kg',{exact:true}).fill('65');await page.getByLabel('Age',{exact:true}).fill('30');await page.getByRole('button',{name:'Start',exact:true}).click();
  }
  await expect(page.locator('.home-view')).toBeVisible();const saved=async()=>{await page.waitForFunction(()=>JSON.parse(localStorage.getItem('flaccid75-v1')).pending.length===0);};await saved();
  const current=await (await context.request.get(url+'/api/state')).json(),zone=current.clock.zone;
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const items=ground(estimateSchema.parse({items:[{name:'egg, whole, cooked, scrambled\u0000\uD83D',grams:100,calories:150,protein:10},{name:'zzqx 🍲\uDFFF',grams:150,calories:200,protein:8}]}).items);
  const mealId=randomUUID(),description=`Direct ${name} ${mealId.slice(0,8)}`;const calories=items.reduce((n,i)=>n+i.calories,0),protein=items.reduce((n,i)=>n+i.protein,0);
  const seeded=await context.request.post(url+'/api/sync',{headers:{Origin:url},data:[{id:randomUUID(),at:new Date().toISOString(),day,zone,type:'meal',mealId,description,calories,protein,items}]});assert.equal(seeded.status(),200);assert.deepEqual((await seeded.json()).rejected,[]);
  await page.goto(url+'/#food');const edit=async()=>{const button=page.locator('.meal-row').filter({hasText:description}).getByRole('button',{name:/Correct meal/});await button.focus();await page.keyboard.press('Enter');};await edit();
  await expect(page.getByLabel('Description',{exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByLabel('Item name').first()).toBeFocused();
  const portion=page.getByLabel('Portion · g').first();await portion.fill('');await page.getByLabel('Description',{exact:true}).click();await expect(portion).toHaveValue('100');await expect(page.getByLabel('Calories · kcal').first()).toHaveValue(String(items[0].calories));
  await portion.fill('200');await expect(page.getByLabel('Calories · kcal').first()).toHaveValue(String(items[0].calories*2));await expect(page.getByLabel('Protein · g').first()).toHaveValue(String(items[0].protein*2));
  await page.getByRole('button',{name:'Save',exact:true}).click();await saved();await page.reload();await edit();await expect(page.getByLabel('Description',{exact:true})).toBeFocused();await expect(portion).toHaveValue('200');
  let stored=(await database.query('SELECT data FROM flaccid75_state WHERE id=1')).rows[0].data.days[day].meals[mealId];assert.deepEqual(stored.items,[{...items[0],grams:200,calories:items[0].calories*2,protein:items[0].protein*2},items[1]]);assert.equal(stored.description,description);assert.equal(stored.calories,items[0].calories*2+items[1].calories);
  await portion.fill('');await page.getByRole('button',{name:'Save',exact:true}).click();await saved();await page.reload();await edit();await expect(portion).toHaveValue('200');
  stored=(await database.query('SELECT data FROM flaccid75_state WHERE id=1')).rows[0].data.days[day].meals[mealId];assert.equal(stored.calories,items[0].calories*2+items[1].calories);assert.equal(stored.items[0].name,'egg, whole, cooked, scrambled');assert.equal(stored.items[1].name,'zzqx 🍲');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`evidence/review-r2/direct-${name}-320.png`,fullPage:true});
  console.log(JSON.stringify({engine:name,realAPI:true,realPostgres:true,malformedModelTextSavedCleanly:true,keyboardFocusOnDescription:true,blankBlurPreservesNutrition:true,positivePortionScales:true,blankSaveKeepsPriorAmount:true,reloadAndSQLVerified:true,width:320,noOverflow:true}));
 } finally {await context.close();await browser.close();}
}} finally {await database.end();}
