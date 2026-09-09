import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {cookies} from 'next/headers';
export const cookieName='flaccid75-session';
const digest=(s:string)=>createHash('sha256').update(s).digest();
export function same(a:string,b:string){return timingSafeEqual(digest(a),digest(b));}
export function token(){const expiry=String(Date.now()+180*86400000);return expiry+'.'+sign(expiry);}
function sign(value:string){if(!process.env.SESSION_SECRET)throw new Error('Gate unavailable');return createHmac('sha256',process.env.SESSION_SECRET).update(value).digest('hex');}
export function validToken(value:string){const [expiry,signature]=value.split('.');return !!expiry&&!!signature&&Number(expiry)>Date.now()&&same(signature,sign(expiry));}
export async function authorized(){try{return validToken((await cookies()).get(cookieName)?.value??'');}catch{return false;}}
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function guard(req:Request){if(!sameOrigin(req))return json({error:'Open the app to save changes.'},403);if(!await authorized())return json({error:'Unlock the app to sync.'},401);return null;}
