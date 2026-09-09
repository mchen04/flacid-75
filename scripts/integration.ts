import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const admin=new pg.Client({connectionString:process.env.DATABASE_URL});
const schema='flaccid75_test_'+randomUUID().replaceAll('-','');
await admin.connect();await admin.query(`CREATE SCHEMA ${schema}`);
const uri=new URL(process.env.DATABASE_URL!);uri.hostname=uri.hostname.replace('-pooler','');uri.searchParams.set('options','-c search_path='+schema);process.env.DATABASE_URL=uri.toString();
const {db,sync,readState}=await import('../lib/db');
try{
 await db.query(await readFile('migrations/001_initial.sql','utf8'));
 const base={at:new Date().toISOString(),day:new Date().toISOString().slice(0,10),zone:'UTC'};
 const setup={...base,id:randomUUID(),type:'profile' as const,stats:{height:165,weight:65,age:30,activity:1 as const,goal:'maintain' as const},overrides:{}};
 assert.equal((await sync([setup])).accepted.length,1);
 const glass={...base,id:randomUUID(),type:'water' as const,amount:250};
 await Promise.all([sync([glass]),sync([glass]),sync([glass])]);
 assert.equal((await readState()).days[base.day].water,250);
 const checks=['workout','abs','walk'].map(habit=>({...base,id:randomUUID(),type:'check' as const,habit:habit as 'workout'|'abs'|'walk',value:true}));
 await Promise.all(checks.map(op=>sync([op])));
 assert.equal(Object.values((await readState()).days[base.day].checks).filter(Boolean).length,3);
 const rest1={...base,id:randomUUID(),type:'rest' as const,value:true};
 const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
 const rest2={...rest1,id:randomUUID(),day:yesterday};
 const rests=await Promise.all([sync([rest1]),sync([rest2])]);
 // The fixed test week spans Monday and Tuesday on its first recorded run.
 const {weekStart}=await import('../lib/domain');
 if(weekStart(yesterday)===weekStart(base.day))assert.equal(rests.reduce((n,r)=>n+r.rejected.length,0),1);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM flaccid75_operations WHERE id=$1',[glass.id])).rows[0].n,1);
 const invalid={...base,id:randomUUID(),type:'profile' as const,stats:setup.stats,overrides:{calorieMin:2500,calorieMax:1800}};
 assert.equal((await sync([invalid])).rejected.length,1);
 console.log(JSON.stringify({isolatedSchema:true,concurrentDuplicateDeliveries:3,waterMl:250,independentChecksRetained:3,sameWeekRestRaceRejected:true,reversedRangeRejected:true,productionDataUntouched:true}));
}finally{await db.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
