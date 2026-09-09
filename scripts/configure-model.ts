import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {seal} from '../lib/model-auth';
import {db} from '../lib/db';
try{const source=await readFile(homedir()+'/.claude/.credentials.json','utf8');const parsed=JSON.parse(source);if(!parsed.claudeAiOauth?.refreshToken)throw new Error('Missing refresh credential');await db.query('INSERT INTO flaccid75_model_auth(id,encrypted) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET encrypted=$1,updated_at=now()',[seal(source)]);console.log('Existing Claude sign-in encrypted for the private preview.');}catch{console.error('Model credential setup failed; values suppressed.');process.exitCode=1;}finally{await db.end();}
