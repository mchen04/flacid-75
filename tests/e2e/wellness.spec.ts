// My Wellness: navigation, timers, guided sessions, optional practices, treats, units, rollover, duplicates, keyboard and contrast.
import {test,expect} from './fixtures';
import type {Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {addDays,apply} from '../../lib/domain';
import {open,mock,seed,todayIn,op,complete,zone} from './helpers';
const at=(day:string,time:string)=>new Date(`${day}T${time}`);
// Simulated minutes advance tick by tick (every interval fires), which is slow on an old machine, so these tests carry a longer budget.
const slowClock=()=>test.setTimeout(150000);
async function openAt(page:Page,state:ReturnType<typeof seed>,time:Date,hash=''){const box=await open(page,state,{go:false});await page.clock.install({time});await page.goto('/'+(hash?'#'+hash:''));await page.locator('.app-shell').waitFor();return box;}
test('every page is one tap from the dashboard, has an obvious Home, and the browser back button works',async({page})=>{
 await open(page,seed());
 const pages:[string,string][]=[['Open walk','Walk'],['Open workout','Workout'],['Open abs','Abs'],['Open floss','Floss'],['Open water','Water'],['Open food','Food'],['Open rest','Rest days'],['Open meditate','Meditate'],['Open focus','Focus'],['Open treats','Treats'],['Open progress','Progress']];
 for(const [button,title] of pages){await page.getByRole('button',{name:button,exact:true}).click();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Home'})).toBeVisible();await expect(page.getByLabel('Settings')).toBeVisible();await expect(page.getByRole('button',{name:/day streak\. Open progress/})).toBeVisible();await page.getByRole('button',{name:'Home'}).click();await expect(page.locator('.home-view')).toBeVisible();}
 await page.getByLabel('Settings').click();await expect(page.getByRole('heading',{name:'Settings'})).toBeVisible();await page.getByRole('button',{name:'How it works'}).click();await expect(page.getByRole('heading',{name:'How it works'})).toBeVisible();
 await page.goBack();await expect(page.getByRole('heading',{name:'Settings'})).toBeVisible();await page.goBack();await expect(page.locator('.home-view')).toBeVisible();
 await page.getByRole('button',{name:/day streak\. Open progress/}).click();await expect(page).toHaveURL(/#progress$/);
 await expect(page.locator('nav.bottom-nav')).toHaveCount(0);
});
test('the walk timer starts, pauses, survives a reload and a long sleep, finishes into a logged session, and undoes',async({page})=>{
 slowClock();
 const today=todayIn();const box=await openAt(page,seed(3),at(today,'10:00:00'),'walk');
 await page.getByRole('button',{name:'Start'}).click();await page.clock.runFor(10*60*1000);await expect(page.locator('.dial-time')).toHaveText(/^10:[0-2]\d$/);
 await page.getByRole('button',{name:'Pause'}).click();const paused=await page.locator('.dial-time').innerText();await page.clock.runFor(60*1000);await expect(page.locator('.dial-time')).toHaveText(paused);
 // Reload: the paused timer is still there with the same count.
 await page.reload();await page.locator('.app-shell').waitFor();await expect(page.locator('.dial-time')).toHaveText(paused);await expect(page.getByRole('button',{name:'Resume'})).toBeVisible();
 // Resume, then the phone sleeps for 20 minutes: no ticks fire, the clock simply moves on, and the count is right on wake.
 await page.getByRole('button',{name:'Resume'}).click();await page.clock.fastForward(20*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.locator('.dial-time')).toHaveText(/^30:[0-2]\d$/);
 await page.getByRole('button',{name:'Finish'}).click();await expect(page.getByRole('checkbox',{name:'Walk complete',checked:true})).toBeVisible();await expect(page.getByRole('group',{name:'Walk entries'}).getByText(/^30:[0-2]\d$/)).toBeVisible();
 expect(box.state.days[today].sessions?.walk?.seconds).toBeGreaterThanOrEqual(1800);expect(box.state.days[today].sessions?.walk?.seconds).toBeLessThan(1830);expect(box.state.days[today].checks.walk).toBe(true);
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('Walked · 30 min')).toBeVisible();
 await page.getByRole('button',{name:'Open walk',exact:true}).click();await page.getByRole('checkbox',{name:'Walk complete'}).click();await expect(page.getByRole('button',{name:'Start'})).toBeVisible();expect(box.state.days[today].checks.walk).toBe(false);
 await writeFile(`evidence/my-wellness/timer-walk-${test.info().project.name}.json`,JSON.stringify({ran:'10:00',pausedFor:'1:00 (no change)',reloadKept:'10:00',sleptFor:'20:00 with no ticks',onWake:'30:00',logged:1800,note:'Chromium with a virtual clock; a physical lock/reopen is not measured here'},null,2));
});
test('the workout page is a checklist with a session clock, an editable plan, and a finish that records the moves',async({page})=>{
 slowClock();
 const today=todayIn();const box=await openAt(page,seed(),at(today,'18:00:00'),'workout');
 await expect(page.getByRole('group',{name:'Workout checklist'})).toBeVisible();await expect(page.getByRole('group',{name:'Workout checklist'}).getByRole('checkbox')).toHaveCount(6);
 await page.getByRole('button',{name:'Edit plan'}).click();await page.getByLabel('One move per line').fill('Squats\nRows\nPlank');await page.getByRole('button',{name:'Save plan'}).click();await expect(page.getByRole('group',{name:'Workout checklist'}).getByRole('checkbox')).toHaveCount(3);expect(box.state.profile?.plan).toEqual(['Squats','Rows','Plank']);
 await page.getByRole('checkbox',{name:'Squats'}).check();await page.getByRole('checkbox',{name:'Plank'}).check();await expect(page.getByText('2 of 3 checked')).toBeVisible();await page.clock.runFor(12*60*1000);
 await page.reload();await page.locator('.app-shell').waitFor();await expect(page.getByRole('checkbox',{name:'Squats'})).toBeChecked();
 // The recorded session is the clock's own reading: the interval from the first tick (the stored start) to the finish, bracketed by clock readings taken just before and just after the tap. The virtual clock also runs with wall time, so the interval is at least the 12 minutes advanced.
 const startedAt=await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')!).workout.startedAt as number);const before=await page.evaluate(()=>Date.now());
 await page.getByRole('button',{name:'Finish',exact:true}).click();await expect(page.getByText('Workout logged')).toBeVisible();const after=await page.evaluate(()=>Date.now());
 const seconds=box.state.days[today].sessions?.workout?.seconds??-1;expect(box.state.days[today].sessions?.workout?.items).toEqual(['Squats','Plank']);
 expect(seconds).toBeGreaterThanOrEqual(720);expect(seconds).toBeGreaterThanOrEqual(Math.floor((before-startedAt)/1000));expect(seconds).toBeLessThanOrEqual(Math.ceil((after-startedAt)/1000));
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('Done · 2 moves')).toBeVisible();
});
test('the guided ab routine walks through timed intervals with instructions and logs itself at the end',async({page})=>{
 const today=todayIn();const box=await openAt(page,seed(),at(today,'18:00:00'),'abs');
 await expect(page.getByRole('group',{name:'Ab routines'})).toBeVisible();await expect(page.getByRole('button',{name:/Two-minute burst/})).toBeVisible();
 await page.getByRole('button',{name:/Two-minute burst/}).click();
 await expect(page.getByRole('heading',{name:'Mountain climber'})).toBeVisible();await expect(page.getByText('High plank. Drive one knee in at a time.',{exact:false})).toBeVisible();await expect(page.locator('.dial-time')).toHaveText(/^2[2-5]$/);
 await page.clock.runFor(25*1000);await expect(page.getByRole('heading',{name:'Breathe.'})).toBeVisible();await expect(page.getByText('Up next: Flutter kick.',{exact:false})).toBeVisible();
 await page.clock.runFor(5*1000);await expect(page.getByRole('heading',{name:'Flutter kick'})).toBeVisible();await expect(page.getByText('Move 2 of 4')).toBeVisible();
 await page.getByRole('button',{name:'Pause'}).click();await page.clock.runFor(30*1000);await expect(page.getByRole('heading',{name:'Flutter kick'})).toBeVisible();await page.getByRole('button',{name:'Resume'}).click();
 // The rest of the routine passes while the phone is asleep; on wake it is finished and logged once.
 await page.clock.fastForward(120*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.getByText('Abs logged')).toBeVisible();expect(box.state.days[today].sessions?.abs?.routine).toBe('Two-minute burst');expect(box.state.days[today].sessions?.abs?.seconds).toBe(115);
 expect(box.ops.filter(o=>o.type==='session'&&o.habit==='abs')).toHaveLength(1);
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('Done · Two-minute burst')).toBeVisible();
});
test('meditation and focus are optional: they log minutes and never change the streak',async({page})=>{
 slowClock();
 const today=todayIn();let s=seed(4);for(let i=1;i<=3;i++)s=complete(s,addDays(today,-i));const box=await openAt(page,s,at(today,'09:00:00'));
 await expect(page.getByRole('button',{name:/^3 day streak/})).toBeVisible();
 await page.getByRole('button',{name:'Open meditate timer'}).click();await page.getByRole('button',{name:'3 min'}).click();await page.getByRole('button',{name:'Start 3 minutes'}).click();await page.clock.runFor(2000);await page.clock.fastForward(3*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.getByText('3 min logged today.')).toBeVisible();await expect.poll(()=>box.state.days[today]?.meditate).toBe(180);// the full chosen length is credited when the countdown completes; the screen is optimistic, so the account is read once its answer lands
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('3 min today')).toBeVisible();
 await page.getByRole('button',{name:'Open focus timer'}).click();await page.getByLabel('Work minutes',{exact:true}).selectOption('15');await page.getByLabel('Break minutes',{exact:true}).selectOption('3');await page.getByRole('button',{name:'Start focus'}).click();
 await page.clock.runFor(2000);await page.clock.fastForward(15*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.getByText(/15 min focused today/)).toBeVisible();await expect.poll(()=>box.state.days[today]?.focus).toBe(900);
 await page.clock.fastForward(18*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.getByText(/30 min focused today/)).toBeVisible();await expect.poll(()=>box.state.days[today]?.focus).toBe(1800);
 await page.getByRole('button',{name:'End session'}).click();
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByRole('button',{name:/^3 day streak/})).toBeVisible();await expect(page.getByText('0 of 7 today')).toBeVisible();
});
test('treats are user-chosen, cost points, refuse when short, redeem once per tap, and undo',async({page})=>{
 const today=todayIn();let s=seed(4);for(let i=1;i<=2;i++)s=complete(s,addDays(today,-i));const box=await open(page,s,{hash:'rewards'});
 await expect(page.getByText('200 points',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Edit'}).click();await page.getByLabel('Treat',{exact:true}).fill('Film night');await page.getByLabel('Points',{exact:true}).fill('30');await page.getByRole('button',{name:'Add treat'}).click();await page.getByLabel('Treat',{exact:true}).fill('Weekend away');await page.getByLabel('Points',{exact:true}).fill('900');await page.getByRole('button',{name:'Add treat'}).click();await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.getByRole('button',{name:'Redeem Weekend away'})).toBeDisabled();await expect(page.getByRole('button',{name:'Redeem Weekend away'})).toHaveText('700 more');
 await page.getByRole('button',{name:'Redeem Film night'}).dblclick();await expect(page.getByText('170 points',{exact:true})).toBeVisible();expect(Object.keys(box.state.days[today].redeemed??{})).toHaveLength(1);
 await page.waitForTimeout(1500);await page.getByRole('button',{name:'Redeem Film night'}).click();await expect(page.getByText('140 points',{exact:true})).toBeVisible();expect(Object.keys(box.state.days[today].redeemed??{})).toHaveLength(2);
 await page.getByRole('button',{name:'Remove redemption for Film night'}).first().click();
 await page.getByRole('button',{name:'Remove redemption for Film night'}).click();await expect(page.getByText('200 points',{exact:true})).toBeVisible();expect(Object.keys(box.state.days[today].redeemed??{})).toHaveLength(0);
 // Undoing a habit after spending never shows a negative balance; the card explains it instead.
 await page.waitForTimeout(1500);for(let i=0;i<5;i++){await page.getByRole('button',{name:'Redeem Film night'}).click();await page.waitForTimeout(1500);}await expect(page.getByText('50 points',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Home'}).click();await page.getByRole('button',{name:/day streak\. Open progress/}).click();for(const d of [1,2]){await page.getByLabel('Open any past day').fill(addDays(today,-d));await page.getByRole('button',{name:'Backfill this day'}).click();for(const h of ['walk','workout','abs','floss'])await page.getByRole('checkbox',{name:`${h[0].toUpperCase()}${h.slice(1)} complete`}).click();await page.getByRole('button',{name:'Back to today'}).click();await page.evaluate(()=>{location.hash='progress';});}await page.evaluate(()=>{location.hash='rewards';});await expect(page.getByText('0 points',{exact:true})).toBeVisible();await expect(page.getByText(/ahead of the earned total after completion changes; nothing is owed/)).toBeVisible();
});
test('units switch between lb/ft-in and kg/cm without changing the stored measurement; weigh-ins convert on entry',async({page})=>{
 const box=await open(page,seed(),{hash:'you'});
 await expect(page.getByText('143.3 lb and 5′ 5″ right now.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'kg',exact:true}).click();await page.getByRole('button',{name:'cm',exact:true}).click();await expect(page.getByText('65 kg and 165 cm right now.',{exact:false})).toBeVisible();
 expect(box.state.profile?.weight).toBe(65);expect(box.state.profile?.units).toEqual({weight:'kg',height:'cm'});
 await page.getByRole('button',{name:'Weigh in'}).click();await expect(page.getByLabel('Today’s weight · kg')).toBeVisible();await page.getByLabel('Today’s weight · kg').fill('66');await page.getByRole('button',{name:'Save',exact:true}).click();
 expect(Object.values(box.state.weights)).toEqual([66]);
 await page.getByRole('button',{name:'lb',exact:true}).click();await expect(page.getByText('143.3 lb and 165 cm right now.',{exact:false})).toBeVisible();expect(box.state.profile?.weight).toBe(65);expect(Object.values(box.state.weights)).toEqual([66]);
 await page.getByRole('button',{name:'Weigh in'}).click();await expect(page.getByLabel('Today’s weight · lb')).toBeVisible();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Your details'}).click();await expect(page.getByLabel('Weight · lb')).toHaveValue('143.3');await expect(page.getByLabel('Height · cm')).toHaveValue('165');
});
test('local midnight rolls the day over; a timer started before midnight credits the day it began',async({page})=>{
 slowClock();
 const today=todayIn();const tomorrow=addDays(today,1);let s=seed(3);for(let i=1;i<=2;i++)s=complete(s,addDays(today,-i));
 const box=await openAt(page,s,at(today,'23:57:00'),'walk');
 await page.getByRole('button',{name:'Start'}).click();await page.clock.runFor(5*60*1000);
 // It is now 00:02 the next day. The date in the top bar has moved on; the timer is still counting.
 await expect(page.locator('.dial-time')).toHaveText(/^5:[0-2]\d$/);await page.getByRole('button',{name:'Finish'}).click();
 expect(box.state.days[today].sessions?.walk?.seconds).toBeGreaterThanOrEqual(300);expect(box.state.days[tomorrow]).toBeUndefined();
 await page.getByRole('button',{name:'Home'}).click();
 await expect(page.locator('.topbar .date')).toHaveText(new Intl.DateTimeFormat('en',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(tomorrow+'T12:00:00Z')));
 await expect(page.getByText('0 of 7 today')).toBeVisible();
 // Yesterday was left unfinished (only the walk), so the streak of two closed days is now broken and shows zero.
 await expect(page.getByRole('button',{name:/^0 day streak/})).toBeVisible();
});
test('a rest day yesterday keeps the streak across midnight where a miss would have broken it',async({page})=>{
 const today=todayIn();let s=seed(3);for(let i=1;i<=2;i++)s=complete(s,addDays(today,-i));s=apply(s,op(today,{type:'rest',value:true}));
 await openAt(page,s,at(today,'23:59:00'));await expect(page.getByRole('button',{name:/^2 day streak/})).toBeVisible();
 await page.clock.runFor(2*60*1000);await expect(page.getByText('0 of 7 today')).toBeVisible();await expect(page.getByRole('button',{name:/^2 day streak/})).toBeVisible();
});
test('backfilling a past day from Progress opens the activity pages in backfill mode',async({page})=>{
 const today=todayIn();const past=addDays(today,-2);const box=await open(page,seed(5),{hash:'progress'});
 await page.getByLabel('Open any past day').fill(past);await page.getByRole('button',{name:'Backfill this day'}).click();
 await expect(page.getByText('Editing')).toBeVisible();await page.getByRole('button',{name:'Open walk',exact:true}).click();await page.getByRole('checkbox',{name:'Walk complete'}).click();await expect(page.getByRole('checkbox',{name:'Walk complete',checked:true})).toBeVisible();
 expect(box.state.days[past].checks.walk).toBe(true);expect(box.state.days[past].backfilled).toBe(true);
 await page.getByRole('button',{name:'Back to today'}).click();await expect(page.getByText('Editing')).toHaveCount(0);
});
test('milestones show reached streaks and the next one',async({page})=>{
 const today=todayIn();let s=seed(8);for(let i=1;i<=7;i++)s=complete(s,addDays(today,-i));await open(page,s,{hash:'progress'});
 await expect(page.getByLabel(/^3 day streak reached/)).toBeVisible();await expect(page.getByLabel(/^7 day streak reached/)).toBeVisible();await expect(page.getByLabel('14 day streak not yet')).toBeVisible();
 await expect(page.getByText('2 of 8 milestones. Next: 14 days.')).toBeVisible();
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('7 days to 14')).toBeVisible();
});
test('keyboard: tabbing reaches every control in order with a visible focus ring, and Enter logs',async({page,browserName})=>{
 await openAt(page,seed(),at(todayIn(),'14:00:00'));
 // WebKit moves focus between buttons with Option-Tab, as Safari does by default.
 const tab=browserName==='webkit'?'Alt+Tab':'Tab';
 const order:string[]=[];
 for(let i=0;i<8;i++){await page.keyboard.press(tab);order.push(await page.evaluate(()=>{const el=document.activeElement as HTMLElement;const s=getComputedStyle(el);return `${el.getAttribute('aria-label')??el.textContent?.trim().slice(0,20)}|${s.outlineStyle}|${parseFloat(s.outlineWidth)}`;}));}
 expect(order.map(o=>o.split('|')[0])).toEqual(['6 day streak. Open progress'.replace('6','0'),'Settings','Open workout. 0 of 7 habits done today','Open walk','Walk complete','Open workout','Workout complete','Open abs']);
 for(const o of order){const [,style,width]=o.split('|');expect(style,o).not.toBe('none');expect(Number(width),o).toBeGreaterThan(0);}
 for(let i=0;i<3;i++)await page.keyboard.press('Shift+'+tab);await page.keyboard.press('Enter');await expect(page.getByRole('checkbox',{name:'Walk complete'})).toHaveAttribute('aria-checked','true');
 await page.getByRole('button',{name:'Log a meal'}).focus();await page.keyboard.press('Enter');await expect(page.getByLabel('What did you eat?')).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(0);
});
test('text contrast meets WCAG AA on every page',async({page})=>{
 await open(page,seed());
 const audit=async(name:string)=>page.evaluate((name:string)=>{
  const parse=(c:string)=>{const m=c.match(/[\d.]+/g)!.map(Number);return {r:m[0],g:m[1],b:m[2],a:m[3]??1};};
  const lum=({r,g,b}:{r:number;g:number;b:number})=>{const f=(v:number)=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};return .2126*f(r)+.7152*f(g)+.0722*f(b);};
  const blend=(fg:{r:number;g:number;b:number;a:number},bg:{r:number;g:number;b:number})=>({r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a)});
  const out:{page:string;text:string;ratio:number;need:number;fg:string;bg:string}[]=[];
  for(const el of document.querySelectorAll<HTMLElement>('body *')){
   if(el.closest('svg')||el.closest('dialog:not([open])'))continue;
   const text=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent?.trim()).join('');if(!text)continue;
   const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;const s=getComputedStyle(el);if(s.visibility==='hidden'||Number(s.opacity)===0)continue;
   let node:HTMLElement|null=el;let bg:{r:number;g:number;b:number}|null=null;let overArt=false;
   while(node){const c=parse(getComputedStyle(node).backgroundColor);if(c.a>0){bg=bg?bg:c.a===1?c:blend(c,{r:244,g:238,b:230});if(c.a===1)break;}if(node.classList.contains('progress-hero')){if(!bg)overArt=true;break;}if(node.classList.contains('hero')||node.classList.contains('stage'))break;node=node.parentElement;}
   if(overArt)continue;bg??={r:244,g:238,b:230};
   const fg=blend(parse(s.color),bg);const l1=lum(fg),l2=lum(bg);const ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
   const size=parseFloat(s.fontSize);const bold=Number(s.fontWeight)>=700;const large=size>=24||(bold&&size>=18.66);const need=large?3:4.5;
   let disabled=false;for(let n:HTMLElement|null=el;n;n=n.parentElement)if(n instanceof HTMLButtonElement&&n.disabled)disabled=true;
   if(disabled)continue;
   if(ratio<need)out.push({page:location.hash||'home',text:text.slice(0,30),ratio:Math.round(ratio*100)/100,need,fg:s.color,bg:`rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`});
  }
  return {page:name,failures:out};
 },name);
 const results=[];
 for(const hash of ['','walk','workout','abs','floss','water','food','rest','meditate','focus','rewards','progress','you','rules']){await page.evaluate(h=>{location.hash=h;},hash);await page.waitForTimeout(200);results.push(await audit(hash||'home'));}
 await page.evaluate(()=>{location.hash='abs';});await page.getByRole('button',{name:/Classic five/}).click();results.push(await audit('abs-guided'));await page.getByRole('button',{name:'Stop without logging'}).click();
 await page.evaluate(()=>{location.hash='';});await page.getByRole('button',{name:'Log a meal'}).click();results.push(await audit('meal sheet'));await page.keyboard.press('Escape');
 await writeFile('evidence/my-wellness/contrast-audit.json',JSON.stringify({standard:'WCAG 2.1 AA: 4.5:1 normal text, 3:1 large text; only the progress hero numeral (over a gradient) and disabled controls are excluded; hero and stage copy sit on white cards and are measured',results},null,2));
 for(const r of results)expect(r.failures,r.page).toEqual([]);
});
test('a running timer is visible from the dashboard and a duplicate finish cannot log twice',async({page})=>{
 const today=todayIn();const box=await openAt(page,seed(),at(today,'12:00:00'),'meditate');
 await page.getByRole('button',{name:'Start 5 minutes'}).click();await page.clock.runFor(60*1000);await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText(/Running · 1:[0-2]\d/)).toBeVisible();
 await page.getByRole('button',{name:'Open meditate',exact:true}).click();await page.getByRole('button',{name:'Finish early'}).dblclick();
 expect(box.ops.filter(o=>o.type==='meditate')).toHaveLength(1);expect(box.state.days[today].meditate).toBeGreaterThanOrEqual(60);expect(box.state.days[today].meditate).toBeLessThan(90);
});
// Review round 1 regressions.
test('logging from the dashboard while a timer runs finishes that session with its time and ticks; unchecking preserves the session',async({page})=>{
 slowClock();
 const today=todayIn();const box=await openAt(page,seed(),at(today,'18:00:00'),'workout');
 await page.getByRole('checkbox',{name:'Squats'}).check();await page.getByRole('checkbox',{name:'Plank'}).check();await page.clock.runFor(9*60*1000);
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText(/Running · 9:0\d/)).toBeVisible();
 await page.getByRole('checkbox',{name:'Workout complete'}).click();await expect(page.getByText('Done · 2 moves')).toBeVisible();
 expect(box.state.days[today].sessions?.workout?.items).toEqual(['Squats','Plank']);expect(box.state.days[today].sessions?.workout?.seconds).toBeGreaterThanOrEqual(540);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')??'{}').workout)).toBeUndefined();
 // Completion changes preserve the recorded time and moves.
 await page.getByRole('checkbox',{name:'Workout complete'}).click();expect(box.state.days[today].sessions?.workout?.items).toEqual(['Squats','Plank']);expect(box.state.days[today].checks.workout).toBe(false);
 await page.getByRole('checkbox',{name:'Workout complete'}).click();await expect(page.getByText('Done · 2 moves',{exact:true})).toBeVisible();expect(box.state.days[today].sessions?.workout?.items).toEqual(['Squats','Plank']);
 // The same for a running walk: the dashboard log finishes it rather than leaving it counting unseen.
 await page.getByRole('button',{name:'Open walk',exact:true}).click();await page.getByRole('button',{name:'Start'}).click();await page.clock.runFor(4*60*1000);await page.getByRole('button',{name:'Home'}).click();
 await page.getByRole('checkbox',{name:'Walk complete'}).click();await expect(page.getByText('Walked · 4 min')).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')??'{}').walk)).toBeUndefined();
});
test('a timer left from another day is offered for that day or discarded, never silently backfilled',async({page})=>{
 slowClock();
 const today=todayIn();const yesterday=addDays(today,-1);const s=seed(3);s.clock={zone,anchorDay:yesterday,anchorLocal:yesterday};const box=await openAt(page,s,at(yesterday,'21:00:00'),'walk');
 await page.getByRole('button',{name:'Start'}).click();await page.clock.runFor(6*60*1000);await page.getByRole('button',{name:'Pause'}).click();
 await page.clock.fastForward(12*60*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.getByText(/Walk from /)).toBeVisible();await expect(page.getByRole('button',{name:/Log to /})).toBeVisible();await expect(page.getByRole('button',{name:'Start',exact:true})).toHaveCount(0);
 await page.screenshot({path:`evidence/my-wellness/stale-timer-${test.info().project.name}.png`});
 await page.getByRole('button',{name:'Start fresh'}).click();await expect(page.getByRole('button',{name:'Start',exact:true})).toBeVisible();expect(box.state.days[yesterday]?.checks.walk).toBeUndefined();
 await page.getByRole('button',{name:'Start'}).click();await page.clock.runFor(60*1000);await page.getByRole('button',{name:'Finish'}).click();expect(box.state.days[today].checks.walk).toBe(true);
});
test('finished timers settle from any page: a meditation ends while the dashboard is open, a focus session caps itself',async({page})=>{
 const today=todayIn();const box=await openAt(page,seed(),at(today,'12:00:00'),'meditate');
 await page.getByRole('button',{name:'3 min'}).click();await page.getByRole('button',{name:'Start 3 minutes'}).click();await page.getByRole('button',{name:'Home'}).click();
 await page.clock.runFor(2000);await page.clock.fastForward(4*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.getByText('3 min today')).toBeVisible();await expect.poll(()=>box.state.days[today]?.meditate).toBe(180);
 await page.getByRole('button',{name:'Open focus timer'}).click();await page.getByLabel('Work minutes',{exact:true}).selectOption('15');await page.getByLabel('Break minutes',{exact:true}).selectOption('3');await page.getByRole('button',{name:'Start focus'}).click();await page.getByRole('button',{name:'Home'}).click();
 await page.clock.runFor(2000);await page.clock.fastForward(10*60*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.getByText(/120 min focused today/)).toBeVisible();await expect.poll(()=>box.state.days[today]?.focus,{message:JSON.stringify(box.rejected)}).toBe(8*900);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')??'{}').focus)).toBeUndefined();
});
test('re-saving your details without touching height or weight keeps the exact stored measurements',async({page})=>{
 const box=await open(page,seed(),{hash:'you'});
 await page.getByRole('button',{name:'Your details'}).click();await page.getByLabel('Age',{exact:true}).fill('31');await page.getByRole('button',{name:'Update'}).click();
 await expect.poll(()=>box.state.profile?.age).toBe(31);expect(box.state.profile?.height).toBe(165);expect(box.state.profile?.weight).toBe(65);expect(box.state.profile?.baselineWeight).toBe(65);
 // An edited weight is taken as typed.
 await page.getByRole('button',{name:'Your details'}).click();await page.getByLabel('Weight · lb').fill('150');await page.getByRole('button',{name:'Update'}).click();
 await expect.poll(()=>Math.round((box.state.profile?.weight??0)*100)/100).toBe(68.04);
});
test('in backfill mode the workout checklist is read-only and no timer starts',async({page})=>{
 const today=todayIn();const past=addDays(today,-2);await open(page,seed(5),{hash:'progress'});
 await page.getByLabel('Open any past day').fill(past);await page.getByRole('button',{name:'Backfill this day'}).click();await page.getByRole('button',{name:'Open workout',exact:true}).click();
 await expect(page.getByRole('checkbox',{name:'Squats'})).toBeDisabled();await expect(page.getByRole('checkbox',{name:'Workout complete'})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')??'{}').workout)).toBeUndefined();
});
test('the hero opens whatever comes next, water can be removed and meals can be edited from Food',async({page})=>{
 const today=todayIn();const box=await open(page,seed());
 await page.route('**/api/estimate',r=>r.fulfill({json:{items:[{name:'banana, raw',grams:120,calories:107,protein:1.3,source:'usda',match:'Bananas, raw',fdcId:173944}],calories:107,protein:1.3,model:'test'}}));
 await expect(page.getByRole('button',{name:/^Open workout\. 0 of 7/})).toBeVisible();await page.getByRole('button',{name:/^Open workout\. 0 of 7/}).click();await expect(page.getByRole('heading',{name:'Workout'})).toBeVisible();await page.getByRole('button',{name:'Home'}).click();
 await page.getByRole('checkbox',{name:'Workout complete'}).click();await expect(page.getByRole('button',{name:/^Open abs\. 1 of 7/})).toBeVisible();
 await page.getByRole('button',{name:'Add a Stanley'}).click();await page.getByRole('button',{name:'Add a Stanley'}).click();await expect(page.getByText('2 of 2¼ Stanleys · 60 oz')).toBeVisible();
 await page.getByRole('button',{name:'Remove last pour'}).click();await expect(page.getByText('1 of 2¼ Stanleys · 30 oz')).toBeVisible();await expect.poll(()=>Math.round(box.state.days[today].water*100)/100).toBe(Math.round(30*29.5735295625*100)/100);
 await page.getByRole('button',{name:'Log a meal'}).click();await page.getByLabel('What did you eat?').fill('a banana');await page.getByRole('button',{name:'Look it up'}).click();await page.getByRole('button',{name:'Add to today'}).click();
 await expect(page.getByText('107 kcal · 1/105 g')).toBeVisible();await page.getByRole('button',{name:'Open food',exact:true}).click();await page.getByRole('button',{name:'Remove meal 1'}).click();await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('0 kcal · 0/105 g')).toBeVisible();expect(Object.keys(box.state.days[today].meals)).toHaveLength(0);
 await expect(page.getByRole('button',{name:'Log a meal'})).toBeVisible();
});

// Water by container.
test('half a Stanley is exactly 15 oz, twice; the fill and the daily total match; refills, ambiguity and the model fallback behave',async({page})=>{
 const today=todayIn();const box=await open(page,seed(),{hash:'water'});
 const liquidY=()=>page.locator('.water-card .liquid').evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).f);
 const before=await liquidY();
 await page.getByLabel('Or say it').fill('I drank half my Stanley');await page.getByRole('button',{name:'Read it'}).click();
 await expect(page.getByText('15 oz · half a Stanley.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Add 15 oz'}).click();
 await expect(page.locator('.water-copy .big')).toHaveText('15 oz');await expect(page.getByText('about ½ of 2¼ Stanleys',{exact:false})).toBeVisible();
 await page.waitForTimeout(1000);const mid=await liquidY();expect(mid).toBeLessThan(before);
 await page.getByLabel('Or say it').fill('half a Stanley');await page.getByRole('button',{name:'Read it'}).click();await page.getByRole('button',{name:'Add 15 oz'}).click();
 await expect(page.locator('.water-copy .big')).toHaveText('30 oz');await expect(page.getByText('about 1 of 2¼ Stanleys',{exact:false})).toBeVisible();
 await page.waitForTimeout(1000);expect(await liquidY()).toBeLessThan(mid);
 // The stored day holds two pours of exactly half a Stanley, in millilitres.
 await expect.poll(()=>box.state.days[today]?.waterLog?.map(e=>Math.round(e.ml*1000)/1000)).toEqual([443.603,443.603]);expect(box.state.days[today].waterLog?.map(e=>e.label)).toEqual(['half a Stanley','half a Stanley']);
 await expect(page.getByRole('group',{name:'Today’s pours'}).getByText('15 oz')).toHaveCount(2);
 // The dashboard says the same thing.
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('1 of 2¼ Stanleys · 30 oz')).toBeVisible();await page.getByRole('button',{name:'Open water',exact:true}).click();
 // The water page is remounted on the way back; wait for its own state to be on screen before typing (WebKit otherwise fills the input of the first paint, and the phrase is lost).
 await expect(page.locator('.water-copy .big')).toHaveText('30 oz');await expect(page.getByRole('button',{name:'Read it'})).toBeDisabled();
 // Refills, a quarter, most, the whole thing: the app multiplies; the confirmation shows the arithmetic.
 await page.getByLabel('Or say it').fill('refilled it twice');await expect(page.getByRole('button',{name:'Read it'})).toBeEnabled();await page.getByRole('button',{name:'Read it'}).click();await expect(page.getByText('60 oz · 2 Stanleys.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Not this'}).click();
 await page.getByLabel('Or say it').fill('a quarter of the Stanley');await page.getByRole('button',{name:'Read it'}).click();await expect(page.getByRole('button',{name:'Add 7.5 oz'})).toBeVisible();await page.getByRole('button',{name:'Not this'}).click();
 await page.getByLabel('Or say it').fill('most of it');await page.getByRole('button',{name:'Read it'}).click();await expect(page.getByRole('button',{name:'Add 22.5 oz'})).toBeVisible();await page.getByRole('button',{name:'Not this'}).click();
 await page.getByLabel('Or say it').fill('the whole thing');await page.getByRole('button',{name:'Read it'}).click();await expect(page.getByRole('button',{name:'Add 30 oz'})).toBeVisible();await page.getByRole('button',{name:'Not this'}).click();
 // Ambiguous: asked once, nothing logged until a share is picked.
 await page.getByLabel('Or say it').fill('some of my Stanley');await page.getByRole('button',{name:'Read it'}).click();await expect(page.getByRole('group',{name:'How much of the Stanley?'})).toBeVisible();expect(box.state.days[today].waterLog).toHaveLength(2);
 await page.getByRole('button',{name:'¼ of the Stanley'}).click();await expect(page.locator('.water-copy .big')).toHaveText('37.5 oz');
 // A phrase the parser cannot read goes to the model, which only names the container and the share; the app still does the arithmetic.
 let asked:unknown=null;await page.route('**/api/water',r=>{asked=r.request().postDataJSON();return r.fulfill({json:{container:'Stanley',fraction:0.5,count:null,model:'test'}});});
 await page.getByLabel('Or say it').fill('polished off the tumbler after yoga');await page.getByRole('button',{name:'Read it'}).click();await expect(page.getByRole('button',{name:'Add 15 oz'})).toBeVisible();expect((asked as {containers:string[]}).containers).toEqual(['Stanley','Glass']);await page.getByRole('button',{name:'Not this'}).click();
 // The model is down: ask once, never guess.
 await page.route('**/api/water',r=>r.fulfill({status:503,json:{error:'That could not be read right now.'}}));
 await page.getByLabel('Or say it').fill('polished off the tumbler after yoga');await page.getByRole('button',{name:'Read it'}).click();await expect(page.getByRole('group',{name:'How much of the Stanley?'})).toBeVisible();
 // Undo the last pour from the page.
 await page.getByRole('button',{name:'Remove last pour'}).click();await expect(page.locator('.water-copy .big')).toHaveText('30 oz');
 await page.screenshot({path:`evidence/my-wellness/water-stanley-${test.info().project.name}.png`});
});
test('containers are hers to name and size, in her unit, and the default drives the one-tap',async({page})=>{
 const today=todayIn();const box=await open(page,seed(),{hash:'you'});
 await page.getByRole('button',{name:'Water containers'}).click();await page.getByLabel('Container',{exact:true}).fill('Bottle');await page.getByLabel('Size · oz').fill('20');await page.getByRole('button',{name:'Add container'}).click();
 await expect(page.getByText('20 oz',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Make default'}).last().click();await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>box.state.profile?.containers?.map(c=>c.name)).toEqual(['Stanley','Glass','Bottle']);expect(box.state.profile?.containers?.[2].ml).toBeCloseTo(20*29.5735295625,6);
 await page.getByRole('button',{name:'Home'}).click();await page.getByRole('button',{name:'Add a Bottle'}).click();await expect(page.getByText('1 of 3½ Bottles · 20 oz')).toBeVisible();
 // Switch the display to millilitres: the stored size is untouched.
 await page.getByLabel('Settings').click();await page.getByRole('button',{name:'ml',exact:true}).click();await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('1 of 3½ Bottles · 591 ml')).toBeVisible();expect(box.state.days[today].water).toBeCloseTo(20*29.5735295625,6);
});

// Final audit repairs.
test('B1: a malformed change never strands the queue: the account refuses it by id, the valid change lands, the user sees it and can discard it after a reload',async({page})=>{
 const today=todayIn();const box=await open(page,seed(),{go:false});
 // A poison change first in the queue (as an older client or a bug could leave it), then a valid one behind it.
 const poison={id:crypto.randomUUID(),at:new Date().toISOString(),day:today,zone:'America/Los_Angeles',type:'rewards',rewards:[{id:crypto.randomUUID(),name:'Trip',cost:20000}]};
 const valid={id:crypto.randomUUID(),at:new Date().toISOString(),day:today,zone:'America/Los_Angeles',type:'check',habit:'floss',value:true};
 // Injected once (guarded by session storage) so later reloads in this test start from what the app itself persisted.
 await page.addInitScript(([p,v])=>{if(sessionStorage.getItem('poisoned'))return;sessionStorage.setItem('poisoned','1');const saved=JSON.parse(localStorage.getItem('flaccid75-v1')!);saved.pending=[p,v];localStorage.setItem('flaccid75-v1',JSON.stringify(saved));},[poison,valid]);
 await page.goto('/');await page.locator('.app-shell').waitFor();
 await expect.poll(()=>box.state.days[today]?.checks.floss).toBe(true);
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).pending.length===0);
 expect(box.ops.map(o=>o.id)).toEqual([valid.id]);
 // A further change still syncs.
 await page.getByRole('checkbox',{name:'Walk complete'}).click();await expect.poll(()=>box.state.days[today]?.checks.walk).toBe(true);
 // The refusal is visible with its reason, survives a reload, and can be discarded.
 await page.reload();await page.locator('.app-shell').waitFor();await page.getByLabel('Settings').click();
 await expect(page.getByRole('group',{name:'Changes the account refused'})).toBeVisible();await expect(page.getByText(/A change was refused: rewards\.0\.cost/).first()).toBeVisible();
 await page.getByRole('button',{name:/Discard it/}).click();await expect(page.getByRole('group',{name:'Changes the account refused'})).toHaveCount(0);
 await page.reload();await page.locator('.app-shell').waitFor();await page.getByLabel('Settings').click();await expect(page.getByRole('group',{name:'Changes the account refused'})).toHaveCount(0);
 // A batch the server cannot read at all is not retried forever: the head is set aside and the queue moves on.
 await page.route('**/api/sync',r=>r.fulfill({status:400,json:{error:'A batch must be 1 to 100 changes.'}}),{times:1});
 await page.getByRole('button',{name:'Home'}).click();await page.getByRole('checkbox',{name:'Abs complete'}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).pending.length===0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).failed.length)).toBe(1);
});
test('B1: ordinary input cannot queue a refused change: treats, plan lines and estimate totals are bounded in the form',async({page})=>{
 const today=todayIn();const box=await open(page,seed(),{hash:'rewards'});
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Treat',{exact:true}).fill('Trip');await page.getByLabel('Points',{exact:true}).fill('20000');await page.getByRole('button',{name:'Add treat'}).click();
 await expect(page.getByText('Points must be a whole number from 1 to 10,000.')).toBeVisible();await page.getByLabel('Points',{exact:true}).fill('10000');await page.getByRole('button',{name:'Add treat'}).click();await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>box.state.profile?.rewards?.[0]?.cost).toBe(10000);expect(box.ops.every(o=>o.type!=='rewards'||o.rewards.every(r=>r.cost<=10000))).toBe(true);
 await page.getByLabel('Settings').click();await page.getByRole('button',{name:'Workout plan'}).click();await page.getByLabel('One move per line').fill('x'.repeat(80)+'\nRows');await page.getByRole('button',{name:'Save plan'}).click();
 await expect.poll(()=>box.state.profile?.plan?.[0]?.length).toBe(60);
 await page.route('**/api/estimate',r=>r.fulfill({json:{items:[{name:'lard',grams:5000,calories:9000,protein:0,source:'estimate'},{name:'more lard',grams:5000,calories:9000,protein:0,source:'estimate'}],calories:18000,protein:0,model:'test'}}));
 await page.getByRole('button',{name:'Home'}).click();await page.getByRole('button',{name:'Log a meal'}).click();await page.getByLabel('What did you eat?').fill('a lot');await page.getByRole('button',{name:'Look it up'}).click();await page.getByRole('button',{name:'Add to today'}).click();
 await expect(page.getByText('A meal must be 0–10,000 kcal and 0–1,000 g protein.')).toBeVisible();expect(Object.keys(box.state.days[today]?.meals??{})).toHaveLength(0);
 await page.getByLabel('Calories · kcal').first().fill('-40');expect(await page.getByLabel('Calories · kcal').first().inputValue()).toBe('0');
});
test('B2: a re-save keeps exact stored measurements only for untouched fields; a one-centimetre or a tenth-of-a-pound edit is taken as typed',async({page})=>{
 const box=await open(page,seed(),{hash:'you'});
 await page.getByRole('button',{name:'Your details'}).click();await page.getByLabel('Age',{exact:true}).fill('31');await page.getByRole('button',{name:'Update'}).click();
 await expect.poll(()=>box.state.profile?.age).toBe(31);expect(box.state.profile?.height).toBe(165);expect(box.state.profile?.weight).toBe(65);
 await page.getByRole('button',{name:'Your details'}).click();await page.getByLabel('Weight · lb').fill('143.4');await page.getByRole('button',{name:'Update'}).click();
 await expect.poll(()=>Math.round((box.state.profile?.weight??0)*10000)/10000).toBe(Math.round(143.4*0.45359237*10000)/10000);
 await page.getByRole('button',{name:'kg',exact:true}).click();await page.getByRole('button',{name:'cm',exact:true}).click();
 await page.getByRole('button',{name:'Your details'}).click();await page.getByLabel('Height · cm').fill('166');await page.getByRole('button',{name:'Update'}).click();
 await expect.poll(()=>box.state.profile?.height).toBe(166);
 // Untouched again, in metric: exact values survive another save.
 await page.getByRole('button',{name:'Your details'}).click();await page.getByLabel('Age',{exact:true}).fill('32');await page.getByRole('button',{name:'Update'}).click();
 await expect.poll(()=>box.state.profile?.age).toBe(32);expect(box.state.profile?.height).toBe(166);expect(Math.round((box.state.profile?.weight??0)*10000)/10000).toBe(Math.round(143.4*0.45359237*10000)/10000);
});
test('B3: the sound switch and the sheet dialogs have accessible names',async({page})=>{
 await open(page,seed(),{hash:'you'});
 await expect(page.getByRole('switch',{name:'Sound cues'})).toBeVisible();
 await page.getByRole('button',{name:'Daily targets'}).click();await expect(page.getByRole('dialog',{name:'Daily targets'})).toBeVisible();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Weigh in',exact:true}).click();await expect(page.getByRole('dialog',{name:'Weigh in'})).toBeVisible();await page.keyboard.press('Escape');
 await page.evaluate(()=>{location.hash='progress';});await expect(page.getByRole('tabpanel',{name:'Week'})).toBeVisible();await page.getByRole('tab',{name:'Trends'}).click();await expect(page.getByRole('tabpanel',{name:'Trends'})).toBeVisible();
});
test('two tabs settling the same meditation credit it once',async({page,context})=>{
 const today=todayIn();const box=await openAt(page,seed(),at(today,'12:00:00'),'meditate');
 await page.getByRole('button',{name:'3 min'}).click();await page.getByRole('button',{name:'Start 3 minutes'}).click();
 // A second tab on the same device shares the stored timer and the queue.
 // The second tab shares the device's storage (and so the running timer and the queue) and talks to the same mocked account.
 const other=await context.newPage();await mock(other,box);await other.clock.install({time:at(today,'12:00:05')});await other.goto('/#meditate');await other.locator('.app-shell').waitFor();await other.getByRole('button',{name:'Finish early'}).waitFor();
 // Both tabs wake at once and both try to settle the finished timer.
 await page.clock.fastForward(4*60*1000);await other.clock.fastForward(4*60*1000);
 await Promise.all([page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))),other.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')))]);
 await expect.poll(()=>box.state.days[today]?.meditate,{timeout:10000}).toBe(180);
 // Give a second, duplicate settlement every chance to arrive, then check the account applied one and both tabs show one.
 await page.waitForTimeout(2500);expect(box.ops.filter(o=>o.type==='meditate')).toHaveLength(1);expect(box.state.days[today]?.meditate).toBe(180);
 await expect(page.getByText('3 min logged today.',{exact:false}).or(page.getByText('3 min today'))).toBeVisible();
 await other.close();
});
test('optional timers cannot be started for a past day',async({page})=>{
 const today=todayIn();const past=addDays(today,-2);await open(page,seed(5),{hash:'progress'});
 await page.getByLabel('Open any past day').fill(past);await page.getByRole('button',{name:'Backfill this day'}).click();
 await page.getByRole('button',{name:'Open meditate',exact:true}).click();await expect(page.getByRole('button',{name:/Start \d+ minutes/})).toHaveCount(0);await expect(page.getByText('Timers run for today only.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Home'}).click();await page.getByRole('button',{name:'Open focus',exact:true}).click();await expect(page.getByRole('button',{name:'Start focus'})).toHaveCount(0);
});
test('H1: hero and stage copy, chips and pills never overlap, at phone and short-phone sizes',async({page})=>{
 const today=todayIn();let s=seed(8);for(let i=1;i<=7;i++)s=complete(s,addDays(today,-i));
 const box=await open(page,s,{go:false});void box;
 const overlaps=(sel:string[])=>page.evaluate(sel=>{const els=sel.flatMap(q=>[...document.querySelectorAll<HTMLElement>(q)]).filter(e=>e.getBoundingClientRect().width>0);const out:string[]=[];for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i].getBoundingClientRect(),b=els[j].getBoundingClientRect();const x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(x>1&&y>1)out.push(`${els[i].className}×${els[j].className} ${Math.round(x)}×${Math.round(y)}`);}return out;},sel);
 for(const [w,h] of [[390,844],[375,640],[320,568]]){await page.setViewportSize({width:w,height:h});
  for(const hash of ['','abs','workout','floss','walk','rest']){await page.goto('/'+(hash?'#'+hash:''));await page.locator('.app-shell').waitFor();await page.waitForTimeout(300);
   expect(await overlaps(['.hero-copy','.hero-tag','.hero-progress','.stage-copy','.stage-tag']),`${w}x${h} ${hash||'home'}`).toEqual([]);
   // The hero's own words all sit inside the hero, fully visible.
   expect(await page.evaluate(()=>{const hero=document.querySelector('.hero')?.getBoundingClientRect();if(!hero)return 0;return [...document.querySelectorAll<HTMLElement>('.hero-copy,.hero-tag,.hero-progress')].map(e=>e.getBoundingClientRect()).filter(r=>r.left<hero.left-1||r.right>hero.right+1||r.top<hero.top-1||r.bottom>hero.bottom+1).length;}),`${w}x${h} ${hash||'home'} inside`).toBe(0);}}
});
test('Floss has one completion toggle that checks and unchecks',async({page})=>{
 const today=todayIn();const box=await open(page,seed(),{hash:'floss'});
 await page.getByRole('checkbox',{name:'Floss complete'}).click();await expect(page.getByRole('checkbox',{name:'Floss complete',checked:true})).toBeVisible();await expect.poll(()=>box.state.days[today]?.checks.floss).toBe(true);
 await page.getByRole('checkbox',{name:'Floss complete'}).click();await expect(page.getByRole('checkbox',{name:'Floss complete',checked:false})).toBeVisible();await expect.poll(()=>box.state.days[today]?.checks.floss).toBe(false);
 // Past days say so, on the dashboard and on the page.
 await page.evaluate(()=>{location.hash='progress';});await page.getByLabel('Open any past day').fill(addDays(today,-1));await page.getByRole('button',{name:'Backfill this day'}).click();
 await expect(page.getByText('Once that day')).toBeVisible();await expect(page.getByText('0 of 7 that day')).toBeVisible();await page.getByRole('button',{name:'Open walk',exact:true}).click();await expect(page.getByText('A walk that day.')).toBeVisible();
});
// Review 162 regressions.
test('R1: two focus sessions on one day credit 25 + 25 = 50 minutes, after a reload and after an offline replay',async({page,context})=>{
 slowClock();
 const today=todayIn();const box=await openAt(page,seed(),at(today,'09:00:00'),'focus');
 const runOne=async()=>{await page.getByLabel('Work minutes',{exact:true}).selectOption('25');await page.getByLabel('Break minutes',{exact:true}).selectOption('5');await page.getByRole('button',{name:'Start focus'}).click();await page.clock.runFor(2000);await page.clock.fastForward(26*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.getByText(/1 finished this run/)).toBeVisible();await page.getByRole('button',{name:'End session'}).click();};
 await runOne();await expect.poll(()=>box.state.days[today]?.focus).toBe(1500);
 await runOne();await expect(page.getByText(/50 min focused today/)).toBeVisible();await expect.poll(()=>box.state.days[today]?.focus).toBe(3000);
 expect(new Set(box.ops.filter(o=>o.type==='focus').map(o=>o.id)).size).toBe(2);
 await page.reload();await page.locator('.app-shell').waitFor();await expect(page.getByText(/50 min focused today/)).toBeVisible();
 // A third session finishes offline; its block is queued with its own id and replays once the device is back.
 await context.setOffline(true);await runOne();await expect(page.getByText(/75 min focused today/)).toBeVisible();expect(box.state.days[today]?.focus).toBe(3000);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).pending.length)).toBe(1);
 await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await expect.poll(()=>box.state.days[today]?.focus).toBe(4500);expect(box.ops.filter(o=>o.type==='focus')).toHaveLength(3);
});
test('R4: a walk left running for 26 hours finishes as a 24-hour session; the timer clears only once the change is accepted',async({page})=>{
 const today=todayIn();const box=await openAt(page,seed(3),at(today,'08:00:00'),'walk');
 await page.getByRole('button',{name:'Start'}).click();await page.clock.runFor(2000);await page.clock.fastForward(26*60*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.getByText('Sessions over 24 hours log as 24 hours.',{exact:false})).toBeVisible();
 // It is now the next day; the session credits the day it started on, capped at 24 hours, and the page returns to ready.
 await page.getByRole('button',{name:'Finish'}).click();await expect(page.getByRole('button',{name:'Start',exact:true})).toBeVisible();
 await expect.poll(()=>box.state.days[today]?.sessions?.walk?.seconds).toBe(86400);expect(box.state.days[today]?.checks.walk).toBe(true);expect(box.rejected).toEqual([]);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')??'{}').walk)).toBeUndefined();
});
test('R3: a slow sync in one tab cannot erase a change another tab queued meanwhile',async({page,context})=>{
 const today=todayIn();const box=await open(page,seed());
 // Tab A syncs slowly: every sync response is held for three seconds.
 await page.route('**/api/sync',async r=>{await new Promise(res=>setTimeout(res,3000));const raw=r.request().postDataJSON();const {validateBatch}=await import('../../lib/validation');const {apply}=await import('../../lib/domain');const batch=validateBatch(raw)!;for(const o of batch.valid){if(box.seen.has(o.id))continue;box.state=apply(box.state,o);box.ops.push(o);box.seen.add(o.id);}return r.fulfill({json:{state:box.state,accepted:batch.valid.map(o=>o.id),rejected:batch.invalid}});});
 // Tab B is cut off from the account entirely.
 const other=await context.newPage();await other.route('**/api/sync',r=>r.abort());await other.route('**/api/state',r=>r.fulfill({json:box.state}));await other.goto('/');await other.locator('.home-view').waitFor();
 await page.getByRole('checkbox',{name:'Walk complete'}).click();await page.waitForTimeout(300);
 await other.getByRole('checkbox',{name:'Floss complete'}).click();await expect(other.getByRole('checkbox',{name:'Floss complete'})).toHaveAttribute('aria-checked','true');
 await expect.poll(()=>box.state.days[today]?.checks.walk,{timeout:10000}).toBe(true);await page.waitForTimeout(500);
 // A's slow sync has completed and saved. B's floss must still be in the device queue and on screen in both tabs.
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!));
 expect(saved.pending.some((o:{type:string;habit?:string})=>o.type==='check'&&o.habit==='floss')).toBe(true);
 await expect(page.getByRole('checkbox',{name:'Floss complete'})).toHaveAttribute('aria-checked','true');await expect(other.getByRole('checkbox',{name:'Floss complete'})).toHaveAttribute('aria-checked','true');
 // B closes without ever syncing; A reloads: floss is still there, and A's next sync delivers it.
 await other.close();await page.reload();await page.locator('.app-shell').waitFor();await expect(page.getByRole('checkbox',{name:'Floss complete'})).toHaveAttribute('aria-checked','true');
 await expect.poll(()=>box.state.days[today]?.checks.floss,{timeout:15000}).toBe(true);
});
test('R2: a pour from a long-named container logs with a trimmed label, and a refusal shows at the action',async({page})=>{
 const today=todayIn();const box=await open(page,seed(),{hash:'water'});
 await page.getByRole('button',{name:'Containers',exact:true}).click();const sheet=page.getByRole('dialog');await sheet.getByLabel('Container',{exact:true}).fill('Stanley Quencher 40 oz');await sheet.getByLabel('Size · oz').fill('40');await sheet.getByRole('button',{name:'Add container'}).click();await sheet.getByRole('button',{name:'Save',exact:true}).click();
 await page.getByRole('button',{name:/Stanley Quencher 40 oz · 40 oz/}).click();await page.getByRole('button',{name:'Log three quarters of a Stanley Quencher 40 oz'}).click();
 await expect(page.locator('.water-copy .big')).toHaveText('30 oz');await expect.poll(()=>box.state.days[today]?.waterLog?.length).toBe(1);
 const entry=box.state.days[today].waterLog![0];expect(entry.label!.length).toBeLessThanOrEqual(60);expect(entry.label).toContain('Stanley Quencher 40 oz');expect(box.rejected).toEqual([]);
 await page.getByLabel('Or say it').fill('three quarters of my Stanley Quencher 40 oz');await page.getByRole('button',{name:'Read it'}).click();await page.getByRole('button',{name:'Add 30 oz'}).click();await expect(page.locator('.water-copy .big')).toHaveText('60 oz');
 // A refused pour (an impossible amount forced into the queue path) shows its reason on the page, not only in Settings.
 // The account holds a container the form could never create (9,000 ml); the next sync brings it down and a full pour of it is refused by the bounds.
 box.state={...box.state,profile:{...box.state.profile!,containers:[{id:'vat',name:'Vat',ml:9000}],defaultContainer:'vat'}};await page.reload();await page.locator('.app-shell').waitFor();await page.getByRole('button',{name:'Log a Vat'}).waitFor();
 await page.getByRole('button',{name:'Log a Vat'}).click();await expect(page.locator('.pour-card .form-error')).toContainText('Outside the range the app accepts.');expect(box.state.days[today].waterLog).toHaveLength(2);
});
test('R-extra: switching the weight unit after typing does not reinterpret the number; a refused queued change does not block unlock',async({page,context})=>{
 const box=await open(page,seed(),{hash:'you'});
 await page.getByRole('button',{name:'Your details'}).click();await page.getByLabel('Weight · lb').fill('150');await page.getByRole('button',{name:'kg · cm'}).click();
 await expect(page.getByLabel('Weight · kg',{exact:true})).toHaveValue('65');await page.getByRole('button',{name:'Update'}).click();await expect.poll(()=>box.state.profile?.weight).toBe(65);
 // The device is locked with the real control (the app clears its store and stops writing), so no live save can race the fixture below.
 await page.route('**/api/auth',r=>r.fulfill({json:{ok:true}}));await page.getByRole('button',{name:'Lock this device',exact:true}).click();await page.getByRole('button',{name:'Lock and clear',exact:true}).click();await page.getByLabel('Passphrase').waitFor();
 const generation=await page.evaluate(()=>localStorage.getItem('my-wellness-generation'));await page.close();
 // With no page running, the device is given a locked snapshot that still holds a queued change the account will refuse (a redeem beyond the balance), as after an expired session.
 const today=todayIn();const bad={id:crypto.randomUUID(),at:new Date().toISOString(),day:today,zone:'America/Los_Angeles',type:'redeem',rewardId:crypto.randomUUID(),name:'Trip',cost:9000};const state=box.state;
 const again=await context.newPage();await mock(again,box);await again.route('**/api/auth',r=>r.fulfill({json:{ok:true}}));
 await again.addInitScript(({state,bad,generation})=>{if(sessionStorage.getItem('poisoned'))return;sessionStorage.setItem('poisoned','1');localStorage.removeItem('my-wellness-locked');localStorage.removeItem('my-wellness-logout');if(generation!==null)localStorage.setItem('my-wellness-generation',generation);localStorage.setItem('flaccid75-v1',JSON.stringify({state,pending:[bad],failed:[],discarded:[],acked:[],unlocked:false}));localStorage.setItem('my-wellness-op:'+bad.id,JSON.stringify(bad));},{state,bad,generation});
 await again.goto('/');await again.getByLabel('Passphrase').fill('test-only');await again.getByRole('button',{name:'Open'}).click();
 await expect(again.locator('.app-shell')).toBeVisible();await again.evaluate(()=>{location.hash='you';});await expect(again.getByRole('switch',{name:'Sound cues'})).toBeVisible();await expect(again.getByText('Connect to the internet',{exact:false})).toHaveCount(0);await expect(again.getByLabel('Passphrase')).toHaveCount(0);
 // The account refuses exactly that change; nothing is redeemed; the device sets it aside and lists it, with nothing left pending.
 await expect.poll(()=>box.rejected.map(r=>r.id)).toEqual([bad.id]);expect(box.state.days[today]?.redeemed??{}).toEqual({});expect(box.ops.filter(o=>o.type==='redeem')).toHaveLength(0);
 await expect.poll(()=>again.evaluate(()=>{const s=JSON.parse(localStorage.getItem('flaccid75-v1')!);return {pending:s.pending.length,failed:s.failed.map((f:{op:{id:string}})=>f.op.id)};})).toEqual({pending:0,failed:[bad.id]});
 await expect(again.getByRole('group',{name:'Changes the account refused'})).toBeVisible();
 await again.close();
});
// Review 163 regressions.
test('R163-1: when device storage refuses the write, an automatically finishing timer and a manual finish both keep their timer and retry once storage is back',async({page})=>{
 slowClock();
 const today=todayIn();const box=await openAt(page,seed(),at(today,'12:00:00'),'meditate');
 // Storage refuses writes of the app store (as a full device would) while the flag is set; timer writes still succeed. The hook is on Storage.prototype, which both Chromium and WebKit honour (WebKit ignores an own property set on the localStorage instance).
 await page.evaluate(()=>{const w=window as unknown as {__refuse:boolean};w.__refuse=false;const orig=Storage.prototype.setItem;Storage.prototype.setItem=function(this:Storage,k:string,v:string){if(this===localStorage&&w.__refuse&&(k==='flaccid75-v1'||k.startsWith('my-wellness-op:')))throw new DOMException('quota','QuotaExceededError');orig.call(this,k,v);};});
 await page.getByRole('button',{name:'3 min'}).click();await page.getByRole('button',{name:'Start 3 minutes'}).click();
 await page.evaluate(()=>{(window as unknown as {__refuse:boolean}).__refuse=true;});
 await page.clock.runFor(2000);await page.clock.fastForward(4*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.clock.runFor(2500);
 await expect(page.getByRole('button',{name:/Finish early/})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')??'{}').meditate)).toBeTruthy();expect(box.state.days[today]?.meditate).toBeUndefined();
 await page.evaluate(()=>{(window as unknown as {__refuse:boolean}).__refuse=false;});await page.clock.runFor(2500);
 await expect.poll(()=>box.state.days[today]?.meditate).toBe(180);expect(box.ops.filter(o=>o.type==='meditate')).toHaveLength(1);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')??'{}').meditate)).toBeUndefined();
 // A focus block refused by storage is not marked logged, and lands once, when storage is back.
 await page.evaluate(()=>{location.hash='focus';});await page.getByLabel('Work minutes',{exact:true}).selectOption('15');await page.getByLabel('Break minutes',{exact:true}).selectOption('3');await page.getByRole('button',{name:'Start focus'}).click();
 await page.evaluate(()=>{(window as unknown as {__refuse:boolean}).__refuse=true;});await page.clock.runFor(2000);await page.clock.fastForward(16*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.clock.runFor(2500);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')!).focus.meta.logged)).toBe(0);expect(box.state.days[today]?.focus).toBeUndefined();
 await page.evaluate(()=>{(window as unknown as {__refuse:boolean}).__refuse=false;});await page.clock.runFor(2500);await expect.poll(()=>box.state.days[today]?.focus).toBe(900);expect(box.ops.filter(o=>o.type==='focus')).toHaveLength(1);
 await page.getByRole('button',{name:'End session'}).click();
 // A manual finish under refusal keeps the walk timer; it finishes once storage is back.
 await page.evaluate(()=>{location.hash='walk';});await page.getByRole('button',{name:'Start',exact:true}).click();await page.clock.runFor(60*1000);
 await page.evaluate(()=>{(window as unknown as {__refuse:boolean}).__refuse=true;});await page.getByRole('button',{name:'Finish'}).click();await expect(page.getByRole('button',{name:'Finish'})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')??'{}').walk)).toBeTruthy();
 await page.evaluate(()=>{(window as unknown as {__refuse:boolean}).__refuse=false;});await page.getByRole('button',{name:'Finish'}).click();await expect(page.getByRole('checkbox',{name:'Walk complete',checked:true})).toBeVisible();await expect.poll(()=>box.state.days[today]?.checks.walk).toBe(true);
});
test('R163-2: a refused batch during a slow sync cannot overwrite a change another tab queued and then closed on',async({page,context})=>{
 const today=todayIn();const box=await open(page,seed());
 // Tab A: the account answers every sync after three seconds with a 400.
 await page.route('**/api/sync',async r=>{await new Promise(res=>setTimeout(res,3000));await r.fulfill({status:400,json:{error:'A batch must be 1 to 100 changes.'}});});
 const other=await context.newPage();await other.route('**/api/sync',r=>r.abort());await other.route('**/api/state',r=>r.fulfill({json:box.state}));await other.goto('/');await other.locator('.home-view').waitFor();
 await page.getByRole('checkbox',{name:'Walk complete'}).click();await page.waitForTimeout(300);
 await other.getByRole('checkbox',{name:'Floss complete'}).click();await expect(other.getByRole('checkbox',{name:'Floss complete'})).toHaveAttribute('aria-checked','true');await other.waitForTimeout(300);await other.close();
 // A's 400 lands: walk is set aside, floss stays queued in storage and on screen.
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).failed.length),{timeout:10000}).toBe(1);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!));expect(saved.pending.some((o:{type:string;habit?:string})=>o.type==='check'&&o.habit==='floss')).toBe(true);
 await expect(page.getByRole('checkbox',{name:'Floss complete'})).toHaveAttribute('aria-checked','true');
 // The account recovers; the queued floss reaches it after a reload.
 await page.unroute('**/api/sync');const {mock}=await import('./helpers');await mock(page,box);await page.reload();await page.locator('.app-shell').waitFor();
 await expect(page.getByRole('checkbox',{name:'Floss complete'})).toHaveAttribute('aria-checked','true');await expect.poll(()=>box.state.days[today]?.checks.floss,{timeout:15000}).toBe(true);
});
test('R163-3: an in-form unit toggle keeps untouched measurements exact',async({page})=>{
 const box=await open(page,seed(),{hash:'you'});
 await page.getByRole('button',{name:'Your details'}).click();await page.getByLabel('Weight · lb').fill('143.4');await page.getByRole('button',{name:'Update'}).click();
 const exact=143.4*0.45359237;await expect.poll(()=>box.state.profile?.weight).toBeCloseTo(exact,10);
 // The volume preference set on the settings page survives a measurement-unit toggle inside the details form.
 await page.getByRole('group',{name:'Volume unit'}).getByRole('button',{name:'ml'}).click();await expect.poll(()=>box.state.profile?.units?.volume).toBe('ml');
 await page.getByRole('button',{name:'Your details'}).click();await page.getByRole('button',{name:'kg · cm'}).click();await page.getByRole('button',{name:'Update'}).click();
 await expect.poll(()=>box.state.profile?.units?.weight).toBe('kg');expect(box.state.profile?.weight).toBe(exact);expect(box.state.profile?.height).toBe(165);expect(box.state.profile?.units).toEqual({weight:'kg',height:'cm',volume:'ml'});
});

test('R163-4: a change written by another tab exactly between this tab\'s read and its save survives, because every change has its own durable key',async({page})=>{
 const today=todayIn();const box=await open(page,seed());
 // The other tab's change lands in storage precisely when this tab writes its snapshot after a sync.
 const floss={id:crypto.randomUUID(),at:new Date().toISOString(),day:today,zone:'America/Los_Angeles',type:'check',habit:'floss',value:true};
 await page.evaluate(op=>{const orig=Storage.prototype.setItem;const w=window as unknown as {__armed:boolean};w.__armed=true;Storage.prototype.setItem=function(this:Storage,k:string,v:string){if(this===localStorage&&w.__armed&&k==='flaccid75-v1'&&JSON.parse(v).pending.length===0){w.__armed=false;orig.call(this,'my-wellness-op:'+op.id,JSON.stringify(op));}orig.call(this,k,v);};},floss);
 await page.getByRole('checkbox',{name:'Walk complete'}).click();await expect.poll(()=>box.state.days[today]?.checks.walk).toBe(true);
 // The hook fired: the snapshot this tab saved lists no floss, but floss has its own key. The tab's next queue read unions the journal, so floss reaches the account with no other tab open and no reload.
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {__armed:boolean}).__armed)).toBe(false);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).pending.some((p:{habit?:string})=>p.habit==='floss'))).toBe(false);
 await expect.poll(()=>box.state.days[today]?.checks.floss,{timeout:10000}).toBe(true);expect(box.ops.filter(o=>o.type==='check'&&o.habit==='floss')).toHaveLength(1);
 await page.reload();await page.locator('.app-shell').waitFor();
 await expect(page.getByRole('checkbox',{name:'Floss complete'})).toHaveAttribute('aria-checked','true');expect(box.ops.filter(o=>o.type==='check'&&o.habit==='floss')).toHaveLength(1);
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('my-wellness-op:')).length)).toBe(0);
});

test('non-text contrast: unchecked workout rings, the off and on switch, unit segments and unreached milestone labels meet 3:1 with inherited opacity applied',async({page})=>{
 const box=await open(page,seed(),{hash:'workout'});await page.getByRole('group',{name:'Workout checklist'}).waitFor();
 const measure=(sel:string,part:'border'|'background'|'inset'|'color')=>page.evaluate(([sel,part])=>{
  const el=document.querySelector<HTMLElement>(sel);if(!el)return null;
  const parse=(c:string)=>{const m=c.match(/[\d.]+/g)!.map(Number);return {r:m[0],g:m[1],b:m[2],a:m[3]??1};};
  const lum=({r,g,b}:{r:number;g:number;b:number})=>{const f=(v:number)=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};return .2126*f(r)+.7152*f(g)+.0722*f(b);};
  const blend=(fg:{r:number;g:number;b:number;a:number},bg:{r:number;g:number;b:number})=>({r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a)});
  // The colour behind the control: the nearest painted ancestor, over the page ground.
  let bg={r:244,g:238,b:230};for(let n=el.parentElement;n;n=n.parentElement){const c=parse(getComputedStyle(n).backgroundColor);if(c.a>0){bg=c.a===1?c:blend(c,bg);break;}}
  // Every ancestor opacity applies to what the eye sees.
  let alpha=1;for(let n:HTMLElement|null=el;n;n=n.parentElement)alpha*=Number(getComputedStyle(n).opacity);
  const s=getComputedStyle(el);const raw=part==='border'?s.borderTopColor:part==='background'?s.backgroundColor:part==='color'?s.color:(s.boxShadow.match(/inset[^,]*?(rgba?\([^)]*\))|(rgba?\([^)]*\))[^,]*inset/)?.[1]??s.boxShadow.match(/inset[^,]*?(rgba?\([^)]*\))|(rgba?\([^)]*\))[^,]*inset/)?.[2]??'rgba(0,0,0,0)');
  const c=parse(raw);const fg=blend({...c,a:c.a*alpha},bg);const l1=lum(fg),l2=lum(bg);
  return {ratio:Math.round((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)*100)/100,fg:raw,alpha,bg:`rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`};
 },[sel,part] as const);
 const results:Record<string,{ratio:number;fg:string;alpha:number;bg:string}|null>={};
 results['workout unchecked ring (border)']=await measure('.check-row:not(.is-done) .check-box','border');
 await page.evaluate(()=>{location.hash='you';});await page.getByRole('switch').waitFor();
 results['switch off (track)']=await measure('.toggle:not(.is-on)','background');
 // The track colour transitions for 200 ms; measure the settled colour.
 await page.getByRole('switch').click();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','true');await page.waitForTimeout(400);results['switch on (track)']=await measure('.toggle.is-on','background');await page.getByRole('switch').click();await page.waitForTimeout(400);
 results['unit segment active (inset boundary)']=await measure('.segmented .active','inset');
 results['unit segment inactive (label)']=await measure('.segmented button:not(.active)','color');
 await page.evaluate(()=>{location.hash='progress';});await page.getByRole('group',{name:'Milestones'}).waitFor();
 results['unreached milestone label']=await measure('.medal:not(.is-reached) b','color');
 await writeFile('evidence/my-wellness/nontext-contrast.json',JSON.stringify({standard:'WCAG 2.1 1.4.11 non-text contrast 3:1 for control boundaries and states; labels held to 4.5:1; ratios are effective, with every ancestor opacity multiplied in. Scope: the controls named in the review 163 triage plus unchecked workout rings.',results},null,2));
 for(const [name,r] of Object.entries(results)){expect(r,name).not.toBeNull();expect(r!.ratio,`${name} ${JSON.stringify(r)}`).toBeGreaterThanOrEqual(name.includes('label')?4.5:3);}
 expect(box.state.profile).toBeTruthy();
});
test('a live session keeps its controls in the first viewport at phone, small and desktop sizes',async({page})=>{
 test.setTimeout(150000);
 const boxes=async(names:string[])=>{const out:Record<string,{bottom:number;top:number}>={};for(const n of names){const b=await page.getByRole('button',{name:n,exact:true}).boundingBox();expect(b,n).not.toBeNull();out[n]={top:Math.round(b!.y),bottom:Math.round(b!.y+b!.height)};}return out;};
 const report:Record<string,unknown>={};
 for(const [size,width,height] of [['phone',390,844],['small',375,667],['desktop',1280,900]] as const){
  // Each size starts from a fresh fixture with no timers left from the previous size.
  if(size!=='phone')await page.evaluate(()=>{localStorage.removeItem('my-wellness-timers');sessionStorage.removeItem('seeded');});
  await page.setViewportSize({width,height});await open(page,seed(),{hash:'walk'});
  // Walk: running, then paused.
await page.getByRole('button',{name:'Start',exact:true}).click();await page.clock.runFor(1000);
  const walkRun=await boxes(['Pause','Finish']);await page.getByRole('button',{name:'Pause',exact:true}).click();const walkPause=await boxes(['Resume','Finish']);
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  // Workout: running.
  await page.evaluate(()=>{location.hash='workout';});await page.getByRole('button',{name:'Start',exact:true}).click();await page.clock.runFor(1000);const workout=await boxes(['Pause','Finish']);
  // Abs: guided, running and paused.
  await page.evaluate(()=>{location.hash='abs';});await page.getByRole('button',{name:/Classic five/}).click();await page.clock.runFor(1000);const absRun=await boxes(['Pause','Finish early']);await page.getByRole('button',{name:'Pause',exact:true}).click();const absPause=await boxes(['Resume','Finish early']);
  report[size]={walkRun,walkPause,workout,absRun,absPause};
  for(const [state,set] of Object.entries({walkRun,walkPause,workout,absRun,absPause}))for(const [n,b] of Object.entries(set))expect(b.bottom,`${size} ${state} ${n} bottom ${b.bottom} of ${height}`).toBeLessThanOrEqual(height);
  await page.getByRole('button',{name:'Stop without logging'}).click();
 }
 await writeFile('evidence/my-wellness/live-controls-viewport.json',JSON.stringify(report,null,2));
});
test('the water target is shown and edited in her volume unit and an untouched field keeps the exact millilitres',async({page})=>{
 const box=await open(page,seed(),{hash:'you'});
 const before=box.state.profile!.targets.water;
 // Ounces: the field shows the target in oz; saving without touching it keeps the stored ml exactly.
 await page.getByRole('button',{name:'Daily targets'}).click();await expect(page.getByLabel('Water · oz',{exact:true})).toHaveValue(String(Math.round(before/29.5735295625*10)/10));
 await page.getByLabel('Protein · g',{exact:true}).fill('110');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>box.state.profile?.overrides?.protein).toBe(110);expect(box.state.profile!.targets.water).toBe(before);
 // Typing 64 oz stores 64 oz worth of millilitres.
 await page.getByRole('button',{name:'Daily targets'}).click();await page.getByLabel('Water · oz',{exact:true}).fill('64');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>box.state.profile?.targets.water).toBeCloseTo(64*29.5735295625,9);
 // Millilitres: the same target reads as ml and saves exact ml.
 await page.getByRole('group',{name:'Volume unit'}).getByRole('button',{name:'ml'}).click();await expect.poll(()=>box.state.profile?.units?.volume).toBe('ml');
 await page.getByRole('button',{name:'Daily targets'}).click();await expect(page.getByLabel('Water · ml',{exact:true})).toHaveValue(String(Math.round(64*29.5735295625)));
 await page.getByLabel('Water · ml',{exact:true}).fill('2250');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>box.state.profile?.targets.water).toBe(2250);
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('0 of 2½ Stanleys · 0 ml')).toBeVisible();
});

test('R163-5: an offline start replays a change that only the journal holds, shows it once, and the account receives it once',async({page})=>{
 const today=todayIn();const box=await open(page,seed());
 // Another tab's acknowledged pour survived in its journal key while a stale snapshot (no pending) was saved over it.
 const pour={id:crypto.randomUUID(),at:new Date().toISOString(),day:today,zone:'America/Los_Angeles',type:'water',amount:30*29.5735295625,label:'Stanley'};
 await page.evaluate(op=>{const s=JSON.parse(localStorage.getItem('flaccid75-v1')!);s.pending=[];localStorage.setItem('flaccid75-v1',JSON.stringify(s));localStorage.setItem('my-wellness-op:'+op.id,JSON.stringify(op));},pour);
 // The account is unreachable (every API call fails at the network) while the document and assets still load, as the installed worker serves them on a real device; the service worker itself is covered by the supervisor's offline integration run.
 await page.route('**/api/**',r=>r.abort('internetdisconnected'));await page.reload();await page.locator('.home-view').waitFor();
 // Before any server answer the pour is on screen exactly once and queued once.
 await expect(page.getByText('1 of 2¼ Stanleys · 30 oz')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).pending.filter((p:{type:string})=>p.type==='water').length)).toBe(1);
 expect(box.ops.filter(o=>o.type==='water')).toHaveLength(0);
 // Back online: replayed once, deduplicated, journal cleared.
 await page.unroute('**/api/**');await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await expect.poll(()=>Math.round(box.state.days[today]?.water??0)).toBe(Math.round(pour.amount));expect(box.ops.filter(o=>o.type==='water')).toHaveLength(1);
 await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('my-wellness-op:')).length)).toBe(0);
 await expect(page.getByText('1 of 2¼ Stanleys · 30 oz')).toBeVisible();
});
test('R163-6: when the journal key itself is refused, the change is not applied, a notice is shown on the page, and a finishing timer is kept',async({page})=>{
 const today=todayIn();const box=await openAt(page,seed(),at(today,'12:00:00'),'meditate');
 // Only journal keys are refused; the snapshot key still writes, which is the order a full device fails in.
 await page.evaluate(()=>{const w=window as unknown as {__refuse:boolean};w.__refuse=false;const orig=Storage.prototype.setItem;Storage.prototype.setItem=function(this:Storage,k:string,v:string){if(this===localStorage&&w.__refuse&&k.startsWith('my-wellness-op:'))throw new DOMException('quota','QuotaExceededError');orig.call(this,k,v);};});
 await page.getByRole('button',{name:'3 min'}).click();await page.getByRole('button',{name:'Start 3 minutes'}).click();await page.clock.runFor(1000);
 await page.evaluate(()=>{(window as unknown as {__refuse:boolean}).__refuse=true;});
 // A manual change on the home page: nothing applied, the notice is on the page.
 await page.evaluate(()=>{location.hash='';});await page.getByRole('checkbox',{name:'Floss complete'}).click();
 await expect(page.getByRole('status').filter({hasText:'Device storage is full'})).toBeVisible();await expect(page.getByRole('checkbox',{name:'Floss complete'})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).pending.length)).toBe(0);expect(box.state.days[today]?.checks.floss).toBeUndefined();
 // The meditation finishes while refused: its timer stays and nothing is queued.
 await page.clock.fastForward(4*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.clock.runFor(2500);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')??'{}').meditate)).toBeTruthy();expect(box.state.days[today]?.meditate).toBeUndefined();
 // Storage back: the next settle lands the meditation once and the notice clears with the next accepted change.
 await page.evaluate(()=>{(window as unknown as {__refuse:boolean}).__refuse=false;});await page.clock.runFor(2500);
 await expect.poll(()=>box.state.days[today]?.meditate).toBe(180);expect(box.ops.filter(o=>o.type==='meditate')).toHaveLength(1);
 await page.getByRole('checkbox',{name:'Floss complete'}).click();await expect.poll(()=>box.state.days[today]?.checks.floss).toBe(true);await expect(page.getByRole('status').filter({hasText:'Device storage is full'})).toHaveCount(0);
});

test('R163-7: a change the account refuses in tab A is kept by id when tab B\'s slow sync saves afterwards, survives a reload, and an explicit discard stays discarded in both tabs',async({page,context})=>{
 const today=todayIn();const box=await open(page,seed());
 // Tab B: its sync takes three seconds to succeed, so it defers storage events while A works.
 const other=await context.newPage();await mock(other,box);await other.route('**/api/sync',async r=>{await new Promise(res=>setTimeout(res,3000));await r.fallback();});await other.goto('/');await other.locator('.home-view').waitFor();
 await other.getByRole('checkbox',{name:'Walk complete'}).click();await other.waitForTimeout(200);
 // Tab A: the account refuses floss.
 await page.route('**/api/sync',async r=>{const ops=r.request().postDataJSON() as {id:string;habit?:string}[];const bad=ops.find(o=>o.habit==='floss');if(!bad)return r.fallback();await r.fulfill({json:{state:box.state,accepted:ops.filter(o=>o!==bad).map(o=>o.id),rejected:[{id:bad.id,reason:'The account refused this change.'}]}});});
 await page.getByRole('checkbox',{name:'Floss complete'}).click();
 const inFailed=(p:Page)=>p.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).failed.map((f:{op:{habit?:string}})=>f.op.habit));
 await expect.poll(()=>inFailed(page)).toEqual(['floss']);
 // B's sync lands and B saves; its deferred merge runs; A takes B's event. Floss is still in the refused list everywhere.
 await expect.poll(()=>box.state.days[today]?.checks.walk,{timeout:10000}).toBe(true);await page.waitForTimeout(1500);
 expect(await inFailed(page)).toEqual(['floss']);
 await page.evaluate(()=>{location.hash='you';});await expect(page.getByRole('group',{name:'Changes the account refused'})).toBeVisible();
 await other.evaluate(()=>{location.hash='you';});await expect(other.getByRole('group',{name:'Changes the account refused'})).toBeVisible();
 await page.reload();await page.locator('.app-shell').waitFor();await expect(page.getByRole('group',{name:'Changes the account refused'})).toBeVisible();expect(await inFailed(page)).toEqual(['floss']);
 // An explicit discard in A empties the list in A, in the snapshot and in B, and B's own merge does not bring it back.
 await page.getByRole('button',{name:/^Discard/}).click();await expect(page.getByRole('group',{name:'Changes the account refused'})).toHaveCount(0);
 await expect(other.getByRole('group',{name:'Changes the account refused'})).toHaveCount(0,{timeout:5000});await other.getByRole('button',{name:'Home'}).click();await other.getByRole('checkbox',{name:'Workout complete'}).click();
 await expect.poll(()=>box.state.days[today]?.checks.workout,{timeout:10000}).toBe(true);await other.waitForTimeout(500);
 expect(await inFailed(page)).toEqual([]);expect(await inFailed(other)).toEqual([]);await expect(page.getByRole('group',{name:'Changes the account refused'})).toHaveCount(0);
 await other.close();
});

test('R163-8: tab A\'s refusal survives A closing and tab B saving a new change before B\'s slow sync answers; B\'s explicit discard then holds through its own later saves and a reload',async({page,context})=>{
 const today=todayIn();const box=await open(page,seed());
 const inFailed=(p:Page)=>p.evaluate(()=>JSON.parse(localStorage.getItem('flaccid75-v1')!).failed.map((f:{op:{habit?:string}})=>f.op.habit));
 // Tab B: syncs answer after three seconds. B queues a walk, so a sync is in flight while A works.
 const other=await context.newPage();await mock(other,box);await other.route('**/api/sync',async r=>{await new Promise(res=>setTimeout(res,3000));await r.fallback();});await other.goto('/');await other.locator('.home-view').waitFor();
 await other.getByRole('checkbox',{name:'Walk complete'}).click();await other.waitForTimeout(200);
 // Tab A: floss is refused, saved as refused, and A closes at once.
 await page.route('**/api/sync',async r=>{const ops=r.request().postDataJSON() as {id:string;habit?:string}[];const bad=ops.find(o=>o.habit==='floss');if(!bad)return r.fallback();await r.fulfill({json:{state:box.state,accepted:ops.filter(o=>o!==bad).map(o=>o.id),rejected:[{id:bad.id,reason:'The account refused this change.'}]}});});
 await page.getByRole('checkbox',{name:'Floss complete'}).click();await expect.poll(()=>inFailed(page)).toEqual(['floss']);await page.close();
 // B logs a workout while its walk sync is still pending: B's own save must not overwrite A's refusal.
 await other.getByRole('checkbox',{name:'Workout complete'}).click();expect(await inFailed(other)).toEqual(['floss']);
 await expect.poll(()=>box.state.days[today]?.checks.workout,{timeout:15000}).toBe(true);await other.waitForTimeout(500);expect(await inFailed(other)).toEqual(['floss']);
 await other.evaluate(()=>{location.hash='you';});await expect(other.getByRole('group',{name:'Changes the account refused'})).toBeVisible();
 await other.reload();await other.locator('.app-shell').waitFor();await expect(other.getByRole('group',{name:'Changes the account refused'})).toBeVisible();
 // B discards. Its later saves and a reload keep the list empty.
 await other.getByRole('button',{name:/^Discard/}).click();await expect(other.getByRole('group',{name:'Changes the account refused'})).toHaveCount(0);
 await other.getByRole('button',{name:'Home'}).click();await other.getByRole('checkbox',{name:'Abs complete'}).click();await expect.poll(()=>box.state.days[today]?.checks.abs,{timeout:15000}).toBe(true);await other.waitForTimeout(500);
 expect(await inFailed(other)).toEqual([]);await other.reload();await other.locator('.app-shell').waitFor();expect(await inFailed(other)).toEqual([]);
 await other.evaluate(()=>{location.hash='you';});await expect(other.getByRole('group',{name:'Changes the account refused'})).toHaveCount(0);
 await other.close();
});
