'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {Bowl} from './Scenes';
import {Icon} from './Icon';
import {totals} from '@/lib/domain';
import type {Estimate, EstimateItem} from '@/lib/validation';
import {useApp, Meter, format, names} from './shared';
export function Food() {
 const {day, done, change, open, pulse} = useApp();
 const food = totals(day); const meals = Object.entries(day.meals);
 const [editing, setEditing] = useState<string | null>(null); const [calories, setCalories] = useState(''); const [protein, setProtein] = useState('');
 function startEdit(id: string) {setEditing(id); setCalories(String(day.meals[id].calories)); setProtein(String(day.meals[id].protein));}
 return <section className="activity">
  <div className={`card food-card ${done.calories && done.protein ? 'is-done' : ''} ${pulse.meal ? 'eating' : ''}`}>
   <div className="food-art"><Bowl full={food.calories > 0} eating={!!pulse.meal} level={food.calories / Math.max(1, day.targets.calorieMax)}/></div>
   <div className="food-copy"><strong className="big">{format(food.calories)} kcal</strong>
    <Meter label={names.calories} value={food.calories} min={day.targets.calorieMin} max={day.targets.calorieMax} unit="kcal" done={done.calories} display={`${format(day.targets.calorieMin)}–${format(day.targets.calorieMax)}`}/>
    <Meter label={names.protein} value={food.protein} max={day.targets.protein} unit="g" done={done.protein}/></div>
  </div>
  <button className="primary" onClick={() => open('meal')}><Icon name="plus" size={18}/>Log a meal</button>
  <div className="card list" role="group" aria-label="Meals">
   {meals.length === 0 && <p className="empty">Nothing logged yet. Describe a meal, snap a photo, or type the numbers.</p>}
   {meals.map(([id, m], i) => editing === id
    ? <form key={id} className="meal-edit" onSubmit={e => {e.preventDefault(); if (change({type: 'meal', mealId: id, calories: Number(calories), protein: Number(protein)})) setEditing(null);}}><strong>Meal {i + 1}</strong><div className="form-grid"><label>Calories · kcal<input value={calories} onChange={e => setCalories(e.target.value)} type="number" inputMode="decimal" min="0" max="10000" required autoFocus/></label><label>Protein · g<input value={protein} onChange={e => setProtein(e.target.value)} type="number" inputMode="decimal" min="0" max="1000" step="0.1" required/></label></div><div className="controls"><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button><button className="primary">Save</button></div></form>
    : <div className="meal-row" key={id}><div><strong>Meal {i + 1}</strong><p>{format(m.calories)} kcal · {m.protein} g protein · estimate</p></div><button onClick={() => startEdit(id)} aria-label={`Correct meal ${i + 1}`}><Icon name="edit" size={16}/>Edit</button><button aria-label={`Remove meal ${i + 1}`} onClick={() => change({type: 'deleteMeal', mealId: id})}><Icon name="close" size={16}/></button></div>)}
  </div>
  <p className="fine-print">Calories count when the day lands inside the range; protein when it reaches the target. Estimates come from your words or photo and are always yours to correct. Only the meal you describe or photograph goes to the food estimator; your logs sync to your private account and nowhere else.</p>
 </section>;
}
async function imageForRequest(file: File) {if (file.size > 25000000) throw new Error('That photo is too large.'); const bitmap = await createImageBitmap(file); const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale); canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close(); return canvas.toDataURL('image/jpeg', .75).split(',')[1];}
export function Meal({photo, initial, count, onSave, onPhotoConsumed, onCamera, onList}: {photo: File | null; initial?: {calories: number; protein: number}; count: number; onPhotoConsumed: () => void; onCamera: () => void; onList: () => void; onSave: (calories: number, protein: number) => void}) {
 const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [items, setItems] = useState<EstimateItem[] | null>(null); const [manual, setManual] = useState(!!initial);
 const [calories, setCalories] = useState(initial ? String(initial.calories) : ''); const [protein, setProtein] = useState(initial ? String(initial.protein) : '');
 const requestRef = useRef<AbortController | null>(null); const started = useRef(false); const saved = useRef(false);
 async function estimate(withPhoto?: File) {setBusy(true); setError(''); const controller = new AbortController(); requestRef.current = controller;
 try {const image = withPhoto ? await imageForRequest(withPhoto) : undefined; const res = await fetch('/api/estimate', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text, image}), signal: controller.signal}); const result = await res.json() as Estimate & {error?: string}; if (!res.ok) throw new Error(result.error); setItems(result.items);} catch (e) {if (!controller.signal.aborted) setError((e instanceof Error ? e.message : 'No estimate right now.') + ' You can enter the numbers instead.');} finally {if (!controller.signal.aborted) {setBusy(false); if (withPhoto) onPhotoConsumed();}}}
 useEffect(() => {if (photo && !started.current) {started.current = true; void estimate(photo);} return () => {requestRef.current?.abort();};}, [photo]); // eslint-disable-line react-hooks/exhaustive-deps
 // One save per sheet: a double tap on "Add" cannot log the same meal twice.
 function save(c: number, p: number) {if (saved.current) return; saved.current = true; onSave(c, p);}
 const sum = items?.reduce((a, i) => ({calories: a.calories + i.calories, protein: a.protein + i.protein}), {calories: 0, protein: 0});
 if (items && sum) return <div className="found"><ul className="items">{items.map((item, i) => <li key={i}><div><strong>{item.name}</strong><small>{item.grams} g · {item.source === 'usda' ? 'USDA · ' + item.match : 'estimate'}</small></div><label>kcal<input type="number" inputMode="decimal" min="0" max="10000" value={item.calories} onChange={e => setItems(items.map((it, j) => j === i ? {...it, calories: Number(e.target.value)} : it))}/></label><label>g<input type="number" inputMode="decimal" min="0" max="1000" step="0.1" value={item.protein} onChange={e => setItems(items.map((it, j) => j === i ? {...it, protein: Number(e.target.value)} : it))}/></label></li>)}</ul>
  <p className="sum"><strong>{format(sum.calories)} kcal · {Math.round(sum.protein * 10) / 10} g protein</strong> estimate</p>
  <button className="primary" onClick={() => save(Math.round(sum.calories), Math.round(sum.protein * 10) / 10)}>Add to today</button><button className="secondary" onClick={() => {setItems(null);}}>Not this</button></div>;
 return <form onSubmit={(e: FormEvent<HTMLFormElement>) => {e.preventDefault(); if (manual) save(Number(calories), Number(protein)); else void estimate();}}>
 <span className="sheet-art"><Bowl full eating={busy}/></span>
 {manual ? <div className="form-grid"><label>Calories · kcal<input name="calories" value={calories} onChange={e => setCalories(e.target.value)} type="number" inputMode="decimal" min="0" max="10000" step="1" required autoFocus/></label><label>Protein · g<input name="protein" value={protein} onChange={e => setProtein(e.target.value)} type="number" inputMode="decimal" min="0" max="1000" step="0.1" required/></label></div> : <label>What did you eat?<textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder="two eggs and toast" autoFocus={!photo}/></label>}
 {error && <p className="form-error" role="alert">{error}</p>}
 {manual ? <button className="primary" disabled={calories === '' || protein === ''}>{initial ? 'Save' : 'Add to today'}</button> : <button className="primary" disabled={busy || (!text.trim() && !photo)}>{busy ? 'Looking…' : 'Look it up'}</button>}
 {busy && <button type="button" className="text-button" onClick={() => {requestRef.current?.abort(); setBusy(false); onPhotoConsumed();}}>Stop</button>}
 <div className="meal-tools">{!initial && <button type="button" className="text-button" onClick={() => setManual(!manual)}>{manual ? 'Describe it instead' : 'Enter numbers'}</button>}{!manual && <button type="button" className="text-button" onClick={onCamera}>Photo</button>}{count > 0 && <button type="button" className="text-button" onClick={onList}>Today’s food · {count}</button>}</div>
 </form>;
}
