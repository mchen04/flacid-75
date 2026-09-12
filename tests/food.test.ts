import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findFood,foodCount} from '../lib/foods';
import {ground} from '../lib/estimate';
test('the USDA table is loaded and plain names match sensible rows',()=>{
 assert.ok(foodCount>7000);
 assert.equal(findFood('egg, whole, cooked, scrambled')!.description,'Egg, whole, cooked, scrambled');
 assert.match(findFood('bread, white, toasted')!.description,/^Bread, white/);
 assert.match(findFood('banana, raw')!.description,/^Bananas, raw/);
 assert.match(findFood('blueberry muffin')!.description,/^Muffins?, blueberry/);
 assert.doesNotMatch(findFood('blueberry muffin')!.description,/mix|dry/i);
});
test('a row whose head food is not in the query is rejected rather than misused',()=>{
 assert.equal(findFood('corn salsa, vegetable')?.description.startsWith('Crackers')??false,false);
 assert.equal(findFood('zzqx'),null);
});
test('grounding marks database rows and keeps model estimates when the row disagrees wildly',()=>{
 const items=ground([{name:'egg, whole, cooked, scrambled',grams:100,calories:150,protein:10},{name:'chipotle corn salsa',grams:50,calories:35,protein:1},{name:'egg, whole, cooked, scrambled',grams:100,calories:2000,protein:10}]);
 assert.equal(items[0].source,'usda');assert.ok(items[0].calories>120&&items[0].calories<170);assert.equal(items[0].fdcId,172187);
 assert.equal(items[1].source,'estimate');assert.equal(items[1].calories,35);
 assert.equal(items[2].source,'estimate');
});

test('model item text is cleaned before grounding and passes saved-meal validation',async()=>{
 const {estimateSchema,operationSchema}=await import('../lib/validation');const {checkBounds,wellFormed}=await import('../lib/bounds');
 const raw=estimateSchema.parse({items:[{name:'egg, whole, cooked, scrambled\u0000\uD83D',grams:100,calories:150,protein:10},{name:'zzqx 🍲\uDFFF',grams:150,calories:200,protein:8}]});
 const items=ground(raw.items);assert.equal(items[0].name,'egg, whole, cooked, scrambled');assert.equal(items[0].source,'usda');assert.equal(items[0].match,'Egg, whole, cooked, scrambled');assert.equal(items[1].name,'zzqx 🍲');assert.equal(items[1].source,'estimate');
 assert.ok(items.every(i=>wellFormed(i.name)&&(!i.match||wellFormed(i.match))));
 const meal={id:crypto.randomUUID(),mealId:crypto.randomUUID(),type:'meal' as const,at:'2026-09-11T20:00:00.000Z',day:'2026-09-11',zone:'UTC',description:'Eggs and stew',items,calories:items.reduce((n,i)=>n+i.calories,0),protein:items.reduce((n,i)=>n+i.protein,0)};
 assert.equal(operationSchema.safeParse(meal).success,true);assert.equal(checkBounds(meal),null);
});
