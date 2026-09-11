import type {Page, BrowserContext} from '@playwright/test';
import {emptyState,computeTargets,localDate,addDays,apply,type State,type Operation} from '../../lib/domain';
import {validateBatch} from '../../lib/validation';
export const zone='America/Los_Angeles';
export const stats={height:165,weight:65,age:30,activity:1 as const,goal:'maintain' as const};
export function seed(startOffset=0):State{const today=localDate(new Date(),zone);return {...emptyState(),clock:{zone,anchorDay:today,anchorLocal:today},profile:{...stats,targets:computeTargets(stats),overrides:{},baselineWeight:65,startDay:addDays(today,-startOffset)}};}
export const todayIn=()=>localDate(new Date(),zone);
export const op=(day:string,extra:Record<string,unknown>)=>({id:crypto.randomUUID(),at:new Date(day+'T20:00:00.000Z').toISOString(),day,zone,...extra}) as Operation;
export function complete(state:State,day:string){for(const habit of ['workout','abs','walk','water','protein','calories','floss'])state=apply(state,op(day,{type:'check',habit,value:true}));return state;}
// A mocked account: the browser talks to routes that apply operations with the real domain, so what the server would hold is inspectable.
export type Box={state:State;ops:Operation[];rejected:{id:string;reason:string}[];seen:Set<string>};
// Attach the mocked account to another page of the same context (a second tab): same box, same real validation, no re-seeding.
export async function mock(page:Page,box:Box){
 // Like the account, every answer carries a receipt: the most recently applied ids and the revision (count of applied changes).
 const receipt=()=>({applied:[...box.seen].slice(-200),revision:box.seen.size});
 await page.route('**/api/state',r=>r.fulfill({json:{...box.state,...receipt()}}));
 // Like the account: each change id is applied once; a replay is accepted again without re-applying.
 await page.route('**/api/sync',r=>{const raw=r.request().postDataJSON();const batch=validateBatch(raw);if(!batch)return r.fulfill({status:400,json:{error:'A batch must be 1 to 100 changes.'}});const rejected:{id:string;reason:string}[]=[...batch.invalid];for(const o of batch.valid as Operation[]){if(box.seen.has(o.id))continue;try{box.state=apply(box.state,o);box.ops.push(o);box.seen.add(o.id);}catch(e){rejected.push({id:o.id,reason:e instanceof Error?e.message:'no'});}}box.rejected.push(...rejected);return r.fulfill({json:{state:box.state,accepted:batch.valid.map(o=>o.id),rejected,...receipt()}});});
}
export async function open(page:Page,state:State,{hash='',go=true,unlocked=true}:{hash?:string;go?:boolean;unlocked?:boolean}={}){
 const box:Box={state,ops:[],rejected:[],seen:new Set()};
 await mock(page,box);
 // The fixture is written once per page session; a reload then sees exactly what the app persisted, as on a real device.
 if(unlocked)await page.addInitScript(s=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem('flaccid75-v1',JSON.stringify({state:s,pending:[],unlocked:true}));},state);
 if(go){await page.goto('/'+(hash?'#'+hash:''));await page.locator('.app-shell').waitFor();}
 return box;
}
export async function reduced(context:BrowserContext){return context;}
