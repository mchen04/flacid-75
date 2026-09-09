// Builds one anonymised pair for a blind round: this app's screen against one reference screen.
// Both panels are 420x900 on the same neutral ground, named by random ids, order shuffled and recorded in order.json; key.json maps ids back.
// Usage: node scripts/blind-panels.mjs <round> <screen:home|progress> <ref:a|b> <app-screenshot.png>
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const [round,screen,ref,shot]=process.argv.slice(2);
const dir=`evidence/blind/v3/panels/${round}-${screen}-${ref}`;await mkdir(dir,{recursive:true});
const bg={r:236,g:236,b:236,alpha:1};
async function panel(input){const id=randomBytes(3).toString('hex');await sharp(input).resize(400,860,{fit:'inside'}).extend({top:20,bottom:20,left:10,right:10,background:bg}).resize(420,900,{fit:'contain',background:bg}).flatten({background:bg}).png().toFile(`${dir}/screen-${id}.png`);return id;}
const key={app:await panel(shot),reference:await panel(`evidence/blind/v3/refs/${ref}-${screen}.png`)};
const order=Math.random()<.5?[key.app,key.reference]:[key.reference,key.app];
await writeFile(`${dir}/key.json`,JSON.stringify(key,null,2));await writeFile(`${dir}/order.json`,JSON.stringify(order));
console.log(JSON.stringify({dir,order:order.map(id=>`${dir}/screen-${id}.png`)}));
