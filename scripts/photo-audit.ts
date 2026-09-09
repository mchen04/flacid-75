import {readFile,readdir,stat,writeFile,mkdir} from 'node:fs/promises';
import {watch} from 'node:fs';
import sharp from 'sharp';
import {estimateMeal} from '../lib/estimate';
import {db} from '../lib/db';
const source='https://commons.wikimedia.org/wiki/File:Scrambled_eggs_on_toast_-_Floral_Cafe_2026-02-25.jpg';
const url='https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Scrambled_eggs_on_toast_-_Floral_Cafe_2026-02-25.jpg/960px-Scrambled_eggs_on_toast_-_Floral_Cafe_2026-02-25.jpg';
let bytes:Buffer=Buffer.from(await (await fetch(url.replaceAll('&amp;','&'))).arrayBuffer());bytes=await sharp(bytes).resize({width:1000,withoutEnlargement:true}).jpeg({quality:75}).toBuffer();
let encoded=bytes.toString('base64');const marker=encoded.slice(200,350),binary=Buffer.from(bytes.subarray(200,350));process.env.VERCEL='1';
const dir='/tmp/flaccid75-model-auth';await mkdir(dir,{recursive:true,mode:0o700});const writes=new Set<string>();const watcher=watch(dir,{recursive:true},(_,file)=>{if(file)writes.add(file.toString());});
const before=await db.query('SELECT data FROM flaccid75_state WHERE id=1');const countBefore=(await db.query('SELECT count(*) FROM flaccid75_operations')).rows[0].count;const start=Date.now();
try{const estimate=await estimateMeal({image:encoded});const elapsedMs=Date.now()-start;encoded='';bytes.fill(0);const matches:string[]=[];
 async function scan(root:string){for(const name of await readdir(root)){const path=root+'/'+name;const st=await stat(path);if(st.isDirectory())await scan(path);else if(st.size<20000000){const value=await readFile(path);if(value.includes(marker)||value.includes(binary))matches.push(path);}}}
 await scan(dir);const after=await db.query('SELECT data FROM flaccid75_state WHERE id=1');const countAfter=(await db.query('SELECT count(*) FROM flaccid75_operations')).rows[0].count;
 const audit={source,sourceAuthor:'Andy Li',license:'CC0',input:'Real food photograph downloaded and resized only in RAM',estimate,elapsedMs,appStateUnchanged:JSON.stringify(before.rows)===JSON.stringify(after.rows),operationRowsUnchanged:countBefore===countAfter,modelDirectoryWrites:[...writes],imageMarkerMatches:matches,photoFileWritten:false,objectStoreConfigured:false,scope:'Configuration-directory file watcher and content scan; not a kernel-wide syscall trace. Provider retention not observable.'};await writeFile('evidence/photo-audit.json',JSON.stringify(audit,null,2));console.log(audit);if(matches.length)process.exitCode=1;
}finally{watcher.close();await db.end();}
