import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apply, emptyState, totals, completion, streaks, entriesInOrder, type Operation} from '../lib/domain';
import {operationSchema} from '../lib/validation';
import {checkBounds} from '../lib/bounds';
const day='2026-09-11';
const op=(extra:Record<string,unknown>)=>({...extra,id:crypto.randomUUID(),day,zone:'UTC',at:day+'T20:00:00.000Z'}) as Operation;
const setup=()=>apply(emptyState(),op({type:'profile',stats:{height:165,weight:65,age:30,activity:1,goal:'maintain'},overrides:{}}));
test('separate walk sessions retain their entries and total across serialization',()=>{
 let s=setup();s=apply(s,op({type:'session',habit:'walk',seconds:600,done:true}));
 s=apply(JSON.parse(JSON.stringify(s)),op({type:'session',habit:'walk',seconds:1200,done:true}));
 assert.equal(s.days[day].sessions?.walk?.seconds,1800);
});
test('meal text and item details pass validation and survive numeric edits from an older client',()=>{
 const mealId=crypto.randomUUID();const description='Eggs with pepper';
 const items=[{name:'Eggs',grams:100,calories:150,protein:12,source:'usda',match:'Egg, whole',fdcId:123}];
 const raw=op({type:'meal',mealId,calories:150,protein:12,description,items});
 const parsed=operationSchema.parse(raw);assert.equal(checkBounds(parsed),null);
 let s=apply(setup(),parsed);s=apply(s,op({type:'meal',mealId,calories:200,protein:15}));
 assert.deepEqual(JSON.parse(JSON.stringify(s.days[day].meals[mealId])),{calories:200,protein:15,description,items});
 assert.deepEqual(totals(s.days[day]),{calories:200,protein:15});
});
test('completion reverses without losing sessions, totals or streak meaning',()=>{
 let s=setup();s=apply(s,op({type:'session',habit:'walk',seconds:600,done:true}));
 for(const habit of ['workout','abs','floss','water','protein','calories'])s=apply(s,op({type:'check',habit,value:true}));
 assert.equal(streaks(s,day).current,1);
 s=apply(s,op({type:'check',habit:'walk',value:false}));assert.equal(completion(s.days[day]).walk,false);assert.equal(streaks(s,day).current,0);
 s=apply(JSON.parse(JSON.stringify(s)),op({type:'check',habit:'walk',value:true}));assert.equal(s.days[day].sessions?.walk?.seconds,600);assert.equal(streaks(s,day).current,1);
});

test('a legacy walk is imported once and repeated stable finish ids cannot add time twice',()=>{
 let s=setup();s=apply(s,op({type:'session',habit:'walk',seconds:300,done:true}));delete s.days[day].walkLog;
 const walkId=crypto.randomUUID();const finish={type:'session',habit:'walk',seconds:600,done:true,walkId};
 s=apply(s,op(finish));s=apply(JSON.parse(JSON.stringify(s)),op(finish));
 assert.equal(s.days[day].sessions?.walk?.seconds,900);assert.equal(Object.keys(s.days[day].walkLog!).length,2);
});
test('new text and item bounds agree on the device and server, including malformed text',()=>{
 const base={type:'meal',mealId:crypto.randomUUID(),calories:150,protein:12};
 const item={name:'Eggs',grams:100,calories:150,protein:12,source:'usda',match:'Egg, whole',fdcId:123};
 for(const [extra,valid] of [
  [{description:'🥚'.repeat(1000),items:[item]},true],
  [{description:'x'.repeat(1001)},false],
  [{description:'bad\u0000text'},false],
  [{description:String.fromCharCode(0xD83D)},false],
  [{items:[{...item,name:'x'.repeat(121)}]},false],
  [{items:[{...item,grams:5001}]},false],
  [{items:[{...item,source:'unknown'}]},false],
  [{items:Array(13).fill(item)},false],
 ] as const) {const value=op({...base,...extra});assert.equal(operationSchema.safeParse(value).success,valid);assert.equal(checkBounds(value)===null,valid);}
});

test('walks and meals keep insertion order through JSONB-style key reordering and individual edits',()=>{
 const first='ffffffff-ffff-4fff-8fff-ffffffffffff',second='11111111-1111-4111-8111-111111111111';
 let s=setup();for(const [id,seconds] of [[first,600],[second,1200]] as const)s=apply(s,op({type:'session',habit:'walk',walkId:id,seconds,done:true}));
 for(const mealId of [first,second])s=apply(s,op({type:'meal',mealId,calories:100,protein:5,description:mealId===first?'First':'Second'}));
 s.days[day].walkLog=Object.fromEntries(Object.entries(s.days[day].walkLog!).sort());s.days[day].meals=Object.fromEntries(Object.entries(s.days[day].meals).sort());
 assert.deepEqual(entriesInOrder(s.days[day].walkLog!,s.days[day].walkOrder).map(([id])=>id),[first,second]);
 s=apply(s,op({type:'meal',mealId:first,calories:200,protein:10}));
 assert.deepEqual(entriesInOrder(s.days[day].meals,s.days[day].mealOrder).map(([,m])=>m.description),['First','Second']);
 s=apply(s,op({type:'deleteMeal',mealId:first}));assert.deepEqual(s.days[day].mealOrder,[second]);
 assert.deepEqual(entriesInOrder({old:1,new:2},['old']).map(([id])=>id),['old','new']);
});

test('removing walks recomputes totals and preserves independent completion and streaks',()=>{
 for(const value of [true,false]) {
  let s=setup();const a=op({type:'session',habit:'walk',seconds:18000,done:true}),b=op({type:'session',habit:'walk',seconds:1800,done:true});s=apply(apply(s,a),b);
  for(const habit of ['workout','abs','floss','water','protein','calories'])s=apply(s,op({type:'check',habit,value:true}));
  s=apply(s,op({type:'check',habit:'walk',value}));const streak=streaks(s,day);
  const remove=op({type:'deleteWalk',walkId:a.id});s=apply(JSON.parse(JSON.stringify(s)),remove);
  assert.equal(s.days[day].sessions?.walk?.seconds,1800);assert.deepEqual(s.days[day].walkOrder,[b.id]);assert.equal(s.days[day].checks.walk,value);assert.deepEqual(streaks(s,day),streak);
  s=apply(s,remove);assert.equal(s.days[day].sessions?.walk?.seconds,1800);
  s=apply(s,op({type:'deleteWalk',walkId:b.id}));assert.deepEqual(s.days[day].walkLog,{});assert.deepEqual(s.days[day].walkOrder,[]);assert.equal(s.days[day].sessions?.walk,undefined);assert.equal(s.days[day].checks.walk,value);assert.deepEqual(streaks(s,day),streak);
 }
});
test('legacy walks can be removed without erasing independent completion or other sessions',()=>{
 let s=setup();s.days[day]={checks:{walk:true,workout:true},targets:s.profile!.targets,water:0,meals:{},rest:false,rescued:false,backfilled:false,sessions:{walk:{seconds:1800},workout:{seconds:900}}};
 const missing=op({type:'deleteWalk',walkId:crypto.randomUUID()});assert.deepEqual(apply(s,missing),s);
 const remove=op({type:'deleteWalk',walkId:'legacy'});assert.equal(checkBounds(remove),null);assert.equal(operationSchema.safeParse(remove).success,true);
 s=apply(s,remove);assert.equal(s.days[day].sessions?.walk,undefined);assert.equal(s.days[day].checks.walk,true);assert.equal(s.days[day].sessions?.workout?.seconds,900);
 s=apply(JSON.parse(JSON.stringify(s)),op({type:'session',habit:'walk',seconds:300,done:true}));assert.equal(s.days[day].sessions?.walk?.seconds,300);assert.equal(Object.keys(s.days[day].walkLog!).length,1);
 for(const walkId of [crypto.randomUUID(),'legacy','','__proto__','bad']) {const candidate=op({type:'deleteWalk',walkId});assert.equal(operationSchema.safeParse(candidate).success,walkId==='legacy'||walkId.length===36);assert.equal(checkBounds(candidate)===null,walkId==='legacy'||walkId.length===36);}
});
