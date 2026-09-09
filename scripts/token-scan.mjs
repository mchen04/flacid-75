// Fails when a stylesheet or component carries a color, radius, space or type size that is not a token.
// Exempt by design: lib/tokens.ts (the source), app/tokens.css (generated), components/Scenes.tsx and components/Icon.tsx
// (illustration geometry in SVG user units, colors imported from the tokens), @media preludes and startup-image media queries (breakpoints) and @keyframes
// bodies (motion distances). Everything else must use var(--…).
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const files=execFileSync('git',['ls-files','app','components','lib'],{encoding:'utf8'}).split('\n').filter(f=>/\.(css|tsx|ts)$/.test(f)&&!['lib/tokens.ts','app/tokens.css','components/Scenes.tsx','components/Icon.tsx'].includes(f));
const findings=[];
for(const file of files){
 let text=readFileSync(file,'utf8');
 if(file.endsWith('.css')){text=text.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,m=>' '.repeat(m.length)).replace(/@media[^{]*\{/g,m=>' '.repeat(m.length)).replace(/\/\*[\s\S]*?\*\//g,m=>' '.repeat(m.length));}
 else text=text.replace(/(?:aria-label|d|viewBox|points|transform)=(?:"[^"]*"|\{`[^`]*`\})/g,m=>' '.repeat(m.length)).replace(/media[:=]\s*["'][^"']*["']/g,m=>' '.repeat(m.length));
 const lines=text.split('\n');
 lines.forEach((line,i)=>{
  for(const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\b\d*\.?\d+(?:px|rem|em|pt)\b/g)){
   if(file.endsWith('.tsx')&&/^\d/.test(m[0])&&/(?:cx|cy|r|x|y|width|height|rx|ry|strokeWidth|size)=/.test(line.slice(Math.max(0,m.index-14),m.index)))continue;
   findings.push({file,line:i+1,value:m[0],context:line.slice(Math.max(0,m.index-40),m.index+20).trim()});
  }
 });
}
writeFileSync('evidence/v3/token-scan.json',JSON.stringify({scanned:files,findings},null,2));
console.log(JSON.stringify({scanned:files.length,findings:findings.length}));
if(findings.length){console.log(findings);process.exitCode=1;}
