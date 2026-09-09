import pg from 'pg';
import {readFile,readdir} from 'node:fs/promises';
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
try {
 await client.connect();await client.query('BEGIN');
 await client.query('SELECT pg_advisory_xact_lock(750075)');
 await client.query('CREATE TABLE IF NOT EXISTS flaccid75_migrations(name text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
 for(const name of (await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort()){
  if((await client.query('SELECT name FROM flaccid75_migrations WHERE name=$1',[name])).rowCount)continue;
  await client.query(await readFile('migrations/'+name,'utf8'));await client.query('INSERT INTO flaccid75_migrations(name) VALUES($1)',[name]);console.log('Applied',name);
 }await client.query('COMMIT');console.log('Migrations current.');
}catch{await client.query('ROLLBACK').catch(()=>{});console.error('Migration failed; connection details suppressed.');process.exitCode=1;}finally{await client.end();}
