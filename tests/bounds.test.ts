// The browser-side bounds must agree with the server schema, and a malformed change must never strand valid ones.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {checkBounds} from '../lib/bounds';
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
