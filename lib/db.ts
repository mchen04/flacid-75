import {Pool} from 'pg';
import {apply,type State,type Operation,computeTargets} from './domain';
const globalDb=globalThis as unknown as {flaccidPool?:Pool};
export const db=globalDb.flaccidPool??=new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:10000});
// A receipt travels with every answer: the ids of the most recently applied changes and the revision (how many changes the account has
// applied in all). A device uses the ids to tell a change it still holds as pending from one the account already applied, whatever
// order the answers arrive in, and the revision to refuse an answer older than the state it already holds. Both are bounded.
export const receiptSize=200;
export type Receipt={applied:string[];revision:number};
// One statement, so the state, the recent ids and the count come from one database snapshot; inside `sync` it runs under the row lock.
const READ=`SELECT s.data, (SELECT count(*)::int FROM flaccid75_operations) AS n, (SELECT coalesce(array_agg(id ORDER BY received_at DESC, id DESC),'{}') FROM (SELECT id,received_at FROM flaccid75_operations ORDER BY received_at DESC, id DESC LIMIT $1) recent) AS applied FROM flaccid75_state s WHERE s.id=1`;
type Row={data:State;n:number;applied:string[]};
async function readAll(q:{query:(text:string,values?:unknown[])=>Promise<{rows:Row[]}>}):Promise<{state:State}&Receipt>{const row=(await q.query(READ,[receiptSize])).rows[0];return {state:row.data,applied:(row.applied??[]).map(String),revision:Number(row.n)||0};}
export async function readState():Promise<State&Receipt>{const {state,applied,revision}=await readAll(db);return {...state,applied,revision};}
// Every string value in the change, wherever it sits, must be well-formed and free of an actual NUL; escapes in the text itself (a literal backslash-u) are ordinary characters.
const cleanText=(v:unknown):boolean=>typeof v==='string'?v.isWellFormed()&&!v.includes(String.fromCharCode(0)):Array.isArray(v)?v.every(cleanText):v!==null&&typeof v==='object'?Object.values(v as Record<string,unknown>).every(cleanText):true;
const storable=(op:Operation)=>cleanText(op);
export async function sync(ops:Operation[]){
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  let state:State=(await client.query('SELECT data FROM flaccid75_state WHERE id=1 FOR UPDATE')).rows[0].data;
  const accepted:string[]=[],rejected:{id:string;reason:string}[]=[];
  for(const op of ops){
   // Defence at the last step before storage: text PostgreSQL refuses inside JSON (a lone surrogate half or NUL) rejects this change by id, so it can never roll back the batch.
   if(!storable(op)){rejected.push({id:op.id,reason:'A change was refused: text must be well-formed without NUL.'});continue;}
   if((await client.query('SELECT id FROM flaccid75_operations WHERE id=$1',[op.id])).rowCount){accepted.push(op.id);continue;}
   try{
    if(Date.parse(op.at)>Date.now()+300000)throw new Error('Your device clock is ahead.');
    if(op.type==='profile'){const t={...computeTargets(op.stats),...op.overrides};if(t.calorieMin>t.calorieMax)throw new Error('The calorie range is reversed.');}
    const next=apply(state,op);
    await client.query('INSERT INTO flaccid75_operations(id,occurred_at,kind,day) VALUES($1,$2,$3,$4)',[op.id,op.at,op.type,op.day]);state=next;accepted.push(op.id);
   }catch(error){if(error instanceof Error&&('code' in error))throw error;rejected.push({id:op.id,reason:error instanceof Error?error.message:'Unable to save this change.'});}
  }
  await client.query('UPDATE flaccid75_state SET data=$1,updated_at=now() WHERE id=1',[JSON.stringify(state)]);
  const {applied,revision}=await readAll(client);
  await client.query('COMMIT');return {state,accepted,rejected,applied,revision};
 }catch{await client.query('ROLLBACK');throw new Error('Sync is unavailable. Your changes stay on this device.');}finally{client.release();}
}
export async function rateLimit(key:string,limit:number,seconds:number){
 const {rows}=await db.query(`INSERT INTO flaccid75_rate_limits(key,count,resets_at) VALUES($1,1,now()+($2*interval '1 second')) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN flaccid75_rate_limits.resets_at<now() THEN 1 ELSE flaccid75_rate_limits.count+1 END,resets_at=CASE WHEN flaccid75_rate_limits.resets_at<now() THEN now()+($2*interval '1 second') ELSE flaccid75_rate_limits.resets_at END RETURNING count`,[key,seconds]);
 return rows[0].count<=limit;
}
