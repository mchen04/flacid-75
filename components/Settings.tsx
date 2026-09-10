'use client';
import {useState} from 'react';
import {Brand} from './Scenes';
import {Icon} from './Icon';
import {habits, defaultUnits, defaultPlan, restDaysPerWeek, pointsPerHabit, pointsPerDay, type Stats, type Targets, type Units} from '@/lib/domain';
import {feetInches, formatHeight, formatWeight, parseHeight, parseWeight, toLb} from '@/lib/units';
import {soundOn, setSound} from '@/lib/sound';
import {useApp} from './shared';
export function You({notice}: {notice: string}) {
 const {state, today, units, change, open, navigate} = useApp();
 const [sound, setSoundState] = useState(soundOn);
 const profile = state.profile!;
 function setUnits(next: Partial<Units>) {change({type: 'units', units: {...units, ...next}}, today);}
 return <section className="you-view">
  {notice && <p className="notice-row" role="status">{notice}</p>}
  <div className="card list"><div className="card-head"><h2>Units</h2></div>
   <div className="setting-row"><span>Weight</span><div className="segmented small" role="group" aria-label="Weight unit">{(['lb', 'kg'] as const).map(u => <button key={u} className={units.weight === u ? 'active' : ''} aria-pressed={units.weight === u} onClick={() => setUnits({weight: u})}>{u}</button>)}</div></div>
   <div className="setting-row"><span>Height</span><div className="segmented small" role="group" aria-label="Height unit">{([['ftin', 'ft in'], ['cm', 'cm']] as const).map(([u, l]) => <button key={u} className={units.height === u ? 'active' : ''} aria-pressed={units.height === u} onClick={() => setUnits({height: u})}>{l}</button>)}</div></div>
   <p className="fine-print">Your measurements are stored once and only displayed in the unit you choose. Switching never rounds them: {formatWeight(profile.weight, units)} and {formatHeight(profile.height, units)} right now.</p>
  </div>
  <div className="card list"><div className="card-head"><h2>Timers</h2></div>
   <div className="setting-row"><span>Sound cues</span><button className={`toggle ${sound ? 'is-on' : ''}`} role="switch" aria-checked={sound} onClick={() => {setSound(!sound); setSoundState(!sound);}}><i/></button></div>
   <p className="fine-print">A short chime marks interval changes and the end of a timer. Off by default; stored on this device only. Vibration follows the phone’s own settings. While the phone is locked or the app is closed, the count stays right but no chime or buzz can play; cues catch up when you come back.</p>
  </div>
  <div className="card list">{[['targets', 'Daily targets'], ['setup', 'Your details'], ['weight', 'Weigh in'], ['plan', 'Workout plan'], ['treats', 'Treats'], ['about', 'How targets are set']].map(([key, label]) => <button key={key} className="setting-row" onClick={() => open(key)}><span>{label}</span><Icon name="arrow"/></button>)}<button className="setting-row" onClick={() => navigate('rules')}><span>How it works</span><Icon name="arrow"/></button><button className="setting-row" onClick={() => navigate('progress')}><span>History and progress</span><Icon name="arrow"/></button></div>
  <div className="install-note"><Brand size={72}/><p>My Wellness · Safari: Share, then Add to Home Screen.</p></div>
  <button className="text-button" onClick={() => open('lock')}>Lock this device</button>
 </section>;
}
export function Setup({initial, onSave}: {initial?: Stats & {overrides?: Partial<Targets>; units?: Units}; onSave: (s: Stats, o: Partial<Targets>, u: Units) => void}) {
 const [error, setError] = useState(''); const [units, setUnits] = useState<Units>(initial?.units ?? defaultUnits);
 const fi = initial ? feetInches(initial.height) : null;
 return <form className="setup-form" onSubmit={e => {e.preventDefault(); const f = new FormData(e.currentTarget); const activity = Number(f.get('activity')); const goal = f.get('goal');
  const height = parseHeight(String(f.get('feet') ?? ''), String(f.get('inches') ?? ''), String(f.get('cm') ?? ''), units); const weight = parseWeight(String(f.get('weight') ?? ''), units);
  if (![0, 1, 2, 3].includes(activity) || (goal !== 'maintain' && goal !== 'lose' && goal !== 'gain') || height === null || weight === null) {setError('Check your details.'); return;}
  if (height < 120 || height > 230 || weight < 35 || weight > 300) {setError('Those numbers are outside the range the targets can use.'); return;}
  // A field left at its displayed value keeps the exact stored measurement: display rounding must never rewrite the data.
  const keptHeight = initial && Math.abs(height - initial.height) < 1.3 ? initial.height : height;
  const keptWeight = initial && Math.abs(weight - initial.weight) < 0.06 ? initial.weight : weight;
  onSave({height: keptHeight, weight: keptWeight, age: Number(f.get('age')), activity: activity as Stats['activity'], goal}, initial?.overrides ?? {}, units);}}>
 {!initial && <h1>Welcome to My Wellness.</h1>}
 <div className="segmented" role="group" aria-label="Units">{([['lb', 'ftin', 'lb · ft in'], ['kg', 'cm', 'kg · cm']] as const).map(([w, h, l]) => <button type="button" key={w} className={units.weight === w ? 'active' : ''} aria-pressed={units.weight === w} onClick={() => setUnits({weight: w, height: h})}>{l}</button>)}</div>
 <div className="form-grid">
  {units.height === 'cm' ? <label>Height · cm<input name="cm" type="number" inputMode="decimal" min="120" max="230" step="0.1" defaultValue={initial ? Math.round(initial.height * 10) / 10 : undefined} placeholder="165" required/></label>
  : <div className="ftin"><label>Height · ft<input name="feet" type="number" inputMode="numeric" min="3" max="7" defaultValue={fi?.feet} placeholder="5" required/></label><label>in<input name="inches" type="number" inputMode="numeric" min="0" max="11" defaultValue={fi?.inches} placeholder="5" required/></label></div>}
  <label>Weight · {units.weight}<input name="weight" type="number" inputMode="decimal" min={units.weight === 'lb' ? 77 : 35} max={units.weight === 'lb' ? 661 : 300} step="0.1" defaultValue={initial ? Math.round((units.weight === 'lb' ? toLb(initial.weight) : initial.weight) * 10) / 10 : undefined} placeholder={units.weight === 'lb' ? '143' : '65'} required/></label>
  <label>Age<input name="age" type="number" inputMode="numeric" min="18" max="100" defaultValue={initial?.age} placeholder="30" required/></label>
  <label>Daily movement<select name="activity" defaultValue={initial?.activity ?? 1}><option value="0">Mostly sitting</option><option value="1">Lightly active</option><option value="2">Often moving</option><option value="3">Very active</option></select></label>
 </div>
 <label>Goal<select name="goal" defaultValue={initial?.goal ?? 'maintain'}><option value="maintain">Maintain</option><option value="lose">Lose weight</option><option value="gain">Gain</option></select></label><details><summary>How targets are set</summary><About/></details><button className="primary">{initial ? 'Update' : 'Start'}</button>{error && <p role="alert">{error}</p>}</form>;
}
export function TargetForm({targets, onSave}: {targets: Targets; onSave: (t: Partial<Targets>) => void}) {const [error, setError] = useState(''); const fields: [keyof Targets, string, number, number][] = [['calorieMin', 'Calories · lower', 1200, 6000], ['calorieMax', 'Calories · upper', 1200, 6500], ['protein', 'Protein · g', 20, 400], ['water', 'Water · ml', 500, 6000], ['steps', 'Steps', 500, 40000], ['walkMinutes', 'Walk · minutes', 5, 300]]; return <form onSubmit={e => {e.preventDefault(); const f = new FormData(e.currentTarget); const t = Object.fromEntries(fields.map(([k]) => [k, Number(f.get(k))])) as Targets; if (t.calorieMin > t.calorieMax) {setError('The lower number must be below the upper number.'); return;} onSave(t);}}><div className="form-grid">{fields.map(([key, label, min, max]) => <label key={key}>{label}<input name={key} type="number" inputMode="numeric" min={min} max={max} defaultValue={targets[key] ?? 30} required/></label>)}</div><button className="primary">Save</button><button className="text-button" type="button" onClick={() => onSave({})}>Use calculated targets</button>{error && <p role="alert">{error}</p>}</form>;}
export function Weight({onSave}: {onSave: (kg: number) => void}) {
 const {units} = useApp(); const [error, setError] = useState('');
 return <form onSubmit={e => {e.preventDefault(); const kg = parseWeight(String(new FormData(e.currentTarget).get('weight')), units); if (kg === null || kg < 35 || kg > 300) {setError('Enter a weight the trend can use.'); return;} onSave(Math.round(kg * 100) / 100);}}><label>Today’s weight · {units.weight}<input autoFocus name="weight" type="number" inputMode="decimal" min={units.weight === 'lb' ? 77 : 35} max={units.weight === 'lb' ? 661 : 300} step="0.1" required/></label><p className="fine-print">Only the smoothed trend is shown. Skipping never touches the streak.</p><button className="primary">Save</button>{error && <p role="alert">{error}</p>}</form>;
}
export function PlanForm({plan, onSave}: {plan?: string[]; onSave: (items: string[]) => void}) {
 const [text, setText] = useState((plan?.length ? plan : defaultPlan).join('\n'));
 return <div><label>One move per line<textarea value={text} onChange={e => setText(e.target.value)} rows={8} maxLength={2000}/></label><p className="fine-print">Your checklist for every workout. Tick moves as you go; the session clock starts on the first tick.</p><button className="primary" onClick={() => onSave(text.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 40))}>Save plan</button></div>;
}
export function About() {return <div className="about"><p>Calories use the adult female <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noreferrer">Mifflin–St Jeor equation</a>: 10 × kg + 6.25 × cm − 5 × age − 161, multiplied by activity (1.2, 1.375, 1.55 or 1.725) and adjusted −10%, 0% or +10% for the goal. The range is ±100 kcal with a 1500 kcal floor.</p><p>Protein starts at <a href="https://pubmed.ncbi.nlm.nih.gov/28698222/" target="_blank" rel="noreferrer">1.6 g/kg</a>. Water starts at 30 ml/kg within 1.5–3.5 L. Steps start at 6,000–10,000 by activity; the walk timer defaults to 30 minutes. A 2% change in your smoothed weight updates calculated targets; edited targets stay yours.</p><p>Food estimates come from your description or photo, matched against the USDA FoodData Central database where possible, and are always editable. Photos are never saved.</p></div>;}
// The rules, written out. Every default here is deliberate and reversible; the same text lives in evidence/my-wellness/RULES.md.
export function Rules() {return <section className="activity rules"><div className="card about">
 <h2>What a day is</h2><p>A day is your local calendar day. Your timezone is anchored when you set up; if the phone’s zone changes, a banner offers to re-anchor. Today keeps its place and the next day starts at the new local midnight. Nothing in the past is relabelled.</p>
 <h2>Required and optional</h2><p>Seven habits count: workout, abs, walk, water, protein, calories and floss. A day is complete when all seven are done. Meditation and focus blocks are optional: they are logged and shown, and never affect the streak or the points.</p>
 <h2>Completion</h2><p>Workout, abs, walk and floss are done when you say so, by finishing a session or tapping Log. Water is done at its target; protein at its target; calories when the total lands inside the range. Any tap can be undone with one more tap.</p>
 <h2>Rest days</h2><p>{restDaysPerWeek} rest days each Monday–Sunday week. Plan them ahead or take one on the day. A rest day keeps the streak exactly where it is: it is not a miss and it does not add a day. Weeks before this rule keep whatever they had.</p>
 <h2>Rollover</h2><p>At midnight an unfinished day becomes a missed day and the streak returns to zero, unless it was a rest day or you rescue it later from Progress. During the day the streak shows yesterday’s count until you finish. A timer that runs past midnight credits the day it was started on.</p>
 <h2>Points and treats</h2><p>Each required habit is {pointsPerHabit} points and a complete day adds {pointsPerDay}. Treats are anything you choose and cost what you decide. Redeeming can be undone the same day. Food is never a reward and never has to be earned.</p>
 <h2>Timers</h2><p>Timers count from the clock, not from ticks, so a locked phone or a backgrounded app keeps the right time. A closed tab keeps its timer too; reopen and it resumes. Cues are visual by default; sound is optional in Settings.</p>
 <h2>Your data</h2><p>Logs live on this device and in your private account. Only the meal you describe or photograph is sent for a food estimate, to free models only. No other log leaves the device.</p>
</div></section>;}
export {habits};
