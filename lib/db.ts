import {Pool} from 'pg';
import {apply,type State,type Operation,computeTargets} from './domain';
const globalDb=globalThis as unknown as {flaccidPool?:Pool};
export const db=globalDb.flaccidPool??=new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:10000});
export async function readState():Promise<State>{return (await db.query('SELECT data FROM flaccid75_state WHERE id=1')).rows[0].data;}
export async function sync(ops:Operation[]){
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  let state:State=(await client.query('SELECT data FROM flaccid75_state WHERE id=1 FOR UPDATE')).rows[0].data;
  const accepted:string[]=[],rejected:{id:string;reason:string}[]=[];
  for(const op of ops){
   if((await client.query('SELECT id FROM flaccid75_operations WHERE id=$1',[op.id])).rowCount){accepted.push(op.id);continue;}
   try{
    if(Date.parse(op.at)>Date.now()+300000)throw new Error('Your device clock is ahead.');
    if(op.type==='profile'){const t={...computeTargets(op.stats),...op.overrides};if(t.calorieMin>t.calorieMax)throw new Error('The calorie range is reversed.');}
    const next=apply(state,op);
    await client.query('INSERT INTO flaccid75_operations(id,occurred_at,kind,day) VALUES($1,$2,$3,$4)',[op.id,op.at,op.type,op.day]);state=next;accepted.push(op.id);
   }catch(error){if(error instanceof Error&&('code' in error))throw error;rejected.push({id:op.id,reason:error instanceof Error?error.message:'Unable to save this change.'});}
  }
  await client.query('UPDATE flaccid75_state SET data=$1,updated_at=now() WHERE id=1',[JSON.stringify(state)]);
  await client.query('COMMIT');return {state,accepted,rejected};
 }catch{await client.query('ROLLBACK');throw new Error('Sync is unavailable. Your changes stay on this device.');}finally{client.release();}
}
export async function rateLimit(key:string,limit:number,seconds:number){
 const {rows}=await db.query(`INSERT INTO flaccid75_rate_limits(key,count,resets_at) VALUES($1,1,now()+($2*interval '1 second')) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN flaccid75_rate_limits.resets_at<now() THEN 1 ELSE flaccid75_rate_limits.count+1 END,resets_at=CASE WHEN flaccid75_rate_limits.resets_at<now() THEN now()+($2*interval '1 second') ELSE flaccid75_rate_limits.resets_at END RETURNING count`,[key,seconds]);
 return rows[0].count<=limit;
}
