import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toKg,toLb,toCm,feetInches,formatWeight,formatHeight,parseWeight,parseHeight} from '../lib/units';
import {defaultUnits} from '../lib/domain';
test('defaults are pounds and feet-inches',()=>{assert.deepEqual(defaultUnits,{weight:'lb',height:'ftin'});});
test('conversions round-trip without drifting the stored value',()=>{
 for(const kg of [35,65,65.3,120.25,300])assert.ok(Math.abs(toKg(toLb(kg))-kg)<1e-9);
 assert.equal(Math.round(toLb(65)*10)/10,143.3);assert.equal(Math.round(toKg(143.3)*100)/100,65);
 assert.deepEqual(feetInches(165),{feet:5,inches:5});assert.deepEqual(feetInches(toCm(6*12+1)),{feet:6,inches:1});
});
test('display follows the unit; input parses to kilograms and centimetres',()=>{
 assert.equal(formatWeight(65,{weight:'lb',height:'ftin'}),'143.3 lb');assert.equal(formatWeight(65,{weight:'kg',height:'cm'}),'65 kg');
 assert.equal(formatHeight(165,{weight:'lb',height:'ftin'}),'5′ 5″');assert.equal(formatHeight(165,{weight:'kg',height:'cm'}),'165 cm');
 assert.equal(Math.round(parseWeight('143.3',{weight:'lb',height:'ftin'})!*100)/100,65);assert.equal(parseWeight('65',{weight:'kg',height:'cm'}),65);
 assert.equal(parseWeight('abc',{weight:'kg',height:'cm'}),null);assert.equal(parseWeight('-4',{weight:'kg',height:'cm'}),null);
 assert.equal(Math.round(parseHeight('5','5','',{weight:'lb',height:'ftin'})!*10)/10,165.1);assert.equal(parseHeight('','','170',{weight:'kg',height:'cm'}),170);assert.equal(parseHeight('','','',{weight:'kg',height:'cm'}),null);
});
