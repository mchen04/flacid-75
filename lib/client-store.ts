import {useSyncExternalStore} from 'react';
import {apply,emptyState,type State,type Operation} from './domain';
import {checkBounds} from './bounds';
const KEY='flaccid75-v1';
// `failed` holds changes the account refused, with the reason, until the user discards them; they never block the queue.
export type Failed={op:Operation;reason:string;at:string};
type Store={state:State;pending:Operation[];failed:Failed[];ready:boolean;unlocked:boolean;notice:string;online:boolean};
let store:Store={state:emptyState(),pending:[],failed:[],ready:false,unlocked:false,notice:'',online:true};
const serverStore=store;
const listeners=new Set<()=>void>();
let syncing=false,started=false;
function emit(){for(const listener of listeners)listener();}
function persist(next:Store){try{localStorage.setItem(KEY,JSON.stringify({state:next.state,pending:next.pending,failed:next.failed,unlocked:next.unlocked}));return true;}catch{store={...store,notice:'Device storage is full. This change was not saved.'};emit();return false;}}
let reloading=false,storageWaiting=false;
function readSaved(){try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null;}catch{return null;}}
function mergeFromStorage(){const saved=readSaved();if(!saved?.state)return;const theirs:Operation[]=Array.isArray(saved.pending)?saved.pending:[];const mine=store.pending.filter(p=>!theirs.some(t=>t.id===p.id));let state:State=saved.state;for(const op of mine){try{state=apply(state,op);}catch{}}const next={...store,state,pending:[...theirs,...mine],failed:Array.isArray(saved.failed)?saved.failed:store.failed,unlocked:saved.unlocked??store.unlocked};if(mine.length)persist(next);set(next);}
function set(next:Store){store=next;emit();}
export function useStore(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>store,()=>serverStore);}
export function startStore(){if(started)return;started=true;try{const raw=localStorage.getItem(KEY);if(raw){const saved=JSON.parse(raw);store={...store,...saved,failed:Array.isArray(saved.failed)?saved.failed:[]};}}catch{store={...store,notice:'Saved data could not load. Connect to restore it.'};}set({...store,ready:true,online:navigator.onLine});
 const resume=()=>{set({...store,online:navigator.onLine});void synchronize();};
 window.addEventListener('online',resume);window.addEventListener('offline',()=>set({...store,online:false}));window.addEventListener('pageshow',resume);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resume();});
 // Another tab wrote the device store. Take its state, re-apply this tab's own queue on top (each change guarded), keep both queues by id,
 // and save the merged result, so no acknowledged change on this device is ever dropped. While a sync is in flight the event is kept and
 // merged as soon as the sync settles.
 window.addEventListener('storage',e=>{if(e.key!==KEY)return;if(syncing){storageWaiting=true;return;}mergeFromStorage();});
 if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').then(registration=>{if(!registration)return;let controlled=!!navigator.serviceWorker.controller;
  // A new build claims the page as soon as it activates, so an open app reloads once instead of serving the old shell.
  // The first install claims an uncontrolled page, which is not an update and must not reload it.
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!navigator.serviceWorker.controller)return;if(!controlled){controlled=true;return;}if(!reloading){reloading=true;location.reload();}});
  const check=()=>void registration.update();
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});
  window.addEventListener('online',check);setInterval(check,600000);check();
 }).catch(()=>set({...store,notice:'Offline setup failed. Reopen online to retry.'}));
 setInterval(()=>void synchronize(),30000);void synchronize();
}
export function dispatch(op:Operation){
 // A change outside the account's bounds is refused here, with the reason, rather than queued to be refused later.
 const reason=checkBounds(op);if(reason){set({...store,notice:reason});return false;}
 // The same change twice (a second tab settling the same timer) is queued once.
 if(store.pending.some(p=>p.id===op.id))return true;
 try{const next={...store,state:apply(store.state,op),pending:[...store.pending,op],notice:''};if(!persist(next))return false;set(next);void synchronize();return true;}catch(error){set({...store,notice:error instanceof Error?error.message:'Unable to save.'});return false;}}
export async function unlock(passphrase:string){try{const res=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passphrase})});const result=await res.json();if(!res.ok)return result.error as string;
 // Onboarding waits for the remote account, preventing a second first-run flow on a new device.
 const data=await fetch('/api/state',{cache:'no-store'});if(!data.ok)return 'Your data could not load. Try again.';
 let state:State=await data.json();for(const op of store.pending){try{state=apply(state,op);}catch{}}
 const next={...store,state,unlocked:true};persist(next);set(next);void synchronize();return '';
 }catch{return 'Connect to the internet to unlock this device.';}}
export async function lock(){try{await fetch('/api/auth',{method:'DELETE'});}catch{}localStorage.removeItem(KEY);try{localStorage.removeItem('my-wellness-timers');}catch{}set({...store,state:emptyState(),pending:[],failed:[],unlocked:false});}
export function discardFailed(){const next={...store,failed:[],notice:''};persist(next);set(next);}
export async function synchronize(){if(syncing||!store.unlocked||!navigator.onLine)return;syncing=true;let progressed=false;
 try{const batch=store.pending.slice(0,100);const res=await fetch(batch.length?'/api/sync':'/api/state',batch.length?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(batch)}:{cache:'no-store'});
 if(!res.ok){if(res.status===401)set({...store,notice:'Unlock again to sync. Your offline changes are safe.',unlocked:false});
  // A refused batch must not stall the queue: the first change is set aside with the server's reason and the rest are retried.
  else if(res.status===400&&batch.length){let reason='The account refused this change.';try{reason=(await res.json()).error??reason;}catch{}const [first,...rest]=store.pending;const next={...store,pending:rest,failed:[...store.failed,{op:first,reason,at:new Date().toISOString()}],notice:reason};if(persist(next)){set(next);progressed=true;}}
  return;}
 const result=await res.json();const done=new Set<string>(batch.length?[...result.accepted,...result.rejected.map((r:{id:string})=>r.id)]:[]);
 // Changes another tab queued while this sync was in flight are merged in before anything is saved over them.
 const saved=readSaved();const arrived:Operation[]=Array.isArray(saved?.pending)?saved.pending.filter((p:Operation)=>!store.pending.some(q=>q.id===p.id)&&!done.has(p.id)):[];
 const pending=[...store.pending.filter(op=>!done.has(op.id)),...arrived];let state:State=batch.length?result.state:result;for(const op of pending){try{state=apply(state,op);}catch{}}
 const refused:Failed[]=batch.length?result.rejected.map((r:{id:string;reason:string})=>({op:batch.find(o=>o.id===r.id)??({id:r.id} as Operation),reason:r.reason,at:new Date().toISOString()})):[];
 const next={...store,state,pending,failed:[...store.failed,...refused],notice:refused.length?refused.map(r=>r.reason).join(' '):store.notice};if(persist(next)){set(next);progressed=true;}
 }catch{set({...store,notice:''});}finally{syncing=false;if(storageWaiting){storageWaiting=false;mergeFromStorage();}}
 if(progressed&&store.pending.length>0)setTimeout(()=>void synchronize(),100);
}
