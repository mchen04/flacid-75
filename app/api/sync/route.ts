import {guard,json} from '@/lib/auth';
import {sync,readState} from '@/lib/db';
import {validateBatch} from '@/lib/validation';
export async function POST(req:Request){const denied=await guard(req);if(denied)return denied;try{if(Number(req.headers.get('content-length'))>100000)return json({error:'Too many changes at once.'},413);
 // Each change is validated on its own. Malformed ones come back in `rejected` (so the device sets them aside); the rest still apply.
 const batch=validateBatch(await req.json());if(!batch)return json({error:'A batch must be 1 to 100 changes.'},400);
 const result=batch.valid.length?await sync(batch.valid):{state:await readState(),accepted:[] as string[],rejected:[] as {id:string;reason:string}[]};
 return json({...result,rejected:[...result.rejected,...batch.invalid]});}catch{return json({error:'Sync is unavailable. Changes stay on this device.'},503);}}
