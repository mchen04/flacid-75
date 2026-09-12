import {pathToFileURL} from 'node:url';
export function redactTestOutput(text, secrets) {
 for (const value of secrets.filter(Boolean)) text=text.replaceAll(value,'<test-only>');
 return text;
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
 const secrets=[process.env.APP_PASSPHRASE,process.env.SESSION_SECRET];
 process.stdin.setEncoding('utf8');
 let pending='';
 for await (const chunk of process.stdin) {
  pending+=chunk;const last=pending.lastIndexOf('\n');
  if(last>=0){process.stdout.write(redactTestOutput(pending.slice(0,last+1),secrets));pending=pending.slice(last+1);}
 }
 process.stdout.write(redactTestOutput(pending,secrets));
}
