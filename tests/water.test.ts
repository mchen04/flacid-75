import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {parsePhrase, pourMl, describe, inContainers, countOf, fractionOf} from '../lib/water';
import {seedContainers, mlPerOz, apply, emptyState, containersOf, type Operation} from '../lib/domain';
import {formatVolume, parseVolume, toOz, ozToMl} from '../lib/units';
import {checkBounds, limits} from '../lib/bounds';
import {operationSchema} from '../lib/validation';
const [stanley, glass] = seedContainers();
const oz = {weight: 'lb' as const, height: 'ftin' as const};
test('the seeded Stanley is 30 oz stored in millilitres and shown in her unit',()=>{
 assert.equal(stanley.name,'Stanley');assert.equal(stanley.ml,30*mlPerOz);assert.equal(formatVolume(stanley.ml,oz),'30 oz');assert.equal(formatVolume(stanley.ml,{...oz,volume:'ml'}),'887 ml');
 assert.equal(containersOf(null).default.id,'stanley');
});
test('half a Stanley is exactly 15 oz: container size times share, computed by the app',()=>{
 for(const phrase of ['I drank half my Stanley','half a stanley','Half the Stanley']){const r=parsePhrase(phrase,[stanley,glass],stanley);assert.equal(r.kind,'ok');if(r.kind==='ok'){assert.equal(r.fraction,.5);assert.equal(r.ml,stanley.ml/2);assert.ok(Math.abs(toOz(r.ml)-15)<1e-9);assert.equal(formatVolume(r.ml,oz),'15 oz');assert.equal(r.label,'half a Stanley');}}
});
test('a quarter, most of it, the whole thing and refilled twice all resolve to the right share and count',()=>{
 const ok=(p:string)=>{const r=parsePhrase(p,[stanley,glass],stanley);assert.equal(r.kind,'ok',p);return r as Extract<ReturnType<typeof parsePhrase>,{kind:'ok'}>;};
 assert.equal(ok('a quarter of my Stanley').ml,stanley.ml*.25);assert.equal(formatVolume(ok('a quarter of my Stanley').ml,oz),'7.5 oz');
 assert.equal(ok('most of it').fraction,.75);assert.equal(ok('the whole thing').fraction,1);assert.equal(ok('finished the whole Stanley').ml,stanley.ml);
 const refills=ok('refilled it twice');assert.equal(refills.count,2);assert.equal(refills.fraction,1);assert.equal(refills.ml,stanley.ml*2);assert.equal(refills.label,'2 Stanleys');
 assert.equal(ok('refilled the stanley three times').count,3);assert.equal(ok('two glasses').ml,glass.ml*2);assert.equal(ok('a glass').container.id,'glass');
 assert.equal(countOf('refilled it'),1);assert.equal(fractionOf('three quarters'),.75);
});
test('an ambiguous phrase asks once and never guesses a number',()=>{
 for(const p of ['some of my Stanley','a sip of the Stanley','Stanley']){const r=parsePhrase(p,[stanley,glass],stanley);assert.equal(r.kind,'ask',p);if(r.kind==='ask'){assert.equal(r.container?.id,'stanley');assert.match(r.question,/How much of the Stanley\?/);}}
 assert.equal(parsePhrase('went for a run',[stanley,glass],stanley).kind,'none');
 assert.equal(parsePhrase('',[stanley,glass],stanley).kind,'none');
});
test('progress reads in her terms',()=>{
 assert.equal(inContainers(stanley.ml*2,stanley.ml*2.25,stanley),'about 2 of 2¼ Stanleys');assert.equal(inContainers(stanley.ml*1.5,2000,stanley),'about 1½ of 2¼ Stanleys');assert.equal(inContainers(0,2000,stanley),'about 0 of 2¼ Stanleys');assert.equal(inContainers(300,600,stanley),'about ¼ of ¾ Stanleys');assert.equal(inContainers(2000,2000,stanley),'about 2¼ of 2¼ Stanleys');assert.equal(inContainers(stanley.ml,stanley.ml,stanley),'about 1 of 1 Stanley');assert.equal(inContainers(stanley.ml*.75,stanley.ml*.75,stanley,false),'¾ of ¾ Stanleys');
 assert.equal(describe(stanley,.75,1),'three quarters of a Stanley');assert.equal(pourMl(glass,1,3),750);
});
test('volumes round-trip through the unit setting without changing the stored millilitres',()=>{
 assert.equal(parseVolume('30',oz),stanley.ml);assert.equal(parseVolume('887',{...oz,volume:'ml'}),887);assert.equal(parseVolume('x',oz),null);
 assert.ok(Math.abs(toOz(ozToMl(12.5))-12.5)<1e-12);
});
test('pours append to the day log, undo removes the last matching pour, and the schema accepts container sizes',()=>{
 const stats={height:165,weight:65,age:30,activity:1 as const,goal:'maintain' as const};
 const common=()=>({id:randomUUID(),day:'2026-09-10',at:'2026-09-10T20:00:00.000Z',zone:'UTC'});
 let s=apply(emptyState(),{...common(),type:'profile',stats,overrides:{}});
 s=apply(s,{...common(),type:'water',amount:stanley.ml/2,label:'half a Stanley'});s=apply(s,{...common(),type:'water',amount:stanley.ml/2,label:'half a Stanley'});
 assert.equal(s.days['2026-09-10'].water,stanley.ml);assert.equal(s.days['2026-09-10'].waterLog?.length,2);assert.equal(formatVolume(s.days['2026-09-10'].water,oz),'30 oz');
 s=apply(s,{...common(),type:'water',amount:-stanley.ml/2});assert.equal(s.days['2026-09-10'].waterLog?.length,1);assert.equal(formatVolume(s.days['2026-09-10'].water,oz),'15 oz');
 // Old-style glass ops still work and old days without a log still read.
 s=apply(s,{...common(),type:'water',amount:250});assert.equal(s.days['2026-09-10'].waterLog?.at(-1)?.ml,250);
 const legacy={...s,days:{...s.days,'2026-09-09':{...s.days['2026-09-10'],waterLog:undefined,water:500}}};assert.equal(apply(legacy,{...common(),day:'2026-09-09',type:'water',amount:-250} as Operation).days['2026-09-09'].water,250);
 assert.ok(operationSchema.safeParse({...common(),type:'water',amount:443.6,label:'half a Stanley'}).success);assert.ok(!operationSchema.safeParse({...common(),type:'water',amount:0}).success);
 assert.ok(operationSchema.safeParse({...common(),type:'containers',containers:[{id:'stanley',name:'Stanley',ml:stanley.ml}],defaultContainer:'stanley'}).success);
 s=apply(s,{...common(),type:'containers',containers:[{id:'b',name:'Bottle',ml:500}],defaultContainer:'b'});assert.equal(containersOf(s.profile).default.name,'Bottle');
});
test('a long container name with three quarters yields a label the account accepts once trimmed to the bound; refilled my Stanley twice is two',()=>{
 const long={id:'q',name:'Stanley Quencher 40 oz',ml:40*mlPerOz};
 const label=describe(long,.75,1);assert.ok(label.length>40,label);
 const base={id:'12345678-1234-4123-8123-123456789abc',at:'2026-09-10T12:00:00.000Z',day:'2026-09-10',zone:'UTC'};
 assert.equal(checkBounds({...base,type:'water',amount:long.ml*.75,label:label.slice(0,limits.waterLabel)}),null);
 assert.ok(operationSchema.safeParse({...base,type:'water',amount:long.ml*.75,label:label.slice(0,limits.waterLabel)}).success);
 const worst=describe({id:'w',name:'x'.repeat(30),ml:500},.75,3);assert.ok(worst.length<=limits.waterLabel,`${worst.length}`);
 assert.equal(countOf('refilled my Stanley twice'),2);assert.equal(countOf('refilled the Stanley 3 times'),3);assert.equal(countOf('refilled it'),1);
 const r=parsePhrase('refilled my Stanley twice',[stanley,glass],stanley);assert.equal(r.kind,'ok');if(r.kind==='ok')assert.equal(r.ml,stanley.ml*2);
});

test('a container whose name contains another name or a number is read whole: no phantom counts',()=>{
 const long={id:'q',name:'Stanley Quencher 40 oz',ml:40*mlPerOz};
 const r=parsePhrase('three quarters of my Stanley Quencher 40 oz',[stanley,glass,long],stanley);assert.equal(r.kind,'ok');
 if(r.kind==='ok'){assert.equal(r.container.id,'q');assert.equal(r.fraction,.75);assert.equal(r.count,1);assert.ok(Math.abs(toOz(r.ml)-30)<1e-9);}
 const two=parsePhrase('two thirds of the Stanley',[stanley,glass,long],stanley);assert.equal(two.kind,'ok');if(two.kind==='ok'){assert.equal(two.count,1);assert.ok(Math.abs(two.fraction-2/3)<1e-9);}
 const both=parsePhrase('2 Stanley Quencher 40 oz',[stanley,glass,long],stanley);assert.equal(both.kind,'ok');if(both.kind==='ok'){assert.equal(both.count,2);assert.equal(both.container.id,'q');}
});
test('review 171: a slash fraction is a share, never a count; multiples still count',()=>{
 const c={id:'s',name:'Stanley',ml:30*29.5735295625};
 for(const [phrase,fraction,count] of [['3/4 of the Stanley',.75,1],['1/2 Stanley',.5,1],['2/3 of it',2/3,1],['1/4 of my Stanley',.25,1],['3/4 of the Stanley twice',.75,2],['two Stanleys',1,2],['2 x 1/2 Stanley',.5,2],['refilled it 3 times',1,3],['three quarters of a Stanley',.75,1],['half a Stanley',.5,1]] as const){
  const p=parsePhrase(phrase,[c],c);assert.equal(p.kind,'ok',phrase);if(p.kind==='ok'){assert.ok(Math.abs(p.fraction-fraction)<1e-9,phrase);assert.equal(p.count,count,phrase);assert.ok(Math.abs(p.ml-c.ml*fraction*count)<1e-9,phrase);}
 }
});
test('workout172: symbol shares parse without word boundaries; mixed numbers are one pour of that many containers; plain multiples still count',()=>{
 const s={id:'s',name:'Stanley',ml:30*29.5735295625};const g={id:'g',name:'glass',ml:250};
 const cases:[string,number,number,number][]=[['¾ of a Stanley',.75,1,s.ml*.75],['½ a glass',.5,1,125],['¼ Stanley',.25,1,s.ml/4],['two and a half glasses',2.5,1,625],['one and a half Stanleys',1.5,1,s.ml*1.5],['1 and a quarter Stanleys',1.25,1,s.ml*1.25],['2½ glasses',2.5,1,625],['two glasses',1,2,500],['half a glass twice',.5,2,250],['a glass and a half',1.5,1,375]];
 for(const [phrase,fraction,count,ml] of cases){const p=parsePhrase(phrase,[s,g],s);assert.equal(p.kind,'ok',phrase);if(p.kind==='ok'){assert.ok(Math.abs(p.fraction-fraction)<1e-9,phrase+' fraction '+p.fraction);assert.equal(p.count,count,phrase);assert.ok(Math.abs(p.ml-ml)<1e-9,phrase+' ml '+p.ml);}}
 assert.equal(describe(g,2.5,1),'2½ glasses');assert.equal(describe(s,1.25,1),'1¼ Stanleys');
});
