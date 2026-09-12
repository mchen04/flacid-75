// Run against the task-owned local server with its generated test environment file.
import {chromium,webkit,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import assert from 'node:assert/strict';
const url=process.env.TEST_BASE_URL,dbUrl=new URL(process.env.DATABASE_URL);
assert.equal(new URL(url).hostname,'localhost');assert.equal(dbUrl.hostname,'127.0.0.1');assert.equal(dbUrl.pathname,'/flacid_review_r1');
const database=new pg.Client({connectionString:dbUrl.toString()});await database.connect();
try {for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch();const context=await browser.newContext({viewport:{width:320,height:740},serviceWorkers:'block'});const page=await context.newPage();
 try {
  await page.goto(url);await page.getByLabel('Passphrase').fill(process.env.APP_PASSPHRASE);await page.getByRole('button',{name:'Open',exact:true}).click();
  await expect(page.locator('.home-view').or(page.getByRole('heading',{name:'Welcome to My Wellness.'}))).toBeVisible();
  if(await page.getByRole('heading',{name:'Welcome to My Wellness.'}).isVisible()) {
   await page.getByRole('button',{name:'kg · cm'}).click();await page.getByLabel('Height · cm').fill('165');await page.getByLabel('Weight · kg',{exact:true}).fill('65');await page.getByLabel('Age',{exact:true}).fill('30');await page.getByRole('button',{name:'Start',exact:true}).click();
  }
  await expect(page.locator('.home-view')).toBeVisible();
  const saved=async()=>{await page.waitForFunction(()=>JSON.parse(localStorage.getItem('flaccid75-v1')).pending.length===0);};await saved();
  const current=await (await context.request.get(url+'/api/state')).json();const zone=current.clock.zone;
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const operation=extra=>({id:randomUUID(),at:new Date().toISOString(),day,zone,...extra});
  const mealId=randomUUID();const description=`Direct ${name} chicken and rice`;
  const items=[{name:'Chicken',grams:100,calories:165,protein:31,source:'usda',match:'Chicken breast',fdcId:123},{name:'Rice',grams:100,calories:130,protein:3,source:'estimate'}];
  const seeded=await context.request.post(url+'/api/sync',{headers:{Origin:url},data:[operation({type:'meal',mealId,description,calories:295,protein:34,items})]});assert.equal(seeded.status(),200);assert.deepEqual((await seeded.json()).rejected,[]);
  await page.goto(url+'/#walk');await page.getByLabel('Walk minutes').fill('300');await page.getByRole('button',{name:'Log walk',exact:true}).click();await saved();
  await expect(page.getByText('300 minutes total',{exact:true})).toBeVisible();
  await page.waitForTimeout(650);await page.getByLabel('Walk minutes').fill('30');await page.getByRole('button',{name:'Log walk',exact:true}).click();await saved();await page.reload();
  await expect(page.getByText('330 minutes total',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Remove walk 1',exact:true}).click();await saved();await page.reload();
  await expect(page.getByText('30 minutes total',{exact:true})).toBeVisible();await expect(page.getByRole('checkbox',{name:'Walk complete',exact:true})).toBeChecked();
  await page.getByRole('checkbox',{name:'Walk complete',exact:true}).focus();await page.keyboard.press('Space');await saved();
  await page.getByRole('button',{name:'Remove walk 1',exact:true}).click();await saved();await page.reload();
  await expect(page.getByRole('checkbox',{name:'Walk complete',exact:true})).not.toBeChecked();await expect(page.getByRole('group',{name:'Walk entries'})).toHaveCount(0);
  await page.goto(url+'/#food');
  const edit=async()=>{await page.locator('.meal-row').filter({hasText:description}).getByRole('button',{name:/Correct meal/}).click();};
  await edit();await page.getByLabel('Portion · g').first().fill('200');await expect(page.getByLabel('Calories · kcal').first()).toHaveValue('330');
  await page.getByRole('button',{name:'Remove item 2: Rice',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`evidence/review-r1/direct-${name}-320.png`,fullPage:true});
  await page.getByRole('button',{name:'Save',exact:true}).click();await saved();await page.reload();await edit();
  await expect(page.getByLabel('Portion · g')).toHaveValue('200');await expect(page.getByLabel('Protein · g')).toHaveValue('62');
  let stored=(await database.query('SELECT data FROM flaccid75_state WHERE id=1')).rows[0].data.days[day];
  assert.deepEqual(stored.meals[mealId],{description,calories:330,protein:62,items:[{...items[0],grams:200,calories:330,protein:62}]});assert.equal(stored.checks.walk,false);assert.equal(stored.sessions?.walk,undefined);
  await page.getByRole('button',{name:'Remove item 1: Chicken',exact:true}).click();await page.getByRole('button',{name:'Save',exact:true}).click();await saved();await page.reload();
  stored=(await database.query('SELECT data FROM flaccid75_state WHERE id=1')).rows[0].data.days[day];assert.deepEqual(stored.meals[mealId],{description,calories:0,protein:0,items:[]});
  console.log(JSON.stringify({engine:name,realAPI:true,realPostgres:true,walks300Plus30:true,walkRemovalKeepsCheckedAndUnchecked:true,portionDoublesNutrition:true,itemRemovalAndLastRemovalPersist:true,descriptionRetained:true,width:320,noOverflow:true}));
 } finally {await context.close();await browser.close();}
}} finally {await database.end();}
