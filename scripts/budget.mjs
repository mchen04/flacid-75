import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
// Two numbers, both bounded. The critical path is the entry plus every chunk reached from it through static imports, transitively
// (everything the browser must load before the first paint); it keeps the original 40 KiB budget. Total JavaScript, including the
// lazily loaded page chunks (prefetched after the first paint and cached by the service worker), has its own ceiling so growth stays
// visible and bounded. Neither limit is relaxed silently.
const assets=JSON.parse(await readFile('public/client-assets.json','utf8'));
const read=p=>readFile('public'+p,'utf8');
const size=async p=>gzipSync(await readFile('public'+p)).length;
// Static imports: `from"./chunk-X.js"` and side-effect `import"./chunk-X.js"`. Dynamic `import("./chunk-X.js")` is lazy and excluded.
const staticImports=code=>[...code.matchAll(/(?:from|import)\s*"\.\/(chunk-[A-Za-z0-9]+\.js)"/g)].map(m=>'/assets/'+m[1]);
const critical=[assets.script];
for(let i=0;i<critical.length;i++)for(const dep of staticImports(await read(critical[i])))if(!critical.includes(dep))critical.push(dep);
const lazyChunks=(assets.chunks??[]).filter(c=>!critical.includes(c));
const criticalBytes=(await Promise.all(critical.map(size))).reduce((a,b)=>a+b,0);
const lazy=Object.fromEntries(await Promise.all(lazyChunks.map(async c=>[c,await size(c)])));
const total=criticalBytes+Object.values(lazy).reduce((a,b)=>a+b,0);
const limit=40*1024,totalLimit=64*1024;
console.log(JSON.stringify({gzipJavaScriptBytes:criticalBytes,budgetBytes:limit,pass:criticalBytes<=limit&&total<=totalLimit,criticalPath:critical,lazyChunkGzipBytes:lazy,totalGzipJavaScriptBytes:total,totalBudgetBytes:totalLimit}));
if(criticalBytes>limit||total>totalLimit)process.exitCode=1;
