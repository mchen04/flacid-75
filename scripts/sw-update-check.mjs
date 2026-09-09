import {chromium} from 'playwright';
import assert from 'node:assert/strict';

// Needs a real browser, so it runs outside a sandbox that blocks Chromium.
const base = process.env.BASE ?? 'https://flaccid75-preview.vercel.app';
const NEW = 'flaccid75-shell-cafe12345678';
const log = (m) => console.log('step:', m);
let bump = false;

const browser = await chromium.launch();
try {
  const context = await browser.newContext({serviceWorkers: 'allow'});
  // Stand in for the next deployment: the same page, served a newer shell version.
  await context.route('**/sw.js', async route => {
    const response = await route.fetch();
    let body = await response.text();
    if (bump) body = body.replace(/flaccid75-shell-[a-f0-9]+/, NEW);
    await route.fulfill({status: 200, headers: {'content-type': 'application/javascript', 'cache-control': 'no-store'}, body});
  });
  const page = await context.newPage();
  await page.goto(base, {waitUntil: 'load', timeout: 30000});
  log('loaded');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {timeout: 30000});
  const before = await page.evaluate(() => navigator.serviceWorker.controller.scriptURL);
  log('controlled by ' + before);

  await page.evaluate(() => { window.__marker = 'before-update'; });
  bump = true;
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
  });
  log('update called');
  await page.waitForFunction(() => window.__marker === undefined, null, {timeout: 40000});
  log('page reloaded itself');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {timeout: 30000});
  const shells = await page.evaluate(async () => (await caches.keys()).filter(k => k.startsWith('flaccid75-')));
  assert.ok(shells.includes(NEW), 'new shell cache missing: ' + shells.join());
  assert.deepEqual(shells, [NEW], 'old shell cache was not cleared: ' + shells.join());
  console.log(JSON.stringify({url: base, reloadedItself: true, shellCaches: shells}, null, 1));
} finally {
  await browser.close();
}
