// Finishing a timer: capped to 24 hours, queued first, cleared only when accepted. A refused change leaves the timer recoverable.
import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
const store=new Map<string,string>();
(globalThis as unknown as {localStorage:Storage}).localStorage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);},removeItem:(k:string)=>{store.delete(k);},clear:()=>store.clear(),key:()=>null,length:0} as Storage;
const {startTimer,getTimer}=await import('../lib/timer');
const {finishTimer,cappedSeconds,maxSessionSeconds}=await import('../lib/sessions');
const {checkBounds}=await import('../lib/bounds');
const {settle}=await import('../lib/settle');
beforeEach(()=>store.clear());
test('a session that ran for 26 hours is logged as 24 hours, which the account accepts, and only then is the timer cleared',()=>{
 const t=startTimer('walk','2026-09-08');const seen:number[]=[];
 assert.equal(finishTimer('walk',(seconds,day)=>{seen.push(seconds);assert.equal(day,'2026-09-08');return checkBounds({id:'12345678-1234-4123-8123-123456789abc',at:'2026-09-09T10:00:00.000Z',day,zone:'UTC',type:'session',habit:'walk',seconds,done:true})===null;},t.startedAt!+26*3600*1000),true);
 assert.deepEqual(seen,[maxSessionSeconds]);assert.equal(getTimer('walk'),null);
 assert.equal(cappedSeconds(90000),86400);assert.equal(cappedSeconds(-5),0);assert.equal(cappedSeconds(1799.6),1800);
});
test('a refused change keeps the timer so the session can be finished again; nothing is lost silently',()=>{
 const t=startTimer('workout','2026-09-08');
 assert.equal(finishTimer('workout',()=>false,t.startedAt!+600*1000),false);
 assert.ok(getTimer('workout'),'the timer survives a refusal');
 assert.equal(finishTimer('workout',()=>true,t.startedAt!+600*1000),true);assert.equal(getTimer('workout'),null);
 assert.equal(finishTimer('nothing',()=>true),false);
});
test('two focus sessions on the same day credit separately; the same session settled twice (two tabs) shares its ids',()=>{
 const run=(id:string,start:number)=>{store.set('my-wellness-timers',JSON.stringify({focus:{key:'focus',day:'2026-09-10',startedAt:start,banked:0,meta:{work:25,rest:5,logged:0,run:id}}}));return settle(start+25*60*1000+500).map(s=>s.id);};
 const first=run('11111111-1111-4111-8111-111111111111',1000000);const firstAgain=run('11111111-1111-4111-8111-111111111111',1000000);const second=run('22222222-2222-4222-8222-222222222222',10000000);
 assert.equal(first.length,1);assert.deepEqual(first,firstAgain,'same session, same id across tabs');assert.notEqual(first[0],second[0],'a new session gets new ids');
 // Timers stored before sessions carried a run id still settle, keyed by their start instant.
 const legacyA=(()=>{store.set('my-wellness-timers',JSON.stringify({focus:{key:'focus',day:'2026-09-10',startedAt:1000000,banked:0,meta:{work:25,rest:5,logged:0}}}));return settle(1000000+25*60*1000+500)[0].id;})();
 const legacyB=(()=>{store.set('my-wellness-timers',JSON.stringify({focus:{key:'focus',day:'2026-09-10',startedAt:10000000,banked:0,meta:{work:25,rest:5,logged:0}}}));return settle(10000000+25*60*1000+500)[0].id;})();
 assert.notEqual(legacyA,legacyB);
});
