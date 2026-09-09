// The mascot is retired. No source, asset, script, test or manifest may mention it, and no mascot art file may remain.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const files=execFileSync('git',['ls-files'],{encoding:'utf8'}).split('\n').filter(f=>f&&!f.startsWith('evidence/')&&!['package-lock.json','lib/foods.json','scripts/mascot-scan.mjs'].includes(f));
const hits=[];
for(const file of files){if(/pip|penguin|mascot/i.test(file)){hits.push({file,reason:'file name'});continue;}
 const text=readFileSync(file);if(text.includes(0)&&!/\.(svg|md|txt)$/.test(file))continue;
 const lines=text.toString('utf8').split('\n');lines.forEach((l,i)=>{if(/\bpip\b|penguin|mascot/i.test(l)&&!/retired|removed|no mascot|gone|mascot-scan/i.test(l))hits.push({file,line:i+1,text:l.trim().slice(0,120)});});}
writeFileSync('evidence/v3/mascot-scan.json',JSON.stringify({scanned:files.length,hits},null,2));
console.log(JSON.stringify({scanned:files.length,hits:hits.length}));if(hits.length){console.log(hits);process.exitCode=1;}
