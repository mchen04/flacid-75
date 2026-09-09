import {authorized,json} from '@/lib/auth';
import {readState} from '@/lib/db';
export async function GET(){if(!await authorized())return json({error:'Unlock the app to sync.'},401);try{return json(await readState());}catch{return json({error:'Your saved changes are safe. Sync will retry.'},503);}}
