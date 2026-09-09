import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {arch} from 'node:os';
import assert from 'node:assert/strict';
const traceArgs=['-f','-yy','-s','0','-e','trace=%file,write,writev,pwrite64,pwritev,pwritev2,close','-o'];
const controlMarker='synthetic-privacy-control-923157';
const control=spawnSync('/tmp/tools/usr/bin/strace',[...traceArgs,'/tmp/control.trace','node','-e',"const fs=require('fs');fs.writeFileSync('/tmp/control-write',process.env.CONTROL_MARKER);fs.unlinkSync('/tmp/control-write')"],{env:{...process.env,CONTROL_MARKER:controlMarker}});
assert.equal(control.status,0,'Trace control must run');
const controlTrace=readFileSync('/tmp/control.trace','utf8');
assert.match(controlTrace,/\bwrite\(\d+<\/tmp\/control-write>/);
assert.match(controlTrace,/\bunlink(?:at)?\([^\n]*"\/tmp\/control-write"/);
assert.ok(!controlTrace.includes(controlMarker),'Tracer must suppress write buffers');
mkdirSync('evidence',{recursive:true});
const run=spawnSync('/tmp/tools/usr/bin/strace',[...traceArgs,'/tmp/photo-syscalls.trace','node','--import','tsx','scripts/photo-audit.ts'],{maxBuffer:8*1024*1024});
const trace=readFileSync('/tmp/photo-syscalls.trace','utf8');
for(const name of ['DATABASE_URL','APP_PASSPHRASE','SESSION_SECRET']){
 const value=process.env[name];
 assert.ok(!value||![run.stdout,run.stderr,Buffer.from(trace)].some(b=>b?.includes(value)),'Sensitive output detected; raw output withheld');
}
if(run.status!==0){console.log(JSON.stringify({estimatorExit:run.status,rawOutputWithheld:true}));process.exit(1);}
const lines=trace.split('\n');
const mutations=lines.filter(line=>/\b(write|writev|pwrite64|pwritev|pwritev2|unlink|unlinkat|rename|renameat|renameat2|mkdir|mkdirat)\(/.test(line)||(/open/.test(line)&&/O_WRONLY|O_RDWR|O_CREAT|O_TRUNC/.test(line)));
const paths=[...new Set(mutations.flatMap(line=>{const match=line.match(/\b(?:write|writev|pwrite64|pwritev|pwritev2)\(\d+<(\/[^>]+)>/);return match?[match[1]]:[]}))].sort();
const audit=JSON.parse(readFileSync('evidence/photo-audit.json','utf8'));
const result={platform:arch(),realClaudeEstimate:audit.estimate,elapsedMsWithTracing:audit.elapsedMs,descendantProcessesTraced:true,deletedSyntheticFileControlDetected:true,syntheticWriteBufferSuppressed:true,fileWritePaths:paths,imageMarkerMatches:audit.imageMarkerMatches,contentScanControlDetected:audit.contentScanControlDetected,databaseStateUnchanged:audit.appStateUnchanged,operationRowsUnchanged:audit.operationRowsUnchanged,traceLines:lines.length,scope:'Linux Node process and SDK descendants, file calls and write-family calls. Buffers suppressed. Final model-directory files scanned for image markers. Deleted-file contents and provider retention are not inspected. This is a local container with temporary memory storage, not Vercel host instrumentation.'};
writeFileSync('/out/photo-process-trace.json',JSON.stringify(result,null,2)+'\n');
writeFileSync('/out/photo-syscalls.txt.gz',gzipSync(trace));
writeFileSync('/out/photo-write-calls.txt',mutations.join('\n')+'\n');
console.log(JSON.stringify(result));
