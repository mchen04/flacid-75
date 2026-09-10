'use client';
import {useEffect, useRef, useState} from 'react';
import {Hills, Mark} from './Scenes';
import {Camera} from './Camera';
import {Icon} from './Icon';
import {startStore, useStore, dispatch, unlock, lock} from '@/lib/client-store';
import {habits, dayAt, addDays, completion, isKept, newDay, streaks, computeTargets, restsLeft, containersOf, type Operation} from '@/lib/domain';
import {AppContext, useHash, Sheet, names, todayZone, longDate, type Change, type Pulse, unitsOf} from './shared';
import {useSettle} from '@/lib/settle';
import {Home} from './Home';
import {Walk, Workout, Abs, Floss, Water, Rest, Meditate, Focus} from './Activities';
import {Food, Meal} from './Food';
import {Progress} from './Progress';
import {Rewards, RewardsForm} from './Rewards';
import {You, Setup, TargetForm, Weight, About, Rules, PlanForm, ContainersForm} from './Settings';
const titles: Record<string, string> = {walk: 'Walk', workout: 'Workout', abs: 'Abs', floss: 'Floss', water: 'Water', food: 'Food', rest: 'Rest days', meditate: 'Meditate', focus: 'Focus', rewards: 'Treats', progress: 'Progress', you: 'Settings', rules: 'How it works'};
export default function App() {
 const store = useStore(); const {state} = store;
 const page = useHash();
 const [now, setNow] = useState(() => new Date()); const [selected, setSelected] = useState<string | null>(null);
 const [sheet, setSheet] = useState<string | null>(null); const [editMeal, setEditMeal] = useState<string | null>(null); const [sheetDay, setSheetDay] = useState<string | null>(null);
 const file = useRef<HTMLInputElement>(null); const [photo, setPhoto] = useState<File | null>(null);
 const [pulse, setPulse] = useState<Pulse>({}); const timers = useRef<Partial<Record<keyof Pulse, ReturnType<typeof setTimeout>>>>({});
 const [lastMeal, setLastMeal] = useState<{id: string; day: string} | null>(null);

 const today = dayAt(state.clock, now, todayZone()); const dayKey = selected ?? today;
 const profile = state.profile; const day = state.days[dayKey] ?? newDay(profile?.targets ?? computeTargets({height: 165, weight: 65, age: 30, activity: 1, goal: 'maintain'}));
 const foodDayKey = sheetDay ?? dayKey; const foodDay = state.days[foodDayKey] ?? newDay(profile?.targets ?? day.targets);
 const done = completion(day); const count = Object.values(done).filter(Boolean).length; const streak = streaks(state, today);
 useEffect(() => {startStore(); const timer = setInterval(() => setNow(new Date()), 15000); const resume = () => setNow(new Date()); window.addEventListener('pageshow', resume); document.addEventListener('visibilitychange', resume); return () => {clearInterval(timer); window.removeEventListener('pageshow', resume); document.removeEventListener('visibilitychange', resume);};}, []);
 // Every page starts at the top and moves focus to its heading, so keyboard and screen-reader users land where the page begins.
 useEffect(() => {document.querySelector('.page')?.scrollTo?.(0, 0); const h = document.querySelector<HTMLElement>('.topbar h1'); if (h && page) {h.setAttribute('tabindex', '-1'); h.focus({preventScroll: true});}}, [page]);
 function change(payload: Change, date = selected ?? dayAt(state.clock, new Date(), todayZone())) {const at = new Date().toISOString(); return dispatch({...payload, id: crypto.randomUUID(), at, day: date, zone: todayZone()} as Operation);}
 // Settle finished timers wherever the app is: a finished routine, meditation or focus block logs itself once (lib/settle.ts).
 useSettle(op => {const ok = change(op as Change, op.day); if (ok && (op.type === 'session' || op.type === 'meditate' || op.type === 'focus')) bump(op.type === 'session' ? 'abs' : op.type); return ok;}, store.ready && store.unlocked && !!state.profile);
 function bump(key: keyof Pulse, ms = 1400) {clearTimeout(timers.current[key]); setPulse(p => ({...p, [key]: true})); timers.current[key] = setTimeout(() => setPulse(p => ({...p, [key]: false})), ms);}
 function navigate(next: string) {if (next === page) return; location.hash = next ? '#' + next : ''; if (!next) history.replaceState(null, '', location.pathname);}
 function open(value: string | null) {if (value && sheet === null) setSheetDay(selected ?? dayAt(state.clock, new Date(), todayZone())); setSheet(value); if (!value) {setPhoto(null); setEditMeal(null);}}
 if (!store.ready) return <main className="gate"><Hills className="gate-scene"/></main>;
 if (!store.unlocked) return <Gate notice={store.notice}/>;
 if (!profile) return <main className="gate onboarding"><Setup onSave={(stats, overrides, units) => {if (change({type: 'profile', stats, overrides}, today)) change({type: 'units', units}, today);}}/></main>;
 const hour = Number(new Intl.DateTimeFormat('en', {hour: 'numeric', hourCycle: 'h23', timeZone: state.clock?.zone}).format(now));
 const morning = hour < 12;
 const yesterday = state.days[addDays(today, -1)]; const stumbled = !selected && count === 0 && !!yesterday && !isKept(yesterday) && addDays(today, -1) >= profile.startDay;
 const complete = count === habits.length;
 const headline = selected ? 'Past day' : day.rest ? 'Rest day.' : complete ? 'Every one.' : count >= 5 ? 'Nearly there.' : count > 0 ? 'Good going.' : stumbled ? 'A new day.' : morning ? 'Good morning.' : hour < 17 ? 'Good afternoon.' : 'Good evening.';
 const title = page ? titles[page] ?? 'My Wellness' : headline;
 const ctx = {state, today, dayKey, selected, day, done, units: unitsOf(state), pulse, lastMeal, change, navigate, open, select: setSelected, bump};
 const showWeight = morning && !state.weights[today] && !selected && !page;
 const body = page === 'walk' ? <Walk/> : page === 'workout' ? <Workout/> : page === 'abs' ? <Abs/> : page === 'floss' ? <Floss/> : page === 'water' ? <Water/> : page === 'food' ? <Food/> : page === 'rest' ? <Rest/> : page === 'meditate' ? <Meditate/> : page === 'focus' ? <Focus/> : page === 'rewards' ? <Rewards/> : page === 'progress' ? <Progress/> : page === 'you' ? <You notice={store.notice}/> : page === 'rules' ? <Rules/> : <Home hour={hour} stumbled={stumbled}/>;
 return <AppContext.Provider value={ctx}><main className="app-shell">
  <header className="topbar">
   {page && <button className="icon-button home" aria-label="Home" onClick={() => navigate('')}><Icon name="home"/></button>}
   <div className="topbar-copy"><h1>{title}</h1><p className="date">{page === 'progress' ? `Since ${new Intl.DateTimeFormat('en', {month: 'long', day: 'numeric', timeZone: 'UTC'}).format(new Date(profile.startDay + 'T12:00:00Z'))}` : page === 'rules' || page === 'you' || page === 'rewards' ? 'My Wellness' : longDate(dayKey)}</p></div>
   {showWeight && <button className="chip" onClick={() => open('weight')}><Mark name="scale"/>Weigh in</button>}
   <button className={`streak-badge ${page === 'progress' ? 'active' : ''}`} onClick={() => {navigate('progress'); setSelected(null);}} aria-label={`${streak.current} day streak. Open progress`} aria-current={page === 'progress' ? 'page' : undefined}><strong>{streak.current}</strong><span>day{streak.current === 1 ? '' : 's'}</span></button>
   <button className={`icon-button gear ${page === 'you' ? 'active' : ''}`} aria-label="Settings" aria-current={page === 'you' ? 'page' : undefined} onClick={() => {navigate('you'); setSelected(null);}}><Icon name="settings"/></button>
  </header>
  {state.clock && state.clock.zone !== todayZone() && <button className="zone-row" onClick={() => open('zone')}>Your timezone changed. Keep your day in step<Icon name="arrow" size={16}/></button>}
  {selected && <div className="past-row"><span>Editing {longDate(selected)}</span><button className="text-button" onClick={() => setSelected(null)}>Back to today</button></div>}
  <div className="page" key={page}>{body}</div>
  <input className="sr-only" ref={file} aria-label="Photograph a meal" type="file" accept="image/*" capture="environment" onChange={e => {const f = e.target.files?.[0]; if (f) {setPhoto(f); setEditMeal(null); open('meal');} e.target.value = '';}}/>
  {sheet && <Sheet title={sheet === 'camera' ? 'Photo' : sheet === 'meal' ? (editMeal ? 'Correct this meal' : 'Log a meal') : sheet === 'rescue' ? 'Rescue this day' : sheet === 'weight' ? 'Weigh in' : sheet === 'targets' ? 'Daily targets' : sheet === 'setup' ? 'Your details' : sheet === 'zone' ? 'Timezone' : sheet === 'lock' ? 'Lock this device?' : sheet === 'treats' ? 'Your treats' : sheet === 'plan' ? 'Workout plan' : sheet === 'containers' ? 'Water containers' : sheet === 'rest' ? 'Rest today' : 'How targets are set'} onClose={() => open(null)}>
   {sheet === 'camera' ? <Camera onCapture={p => {setPhoto(p); setEditMeal(null); open('meal');}} onChoose={() => file.current?.click()} onText={() => {setPhoto(null); setEditMeal(null); open('meal');}}/>
   : sheet === 'meal' ? <Meal photo={photo} initial={editMeal ? foodDay.meals[editMeal] : undefined} count={Object.keys(foodDay.meals).length} onPhotoConsumed={() => setPhoto(null)} onCamera={() => open('camera')} onList={() => {open(null); navigate('food');}} onSave={(calories, protein) => {const mealId = editMeal ?? crypto.randomUUID(); if (change({type: 'meal', mealId, calories, protein}, foodDayKey)) {open(null); if (!editMeal) setLastMeal({id: mealId, day: foodDayKey}); bump('meal', 6000);}}}/>
   : sheet === 'rescue' ? <><span className="sheet-mark"><Mark name="rescue"/></span><p>{longDate(dayKey)} keeps its checks and rejoins the streak, marked as rescued.</p><button className="primary" onClick={() => {if (change({type: 'rescue', value: true})) open(null);}}>Rescue this day</button></>
   : sheet === 'rest' ? <><span className="sheet-mark"><Mark name="rest"/></span><p>{restsLeft(state, dayKey)} of this week’s rest days left. A rest day keeps the streak and is never a miss.</p><button className="primary" onClick={() => {if (change({type: 'rest', value: true})) {open(null); bump('rest', 1600);}}}>Rest today</button><button className="text-button" onClick={() => {open(null); navigate('rest');}}>Plan the week instead</button></>
   : sheet === 'weight' ? <Weight onSave={weight => {if (change({type: 'weight', weight}, today)) open(null);}}/>
   : sheet === 'setup' ? <Setup initial={profile} onSave={(stats, overrides, units) => {if (change({type: 'profile', stats, overrides}, today)) {change({type: 'units', units}, today); open(null);}}}/>
   : sheet === 'targets' ? <TargetForm targets={profile.targets} onSave={overrides => {if (change({type: 'profile', stats: profile, overrides}, today)) open(null);}}/>
   : sheet === 'treats' ? <RewardsForm rewards={profile.rewards ?? []} onSave={rewards => {if (change({type: 'rewards', rewards}, today)) open(null);}}/>
   : sheet === 'containers' ? <ContainersForm containers={containersOf(profile).list} defaultId={containersOf(profile).default.id} onSave={(containers, defaultContainer) => {if (change({type: 'containers', containers, defaultContainer}, today)) open(null);}}/>
   : sheet === 'plan' ? <PlanForm plan={profile.plan} onSave={workout => {if (change({type: 'plan', workout}, today)) open(null);}}/>
   : sheet === 'zone' ? <><p>Use {todayZone().replaceAll('_', ' ')} from now on. Today keeps its place; the next day starts at local midnight.</p><button className="primary" onClick={() => {change({type: 'zone'}, today); open(null);}}>Use local time</button></>
   : sheet === 'lock' ? <><p>{store.pending.length ? 'Sync your waiting changes before locking.' : 'This clears saved data from this device. Your synced history stays.'}</p><button className="primary" disabled={store.pending.length > 0 || !store.online} onClick={() => {void lock(); open(null);}}>Lock and clear</button></>
   : <About/>}
  </Sheet>}
 </main></AppContext.Provider>;
}
function Gate({notice}: {notice: string}) {const [error, setError] = useState(''); const [busy, setBusy] = useState(false); return <main className="gate"><Hills className="gate-scene"/><form onSubmit={async e => {e.preventDefault(); setBusy(true); setError(await unlock(String(new FormData(e.currentTarget).get('passphrase')))); setBusy(false);}}><h1 className="gate-title">My Wellness</h1><label>Passphrase<input name="passphrase" type="password" autoComplete="current-password" required/></label><button className="primary" disabled={busy}>{busy ? 'Opening…' : 'Open'}</button>{(error || notice) && <p role="alert">{error || notice}</p>}</form></main>;}
export {names};
