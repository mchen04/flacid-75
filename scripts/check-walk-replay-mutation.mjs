import {mkdtempSync,cpSync,symlinkSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const scratch=mkdtempSync(join(tmpdir(),'flacid-walk-replay-mutation-'));
try {
 cpSync('lib',join(scratch,'lib'),{recursive:true});cpSync('tests/daily-logs.test.ts',join(scratch,'daily-logs.test.ts'));
 writeFileSync(join(scratch,'daily-logs.test.ts'),readFileSync(join(scratch,'daily-logs.test.ts'),'utf8').replaceAll("'../lib/","'./lib/"));
 cpSync('package.json',join(scratch,'package.json'));symlinkSync(resolve('node_modules'),join(scratch,'node_modules'),'dir');
 const target=join(scratch,'lib/domain.ts'),source=readFileSync(target,'utf8');
 const clause='day.walkLog[op.walkId ?? op.id] ??=';assert.ok(source.includes(clause));
 for(const [name,replacement] of [['baseline',clause],['overwrite-first-walk','day.walkLog[op.walkId ?? op.id] =']]) {
  writeFileSync(target,source.replace(clause,replacement));
  const result=spawnSync(process.execPath,['--import','tsx','--test','--test-name-pattern=stable finish ids','daily-logs.test.ts'],{cwd:scratch,encoding:'utf8'});
  console.log(`Mutation: ${name}; runtime test exit: ${result.status}`);console.log(result.stdout);console.log(result.stderr);
  assert.equal(result.status===0,name==='baseline',`${name}: a new operation cannot overwrite an existing walk id`);
 }
} finally {rmSync(scratch,{recursive:true,force:true});}
