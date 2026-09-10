// Every chunk must be reachable offline: listed in the shell's prefetch links, matched by the service worker's install scan, and
// versioned so an updated chunk ships with a new cache. Fails the build otherwise.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const assets=JSON.parse(await readFile('public/client-assets.json','utf8'));
const html=await readFile('.next/server/app/index.body','utf8');
const sw=await readFile('public/sw.js','utf8');
// The exact scan the service worker runs at install (scripts/sw-template.js).
const scanned=[...new Set([...html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css)(?:\?[^" ]*)?)"/g)].map(m=>m[1]))].filter(x=>x.startsWith('/assets/'));
for(const c of [assets.script,...assets.chunks])assert.ok(scanned.includes(c),`${c} is not in the shell, so the service worker would not cache it`);
assert.ok(sw.includes(`flaccid75-shell-${assets.version}`),'the service worker cache name does not carry this build');
const all=await Promise.all([assets.script,...assets.chunks].map(async p=>{const code=await readFile('public'+p,'utf8');return [...code.matchAll(/["']\.\/(chunk-[A-Za-z0-9]+\.js)["']/g)].map(m=>'/assets/'+m[1]);}));
for(const dep of all.flat())assert.ok(assets.chunks.includes(dep),`${dep} is imported but not listed`);
console.log(JSON.stringify({shellPrefetches:scanned.length,chunks:assets.chunks.length,version:assets.version,allCached:true}));
