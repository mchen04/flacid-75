import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {mkdir,writeFile,readFile,chmod} from 'node:fs/promises';
import {db} from './db';
function key(){return createHash('sha256').update(process.env.SESSION_SECRET!).digest();}
export function seal(value:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64');}
function unseal(value:string){const bytes=Buffer.from(value,'base64'),decipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));return Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8');}
export async function withModelAuth<T>(run:(configDir?:string)=>Promise<T>):Promise<T>{
 if(!process.env.VERCEL)return run();
 const client=await db.connect();
 try{
  await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='3s'");
  const {rows}=await client.query('SELECT encrypted FROM flaccid75_model_auth WHERE id=1 FOR UPDATE');
  if(!rows.length)throw new Error('Model sign-in missing');
  const directory='/tmp/flaccid75-model-auth';await mkdir(directory,{recursive:true,mode:0o700});await chmod(directory,0o700);
  const original=unseal(rows[0].encrypted);await writeFile(directory+'/.credentials.json',original,{mode:0o600});
  try{return await run(directory);}finally{
   const current=await readFile(directory+'/.credentials.json','utf8');
   if(current!==original)await client.query('UPDATE flaccid75_model_auth SET encrypted=$1,updated_at=now() WHERE id=1',[seal(current)]);
   await client.query('COMMIT');
  }
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
