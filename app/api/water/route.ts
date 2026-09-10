import {guard,json} from '@/lib/auth';
import {rateLimit} from '@/lib/db';
import {extractWater} from '@/lib/estimate';
export const runtime='nodejs';
export const maxDuration=30;
// The model only names the container and the share. The client multiplies; no volume ever comes from the model.
export async function POST(req:Request){const denied=await guard(req);if(denied)return denied;
 try{
  if(!await rateLimit('water',60,3600))return json({error:'Water lookups are resting for this hour.'},429);
  const body=await req.json();const text=typeof body.text==='string'?body.text.trim():'';const containers=Array.isArray(body.containers)?body.containers.filter((c:unknown)=>typeof c==='string').slice(0,12):[];
  if(!text||text.length>200)return json({error:'Say how much you drank.'},400);
  return json(await extractWater(text,containers,req.signal));
 }catch{return json({error:'That could not be read right now.'},503);}
}
