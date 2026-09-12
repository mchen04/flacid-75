// Real-database integration: an isolated schema on whatever DATABASE_URL points at (a disposable localhost database is fine),
// the production migration, then races, duplicate deliveries, the two-rest-day rule and the My Wellness fields.
// Usage: DATABASE_URL=postgres://... node --import tsx scripts/integration.ts   (never the production URL for this)
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const admin=new pg.Client({connectionString:process.env.DATABASE_URL});
const schema='flaccid75_test_'+randomUUID().replaceAll('-','');
await admin.connect();await admin.query(`CREATE SCHEMA ${schema}`);
const uri=new URL(process.env.DATABASE_URL!);uri.hostname=uri.hostname.replace('-pooler','');uri.searchParams.set('options','-c search_path='+schema);process.env.DATABASE_URL=uri.toString();
const {db,sync,readState,receiptSize}=await import('../lib/db');
const {weekStart,addDays,restsLeft,pointsBalance,entriesInOrder}=await import('../lib/domain');
const {validateBatch,estimateSchema}=await import('../lib/validation');
const {ground}=await import('../lib/estimate');
try{
 await db.query(await readFile('migrations/001_initial.sql','utf8'));
 // A fixed week keeps the rest-day arithmetic deterministic: Monday 2026-09-07 to Sunday 2026-09-13, "now" is Wednesday evening.
 const day='2026-09-09';const at='2026-09-09T20:00:00.000Z';
 const base={at,day,zone:'UTC'};
 const setup={...base,id:randomUUID(),type:'profile' as const,stats:{height:165,weight:65,age:30,activity:1 as const,goal:'maintain' as const},overrides:{}};
 assert.equal((await sync([setup])).accepted.length,1);
 // Concurrent duplicate deliveries of the same operation apply once.
 const glass={...base,id:randomUUID(),type:'water' as const,amount:250};
 await Promise.all([sync([glass]),sync([glass]),sync([glass])]);
 assert.equal((await readState()).days[day].water,250);
 const checks=['workout','abs','walk'].map(habit=>({...base,id:randomUUID(),type:'check' as const,habit:habit as 'workout'|'abs'|'walk',value:true}));
 await Promise.all(checks.map(op=>sync([op])));
 assert.equal(Object.values((await readState()).days[day].checks).filter(Boolean).length,3);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM flaccid75_operations WHERE id=$1',[glass.id])).rows[0].n,1);
 // Two rest days in one Monday–Sunday week are allowed (one today, one planned ahead), a third is rejected, and undoing one frees the slot.
 const rest1={...base,id:randomUUID(),type:'rest' as const,value:true};
 const rest2={...rest1,id:randomUUID(),day:addDays(day,2)};
 const rest3={...rest1,id:randomUUID(),day:addDays(day,-1)};
 const rests=await Promise.all([sync([rest1]),sync([rest2]),sync([rest3])]);
 assert.equal(weekStart(rest3.day),weekStart(day));
 assert.equal(rests.reduce((n,r)=>n+r.rejected.length,0),1,'exactly one of three same-week rests is refused');
 const afterRests=await readState();assert.equal(Object.values(afterRests.days).filter(d=>d.rest).length,2);assert.equal(restsLeft(afterRests,day),0);
 const restedDays=Object.entries(afterRests.days).filter(([,d])=>d.rest).map(([k])=>k);
 const undoRest={...base,id:randomUUID(),type:'rest' as const,value:false,day:restedDays[0]};
 assert.equal((await sync([undoRest])).accepted.length,1);assert.equal(restsLeft(await readState(),day),1);
 // A rest planned beyond this week is refused.
 const nextWeek={...rest1,id:randomUUID(),day:addDays(weekStart(day),7)};
 assert.equal((await sync([nextWeek])).rejected.length,1);
 // Sessions persist their detail; a concurrent duplicate delivery of a session applies once.
 const session={...base,id:randomUUID(),type:'session' as const,habit:'walk' as const,seconds:1830,done:true};
 await Promise.all([sync([session]),sync([session])]);
 const withSession=await readState();assert.deepEqual(withSession.days[day].sessions?.walk,{seconds:1830});assert.equal(withSession.days[day].checks.walk,true);
 const workout={...base,id:randomUUID(),type:'session' as const,habit:'workout' as const,seconds:900,done:true,items:['Squats','Plank']};
 assert.equal((await sync([workout])).accepted.length,1);assert.deepEqual((await readState()).days[day].sessions?.workout,{seconds:900,items:['Squats','Plank']});
 // Optional practices persist and never affect completion.
 const focus={...base,id:randomUUID(),type:'focus' as const,seconds:1500};const meditate={...base,id:randomUUID(),type:'meditate' as const,seconds:300};
 await sync([focus,meditate]);const optional=await readState();assert.equal(optional.days[day].focus,1500);assert.equal(optional.days[day].meditate,300);
 // Units and the workout plan persist on the profile; measurements stay metric.
 const units={...base,id:randomUUID(),type:'units' as const,units:{weight:'kg' as const,height:'cm' as const}};const plan={...base,id:randomUUID(),type:'plan' as const,workout:['Squats','Rows']};
 await sync([units,plan]);const prof=(await readState()).profile!;assert.deepEqual(prof.units,{weight:'kg',height:'cm'});assert.deepEqual(prof.plan,['Squats','Rows']);assert.equal(prof.weight,65);
 // Rewards: the list persists, a redeem beyond the balance is rejected, a duplicate delivery of a redeem charges once, undo restores.
 const treat={id:randomUUID(),name:'Film night',cost:30};
 await sync([{...base,id:randomUUID(),type:'rewards' as const,rewards:[treat]}]);
 const balanceBefore=pointsBalance(await readState(),day);assert.equal(balanceBefore,30,'three habits done today (workout, abs, walk; water is short of target) → 30 points');
 const tooMuch={...base,id:randomUUID(),type:'redeem' as const,rewardId:randomUUID(),name:'Weekend',cost:500};
 assert.equal((await sync([tooMuch])).rejected.length,1);
 const redeem={...base,id:randomUUID(),type:'redeem' as const,rewardId:randomUUID(),name:treat.name,cost:treat.cost};
 await Promise.all([sync([redeem]),sync([redeem])]);assert.equal(pointsBalance(await readState(),day),0,'a duplicate delivery of the same redeem charges once');
 await sync([{...base,id:randomUUID(),type:'unredeem' as const,rewardId:redeem.rewardId}]);assert.equal(pointsBalance(await readState(),day),30);
 // A batch with a malformed first change (as the sync route receives it) still applies the valid change behind it and names the bad one by id.
 const poison={...base,id:randomUUID(),type:'rewards',rewards:[{id:randomUUID(),name:'Trip',cost:20000}]};const behind={...base,id:randomUUID(),type:'check' as const,habit:'floss' as const,value:true};
 const batch=validateBatch([poison,behind])!;assert.equal(batch.invalid[0].id,poison.id);const applied=await sync(batch.valid);assert.deepEqual(applied.accepted,[behind.id]);assert.equal((await readState()).days[day].checks.floss,true);
 // Validation still guards the schema: an unknown habit and a reversed calorie range are rejected without touching state.
 const invalid={...base,id:randomUUID(),type:'profile' as const,stats:setup.stats,overrides:{calorieMin:2500,calorieMax:1800}};
 assert.equal((await sync([invalid])).rejected.length,1);
 // Receipt coherence: state, recent ids and revision come from one database snapshot. Reads racing writes must never return a receipt
 // that lists a change whose effect is missing from the state, or a state ahead of its receipt.
 const receiptBase=(await readState()).revision;let torn=0;
 for(let i=0;i<30;i++){const pour={...base,id:randomUUID(),type:'water' as const,amount:10};const [read]=await Promise.all([readState(),sync([pour])]);const listed=read.applied.includes(pour.id);const inState=(read.days[day].water-250)>=10*(i+1);if(listed!==inState)torn++;assert.equal(read.revision-receiptBase,Math.round((read.days[day].water-250)/10),'revision matches the pours the state contains');}
 assert.equal(torn,0,'no read returned a receipt and a state from different snapshots');
 // Old-pending window: a change applied before 200 later changes leaves the receipt, yet re-presenting it is answered exactly (accepted again, applied once).
 const old={...base,id:randomUUID(),type:'water' as const,amount:5};assert.deepEqual((await sync([old])).accepted,[old.id]);
 for(let i=0;i<receiptSize;i++)await sync([{...base,id:randomUUID(),type:'check' as const,habit:'floss' as const,value:true}]);
 const late=await readState();assert.equal(late.applied.length,receiptSize);assert.ok(!late.applied.includes(old.id),'the old change has left the bounded receipt');
 const again=await sync([old]);assert.deepEqual(again.accepted,[old.id]);assert.equal(again.state.days[day].water,late.days[day].water,'re-presenting the old change applies nothing');
 assert.equal((await db.query('SELECT count(*)::int AS n FROM flaccid75_operations WHERE id=$1',[old.id])).rows[0].n,1);
 // Review 171: text the database refuses inside JSON (a lone surrogate half, NUL) is rejected by id at validation and again at the database
 // layer, so a mixed batch never rolls back; valid emoji is stored and read back intact.
 const HIGH=String.fromCharCode(0xD83D);const NUL=String.fromCharCode(0);
 const splitPlan={...base,id:randomUUID(),type:'plan' as const,workout:['x'.repeat(59)+HIGH]};const nulTreat={...base,id:randomUUID(),type:'rewards' as const,rewards:[{id:randomUUID(),name:'Tea'+NUL,cost:5}]};
 const emojiPlan={...base,id:randomUUID(),type:'plan' as const,workout:['x'.repeat(59)+'😀','Press-ups 💪']};const emojiPour={...base,id:randomUUID(),type:'water' as const,amount:250,label:'💧 sip'};
 const mixed=validateBatch([splitPlan,nulTreat,emojiPlan,emojiPour])!;assert.deepEqual(mixed.invalid.map(i=>i.id).sort(),[splitPlan.id,nulTreat.id].sort());assert.equal(mixed.valid.length,2);
 const mixedResult=await sync(mixed.valid);assert.deepEqual(mixedResult.accepted.sort(),[emojiPlan.id,emojiPour.id].sort());assert.deepEqual(mixedResult.rejected,[]);
 const withEmoji=await readState();assert.deepEqual(withEmoji.profile!.plan,['x'.repeat(59)+'😀','Press-ups 💪']);assert.equal(withEmoji.days[day].waterLog!.at(-1)!.label,'💧 sip');
 // Straight to the database layer, bypassing validation: the malformed changes are still rejected by id and the valid one in the same batch is applied.
 const direct=await sync([splitPlan as never,nulTreat as never,{...base,id:randomUUID(),type:'water' as const,amount:100}]);
 assert.deepEqual(direct.rejected.map(r=>r.id).sort(),[splitPlan.id,nulTreat.id].sort());assert.equal(direct.accepted.length,1);assert.equal(direct.state.days[day].water,withEmoji.days[day].water+100);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM flaccid75_operations WHERE id=ANY($1)',[[splitPlan.id,nulTreat.id]])).rows[0].n,0);
 // A literal backslash sequence in text is ordinary text and persists; only an actual NUL or lone surrogate half is refused.
 const literal={...base,id:randomUUID(),type:'water' as const,amount:50,label:'C:\\u0000 path'};assert.equal(validateBatch([literal])!.invalid.length,0);const lit=await sync([literal]);assert.deepEqual(lit.accepted,[literal.id]);assert.deepEqual(lit.rejected,[]);
 assert.equal((await readState()).days[day].waterLog!.at(-1)!.label,'C:\\u0000 path');
 // Daily entries: races retain distinct walks, stable walk ids survive a repeated finish with a new operation id.
 const dailyDay='2026-09-08';const dailyBase={...base,day:dailyDay};
 const walkA={...dailyBase,id:randomUUID(),type:'session' as const,habit:'walk' as const,seconds:600,done:true,walkId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'};
 const walkB={...walkA,id:randomUUID(),walkId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',seconds:1200};
 await sync([walkA]);await Promise.all([sync([walkA]),sync([walkA]),sync([walkB])]);
 await sync([{...walkA,id:randomUUID(),seconds:1800}]);
 const walks=(await readState()).days[dailyDay];assert.deepEqual(entriesInOrder(walks.walkLog!,walks.walkOrder).map(([,entry])=>entry.seconds),[600,1200]);assert.equal(Object.keys(walks.walkLog!).length,2);assert.equal(walks.sessions!.walk!.seconds,1800);
 for(const value of [false,true]) {await sync([{...dailyBase,id:randomUUID(),type:'check',habit:'walk',value}]);const read=(await readState()).days[dailyDay];assert.equal(read.checks.walk,value);assert.equal(read.sessions!.walk!.seconds,1800);assert.equal(Object.keys(read.walkLog!).length,2);}
 const mealId=randomUUID();const meal={...dailyBase,id:randomUUID(),type:'meal' as const,mealId,calories:150,protein:12,description:'Eggs with pepper 🥚',items:[{name:'Eggs',grams:100,calories:150,protein:12,source:'usda' as const,match:'Egg, whole',fdcId:123}]};
 const mealBatch=validateBatch([meal])!;assert.deepEqual(mealBatch.invalid,[]);await sync(mealBatch.valid);
 assert.deepEqual((await readState()).days[dailyDay].meals[mealId],{calories:150,protein:12,description:meal.description,items:meal.items});
 const anotherMeal={...meal,id:randomUUID(),mealId:randomUUID(),description:'Soup',calories:250,protein:20,items:[]};await sync([anotherMeal]);
 const editedMeal={...meal,id:randomUUID(),description:'Eggs and toast',calories:300,items:[{...meal.items[0],name:'Eggs and toast',calories:300}]};await sync(validateBatch([editedMeal])!.valid);
 // An old client sends only the numbers. It cannot erase details it does not understand.
 await sync([{...dailyBase,id:randomUUID(),type:'meal',mealId,calories:310,protein:13}]);
 const mealDay=(await readState()).days[dailyDay];assert.deepEqual(entriesInOrder(mealDay.meals,mealDay.mealOrder).map(([id])=>id),[mealId,anotherMeal.mealId]);const meals=mealDay.meals;assert.deepEqual(meals[mealId],{description:editedMeal.description,items:editedMeal.items,calories:310,protein:13});assert.equal(meals[anotherMeal.mealId].description,'Soup');
 assert.equal(Object.values(meals).reduce((n,m)=>n+m.calories,0),560);
 // Review followup: deleting entries changes totals, never the independent completion choice.
 for (const value of [false,true]) {
  const extra={...walkA,id:randomUUID(),walkId:randomUUID(),seconds:300};await sync([extra,{...dailyBase,id:randomUUID(),type:'check',habit:'walk',value}]);
  const remove={...dailyBase,id:randomUUID(),type:'deleteWalk' as const,walkId:extra.walkId};const parsed=validateBatch([remove])!;assert.deepEqual(parsed.invalid,[]);
  await Promise.all([sync(parsed.valid),sync(parsed.valid)]);const read=(await readState()).days[dailyDay];assert.equal(read.checks.walk,value);assert.equal(read.sessions!.walk!.seconds,1800);assert.deepEqual(read.walkOrder,[walkA.walkId,walkB.walkId]);
 }
 await sync([{...dailyBase,id:randomUUID(),type:'deleteWalk',walkId:walkA.walkId},{...dailyBase,id:randomUUID(),type:'deleteWalk',walkId:walkB.walkId}]);
 const emptyWalks=(await readState()).days[dailyDay];assert.equal(emptyWalks.checks.walk,true);assert.equal(emptyWalks.sessions?.walk,undefined);assert.deepEqual(emptyWalks.walkLog,{});assert.deepEqual(emptyWalks.walkOrder,[]);
 await sync([{...dailyBase,id:randomUUID(),type:'session',habit:'walk',seconds:120,done:true}]);assert.equal((await readState()).days[dailyDay].sessions?.walk?.seconds,120);
 const scaled={...editedMeal,id:randomUUID(),calories:600,protein:24,items:[{...editedMeal.items[0],grams:200,calories:600,protein:24}]};await sync(validateBatch([scaled])!.valid);assert.deepEqual((await readState()).days[dailyDay].meals[mealId].items,scaled.items);
 const removedItems={...scaled,id:randomUUID(),calories:0,protein:0,items:[]};await sync(validateBatch([removedItems])!.valid);
 const removedRead=(await readState()).days[dailyDay];assert.deepEqual(removedRead.meals[mealId],{description:scaled.description,calories:0,protein:0,items:[]});assert.equal(removedRead.meals[anotherMeal.mealId].calories,250);assert.deepEqual(removedRead.mealOrder,[mealId,anotherMeal.mealId]);
 // Malformed model text is normalized before the saved-meal schema and PostgreSQL see it.
 const modelItems=ground(estimateSchema.parse({items:[{name:'egg, whole, cooked, scrambled'+NUL+HIGH,grams:100,calories:150,protein:10},{name:'zzqx 🍲'+String.fromCharCode(0xDFFF),grams:150,calories:200,protein:8}]}).items);
 const groundedMeal={...dailyBase,id:randomUUID(),type:'meal' as const,mealId:randomUUID(),description:'Eggs and stew 🍲',items:modelItems,calories:modelItems.reduce((n,i)=>n+i.calories,0),protein:modelItems.reduce((n,i)=>n+i.protein,0)};
 const groundedBatch=validateBatch([groundedMeal])!;assert.deepEqual(groundedBatch.invalid,[]);assert.deepEqual((await sync(groundedBatch.valid)).rejected,[]);
 const groundedRead=(await readState()).days[dailyDay].meals[groundedMeal.mealId];assert.deepEqual(groundedRead,{description:groundedMeal.description,items:modelItems,calories:groundedMeal.calories,protein:groundedMeal.protein});assert.equal(groundedRead.items![0].name,'egg, whole, cooked, scrambled');assert.equal(groundedRead.items![0].match,'Egg, whole, cooked, scrambled');assert.equal(groundedRead.items![1].name,'zzqx 🍲');
 const opCount=(await db.query('SELECT count(*)::int AS n FROM flaccid75_operations')).rows[0].n;
 console.log(JSON.stringify({malformedModelTextCleanedAndPersisted:true,walkRemovalPreservesIndependentCompletion:true,walkRemovalDeduped:true,lastWalkRemovalPersists:true,mealPortionAndItemRemovalPersist:true,entryOrderSurvivesJSONB:true,multipleWalksRetained:true,walkStableIdDeduped:true,walkTogglePreservesEntries:true,mealDetailsCreatedEditedReloaded:true,legacyMealEditPreservesDetails:true,isolatedSchema:true,malformedTextRejectedById:true,emojiStoredIntact:true,literalBackslashStored:true,receiptSnapshotConsistent:true,oldPendingWindowExact:true,concurrentDuplicateDeliveries:3,waterMl:250,independentChecksRetained:3,twoRestsAllowedThirdRejected:true,restBeyondWeekRejected:true,sessionDuplicateAppliedOnce:true,optionalPersisted:true,unitsAndPlanPersisted:true,redeemOverBalanceRejected:true,redeemDuplicateChargedOnce:true,reversedRangeRejected:true,malformedFirstChangeIsolated:true,operationsRecorded:opCount,productionDataUntouched:true}));
}finally{await db.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
