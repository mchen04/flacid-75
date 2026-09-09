// Serves a genuinely newer shell from disk and proves an open app reloads itself once.
// Needs a real browser and a local server, so it runs outside a sandbox that blocks either.
import {chromium} from 'playwright';
import {readFile, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.BASE ?? 'http://localhost:3099';
const NEW = 'flaccid75-shell-cafe12345678';
const log = m => console.log('step:', m);
const original = await readFile('public/sw.js', 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(base, {waitUntil: 'load', timeout: 30000});
  log('loaded');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {timeout: 30000});
  log('controlled');
  await page.evaluate(() => { window.__marker = 'before-update'; });

  // A deployment ships a new shell version while the app is open.
  await writeFile('public/sw.js', original.replace(/flaccid75-shell-[a-f0-9]+/, NEW));
  const served = await page.evaluate(async () => (await (await fetch('/sw.js', {cache: 'no-store'})).text()).slice(0, 45));
  assert.ok(served.includes(NEW), 'server still serves the old shell: ' + served);
  log('new shell is being served');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
  });
  log('update called');

  await page.waitForFunction(() => window.__marker === undefined, null, {timeout: 40000});
  log('page reloaded itself');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {timeout: 30000});
  const shells = await page.evaluate(async () => (await caches.keys()).filter(k => k.startsWith('flaccid75-')));
  assert.deepEqual(shells, [NEW], 'expected only the new shell cache, got: ' + shells.join());
  console.log(JSON.stringify({url: base, reloadedItself: true, shellCaches: shells}, null, 1));
} finally {
  await writeFile('public/sw.js', original);
  await browser.close();
}
