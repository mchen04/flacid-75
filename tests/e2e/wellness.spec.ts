// My Wellness: navigation, timers, guided sessions, optional practices, treats, units, rollover, duplicates, keyboard and contrast.
import {test,expect} from './fixtures';
import type {Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {addDays,apply} from '../../lib/domain';
import {open,mock,seed,todayIn,op,complete,zone} from './helpers';
const at=(day:string,time:string)=>new Date(`${day}T${time}`);
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
 const today=todayIn();const box=await openAt(page,seed(3),at(today,'10:00:00'),'walk');
 await page.getByRole('button',{name:'Start'}).click();await page.clock.runFor(10*60*1000);await expect(page.locator('.dial-time')).toHaveText(/^10:[0-2]\d$/);
 await page.getByRole('button',{name:'Pause'}).click();const paused=await page.locator('.dial-time').innerText();await page.clock.runFor(60*1000);await expect(page.locator('.dial-time')).toHaveText(paused);
 // Reload: the paused timer is still there with the same count.
 await page.reload();await page.locator('.app-shell').waitFor();await expect(page.locator('.dial-time')).toHaveText(paused);await expect(page.getByRole('button',{name:'Resume'})).toBeVisible();
 // Resume, then the phone sleeps for 20 minutes: no ticks fire, the clock simply moves on, and the count is right on wake.
 await page.getByRole('button',{name:'Resume'}).click();await page.clock.fastForward(20*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.locator('.dial-time')).toHaveText(/^30:[0-2]\d$/);
 await page.getByRole('button',{name:'Finish'}).click();await expect(page.getByText('Walk logged')).toBeVisible();await expect(page.getByText(/30:[0-2]\d on the path\./)).toBeVisible();
 expect(box.state.days[today].sessions?.walk?.seconds).toBeGreaterThanOrEqual(1800);expect(box.state.days[today].sessions?.walk?.seconds).toBeLessThan(1830);expect(box.state.days[today].checks.walk).toBe(true);
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('Walked · 30 min')).toBeVisible();
 await page.getByRole('button',{name:'Open walk',exact:true}).click();await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByRole('button',{name:'Start'})).toBeVisible();expect(box.state.days[today].checks.walk).toBe(false);
 await writeFile(`evidence/my-wellness/timer-walk-${test.info().project.name}.json`,JSON.stringify({ran:'10:00',pausedFor:'1:00 (no change)',reloadKept:'10:00',sleptFor:'20:00 with no ticks',onWake:'30:00',logged:1800,note:'Chromium with a virtual clock; a physical lock/reopen is not measured here'},null,2));
});
test('the workout page is a checklist with a session clock, an editable plan, and a finish that records the moves',async({page})=>{
 const today=todayIn();const box=await openAt(page,seed(),at(today,'18:00:00'),'workout');
 await expect(page.getByRole('group',{name:'Workout checklist'})).toBeVisible();await expect(page.getByRole('checkbox')).toHaveCount(6);
 await page.getByRole('button',{name:'Edit plan'}).click();await page.getByLabel('One move per line').fill('Squats\nRows\nPlank');await page.getByRole('button',{name:'Save plan'}).click();await expect(page.getByRole('checkbox')).toHaveCount(3);expect(box.state.profile?.plan).toEqual(['Squats','Rows','Plank']);
 await page.getByRole('checkbox',{name:'Squats'}).check();await page.getByRole('checkbox',{name:'Plank'}).check();await expect(page.getByText('2 of 3 checked')).toBeVisible();await page.clock.runFor(12*60*1000);
 await page.reload();await page.locator('.app-shell').waitFor();await expect(page.getByRole('checkbox',{name:'Squats'})).toBeChecked();
 await page.getByRole('button',{name:'Finish',exact:true}).click();await expect(page.getByText('Workout logged')).toBeVisible();
 expect(box.state.days[today].sessions?.workout?.items).toEqual(['Squats','Plank']);expect(box.state.days[today].sessions?.workout?.seconds).toBeGreaterThanOrEqual(720);expect(box.state.days[today].sessions?.workout?.seconds).toBeLessThan(760);
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
 const today=todayIn();let s=seed(4);for(let i=1;i<=3;i++)s=complete(s,addDays(today,-i));const box=await openAt(page,s,at(today,'09:00:00'));
 await expect(page.getByRole('button',{name:/^3 day streak/})).toBeVisible();
 await page.getByRole('button',{name:'Open meditate timer'}).click();await page.getByRole('button',{name:'3 min'}).click();await page.getByRole('button',{name:'Start 3 minutes'}).click();await page.clock.runFor(2000);await page.clock.fastForward(3*60*1000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.getByText('3 min logged today.')).toBeVisible();expect(box.state.days[today].meditate).toBe(180);// the full chosen length is credited when the countdown completes
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
 await page.getByRole('button',{name:'Undo Film night'}).first().click();
 await page.getByRole('button',{name:'Undo Film night'}).click();await expect(page.getByText('200 points',{exact:true})).toBeVisible();expect(Object.keys(box.state.days[today].redeemed??{})).toHaveLength(0);
 // Undoing a habit after spending never shows a negative balance; the card explains it instead.
 await page.waitForTimeout(1500);for(let i=0;i<5;i++){await page.getByRole('button',{name:'Redeem Film night'}).click();await page.waitForTimeout(1500);}await expect(page.getByText('50 points',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Home'}).click();await page.getByRole('button',{name:/day streak\. Open progress/}).click();for(const d of [1,2]){await page.getByLabel('Open any past day').fill(addDays(today,-d));await page.getByRole('button',{name:'Backfill this day'}).click();for(const h of ['walk','workout','abs','floss'])await page.getByRole('button',{name:`Undo ${h}`}).click();await page.getByRole('button',{name:'Back to today'}).click();await page.evaluate(()=>{location.hash='progress';});}await page.evaluate(()=>{location.hash='rewards';});await expect(page.getByText('0 points',{exact:true})).toBeVisible();await expect(page.getByText(/ahead of the earned total after an undo; nothing is owed/)).toBeVisible();
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
 await expect(page.getByText('Editing')).toBeVisible();await page.getByRole('button',{name:'Open walk',exact:true}).click();await page.getByRole('button',{name:'Mark walked on this day'}).click();await expect(page.getByText('Walk logged')).toBeVisible();
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
 expect(order.map(o=>o.split('|')[0])).toEqual(['6 day streak. Open progress'.replace('6','0'),'Settings','Open workout. 0 of 7 habits done today','Open walk','Log walk','Open workout','Log workout','Open abs']);
 for(const o of order){const [,style,width]=o.split('|');expect(style,o).not.toBe('none');expect(Number(width),o).toBeGreaterThan(0);}
 for(let i=0;i<3;i++)await page.keyboard.press('Shift+'+tab);await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Undo walk'})).toHaveAttribute('aria-pressed','true');
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
test('logging from the dashboard while a timer runs finishes that session with its time and ticks; undo removes the session',async({page})=>{
 const today=todayIn();const box=await openAt(page,seed(),at(today,'18:00:00'),'workout');
 await page.getByRole('checkbox',{name:'Squats'}).check();await page.getByRole('checkbox',{name:'Plank'}).check();await page.clock.runFor(9*60*1000);
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText(/Running · 9:0\d/)).toBeVisible();
 await page.getByRole('button',{name:'Log workout'}).click();await expect(page.getByText('Done · 2 moves')).toBeVisible();
 expect(box.state.days[today].sessions?.workout?.items).toEqual(['Squats','Plank']);expect(box.state.days[today].sessions?.workout?.seconds).toBeGreaterThanOrEqual(540);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')??'{}').workout)).toBeUndefined();
 // Undo from the dashboard removes the timed session; a later plain log carries no minutes.
 await page.getByRole('button',{name:'Undo workout'}).click();expect(box.state.days[today].sessions?.workout).toBeUndefined();expect(box.state.days[today].checks.workout).toBe(false);
 await page.getByRole('button',{name:'Log workout'}).click();await expect(page.getByText('Done',{exact:true})).toBeVisible();expect(box.state.days[today].sessions?.workout).toBeUndefined();
 // The same for a running walk: the dashboard log finishes it rather than leaving it counting unseen.
 await page.getByRole('button',{name:'Open walk',exact:true}).click();await page.getByRole('button',{name:'Start'}).click();await page.clock.runFor(4*60*1000);await page.getByRole('button',{name:'Home'}).click();
 await page.getByRole('button',{name:'Log walk'}).click();await expect(page.getByText('Walked · 4 min')).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')??'{}').walk)).toBeUndefined();
});
test('a timer left from another day is offered for that day or discarded, never silently backfilled',async({page})=>{
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
 await expect(page.getByRole('checkbox',{name:'Squats'})).toBeDisabled();await expect(page.getByRole('button',{name:'Mark done on this day'})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('my-wellness-timers')??'{}').workout)).toBeUndefined();
});
test('the hero opens whatever comes next, and water and meals undo from the dashboard in one tap',async({page})=>{
 const today=todayIn();const box=await open(page,seed());
 await page.route('**/api/estimate',r=>r.fulfill({json:{items:[{name:'banana, raw',grams:120,calories:107,protein:1.3,source:'usda',match:'Bananas, raw',fdcId:173944}],calories:107,protein:1.3,model:'test'}}));
 await expect(page.getByRole('button',{name:/^Open workout\. 0 of 7/})).toBeVisible();await page.getByRole('button',{name:/^Open workout\. 0 of 7/}).click();await expect(page.getByRole('heading',{name:'Workout'})).toBeVisible();await page.getByRole('button',{name:'Home'}).click();
 await page.getByRole('button',{name:'Log workout'}).click();await expect(page.getByRole('button',{name:/^Open abs\. 1 of 7/})).toBeVisible();
 await page.getByRole('button',{name:'Add a Stanley'}).click();await page.getByRole('button',{name:'Add a Stanley'}).click();await expect(page.getByText('2 of 3 Stanleys · 60 oz')).toBeVisible();
 await page.getByRole('button',{name:'Undo last pour'}).click();await expect(page.getByText('1 of 3 Stanleys · 30 oz')).toBeVisible();await expect.poll(()=>Math.round(box.state.days[today].water*100)/100).toBe(Math.round(30*29.5735295625*100)/100);
 await page.getByRole('button',{name:'Log a meal'}).click();await page.getByLabel('What did you eat?').fill('a banana');await page.getByRole('button',{name:'Look it up'}).click();await page.getByRole('button',{name:'Add to today'}).click();
 await expect(page.getByText('107 kcal · 1/105 g')).toBeVisible();await page.getByRole('button',{name:'Undo last meal'}).click();await expect(page.getByText('0 kcal · 0/105 g')).toBeVisible();expect(Object.keys(box.state.days[today].meals)).toHaveLength(0);
 await expect(page.getByRole('button',{name:'Log a meal'})).toBeVisible();
});

// Water by container.
test('half a Stanley is exactly 15 oz, twice; the fill and the daily total match; refills, ambiguity and the model fallback behave',async({page})=>{
 const today=todayIn();const box=await open(page,seed(),{hash:'water'});
 const liquidY=()=>page.locator('.water-card .liquid').evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).f);
 const before=await liquidY();
 await page.getByLabel('Or say it').fill('I drank half my Stanley');await page.getByRole('button',{name:'Read it'}).click();
 await expect(page.getByText('15 oz · half a Stanley.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Add 15 oz'}).click();
 await expect(page.locator('.water-copy .big')).toHaveText('15 oz');await expect(page.getByText('about ½ of 3 Stanleys',{exact:false})).toBeVisible();
 await page.waitForTimeout(1000);const mid=await liquidY();expect(mid).toBeLessThan(before);
 await page.getByLabel('Or say it').fill('half a Stanley');await page.getByRole('button',{name:'Read it'}).click();await page.getByRole('button',{name:'Add 15 oz'}).click();
 await expect(page.locator('.water-copy .big')).toHaveText('30 oz');await expect(page.getByText('about 1 of 3 Stanleys',{exact:false})).toBeVisible();
 await page.waitForTimeout(1000);expect(await liquidY()).toBeLessThan(mid);
 // The stored day holds two pours of exactly half a Stanley, in millilitres.
 await expect.poll(()=>box.state.days[today]?.waterLog?.map(e=>Math.round(e.ml*1000)/1000)).toEqual([443.603,443.603]);expect(box.state.days[today].waterLog?.map(e=>e.label)).toEqual(['half a Stanley','half a Stanley']);
 await expect(page.getByRole('group',{name:'Today’s pours'}).getByText('15 oz')).toHaveCount(2);
 // The dashboard says the same thing.
 await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('1 of 3 Stanleys · 30 oz')).toBeVisible();await page.getByRole('button',{name:'Open water',exact:true}).click();
 // Refills, a quarter, most, the whole thing: the app multiplies; the confirmation shows the arithmetic.
 await page.getByLabel('Or say it').fill('refilled it twice');await page.getByRole('button',{name:'Read it'}).click();await expect(page.getByText('60 oz · 2 Stanleys.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Not this'}).click();
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
 await page.getByRole('button',{name:'Undo last pour'}).click();await expect(page.locator('.water-copy .big')).toHaveText('30 oz');
 await page.screenshot({path:`evidence/my-wellness/water-stanley-${test.info().project.name}.png`});
});
test('containers are hers to name and size, in her unit, and the default drives the one-tap',async({page})=>{
 const today=todayIn();const box=await open(page,seed(),{hash:'you'});
 await page.getByRole('button',{name:'Water containers'}).click();await page.getByLabel('Container',{exact:true}).fill('Bottle');await page.getByLabel('Size · oz').fill('20');await page.getByRole('button',{name:'Add container'}).click();
 await expect(page.getByText('20 oz',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Make default'}).last().click();await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>box.state.profile?.containers?.map(c=>c.name)).toEqual(['Stanley','Glass','Bottle']);expect(box.state.profile?.containers?.[2].ml).toBeCloseTo(20*29.5735295625,6);
 await page.getByRole('button',{name:'Home'}).click();await page.getByRole('button',{name:'Add a Bottle'}).click();await expect(page.getByText('1 of 4 Bottles · 20 oz')).toBeVisible();
 // Switch the display to millilitres: the stored size is untouched.
 await page.getByLabel('Settings').click();await page.getByRole('button',{name:'ml',exact:true}).click();await page.getByRole('button',{name:'Home'}).click();await expect(page.getByText('1 of 4 Bottles · 591 ml')).toBeVisible();expect(box.state.days[today].water).toBeCloseTo(20*29.5735295625,6);
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
 await page.getByRole('button',{name:'Log walk'}).click();await expect.poll(()=>box.state.days[today]?.checks.walk).toBe(true);
 // The refusal is visible with its reason, survives a reload, and can be discarded.
 await page.reload();await page.locator('.app-shell').waitFor();await page.getByLabel('Settings').click();
 await expect(page.getByRole('group',{name:'Changes the account refused'})).toBeVisible();await expect(page.getByText(/A change was refused: rewards\.0\.cost/).first()).toBeVisible();
 await page.getByRole('button',{name:/Discard it/}).click();await expect(page.getByRole('group',{name:'Changes the account refused'})).toHaveCount(0);
 await page.reload();await page.locator('.app-shell').waitFor();await page.getByLabel('Settings').click();await expect(page.getByRole('group',{name:'Changes the account refused'})).toHaveCount(0);
 // A batch the server cannot read at all is not retried forever: the head is set aside and the queue moves on.
 await page.route('**/api/sync',r=>r.fulfill({status:400,json:{error:'A batch must be 1 to 100 changes.'}}),{times:1});
 await page.getByRole('button',{name:'Home'}).click();await page.getByRole('button',{name:'Log abs'}).click();
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
 await page.locator('.items input').first().fill('-40');expect(await page.locator('.items input').first().inputValue()).toBe('0');
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
test('Floss has the same shape as the other activities: a primary Mark flossed, then a logged card with Undo',async({page})=>{
 const today=todayIn();const box=await open(page,seed(),{hash:'floss'});
 await page.getByRole('button',{name:'Mark flossed'}).click();await expect(page.getByText('Floss logged')).toBeVisible();await expect.poll(()=>box.state.days[today]?.checks.floss).toBe(true);
 await page.getByRole('button',{name:'Undo'}).click();await expect(page.getByRole('button',{name:'Mark flossed'})).toBeVisible();await expect.poll(()=>box.state.days[today]?.checks.floss).toBe(false);
 // Past days say so, on the dashboard and on the page.
 await page.evaluate(()=>{location.hash='progress';});await page.getByLabel('Open any past day').fill(addDays(today,-1));await page.getByRole('button',{name:'Backfill this day'}).click();
 await expect(page.getByText('Once that day')).toBeVisible();await expect(page.getByText('0 of 7 that day')).toBeVisible();await page.getByRole('button',{name:'Open walk',exact:true}).click();await expect(page.getByText('A walk that day.')).toBeVisible();
});
