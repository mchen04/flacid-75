import {guard,json} from '@/lib/auth';
import {rateLimit} from '@/lib/db';
import {estimateMeal,NotFood} from '@/lib/estimate';
import {chars,limits} from '@/lib/bounds';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(req:Request){const denied=await guard(req);if(denied)return denied;
 try{
  if(!await rateLimit('estimate',60,3600))return json({error:'Estimates are resting for this hour.'},429);
  if(Number(req.headers.get('content-length'))>2500000)return json({error:'That photo is too large.'},413);
  const body=await req.json();const text=typeof body.text==='string'?body.text.trim():'';const image=typeof body.image==='string'?body.image:undefined;
  if(chars(text)>limits.mealDescription)return json({error:'That description is too long. Use 1,000 characters or fewer.'},400);
  if(image&&(!/^[A-Za-z0-9+/]+=*$/.test(image)||image.length>2000000)||!text&&!image)return json({error:'Describe the meal or add a clear photo.'},400);
  const input={text,image};body.image=undefined;body.text=undefined;
  return json(await estimateMeal(input,req.signal));
 }catch(error){if(error instanceof NotFood)return json({error:'That does not look like food.'},422);return json({error:'That could not be looked up right now.'},503);}
}
