import {test,expect,type Page} from '@playwright/test';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {emptyState,computeTargets,localDate,addDays,apply,type State} from '../../lib/domain';
function seed(startOffset=0){const today=localDate(new Date(),'America/Los_Angeles');const stats={height:165,weight:65,age:30,activity:1 as const,goal:'maintain' as const};return {...emptyState(),clock:{zone:'America/Los_Angeles',anchorDay:today,anchorLocal:today},profile:{...stats,targets:computeTargets(stats),overrides:{},baselineWeight:65,startDay:addDays(today,-startOffset)}} as State;}
async function open(page:Page,state:State){await page.route('**/api/state',r=>r.fulfill({json:state}));await page.route('**/api/sync',r=>{const ops=r.request().postDataJSON();for(const op of ops)state=apply(state,op);return r.fulfill({json:{state,accepted:ops.map((o:{id:string})=>o.id),rejected:[]}});});await page.addInitScript(s=>localStorage.setItem('flaccid75-v1',JSON.stringify({state:s,pending:[],unlocked:true})),state);await page.goto('/');await page.getByRole('button',{name:'Workout',exact:true}).waitFor();}
const shellRects=(page:Page)=>page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('.app-shell > *, .today-view > *, .pair > *, .chips > *')].map(el=>{const r=el.getBoundingClientRect();return [el.className.split(' ')[0],Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)].join(':');}));
test('water goes down by one tap with no dialog, and never below zero',async({page})=>{
 await open(page,seed());
 const water=page.getByRole('button',{name:'Water',exact:true});const minus=page.getByRole('button',{name:'Remove a glass'});
 await expect(minus).toBeDisabled();
 await water.click();await water.click();await expect(page.getByText('0.5 / 2 L')).toBeVisible();
 await minus.click();await expect(page.getByText('0.25 / 2 L')).toBeVisible();await expect(page.locator('dialog[open]')).toHaveCount(0);
 await minus.click();await expect(page.getByText('0 / 2 L')).toBeVisible();await expect(minus).toBeDisabled();
});
test('nothing transient appears and nothing shifts on a habit tap, a pour, a meal or a removal',async({page})=>{
 await open(page,seed());
 await page.route('**/api/estimate',r=>r.fulfill({json:{items:[{name:'banana, raw',grams:120,calories:107,protein:1.3,source:'usda',match:'Bananas, raw',fdcId:173944}],calories:107,protein:1.3,model:'test'}}));
 // Watch the whole document for anything that is added and later removed, other than the SVG petals inside the hero.
 await page.evaluate(()=>{const w=window as unknown as {__added:string[];__removed:string[]};w.__added=[];w.__removed=[];new MutationObserver(list=>{for(const m of list){for(const n of m.addedNodes)if(n instanceof Element&&!n.closest('.hero, dialog'))w.__added.push(n.tagName+'.'+n.className);for(const n of m.removedNodes)if(n instanceof Element&&!n.closest('.hero, dialog')&&!(n instanceof HTMLDialogElement))w.__removed.push(n.tagName+'.'+n.className);}}).observe(document.body,{childList:true,subtree:true});});
 const before=await shellRects(page);
 for(const habit of ['Workout','Abs','Floss','Walk','Water'])await page.getByRole('button',{name:habit,exact:true}).click();
 await page.getByRole('button',{name:'Remove a glass'}).click();
 await page.getByRole('button',{name:'Log a meal'}).click();await page.getByLabel('What did you eat?').fill('a banana');await page.getByRole('button',{name:'Look it up'}).click();await page.getByRole('button',{name:'Add to today'}).click();await expect(page.getByText('107 kcal')).toBeVisible();
 await page.getByRole('button',{name:'Log a meal'}).click();await page.getByRole('button',{name:'Today’s food · 1'}).click();await page.getByRole('button',{name:'Remove meal 1'}).click();await expect(page.getByText('Nothing yet.')).toBeVisible();await page.getByRole('button',{name:'Close'}).click();
 await page.waitForTimeout(5500);
 const after=await shellRects(page);expect(after).toEqual(before);
 for(const role of ['status','alert'])await expect(page.getByRole(role as 'status')).toHaveCount(0);
 await expect(page.locator('.toast, .snackbar, .banner, [class*=toast], [class*=snack], [class*=banner]')).toHaveCount(0);
 const churn=await page.evaluate(()=>{const w=window as unknown as {__added:string[];__removed:string[]};return {added:w.__added,removed:w.__removed};});
 // The only nodes that come and go are the food sheet's own contents (inside <dialog>) and the animated hero; nothing else appears or disappears.
 expect(churn.removed.filter(n=>!n.startsWith('DIALOG')),JSON.stringify(churn)).toEqual([]);
 await writeFile(`evidence/v3/transient-check-${test.info().project.name}.json`,JSON.stringify({rectsUnchanged:true,statusOrAlertNodes:0,addedOutsideHeroAndSheet:churn.added,removedOutsideHeroAndSheet:churn.removed},null,2));
});
test('the week strip opens a past day for backfill and comes back to today',async({page})=>{
 await open(page,seed(10));const today=localDate(new Date(),'America/Los_Angeles');const yesterday=addDays(today,-1);
 const strip=page.getByRole('group',{name:'This week'});
 const target=strip.getByRole('button',{pressed:false}).filter({hasNot:page.locator('[disabled]')}).first();
 if(await strip.getByRole('button',{pressed:false}).filter({hasText:String(Number(yesterday.slice(-2)))}).count()){await strip.getByRole('button',{pressed:false}).filter({hasText:String(Number(yesterday.slice(-2)))}).first().click();}else await target.click();
 await expect(page.getByRole('heading',{name:'Past day'})).toBeVisible();await expect(page.getByRole('button',{name:'Back to today'})).toBeVisible();
 await page.getByRole('button',{name:'Workout',exact:true}).click();await expect(page.getByRole('button',{name:'Workout',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Back to today'}).click();await expect(page.getByRole('heading',{name:'Past day'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Workout',exact:true})).toHaveAttribute('aria-pressed','false');
});
test('the served icons, maskable icon, apple touch icon and splash are the new brand',async({page,request,baseURL})=>{
 const manifest=await (await request.get(baseURL+'/manifest.webmanifest')).json();
 const hashes:Record<string,string>={};
 for(const path of [...manifest.icons.map((i:{src:string})=>i.src),'/apple-touch-icon.png','/splash-1170x2532.png','/icon.svg']){const body=await (await request.get(baseURL+path)).body();hashes[path]=createHash('sha256').update(body).digest('hex');expect(body.equals(await readFile('public'+path)),path).toBe(true);}
 const before=Object.fromEntries((await readFile('evidence/v3/icons-before.txt','utf8')).trim().split('\n').map(l=>{const [hash,file]=l.split(/\s+/);return ['/'+file.replace('public/',''),hash];}));
 for(const [path,hash] of Object.entries(hashes))expect(hash,path).not.toBe(before[path]);
 expect(manifest.theme_color).toBe('#f4eee6');expect(manifest.description).not.toMatch(/pip/i);
 await page.goto('/icon-512.png');await page.screenshot({path:'evidence/v3/icon-512-rendered.png'});
 await page.setViewportSize({width:390,height:844});await page.goto('/splash-1170x2532.png');await page.screenshot({path:'evidence/v3/splash-rendered.png'});
 await writeFile('evidence/v3/icons-served.json',JSON.stringify({served:hashes,before,changed:true},null,2));
});
