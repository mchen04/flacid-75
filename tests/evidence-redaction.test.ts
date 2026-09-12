import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {redactTestOutput} from '../scripts/redact-test-output.mjs';
function exposed(text:string) {
 if (/textbox [^\n]*Passphrase[^\n]*: (?!<test-only>)[^\s]/.test(text)) return true;
 if ([...text.matchAll(/\bGate:\s*fill\s+@\w+\s+(\S+)/g)].some(m=>m[1]!=='<test-only>;')) return true;
 return [...text.matchAll(/(?<![\w'"])\b(?:APP_PASSPHRASE|SESSION_SECRET)=(?:'([^']*)'|"([^"]*)"|([^\s`]+))/g)]
  .some(m=>(m[1]??m[2]??m[3])!=='<test-only>');
}
test('evidence redaction detects unredacted credentials without reporting values',()=>{
 assert.equal(exposed('# Gate: fill @e3 synthetic-negative-control; click @e2;'),true);
 assert.equal(exposed('# Gate: fill @e3 <test-only>; click @e2;'),false);
 for(const key of ['APP_PASSPHRASE','SESSION_SECRET']) {
  assert.equal(exposed(`${key}=synthetic-negative-control`),true);
  assert.equal(exposed(`${key}='synthetic-negative-control'`),true);
  assert.equal(exposed(`${key}="synthetic-negative-control"`),true);
  assert.equal(exposed(`${key}='<test-only>'`),false);
 }
});
test('followup evidence uses placeholders for test credentials',()=>{
 const failures:string[]=[];
 function scan(dir:string) {for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())scan(path);else if(/\.(md|txt|json|log|ts|mjs)$/.test(entry.name)&&exposed(readFileSync(path,'utf8')))failures.push(path);}}
 scan('evidence/local-followup');scan('evidence/review-r1');scan('evidence/review-r2');scan('evidence/review-r3');scan('evidence/review-r4');scan('evidence/review-r5');
 assert.deepEqual(failures,[],'redact credential assignments in the listed files');
});

test('test output redacts raw values in browser failure snapshots and secret assignments',()=>{
 assert.equal(exposed("text.startsWith('APP_PASSPHRASE=')"),false);
 const values=['synthetic-passphrase-control','synthetic-session-control'];
 const raw=`textbox "Passphrase": ${values[0]}\nAPP_PASSPHRASE='${values[0]}' SESSION_SECRET='${values[1]}'`;
 assert.equal(exposed(raw),true);const redacted=redactTestOutput(raw,values);
 assert.equal(exposed(redacted),false);for(const value of values)assert.equal(redacted.includes(value),false);
});
