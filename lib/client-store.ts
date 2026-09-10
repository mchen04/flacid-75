import {useSyncExternalStore} from 'react';
import {apply,emptyState,type State,type Operation} from './domain';
const KEY='flaccid75-v1';
type Store={state:State;pending:Operation[];ready:boolean;unlocked:boolean;notice:string;online:boolean};
let store:Store={state:emptyState(),pending:[],ready:false,unlocked:false,notice:'',online:true};
const serverStore=store;
const listeners=new Set<()=>void>();
let syncing=false,started=false;
function emit(){for(const listener of listeners)listener();}
function persist(next:Store){try{localStorage.setItem(KEY,JSON.stringify({state:next.state,pending:next.pending,unlocked:next.unlocked}));return true;}catch{store={...store,notice:'Device storage is full. This change was not saved.'};emit();return false;}}
let reloading=false;
function set(next:Store){store=next;emit();}
export function useStore(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>store,()=>serverStore);}
export function startStore(){if(started)return;started=true;try{const raw=localStorage.getItem(KEY);if(raw){const saved=JSON.parse(raw);store={...store,...saved};}}catch{store={...store,notice:'Saved data could not load. Connect to restore it.'};}set({...store,ready:true,online:navigator.onLine});
 const resume=()=>{set({...store,online:navigator.onLine});void synchronize();};
 window.addEventListener('online',resume);window.addEventListener('offline',()=>set({...store,online:false}));window.addEventListener('pageshow',resume);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resume();});
 window.addEventListener('storage',e=>{if(e.key===KEY&&!syncing){try{const saved=JSON.parse(e.newValue??'{}');if(saved.state)set({...store,...saved});}catch{}}});
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
export function dispatch(op:Operation){try{const next={...store,state:apply(store.state,op),pending:[...store.pending,op],notice:''};if(!persist(next))return false;set(next);void synchronize();return true;}catch(error){set({...store,notice:error instanceof Error?error.message:'Unable to save.'});return false;}}
export async function unlock(passphrase:string){try{const res=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passphrase})});const result=await res.json();if(!res.ok)return result.error as string;
 // Onboarding waits for the remote account, preventing a second first-run flow on a new device.
 const data=await fetch('/api/state',{cache:'no-store'});if(!data.ok)return 'Your data could not load. Try again.';
 let state:State=await data.json();for(const op of store.pending)state=apply(state,op);
 const next={...store,state,unlocked:true};persist(next);set(next);void synchronize();return '';
 }catch{return 'Connect to the internet to unlock this device.';}}
export async function lock(){try{await fetch('/api/auth',{method:'DELETE'});}catch{}localStorage.removeItem(KEY);set({...store,state:emptyState(),pending:[],unlocked:false});}
export async function synchronize(){if(syncing||!store.unlocked||!navigator.onLine)return;syncing=true;let progressed=false;
 try{const batch=store.pending.slice(0,100);const res=await fetch(batch.length?'/api/sync':'/api/state',batch.length?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(batch)}:{cache:'no-store'});
 if(!res.ok){if(res.status===401)set({...store,notice:'Unlock again to sync. Your offline changes are safe.',unlocked:false});return;}
 const result=await res.json();const done=new Set<string>(batch.length?[...result.accepted,...result.rejected.map((r:{id:string})=>r.id)]:[]);
 const pending=store.pending.filter(op=>!done.has(op.id));let state:State=batch.length?result.state:result;for(const op of pending){try{state=apply(state,op);}catch{}}
 const next={...store,state,pending,notice:batch.length&&result.rejected.length?result.rejected.map((r:{reason:string})=>r.reason).join(' '):store.notice};if(persist(next)){set(next);progressed=true;}
 }catch{set({...store,notice:''});}finally{syncing=false;}
 if(progressed&&store.pending.length>0)setTimeout(()=>void synchronize(),100);
}
