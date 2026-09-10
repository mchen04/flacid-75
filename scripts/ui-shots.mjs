// Captures every page at phone, small-phone and desktop sizes and measures the layout rules in the browser:
// the page may scroll vertically inside `.page` when its content needs it, but nothing may scroll or overflow sideways,
// and no content may be cut off by hidden overflow. A full-page capture of the scrolling page is saved next to the viewport capture.
// Usage: [VIRTUAL_SERVER=1] node --import tsx scripts/ui-shots.mjs <outDir> [baseUrl]
import {chromium} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
import {emptyState, computeTargets, localDate, addDays, apply} from '../lib/domain.ts';
import {install} from './virtual-server.mjs';
// VIRTUAL_SERVER=1 serves the production build through request interception (no listening socket needed).
const virtual = process.env.VIRTUAL_SERVER === '1';
const out = process.argv[2] ?? 'evidence/my-wellness/after';
const base = process.argv[3] ?? process.env.TEST_BASE_URL ?? 'http://localhost:3075';
const zone = 'America/Los_Angeles';
const today = localDate(new Date(), zone);
const stats = {height: 165, weight: 65, age: 30, activity: 1, goal: 'maintain'};
const viewports = [
  {name: 'phone', width: 390, height: 844, mobile: true},
  {name: 'small', width: 375, height: 667, mobile: true},
  {name: 'desktop', width: 1280, height: 900, mobile: false},
];
// A lived-in fixture account (synthetic, no real person): twelve kept days, one rest, a partly done today, a few treats.
let seed = {...emptyState(), clock: {zone, anchorDay: today, anchorLocal: today},
  profile: {...stats, targets: computeTargets(stats), overrides: {}, baselineWeight: 65, startDay: addDays(today, -23)}};
const op = (day, extra) => ({id: crypto.randomUUID(), at: new Date(day + 'T20:00:00.000Z').toISOString(), day, zone, ...extra});
for (let i = 12; i >= 1; i--) {
  const day = addDays(today, -i);
  if (i === 4) { seed = apply(seed, op(day, {type: 'rest', value: true})); continue; }
  for (const habit of ['workout', 'abs', 'walk', 'water', 'protein', 'calories', 'floss']) seed = apply(seed, op(day, {type: 'check', habit, value: true}));
}
seed = apply(seed, op(today, {type: 'session', habit: 'walk', seconds: 1860, done: true}));
seed = apply(seed, op(today, {type: 'session', habit: 'workout', seconds: 1500, done: true, items: ['Warm up', 'Squats', 'Push-ups']}));
seed = apply(seed, op(today, {type: 'water', amount: 1250}));
seed = apply(seed, op(today, {type: 'meal', mealId: crypto.randomUUID(), calories: 1180, protein: 64}));
seed = apply(seed, op(today, {type: 'meditate', seconds: 300}));
seed = apply(seed, op(today, {type: 'rewards', rewards: [{id: crypto.randomUUID(), name: 'Film night', cost: 300}, {id: crypto.randomUUID(), name: 'Long bath', cost: 120}, {id: crypto.randomUUID(), name: 'New socks', cost: 800}]}));
for (const [i, w] of [[20, 66.2], [16, 65.9], [12, 65.6], [8, 65.4], [4, 65.1], [1, 64.9]]) seed.weights[addDays(today, -i)] = w;

// Every page, by hash. Pages that need an extra tap list it.
const screens = [
  {name: 'home', hash: ''},
  {name: 'walk', hash: 'walk'},
  {name: 'workout', hash: 'workout'},
  {name: 'abs', hash: 'abs'},
  {name: 'abs-guided', hash: 'abs', tap: {role: 'button', name: /Classic five/}},
  {name: 'floss', hash: 'floss'},
  {name: 'water', hash: 'water'},
  {name: 'food', hash: 'food'},
  {name: 'meal-sheet', hash: 'food', tap: {role: 'button', name: 'Log a meal', exact: true}},
  {name: 'rest', hash: 'rest'},
  {name: 'meditate', hash: 'meditate'},
  {name: 'focus', hash: 'focus'},
  {name: 'rewards', hash: 'rewards'},
  {name: 'progress', hash: 'progress'},
  {name: 'progress-month', hash: 'progress', tap: {role: 'tab', name: 'Month', exact: true}},
  {name: 'trends', hash: 'progress', tap: {role: 'tab', name: 'Trends', exact: true}},
  {name: 'settings', hash: 'you'},
  {name: 'rules', hash: 'rules'},
];

const fitProbe = () => {
  const doc = document.documentElement;
  const name = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const inSvg = el => !!el.closest('svg');
  // Sideways: no element may be wider than its box, whatever its overflow style says.
  const sideways = [...document.querySelectorAll('body *')].filter(el => !inSvg(el) && !el.classList.contains('sr-only') && el.scrollWidth - el.clientWidth > 1 && getComputedStyle(el).overflowX !== 'visible')
    .map(el => ({selector: name(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth}));
  // Vertical: only `.page` and an open sheet may scroll. Anything else that hides overflow with content beyond its box is clipped content.
  const scrollers = [...document.querySelectorAll('body *')].filter(el => !inSvg(el) && el.scrollHeight - el.clientHeight > 1 && /auto|scroll/.test(getComputedStyle(el).overflowY)).map(name);
  const allowed = new Set(['div.page', 'dialog.sheet']);
  const clipped = [...document.querySelectorAll('body *')].filter(el => {
    const s = getComputedStyle(el);
    if (!/hidden|clip/.test(s.overflowY)) return false;
    if (inSvg(el) || el.classList.contains('sr-only') || el.tagName === 'INPUT') return false;
    return el.scrollHeight - el.clientHeight > 2;
  }).map(el => ({selector: name(el), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight}));
  const page = document.querySelector('.page');
  return {
    sideways, clipped,
    documentScrollsX: doc.scrollWidth - doc.clientWidth > 1,
    documentScrollsY: doc.scrollHeight - doc.clientHeight > 1,
    pageScrollsY: !!page && page.scrollHeight - page.clientHeight > 1,
    pageScrollHeight: page?.scrollHeight ?? 0,
    unexpectedScrollers: scrollers.filter(s => !allowed.has(s)),
  };
};

const launch = () => chromium.launch(virtual ? {args: ['--single-process', '--no-zygote', '--disable-gpu']} : {});
let browser = await launch();
const report = {base, today, viewports: {}};
try {
  for (const vp of viewports) {
    // Single-process Chromium (the only kind that launches in the sandbox) allows one context per browser, so each viewport gets its own.
    if (virtual && vp !== viewports[0]) { await browser.close().catch(() => {}); browser = await launch(); }
    await mkdir(`${out}/${vp.name}`, {recursive: true});
    const context = await browser.newContext({viewport: {width: vp.width, height: vp.height}, deviceScaleFactor: 2,
      isMobile: vp.mobile, hasTouch: vp.mobile, locale: 'en-US', timezoneId: zone, serviceWorkers: 'block'});
    if (virtual) await install(context);
    const page = await context.newPage();
    await page.route('**/api/state', r => r.fulfill({json: seed}));
    await page.route('**/api/sync', r => r.fulfill({json: {state: seed, accepted: r.request().postDataJSON().map(o => o.id), rejected: []}}));
    await page.addInitScript(s => localStorage.setItem('flaccid75-v1', JSON.stringify({state: s, pending: [], unlocked: true})), seed);
    await page.clock.install({time: new Date(today + 'T16:20:00')});
    await page.goto(base, {waitUntil: 'load'});
    await page.locator('.home-view').waitFor({timeout: 20000});
    await page.waitForTimeout(600);

    const results = {};
    for (const screen of screens) {
      await page.evaluate(h => { location.hash = h; }, screen.hash);
      await page.waitForTimeout(500);
      let reached = true;
      if (screen.tap) {
        const target = page.getByRole(screen.tap.role, {name: screen.tap.name, exact: screen.tap.exact ?? false}).first();
        if (!(await target.count())) reached = false; else { await target.click(); await page.waitForTimeout(700); }
      }
      if (!reached) { results[screen.name] = {reached: false}; continue; }
      const fit = await page.evaluate(fitProbe);
      await page.screenshot({path: `${out}/${vp.name}/${screen.name}.png`});
      // The scrolling page, captured in full, so nothing below the fold is hidden from review.
      if (fit.pageScrollsY) {
        await page.evaluate(() => { const p = document.querySelector('.page'); p.style.overflow = 'visible'; document.querySelector('.app-shell').style.height = 'auto'; document.querySelector('.app-shell').style.maxHeight = 'none'; document.documentElement.style.overflow = 'visible'; document.body.style.overflow = 'visible'; document.documentElement.style.height = 'auto'; document.body.style.height = 'auto'; });
        await page.screenshot({path: `${out}/${vp.name}/${screen.name}-full.png`, fullPage: true});
        await page.evaluate(() => { for (const el of [document.querySelector('.page'), document.querySelector('.app-shell'), document.documentElement, document.body]) el.removeAttribute('style'); });
      }
      results[screen.name] = {reached: true, ...fit};
      if (await page.locator('dialog[open]').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
      // Guided abs leaves a timer running; stop it so the next screen starts clean.
      if (screen.name === 'abs-guided') { const stop = page.getByRole('button', {name: 'Stop without logging'}); if (await stop.count()) await stop.click(); }
    }
    report.viewports[vp.name] = results;
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${out}/fit.json`, JSON.stringify(report, null, 2));
const failures = Object.entries(report.viewports).flatMap(([vp, screens]) =>
  Object.entries(screens).filter(([, r]) => r.reached && (r.documentScrollsX || r.documentScrollsY || r.sideways.length || r.clipped.length || r.unexpectedScrollers.length))
    .map(([name, r]) => `${vp}/${name}: ${[r.documentScrollsX && 'document scrolls sideways', r.documentScrollsY && 'document scrolls', r.sideways.length && ('sideways: ' + r.sideways.map(s => `${s.selector} ${s.scrollWidth}>${s.clientWidth}`).join(', ')), r.clipped.length && ('clipped: ' + r.clipped.map(s => `${s.selector} ${s.scrollHeight}>${s.clientHeight}`).join(', ')), r.unexpectedScrollers.length && ('unexpected scrollers: ' + r.unexpectedScrollers.join(', '))].filter(Boolean).join('; ')}`));
console.log(JSON.stringify({out, unreached: Object.entries(report.viewports).flatMap(([vp, s]) => Object.entries(s).filter(([, r]) => !r.reached).map(([n]) => `${vp}/${n}`)), failures}, null, 1));
process.exitCode = failures.length ? 1 : 0;
