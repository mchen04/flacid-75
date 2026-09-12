// Review 164: acknowledged changes never resurrected from another tab, stale account reads never installed over acknowledged state,
// refusals kept until their save succeeds, lock and clear honoured by every tab, and the small copy and meter repairs.
import {test,expect} from './fixtures';
import type {Page} from '@playwright/test';
import {addDays,apply} from '../../lib/domain';
import {open,mock,seed,todayIn,op} from './helpers';
const stanley=30*29.5735295625;
const saved=(p:Page)=>p.evaluate(day=>{const s=JSON.parse(localStorage.getItem('flaccid75-v1')!);return {water:s.state.days[day]?.water??0,floss:s.state.days[day]?.checks.floss??false,pending:s.pending.length,failed:s.failed.length,journal:Object.keys(localStorage).filter(k=>k.startsWith('my-wellness-op:')).length,unlocked:s.unlocked};},todayIn());
const waterText=(p:Page)=>p.getByRole('button',{name:'Open water',exact:true}).innerText();

test('R164-1: a change acknowledged during another tab\'s stale view is counted once on the account, on the device and on both screens, including after an undo and a later sync',async({page,context})=>{
 const today=todayIn();const box=await open(page,seed());
 // A's syncs answer after 1.2 s; B shares the device store but cannot reach the account.
 await page.route('**/api/sync',async r=>{await new Promise(res=>setTimeout(res,1200));await r.fallback();});
 const other=await context.newPage();await mock(other,box);await other.route('**/api/sync',r=>r.abort('internetdisconnected'));await other.goto('/');await other.locator('.home-view').waitFor();
 await page.getByRole('button',{name:'Add a Stanley',exact:true}).click();
 await expect.poll(()=>box.state.days[today]?.water??0).toBeGreaterThan(0);await page.waitForTimeout(1500);
 expect(box.ops.filter(o=>o.type==='water')).toHaveLength(1);expect(box.state.days[today].water).toBeCloseTo(stanley,6);
 for(const p of [page,other]){const s=await saved(p);expect(s.water,'device water').toBeCloseTo(stanley,6);expect(s.pending).toBe(0);expect(s.journal).toBe(0);await expect(waterText(p)).resolves.toContain('1 of 2¼ Stanleys · 30 oz');}
 // B regains the account and syncs: still one Stanley everywhere.
 await other.unroute('**/api/sync');await other.evaluate(()=>window.dispatchEvent(new Event('online')));await other.waitForTimeout(800);
 expect(box.ops.filter(o=>o.type==='water')).toHaveLength(1);for(const p of [page,other]){expect((await saved(p)).water).toBeCloseTo(stanley,6);await expect(waterText(p)).resolves.toContain('1 of 2¼ Stanleys · 30 oz');}
 // Undo through the same slow path while B is again cut off: the account, the device and both screens end at zero.
 await other.route('**/api/sync',r=>r.abort('internetdisconnected'));
 await page.getByRole('button',{name:'Remove last pour',exact:true}).click();await expect.poll(()=>box.state.days[today]?.water).toBe(0);await page.waitForTimeout(1500);
 expect(box.ops.filter(o=>o.type==='water')).toHaveLength(2);
 for(const p of [page,other]){const s=await saved(p);expect(s.water).toBe(0);expect(s.pending).toBe(0);expect(s.journal).toBe(0);await expect(waterText(p)).resolves.toContain('0 of 2¼ Stanleys · 0 oz');}
 await other.unroute('**/api/sync');await other.evaluate(()=>window.dispatchEvent(new Event('online')));await other.waitForTimeout(800);
 expect(box.state.days[today].water).toBe(0);expect(box.ops.filter(o=>o.type==='water')).toHaveLength(2);for(const p of [page,other])expect((await saved(p)).water).toBe(0);
 await other.close();
});

test('R164-2: an account read that began before another tab\'s change was acknowledged is not installed; the device keeps the acknowledged state, offline and after a reload',async({page,context})=>{
 const today=todayIn();const box=await open(page,seed());
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).pending.length)).toBe(0);
 // B's first account read is held open until released.
 const other=await context.newPage();await mock(other,box);const stale=JSON.parse(JSON.stringify(box.state));let release:()=>void=()=>{};const gate=new Promise<void>(res=>{release=res;});let entered=false;
 await other.route('**/api/state',async r=>{entered=true;await gate;await r.fulfill({json:stale});});
 await other.goto('/');await other.locator('.app-shell').waitFor();await expect.poll(()=>entered).toBe(true);
 await page.getByRole('checkbox',{name:'Floss complete',exact:true}).click();await expect.poll(()=>box.state.days[today]?.checks.floss).toBe(true);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).pending.length)).toBe(0);
 // The old answer arrives now. It must not roll the device back.
 await other.unroute('**/api/state');await mock(other,box);release();await other.waitForTimeout(1200);
 for(const p of [page,other]){const s=await saved(p);expect(s.floss,'device floss').toBe(true);expect(s.pending).toBe(0);await expect(p.getByRole('checkbox',{name:'Floss complete',exact:true})).toHaveAttribute('aria-checked','true');}
 expect(box.state.days[today].checks.floss).toBe(true);
 // Offline, and reloaded offline: the acknowledged state stands.
 await other.route('**/api/**',r=>r.abort('internetdisconnected'));await other.reload();await other.locator('.app-shell').waitFor();
 expect((await saved(other)).floss).toBe(true);await expect(other.getByRole('checkbox',{name:'Floss complete',exact:true})).toHaveAttribute('aria-checked','true');
 await other.close();
});

test('R164-2b: a write answer that arrives after a newer answer was saved does not install its older state; the read that follows restores the newest',async({page,context})=>{
 const today=todayIn();const box=await open(page,seed());
 // A's write answers slowly; B's write answers at once. A logs floss first, B logs walk. A's older answer lands last.
 await page.route('**/api/sync',async r=>{await new Promise(res=>setTimeout(res,1500));await r.fallback();});
 const other=await context.newPage();await mock(other,box);await other.goto('/');await other.locator('.home-view').waitFor();
 await page.getByRole('checkbox',{name:'Floss complete',exact:true}).click();await other.waitForTimeout(200);await other.getByRole('checkbox',{name:'Walk complete',exact:true}).click();
 await expect.poll(()=>box.state.days[today]?.checks.walk).toBe(true);await expect.poll(()=>box.state.days[today]?.checks.floss,{timeout:5000}).toBe(true);await page.waitForTimeout(2500);
 for(const p of [page,other]){const s=await p.evaluate(day=>{const x=JSON.parse(localStorage.getItem('flaccid75-v1')!);return {floss:x.state.days[day]?.checks.floss??false,walk:x.state.days[day]?.checks.walk??false,pending:x.pending.length};},today);expect(s).toEqual({floss:true,walk:true,pending:0});
  await expect(p.getByRole('checkbox',{name:'Walk complete',exact:true})).toHaveAttribute('aria-checked','true');await expect(p.getByRole('checkbox',{name:'Floss complete',exact:true})).toHaveAttribute('aria-checked','true');}
 expect(box.ops).toHaveLength(2);
 await other.close();
});

test('R164-3: a refusal answered while the snapshot cannot be saved is kept (journaled and shown) until the save succeeds, then set aside durably across a reload',async({page})=>{
 const today=todayIn();const state=seed();const floss=op(today,{type:'check',habit:'floss',value:true});
 // Journal-only recovery form: a snapshot with an empty queue and the change's own key; the snapshot key refuses writes while the flag is set.
 await page.route('**/api/state',r=>r.fulfill({json:state}));let rejections=0;
 await page.route('**/api/sync',r=>{rejections++;return r.fulfill({json:{state,accepted:[],rejected:[{id:floss.id,reason:'Refused by the account for this test'}]}});});
 await page.addInitScript(({state,op})=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');
  localStorage.setItem('flaccid75-v1',JSON.stringify({state,pending:[],failed:[],discarded:[],unlocked:true}));localStorage.setItem('my-wellness-op:'+op.id,JSON.stringify(op));
  const w=window as unknown as {__refuse:boolean};w.__refuse=true;const orig=Storage.prototype.setItem;Storage.prototype.setItem=function(this:Storage,k:string,v:string){if(this===localStorage&&w.__refuse&&k==='flaccid75-v1')throw new DOMException('quota','QuotaExceededError');orig.call(this,k,v);};},{state,op:floss});
 await page.goto('/');await page.locator('.app-shell').waitFor();await expect.poll(()=>rejections).toBeGreaterThan(0);await page.waitForTimeout(500);
 // Not saved yet: the change keeps its key, the device notice is on the page, and the refused change is not silently gone.
 let s=await saved(page);expect(s.journal).toBe(1);expect(s.failed).toBe(0);await expect(page.getByRole('status').filter({hasText:'Device storage is full'})).toBeVisible();
 // Storage recovers: the next answer lands the refusal in the set-aside list, the key leaves, and a reload still shows it.
 await page.evaluate(()=>{(window as unknown as {__refuse:boolean}).__refuse=false;window.dispatchEvent(new Event('online'));});
 await expect.poll(()=>saved(page).then(x=>x.failed),{timeout:5000}).toBe(1);s=await saved(page);expect(s.journal).toBe(0);expect(s.pending).toBe(0);
 await page.reload();await page.locator('.app-shell').waitFor();s=await saved(page);expect(s).toMatchObject({failed:1,journal:0,pending:0});
 await page.evaluate(()=>{location.hash='you';});await expect(page.getByRole('group',{name:'Changes the account refused'})).toBeVisible();await expect(page.getByText('Refused by the account for this test')).toBeVisible();
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByRole('checkbox',{name:'Floss complete',exact:true})).not.toBeChecked();
});

test('R164-4: lock and clear reaches every open tab, and neither a stale tab nor its late account answer can restore the cleared device',async({page,context})=>{
 const box=await open(page,seed());
 // B holds the app with an account read in flight that will answer 3 s later.
 const other=await context.newPage();await mock(other,box);await other.goto('/');await other.locator('.home-view').waitFor();
 await other.route('**/api/state',async r=>{await new Promise(res=>setTimeout(res,3000));await r.fallback();});await other.evaluate(()=>window.dispatchEvent(new Event('online')));await other.waitForTimeout(100);
 await page.evaluate(()=>{location.hash='you';});await page.getByRole('button',{name:'Lock this device',exact:true}).click();await page.getByRole('button',{name:'Lock and clear',exact:true}).click();await page.getByLabel('Passphrase').waitFor();
 // B shows the gate at once, with no local data in either tab.
 await expect(other.getByLabel('Passphrase')).toBeVisible({timeout:5000});
 const absent=(p:Page)=>p.evaluate(()=>({snapshot:localStorage.getItem('flaccid75-v1'),timers:localStorage.getItem('my-wellness-timers'),journal:Object.keys(localStorage).filter(k=>k.startsWith('my-wellness-op:')).length,marker:localStorage.getItem('my-wellness-locked')!==null}));
 for(const p of [page,other])expect(await absent(p)).toEqual({snapshot:null,timers:null,journal:0,marker:true});
 // B's late answer arrives: nothing is written, both tabs stay on the gate.
 await other.waitForTimeout(3500);
 for(const p of [page,other]){expect(await absent(p)).toEqual({snapshot:null,timers:null,journal:0,marker:true});await expect(p.getByLabel('Passphrase')).toBeVisible();expect(await p.locator('.app-shell').count()).toBe(0);}
 await other.close();
});

test('R164-5: the water meter fills exactly at the goal, proportionally below it and no further above it; the calorie band keeps its headroom',async({context})=>{
 const today=todayIn();const base=seed();
 const width=async(page:Page,hash:string)=>{await page.evaluate(h=>{location.hash=h;},hash);await page.locator('.meter-fill').first().waitFor();return page.evaluate(()=>{const f=document.querySelector<HTMLElement>('.meter-fill')!;const bar=f.parentElement!;return Math.round(f.getBoundingClientRect().width/bar.getBoundingClientRect().width*1000)/10;});};
 const target=base.profile!.targets.water;const results:Record<string,number>={};
 for(const [name,amount] of [['below',target/2],['at',target],['above',target*1.5]] as const){
  // A fresh page per state: the fixture is seeded once per page session.
  const page=await context.newPage();const state=apply(base,op(today,{type:'water',amount,label:'test'}));await open(page,state,{hash:'water'});results[name]=await width(page,'water');await page.close();
 }
 expect(results.below).toBeCloseTo(50,0);expect(results.at).toBe(100);expect(results.above).toBe(100);
 // Calories: a range band, so the bar keeps headroom past the upper edge and the band is visible.
 const meal=apply(base,op(today,{type:'meal',mealId:crypto.randomUUID(),calories:base.profile!.targets.calorieMax,protein:10}));const page=await context.newPage();await open(page,meal,{hash:'food'});
 await expect(page.locator('.meter-range')).toBeVisible();
 const band=await page.evaluate(()=>{const range=document.querySelector<HTMLElement>('.meter-range')!;const fill=range.parentElement!.querySelector<HTMLElement>('.meter-fill')!;const bar=range.parentElement!;return {fill:Math.round(fill.getBoundingClientRect().width/bar.getBoundingClientRect().width*100),rangeVisible:range.getBoundingClientRect().width>0};});
 expect(band.fill).toBeLessThan(100);expect(band.fill).toBeGreaterThan(80);expect(band.rangeVisible).toBe(true);
});

test('R164-6: the abs caption does not name a direction, and a past week\'s strip is named by its week rather than "This week"',async({page})=>{
 const today=todayIn();const past=addDays(today,-9);const box=await open(page,seed(20),{hash:'abs'});
 await expect(page.getByText('Pick a routine',{exact:true})).toBeVisible();expect(await page.getByText('below').count()).toBe(0);
 await page.getByRole('button',{name:/day streak\. Open progress/}).click();await page.getByLabel('Open any past day').fill(past);await page.getByRole('button',{name:'Backfill this day'}).click();await expect(page.getByText('Editing')).toBeVisible();
 await page.evaluate(()=>{location.hash='walk';});const head=page.locator('.week-strip-head');await expect(head).toContainText('Week of');await expect(head).not.toContainText('This week');await expect(page.getByRole('group',{name:/^Walks week of /})).toBeVisible();
 await page.getByRole('button',{name:'Back to today'}).click();await page.evaluate(()=>{location.hash='walk';});await expect(head).toContainText('This week');await expect(page.getByRole('group',{name:'Walks this week'})).toBeVisible();
 expect(box.state.profile).toBeTruthy();
});
