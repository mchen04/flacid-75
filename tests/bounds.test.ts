// The browser-side bounds must agree with the server schema, and a malformed change must never strand valid ones.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {checkBounds, clip} from '../lib/bounds';
import {operationSchema, validateBatch} from '../lib/validation';
import type {Operation} from '../lib/domain';
const base=()=>({id:randomUUID(),at:'2026-09-10T20:00:00.000Z',day:'2026-09-10',zone:'UTC'});
const stats={height:165,weight:65,age:30,activity:1 as const,goal:'maintain' as const};
const cases:[string,Operation][]=[
 ['treat cost too high',{...base(),type:'rewards',rewards:[{id:randomUUID(),name:'Trip',cost:20000}]}],
 ['treat cost fractional',{...base(),type:'rewards',rewards:[{id:randomUUID(),name:'Trip',cost:10.5}]}],
 ['too many treats',{...base(),type:'rewards',rewards:Array.from({length:31},()=>({id:randomUUID(),name:'x',cost:1}))}],
 ['plan line too long',{...base(),type:'plan',workout:['x'.repeat(61)]}],
 ['too many plan lines',{...base(),type:'plan',workout:Array.from({length:41},()=>'a')}],
 ['negative meal',{...base(),type:'meal',mealId:randomUUID(),calories:-5,protein:1}],
 ['oversized meal',{...base(),type:'meal',mealId:randomUUID(),calories:10001,protein:1}],
 ['zero water',{...base(),type:'water',amount:0}],
 ['oversized pour',{...base(),type:'water',amount:7000}],
 ['container too big',{...base(),type:'containers',containers:[{id:'a',name:'Vat',ml:9000}]}],
 ['session too long',{...base(),type:'session',habit:'walk',seconds:90000,done:true}],
 ['profile out of range',{...base(),type:'profile',stats:{...stats,weight:20},overrides:{}}],
 ['bad id',{...base(),id:'not-a-uuid',type:'check',habit:'walk',value:true}],
];
const good:Operation[]=[
 {...base(),type:'rewards',rewards:[{id:randomUUID(),name:'Film night',cost:10000}]},
 {...base(),type:'plan',workout:['x'.repeat(60)]},
 {...base(),type:'meal',mealId:randomUUID(),calories:10000,protein:1000},
 {...base(),type:'water',amount:443.6,label:'half a Stanley'},
 {...base(),type:'water',amount:-443.6},
 {...base(),type:'containers',containers:[{id:'stanley',name:'Stanley',ml:887.205886875}],defaultContainer:'stanley'},
 {...base(),type:'session',habit:'abs',seconds:115,done:true,routine:'Two-minute burst'},
 {...base(),type:'check',habit:'floss',value:true},
 {...base(),type:'profile',stats,overrides:{walkMinutes:45}},
];
test('every change the server would refuse is refused by the browser bounds first, with a reason',()=>{
 for(const [name,op] of cases){assert.equal(operationSchema.safeParse(op).success,false,`server accepts ${name}`);assert.equal(typeof checkBounds(op),'string',`bounds accept ${name}`);}
});
test('every change the server accepts passes the browser bounds',()=>{
 for(const op of good){assert.equal(operationSchema.safeParse(op).success,true,op.type);assert.equal(checkBounds(op),null,op.type);}
});
test('a batch with an invalid first change still applies the valid ones and names the bad one',()=>{
 const bad=cases[0][1];const ok=good[7];
 const batch=validateBatch([bad,ok]);assert.ok(batch);assert.equal(batch!.valid.length,1);assert.equal(batch!.valid[0].id,ok.id);assert.equal(batch!.invalid.length,1);assert.equal(batch!.invalid[0].id,bad.id);assert.match(batch!.invalid[0].reason,/refused/);
 assert.equal(validateBatch([]),null);assert.equal(validateBatch('nope'),null);assert.equal(validateBatch(Array.from({length:101},()=>ok)),null);
 // A change without any id is still reported, with an empty id, so the device can set aside the head of its queue.
 assert.equal(validateBatch([{type:'water'}])!.invalid[0].id,'');
});
test('review 171: free text must be well-formed without NUL on both sides, measured in characters; valid emoji passes; clip never splits a character',()=>{
 const HIGH=String.fromCharCode(0xD83D);const NUL=String.fromCharCode(0);
 const plan=(line:string):Operation=>({...base(),type:'plan',workout:[line]});
 const both=(op:Operation)=>({client:checkBounds(op)===null,server:validateBatch([op])!.invalid.length===0});
 assert.deepEqual(both(plan('x'.repeat(59)+'😀')),{client:true,server:true},'59 ascii and an emoji is 60 characters');
 assert.deepEqual(both(plan('😀'.repeat(60))),{client:true,server:true},'60 emoji');
 assert.deepEqual(both(plan('😀'.repeat(61))),{client:false,server:false},'61 emoji');
 assert.deepEqual(both(plan('x'.repeat(59)+HIGH)),{client:false,server:false},'lone high surrogate');
 assert.deepEqual(both(plan('a'+NUL+'b')),{client:false,server:false},'NUL');
 assert.deepEqual(both({...base(),type:'rewards',rewards:[{id:randomUUID(),name:'Tea '+HIGH,cost:5}]}),{client:false,server:false});
 assert.deepEqual(both({...base(),type:'water',amount:250,label:'sip'+NUL}),{client:false,server:false});
 assert.deepEqual(both({...base(),type:'session',habit:'workout',seconds:60,done:true,items:['ok',HIGH]}),{client:false,server:false});
 assert.deepEqual(both({...base(),type:'containers',containers:[{id:'c',name:'Bottle '+HIGH,ml:500}]}),{client:false,server:false});
 assert.deepEqual(both({...base(),type:'redeem',rewardId:randomUUID(),name:'Film'+NUL,cost:5}),{client:false,server:false});
 assert.equal(clip('x'.repeat(59)+'😀',60),'x'.repeat(59)+'😀');assert.equal(clip('x'.repeat(60)+'😀',60),'x'.repeat(60));assert.equal(clip('x'.repeat(59)+HIGH,60),'x'.repeat(59));assert.equal(clip('a'+NUL+'b',60),'ab');
 // A mixed batch: the malformed changes are refused by id and the valid ones (including emoji) stay valid.
 const bad1=plan('x'.repeat(59)+HIGH),bad2={...base(),type:'rewards',rewards:[{id:randomUUID(),name:'a'+NUL,cost:5}]} as Operation,good1=plan('Press-ups 💪'),good2={...base(),type:'water',amount:250} as Operation;
 const r=validateBatch([bad1,bad2,good1,good2])!;assert.deepEqual(r.invalid.map(i=>i.id).sort(),[bad1.id,bad2.id].sort());assert.deepEqual(r.valid.map(o=>o.id),[good1.id,good2.id]);
});
test('review 171: target overrides are bounded on the device as on the account; the oz field cap keeps the water override inside 6000 ml',()=>{
 const oz=29.5735295625;const prof=(overrides:Record<string,number>):Operation=>({...base(),type:'profile',stats,overrides});
 assert.equal(checkBounds(prof({water:203*oz})),'A target is outside the range the app accepts.');assert.equal(validateBatch([prof({water:203*oz})])!.invalid.length,1);
 assert.equal(checkBounds(prof({water:202.8*oz})),null);assert.equal(validateBatch([prof({water:202.8*oz})])!.invalid.length,0);
 for(const [k,v] of [['calorieMin',1100],['calorieMax',6600],['protein',10],['steps',100],['walkMinutes',400]] as const){assert.notEqual(checkBounds(prof({[k]:v})),null,k);assert.equal(validateBatch([prof({[k]:v})])!.invalid.length,1,k);}
});
test('review 171 follow-up: container ids and the default container id are held to the same text rule on both sides',()=>{
 const HIGH=String.fromCharCode(0xD83D);const NUL=String.fromCharCode(0);
 const both=(op:Operation)=>({client:checkBounds(op)===null,server:validateBatch([op])!.invalid.length===0});
 const c=(id:string,defaultContainer?:string):Operation=>({...base(),type:'containers',containers:[{id,name:'Bottle',ml:500}],...(defaultContainer===undefined?{}:{defaultContainer})});
 assert.deepEqual(both(c(randomUUID(),randomUUID())),{client:true,server:true});
 assert.deepEqual(both(c('stanley','stanley')),{client:true,server:true});
 assert.deepEqual(both(c('id'+HIGH)),{client:false,server:false});assert.deepEqual(both(c('id'+NUL)),{client:false,server:false});
 assert.deepEqual(both(c('ok','d'+HIGH)),{client:false,server:false});assert.deepEqual(both(c('ok','d'+NUL)),{client:false,server:false});
 assert.deepEqual(both(c('x'.repeat(41))),{client:false,server:false});assert.deepEqual(both(c('ok','x'.repeat(41))),{client:false,server:false});
});
