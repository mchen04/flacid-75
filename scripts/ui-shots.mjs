// Captures every screen at phone, small-phone and desktop sizes, and asserts the one-page rule:
// no element scrolls, and nothing overflows the viewport.
// Usage: node --import tsx scripts/ui-shots.mjs <outDir> [baseUrl]
import {chromium} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
import {emptyState, computeTargets, localDate, addDays, apply} from '../lib/domain.ts';

const out = process.argv[2] ?? 'evidence/ui/shots';
const base = process.argv[3] ?? process.env.TEST_BASE_URL ?? 'http://localhost:3075';
const zone = 'America/Los_Angeles';
const today = localDate(new Date(), zone);
const stats = {height: 165, weight: 65, age: 30, activity: 1, goal: 'maintain'};
const viewports = [
  {name: 'phone', width: 390, height: 844, mobile: true},
  {name: 'small', width: 375, height: 667, mobile: true},
  {name: 'desktop', width: 1280, height: 900, mobile: false},
];

// A lived-in account: twelve kept days, one rest, a partly done today.
let seed = {...emptyState(), clock: {zone, anchorDay: today, anchorLocal: today},
  profile: {...stats, targets: computeTargets(stats), overrides: {}, baselineWeight: 65, startDay: addDays(today, -23)}};
const op = (day, extra) => ({id: crypto.randomUUID(), at: new Date(day + 'T20:00:00.000Z').toISOString(), day, zone, ...extra});
for (let i = 12; i >= 1; i--) {
  const day = addDays(today, -i);
  if (i === 4) { seed = apply(seed, op(day, {type: 'rest', value: true})); continue; }
  for (const habit of ['workout', 'abs', 'walk', 'water', 'protein', 'calories', 'floss']) seed = apply(seed, op(day, {type: 'check', habit, value: true}));
}
for (const habit of ['workout', 'walk']) seed = apply(seed, op(today, {type: 'check', habit, value: true}));
seed = apply(seed, op(today, {type: 'water', amount: 1250}));
seed = apply(seed, op(today, {type: 'meal', mealId: crypto.randomUUID(), calories: 1180, protein: 64}));
for (const [i, w] of [[20, 66.2], [16, 65.9], [12, 65.6], [8, 65.4], [4, 65.1], [1, 64.9]]) seed.weights[addDays(today, -i)] = w;

// Every screen the app can reach, by the control that opens it. Missing controls are reported, not fatal:
// the same script runs against the old and the new layout.
const screens = [
  {name: 'today', open: null},
  {name: 'workout', open: {role: 'button', name: 'Workout', exact: true}},
  {name: 'abs', open: {role: 'button', name: 'Abs', exact: true}},
  {name: 'floss', open: {role: 'button', name: 'Floss', exact: true}},
  {name: 'rest', open: {role: 'button', name: 'Rest', exact: true}},
  {name: 'progress', open: {role: 'button', name: /day streak|Progress/}},
  {name: 'trends', open: {role: 'button', name: 'Trends', exact: true}},
  {name: 'you', open: {role: 'button', name: /^(You|Your details|Settings)$/}},
];

// The one-page rule, measured in the browser: the document must not scroll and no descendant may scroll.
const fitProbe = () => {
  const doc = document.documentElement;
  const overflowing = [...document.querySelectorAll('*')].filter(el => {
    const s = getComputedStyle(el);
    const scrollableY = el.scrollHeight - el.clientHeight > 1 && /auto|scroll/.test(s.overflowY);
    const scrollableX = el.scrollWidth - el.clientWidth > 1 && /auto|scroll/.test(s.overflowX);
    return scrollableY || scrollableX;
  }).map(el => ({
    selector: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
    scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
  }));
  return {
    documentScrollsY: doc.scrollHeight - doc.clientHeight > 1,
    documentScrollsX: doc.scrollWidth - doc.clientWidth > 1,
    windowScrollsY: document.body.scrollHeight > window.innerHeight + 1,
    scrollables: overflowing,
  };
};

const browser = await chromium.launch();
const report = {base, today, viewports: {}};
try {
  for (const vp of viewports) {
    await mkdir(`${out}/${vp.name}`, {recursive: true});
    const context = await browser.newContext({viewport: {width: vp.width, height: vp.height}, deviceScaleFactor: 2,
      isMobile: vp.mobile, hasTouch: vp.mobile, locale: 'en-US', timezoneId: zone, serviceWorkers: 'block'});
    const page = await context.newPage();
    await page.route('**/api/state', r => r.fulfill({json: seed}));
    await page.route('**/api/sync', r => r.fulfill({json: {state: seed, accepted: r.request().postDataJSON().map(o => o.id), rejected: []}}));
    await page.addInitScript(s => localStorage.setItem('flaccid75-v1', JSON.stringify({state: s, pending: [], unlocked: true})), seed);
    await page.clock.install({time: new Date(today + 'T16:20:00')});
    await page.goto(base, {waitUntil: 'load'});
    await page.getByRole('button', {name: 'Water'}).or(page.getByRole('button', {name: 'Workout', exact: true})).first().waitFor({timeout: 20000});
    await page.waitForTimeout(700);

    const results = {};
    for (const screen of screens) {
      if (screen.open) {
        const target = page.getByRole(screen.open.role, {name: screen.open.name, exact: screen.open.exact}).first();
        if (!(await target.count())) { results[screen.name] = {reached: false}; continue; }
        await target.click();
        await page.waitForTimeout(650);
      }
      const fit = await page.evaluate(fitProbe);
      await page.screenshot({path: `${out}/${vp.name}/${screen.name}.png`});
      results[screen.name] = {reached: true, ...fit};
      if (screen.open) {
        const home = page.getByRole('button', {name: 'Today', exact: true}).first();
        if (await home.count()) { await home.click(); await page.waitForTimeout(400); }
      }
    }
    report.viewports[vp.name] = results;
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${out}/fit.json`, JSON.stringify(report, null, 2));
const failures = Object.entries(report.viewports).flatMap(([vp, screens]) =>
  Object.entries(screens).filter(([, r]) => r.reached && (r.documentScrollsY || r.documentScrollsX || r.windowScrollsY || r.scrollables.length))
    .map(([name, r]) => `${vp}/${name}: ${[r.documentScrollsY && 'document scrolls', r.windowScrollsX && 'document scrolls sideways', r.scrollables.length && r.scrollables.map(s => s.selector).join(', ')].filter(Boolean).join('; ')}`));
console.log(JSON.stringify({out, unreached: Object.entries(report.viewports).flatMap(([vp, s]) => Object.entries(s).filter(([, r]) => !r.reached).map(([n]) => `${vp}/${n}`)), failures}, null, 1));
process.exitCode = failures.length ? 1 : 0;
