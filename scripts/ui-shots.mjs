// Captures every page at phone, small-phone and desktop sizes and measures the layout rules in the browser:
// the page may scroll vertically inside `.page` when its content needs it, but nothing may scroll or overflow sideways,
// and no content may be cut off by hidden overflow. A full-page capture of the scrolling page is saved next to the viewport capture.
// Usage: [VIRTUAL_SERVER=1] node --import tsx scripts/ui-shots.mjs <outDir> [baseUrl]
import {chromium} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
import {emptyState, computeTargets, localDate, addDays, apply, weekStart} from '../lib/domain.ts';
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
].filter(v => !process.env.ONLY_VIEWPORT || v.name === process.env.ONLY_VIEWPORT);
// A lived-in fixture account (synthetic, no real person): twelve kept days, one rest, a partly done today, a few treats.
let seed = {...emptyState(), clock: {zone, anchorDay: today, anchorLocal: today},
  profile: {...stats, targets: computeTargets(stats), overrides: {}, baselineWeight: 65, startDay: addDays(today, -23)}};
const op = (day, extra) => ({id: crypto.randomUUID(), at: new Date(day + 'T20:00:00.000Z').toISOString(), day, zone, ...extra});
for (let i = 12; i >= 1; i--) {
  const day = addDays(today, -i);
  if (i === 4) { seed = apply(seed, op(day, {type: 'rest', value: true})); continue; }
  for (const habit of ['workout', 'abs', 'walk', 'water', 'protein', 'calories', 'floss']) seed = apply(seed, op(day, {type: 'check', habit, value: true}));
}
seed = apply(seed, op(today, {type: 'water', amount: 1250}));
seed = apply(seed, op(today, {type: 'meal', mealId: crypto.randomUUID(), calories: 1180, protein: 64}));
seed = apply(seed, op(today, {type: 'meditate', seconds: 300}));
seed = apply(seed, op(today, {type: 'rewards', rewards: [{id: crypto.randomUUID(), name: 'Film night', cost: 300}, {id: crypto.randomUUID(), name: 'Long bath', cost: 120}, {id: crypto.randomUUID(), name: 'New socks', cost: 800}]}));
for (const [i, w] of [[20, 66.2], [16, 65.9], [12, 65.6], [8, 65.4], [4, 65.1], [1, 64.9]]) seed.weights[addDays(today, -i)] = w;

// Every state, each from a fresh document and its own fixture. `steps` are taps, fills or hash changes performed on that fresh page;
// `fixture` picks a variant of the seed. Nothing carries over between states (no dialogs, no backfill, no timers).
const tap = (name, role = 'button', exact = false) => ({role, name, exact});
const screens = [
  {name: 'home', expect: 'Next: workout.', hash: ''},
  {name: 'home-complete', expect: 'Every one.', hash: '', fixture: 'complete'},
  {name: 'home-rest-day', expect: 'Resting today.', hash: '', fixture: 'rest'},
  {name: 'home-empty', expect: '0 of 7 today', hash: '', fixture: 'fresh'},
  {name: 'walk', expect: 'A walk today.', hash: 'walk'},
  {name: 'walk-running', expect: 'Walking.', hash: 'walk', steps: [tap('Start', 'button', true)]},
  {name: 'walk-paused', expect: 'Paused.', hash: 'walk', steps: [tap('Start', 'button', true), tap('Pause', 'button', true)]},
  {name: 'walk-done', expect: 'Walk logged', hash: 'walk', fixture: 'walkDone'},
  {name: 'workout', expect: '0 of 6 checked', hash: 'workout'},
  {name: 'workout-ticked', expect: '2 of 6 checked', hash: 'workout', steps: [tap('Squats', 'checkbox'), tap('Push-ups', 'checkbox')]},
  {name: 'workout-done', expect: 'Workout logged', hash: 'workout', fixture: 'workoutDone'},
  {name: 'abs-library', expect: 'Pick a routine', hash: 'abs'},
  {name: 'abs-guided', expect: 'Move 1 of 5', hash: 'abs', steps: [tap(/Classic five/)]},
  {name: 'abs-done', expect: 'Abs logged', hash: 'abs', fixture: 'absDone'},
  {name: 'floss', expect: 'Mark flossed', hash: 'floss'},
  {name: 'floss-done', expect: 'Floss logged', hash: 'floss', fixture: 'flossDone'},
  {name: 'water', expect: 'about 1½ of 2¼ Stanleys', hash: 'water'},
  {name: 'water-confirm', expect: 'Add 15 oz', hash: 'water', steps: [{fill: ['Or say it', 'half my Stanley']}, tap('Read it')]},
  {name: 'water-ask', expect: 'How much of the Stanley?', hash: 'water', steps: [{fill: ['Or say it', 'some of it']}, tap('Read it')]},
  {name: 'containers-sheet', expect: 'Add container', hash: 'water', steps: [tap('Containers', 'button', true)]},
  {name: 'food', expect: 'Meal 1', hash: 'food'},
  {name: 'food-empty', expect: 'Nothing logged yet.', hash: 'food', fixture: 'fresh'},
  {name: 'meal-sheet', expect: 'What did you eat?', hash: 'food', steps: [tap('Log a meal', 'button', true)]},
  {name: 'meal-estimate', expect: 'Add to today', hash: 'food', steps: [tap('Log a meal', 'button', true), {fill: ['What did you eat?', 'two eggs and toast']}, tap('Look it up'), {waitText: 'USDA · Egg, whole, cooked, scrambled'}]},
  {name: 'meal-numbers', expect: 'Calories · kcal', hash: 'food', steps: [tap('Log a meal', 'button', true), tap('Enter numbers')]},
  {name: 'meal-loading', expect: 'Looking…', hash: 'food', estimate: 'slow', steps: [tap('Log a meal', 'button', true), {fill: ['What did you eat?', 'two eggs and toast']}, tap('Look it up'), {settle: 300}]},
  {name: 'meal-error', expect: 'That could not be looked up right now. You can enter the numbers instead.', hash: 'food', estimate: 'down', steps: [tap('Log a meal', 'button', true), {fill: ['What did you eat?', 'two eggs and toast']}, tap('Look it up')]},
  {name: 'meal-not-food', expect: 'That does not look like food. You can enter the numbers instead.', hash: 'food', estimate: 'notfood', steps: [tap('Log a meal', 'button', true), {fill: ['What did you eat?', 'brb']}, tap('Look it up')]},
  {name: 'camera-failed', expect: 'The camera could not open.', hash: 'food', camera: 'fail', steps: [tap('Log a meal', 'button', true), tap('Photo', 'button', true)]},
  {name: 'camera-sheet', expect: 'Take meal photo', hash: 'food', steps: [tap('Log a meal', 'button', true), tap('Photo', 'button', true)]},
  {name: 'rest', expect: '2 rest days left this week.', hash: 'rest'},
  {name: 'rest-planned', expect: 'Both rest days planned.', hash: 'rest', fixture: 'rest'},
  {name: 'rest-none-left', expect: 'Both rest days planned.', hash: 'rest', fixture: 'restsUsed'},
  {name: 'meditate', expect: 'Optional · never counted toward the streak', hash: 'meditate'},
  {name: 'meditate-running', expect: 'breathing', hash: 'meditate', steps: [tap(/Start 5 minutes/)]},
  {name: 'focus', expect: 'Start focus', hash: 'focus'},
  {name: 'focus-running', expect: 'Block 1 of 8', hash: 'focus', steps: [tap('Start focus')]},
  {name: 'rewards', expect: 'Film night', hash: 'rewards'},
  {name: 'rewards-empty', expect: 'Add anything you would enjoy', hash: 'rewards', fixture: 'fresh'},
  {name: 'rewards-redeemed', expect: 'Enjoyed today', hash: 'rewards', steps: [tap('Redeem Long bath')]},
  {name: 'treats-sheet', expect: 'Add treat', hash: 'rewards', steps: [tap('Edit', 'button', true)]},
  {name: 'progress', expect: 'Milestones', hash: 'progress'},
  {name: 'progress-month', expect: 'In progress.', hash: 'progress', steps: [tap('Month', 'tab', true)]},
  {name: 'trends', expect: 'Protein estimates over time', hash: 'progress', steps: [tap('Trends', 'tab', true)]},
  {name: 'progress-missed-day', expect: 'A day to rescue.', hash: 'progress', steps: [{fill: ['Open any past day', 'PAST_MISSED']}]},
  {name: 'rescue-sheet', expect: 'Rescue this day', hash: 'progress', steps: [{fill: ['Open any past day', 'PAST_MISSED']}, tap('Rescue day', 'button', true)]},
  {name: 'backfill-home', expect: 'Editing', hash: 'progress', steps: [{fill: ['Open any past day', 'PAST_MISSED']}, tap('Backfill this day')]},
  {name: 'backfill-walk', expect: 'Mark walked on this day', hash: 'progress', steps: [{fill: ['Open any past day', 'PAST_MISSED']}, tap('Backfill this day'), {hash: 'walk'}]},
  {name: 'backfill-workout', expect: 'Mark done on this day', hash: 'progress', steps: [{fill: ['Open any past day', 'PAST_MISSED']}, tap('Backfill this day'), {hash: 'workout'}]},
  {name: 'settings', expect: 'Sound cues', hash: 'you'},
  {name: 'targets-sheet', expect: 'Walk · minutes', hash: 'you', steps: [tap('Daily targets')]},
  {name: 'details-sheet', expect: 'Daily movement', hash: 'you', steps: [tap('Your details')]},
  {name: 'weigh-in-sheet', expect: 'Today’s weight · lb', hash: 'you', steps: [tap('Weigh in', 'button', true)]},
  {name: 'plan-sheet', expect: 'One move per line', hash: 'you', steps: [tap('Workout plan')]},
  {name: 'lock-sheet', expect: 'Lock and clear', hash: 'you', steps: [tap('Lock this device')]},
  {name: 'about-sheet', expect: 'Mifflin–St Jeor equation', hash: 'you', steps: [tap('How targets are set')]},
  {name: 'rules', expect: 'What a day is', hash: 'rules'},
];
// Fixture variants, each derived from the base seed by applying real operations.
const fixtures = {
  base: () => seed,
  fresh: () => {const s = {...emptyState(), clock: seed.clock, profile: {...seed.profile, rewards: undefined, plan: undefined, startDay: today}}; return s;},
  complete: () => {let s = seed; for (const habit of ['workout', 'abs', 'walk', 'floss']) s = apply(s, op(today, {type: 'check', habit, value: true})); s = apply(s, op(today, {type: 'water', amount: 750})); s = apply(s, op(today, {type: 'meal', mealId: crypto.randomUUID(), calories: 700, protein: 45})); return s;},
  rest: () => {let s = apply(seed, op(today, {type: 'rest', value: true})); s = apply(s, op(addDays(weekStart(today), 6), {type: 'rest', value: true})); return s;},
  restsUsed: () => {let s = seed; for (const d of [-1, -2].map(n => addDays(today, n)).filter(d => weekStart(d) === weekStart(today))) s = apply(s, op(d, {type: 'rest', value: true})); return s;},
  walkDone: () => apply(seed, op(today, {type: 'session', habit: 'walk', seconds: 1860, done: true})),
  workoutDone: () => apply(seed, op(today, {type: 'session', habit: 'workout', seconds: 1500, done: true, items: ['Warm up', 'Squats', 'Push-ups']})),
  absDone: () => apply(seed, op(today, {type: 'session', habit: 'abs', seconds: 210, done: true, routine: 'Classic five'})),
  flossDone: () => apply(seed, op(today, {type: 'check', habit: 'floss', value: true})),
};
// Extra states that need their own browser context: the gate, onboarding, a changed timezone, reduced motion and a short screen.
const sizes = [['phone', 390, 844], ['small', 375, 667], ['desktop', 1280, 900]].filter(([n]) => !process.env.ONLY_VIEWPORT || n === process.env.ONLY_VIEWPORT);
const extras = [
  ...sizes.flatMap(([n, width, height]) => [
   {name: `gate-${n}`, width, height, setup: 'none', expect: 'Passphrase'},
   {name: `gate-wrong-passphrase-${n}`, width, height, setup: 'none', auth: 401, fill: ['Passphrase', 'not-it'], tap: {role: 'button', name: 'Open', exact: true}, expect: 'That passphrase does not match.'},
   {name: `onboarding-${n}`, width, height, setup: 'empty', expect: 'Welcome to My Wellness.'},
   {name: `timezone-banner-${n}`, width, height, setup: 'zone', expect: 'Your timezone changed.'},
   {name: `reduced-motion-home-${n}`, width, height, setup: 'reduced', expect: 'Today'},
   {name: `reduced-motion-walk-running-${n}`, width, height, setup: 'reduced', hash: 'walk', tap: {role: 'button', name: 'Start', exact: true}, expect: 'Walking.'},
  ]),
  {name: 'short-home', width: 375, height: 640, setup: 'seed', expect: 'Today'},
  {name: 'short-abs', width: 375, height: 640, setup: 'seed', hash: 'abs', expect: 'Pick a routine'},
  {name: 'short-walk', width: 375, height: 640, setup: 'seed', hash: 'walk', expect: 'Start'},
  {name: 'short-progress', width: 375, height: 640, setup: 'seed', hash: 'progress', expect: 'Milestones'},
];
const pastMissed = addDays(today, -13);

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
  // Words on the hero and stages must never overlap each other: the copy card, the chip and the pill are measured pairwise.
  const words = [...document.querySelectorAll('.hero-copy,.hero-tag,.hero-progress,.stage-copy,.stage-tag')].filter(e => e.getBoundingClientRect().width > 0);
  const overlapping = [];
  for (let i = 0; i < words.length; i++) for (let j = i + 1; j < words.length; j++) { const a = words[i].getBoundingClientRect(), b = words[j].getBoundingClientRect(); const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (x > 1 && y > 1) overlapping.push(`${name(words[i])}×${name(words[j])}`); }
  return {
    overlapping,
    sideways, clipped,
    documentScrollsX: doc.scrollWidth - doc.clientWidth > 1,
    documentScrollsY: doc.scrollHeight - doc.clientHeight > 1,
    pageScrollsY: !!page && page.scrollHeight - page.clientHeight > 1,
    pageScrollHeight: page?.scrollHeight ?? 0,
    unexpectedScrollers: scrollers.filter(s => !allowed.has(s)),
  };
};

const media = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];
const launch = () => chromium.launch({args: virtual ? ['--single-process', '--no-zygote', '--disable-gpu', ...media] : media});
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
    const estimate = {items: [{name: 'egg, whole, cooked, scrambled', grams: 100, calories: 149, protein: 10, source: 'usda', match: 'Egg, whole, cooked, scrambled', fdcId: 172187}, {name: 'bread, white, toasted', grams: 50, calories: 145, protein: 4.5, source: 'usda', match: 'Bread, white, commercially prepared, toasted', fdcId: 174925}], calories: 294, protein: 14.5, model: 'capture'};
    const results = {};
    for (const screen of screens) {
     // A fresh page and a fresh fixture for every state: nothing (dialogs, backfill, timers, injected styles) carries over.
     const page = await context.newPage();
     try {
      let state = (fixtures[screen.fixture ?? 'base'])();
      if (screen.estimate === 'down') await page.route('**/api/estimate', r => r.fulfill({status: 503, json: {error: 'That could not be looked up right now.'}}));
      else if (screen.estimate === 'notfood') await page.route('**/api/estimate', r => r.fulfill({status: 422, json: {error: 'That does not look like food.'}}));
      else if (screen.estimate === 'slow') await page.route('**/api/estimate', async r => { await new Promise(res => setTimeout(res, 6000)); await r.fulfill({json: estimate}).catch(() => {}); });
      else await page.route('**/api/estimate', r => r.fulfill({json: estimate}));
      if (screen.camera === 'fail') await page.addInitScript(() => { Object.defineProperty(navigator, 'mediaDevices', {value: {getUserMedia: () => Promise.reject(new Error('denied'))}}); });
      await page.route('**/api/state', r => r.fulfill({json: state}));
      await page.route('**/api/sync', r => { const ops = r.request().postDataJSON(); const rejected = []; for (const o of ops) { try { state = apply(state, o); } catch (e) { rejected.push({id: o.id, reason: String(e.message)}); } } return r.fulfill({json: {state, accepted: ops.map(o => o.id), rejected}}); });
      await page.addInitScript(s => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.resolve(undefined); localStorage.clear(); localStorage.setItem('flaccid75-v1', JSON.stringify({state: s, pending: [], unlocked: true})); }, state);
      await page.clock.install({time: new Date(today + 'T16:20:00')});
      await page.goto(base + (screen.hash ? '#' + screen.hash : ''), {waitUntil: 'load'});
      await page.locator('.app-shell').waitFor({timeout: 20000});
      await page.waitForTimeout(500);
      let failed = '';
      for (const step of screen.steps ?? []) {
        if (step.hash !== undefined) { await page.evaluate(h => { location.hash = h; }, step.hash); await page.waitForTimeout(500); continue; }
        if (step.fill) { const field = page.getByLabel(step.fill[0]); if (!(await field.count())) { failed = `fill ${step.fill[0]}`; break; } await field.fill(step.fill[1] === 'PAST_MISSED' ? pastMissed : step.fill[1]); await page.waitForTimeout(300); continue; }
        if (step.waitText) { await page.getByText(step.waitText).waitFor({timeout: 5000}); continue; }
        if (step.settle) { await page.waitForTimeout(step.settle); continue; }
        const target = page.getByRole(step.role, {name: step.name, exact: step.exact}).first();
        if (!(await target.count())) { failed = `tap ${step.name}`; break; }
        await target.click(); await page.waitForTimeout(700);
      }
      // The state each capture must show, checked on the page, so a capture of the wrong thing counts as missing evidence.
      if (!failed && screen.expect) { const found = (await page.getByText(screen.expect).count()) + (await page.getByLabel(screen.expect).count()); if (!found) failed = `expected "${screen.expect}" not on page`; }
      if (failed) { results[screen.name] = {reached: false, failed}; console.error(`${vp.name}/${screen.name}: ${failed}`); continue; }
      const fit = await page.evaluate(fitProbe);
      await page.screenshot({path: `${out}/${vp.name}/${screen.name}.png`});
      // The scrolling page, captured in full, so nothing below the fold is hidden from review. The page is discarded afterwards.
      if (fit.pageScrollsY && !(await page.locator('dialog[open]').count())) {
        await page.evaluate(() => { const p = document.querySelector('.page'); p.style.overflow = 'visible'; document.querySelector('.app-shell').style.height = 'auto'; document.querySelector('.app-shell').style.maxHeight = 'none'; document.documentElement.style.overflow = 'visible'; document.body.style.overflow = 'visible'; document.documentElement.style.height = 'auto'; document.body.style.height = 'auto'; });
        await page.screenshot({path: `${out}/${vp.name}/${screen.name}-full.png`, fullPage: true});
      }
      results[screen.name] = {reached: true, ...fit};
     } catch (error) { results[screen.name] = {reached: false, failed: String(error.message ?? error).split('\n')[0]}; console.error(`${vp.name}/${screen.name}: ${results[screen.name].failed}`); }
     finally { await page.close().catch(() => {}); }
    }
    await context.close();
    report.viewports[vp.name] = results;
  }
  // Extras, one fresh browser each.
  await mkdir(`${out}/extras`, {recursive: true});
  report.extras = {};
  for (const extra of extras) {
    if (virtual) { await browser.close().catch(() => {}); browser = await launch(); }
    const context = await browser.newContext({viewport: {width: extra.width, height: extra.height}, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: zone, serviceWorkers: 'block', reducedMotion: extra.setup === 'reduced' ? 'reduce' : 'no-preference'});
    if (virtual) await install(context);
    const page = await context.newPage();
    await page.addInitScript(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.resolve(undefined); });
    const state = extra.setup === 'zone' ? {...seed, clock: {...seed.clock, zone: 'Europe/London'}} : extra.setup === 'empty' ? emptyState() : seed;
    await page.route('**/api/state', r => r.fulfill({json: state}));
    await page.route('**/api/sync', r => r.fulfill({json: {state, accepted: r.request().postDataJSON().map(o => o.id), rejected: []}}));
    if (extra.auth) await page.route('**/api/auth', r => r.fulfill({status: extra.auth, json: {error: 'That passphrase does not match.'}}));
    if (extra.setup !== 'none') await page.addInitScript(s => localStorage.setItem('flaccid75-v1', JSON.stringify({state: s, pending: [], unlocked: true})), state);
    await page.clock.install({time: new Date(today + 'T16:20:00')});
    await page.goto(base + (extra.hash ? '#' + extra.hash : ''), {waitUntil: 'load'});
    await page.waitForTimeout(800);
    if (extra.fill) { await page.getByLabel(extra.fill[0]).fill(extra.fill[1]); }
    if (extra.tap) { await page.getByRole(extra.tap.role, {name: extra.tap.name, exact: extra.tap.exact ?? false}).first().click(); await page.waitForTimeout(700); }
    let missing = '';
    if (extra.expect) { const found = (await page.getByText(extra.expect).count()) + (await page.getByLabel(extra.expect).count()); if (!found) missing = `expected "${extra.expect}" not on page`; }
    if (missing) { report.extras[extra.name] = {reached: false, failed: missing}; console.error(`extras/${extra.name}: ${missing}`); await context.close(); continue; }
    const fit = await page.evaluate(fitProbe);
    await page.screenshot({path: `${out}/extras/${extra.name}.png`});
    if (extra.setup === 'reduced') fit.animated = await page.evaluate(() => [...document.querySelectorAll('*')].filter(el => { const s = getComputedStyle(el); return s.animationName !== 'none' || (s.transitionDuration !== '0s' && s.transitionProperty !== 'none' && s.transitionDuration !== ''); }).length);
    report.extras[extra.name] = {reached: true, ...fit};
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${out}/fit.json`, JSON.stringify(report, null, 2));
const failures = Object.entries({...report.viewports, extras: report.extras}).flatMap(([vp, screens]) =>
  Object.entries(screens).filter(([, r]) => r.reached && (r.documentScrollsX || r.documentScrollsY || r.sideways.length || r.clipped.length || r.unexpectedScrollers.length || r.overlapping?.length))
    .map(([name, r]) => `${vp}/${name}: ${[r.documentScrollsX && 'document scrolls sideways', r.documentScrollsY && 'document scrolls', r.sideways.length && ('sideways: ' + r.sideways.map(s => `${s.selector} ${s.scrollWidth}>${s.clientWidth}`).join(', ')), r.clipped.length && ('clipped: ' + r.clipped.map(s => `${s.selector} ${s.scrollHeight}>${s.clientHeight}`).join(', ')), r.unexpectedScrollers.length && ('unexpected scrollers: ' + r.unexpectedScrollers.join(', ')), r.overlapping?.length && ('overlapping words: ' + r.overlapping.join(', '))].filter(Boolean).join('; ')}`));
console.log(JSON.stringify({out, unreached: Object.entries(report.viewports).flatMap(([vp, s]) => Object.entries(s).filter(([, r]) => !r.reached).map(([n]) => `${vp}/${n}`)), failures}, null, 1));
const unreached = Object.entries({...report.viewports, extras: report.extras}).flatMap(([vp, s]) => Object.entries(s).filter(([, r]) => !r.reached).map(([n]) => `${vp}/${n}`));
// A state that could not be reached is missing evidence, and missing evidence fails the run.
process.exitCode = failures.length || unreached.length ? 1 : 0;
