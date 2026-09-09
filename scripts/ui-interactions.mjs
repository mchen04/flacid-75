// Proves the taps do what the screens promise: water rises, food fills, every habit logs
// from Today in one tap, and each habit tab holds its finished pose.
// Usage: node --import tsx scripts/ui-interactions.mjs [baseUrl]
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {emptyState, computeTargets, localDate, addDays, apply} from '../lib/domain.ts';

const base = process.argv[2] ?? 'http://localhost:3075';
const zone = 'America/Los_Angeles';
const today = localDate(new Date(), zone);
const stats = {height: 165, weight: 65, age: 30, activity: 1, goal: 'maintain'};
let seed = {...emptyState(), clock: {zone, anchorDay: today, anchorLocal: today},
  profile: {...stats, targets: computeTargets(stats), overrides: {}, baselineWeight: 65, startDay: addDays(today, -9)}};
const op = (day, extra) => ({id: crypto.randomUUID(), at: new Date(day + 'T20:00:00.000Z').toISOString(), day, zone, ...extra});
for (let i = 5; i >= 1; i--) for (const habit of ['workout','abs','walk','water','protein','calories','floss']) seed = apply(seed, op(addDays(today, -i), {type: 'check', habit, value: true}));

const liquidY = el => {
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
  return m.f;
};

const browser = await chromium.launch();
const report = {base, checks: {}};
try {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: zone, serviceWorkers: 'block'});
  const page = await context.newPage();
  let state = seed;
  await page.route('**/api/state', r => r.fulfill({json: state}));
  await page.route('**/api/sync', r => {
    for (const o of r.request().postDataJSON()) state = apply(state, o);
    return r.fulfill({json: {state, accepted: r.request().postDataJSON().map(o => o.id), rejected: []}});
  });
  await page.addInitScript(s => localStorage.setItem('flaccid75-v1', JSON.stringify({state: s, pending: [], unlocked: true})), seed);
  await page.clock.install({time: new Date(today + 'T16:20:00')});
  await page.goto(base, {waitUntil: 'load'});
  const nav = page.locator('nav.bottom-nav');
  await nav.waitFor();

  // Water: three taps, each one visibly higher than the last.
  const water = page.getByRole('button', {name: 'Add a glass of water'});
  const levels = [];
  const readLevel = async () => page.locator('.glass .liquid').evaluate(liquidY);
  const readLitres = async () => (await page.locator('.water .card-value strong').innerText()).trim();
  levels.push({y: await readLevel(), text: await readLitres()});
  for (let i = 0; i < 3; i++) { await water.click(); await page.waitForTimeout(1100); levels.push({y: await readLevel(), text: await readLitres()}); }
  for (let i = 1; i < levels.length; i++) assert.ok(levels[i].y < levels[i - 1].y, `water did not rise on tap ${i}: ${JSON.stringify(levels)}`);
  assert.notEqual(levels.at(-1).text, levels[0].text, 'the litres never changed');
  report.checks.waterRises = {levels, pass: true};

  // Food: logging a meal raises the level in the bowl.
  const bowlBefore = await page.locator('.bowl-fill').evaluate(liquidY);
  await page.getByRole('button', {name: 'Food. Log a meal'}).click();
  await page.getByRole('button', {name: 'Enter numbers'}).click();
  await page.getByLabel('Calories · kcal').fill('820');
  await page.getByLabel('Protein · g', {exact: true}).fill('48');
  await page.getByRole('button', {name: 'Add to today'}).click();
  await page.waitForTimeout(1200);
  const bowlAfter = await page.locator('.bowl-fill').evaluate(liquidY);
  assert.ok(bowlAfter < bowlBefore, `bowl did not fill: ${bowlBefore} -> ${bowlAfter}`);
  report.checks.foodFills = {before: bowlBefore, after: bowlAfter, pass: true};

  // Every habit logs from Today in one tap, and undoes in one more.
  const oneTap = {};
  for (const [label, sceneClass] of [['workout', 'gym'], ['abs', 'mat'], ['floss', 'tooth']]) {
    const tile = page.getByRole('button', {name: `Log ${label}`});
    await tile.click();
    await page.waitForTimeout(400);
    const pressed = await page.getByRole('button', {name: `Undo ${label}`}).getAttribute('aria-pressed');
    assert.equal(pressed, 'true', `${label} did not log from Today`);
    // the tab holds the finished pose
    await nav.getByRole('button', {name: label, exact: false}).first().click();
    await page.waitForTimeout(500);
    const done = await page.locator(`.scene.${sceneClass}`).getAttribute('class');
    assert.ok(done.includes('is-done'), `${label} tab does not show the done pose`);
    oneTap[label] = {loggedInOneTap: true, tabShowsDonePose: true};
    await nav.getByRole('button', {name: 'Today', exact: true}).click();
    await page.waitForTimeout(300);
  }
  // Rest is one tap now, with an undo offered rather than a confirmation first.
  await page.getByRole('button', {name: 'Rest today'}).click();
  await page.waitForTimeout(400);
  assert.equal(await page.getByRole('button', {name: 'Undo rest'}).count(), 1, 'rest did not log in one tap');
  assert.equal(await page.locator('.toast button').innerText(), 'Undo', 'rest offered no undo');
  oneTap.rest = {loggedInOneTap: true, undoOffered: true};
  report.checks.oneTapHabits = {...oneTap, pass: true};

  // Walk logs from the hero, which is where its animation plays.
  await page.getByRole('button', {name: 'Log walk'}).click();
  await page.waitForTimeout(400);
  assert.equal(await page.getByRole('button', {name: 'Undo walk'}).count(), 1, 'walk did not log in one tap');
  report.checks.walkOneTap = {pass: true};

  // The plus sits dead centre in its circle.
  const plus = await page.evaluate(() => {
    const b = document.querySelector('.nav-add').getBoundingClientRect();
    const s = document.querySelector('.nav-add svg').getBoundingClientRect();
    return {dx: Math.round(((s.x + s.width / 2) - (b.x + b.width / 2)) * 100) / 100, dy: Math.round(((s.y + s.height / 2) - (b.y + b.height / 2)) * 100) / 100};
  });
  assert.deepEqual(plus, {dx: 0, dy: 0}, `the plus is off centre: ${JSON.stringify(plus)}`);
  report.checks.plusCentred = {...plus, pass: true};
} finally {
  await browser.close();
}
await writeFile('evidence/ui/interactions.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));
