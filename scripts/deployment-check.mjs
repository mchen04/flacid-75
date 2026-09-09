import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const base=(await readFile('evidence/preview-url.txt','utf8')).trim();
const vars=Object.fromEntries((await readFile('.env.local','utf8')).split('\n').filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
const negative={};
for(const route of ['/api/state','/api/sync','/api/estimate']){
 const res=await fetch(base+route,route==='/api/state'?{}:{method:'POST',headers:{origin:base,'content-type':'application/json'},body:route==='/api/sync'?'[]':'{}'});
 negative[route]=res.status;assert.equal(res.status,401);
}
const login=await fetch(base+'/api/auth',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({passphrase:vars.APP_PASSPHRASE})});assert.equal(login.status,200);
const cookie=login.headers.get('set-cookie').split(';')[0];
const state=await(await fetch(base+'/api/state',{headers:{cookie}})).json();assert.equal(state.profile,null);
const csrf=await fetch(base+'/api/sync',{method:'POST',headers:{cookie,origin:'https://example.com','content-type':'application/json'},body:'[]'});assert.equal(csrf.status,403);
const html=await(await fetch(base)).text();const manifest=JSON.parse(await readFile('public/client-assets.json','utf8'));assert.ok(html.includes(manifest.script));
const client=Buffer.from(await(await fetch(base+manifest.script)).arrayBuffer());assert.ok(client.equals(await readFile('public'+manifest.script)));
const result={url:base,unauthenticated:negative,authenticatedGate:login.status,crossOriginWrite:csrf.status,accountUnconfigured:state.profile===null,deployedClientMatchesVerifiedBuild:true};
await writeFile('evidence/deployment-check.json',JSON.stringify(result,null,2));console.log(result);
