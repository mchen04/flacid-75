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
