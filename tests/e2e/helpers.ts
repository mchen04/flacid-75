import type {Page, BrowserContext} from '@playwright/test';
import {emptyState,computeTargets,localDate,addDays,apply,type State,type Operation} from '../../lib/domain';
export const zone='America/Los_Angeles';
export const stats={height:165,weight:65,age:30,activity:1 as const,goal:'maintain' as const};
export function seed(startOffset=0):State{const today=localDate(new Date(),zone);return {...emptyState(),clock:{zone,anchorDay:today,anchorLocal:today},profile:{...stats,targets:computeTargets(stats),overrides:{},baselineWeight:65,startDay:addDays(today,-startOffset)}};}
export const todayIn=()=>localDate(new Date(),zone);
export const op=(day:string,extra:Record<string,unknown>)=>({id:crypto.randomUUID(),at:new Date(day+'T20:00:00.000Z').toISOString(),day,zone,...extra}) as Operation;
export function complete(state:State,day:string){for(const habit of ['workout','abs','walk','water','protein','calories','floss'])state=apply(state,op(day,{type:'check',habit,value:true}));return state;}
// A mocked account: the browser talks to routes that apply operations with the real domain, so what the server would hold is inspectable.
export async function open(page:Page,state:State,{hash='',go=true,unlocked=true}:{hash?:string;go?:boolean;unlocked?:boolean}={}){
 const box={state,ops:[] as Operation[]};
 await page.route('**/api/state',r=>r.fulfill({json:box.state}));
 await page.route('**/api/sync',r=>{const ops=r.request().postDataJSON() as Operation[];const rejected:{id:string;reason:string}[]=[];for(const o of ops){try{box.state=apply(box.state,o);box.ops.push(o);}catch(e){rejected.push({id:o.id,reason:e instanceof Error?e.message:'no'});}}return r.fulfill({json:{state:box.state,accepted:ops.map(o=>o.id),rejected}});});
 if(unlocked)await page.addInitScript(s=>localStorage.setItem('flaccid75-v1',JSON.stringify({state:s,pending:[],unlocked:true})),state);
 if(go){await page.goto('/'+(hash?'#'+hash:''));await page.locator('.app-shell').waitFor();}
 return box;
}
export async function reduced(context:BrowserContext){return context;}
