import {mkdtempSync,cpSync,symlinkSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const scratch=mkdtempSync(join(tmpdir(),'flacid-walkid-mutation-'));
try {
 cpSync('lib',join(scratch,'lib'),{recursive:true});cpSync('tests/bounds.test.ts',join(scratch,'bounds.test.ts'));
 writeFileSync(join(scratch,'bounds.test.ts'),readFileSync(join(scratch,'bounds.test.ts'),'utf8').replaceAll("'../lib/","'./lib/"));
 cpSync('package.json',join(scratch,'package.json'));symlinkSync(resolve('node_modules'),join(scratch,'node_modules'),'dir');
 const target=join(scratch,'lib/bounds.ts'),source=readFileSync(target,'utf8');
 const clause='(op.walkId === undefined || isUuid(op.walkId))';assert.ok(source.includes(clause));
 for(const [name,replacement] of [['baseline',clause],['missing-walk-id-check','true']]) {
  writeFileSync(target,source.replace(clause,replacement));
  const result=spawnSync(process.execPath,['--import','tsx','--test','bounds.test.ts'],{cwd:scratch,encoding:'utf8'});
  console.log(`Mutation: ${name}; runtime test exit: ${result.status}`);console.log(result.stdout);console.log(result.stderr);
  assert.equal(result.status===0,name==='baseline',`${name}: removing client walk ID validation must fail`);
 }
} finally {rmSync(scratch,{recursive:true,force:true});}
