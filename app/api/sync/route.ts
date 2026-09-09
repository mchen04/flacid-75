import {guard,json} from '@/lib/auth';
import {sync} from '@/lib/db';
import {operationsSchema} from '@/lib/validation';
export async function POST(req:Request){const denied=await guard(req);if(denied)return denied;try{if(Number(req.headers.get('content-length'))>100000)return json({error:'Too many changes at once.'},413);const parsed=operationsSchema.safeParse(await req.json());if(!parsed.success)return json({error:'A change has invalid values.'},400);return json(await sync(parsed.data));}catch{return json({error:'Sync is unavailable. Changes stay on this device.'},503);}}
