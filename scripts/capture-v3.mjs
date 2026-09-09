// Captures the home and progress screens at 390x844 (2x) with a lived-in seeded account, for the blind comparison rounds.
// Usage: TEST_BASE_URL=http://localhost:3075 node scripts/capture-v3.mjs [outDir]
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {emptyState,computeTargets,localDate,addDays,apply} from '../lib/domain.ts';
import {install,origin} from './virtual-server.mjs';
const base=process.env.TEST_BASE_URL??origin;const virtual=!process.env.TEST_BASE_URL;const out=process.argv[2]??'evidence/v3/captures';await mkdir(out,{recursive:true});
const today=localDate(new Date(),'America/Los_Angeles');const stats={height:165,weight:65,age:30,activity:1,goal:'maintain'};
let state={...emptyState(),clock:{zone:'America/Los_Angeles',anchorDay:today,anchorLocal:today},profile:{...stats,targets:computeTargets(stats),overrides:{},baselineWeight:65,startDay:addDays(today,-23)}};
const op=(day,extra)=>({id:crypto.randomUUID(),at:new Date(day+'T20:00:00.000Z').toISOString(),day,zone:'America/Los_Angeles',...extra});
// Twelve kept days behind today, one rest day, and a partly done today.
for(let i=12;i>=1;i--){const day=addDays(today,-i);if(i===4){state=apply(state,op(day,{type:'rest',value:true}));continue;}for(const habit of ['workout','abs','walk','water','protein','calories','floss'])state=apply(state,op(day,{type:'check',habit,value:true}));}
for(const habit of ['workout','walk'])state=apply(state,op(today,{type:'check',habit,value:true}));
state=apply(state,op(today,{type:'water',amount:1250}));state=apply(state,op(today,{type:'meal',mealId:crypto.randomUUID(),calories:1180,protein:64}));
for(const [i,w] of [[20,66.2],[16,65.9],[12,65.6],[8,65.4],[4,65.1],[1,64.9]])state.weights[addDays(today,-i)]=w;
const browser=await chromium.launch({args:['--single-process','--no-zygote','--disable-gpu']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'America/Los_Angeles',serviceWorkers:'block'});
 if(virtual)await install(context);const page=await context.newPage();
 await page.route('**/api/state',r=>r.fulfill({json:state}));await page.route('**/api/sync',r=>r.fulfill({json:{state,accepted:r.request().postDataJSON().map(o=>o.id),rejected:[]}}));
 await page.addInitScript(s=>localStorage.setItem('flaccid75-v1',JSON.stringify({state:s,pending:[],unlocked:true})),state);
 await page.clock.install({time:new Date(today+'T16:20:00')});
 await page.goto(base);await page.getByRole('button',{name:'Workout',exact:true}).waitFor();await page.waitForTimeout(600);
 await page.screenshot({path:`${out}/home.png`});
 await page.getByRole('button',{name:'Progress',exact:true}).click();await page.getByText('day streak').waitFor();await page.waitForTimeout(700);
 await page.screenshot({path:`${out}/progress.png`});
 await page.getByRole('button',{name:'Trends',exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:`${out}/trends.png`});
 await page.getByRole('button',{name:'You',exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:`${out}/you.png`});
 await page.getByRole('button',{name:'Today',exact:true}).click();await page.getByRole('button',{name:'Log a meal'}).click();await page.waitForTimeout(400);await page.screenshot({path:`${out}/food-sheet.png`});
 console.log('captured',out);
}finally{await browser.close();}
