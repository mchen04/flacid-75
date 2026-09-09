// Writes the brand assets from the hand-authored scenes: icon.svg, the PNG icons, the gate placeholder and the splash image.
import {renderToStaticMarkup} from 'react-dom/server';
import {writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {Brand,Hills} from '../components/Scenes';
import {color} from '../lib/tokens';
const icon=renderToStaticMarkup(<Brand/>);
await writeFile('public/icon.svg',icon);
for(const [name,size] of [['icon-192',192],['icon-512',512],['apple-touch-icon',180]] as const)await sharp(Buffer.from(icon)).resize(size,size).png().toFile(`public/${name}.png`);
// The maskable icon keeps the mark inside the safe zone: the same art with square corners and extra ground.
const maskable=renderToStaticMarkup(<Brand padded={false}/>).replace(/^<svg[^>]*>/,'<svg x="56" y="56" width="400" height="400" viewBox="0 0 512 512">');
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${color.ground}"/>${maskable}</svg>`)).resize(512,512).png().toFile('public/icon-maskable.png');
const scene=renderToStaticMarkup(<Hills phase="morning"/>).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
await writeFile('public/art/gate.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200" class="scene gate-scene" aria-hidden="true">${scene}</svg>`);
const splash=`<svg xmlns="http://www.w3.org/2000/svg" width="1170" height="2532"><defs><clipPath id="card"><rect x="60" y="966" width="1050" height="600" rx="72"/></clipPath></defs><rect width="1170" height="2532" fill="${color.ground}"/><g clip-path="url(#card)"><svg x="60" y="966" width="1050" height="600" viewBox="0 0 360 200" preserveAspectRatio="xMidYMax slice">${scene}</svg></g></svg>`;
await writeFile('public/art/splash.svg',splash);await sharp(Buffer.from(splash)).png().toFile('public/splash-1170x2532.png');
console.log('wrote brand assets');
