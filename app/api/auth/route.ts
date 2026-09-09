import {cookies} from 'next/headers';
import {same,sameOrigin,token,cookieName,json} from '@/lib/auth';
import {rateLimit} from '@/lib/db';
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Open the app to unlock it.'},403);
 try{
  if(!process.env.APP_PASSPHRASE||!process.env.SESSION_SECRET)return json({error:'The private gate needs setup.'},503);
  if(!await rateLimit('login',20,900))return json({error:'Too many tries. Try again in 15 minutes.'},429);
  if(Number(req.headers.get('content-length'))>1024)return json({error:'Passphrase is too long.'},400);
  const {passphrase}=await req.json();
  if(typeof passphrase!=='string'||passphrase.length>256||!same(passphrase,process.env.APP_PASSPHRASE))return json({error:'That passphrase does not match.'},401);
  (await cookies()).set(cookieName,token(),{httpOnly:true,secure:new URL(req.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:180*86400});
  return json({ok:true});
 }catch{return json({error:'Unlock is unavailable. Please try again.'},503);}
}
export async function DELETE(req:Request){if(!sameOrigin(req))return json({error:'Invalid origin'},403);(await cookies()).delete(cookieName);return json({ok:true});}
