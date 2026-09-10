// The settlement rules run in Node with a fake localStorage, so the timer store behaves as it does in the browser.
import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
const store=new Map<string,string>();
(globalThis as unknown as {localStorage:Storage}).localStorage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);},removeItem:(k:string)=>{store.delete(k);},clear:()=>store.clear(),key:()=>null,length:0} as Storage;
const {startTimer,getTimer,pauseTimer}=await import('../lib/timer');
const {settle,applySettled,maxFocusBlocks}=await import('../lib/settle');
const {routines,routineSeconds}=await import('../lib/abs');
beforeEach(()=>store.clear());
test('a finished ab routine settles once, credited to its start day, and clears itself',()=>{
 const t=startTimer('abs','2026-09-01',{routine:'quick'});const total=routineSeconds(routines.find(r=>r.id==='quick')!);
 assert.deepEqual(settle(t.startedAt!+(total-1)*1000),[]);
 const done=settle(t.startedAt!+(total+5)*1000);assert.equal(done.length,1);assert.deepEqual(done[0].op,{type:'session',habit:'abs',seconds:total,done:true,routine:'Two-minute burst',day:'2026-09-01'});
 const ops:unknown[]=[];applySettled(done,op=>{ops.push(op);return true;});assert.equal(ops.length,1);assert.equal(getTimer('abs'),null);
 assert.deepEqual(settle(t.startedAt!+(total+50)*1000),[],'nothing to settle twice');
});
test('a paused routine never finishes on its own',()=>{const t=startTimer('abs','2026-09-01',{routine:'quick'});pauseTimer('abs');assert.deepEqual(settle(t.startedAt!+3600*1000),[]);});
test('meditation credits the chosen length when the countdown ends',()=>{
 const t=startTimer('meditate','2026-09-02',{minutes:3});assert.deepEqual(settle(t.startedAt!+179*1000),[]);
 const done=settle(t.startedAt!+181*1000);assert.deepEqual(done.map(d=>d.op),[{type:'meditate',seconds:180,day:'2026-09-02'}]);applySettled(done,()=>true);assert.equal(getTimer('meditate'),null);
});
test('focus credits each finished work block once, catches up after time away, and ends itself after the cap',()=>{
 const t=startTimer('focus','2026-09-03',{work:15,rest:3,logged:0});const cycle=18*60*1000;
 assert.deepEqual(settle(t.startedAt!+14*60*1000),[]);
 let done=settle(t.startedAt!+15*60*1000+500);assert.deepEqual(done.map(d=>d.op),[{type:'focus',seconds:900,day:'2026-09-03'}]);assert.equal(getTimer('focus')?.meta?.logged,1);
 assert.deepEqual(settle(t.startedAt!+16*60*1000),[],'the same block is not credited twice');
 done=settle(t.startedAt!+cycle*3+15*60*1000+500);assert.equal(done.filter(d=>d.op.type==='focus'&&d.op.seconds===900).length,3,'three blocks passed while away, all credited');
 done=settle(t.startedAt!+cycle*maxFocusBlocks+1000);const ops:unknown[]=[];applySettled(done,op=>{ops.push(op);return true;});
 assert.equal(ops.length,maxFocusBlocks-4);assert.equal(getTimer('focus'),null,'the session ends itself at the cap');
});
