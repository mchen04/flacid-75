// Builds one blind pair per competitor: our screen and their screen, same canvas, same ground,
// random file names, order shuffled. key.json maps the ids back after the review.
// Usage: node scripts/blind-compare.mjs <round> <our-screenshot.png>
import sharp from 'sharp';
import {mkdir, writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';

const [round, ours] = process.argv.slice(2);
const refs = {
  streaks: 'streaks-app-0.jpg',
  cronometer: 'cronometer-app-2.jpg',
  duolingo: 'duolingo-app-1.jpg',
  finch: 'finch-app-3.jpg',
  macrofactor: 'macrofactor-app-1.jpg',
  strong: 'strong-app-0.jpg',
};
const bg = {r: 236, g: 236, b: 236, alpha: 1};
const panel = async (input, dir) => {
  const id = randomBytes(3).toString('hex');
  await sharp(input).resize(420, 900, {fit: 'inside'})
    .extend({top: 20, bottom: 20, left: 20, right: 20, background: bg})
    .flatten({background: bg}).png().toFile(`${dir}/screen-${id}.png`);
  return id;
};
const key = {};
for (const [name, file] of Object.entries(refs)) {
  const dir = `evidence/blind/ui/${round}/${name}`;
  await mkdir(dir, {recursive: true});
  const app = await panel(ours, dir);
  const reference = await panel(`evidence/competitors/${file}`, dir);
  const order = Math.random() < 0.5 ? [app, reference] : [reference, app];
  key[name] = {app, reference, referenceFile: file, order};
  await writeFile(`${dir}/order.json`, JSON.stringify(order));
}
await writeFile(`evidence/blind/ui/${round}/key.json`, JSON.stringify(key, null, 2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(key).map(([k, v]) => [k, v.order.map(id => `evidence/blind/ui/${round}/${k}/screen-${id}.png`)])), null, 1));
