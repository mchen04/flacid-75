import {renderToStaticMarkup} from 'react-dom/server';
import {readdir,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import sharp from 'sharp';
import {Pip} from '../components/Pip';
// Builds anonymised 400x400 panels: Pip plus every competitor, each on the same cream ground, named by a random id.
const round=process.argv[2]??'r1';const dir=`evidence/blind/v2/panels/${round}`;await mkdir(dir,{recursive:true});
const bg={r:255,g:250,b:243,alpha:1};
async function panel(input:Buffer,name:string){const id=randomBytes(3).toString('hex');await sharp(input).trim({threshold:12}).resize(320,320,{fit:'inside',withoutEnlargement:false}).extend({top:40,bottom:40,left:40,right:40,background:bg}).resize(400,400,{fit:'contain',background:bg}).flatten({background:bg}).png().toFile(`${dir}/character-${id}.png`);return [name,id] as const;}
const key:Record<string,string>={};
const pip=Buffer.from(renderToStaticMarkup(<Pip mood={(process.argv[3] as 'hello')||'hello'}/>).replace('<svg','<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"'));
{const [name,id]=await panel(await sharp(pip).png().toBuffer(),'pip');key[name]=id;}
for(const file of await readdir('evidence/blind/v2/sources')){if(!/\.(png|webp|jpg)$/.test(file)||file.startsWith('brown-')||file==='brown-store.jpg')continue;const name=file.replace(/\..*$/,'');if(name==='sources')continue;const [n,id]=await panel(await sharp(`evidence/blind/v2/sources/${file}`).png().toBuffer(),name);key[n]=id;}
await writeFile(`${dir}/key.json`,JSON.stringify(key,null,2));console.log(JSON.stringify(key));
