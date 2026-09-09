import {test,expect,virtual} from './fixtures';
import {install} from '../../scripts/virtual-server.mjs';
import type {Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {emptyState,computeTargets,localDate,apply,type State} from '../../lib/domain';
function seed(){const today=localDate(new Date(),'America/Los_Angeles');const stats={height:165,weight:65,age:30,activity:1 as const,goal:'maintain' as const};return {...emptyState(),clock:{zone:'America/Los_Angeles',anchorDay:today,anchorLocal:today},profile:{...stats,targets:computeTargets(stats),overrides:{},baselineWeight:65,startDay:today}} as State;}
async function open(page:Page,state:State){await page.route('**/api/state',r=>r.fulfill({json:state}));await page.route('**/api/sync',r=>{const ops=r.request().postDataJSON();for(const op of ops)state=apply(state,op);return r.fulfill({json:{state,accepted:ops.map((o:{id:string})=>o.id),rejected:[]}});});await page.addInitScript(s=>localStorage.setItem('flaccid75-v1',JSON.stringify({state:s,pending:[],unlocked:true})),state);await page.goto('/');await page.getByRole('button',{name:'Workout',exact:true}).waitFor();}
const rects=(page:Page)=>page.evaluate(()=>Object.fromEntries([...document.querySelectorAll<HTMLElement>('.hero,.card,.chip-habit,.bottom-nav,.week-strip,.topbar')].map((el,i)=>{const r=el.getBoundingClientRect();return [el.className.split(' ')[0]+i,[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]];})));
test('a tap changes state in under 100 ms and shifts no layout, with every habit animated distinctly',async({page})=>{
 await open(page,seed());
 const before=await rects(page);const latencies:Record<string,number>={};
 for(const habit of ['Workout','Abs','Walk','Floss','Water']){
  const ms=await page.evaluate(name=>new Promise<number>(resolve=>{const button=document.querySelector<HTMLElement>(`button[aria-label="${name}"]`)!;const start=performance.now();const observer=new MutationObserver(()=>{if(button.getAttribute('aria-pressed')==='true'||name==='Water'){observer.disconnect();resolve(performance.now()-start);}});observer.observe(button,{attributes:true,subtree:true,childList:true,characterData:true});button.click();}),habit);
  latencies[habit]=ms;expect(ms,habit).toBeLessThan(100);
  const button=page.getByRole('button',{name:habit,exact:true});
  if(habit!=='Water')await expect(button).toHaveAttribute('aria-pressed','true');
  await expect(habit==='Water'?page.locator('.card.water'):button).toHaveClass(new RegExp({Workout:'lifting',Abs:'crunching',Walk:'moving',Floss:'shining',Water:'pouring'}[habit]!));
  await page.screenshot({path:`evidence/habit-${habit.toLowerCase()}-${test.info().project.name}.png`});
 }
 const after=await rects(page);expect(after).toEqual(before);
 // Interruptible: a second tap during the animation unchecks instantly.
 await page.getByRole('button',{name:'Workout',exact:true}).click();await expect(page.getByRole('button',{name:'Workout',exact:true})).toHaveAttribute('aria-pressed','false');
 // The water glass visibly rose.
 const level=await page.evaluate(()=>getComputedStyle(document.querySelector('.liquid')!).transform);expect(level).not.toBe('none');
 await writeFile(`evidence/tap-latency-${test.info().project.name}.json`,JSON.stringify({latencies,layoutShift:false,viewport:'390x844',note:'MutationObserver from click to aria-pressed/text change; desktop engine timing'},null,2));
});
test('walking moves the marker along the path and eating animates the bowl',async({page})=>{
 await open(page,seed());
 const start=await page.locator('.walker').boundingBox();await page.getByRole('button',{name:'Walk',exact:true}).click();await page.waitForTimeout(1900);const end=await page.locator('.walker').boundingBox();expect(end!.x-start!.x).toBeGreaterThan(150);
 await page.route('**/api/estimate',r=>r.fulfill({json:{items:[{name:'banana, raw',grams:120,calories:107,protein:1.3,source:'usda',match:'Bananas, raw',fdcId:173944}],calories:107,protein:1.3,model:'test'}}));
 await page.getByRole('button',{name:'Log a meal'}).click();await page.getByLabel('What did you eat?').fill('a banana');await page.getByRole('button',{name:'Look it up'}).click();await page.getByRole('button',{name:'Add to today'}).click();
 await expect(page.locator('.food')).toHaveClass(/eating/);await expect(page.locator('.food .bowl')).toHaveClass(/is-eating/);await page.screenshot({path:`evidence/food-eating-${test.info().project.name}.png`});await expect(page.getByText('107 kcal')).toBeVisible();
});
test('reduced motion disables every animation and transition',async({browser})=>{
 const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});if(virtual)await install(context);const page=await context.newPage();await open(page,seed());
 await page.getByRole('button',{name:'Walk',exact:true}).click();await page.getByRole('button',{name:'Water',exact:true}).click();
 const animated=await page.evaluate(()=>[...document.querySelectorAll('*')].filter(el=>{const s=getComputedStyle(el);return s.animationName!=='none'||(s.transitionDuration!=='0s'&&s.transitionProperty!=='none'&&s.transitionDuration!=='');}).map(el=>el.tagName+'.'+String(el.className)));
 expect(animated).toEqual([]);
 const walker=await page.locator('.walker').boundingBox();expect(walker!.x).toBeGreaterThan(200);
 await context.close();
});
