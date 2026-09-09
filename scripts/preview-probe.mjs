import{readFile,writeFile}from'node:fs/promises';
const url=(await readFile('evidence/preview-url.txt','utf8')).trim();
const env=Object.fromEntries((await readFile('.env.local','utf8')).split('\n').filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
const login=await fetch(url+'/api/auth',{method:'POST',headers:{origin:url,'content-type':'application/json'},body:JSON.stringify({passphrase:env.APP_PASSPHRASE})});
const cookie=login.headers.get('set-cookie')?.split(';')[0];console.log('Preview gate',login.status);
if(cookie){const start=Date.now();const res=await fetch(url+'/api/estimate',{method:'POST',headers:{origin:url,'content-type':'application/json',cookie},body:JSON.stringify({text:'two eggs and one slice of toast'})});const estimate=await res.json();const result={gateStatus:login.status,estimateStatus:res.status,estimate,elapsedMs:Date.now()-start};await writeFile('evidence/preview-estimate.json',JSON.stringify(result,null,2));console.log(result);}
