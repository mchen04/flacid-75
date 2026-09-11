// Review 165: an answer's state is bound to the changes it contains (receipt), lock clears the device before any network, and a tab that
// missed storage events reconciles the lock when it is shown again. Plus the bounded C2/C3/C4 control-flow concerns.
import {test,expect} from './fixtures';
import type {Page} from '@playwright/test';
import {apply} from '../../lib/domain';
import {open,mock,seed,todayIn} from './helpers';
const stanley=30*29.5735295625;
const device=(p:Page)=>p.evaluate(day=>{const s=JSON.parse(localStorage.getItem('flaccid75-v1')!);return {water:s.state.days[day]?.water??0,floss:s.state.days[day]?.checks.floss??false,pending:s.pending.length,journal:Object.keys(localStorage).filter(k=>k.startsWith('my-wellness-op:')).length,revision:s.revision};},todayIn());
const waterText=(p:Page)=>p.getByRole('button',{name:'Open water',exact:true}).innerText();

// A's read is held; B's change is applied by the account while B's own answer is held; the answers are then released in the given order.
async function heldOrder(page:Page,other:Page,box:Awaited<ReturnType<typeof open>>,action:()=>Promise<void>,order:'read-first'|'write-first'){
 let releaseA!:()=>void,releaseB!:()=>void;const gateA=new Promise<void>(r=>{releaseA=r;});const gateB=new Promise<void>(r=>{releaseB=r;});let enteredA=false,appliedB=false;let readsA=0;
 const onReq=(r:{url():string})=>{if(r.url().includes('/api/state'))readsA++;};page.on('request',onReq);
 await page.route('**/api/state',async r=>{enteredA=true;await gateA;await r.fulfill({json:{...box.state,applied:[...box.seen].slice(-200),revision:box.seen.size}});});
 await page.evaluate(()=>window.dispatchEvent(new Event('online')));await expect.poll(()=>enteredA).toBe(true);
 await other.route('**/api/sync',async r=>{const ops=r.request().postDataJSON() as {id:string}[];for(const op of ops){if(!box.seen.has(op.id)){box.state=apply(box.state,op as never);box.ops.push(op as never);box.seen.add(op.id);}}appliedB=true;await gateB;await r.fulfill({json:{state:box.state,accepted:ops.map(o=>o.id),rejected:[],applied:[...box.seen].slice(-200),revision:box.seen.size}});});
 await action();await expect.poll(()=>appliedB).toBe(true);
 if(order==='read-first'){releaseA();await page.waitForTimeout(400);}else{releaseB();await other.waitForTimeout(400);releaseA();await page.waitForTimeout(400);}
 const firstLook={a:await device(page),b:await device(other),aText:await waterText(page),bText:await waterText(other),readsA};
 if(order==='read-first'){releaseB();await other.waitForTimeout(400);}
 await page.unroute('**/api/state');await other.unroute('**/api/sync');page.off('request',onReq);
 return firstLook;
}

test('R165-1: a read that already contains another tab\'s applied change, answered before that tab\'s own acknowledgement, counts the change once on the device and both screens, in both answer orders, for a pour and an undo, and after an offline reload',async({page,context})=>{
 const today=todayIn();const box=await open(page,seed());
 const other=await context.newPage();await mock(other,box);await other.goto('/');await other.locator('.home-view').waitFor();await page.waitForTimeout(300);
 await page.route('**/api/sync',r=>r.abort('internetdisconnected'));
 // Read answered first (the reviewer's order): before any repair round trip, A holds one Stanley with nothing pending.
 const first=await heldOrder(page,other,box,()=>other.getByRole('button',{name:'Add a Stanley',exact:true}).click(),'read-first');
 expect(box.state.days[today].water).toBeCloseTo(stanley,6);expect(box.ops.filter(o=>o.type==='water')).toHaveLength(1);
 expect(first.readsA,'A made exactly one read; nothing was repaired by a second one').toBe(1);
 expect(first.a.water).toBeCloseTo(stanley,6);expect(first.a.pending).toBe(0);expect(first.a.journal).toBe(0);expect(first.aText).toContain('1 of 2¼ Stanleys · 30 oz');
 await expect.poll(()=>device(other).then(d=>d.pending)).toBe(0);expect((await device(other)).water).toBeCloseTo(stanley,6);await expect(waterText(other)).resolves.toContain('1 of 2¼ Stanleys · 30 oz');
 // Write answered first, then the held read: still one Stanley.
 const second=await heldOrder(page,other,box,()=>other.getByRole('button',{name:'Add a Stanley',exact:true}).click(),'write-first');
 expect(box.ops.filter(o=>o.type==='water')).toHaveLength(2);expect(box.state.days[today].water).toBeCloseTo(2*stanley,6);
 for(const d of [second.a,second.b]){expect(d.water).toBeCloseTo(2*stanley,6);expect(d.pending).toBe(0);}expect(second.aText).toContain('2 of 2¼ Stanleys · 60 oz');expect(second.bText).toContain('2 of 2¼ Stanleys · 60 oz');
 // Undo through the held read: the account and both tabs end at one Stanley, not zero.
 const third=await heldOrder(page,other,box,()=>other.getByRole('button',{name:'Undo last pour',exact:true}).click(),'read-first');
 expect(box.ops.filter(o=>o.type==='water')).toHaveLength(3);expect(box.state.days[today].water).toBeCloseTo(stanley,6);
 expect(third.a.water).toBeCloseTo(stanley,6);expect(third.a.pending).toBe(0);expect(third.aText).toContain('1 of 2¼ Stanleys · 30 oz');
 await expect.poll(()=>device(other).then(d=>d.pending)).toBe(0);expect((await device(other)).water).toBeCloseTo(stanley,6);
 // Offline reload of A keeps exactly one Stanley, with nothing pending and no journal.
 await page.route('**/api/**',r=>r.abort('internetdisconnected'));await page.reload();await page.locator('.home-view').waitFor();
 const after=await device(page);expect(after.water).toBeCloseTo(stanley,6);expect(after.pending).toBe(0);expect(after.journal).toBe(0);await expect(waterText(page)).resolves.toContain('1 of 2¼ Stanleys · 30 oz');
 await other.close();
});

test('R165-2: lock and clear empties the device before the account is asked, even when that request never answers; the request is retried when the locked app reopens',async({page,context})=>{
 await open(page,seed());let deletes=0;
 await page.route('**/api/auth',async r=>{if(r.request().method()==='DELETE'){deletes++;return new Promise<void>(()=>{});}await r.fallback();});
 await page.evaluate(()=>{location.hash='you';});await page.getByRole('button',{name:'Lock this device',exact:true}).click();await page.getByRole('button',{name:'Lock and clear',exact:true}).click();
 // The gate and the cleared device are immediate; the hanging request changes nothing.
 await expect(page.getByLabel('Passphrase')).toBeVisible({timeout:1500});
 const cleared=()=>page.evaluate(()=>({snapshot:localStorage.getItem('flaccid75-v1'),timers:localStorage.getItem('my-wellness-timers'),journal:Object.keys(localStorage).filter(k=>k.startsWith('my-wellness-op:')).length,marker:localStorage.getItem('my-wellness-locked')!==null,logoutPending:localStorage.getItem('my-wellness-logout')!==null}));
 expect(await cleared()).toEqual({snapshot:null,timers:null,journal:0,marker:true,logoutPending:true});expect(deletes).toBe(1);
 await page.waitForTimeout(800);expect(await cleared()).toMatchObject({snapshot:null,marker:true});expect(await page.locator('.app-shell').count()).toBe(0);
 // Closed and reopened: still the gate, still no data, and the account is asked again; once it answers, nothing is left pending.
 await page.close();const again=await context.newPage();let answered=0;await again.route('**/api/auth',async r=>{if(r.request().method()==='DELETE'){answered++;return r.fulfill({json:{ok:true}});}await r.fallback();});
 await again.goto('/');await expect(again.getByLabel('Passphrase')).toBeVisible();await expect.poll(()=>answered).toBe(1);
 await expect.poll(()=>again.evaluate(()=>localStorage.getItem('my-wellness-logout'))).toBeNull();
 expect(await again.evaluate(()=>({snapshot:localStorage.getItem('flaccid75-v1'),marker:localStorage.getItem('my-wellness-locked')!==null}))).toEqual({snapshot:null,marker:true});
 await again.close();
});

test('R165-3: a tab that received no storage events reconciles the lock when it is shown again (page shown from cache, made visible, back online) and writes nothing',async({page,context})=>{
 const box=await open(page,seed());
 // Tabs B and C never receive storage events (as a page restored from the back-forward cache).
 const deaf=async()=>{const p=await context.newPage();await p.addInitScript(()=>{const orig=window.addEventListener;window.addEventListener=function(this:Window,type:string,...rest:unknown[]){if(type==='storage')return;return (orig as unknown as (...a:unknown[])=>void).call(this,type,...rest);};});await mock(p,box);await p.goto('/');await p.locator('.home-view').waitFor();return p;};
 const b=await deaf();const c=await deaf();
 await page.route('**/api/auth',r=>r.fulfill({json:{ok:true}}));await page.evaluate(()=>{location.hash='you';});await page.getByRole('button',{name:'Lock this device',exact:true}).click();await page.getByRole('button',{name:'Lock and clear',exact:true}).click();await page.getByLabel('Passphrase').waitFor();
 // Until shown again the deaf tabs still hold the old screen; that is the case under test.
 await b.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await expect(b.getByLabel('Passphrase')).toBeVisible({timeout:1500});expect(await b.locator('.home-view').count()).toBe(0);
 await c.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(c.getByLabel('Passphrase')).toBeVisible({timeout:1500});expect(await c.locator('.home-view').count()).toBe(0);
 await b.waitForTimeout(800);
 for(const p of [page,b,c])expect(await p.evaluate(()=>({snapshot:localStorage.getItem('flaccid75-v1'),journal:Object.keys(localStorage).filter(k=>k.startsWith('my-wellness-op:')).length,marker:localStorage.getItem('my-wellness-locked')!==null}))).toEqual({snapshot:null,journal:0,marker:true});
 await b.close();await c.close();
});

test('R165-4: when the lock marker cannot be written until the clear frees space, the device is still cleared and fenced, and another tab\'s in-flight answer writes nothing; unparsable journal keys are cleared too',async({page,context})=>{
 const box=await open(page,seed());
 const other=await context.newPage();await mock(other,box);await other.goto('/');await other.locator('.home-view').waitFor();
 // B has an account read in flight that answers 3 s later.
 await other.route('**/api/state',async r=>{await new Promise(res=>setTimeout(res,3000));await r.fallback();});await other.evaluate(()=>window.dispatchEvent(new Event('online')));await other.waitForTimeout(100);
 // A: the marker write fails while the snapshot is present (a full device); a stray unparsable journal key is present as well.
 await page.evaluate(()=>{localStorage.setItem('my-wellness-op:stray','not json');const orig=Storage.prototype.setItem;Storage.prototype.setItem=function(this:Storage,k:string,v:string){if(this===localStorage&&k==='my-wellness-locked'&&localStorage.getItem('flaccid75-v1')!==null)throw new DOMException('quota','QuotaExceededError');orig.call(this,k,v);};});
 await page.route('**/api/auth',r=>r.fulfill({json:{ok:true}}));await page.evaluate(()=>{location.hash='you';});await page.getByRole('button',{name:'Lock this device',exact:true}).click();await page.getByRole('button',{name:'Lock and clear',exact:true}).click();await page.getByLabel('Passphrase').waitFor();
 const state=(p:Page)=>p.evaluate(()=>({snapshot:localStorage.getItem('flaccid75-v1'),journal:Object.keys(localStorage).filter(k=>k.startsWith('my-wellness-op:')).length,marker:localStorage.getItem('my-wellness-locked')!==null}));
 expect(await state(page)).toEqual({snapshot:null,journal:0,marker:true});
 await expect(other.getByLabel('Passphrase')).toBeVisible({timeout:3000});
 await other.waitForTimeout(3500);
 for(const p of [page,other]){expect(await state(p)).toEqual({snapshot:null,journal:0,marker:true});await expect(p.getByLabel('Passphrase')).toBeVisible();}
 await other.close();
});

test('C2: a refused batch sets its first change aside, a read follows at once so the refused effect leaves the screen, and the rest of the queue is retried within a second',async({page})=>{
 const today=todayIn();const box=await open(page,seed());
 // The account refuses the first batch outright; later batches are accepted.
 let refusals=0;await page.route('**/api/sync',async r=>{if(refusals===0){refusals++;return r.fulfill({status:400,json:{error:'The account refused this batch.'}});}await r.fallback();});
 await page.route('**/api/**',r=>r.abort('internetdisconnected'));await page.getByRole('button',{name:'Log floss',exact:true}).click();await page.getByRole('button',{name:'Log walk',exact:true}).click();
 await page.waitForTimeout(300);await page.unroute('**/api/**');await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await expect.poll(()=>box.state.days[today]?.checks.walk,{timeout:2000}).toBe(true);
 await expect(page.getByRole('button',{name:'Log floss',exact:true})).toBeVisible({timeout:2000});await expect(page.getByRole('button',{name:'Undo walk',exact:true})).toHaveAttribute('aria-pressed','true');
 const s=await page.evaluate(day=>{const x=JSON.parse(localStorage.getItem('flaccid75-v1')!);return {floss:x.state.days[day]?.checks.floss??false,failed:x.failed.map((f:{op:{habit?:string}})=>f.op.habit),pending:x.pending.length};},today);
 expect(s).toEqual({floss:false,failed:['floss'],pending:0});expect(box.state.days[today].checks.floss).toBeUndefined();
});

test('C4: the saved epoch advances on every saved answer even when this tab\'s memory lags behind the device',async({page,context})=>{
 const today=todayIn();const box=await open(page,seed());
 const other=await context.newPage();await mock(other,box);await other.goto('/');await other.locator('.home-view').waitFor();
 const epoch=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).epoch as number);
 const e0=await epoch();
 // B saves several answers while A's sync is held; A's memory lags. When A's answer lands, the saved epoch still rises.
 await page.route('**/api/state',async r=>{await new Promise(res=>setTimeout(res,1500));await r.fallback();});await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await other.getByRole('button',{name:'Log floss',exact:true}).click();await expect.poll(()=>box.state.days[today]?.checks.floss).toBe(true);await other.getByRole('button',{name:'Log walk',exact:true}).click();await expect.poll(()=>box.state.days[today]?.checks.walk).toBe(true);
 const eB=await epoch();expect(eB).toBeGreaterThan(e0);await page.waitForTimeout(2000);
 expect(await epoch()).toBeGreaterThan(eB);
 await other.close();
});

test('R165-5: a full receipt that no longer lists an older applied change this tab still holds does not count it twice; the change is presented once more and settled exactly',async({page,context})=>{
 const today=todayIn();const box=await open(page,seed());
 const other=await context.newPage();await mock(other,box);await other.goto('/');await other.locator('.home-view').waitFor();await page.waitForTimeout(300);
 await page.route('**/api/sync',r=>r.abort('internetdisconnected'));
 let releaseA!:()=>void;const gateA=new Promise<void>(r=>{releaseA=r;});let enteredA=false;let readsA=0,writesA=0;
 page.on('request',r=>{if(r.url().includes('/api/state'))readsA++;if(r.url().includes('/api/sync'))writesA++;});
 // A's read answers with the state after B's pour, but 200 later changes have pushed B's pour out of the receipt.
 await page.route('**/api/state',async r=>{enteredA=true;await gateA;for(let i=0;i<200;i++)box.seen.add(crypto.randomUUID());await r.fulfill({json:{...box.state,applied:[...box.seen].slice(-200),revision:box.seen.size}});});
 await page.evaluate(()=>window.dispatchEvent(new Event('online')));await expect.poll(()=>enteredA).toBe(true);
 let releaseB!:()=>void;const gateB=new Promise<void>(r=>{releaseB=r;});let appliedB=false;
 await other.route('**/api/sync',async r=>{const ops=r.request().postDataJSON() as {id:string}[];for(const op of ops){if(!box.seen.has(op.id)){box.state=apply(box.state,op as never);box.ops.push(op as never);box.seen.add(op.id);}}appliedB=true;await gateB;await r.fulfill({json:{state:box.state,accepted:ops.map(o=>o.id),rejected:[],applied:[...box.seen].slice(-200),revision:box.seen.size}});});
 await other.getByRole('button',{name:'Add a Stanley',exact:true}).click();await expect.poll(()=>appliedB).toBe(true);
 // A's answer lands with B's pour unclassified: A shows one Stanley, never two, and presents the held change once for an exact answer.
 await page.unroute('**/api/sync');await mock(page,box);releaseA();await page.waitForTimeout(600);
 const d=await device(page);expect(d.water).toBeCloseTo(stanley,6);await expect(waterText(page)).resolves.toContain('1 of 2¼ Stanleys · 30 oz');
 await expect.poll(()=>device(page).then(x=>x.pending)).toBe(0);expect(readsA).toBe(1);expect(writesA).toBeGreaterThanOrEqual(1);
 expect(box.ops.filter(o=>o.type==='water')).toHaveLength(1);expect(box.state.days[today].water).toBeCloseTo(stanley,6);
 releaseB();await other.waitForTimeout(500);expect((await device(other)).water).toBeCloseTo(stanley,6);await expect(waterText(other)).resolves.toContain('1 of 2¼ Stanleys · 30 oz');
 await other.close();
});

test('R165-6: a change that has never been sent is always shown, even when a late read arrives with a full receipt, and it survives going offline',async({page,context})=>{
 const today=todayIn();const box=await open(page,seed());
 for(let i=0;i<220;i++){const op={id:crypto.randomUUID(),at:new Date().toISOString(),day:today,zone:'America/Los_Angeles',type:'check' as const,habit:'floss' as const,value:false};box.state=apply(box.state,op);box.ops.push(op);box.seen.add(op.id);}
 const other=await context.newPage();await mock(other,box);await other.route('**/api/sync',r=>r.abort('internetdisconnected'));await other.goto('/');await other.locator('.home-view').waitFor();await page.waitForTimeout(300);
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});let entered=false;
 await page.route('**/api/state',async r=>{entered=true;await gate;await r.fallback();});await page.route('**/api/sync',r=>r.abort('internetdisconnected'));
 await page.evaluate(()=>window.dispatchEvent(new Event('online')));await expect.poll(()=>entered).toBe(true);
 await other.getByRole('button',{name:'Add a Stanley',exact:true}).click();await expect(waterText(other)).resolves.toContain('30');
 release();await page.waitForTimeout(500);await context.setOffline(true);
 expect(box.state.days[today]?.water??0).toBe(0);
 for(const p of [page,other]){const d=await device(p);expect(d.water).toBeCloseTo(stanley,6);expect(d.pending).toBe(1);await expect(waterText(p)).resolves.toContain('1 of 2¼ Stanleys · 30 oz');}
 await context.setOffline(false);await other.close();
});

test('R165-7: unlocking with a held change the account has already applied counts it once',async({page})=>{
 const today=todayIn();const base=seed();const op={id:crypto.randomUUID(),at:new Date().toISOString(),day:today,zone:'America/Los_Angeles',type:'water' as const,amount:stanley};const state=apply(base,op);
 const box=await open(page,state,{go:false,unlocked:false});box.ops.push(op);box.seen.add(op.id);
 await page.addInitScript(({state,op})=>{localStorage.setItem('flaccid75-v1',JSON.stringify({state,pending:[op],failed:[],discarded:[],acked:[],unlocked:false}));localStorage.setItem('my-wellness-op:'+op.id,JSON.stringify(op));},{state,op});
 await page.route('**/api/auth',r=>r.fulfill({json:{ok:true}}));await page.route('**/api/sync',r=>r.abort('internetdisconnected'));
 await page.goto('/');await page.getByLabel('Passphrase').fill('local-fixture');await page.getByRole('button',{name:'Open',exact:true}).click();await page.locator('.home-view').waitFor();await page.waitForTimeout(500);
 const d=await device(page);expect(d.water).toBeCloseTo(stanley,6);expect(d.pending).toBe(0);expect(d.journal).toBe(0);await expect(waterText(page)).resolves.toContain('1 of 2¼ Stanleys · 30 oz');
 expect(box.state.days[today].water).toBeCloseTo(stanley,6);
});
