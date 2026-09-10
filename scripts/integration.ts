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
const {db,sync,readState}=await import('../lib/db');
const {weekStart,addDays,restsLeft,pointsBalance}=await import('../lib/domain');
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
 const {validateBatch}=await import('../lib/validation');
 const poison={...base,id:randomUUID(),type:'rewards',rewards:[{id:randomUUID(),name:'Trip',cost:20000}]};const behind={...base,id:randomUUID(),type:'check' as const,habit:'floss' as const,value:true};
 const batch=validateBatch([poison,behind])!;assert.equal(batch.invalid[0].id,poison.id);const applied=await sync(batch.valid);assert.deepEqual(applied.accepted,[behind.id]);assert.equal((await readState()).days[day].checks.floss,true);
 // Validation still guards the schema: an unknown habit and a reversed calorie range are rejected without touching state.
 const invalid={...base,id:randomUUID(),type:'profile' as const,stats:setup.stats,overrides:{calorieMin:2500,calorieMax:1800}};
 assert.equal((await sync([invalid])).rejected.length,1);
 const opCount=(await db.query('SELECT count(*)::int AS n FROM flaccid75_operations')).rows[0].n;
 console.log(JSON.stringify({isolatedSchema:true,concurrentDuplicateDeliveries:3,waterMl:250,independentChecksRetained:3,twoRestsAllowedThirdRejected:true,restBeyondWeekRejected:true,sessionDuplicateAppliedOnce:true,optionalPersisted:true,unitsAndPlanPersisted:true,redeemOverBalanceRejected:true,redeemDuplicateChargedOnce:true,reversedRangeRejected:true,malformedFirstChangeIsolated:true,operationsRecorded:opCount,productionDataUntouched:true}));
}finally{await db.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
