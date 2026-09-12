import {mkdtempSync,cpSync,symlinkSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const scratch=mkdtempSync(join(tmpdir(),'flacid-timer-mutation-'));
try {
 cpSync('lib',join(scratch,'lib'),{recursive:true});cpSync('tests/sessions.test.ts',join(scratch,'sessions.test.ts'));
 writeFileSync(join(scratch,'sessions.test.ts'),readFileSync(join(scratch,'sessions.test.ts'),'utf8').replaceAll("'../lib/","'./lib/"));
 cpSync('package.json',join(scratch,'package.json'));symlinkSync(resolve('node_modules'),join(scratch,'node_modules'),'dir');
 const target=join(scratch,'lib/sessions.ts'),source=readFileSync(target,'utf8');
 const expression='stableId(`finish|${timer.run ?? JSON.stringify(timer)}`)';assert.ok(source.includes(expression));
 for(const [name,replacement] of [['baseline',expression],['missing-id','undefined'],['empty-id',"''"],['constant-id',"'11111111-1111-4111-8111-111111111111'"]]) {
  writeFileSync(target,source.replace(expression,replacement));
  const result=spawnSync(process.execPath,['--import','tsx','--test','--test-name-pattern=recovered walk','sessions.test.ts'],{cwd:scratch,encoding:'utf8'});
  console.log(`Mutation: ${name}; runtime test exit: ${result.status}`);console.log(result.stdout);console.log(result.stderr);
  assert.equal(result.status===0,name==='baseline',`${name}: baseline must pass; mutated timer IDs must fail at runtime`);
 }
} finally {rmSync(scratch,{recursive:true,force:true});}
