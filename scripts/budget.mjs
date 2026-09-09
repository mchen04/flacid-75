import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const assets=JSON.parse(await readFile('public/client-assets.json','utf8'));
const total=gzipSync(await readFile('public'+assets.script)).length;
const limit=40*1024;console.log(JSON.stringify({gzipJavaScriptBytes:total,budgetBytes:limit,pass:total<=limit}));if(total>limit)process.exitCode=1;
