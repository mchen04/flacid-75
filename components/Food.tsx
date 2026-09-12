'use client';
import {useEffect, useLayoutEffect, useRef, useState, type FormEvent} from 'react';
import {Bowl} from './Scenes';
import {Icon} from './Icon';
import {totals, entriesInOrder, type MealRecord} from '@/lib/domain';
import {limits, clip, chars, mealTextError} from '@/lib/bounds';
import {scaleMealPortion} from '@/lib/meal';
import type {Estimate, EstimateItem} from '@/lib/validation';
import {useApp, Meter, format, names, shortDate} from './shared';
export function Food() {
 const {day, dayKey, today, done, change, open, pulse} = useApp();
 const food = totals(day); const meals = entriesInOrder(day.meals, day.mealOrder);
 const [editing, setEditing] = useState<string | null>(null);
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
    ? <div key={id} className="meal-edit"><Meal photo={null} initial={m} count={0} day={dayKey} today={today} onPhotoConsumed={() => {}} onCamera={() => {}} onList={() => {}} onSave={meal => {const ok = change({type: 'meal', mealId: id, ...meal}); if (ok) setEditing(null); return ok;}}/><button className="secondary" onClick={() => setEditing(null)}>Cancel</button></div>
    : <div className="meal-row" key={id}><div><strong>{m.description || m.items?.map(item => item.name).join(', ') || `Meal ${i + 1}`}</strong><p>{format(m.calories)} kcal · {m.protein} g protein{m.items?.length ? ' · estimate' : ''}</p>{m.items?.map((item, j) => <p key={j}>{item.name} · {item.grams} g</p>)}</div><button onClick={() => setEditing(id)} aria-label={`Correct meal ${i + 1}`}><Icon name="edit" size={16}/>Edit</button><button aria-label={`Remove meal ${i + 1}`} onClick={() => change({type: 'deleteMeal', mealId: id})}><Icon name="close" size={16}/></button></div>)}
  </div>
  <p className="fine-print">Calories count when the day lands inside the range; protein when it reaches the target. The meal you describe or photograph goes to a free third-party model for the estimate; your logs sync to your private account and nowhere else.</p>
 </section>;
}
async function imageForRequest(file: File) {if (file.size > 25000000) throw new Error('That photo is too large.'); const bitmap = await createImageBitmap(file); const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale); canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close(); return canvas.toDataURL('image/jpeg', .75).split(',')[1];}
const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0));
type ItemNumber = 'grams' | 'calories' | 'protein';
export function Meal({photo, initial, count, day, today, onSave, onPhotoConsumed, onCamera, onList}: {photo: File | null; initial?: MealRecord; count: number; day: string; today: string; onPhotoConsumed: () => void; onCamera: () => void; onList: () => void; onSave: (meal: MealRecord) => boolean}) {
 const [text, setText] = useState(initial?.description ?? ''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [items, setItems] = useState<EstimateItem[] | null>(initial?.items?.length ? initial.items : null); const [manual, setManual] = useState(!!initial);
 const [calories, setCalories] = useState(initial ? String(initial.calories) : ''); const [protein, setProtein] = useState(initial ? String(initial.protein) : '');
 const [draft, setDraft] = useState<{i: number; field: ItemNumber; text: string} | null>(null); const hasItems = items !== null;
 const [itemIds, setItemIds] = useState(() => initial?.items?.map((_, i) => i) ?? []); const liveItemIds = useRef(itemIds); const nextItemId = useRef(initial?.items?.length ?? 0);
 const itemFields = useRef(new Map<number, HTMLInputElement>()); const sumField = useRef<HTMLParagraphElement>(null); const focusAfterRemove = useRef<number | null | undefined>(undefined);
 const lastItemRemoval = useRef<{x: number; y: number; at: number} | null>(null);
 const [portionWarning, setPortionWarning] = useState<number | null>(null);
 useLayoutEffect(() => {const id = focusAfterRemove.current; if (id === undefined) return; (id === null ? sumField.current : itemFields.current.get(id))?.focus(); focusAfterRemove.current = undefined;}, [items]);
 const portionBase = useRef<EstimateItem | null>(null); const [itemsChanged, setItemsChanged] = useState(false);
 const requestRef = useRef<AbortController | null>(null); const started = useRef(false); const saved = useRef(false); const first = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
 // The sheet's first field takes focus once this lazily loaded form is on screen; the autofocus attribute does not fire for content inserted later.
 useLayoutEffect(() => {if (hasItems && !photo) first.current?.focus();}, [photo, hasItems]);
 useEffect(() => {if (!hasItems && !photo) first.current?.focus();}, [photo, manual, hasItems]);
 async function estimate(withPhoto?: File) {setBusy(true); setError(''); const controller = new AbortController(); requestRef.current = controller;
 try {const image = withPhoto ? await imageForRequest(withPhoto) : undefined; const res = await fetch('/api/estimate', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text, image}), signal: controller.signal}); const result = await res.json() as Estimate & {error?: string}; if (!res.ok) throw new Error(result.error); const ids = result.items.map(() => nextItemId.current++); liveItemIds.current = ids; setItemIds(ids); setPortionWarning(null); setItems(result.items);} catch (e) {if (!controller.signal.aborted) setError((e instanceof Error ? e.message : 'No estimate right now.') + ' You can enter the numbers instead.');} finally {if (!controller.signal.aborted) {setBusy(false); if (withPhoto) onPhotoConsumed();}}}
 useEffect(() => {if (photo && !started.current) {started.current = true; void estimate(photo);} return () => {requestRef.current?.abort();};}, [photo]); // eslint-disable-line react-hooks/exhaustive-deps
 const addLabel = initial ? 'Save' : day === today ? 'Add to today' : `Add to ${shortDate(day)}`;
 // One save per sheet: a double tap on "Add" cannot log the same meal twice. Totals are bounded to what the account accepts.
 function save(c: number, p: number) {if (saved.current) return; const textError = mealTextError({description: text, items: items ?? undefined}); if (textError) {setError(textError); return;} if (c < limits.calories[0] || c > limits.calories[1] || p < limits.protein[0] || p > limits.protein[1]) {setError(`A meal must be 0–${limits.calories[1].toLocaleString()} kcal and 0–${limits.protein[1].toLocaleString()} g protein.`); return;} saved.current = true; if (!onSave({calories: c, protein: p, description: text, ...(items ? {items} : {})})) {saved.current = false; setError('This meal could not be saved. Try again.');}}
 function numberField(item: EstimateItem, i: number, field: ItemNumber) {
  return {value: draft?.i === i && draft.field === field ? draft.text : String(item[field]),
   onFocus: () => {if (field === 'grams') portionBase.current = item;}, onBlur: () => setDraft(null),
   onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value; setDraft({i, field, text}); if (!text.trim() || !Number.isFinite(Number(text))) return;
    const value = clamp(Number(text), field === 'grams' ? [0, 5000] : limits[field]);
    if (value !== Number(text)) setDraft({i, field, text: String(value)});
    const base = portionBase.current ?? item;
    setItems(items!.map((it, j) => j === i ? field === 'grams' ? scaleMealPortion(base, value) : {...it, [field]: value} : it));
    setItemsChanged(true);
    if (field === 'grams' && base.grams === 0 && value > 0) setPortionWarning(itemIds[i]);
    else if (portionWarning === itemIds[i]) setPortionWarning(null);
   }};
 }
 function removeItem(id: number, e: React.MouseEvent<HTMLButtonElement>) {
  const last = lastItemRemoval.current; const now = performance.now();
  // A second pointer click can land on the next row after the first removal scrolls it into place.
  if (e.detail && last && now - last.at < 600 && Math.abs(e.clientX - last.x) < 8 && Math.abs(e.clientY - last.y) < 8) return;
  if (e.detail) lastItemRemoval.current = {x: e.clientX, y: e.clientY, at: now};
  const i = liveItemIds.current.indexOf(id); if (i < 0) return;
  const remaining = liveItemIds.current.filter(key => key !== id); liveItemIds.current = remaining; setItemIds(remaining);
  focusAfterRemove.current = remaining[i] ?? remaining[i - 1] ?? null;
  setItems(current => current!.filter((_, j) => j !== i)); setItemsChanged(true); setDraft(null); portionBase.current = null;
  if (portionWarning === id) setPortionWarning(null);
 }
 function exceedsDescriptionLimit(el: HTMLTextAreaElement, inserted: string) {
  return chars(el.value) - chars(el.value.slice(el.selectionStart, el.selectionEnd)) + chars(inserted) > limits.mealDescription;
 }
 function descriptionBeforeInput(e: React.FormEvent<HTMLTextAreaElement>) {
  const input = e.nativeEvent as InputEvent;
  const inserted = input.data ?? (input.inputType === 'insertLineBreak' || input.inputType === 'insertParagraph' ? '\n' : input.dataTransfer?.getData('text/plain'));
  if (inserted && exceedsDescriptionLimit(e.currentTarget, inserted)) e.preventDefault();
 }
 function descriptionPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
  if (exceedsDescriptionLimit(e.currentTarget, e.clipboardData.getData('text/plain'))) e.preventDefault();
 }
 function descriptionChanged(e: React.ChangeEvent<HTMLTextAreaElement>) {
  const value = clip(e.currentTarget.value, limits.mealDescription);
  if (e.currentTarget.value !== value) e.currentTarget.value = value;
  setText(value);
 }
 const itemSum = items?.reduce((a, i) => ({calories: a.calories + i.calories, protein: a.protein + i.protein}), {calories: 0, protein: 0});
 const originalSum = initial?.items?.reduce((a, i) => ({calories: a.calories + i.calories, protein: a.protein + i.protein}), {calories: 0, protein: 0});
 // Keep older total corrections until item numbers are edited.
 const sum = itemSum && {calories: !itemsChanged && originalSum?.calories === itemSum.calories ? initial!.calories : itemSum.calories, protein: !itemsChanged && originalSum?.protein === itemSum.protein ? initial!.protein : itemSum.protein};
 if (items && sum) return <div className="found"><label>Description<textarea ref={first as React.RefObject<HTMLTextAreaElement>} value={text} onBeforeInput={descriptionBeforeInput} onPaste={descriptionPaste} onChange={descriptionChanged}/></label><ul className="items">{items.map((item, i) => {const id = itemIds[i]; return <li key={id}><fieldset><legend>Item {i + 1}: {item.name || 'Unnamed item'}</legend>
  <div><label>Item name<input ref={el => {if (el) itemFields.current.set(id, el); else itemFields.current.delete(id);}} value={item.name} onChange={e => setItems(items.map((it, j) => j === i ? {...it, name: clip(e.target.value, 120)} : it))}/></label>
   <label>Portion · g<input type="number" inputMode="decimal" min="0" max="5000" step="0.1" {...numberField(item, i, 'grams')}/></label>
   <small> {item.source === 'usda' ? 'USDA · ' + item.match : 'estimate'}</small><button type="button" className="text-button" aria-label={`Remove item ${i + 1}: ${item.name || 'Unnamed item'}`} onClick={e => removeItem(id, e)}>Remove item</button></div>
  <label>Calories · kcal<input type="number" inputMode="decimal" min="0" max="10000" {...numberField(item, i, 'calories')}/></label>
  <label>Protein · g<input type="number" inputMode="decimal" min="0" max="1000" step="0.1" {...numberField(item, i, 'protein')}/></label>
 </fieldset></li>;})}</ul>
  <p className="sum" ref={sumField} tabIndex={-1}><strong>{format(sum.calories)} kcal · {Math.round(sum.protein * 10) / 10} g protein</strong> estimate</p>
  {(error || portionWarning !== null) && <p className="form-error" role="alert">{error || 'The starting portion was 0 g. Enter the calories and protein for this portion.'}</p>}
  <button className="primary" onClick={() => save(Math.round(sum.calories), Math.round(sum.protein * 10) / 10)}>{addLabel}</button>{!initial && <button className="secondary" onClick={() => {setItems(null); setPortionWarning(null); setError(''); setDraft(null); portionBase.current = null;}}>Not this</button>}</div>;
 return <form onSubmit={(e: FormEvent<HTMLFormElement>) => {e.preventDefault(); if (manual) save(Number(calories), Number(protein)); else void estimate();}}>
 <span className="sheet-art"><Bowl full eating={busy}/></span>
 {manual ? <><label>Description<textarea value={text} onBeforeInput={descriptionBeforeInput} onPaste={descriptionPaste} onChange={descriptionChanged}/></label><div className="form-grid"><label>Calories · kcal<input ref={first as React.RefObject<HTMLInputElement>} name="calories" value={calories} onChange={e => setCalories(e.target.value)} type="number" inputMode="decimal" min="0" max="10000" step="1" required/></label><label>Protein · g<input name="protein" value={protein} onChange={e => setProtein(e.target.value)} type="number" inputMode="decimal" min="0" max="1000" step="0.1" required/></label></div></> : <label>What did you eat?<textarea ref={first as React.RefObject<HTMLTextAreaElement>} value={text} onBeforeInput={descriptionBeforeInput} onPaste={descriptionPaste} onChange={descriptionChanged} maxLength={1000} placeholder="two eggs and toast"/></label>}
 {error && <p className="form-error" role="alert">{error}</p>}
 {manual ? <button className="primary" disabled={calories === '' || protein === ''}>{initial ? 'Save' : addLabel}</button> : <button className="primary" disabled={busy || (!text.trim() && !photo)}>{busy ? 'Looking…' : 'Look it up'}</button>}
 {busy && <button type="button" className="text-button" onClick={() => {requestRef.current?.abort(); setBusy(false); onPhotoConsumed();}}>Stop</button>}
 <div className="meal-tools">{!initial && <button type="button" className="text-button" onClick={() => setManual(!manual)}>{manual ? 'Describe it instead' : 'Enter numbers'}</button>}{!manual && <button type="button" className="text-button" onClick={onCamera}>Photo</button>}{count > 0 && <button type="button" className="text-button" onClick={onList}>Today’s food · {count}</button>}</div>
 </form>;
}

export default function FoodChunk(p: {kind: 'page'} | ({kind: 'meal'} & Parameters<typeof Meal>[0])) {return p.kind === 'page' ? <Food/> : <Meal {...p}/>;}
