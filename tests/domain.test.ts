import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {apply,emptyState,completion,newDay,habits,streaks,dayAt,changeZone,localDate,computeTargets,weightTrend,restsLeft,isComplete,isKept,pointsBalance,pointsEarned,milestones,restDaysPerWeek,type Operation,type State} from '../lib/domain';
const stats={height:165,weight:65,age:30,activity:1 as const,goal:'maintain' as const};
const common=(day='2026-09-01',at=day+'T20:00:00.000Z')=>({id:randomUUID(),day,at,zone:'America/Los_Angeles'});
const initial=()=>apply(emptyState(),{...common(),type:'profile',stats,overrides:{}});
function complete(s=initial(),day='2026-09-01'){for(const habit of habits)s=apply(s,{...common(day),type:'check',habit,value:true});return s;}
test('seven habits including floss are all required; a missing floss breaks the chain',()=>{assert.equal(habits.length,7);assert.ok(habits.includes('floss'));let s=initial();for(const habit of habits.filter(h=>h!=='floss'))s=apply(s,{...common(),type:'check',habit,value:true});assert.equal(isComplete(s.days['2026-09-01']),false);s=apply(s,{...common(),type:'check',habit:'floss',value:true});assert.equal(isComplete(s.days['2026-09-01']),true);});
test('a missing habit breaks the chain at midnight; today is not prematurely broken',()=>{let s=complete();assert.equal(streaks(s,'2026-09-02').current,1);assert.equal(streaks(s,'2026-09-03').current,0);s=complete(s,'2026-09-02');assert.equal(streaks(s,'2026-09-03').current,2);s=apply(s,{...common('2026-09-02'),type:'check',habit:'abs',value:false});assert.equal(streaks(s,'2026-09-03').current,0);});
test('two planned rest days per Monday-Sunday week keep the streak without adding to it; a third is refused',()=>{
 assert.equal(restDaysPerWeek,2);
 let s=complete();
 s=apply(s,{...common('2026-09-02'),type:'rest',value:true});s=apply(s,{...common('2026-09-03'),type:'rest',value:true});
 assert.equal(streaks(s,'2026-09-04').current,1);assert.equal(restsLeft(s,'2026-09-06'),0);
 assert.throws(()=>apply(s,{...common('2026-09-04'),type:'rest',value:true}),/already planned/);
 assert.equal(restsLeft(s,'2026-09-07'),2);
 // A rest day is distinguishable from a miss: kept but not complete.
 assert.equal(isKept(s.days['2026-09-02']),true);assert.equal(isComplete(s.days['2026-09-02']),false);
 // Undoing a rest frees the slot again.
 s=apply(s,{...common('2026-09-03'),type:'rest',value:false});assert.equal(restsLeft(s,'2026-09-04'),1);
});
test('rest days can be planned ahead within the current week, never beyond it; other habits cannot be logged ahead',()=>{
 let s=initial(); // 2026-09-01 is a Tuesday; the week ends Sunday 2026-09-06.
 s=apply(s,{...common('2026-09-05','2026-09-01T20:00:00.000Z'),type:'rest',value:true});
 assert.equal(s.days['2026-09-05'].rest,true);assert.equal(s.days['2026-09-05'].backfilled,false);
 assert.throws(()=>apply(s,{...common('2026-09-07','2026-09-01T20:00:00.000Z'),type:'rest',value:true}),/today or a past day/);
 assert.throws(()=>apply(s,{...common('2026-09-02','2026-09-01T20:00:00.000Z'),type:'check',habit:'walk',value:true}),/today or a past day/);
 // A planned rest in the future does not count toward today's streak calculation until that day arrives.
 assert.equal(streaks(s,'2026-09-01').history.length,1);
});
test('existing history with one rest per week is preserved and still valid under the two-day rule',()=>{
 const legacy:State={profile:{...stats,targets:computeTargets(stats),overrides:{},baselineWeight:65,startDay:'2026-08-24'},clock:{zone:'UTC',anchorDay:'2026-08-24',anchorLocal:'2026-08-24'},days:{},weights:{}};
 for(const d of ['2026-08-24','2026-08-25','2026-08-27'])legacy.days[d]={checks:Object.fromEntries(habits.map(h=>[h,true])),water:0,meals:{},targets:computeTargets(stats),rest:false,rescued:false,backfilled:false};
 legacy.days['2026-08-26']={checks:{},water:0,meals:{},targets:computeTargets(stats),rest:true,rescued:false,backfilled:false};
 assert.equal(streaks(legacy,'2026-08-28').current,3);assert.equal(restsLeft(legacy,'2026-08-28'),1);
 // Fields added later are absent on old days and every reader tolerates that.
 assert.equal(pointsEarned(legacy,'2026-08-28'),3*100);assert.equal(pointsBalance(legacy,'2026-08-28'),300);
 const s=apply(legacy,{...common('2026-08-28','2026-08-28T20:00:00.000Z'),type:'session',habit:'walk',seconds:1800,done:true});
 assert.equal(s.days['2026-08-28'].sessions?.walk?.seconds,1800);assert.equal(s.days['2026-08-28'].checks.walk,true);
});
test('sessions record time and detail, mark the habit, and undo cleanly',()=>{
 let s=initial();
 s=apply(s,{...common(),type:'session',habit:'workout',seconds:1234.6,done:true,items:['Squats','Plank']});
 assert.deepEqual(s.days['2026-09-01'].sessions?.workout,{seconds:1235,items:['Squats','Plank']});assert.equal(s.days['2026-09-01'].checks.workout,true);
 s=apply(s,{...common(),type:'session',habit:'abs',seconds:210,done:true,routine:'Classic five'});
 assert.equal(s.days['2026-09-01'].sessions?.abs?.routine,'Classic five');
 s=apply(s,{...common(),type:'session',habit:'workout',seconds:0,done:false});
 assert.equal(s.days['2026-09-01'].sessions?.workout,undefined);assert.equal(s.days['2026-09-01'].checks.workout,false);
});
test('meditation and focus are logged but never touch completion, the streak or points',()=>{
 let s=complete();
 s=apply(s,{...common('2026-09-02'),type:'meditate',seconds:300});s=apply(s,{...common('2026-09-02'),type:'focus',seconds:1500});s=apply(s,{...common('2026-09-02'),type:'focus',seconds:1500});
 assert.equal(s.days['2026-09-02'].meditate,300);assert.equal(s.days['2026-09-02'].focus,3000);
 assert.equal(isComplete(s.days['2026-09-02']),false);assert.equal(isKept(s.days['2026-09-02']),false);
 assert.equal(streaks(s,'2026-09-03').current,0);assert.equal(pointsEarned(s,'2026-09-02'),100);
});
test('points: ten per habit, thirty for a whole day; treats are user-chosen, idempotent to redeem, and undoable',()=>{
 let s=initial();
 s=apply(s,{...common(),type:'check',habit:'floss',value:true});assert.equal(pointsBalance(s,'2026-09-01'),10);
 s=complete(s);assert.equal(pointsBalance(s,'2026-09-01'),100);
 const treat={id:randomUUID(),name:'Film night',cost:80};
 s=apply(s,{...common(),type:'rewards',rewards:[treat]});assert.deepEqual(s.profile?.rewards,[treat]);
 const redeemId=randomUUID();
 s=apply(s,{...common(),type:'redeem',rewardId:redeemId,name:treat.name,cost:treat.cost});assert.equal(pointsBalance(s,'2026-09-01'),20);
 s=apply(s,{...common(),type:'redeem',rewardId:redeemId,name:treat.name,cost:treat.cost});assert.equal(pointsBalance(s,'2026-09-01'),20,'a replayed redeem does not charge twice');
 assert.throws(()=>apply(s,{...common(),type:'redeem',rewardId:randomUUID(),name:treat.name,cost:treat.cost}),/Not enough points/);
 s=apply(s,{...common(),type:'unredeem',rewardId:redeemId});assert.equal(pointsBalance(s,'2026-09-01'),100);
});
test('milestones follow the longest streak and remember the day each was first reached',()=>{
 let s=initial();for(let i=0;i<7;i++)s=complete(s,`2026-09-0${i+1}`);
 const m=milestones(s,'2026-09-07');
 assert.deepEqual(m.slice(0,2).map(x=>[x.days,x.reached,x.day]),[[3,true,'2026-09-03'],[7,true,'2026-09-07']]);
 assert.equal(m[2].reached,false);assert.equal(m[0].current,true);
});
test('units are stored as a preference; measurements stay in kilograms and centimetres',()=>{
 let s=initial();assert.equal(s.profile?.units,undefined);
 s=apply(s,{...common(),type:'units',units:{weight:'kg',height:'cm'}});assert.deepEqual(s.profile?.units,{weight:'kg',height:'cm'});
 assert.equal(s.profile?.weight,65);assert.equal(s.profile?.height,165);
 s=apply(s,{...common(),type:'units',units:{weight:'lb',height:'ftin'}});assert.equal(s.profile?.weight,65);
});
test('a workout plan is saved on the profile and a profile update keeps it',()=>{
 let s=initial();s=apply(s,{...common(),type:'plan',workout:['Squats','Rows']});assert.deepEqual(s.profile?.plan,['Squats','Rows']);
 s=apply(s,{...common(),type:'profile',stats:{...stats,age:31},overrides:{}});assert.deepEqual(s.profile?.plan,['Squats','Rows']);assert.equal(s.profile?.age,31);
});
test('rescue and backfill recalculate history, retain honest markers, allow any past day',()=>{let s=complete(complete(initial(),'2026-09-01'),'2026-09-03');assert.equal(streaks(s,'2026-09-04').current,1);s=apply(s,{...common('2026-09-02','2026-09-04T20:00:00.000Z'),type:'rescue',value:true});assert.equal(streaks(s,'2026-09-04').current,2);assert.equal(s.days['2026-09-02'].rescued,true);for(const habit of habits)s=apply(s,{...common('2026-09-02','2026-09-04T20:00:00.000Z'),type:'check',habit,value:true});assert.equal(streaks(s,'2026-09-04').current,3);assert.equal(s.days['2026-09-02'].backfilled,true);s=apply(s,{...common('2025-01-01','2026-09-04T20:00:00.000Z'),type:'check',habit:'abs',value:true});assert.equal(s.profile!.startDay,'2025-01-01');});
test('23:59, DST spring/fall, and timezone travel do not skip or duplicate days',()=>{let clock={zone:'America/Los_Angeles',anchorDay:'2026-03-07',anchorLocal:'2026-03-07'};assert.equal(dayAt(clock,'2026-03-08T07:59:00Z'),'2026-03-07');assert.equal(dayAt(clock,'2026-03-08T08:00:00Z'),'2026-03-08');assert.equal(dayAt(clock,'2026-03-09T06:59:00Z'),'2026-03-08');assert.equal(dayAt(clock,'2026-03-09T07:00:00Z'),'2026-03-09');clock=changeZone(clock,'2026-03-09T07:01:00Z','Pacific/Kiritimati');assert.equal(dayAt(clock,'2026-03-09T07:01:00Z'),'2026-03-09');assert.equal(dayAt(clock,'2026-03-09T10:00:00Z'),'2026-03-10');clock=changeZone(clock,'2026-03-09T10:01:00Z','Pacific/Honolulu');assert.equal(dayAt(clock,'2026-03-09T10:01:00Z'),'2026-03-10');assert.equal(dayAt(clock,'2026-03-10T10:00:00Z'),'2026-03-11');assert.equal(localDate('2026-11-01T08:30:00Z','America/Los_Angeles'),localDate('2026-11-01T09:30:00Z','America/Los_Angeles'));});
test('a session that runs past local midnight credits the day it was started on',()=>{
 let s=initial();
 // Started at 23:50 local on Sept 1, finished at 00:10 on Sept 2: the client passes the start day, and the domain accepts it as a past day.
 s=apply(s,{...common('2026-09-01','2026-09-02T07:10:00.000Z'),type:'session',habit:'walk',seconds:1200,done:true});
 assert.equal(s.days['2026-09-01'].checks.walk,true);assert.equal(s.days['2026-09-02'],undefined);assert.equal(s.days['2026-09-01'].backfilled,true);
});
test('calculation, smoothing, editable overrides and material recomputation',()=>{assert.deepEqual(computeTargets(stats),{calorieMin:1800,calorieMax:2000,protein:105,water:2000,steps:7000,walkMinutes:30});let s=initial();s=apply(s,{...common(),type:'profile',stats,overrides:{protein:120}});s=apply(s,{...common(),type:'weight',weight:70});assert.equal(s.profile!.targets.protein,120);assert.equal(s.profile!.baselineWeight,70);const series=weightTrend({'2026-01-01':65,'2026-01-02':70});assert.ok(series[1].value>65&&series[1].value<70);assert.equal(streaks(s,'2026-09-01').current,0);});
test('food corrections replace a meal and numeric goals remain estimates',()=>{let s=initial();const mealId=randomUUID();const op={...common(),type:'meal',mealId,calories:1800,protein:110} as Operation;s=apply(s,op);assert.equal(Object.keys(s.days['2026-09-01'].meals).length,1);s=apply(s,{...op,calories:2100} as Operation);assert.equal(Object.keys(s.days['2026-09-01'].meals).length,1);assert.equal(isComplete(s.days['2026-09-01']),false);});
test('saving targets or details without editing the weight keeps the trend baseline; editing the weight resets it',()=>{
 let s=initial();for(const [d,w] of [['2026-09-01',65],['2026-09-04',70],['2026-09-07',70],['2026-09-10',70]] as const)s=apply(s,{...common(d,d+'T20:00:00.000Z'),type:'weight',weight:w});
 const trend=s.profile!.baselineWeight;assert.ok(trend>65&&trend<=70,`trend ${trend}`);const targets=s.profile!.targets;
 s=apply(s,{...common('2026-09-10'),type:'profile',stats,overrides:{protein:120}});
 assert.equal(s.profile!.baselineWeight,trend,'an unedited weight keeps the trend baseline');assert.equal(s.profile!.targets.calorieMin,targets.calorieMin);assert.equal(s.profile!.targets.protein,120);
 s=apply(s,{...common('2026-09-10'),type:'profile',stats:{...stats,weight:80},overrides:{}});assert.equal(s.profile!.baselineWeight,80);
});
test('review 171: water completion tolerates float summation at an exactly met target in either unit, never a genuine shortfall, and is recomputed for past days',()=>{
 const oz=29.5735295625;
 for(const [target,pour,pours] of [[120*oz,30*oz/4,16],[2000,250,8],[64*oz,8*oz,8],[100*oz,10*oz,10],[3*oz,oz/4,12]] as const){
  const d=newDay({...computeTargets(stats),water:target});for(let n=0;n<pours;n++)d.water+=pour;
  assert.equal(completion(d).water,true,`target ${target}`);assert.equal(completion({...d,water:d.water-0.02}).water,false,`short ${target}`);assert.equal(completion({...d,water:d.water-pour}).water,false,`one pour short ${target}`);
 }
 // Historical behaviour, through the real change log: an exact 120 oz target set as an override, sixteen quarter-Stanley pours applied one
 // by one, and the day read back from state. The expected values are fixed booleans, not a copy of the formula, so a completion
 // regression (an exact comparison, or a tolerance that grants a pour) fails here. Keep this assertion; it is the only one that scores a
 // stored past day rather than a hand-built one.
 let s=initial();s=apply(s,{...common(),type:'profile',stats,overrides:{water:120*oz}});
 for(let n=0;n<15;n++)s=apply(s,{...common(),type:'water',amount:30*oz/4});
 assert.equal(completion(s.days['2026-09-01']).water,false,'fifteen quarters of 120 oz are not complete');
 s=apply(s,{...common(),type:'water',amount:30*oz/4});
 assert.equal(completion(s.days['2026-09-01']).water,true,'the sixteenth quarter meets the 120 oz target exactly');assert.equal(s.days['2026-09-01'].targets.water,120*oz);
});
test('review 171: a targets or details save carries only the five measurements; treats, plan, containers and units on the profile are untouched by it',()=>{
 let s=initial();s=apply(s,{...common(),type:'rewards',rewards:[{id:randomUUID(),name:'Film night',cost:50}]});s=apply(s,{...common(),type:'plan',workout:['Squats']});s=apply(s,{...common(),type:'units',units:{weight:'kg',height:'cm',volume:'ml'}});
 const stale={...stats,rewards:[],plan:['Old'],units:{weight:'lb',height:'ftin'},containers:[]} as unknown as typeof stats;
 const after=apply(s,{...common(),type:'profile',stats:stale,overrides:{protein:110}});
 assert.equal(after.profile!.rewards!.length,1);assert.deepEqual(after.profile!.plan,['Squats']);assert.deepEqual(after.profile!.units,{weight:'kg',height:'cm',volume:'ml'});assert.equal(after.profile!.containers,undefined);assert.equal(after.profile!.targets.protein,110);
});
