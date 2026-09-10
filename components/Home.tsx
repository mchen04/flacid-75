'use client';
import {Hills, Glass, Bowl, Mark, type Phase} from './Scenes';
import {Icon} from './Icon';
import {habits, totals, restsLeft, pointsBalance, streaks, milestoneDays, type Habit} from '@/lib/domain';
import {clock, getTimer, elapsedSeconds, isRunning, clearTimer} from '@/lib/timer';
import {routines, routineSeconds} from '@/lib/abs';
import {useApp, Row, Meter, names, format, litres} from './shared';
export function Home({hour, stumbled}: {hour: number; stumbled: boolean}) {
 const {state, today, dayKey, selected, day, done, pulse, lastMeal, change, navigate, open, bump} = useApp();
 const count = Object.values(done).filter(Boolean).length; const complete = count === habits.length; const food = totals(day);
 const phase: Phase = hour < 11 ? 'morning' : hour < 17 ? 'day' : hour < 21 ? 'evening' : 'night';
 const rests = restsLeft(state, dayKey); const points = pointsBalance(state, today); const streak = streaks(state, today);
 const nextMilestone = milestoneDays.find(m => m > streak.current);
 // Dashboard log and undo. A running timer for that habit is finished with its elapsed time and ticks (never left counting unseen);
 // undoing a timed session removes the session, so a later plain log does not inherit its minutes.
 function toggle(h: Habit) {
  const before = done[h]; const timed = h === 'walk' || h === 'workout' || h === 'abs'; const t = timed ? getTimer(h) : null;
  if (!before && timed && t && t.day === dayKey) {const seconds = elapsedSeconds(t); const items = (t.meta?.items as string | undefined)?.split('\n').filter(Boolean); const routine = h === 'abs' ? (routines.find(r => r.id === t.meta?.routine) ?? routines[1]) : null; clearTimer(h); if (change({type: 'session', habit: h as 'walk' | 'workout' | 'abs', seconds: routine ? Math.min(seconds, routineSeconds(routine)) : seconds, done: true, ...(items?.length ? {items} : {}), ...(routine ? {routine: routine.name} : {})}, dayKey)) bump(h, h === 'walk' ? 2000 : 1400); return;}
  if (before && timed && day.sessions?.[h as 'walk' | 'workout' | 'abs']) {change({type: 'session', habit: h as 'walk' | 'workout' | 'abs', seconds: 0, done: false}, dayKey); return;}
  if (change({type: 'check', habit: h, value: !before}, dayKey)) bump(h, h === 'walk' ? 2000 : 1400);
 }
 function pour() {if (change({type: 'water', amount: 250}, dayKey)) bump('water', 900);}
 function restTap() {if (day.rest) {change({type: 'rest', value: false}, dayKey); return;} if (!rests) {navigate('rest'); return;} if (change({type: 'rest', value: true}, dayKey)) bump('rest', 1600);}
 const session = (h: 'walk' | 'workout' | 'abs') => day.sessions?.[h];
 const live = (key: string) => {const t = getTimer(key); return t && t.day === dayKey ? `${isRunning(t) ? 'Running' : 'Paused'} · ${clock(elapsedSeconds(t))}` : null;};
 const walkStatus = done.walk ? `Walked${session('walk') ? ` · ${Math.round(session('walk')!.seconds / 60)} min` : ''}` : live('walk') ?? `${day.targets.walkMinutes ?? 30} min today`;
 const workoutStatus = done.workout ? `Done${session('workout')?.items?.length ? ` · ${session('workout')!.items!.length} moves` : ''}` : live('workout') ?? 'Plan and checklist';
 const absStatus = done.abs ? `Done${session('abs')?.routine ? ` · ${session('abs')!.routine}` : ''}` : live('abs') ?? 'Guided routines';
 const next = !complete ? habits.find(h => !done[h]) : null;
 // The hero leads to whatever comes next: the page for the next habit, rest planning on a rest day, progress when the day is complete.
 const heroPage = day.rest ? 'rest' : complete ? 'progress' : next === 'protein' || next === 'calories' ? 'food' : next ?? 'walk';
 const heroName = day.rest ? 'rest days' : complete ? 'progress' : heroPage === 'food' ? 'food' : names[next ?? 'walk'].toLowerCase();
 const undoMeal = !!pulse.meal && !!lastMeal && lastMeal.day === dayKey && !!day.meals[lastMeal.id];
 return <section className="home-view">
  <button className={`hero ${done.walk ? 'is-done' : ''} ${pulse.walk ? 'moving' : ''} ${complete ? 'is-complete' : ''}`} aria-label={`Open ${heroName}. ${count} of ${habits.length} habits done today`} onClick={() => navigate(heroPage)}>
   <Hills phase={day.rest ? 'night' : phase} walked={done.walk} progress={count / habits.length} celebrate={complete && !selected}/>
   <span className="hero-copy"><strong>{complete && !selected ? 'Every one.' : day.rest ? 'Resting today.' : stumbled ? 'A fresh start.' : next ? `Next: ${names[next].toLowerCase()}.` : 'Today.'}</strong><span>{complete ? `All ${habits.length} habits` : day.rest ? 'The streak stays.' : `${count} of ${habits.length} today`}</span></span>
   <span className="hero-tag">{done.walk ? <><Icon name="check" size={14}/>Walked</> : <><Mark name="walk"/>Walk</>}</span>
   {nextMilestone && streak.current > 0 && !complete && <span className="hero-progress">{nextMilestone - streak.current} day{nextMilestone - streak.current === 1 ? '' : 's'} to {nextMilestone}</span>}
   {complete && !selected && <span className="hero-progress">+{format(habits.length * 10 + 30)} points</span>}
  </button>
  <p className="row-head">Today</p>
  <div className="rows">
   <Row mark="walk" title="Walk" status={walkStatus} done={done.walk} onOpen={() => navigate('walk')} actionLabel={done.walk ? 'Undo walk' : 'Log walk'} onAction={() => toggle('walk')} pressed={done.walk} pulse={pulse.walk ? 'moving' : ''}/>
   <Row mark="workout" title="Workout" status={workoutStatus} done={done.workout} onOpen={() => navigate('workout')} actionLabel={done.workout ? 'Undo workout' : 'Log workout'} onAction={() => toggle('workout')} pressed={done.workout} pulse={pulse.workout ? 'lifting' : ''}/>
   <Row mark="abs" title="Abs" status={absStatus} done={done.abs} onOpen={() => navigate('abs')} actionLabel={done.abs ? 'Undo abs' : 'Log abs'} onAction={() => toggle('abs')} pressed={done.abs} pulse={pulse.abs ? 'crunching' : ''}/>
   <Row mark="floss" title="Floss" status={done.floss ? 'Flossed' : 'Once today'} done={done.floss} onOpen={() => navigate('floss')} actionLabel={done.floss ? 'Undo floss' : 'Log floss'} onAction={() => toggle('floss')} pressed={done.floss} pulse={pulse.floss ? 'shining' : ''}/>
   <div className={`row water ${done.water ? 'is-done' : ''} ${pulse.water ? 'pouring' : ''}`}>
    <button className="row-open" onClick={() => navigate('water')} aria-label="Open water"><span className="row-art glass-art"><Glass level={day.water / day.targets.water} pouring={!!pulse.water}/></span><span className="row-copy"><span className="row-title">Water</span><span className="row-status">{Math.round(day.water / 250)} of {Math.round(day.targets.water / 250)} · {litres(day.water)} L</span><Meter label="" value={day.water} max={day.targets.water} unit="" done={done.water} display=""/></span><span className="row-chevron"><Icon name="arrow" size={18}/></span></button>
    <span className="row-actions"><button className="row-action is-minus" aria-label="Remove a glass" disabled={day.water <= 0} onClick={() => change({type: 'water', amount: -250}, dayKey)}><Icon name="minus" size={16}/></button><button className="row-action is-add is-icon" aria-label="Add a glass of water" onClick={pour}><Icon name="plus" size={18}/></button></span>
   </div>
   <div className={`row food ${done.calories && done.protein ? 'is-done' : ''} ${pulse.meal ? 'eating' : ''}`}>
    <button className="row-open" onClick={() => navigate('food')} aria-label="Open food"><span className="row-art bowl-art"><Bowl full={food.calories > 0} eating={!!pulse.meal} level={food.calories / Math.max(1, day.targets.calorieMax)}/></span><span className="row-copy"><span className="row-title">Food</span><span className="row-status">{format(food.calories)} kcal · {format(food.protein)}/{format(day.targets.protein)} g</span><Meter label="" value={food.calories} min={day.targets.calorieMin} max={day.targets.calorieMax} unit="" done={done.calories} display=""/></span><span className="row-chevron"><Icon name="arrow" size={18}/></span></button>
    {undoMeal ? <button className="row-action" aria-label="Undo last meal" onClick={() => change({type: 'deleteMeal', mealId: lastMeal!.id}, lastMeal!.day)}><Icon name="undo" size={16}/>Undo</button> : <button className="row-action is-add" aria-label="Log a meal" onClick={() => open('meal')}><Icon name="plus" size={16}/>Meal</button>}
   </div>
   <Row mark="rest" title="Rest" status={day.rest ? 'Resting today · the streak stays' : `${rests} of 2 left this week`} done={day.rest} onOpen={() => navigate('rest')} tone="rest" action={<button className="row-action" aria-label={day.rest ? 'Undo rest' : 'Rest today'} aria-pressed={day.rest} onClick={restTap}>{day.rest ? <><Icon name="check" size={16}/>Undo</> : 'Rest'}</button>} pulse={pulse.rest ? 'dozing' : ''}/>
  </div>
  <p className="row-head">Optional · never counted</p>
  <div className="rows">
   <Row mark="meditate" title="Meditate" status={day.meditate ? `${Math.round(day.meditate / 60)} min today` : live('meditate') ?? 'A few quiet minutes'} done={!!day.meditate} onOpen={() => navigate('meditate')} tone="optional" action={<button className="row-action" aria-label="Open meditate timer" onClick={() => navigate('meditate')}><Icon name="play" size={16}/>Start</button>}/>
   <Row mark="focus" title="Focus" status={day.focus ? `${Math.round(day.focus / 60)} min focused today` : live('focus') ?? 'Work and break blocks'} done={!!day.focus} onOpen={() => navigate('focus')} tone="optional" action={<button className="row-action" aria-label="Open focus timer" onClick={() => navigate('focus')}><Icon name="play" size={16}/>Start</button>}/>
  </div>
  <p className="row-head">More</p>
  <div className="rows">
   <Row mark="reward" title="Treats" status={`${format(points)} points to spend`} onOpen={() => navigate('rewards')} tone="more" action={<button className="row-action" aria-label="Spend points" onClick={() => navigate('rewards')}><Icon name="gift" size={16}/>Spend</button>}/>
   <Row mark="progress" title="Progress" status={`${streak.current} day streak · longest ${streak.longest}`} onOpen={() => navigate('progress')} tone="more" action={<button className="row-action" aria-label="View progress" onClick={() => navigate('progress')}><Icon name="trends" size={16}/>View</button>}/>
  </div>
  <div className="home-links"><button className="text-button" onClick={() => navigate('you')}><Icon name="settings" size={16}/>Settings</button><button className="text-button" onClick={() => navigate('rules')}><Icon name="info" size={16}/>How it works</button></div>
 </section>;
}
