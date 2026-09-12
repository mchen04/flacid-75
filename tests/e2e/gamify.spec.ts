import {test,expect,virtual} from './fixtures';
import {install} from '../../scripts/virtual-server.mjs';
import type {Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {open,seed} from './helpers';
const rects=(page:Page)=>page.evaluate(()=>Object.fromEntries([...document.querySelectorAll<HTMLElement>('.hero,.row,.topbar,.row-head')].map((el,i)=>{const r=el.getBoundingClientRect();return [el.className.split(' ')[0]+i,[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]];})));
test('a tap changes state in under 100 ms and shifts no layout, with every habit animated distinctly',async({page})=>{
 await open(page,seed());
 const before=await rects(page);const latencies:Record<string,number>={};
 for(const [label,cls] of [['Workout complete','lifting'],['Abs complete','crunching'],['Walk complete','moving'],['Floss complete','shining'],['Add a Stanley','pouring']]){
  const ms=await page.evaluate(name=>new Promise<number>(resolve=>{const button=document.querySelector<HTMLElement>(`button[aria-label="${name}"]`)!;const row=button.closest('.row')!;const start=performance.now();const observer=new MutationObserver(()=>{observer.disconnect();resolve(performance.now()-start);});observer.observe(row,{attributes:true,subtree:true,childList:true,characterData:true});button.click();}),label);
  latencies[label]=ms;expect(ms,label).toBeLessThan(100);
  await expect(page.locator(`.row.${cls}`)).toHaveCount(1);
 }
 for(const habit of ['workout','abs','walk','floss'])await expect(page.getByRole('checkbox',{name:`${habit[0].toUpperCase()}${habit.slice(1)} complete`})).toHaveAttribute('aria-checked','true');
 const after=await rects(page);expect(after).toEqual(before);
 // Interruptible: a second tap during the animation unchecks instantly.
 await page.getByRole('checkbox',{name:'Workout complete'}).click();await expect(page.getByRole('checkbox',{name:'Workout complete'})).toHaveAttribute('aria-checked','false');
 const level=await page.evaluate(()=>getComputedStyle(document.querySelector('.liquid')!).transform);expect(level).not.toBe('none');
 await writeFile(`evidence/my-wellness/tap-latency-${test.info().project.name}.json`,JSON.stringify({latencies,layoutShift:false,viewport:'390x844',note:'MutationObserver from click to the first DOM change in the row; desktop engine timing'},null,2));
});
test('walking moves the marker along the hero path and eating animates the bowl',async({page})=>{
 await open(page,seed());
 const start=await page.locator('.hero .walker').boundingBox();await page.getByRole('checkbox',{name:'Walk complete'}).click();await page.waitForTimeout(1900);const end=await page.locator('.hero .walker').boundingBox();expect(end!.x-start!.x).toBeGreaterThan(20);
 await page.route('**/api/estimate',r=>r.fulfill({json:{items:[{name:'banana, raw',grams:120,calories:107,protein:1.3,source:'usda',match:'Bananas, raw',fdcId:173944}],calories:107,protein:1.3,model:'test'}}));
 await page.getByRole('button',{name:'Log a meal'}).click();await page.getByLabel('What did you eat?').fill('a banana');await page.getByRole('button',{name:'Look it up'}).click();await page.getByRole('button',{name:'Add to today'}).click();
 await expect(page.locator('.row.food')).toHaveClass(/eating/);await expect(page.locator('.row.food .bowl')).toHaveClass(/is-eating/);await expect(page.getByText('107 kcal · 1/105 g')).toBeVisible();
});
test('reduced motion disables every animation and transition on every page',async({browser})=>{
 const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});if(virtual)await install(context);const page=await context.newPage();await open(page,seed());
 await page.getByRole('checkbox',{name:'Walk complete'}).click();await page.getByRole('button',{name:'Add a Stanley'}).click();
 const animatedOn=async()=>page.evaluate(()=>[...document.querySelectorAll('*')].filter(el=>{const s=getComputedStyle(el);return s.animationName!=='none'||(s.transitionDuration!=='0s'&&s.transitionProperty!=='none'&&s.transitionDuration!=='');}).map(el=>el.tagName+'.'+String(el.className)));
 expect(await animatedOn()).toEqual([]);
 for(const hash of ['walk','abs','progress','rewards']){await page.evaluate(h=>{location.hash=h;},hash);await page.waitForTimeout(200);expect(await animatedOn(),hash).toEqual([]);}
 await context.close();
});
