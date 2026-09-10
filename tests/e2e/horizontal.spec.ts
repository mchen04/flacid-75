import {test,expect} from './fixtures';
import type {Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {open,seed} from './helpers';
type Offender={tag:string;className:string;scrollWidth:number;clientWidth:number;overflowX:string};
type Report={screen:string;documentScrollWidth:number;viewport:number;offenders:Offender[];dragDeltaX:number;pageScrolls:boolean};
async function audit(page:Page,screen:string):Promise<Report>{
 const geometry=await page.evaluate(()=>{const offenders:Offender[]=[];for(const el of document.querySelectorAll<HTMLElement>('body *')){if(el.closest('svg')||el.classList.contains('sr-only'))continue;const style=getComputedStyle(el);if(el.scrollWidth>el.clientWidth+1&&style.overflowX!=='visible')offenders.push({tag:el.tagName.toLowerCase(),className:String(el.className),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overflowX:style.overflowX});}const p=document.querySelector('.page');return {documentScrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,offenders,pageScrolls:!!p&&p.scrollHeight>p.clientHeight+1};});
 const before=await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>el.scrollLeft).concat(scrollX));
 const mid=await page.evaluate(()=>({x:Math.round(innerWidth*.75),y:Math.round(innerHeight*.6)}));await page.mouse.move(mid.x,mid.y);await page.mouse.down();for(let x=mid.x;x>=60;x-=40)await page.mouse.move(x,mid.y);await page.mouse.up();
 await page.waitForTimeout(200);if(await page.locator('dialog[open]').count()){await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'detached'});}
 const dragDeltaX=await page.evaluate(before=>{const after=[...document.querySelectorAll('body *')].map(el=>el.scrollLeft).concat(scrollX);return after.reduce((max,value,i)=>Math.max(max,Math.abs(value-(before[i]??0))),0);},before);
 return {screen,...geometry,dragDeltaX};
}
for(const [w,h] of [[390,844],[375,640],[1280,900]])test(`no horizontal scroll, drag or overflow on any page at ${w}x${h}; vertical scroll only inside the page`,async({page})=>{
 await page.setViewportSize({width:w,height:h});await open(page,seed(40));
 const reports:Report[]=[];
 for(const hash of ['','walk','workout','abs','floss','water','food','rest','meditate','focus','rewards','progress','you','rules']){await page.evaluate(h=>{location.hash=h;},hash);await page.waitForTimeout(250);reports.push(await audit(page,hash||'home'));}
 await page.evaluate(()=>{location.hash='progress';});await page.getByRole('tab',{name:'Month'}).click();reports.push(await audit(page,'month'));await page.getByRole('tab',{name:'Trends'}).click();reports.push(await audit(page,'trends'));
 await page.evaluate(()=>{location.hash='';});await page.getByRole('button',{name:'Log a meal'}).click();await page.getByLabel('What did you eat?').waitFor();reports.push(await audit(page,'meal sheet'));
 await writeFile(`evidence/my-wellness/horizontal-audit-${w}x${h}.json`,JSON.stringify(reports,null,2));
 for(const report of reports){expect(report.documentScrollWidth,report.screen).toBe(w);expect(report.offenders,report.screen).toEqual([]);expect(report.dragDeltaX,report.screen).toBe(0);}
 expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(h);
});
