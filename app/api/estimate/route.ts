import {guard,json} from '@/lib/auth';
import {rateLimit} from '@/lib/db';
import {estimateMeal} from '@/lib/estimate';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(req:Request){const denied=await guard(req);if(denied)return denied;
 try{
  if(!await rateLimit('estimate',40,3600))return json({error:'Estimates are resting for this hour.'},429);
  if(Number(req.headers.get('content-length'))>2500000)return json({error:'That photo is too large.'},413);
  const body=await req.json();const text=typeof body.text==='string'?body.text.trim():'';const image=typeof body.image==='string'?body.image:undefined;
  if(text.length>1000||image&&(!/^[A-Za-z0-9+/]+=*$/.test(image)||image.length>2000000)||!text&&!image)return json({error:'Add a meal description or a clear photo.'},400);
  const input={text,image};body.image=undefined;body.text=undefined;
  return json(await estimateMeal(input,req.signal));
 }catch{return json({error:'Claude could not estimate this meal right now.'},503);}
}
