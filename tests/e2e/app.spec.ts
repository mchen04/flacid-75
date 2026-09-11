import {test,expect,virtual} from './fixtures';
import {existsSync,readFileSync} from 'node:fs';
import {emptyState} from '../../lib/domain';
import {open,seed} from './helpers';
// The passphrase is only needed against a real server; the virtual server mocks the gate. It comes from APP_PASSPHRASE in the
// environment first (a supervisor can run a test-only server without creating credential files), then an optional .env.local.
// No credential is ever written to evidence.
const secret=process.env.APP_PASSPHRASE||(existsSync('.env.local')?readFileSync('.env.local','utf8').split('\n').find(l=>l.startsWith('APP_PASSPHRASE='))?.split('=').slice(1).join('=')??'':'');
test('gate rejects wrong passphrase and protects every write path',async({request,baseURL})=>{test.skip(virtual,'needs a real server; run outside the sandbox with npm run start -- --port 3075');const wrong=await request.post('/api/auth',{headers:{origin:baseURL!},data:{passphrase:'deliberately-wrong'}});expect(wrong.status()).toBe(401);for(const path of ['/api/sync','/api/estimate'])expect((await request.post(path,{headers:{origin:baseURL!},data:[]})).status()).toBe(401);expect((await request.get('/api/state')).status()).toBe(401);expect((await request.post('/api/auth',{headers:{origin:'https://untrusted.example'},data:{passphrase:secret}})).status()).toBe(403);});
test('onboarding in pounds and feet-inches, all seven one-tap habits from the dashboard, celebration, correction and calendar',async({page})=>{
 const box=await open(page,emptyState(),{go:false,unlocked:false});
 if(virtual)await page.route('**/api/auth',r=>r.fulfill({json:{ok:true}}));
 await page.route('**/api/estimate',r=>r.fulfill({json:{items:[{name:'egg, whole, cooked, scrambled',grams:100,calories:149,protein:10,source:'usda',match:'Egg, whole, cooked, scrambled',fdcId:172187},{name:'bread, white, toasted',grams:50,calories:145,protein:4.5,source:'usda',match:'Bread, white, commercially prepared, toasted',fdcId:174925}],calories:294,protein:14.5,model:'test'}}));
 await page.goto('/');await expect(page.getByRole('heading',{name:'My Wellness'})).toBeVisible();await page.getByLabel('Passphrase').fill(virtual?'test-only':secret);await page.getByRole('button',{name:'Open'}).click();
 await expect(page.getByRole('heading',{name:'Welcome to My Wellness.'})).toBeVisible();
 // Defaults are lb and ft-in; the stored profile is metric.
 await expect(page.getByRole('button',{name:'lb · ft in'})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('Height · ft').fill('5');await page.getByLabel('in',{exact:true}).fill('5');await page.getByLabel('Weight · lb').fill('143.3');await page.getByLabel('Age',{exact:true}).fill('30');await page.getByRole('button',{name:'Start'}).click();
 await expect(page.locator('.home-view')).toBeVisible();
 expect(Math.round(box.state.profile!.weight*10)/10).toBe(65);expect(Math.round(box.state.profile!.height)).toBe(165);await expect.poll(()=>box.state.profile?.units).toEqual({weight:'lb',height:'ftin'});
 for(const habit of ['walk','workout','abs','floss']){await page.getByRole('button',{name:`Log ${habit}`}).click();await expect(page.getByRole('button',{name:`Undo ${habit}`})).toHaveAttribute('aria-pressed','true');}
 // One tap logs a whole Stanley (30 oz); three of them pass the 2 L target.
 const water=page.getByRole('button',{name:'Add a Stanley'});for(let i=0;i<3;i++)await water.click();await expect(page.getByText('3 of 2¼ Stanleys · 90 oz')).toBeVisible();
 // Food: type, see what was found, confirm once. Nothing is added before the confirmation.
 await page.getByRole('button',{name:'Log a meal'}).click();await page.getByLabel('What did you eat?').fill('two eggs and toast');await page.getByRole('button',{name:'Look it up'}).click();await expect(page.getByText('USDA · Egg, whole, cooked, scrambled')).toBeVisible();expect(Object.keys(Object.values(box.state.days)[0]?.meals??{})).toHaveLength(0);
 await page.getByRole('button',{name:'Not this'}).click();await expect(page.getByLabel('What did you eat?')).toBeVisible();
 await page.getByLabel('What did you eat?').fill('two eggs and toast');await page.getByRole('button',{name:'Look it up'}).click();await page.getByRole('button',{name:'Add to today'}).click();await expect(page.getByText('294 kcal · 15/105 g')).toBeVisible();
 await page.getByRole('button',{name:'Log a meal'}).click();await page.getByRole('button',{name:'Enter numbers'}).click();await page.getByLabel('Calories · kcal').fill('1600');await page.getByLabel('Protein · g',{exact:true}).fill('95');await page.getByRole('button',{name:'Add to today'}).click();
 // The celebration is the hero scene itself: no overlay, nothing to dismiss.
 await expect(page.getByRole('heading',{name:'All done.'})).toBeVisible();await expect(page.locator('.hero-copy strong')).toHaveText('Every one.');await expect(page.locator('.hero')).toHaveClass(/is-complete/);await expect(page.locator('.hero .petal').first()).toBeAttached();await expect(page.getByText('+100 points')).toBeVisible();await page.screenshot({path:`evidence/my-wellness/celebration-${test.info().project.name}.png`});
 // Correct a meal on the food page, in place.
 await page.getByRole('button',{name:'Open food'}).click();await page.getByRole('button',{name:'Correct meal 1'}).click();await page.getByLabel('Calories · kcal').fill('300');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText('1,900 kcal')).toBeVisible();
 await page.getByRole('button',{name:'Home'}).click();await page.getByRole('button',{name:/day streak\. Open progress/}).click();await expect(page.getByRole('tab',{name:'Week'})).toHaveAttribute('aria-selected','true');await page.getByRole('tab',{name:'Month'}).click();await page.screenshot({path:`evidence/my-wellness/month-${test.info().project.name}.png`});
});
test('offline optimistic writes, reconnect deduplication and manual fallback when the estimate fails',async({page,context})=>{
 let server=seed();const seen=new Set<string>();await page.route('**/api/state',r=>r.fulfill({json:server}));await page.route('**/api/sync',async r=>{const {apply}=await import('../../lib/domain');const ops=r.request().postDataJSON();for(const op of ops){if(!seen.has(op.id)){server=apply(server,op);seen.add(op.id);}}await new Promise(resolve=>setTimeout(resolve,350));return r.fulfill({json:{state:server,accepted:ops.map((o:{id:string})=>o.id),rejected:[]}});});
 await page.addInitScript(s=>localStorage.setItem('flaccid75-v1',JSON.stringify({state:s,pending:[],unlocked:true})),server);await page.goto('/');await expect(page.locator('.home-view')).toBeVisible();await context.setOffline(true);
 await page.getByRole('button',{name:'Log workout'}).click();await expect(page.getByRole('button',{name:'Undo workout'})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Add a Stanley'}).click();await expect(page.getByText('1 of 2¼ Stanleys · 30 oz')).toBeVisible();
 const local=await page.evaluate(()=>localStorage.getItem('flaccid75-v1'));expect(JSON.parse(local!).pending).toHaveLength(2);
 await expect(page.getByText(/waiting to sync/)).toHaveCount(0);
 await page.screenshot({path:`evidence/my-wellness/offline-${test.info().project.name}.png`});await context.setOffline(false);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).pending.length===0);expect(seen.size).toBe(2);
 // The model is down: the estimate fails with a clear message and the numbers path still logs the meal, so tracking never depends on AI.
 await page.route('**/api/estimate',r=>r.fulfill({status:503,json:{error:'That could not be looked up right now.'}}));await page.getByRole('button',{name:'Log a meal'}).click();await page.getByLabel('What did you eat?').fill('two eggs');await page.getByRole('button',{name:'Look it up'}).click();await expect(page.locator('.form-error')).toContainText('could not be looked up');await page.getByRole('button',{name:'Enter numbers'}).click();await page.getByLabel('Calories · kcal').fill('160');await page.getByLabel('Protein · g',{exact:true}).fill('12');await page.getByRole('button',{name:'Add to today'}).click();await expect(page.getByText('160 kcal · 12/105 g')).toBeVisible();
 await page.screenshot({path:`evidence/my-wellness/ai-unavailable-${test.info().project.name}.png`});
});
