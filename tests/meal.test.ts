import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scaleMealPortion} from '../lib/meal';
import type {MealItem} from '../lib/domain';
const item:MealItem={name:'Chicken',grams:100,calories:165,protein:31,source:'usda',match:'Chicken breast',fdcId:123};
test('portion changes scale nutrition for both estimate sources while preserving details',()=>{
 for(const source of ['usda','estimate'] as const) {
  const original={...item,source};assert.deepEqual(scaleMealPortion(original,200),{...original,grams:200,calories:330,protein:62});
  assert.deepEqual(scaleMealPortion(original,50),{...original,grams:50,calories:82.5,protein:15.5});
  assert.deepEqual(scaleMealPortion(original,0),{...original,grams:0,calories:0,protein:0});
 }
 assert.equal(item.grams,100);
});
test('zero starting portions retain explicit nutrition without division by zero',()=>{
 for(const calories of [0,165]) {const zero={...item,grams:0,calories};assert.deepEqual(scaleMealPortion(zero,200),{...zero,grams:200});assert.deepEqual(scaleMealPortion(zero,0),zero);}
});
