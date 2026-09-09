// Serves the production build to a Playwright context through request interception, for sandboxes that forbid listening sockets.
// The shell, manifest and static files come from `.next/` and `public/`; API routes are left to the test's own mocks.
import {readFile} from 'node:fs/promises';
const types={html:'text/html; charset=utf-8',js:'text/javascript',css:'text/css',png:'image/png',svg:'image/svg+xml',webmanifest:'application/manifest+json',json:'application/json'};
export const origin='http://localhost:3075';
export async function install(context){
 await context.route(`${origin}/**`,async route=>{
  const url=new URL(route.request().url());if(url.pathname.startsWith('/api/'))return route.fallback();
  try{
   if(url.pathname==='/')return route.fulfill({status:200,contentType:types.html,body:await readFile('.next/server/app/index.body')});
   if(url.pathname==='/manifest.webmanifest')return route.fulfill({status:200,contentType:types.webmanifest,body:await readFile('.next/server/app/manifest.webmanifest.body')});
   const ext=url.pathname.split('.').pop();return route.fulfill({status:200,contentType:types[ext]??'application/octet-stream',body:await readFile('public'+url.pathname)});
  }catch{return route.fulfill({status:404,body:'not found'});}
 });
}
