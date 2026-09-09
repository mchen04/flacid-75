import {readFile,readdir,stat,writeFile,mkdir,rm} from 'node:fs/promises';
import {watch} from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {estimateMeal} from '../lib/estimate';
import {db} from '../lib/db';

async function markerMatches(root:string,markers:(string|Buffer)[]):Promise<string[]>{
 const matches:string[]=[];
 for(const name of await readdir(root)){
  const path=root+'/'+name;
  const entry=await stat(path);
  if(entry.isDirectory())matches.push(...await markerMatches(path,markers));
  else if(entry.size<20000000){
   const value=await readFile(path);
   if(markers.some(marker=>value.includes(marker)))matches.push(path);
  }
 }
 return matches;
}

const source='https://commons.wikimedia.org/wiki/File:Scrambled_eggs_on_toast_-_Floral_Cafe_2026-02-25.jpg';
const url='https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Scrambled_eggs_on_toast_-_Floral_Cafe_2026-02-25.jpg/960px-Scrambled_eggs_on_toast_-_Floral_Cafe_2026-02-25.jpg';
const dir='/tmp/flaccid75-model-auth';
await mkdir(dir,{recursive:true,mode:0o700});
// Prove the same content scanner detects a file, using text unrelated to the photo.
const controlPath=dir+'/.synthetic-privacy-control';
const controlMarker='synthetic-privacy-control-923157';
await writeFile(controlPath,controlMarker);
try{assert.deepEqual(await markerMatches(dir,[controlMarker]),[controlPath]);}
finally{await rm(controlPath,{force:true});}
assert.deepEqual(await markerMatches(dir,[controlMarker]),[]);

let bytes:Buffer=Buffer.from(await (await fetch(url)).arrayBuffer());
bytes=await sharp(bytes).resize({width:1000,withoutEnlargement:true}).jpeg({quality:75}).toBuffer();
let encoded=bytes.toString('base64');
const marker=encoded.slice(200,350),binary=Buffer.from(bytes.subarray(200,350));
process.env.VERCEL='1';
const writes=new Set<string>();
const watcher=watch(dir,{recursive:true},(_,file)=>{if(file)writes.add(file.toString());});
try{
 const before=await db.query('SELECT data FROM flaccid75_state WHERE id=1');
 const countBefore=(await db.query('SELECT count(*) FROM flaccid75_operations')).rows[0].count;
 const start=Date.now();
 const estimate=await estimateMeal({image:encoded});
 const elapsedMs=Date.now()-start;
 encoded='';bytes.fill(0);
 const matches=await markerMatches(dir,[marker,binary]);
 const after=await db.query('SELECT data FROM flaccid75_state WHERE id=1');
 const countAfter=(await db.query('SELECT count(*) FROM flaccid75_operations')).rows[0].count;
 const audit={source,sourceAuthor:'Andy Li',license:'CC0',input:'Real food photograph downloaded and resized only in RAM',estimate,elapsedMs,appStateUnchanged:JSON.stringify(before.rows)===JSON.stringify(after.rows),operationRowsUnchanged:countBefore===countAfter,modelDirectoryWrites:[...writes],contentScanControlDetected:true,imageMarkerMatches:matches,photoFileWritten:'Not observed in scanned files',objectStoreConfigured:false,scope:'Configuration-directory file watcher and content scan, including a synthetic detection control. Files over 20 MB and deleted-file contents are not scanned. Provider retention not observable.'};
 await writeFile('evidence/photo-audit.json',JSON.stringify(audit,null,2));
 console.log(audit);
 assert.equal(matches.length,0);
 assert.ok(audit.appStateUnchanged&&audit.operationRowsUnchanged);
}finally{
 encoded='';bytes.fill(0);binary.fill(0);
 watcher.close();await db.end();
}
