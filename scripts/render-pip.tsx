import {renderToStaticMarkup} from 'react-dom/server';
import {writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {Pip,type Mood,type Pose} from '../components/Pip';
const moods:Mood[]=['hello','happy','cheer','cozy','eat','wink','effort','grin','gentle'];const poses:Pose[]=['stand','sit','walk','lift'];
const out=process.argv[2]??'evidence/pip-sheet.png';
let cells='';let i=0;for(const pose of poses)for(const mood of moods){const x=(i%9)*210,y=Math.floor(i/9)*210;cells+=renderToStaticMarkup(<Pip mood={mood} pose={pose} food={mood==='eat'?'meal':undefined}/>).replace('<svg',`<svg x="${x+5}" y="${y+5}" width="200" height="200"`);i++;}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1890" height="840"><rect width="1890" height="840" fill="#fffaf3"/>${cells}</svg>`;
await sharp(Buffer.from(svg)).png().toFile(out);await writeFile(out.replace('.png','.svg'),svg);console.log('wrote',out);
