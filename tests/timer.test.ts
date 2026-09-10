import {test} from 'node:test';
import assert from 'node:assert/strict';
import {elapsedSeconds,clock,type Timer} from '../lib/timer';
import {routines,phaseAt,routineSeconds,intervalsOf} from '../lib/abs';
import {isFree,models} from '../lib/estimate';
test('elapsed time is computed from the clock, so time away from the app still counts',()=>{
 const t0=1_700_000_000_000;
 const running:Timer={key:'walk',startedAt:t0,banked:0,day:'2026-09-01'};
 assert.equal(elapsedSeconds(running,t0+90_000),90);
 assert.equal(elapsedSeconds(running,t0+3_600_000),3600,'an hour locked is still an hour');
 const paused:Timer={key:'walk',startedAt:null,banked:120_000,day:'2026-09-01'};
 assert.equal(elapsedSeconds(paused,t0+999_999_999),120,'a paused timer never grows');
 const resumed:Timer={...paused,startedAt:t0};assert.equal(elapsedSeconds(resumed,t0+30_000),150);
 assert.equal(elapsedSeconds(null),0);
});
test('the clock face formats minutes, seconds and hours',()=>{assert.equal(clock(0),'0:00');assert.equal(clock(65),'1:05');assert.equal(clock(3725),'1:02:05');assert.equal(clock(-3),'0:00');});
test('every ab routine has instructions, timed intervals, and a phase derivable from any elapsed time',()=>{
 assert.ok(routines.length>=4);
 for(const r of routines){assert.ok(r.exercises.length>=4);for(const e of r.exercises){assert.ok(e.cue.length>20);assert.ok(e.name);}
  const total=routineSeconds(r);assert.equal(intervalsOf(r).length,r.exercises.length*2-1);
  assert.equal(phaseAt(r,0).interval.kind,'work');assert.equal(phaseAt(r,r.work).interval.kind,'rest');assert.equal(phaseAt(r,r.work+r.rest).index,2);
  assert.equal(phaseAt(r,total-1).finished,false);assert.equal(phaseAt(r,total).finished,true);assert.equal(phaseAt(r,total+500).finished,true,'a backgrounded run that overshoots is simply finished');}
});
test('only free OpenRouter models are ever called',()=>{
 assert.ok(models.length>0);for(const m of models)assert.ok(isFree(m),m);
 assert.equal(isFree('openai/gpt-4o'),false);assert.equal(isFree('google/gemma-4-26b-a4b-it'),false);assert.equal(isFree('google/gemma-4-26b-a4b-it:free'),true);assert.equal(isFree('openrouter/free'),true);
});
test('the OpenRouter request body carries the zero max price and a non-free model never reaches the request',async()=>{
 const {requestBody}=await import('../lib/estimate');
 const body=requestBody('google/gemma-4-26b-a4b-it:free','Meal: toast') as {model:string;provider:{max_price:{prompt:number;completion:number}}};
 assert.equal(body.model,'google/gemma-4-26b-a4b-it:free');assert.deepEqual(body.provider,{max_price:{prompt:0,completion:0}});
 assert.throws(()=>requestBody('openai/gpt-4o','Meal: toast'),/paid model refused/);assert.throws(()=>requestBody('google/gemma-4-26b-a4b-it','Meal: toast'),/paid model refused/);
});
