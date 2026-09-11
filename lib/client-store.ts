import {useSyncExternalStore} from 'react';
import {apply,emptyState,type State,type Operation} from './domain';
import {checkBounds} from './bounds';
const KEY='flaccid75-v1';
// Every queued change is also written to its own key (a per-operation journal). A key per change means no tab ever performs a
// read-modify-write over another tab's change: a change is durable the instant its own key is written, and it is removed only when
// the account acknowledges it or the user sets it aside. The `pending` list in the store snapshot is a convenience; the journal is authoritative.
const JOURNAL='my-wellness-op:';
// The account's receipt lists at most this many recently applied ids (kept in step with `receiptSize` in lib/db.ts).
const receiptSize=200;
// Lock and clear writes this marker first. Every tab that sees it (or sees the snapshot removed) locks itself, and no snapshot or journal
// write is accepted while it stands, so a late sync result or a stale tab cannot restore cleared data. Unlock removes it before saving.
const LOCK='my-wellness-locked';
function locked(){try{return localStorage.getItem(LOCK)!==null;}catch{return false;}}
function journalWrite(op:Operation){if(locked())return false;try{localStorage.setItem(JOURNAL+op.id,JSON.stringify(op));return true;}catch{return false;}}
function journalRemove(id:string){try{localStorage.removeItem(JOURNAL+id);}catch{}try{localStorage.removeItem('my-wellness-sent:'+id);}catch{}}
// A change carries a sent mark while a write holding it is in flight and after the account has answered that write. A write that fails
// without any answer removes the mark again: the change is then treated as unsent, shown, and presented again. Only a sent change can be
// one the account applied without this device having recorded the answer; an unsent change is pending for certain and is always shown.
const SENT='my-wellness-sent:';
function markSent(ops:Operation[]){for(const op of ops){try{localStorage.setItem(SENT+op.id,'1');}catch{}}}
function unmarkSent(ops:Operation[]){for(const op of ops)sentRemove(op.id);}
function wasSent(id:string){try{return localStorage.getItem(SENT+id)!==null;}catch{return false;}}
function sentRemove(id:string){try{localStorage.removeItem(SENT+id);}catch{}}
// Every journal and sent key by prefix, parsed or not.
function journalClear(){try{const keys:string[]=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&(k.startsWith(JOURNAL)||k.startsWith(SENT)))keys.push(k);}for(const k of keys)localStorage.removeItem(k);}catch{}}
function journalAll():Operation[]{const out:Operation[]=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(JOURNAL)){try{out.push(JSON.parse(localStorage.getItem(k)!));}catch{}}}}catch{}return out.sort((a,b)=>a.at.localeCompare(b.at));}
// This tab's queue plus every journaled change it does not hold yet, in order.
function pendingWithJournal(base:Operation[],done?:Set<string>,acked:string[]=store.acked){const gone=new Set<string>([...acked,...(done??[])]);const extra=journalAll().filter(o=>!base.some(b=>b.id===o.id)&&!gone.has(o.id));
 // A journal key whose change the account has already acknowledged is a leftover (its removal came after the acknowledging save); drop it.
 for(const o of journalAll())if(acked.includes(o.id))journalRemove(o.id);
 return [...base.filter(o=>!gone.has(o.id)),...extra];}
// `failed` holds changes the account refused, with the reason, until the user discards them; they never block the queue.
export type Failed={op:Operation;reason:string;at:string};
// `acked` is the durable record of the changes the account has acknowledged (accepted or refused), most recent last, bounded. It is what
// separates a pending change from an acknowledged one: a tab that still holds an acknowledged change in memory must never re-queue or
// re-apply it, whatever its journal key or an older snapshot says. `epoch` counts saves of account answers on this device; a state read
// that began before another answer was saved is stale and is not installed.
const keepAcked=500;
// `revision` is the account's own count of applied changes, carried on every answer; the device never installs an answer older than the
// revision it already holds. `epoch` remains the fallback for an answer without a receipt.
type Store={state:State;pending:Operation[];failed:Failed[];discarded:string[];acked:string[];epoch:number;revision:number;ready:boolean;unlocked:boolean;notice:string;online:boolean};
let store:Store={state:emptyState(),pending:[],failed:[],discarded:[],acked:[],epoch:0,revision:-1,ready:false,unlocked:false,notice:'',online:true};
const serverStore=store;
const listeners=new Set<()=>void>();
let syncing=false,started=false;
function emit(){for(const listener of listeners)listener();}
// Every snapshot write merges the refused list and the discard record with what is saved, so no caller can drop another tab's refusal
// or resurrect a discarded one. `next` is a fresh object at every call site and is completed in place, so the caller keeps what was written.
function persist(next:Store){if(locked()){lockLocally();return false;}try{const saved=readSaved();next.discarded=mergeDiscarded(saved,next.discarded);next.failed=mergeFailed(saved,next.failed,next.discarded);next.acked=mergeAcked(saved,next.acked);next.epoch=Math.max(Number(saved?.epoch)||0,next.epoch);next.revision=Math.max(savedRevision(saved),next.revision);next.pending=next.pending.filter(p=>!next.acked.includes(p.id));localStorage.setItem(KEY,JSON.stringify({state:next.state,pending:next.pending,failed:next.failed,discarded:next.discarded,acked:next.acked,epoch:next.epoch,revision:next.revision,unlocked:next.unlocked}));return true;}catch{store={...store,notice:'Device storage is full. This change was not saved.'};emit();return false;}}
const savedRevision=(saved:{revision?:unknown}|null)=>typeof saved?.revision==='number'?saved.revision:-1;
function mergeAcked(saved:{acked?:string[]}|null,mine:string[]){return [...new Set([...(Array.isArray(saved?.acked)?saved!.acked!:[]),...mine])].slice(-keepAcked);}
// This tab locks itself: memory cleared, nothing pending, the gate shown. Used when this or another tab locked and cleared the device.
function lockLocally(){if(!store.unlocked&&store.pending.length===0&&!store.state.profile)return;set({...store,state:emptyState(),pending:[],failed:[],discarded:[],acked:[],epoch:0,revision:-1,unlocked:false,notice:''});}
let reloading=false,storageWaiting=false;
// Changes saved to the device by another tab that this tab does not hold yet.
function arrivedMeanwhile(done:Set<string>):Operation[]{ // snapshot-listed changes from another tab that this tab does not hold
const saved=readSaved();return Array.isArray(saved?.pending)?saved.pending.filter((p:Operation)=>!store.pending.some(q=>q.id===p.id)&&!done.has(p.id)&&!store.acked.includes(p.id)):[];}
// A device-wide lock around read-merge-save steps where the browser has Web Locks. It reduces interleaving; it is not what makes the
// queue safe. The per-operation journal is: dispatch never rewrites another tab's change, so nothing can be lost in a window.
async function withLock(fn:()=>void){const locks=(navigator as Navigator&{locks?:{request:(name:string,cb:()=>void)=>Promise<void>}}).locks;if(locks){await locks.request('my-wellness-store',()=>{fn();});}else fn();}
function readSaved(){try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null;}catch{return null;}}
// Refused changes are merged by id with whatever the saved snapshot holds, so no tab's save can drop another tab's refusal.
// The only way a refused change leaves is an explicit discard, which records its id so a later merge cannot bring it back.
const keepDiscarded=200;
function mergeFailed(saved:{failed?:Failed[];discarded?:string[]}|null,mine:Failed[],discarded:string[]=store.discarded){const gone=new Set<string>([...(Array.isArray(saved?.discarded)?saved!.discarded!:[]),...discarded]);const out:Failed[]=(Array.isArray(saved?.failed)?saved!.failed!:[]).filter(f=>!gone.has(f.op.id));for(const f of mine)if(!gone.has(f.op.id)&&!out.some(o=>o.op.id===f.op.id))out.push(f);return out;}
function mergeDiscarded(saved:{discarded?:string[]}|null,mine:string[]=store.discarded){return [...new Set([...(Array.isArray(saved?.discarded)?saved!.discarded!:[]),...mine])].slice(-keepDiscarded);}
function mergeFromStorage(){if(locked()){lockLocally();return;}const saved=readSaved();if(!saved?.state){if(store.unlocked)lockLocally();return;}
 // What is pending on this device is the saved queue plus the journal, minus everything acknowledged. This tab's memory adds nothing:
 // any change it queued is in the journal until acknowledged, and a change it merely held for another tab may have been acknowledged since.
 const acked=mergeAcked(saved,store.acked);const theirs:Operation[]=(Array.isArray(saved.pending)?saved.pending:[]).filter((p:Operation)=>!acked.includes(p.id));const pending=pendingWithJournal(theirs,undefined,acked);let state:State=saved.state;for(const op of pending.filter(p=>!theirs.some(t=>t.id===p.id))){try{state=apply(state,op);}catch{}}const failed=mergeFailed(saved,store.failed);const next={...store,state,pending,failed,discarded:mergeDiscarded(saved),acked,epoch:Math.max(Number(saved.epoch)||0,store.epoch),revision:Math.max(savedRevision(saved),store.revision),unlocked:saved.unlocked??store.unlocked};if(pending.length!==theirs.length||failed.length!==(Array.isArray(saved.failed)?saved.failed.length:0))persist(next);set(next);}
function set(next:Store){store=next;emit();}
export function useStore(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>store,()=>serverStore);}
export function startStore(){if(started)return;started=true;try{const raw=locked()?null:localStorage.getItem(KEY);if(raw){const saved=JSON.parse(raw);store={...store,...saved,failed:Array.isArray(saved.failed)?saved.failed:[],discarded:Array.isArray(saved.discarded)?saved.discarded:[],acked:Array.isArray(saved.acked)?saved.acked:[],epoch:Number(saved.epoch)||0,revision:savedRevision(saved)};store={...store,pending:store.pending.filter(p=>!store.acked.includes(p.id))};}const known=store.pending;const pending=pendingWithJournal(known);let state=store.state;for(const op of pending.filter(p=>!known.some(k=>k.id===p.id))){try{state=apply(state,op);}catch{}}store={...store,state,pending};if(pending.length!==known.length)persist(store);}catch{store={...store,notice:'Saved data could not load. Connect to restore it.'};}set({...store,ready:true,online:navigator.onLine});if(locked())void sendLogout();
 // Coming back (page shown again, made visible, back online): a tab restored from the back-forward cache has missed storage events, so the
 // device is re-read before anything is shown or written: a lock or a cleared snapshot locks this tab; otherwise the saved store is merged.
 const resume=()=>{if(locked()||readSaved()===null){lockLocally();void sendLogout();return;}if(store.unlocked&&!syncing)mergeFromStorage();set({...store,online:navigator.onLine});void synchronize();};
 window.addEventListener('online',resume);window.addEventListener('offline',()=>set({...store,online:false}));window.addEventListener('pageshow',resume);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resume();});
 // Another tab wrote the device store. Take its state, re-apply this tab's own queue on top (each change guarded), keep both queues by id,
 // and save the merged result, so no acknowledged change on this device is ever dropped. While a sync is in flight the event is kept and
 // merged as soon as the sync settles.
 window.addEventListener('storage',e=>{if(e.key===LOCK||(e.key===KEY&&e.newValue===null)){if(locked()||readSaved()===null)lockLocally();return;}if(e.key!==KEY&&!(e.key??'').startsWith(JOURNAL))return;if(syncing){storageWaiting=true;return;}mergeFromStorage();});
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
 if(locked()){lockLocally();return false;}const reason=checkBounds(op);if(reason){set({...store,notice:reason});return false;}
 // The same change twice (a second tab settling the same timer) is queued once.
 if(store.pending.some(p=>p.id===op.id)||store.acked.includes(op.id))return true;
 try{const next={...store,state:apply(store.state,op),pending:[...store.pending,op],notice:''};if(!journalWrite(op)){set({...store,notice:'Device storage is full. This change was not saved.'});return false;}if(!persist(next)){journalRemove(op.id);return false;}set(next);void synchronize();return true;}catch(error){set({...store,notice:error instanceof Error?error.message:'Unable to save.'});return false;}}
export async function unlock(passphrase:string){try{localStorage.removeItem(LOGOUT);}catch{}try{const res=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passphrase})});const result=await res.json();if(!res.ok)return result.error as string;
 // Onboarding waits for the remote account, preventing a second first-run flow on a new device.
 const data=await fetch('/api/state',{cache:'no-store'});if(!data.ok)return 'Your data could not load. Try again.';
 const raw=await data.json();try{localStorage.removeItem(LOCK);}catch{}const {applied,revision,...bare}=raw as State&{applied?:string[];revision?:number};
 // The device's held changes are projected under the account's receipt, exactly as a sync answer is: a change the account already applied
 // is acknowledged, not applied again; an unsent one is shown; the sync that follows settles anything the full receipt could not classify.
 const held=pendingWithJournal(store.pending);const r=project(bare as State,held,new Set(),applied,new Set());
 const next={...store,state:r.state,pending:r.pending,acked:[...store.acked,...r.done],revision:typeof revision==='number'?revision:-1,unlocked:true};if(persist(next))for(const id of r.done)journalRemove(id);set(next);void synchronize();return '';
 }catch{return 'Connect to the internet to unlock this device.';}}
// The device is cleared first and synchronously: marker, snapshot, timers and every journal key, with the marker retried after the clear
// frees space if its first write fails. Only then is the account session ended, in the background; if that request fails or never
// answers, it is retried whenever the locked app starts or comes back, and its result is never claimed.
const LOGOUT='my-wellness-logout';
function clearDevice(){try{localStorage.removeItem(KEY);}catch{}try{localStorage.removeItem('my-wellness-timers');}catch{}journalClear();}
let loggingOut=false;
async function sendLogout(){if(loggingOut)return;try{if(localStorage.getItem(LOGOUT)===null)return;}catch{return;}loggingOut=true;try{const res=await fetch('/api/auth',{method:'DELETE',keepalive:true});if(res.ok)localStorage.removeItem(LOGOUT);}catch{}finally{loggingOut=false;}}
export function lock(){let marked=false;try{localStorage.setItem(LOCK,new Date().toISOString());marked=true;}catch{}clearDevice();if(!marked){try{localStorage.setItem(LOCK,new Date().toISOString());}catch{}}try{localStorage.setItem(LOGOUT,'1');}catch{}
 set({...store,state:emptyState(),pending:[],failed:[],discarded:[],acked:[],epoch:0,revision:-1,unlocked:false,notice:''});void sendLogout();}
export function discardFailed(){const next={...store,failed:[],discarded:[...store.discarded,...store.failed.map(f=>f.op.id)].slice(-keepDiscarded),notice:''};persist(next);set(next);}
// Projects the device's pending changes onto an account state under its receipt. A held change the receipt lists is acknowledged, not
// re-applied. When the receipt is full, a change that was sent but is neither listed nor answered may already be applied, so it is left
// unprojected (and reported) until the write that follows settles it exactly; an unsent change is applied, as it cannot be in the account.
// The receipt is complete for this device when it is not full, or when fewer than its size of changes were applied since the revision
// this device last saved (every change applied since then is then listed).
function project(state:State,pending:Operation[],answered:Set<string>,applied:string[]|undefined,batchIds:Set<string>,revision?:number,heldRevision=-1){const listed=new Set<string>(applied??[]);const complete=applied!==undefined&&(applied.length<receiptSize||(typeof revision==='number'&&heldRevision>=0&&revision-heldRevision<receiptSize));const done=new Set<string>(answered);let unclassified=false;let out=state;
 for(const op of pending){if(done.has(op.id))continue;if(listed.has(op.id)){done.add(op.id);continue;}if(applied!==undefined&&!complete&&!batchIds.has(op.id)&&wasSent(op.id)){unclassified=true;continue;}try{out=apply(out,op);}catch{}}
 return {state:out,done,unclassified,pending:pending.filter(p=>!done.has(p.id))};}
export async function synchronize(){if(syncing||!store.unlocked||!navigator.onLine||locked())return;syncing=true;let progressed=false,staleRead=false,unclassifiedHeld=false;
 try{const batch=pendingWithJournal(store.pending).slice(0,100);const epochAtStart=Math.max(Number(readSaved()?.epoch)||0,store.epoch);if(batch.length)markSent(batch);let res:Response;try{res=await fetch(batch.length?'/api/sync':'/api/state',batch.length?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(batch)}:{cache:'no-store'});}catch(error){unmarkSent(batch);throw error;}
 if(!res.ok){if(res.status===401)set({...store,notice:'Unlock again to sync. Your offline changes are safe.',unlocked:false});
  // A refused batch must not stall the queue: the first change is set aside with the server's reason and the rest are retried.
  else if(res.status===400&&batch.length){let reason='The account refused this change.';try{reason=(await res.json()).error??reason;}catch{}await withLock(()=>{const first=batch[0];const pending=pendingWithJournal(store.pending.filter(p=>p.id!==first.id)).filter(p=>p.id!==first.id);let state=store.state;for(const op of pending.filter(p=>!store.pending.some(q=>q.id===p.id))){try{state=apply(state,op);}catch{}}const next={...store,state,pending,failed:[...store.failed,{op:first,reason,at:new Date().toISOString()}],acked:[...store.acked,first.id],epoch:Math.max(epochAtStart,store.epoch)+1,notice:reason};if(persist(next)){journalRemove(first.id);set(next);progressed=true;}});
   // The refused change's local effect is still on screen; a read follows at once and installs the account's state, and the rest of the queue goes with it.
   staleRead=true;}
  }else{
 const raw=await res.json();
 // The receipt binds the answer's state to the changes it contains: any change this device still holds that the account lists as applied
 // is acknowledged now, before the state is used, so it is never applied a second time on top of a state that already includes it.
 const answer=batch.length?{state:raw.state as State,accepted:raw.accepted as string[],rejected:raw.rejected as {id:string;reason:string}[],applied:raw.applied as string[]|undefined,revision:raw.revision as number|undefined}:(()=>{const {applied,revision,...state}=raw as State&{applied?:string[];revision?:number};return {state:state as State,accepted:[] as string[],rejected:[] as {id:string;reason:string}[],applied,revision};})();
 const answered=new Set<string>([...answer.accepted,...answer.rejected.map(r=>r.id)]);const batchIds=new Set(batch.map(o=>o.id));let unclassified=false;
 await withLock(()=>{
  // Another account answer was saved on this device while this request was in flight. The answer in hand may be older than the state
  // already saved, so it is not installed. A read is simply repeated; a write's acknowledgements are still recorded (the account holds
  // the changes), and the state they produced arrives with the read that follows at once.
  // With a receipt, staleness is exact: an answer whose revision is below the one already saved on this device is older than what the
  // device holds. Without one, the epoch fallback applies.
  const saved=readSaved();const epochNow=Math.max(Number(saved?.epoch)||0,store.epoch);const heldRevision=Math.max(savedRevision(saved),store.revision);
  const stale=typeof answer.revision==='number'&&heldRevision>=0?answer.revision<heldRevision:epochNow!==epochAtStart;
  let pending=pendingWithJournal([...store.pending,...arrivedMeanwhile(answered)],answered);let state:State=stale?(saved?.state??store.state):answer.state;const done=new Set<string>(answered);
  if(!stale){const r=project(answer.state,pending,answered,answer.applied,batchIds,answer.revision,heldRevision);state=r.state;pending=r.pending;for(const id of r.done)done.add(id);unclassified=r.unclassified;}
  else{staleRead=true;for(const op of pending)if(answer.applied?.includes(op.id))done.add(op.id);pending=pending.filter(p=>!done.has(p.id));if(!batch.length&&done.size===0){progressed=true;return;}
   // The saved state is projected with the pending changes it does not yet list, as a storage merge does.
   const listed:Operation[]=Array.isArray(saved?.pending)?saved.pending:[];for(const op of pending.filter(p=>!listed.some(l=>l.id===p.id))){try{state=apply(state,op);}catch{}}}
  const refused:Failed[]=batch.length?answer.rejected.map(r=>({op:batch.find(o=>o.id===r.id)??({id:r.id} as Operation),reason:r.reason,at:new Date().toISOString()})):[];
  // The acknowledgements are saved first; only then do the acknowledged changes leave the journal. If the save fails they stay journaled,
  // are presented again, and the account answers the same way (accepted ids are already recorded there; refused ones are refused again).
  const next={...store,state,pending,failed:[...store.failed,...refused],acked:[...store.acked,...done],epoch:Math.max(epochNow,epochAtStart)+1,revision:stale?heldRevision:typeof answer.revision==='number'?answer.revision:store.revision,notice:refused.length?refused.map(r=>r.reason).join(' '):store.notice};if(persist(next)){for(const id of done)journalRemove(id);set(next);progressed=true;unclassifiedHeld=unclassified;}});}
 }catch{set({...store,notice:''});}finally{syncing=false;if(storageWaiting){storageWaiting=false;mergeFromStorage();}}
 if(progressed&&(pendingWithJournal(store.pending).length>0||staleRead||unclassifiedHeld))setTimeout(()=>void synchronize(),100);
}
