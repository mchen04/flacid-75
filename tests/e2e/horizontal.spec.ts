import {test,expect} from './fixtures';
import type {Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {emptyState,computeTargets,localDate,addDays,apply,type State} from '../../lib/domain';
type Offender={tag:string;className:string;scrollWidth:number;clientWidth:number;overflowX:string};
type Report={screen:string;documentScrollWidth:number;viewport:number;offenders:Offender[];dragDeltaX:number};
async function audit(page:Page,screen:string):Promise<Report>{
 const geometry=await page.evaluate(()=>{const offenders:Offender[]=[];for(const el of document.querySelectorAll<HTMLElement>('body *')){const style=getComputedStyle(el);const scrollable=style.overflowX==='auto'||style.overflowX==='scroll';if(el.scrollWidth>el.clientWidth+1&&(scrollable||el===document.body))offenders.push({tag:el.tagName.toLowerCase(),className:String(el.className),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overflowX:style.overflowX});}return {documentScrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,offenders};});
 // A real sideways drag across the middle of the screen must move nothing.
 const before=await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>el.scrollLeft).concat(scrollX));
 await page.mouse.move(300,500);await page.mouse.down();for(let x=300;x>=60;x-=40)await page.mouse.move(x,500);await page.mouse.up();
 // Every screen is tappable, so the drag's mouse-up may open a sheet; close it so the next step starts clean.
 await page.waitForTimeout(200);if(await page.locator('dialog[open]').count()){await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'detached'});}
 const dragDeltaX=await page.evaluate(before=>{const after=[...document.querySelectorAll('body *')].map(el=>el.scrollLeft).concat(scrollX);return after.reduce((max,value,i)=>Math.max(max,Math.abs(value-(before[i]??0))),0);},before);
 return {screen,...geometry,dragDeltaX};
}
test('no horizontal scroll, drag or overflow on any screen at 390x844',async({page})=>{
 const today=localDate(new Date(),'America/Los_Angeles');const stats={height:165,weight:65,age:30,activity:1 as const,goal:'maintain' as const};
 let state:State={...emptyState(),clock:{zone:'America/Los_Angeles',anchorDay:today,anchorLocal:today},profile:{...stats,targets:computeTargets(stats),overrides:{},baselineWeight:65,startDay:addDays(today,-40)}};
 await page.route('**/api/state',r=>r.fulfill({json:state}));await page.route('**/api/sync',r=>{const ops=r.request().postDataJSON();for(const op of ops)state=apply(state,op);return r.fulfill({json:{state,accepted:ops.map((o:{id:string})=>o.id),rejected:[]}});});
 await page.addInitScript(s=>localStorage.setItem('flaccid75-v1',JSON.stringify({state:s,pending:[],unlocked:true})),state);
 await page.goto('/');await page.getByRole('button',{name:'Workout',exact:true}).waitFor();
 const reports:Report[]=[];
 reports.push(await audit(page,'today'));
 await page.getByRole('button',{name:'Progress',exact:true}).click();await page.getByText('day streak').waitFor();reports.push(await audit(page,'week'));
 await page.getByRole('button',{name:'Month',exact:true}).click();reports.push(await audit(page,'month'));
 await page.getByRole('button',{name:'Trends',exact:true}).click();await page.getByRole('heading',{name:'Weight'}).waitFor();reports.push(await audit(page,'trends'));
 await page.getByRole('button',{name:'You',exact:true}).click();await page.getByText('Daily targets').waitFor();reports.push(await audit(page,'settings'));
 await page.getByRole('button',{name:'Today',exact:true}).click();await page.getByRole('button',{name:'Log a meal'}).click();await page.getByLabel('What did you eat?').waitFor();reports.push(await audit(page,'meal sheet'));
 await writeFile('evidence/horizontal-audit.json',JSON.stringify(reports,null,2));
 for(const report of reports){expect(report.documentScrollWidth,report.screen).toBe(390);expect(report.offenders,report.screen).toEqual([]);expect(report.dragDeltaX,report.screen).toBe(0);}
});
