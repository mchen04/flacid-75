// Review 171: text that storage can hold (no split emoji, no NUL) on every path, a poisoned journal entry refused by id while the rest syncs,
// exact water targets, slash fractions, the oz target cap, stats-only target saves, and the privacy copy.
import {test,expect} from './fixtures';
import type {Page} from '@playwright/test';
import {open,seed,todayIn,op} from './helpers';
const oz=29.5735295625;
const HIGH=String.fromCharCode(0xD83D);
const local=(p:Page)=>p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('flaccid75-v1')!);return {pending:s.pending.length,failed:s.failed.map((f:{op:{type:string}})=>f.op.type),journal:Object.keys(localStorage).filter(k=>k.startsWith('my-wellness-op:')).length,plan:s.state.profile?.plan as string[]|undefined};});

test('R171-1: a plan line of 59 characters and an emoji saves whole and syncs; a line that would cut an emoji is clipped before it, never split; the move is usable in a workout',async({page})=>{
 const box=await open(page,seed(),{hash:'you'});
 await page.getByRole('button',{name:'Workout plan',exact:true}).click();await page.getByLabel('One move per line').fill('x'.repeat(59)+'😀\n'+'y'.repeat(60)+'😀\nPress-ups 💪');await page.getByRole('button',{name:'Save plan',exact:true}).click();
 await expect.poll(()=>box.state.profile?.plan).toEqual(['x'.repeat(59)+'😀','y'.repeat(60),'Press-ups 💪']);
 await expect.poll(()=>local(page).then(l=>l.pending)).toBe(0);const l=await local(page);expect(l).toMatchObject({pending:0,journal:0,failed:[]});expect(l.plan!.every(s=>s.isWellFormed())).toBe(true);
 await page.getByRole('button',{name:'Home'}).click();await page.evaluate(()=>{location.hash='workout';});await page.getByRole('checkbox',{name:'x'.repeat(59)+'😀'}).check();await page.getByRole('checkbox',{name:'Press-ups 💪'}).check();
 await page.getByRole('button',{name:'Finish',exact:true}).click();await expect.poll(()=>box.state.days[todayIn()]?.sessions?.workout?.items).toEqual(['x'.repeat(59)+'😀','Press-ups 💪']);
});

test('R171-2: a poisoned journal entry (a split emoji written by an older build) is refused by id with a reason and set aside, while a valid change in the same batch syncs; the device recovers and can lock',async({page})=>{
 const today=todayIn();const state=seed();const bad=op(today,{type:'plan',workout:['x'.repeat(59)+HIGH]});const pour=op(today,{type:'water',amount:30*oz,label:'Stanley'});
 const box=await open(page,state,{go:false,unlocked:false});
 await page.addInitScript(({state,bad,pour})=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem('flaccid75-v1',JSON.stringify({state,pending:[bad,pour],failed:[],discarded:[],acked:[],unlocked:true}));localStorage.setItem('my-wellness-op:'+bad.id,JSON.stringify(bad));localStorage.setItem('my-wellness-op:'+pour.id,JSON.stringify(pour));},{state,bad,pour});
 await page.goto('/');await page.locator('.home-view').waitFor();
 await expect.poll(()=>box.state.days[today]?.water??0).toBeCloseTo(30*oz,6);expect(box.rejected.map(r=>r.id)).toEqual([bad.id]);expect(box.rejected[0].reason).toContain('well-formed');
 await expect.poll(()=>local(page).then(l=>l.failed)).toEqual(['plan']);expect(await local(page)).toMatchObject({pending:0,journal:0});
 await page.evaluate(()=>{location.hash='you';});await expect(page.getByRole('group',{name:'Changes the account refused'})).toBeVisible();
 await page.getByRole('button',{name:'Lock this device',exact:true}).click();await expect(page.getByRole('button',{name:'Lock and clear',exact:true})).toBeEnabled();
});

test('R171-3: a temporary account failure shows a notice and keeps the change; it lands once when the account recovers',async({page})=>{
 const today=todayIn();const box=await open(page,seed());let calls=0;
 await page.route('**/api/sync',async r=>{calls++;if(calls<=2)return r.fulfill({status:503,json:{error:'Sync is unavailable. Changes stay on this device.'}});await r.fallback();});
 await page.getByRole('button',{name:'Log floss',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'could not save right now'})).toBeVisible();expect(await local(page)).toMatchObject({pending:1,journal:1});
 // Each retry is requested only after the previous attempt has settled (its sent mark is gone); an 'online' event during an attempt in flight is rightly ignored.
 const settled=()=>expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('my-wellness-sent:')).length)).toBe(0);
 // A recovery event that lands while an attempt is still in flight is honoured once that attempt settles, so no retry is lost.
 await settled();await page.evaluate(()=>window.dispatchEvent(new Event('online')));await expect.poll(()=>calls).toBe(2);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await expect.poll(()=>box.state.days[today]?.checks.floss,{timeout:10000}).toBe(true);expect(calls).toBeGreaterThanOrEqual(3);expect(box.ops.filter(o=>o.type==='check')).toHaveLength(1);await expect.poll(()=>local(page).then(l=>l.pending)).toBe(0);
});

test('R171-4: sixteen quarter-Stanley pours meet a 120 oz target exactly on screen and in completion; one short does not',async({page})=>{
 const today=todayIn();const box=await open(page,seed(),{hash:'you'});
 await page.getByRole('button',{name:'Daily targets'}).click();await page.getByLabel('Water · oz',{exact:true}).fill('120');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>box.state.profile?.targets.water).toBeCloseTo(120*oz,9);
 await page.evaluate(()=>{location.hash='water';});
 const quarter=page.getByRole('button',{name:'Log a quarter of a Stanley',exact:true});
 for(let i=0;i<15;i++){await quarter.click();await expect.poll(()=>box.state.days[today]?.waterLog?.length).toBe(i+1);}
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByRole('button',{name:'Open water',exact:true})).toContainText('112.5 oz');expect(box.state.days[today].water).toBeLessThan(120*oz);
 await page.getByRole('button',{name:'Open water',exact:true}).click();await quarter.click();await expect.poll(()=>box.state.days[today]?.waterLog?.length).toBe(16);
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByRole('button',{name:'Open water',exact:true})).toContainText('120 oz');
 const {completion}=await import('../../lib/domain');expect(completion(box.state.days[today]).water).toBe(true);expect(Math.abs(box.state.days[today].water-120*oz)).toBeLessThan(1e-6);
 await expect(page.locator('.row.water')).toHaveClass(/is-done/);
});

test('R171-5: "3/4 of the Stanley" proposes one three-quarter pour; "1/2 Stanley" proposes half',async({page})=>{
 const today=todayIn();const box=await open(page,seed(),{hash:'water'});
 await page.getByLabel('Or say it').fill('3/4 of the Stanley');await page.getByRole('button',{name:'Read it'}).click();await expect(page.getByRole('button',{name:'Add 22.5 oz'})).toBeVisible();await page.getByRole('button',{name:'Add 22.5 oz'}).click();
 await expect.poll(()=>box.state.days[today]?.water).toBeCloseTo(22.5*oz,6);
 await page.getByLabel('Or say it').fill('1/2 Stanley');await page.getByRole('button',{name:'Read it'}).click();await expect(page.getByRole('button',{name:'Add 15 oz'})).toBeVisible();await page.getByRole('button',{name:'Not this'}).click();
});

test('R171-6: the water target field in oz cannot exceed what the account accepts; the largest allowed value saves, and an out-of-range override is refused on the device with a reason, not set aside later',async({page})=>{
 const box=await open(page,seed(),{hash:'you'});
 await page.getByRole('button',{name:'Daily targets'}).click();const field=page.getByLabel('Water · oz',{exact:true});await expect(field).toHaveAttribute('max','202.8');
 await field.fill('202.8');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>box.state.profile?.targets.water).toBeCloseTo(202.8*oz,6);expect(box.rejected).toEqual([]);
 // Past the field's cap (the browser's own check is removed for the test): the device refuses before queueing, with a reason on the sheet, and nothing is set aside by the account later.
 await page.getByRole('button',{name:'Daily targets'}).click();await page.getByLabel('Water · oz',{exact:true}).evaluate(el=>el.removeAttribute('max'));await page.getByLabel('Water · oz',{exact:true}).fill('203');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Daily targets'})).toBeVisible();await expect(page.getByRole('status').filter({hasText:'outside the range'})).toBeVisible();expect(box.state.profile?.targets.water).toBeCloseTo(202.8*oz,6);
 await page.waitForTimeout(500);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).failed.length)).toBe(0);expect(box.rejected).toEqual([]);
});

test('R171-7: a targets save queued while another device added a treat and a plan does not hide or delete them once this device catches up',async({page})=>{
 const today=todayIn();const box=await open(page,seed());
 // Another device adds a treat and a plan on the account while this one is offline.
 const {apply}=await import('../../lib/domain');const treat=op(today,{type:'rewards',rewards:[{id:crypto.randomUUID(),name:'Film night',cost:50}]});const plan=op(today,{type:'plan',workout:['Squats','Rows']});
 box.state=apply(box.state,treat);box.state=apply(box.state,plan);box.seen.add(treat.id);box.seen.add(plan.id);
 // This device, offline and still holding the old profile, saves a protein target.
 await page.route('**/api/**',r=>r.abort('internetdisconnected'));await page.evaluate(()=>{location.hash='you';});await page.getByRole('button',{name:'Daily targets'}).click();await page.getByLabel('Protein · g',{exact:true}).fill('110');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).pending.length)).toBe(1);
 // The offline attempt has failed at the network (no sent mark remains) before the account is reachable again.
 await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('my-wellness-sent:')).length)).toBe(0);
 // Back online: the queued save syncs, and the other device's treat and plan are on screen and on the account.
 await page.unroute('**/api/**');await page.evaluate(()=>window.dispatchEvent(new Event('online')));await expect.poll(()=>box.state.profile?.targets.protein).toBe(110);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).pending.length)).toBe(0);
 expect(box.state.profile?.rewards?.map(r=>r.name)).toEqual(['Film night']);expect(box.state.profile?.plan).toEqual(['Squats','Rows']);
 const shown=await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('flaccid75-v1')!).state.profile;return {rewards:p.rewards?.map((r:{name:string})=>r.name),plan:p.plan};});expect(shown).toEqual({rewards:['Film night'],plan:['Squats','Rows']});
 await page.getByRole('button',{name:'Home'}).click();await page.evaluate(()=>{location.hash='rewards';});await expect(page.getByText('Film night')).toBeVisible();
});

test('R171-8: the in-app privacy copy names both sends (meals and unread water notes) and promises nothing about third-party retention',async({page})=>{
 await open(page,seed(),{hash:'rules'});
 const rules=await page.locator('.rules').innerText();
 expect(rules).toContain('sync to your private account');expect(rules).toContain('typed water note');expect(rules).toContain('free models');expect(rules).toContain('No other log is sent to a third party');expect(rules).not.toContain('leaves the device');expect(rules).not.toContain('Only the meal you describe or photograph is sent');
 await page.evaluate(()=>{location.hash='water';});await expect(page.getByText('A note it cannot read is sent, with your container names, to a free third-party model')).toBeVisible();
 await page.evaluate(()=>{location.hash='food';});await expect(page.getByText('goes to a free third-party model for the estimate')).toBeVisible();
});

test('W172: typed symbol shares and mixed numbers propose the right pour on screen',async({page})=>{
 await open(page,seed(),{hash:'water'});
 for(const [phrase,label] of [['¾ of a Stanley','Add 22.5 oz'],['½ a Stanley','Add 15 oz'],['two and a half Stanleys','Add 75 oz'],['one and a half Stanleys','Add 45 oz'],['two Stanleys','Add 60 oz']] as const){
  await page.getByLabel('Or say it').fill(phrase);await page.getByRole('button',{name:'Read it'}).click();await expect(page.getByRole('button',{name:label,exact:true})).toBeVisible();await page.getByRole('button',{name:'Not this'}).click();
 }
});
