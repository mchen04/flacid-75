'use client';
import {useEffect, useRef, useState} from 'react';
import {Hills, Gym, Mat, Tooth, NightRest, Glass, Mark} from './Scenes';
import {Icon} from './Icon';
import {addDays, weekStart, completion, isComplete, isKept, restsLeft, restDaysPerWeek, defaultPlan, dayDiff, type Habit} from '@/lib/domain';
import {routines, phaseAt, routineSeconds, intervalsOf, type Routine} from '@/lib/abs';
import {useTimer, startTimer, pauseTimer, resumeTimer, clearTimer, updateTimer, useWakeLock, clock, type Timer} from '@/lib/timer';
import {finishTimer, maxSessionSeconds} from '@/lib/sessions';
import {prime, beep, buzz, soundOn} from '@/lib/sound';
import {maxFocusBlocks} from '@/lib/settle';
import {useApp, Dial, Meter, weekInitials, longDate, shortDate} from './shared';
import {containersOf} from '@/lib/domain';
import {formatVolume} from '@/lib/units';
import {parsePhrase, pourMl, describe, inContainers, type Parsed} from '@/lib/water';
import {limits} from '@/lib/bounds';
// Shared timer controls. Start primes audio inside the tap, so later cues can sound; the timer itself is wall-clock based (lib/timer.ts).
function Controls({timerKey, running, hasTimer, onFinish, finishLabel = 'Finish', disabled = false}: {timerKey: string; running: boolean; hasTimer: boolean; onFinish: () => void; finishLabel?: string; disabled?: boolean}) {
 const {dayKey} = useApp();
 return <div className="controls">
  {!hasTimer ? <button className="primary" disabled={disabled} onClick={() => {void prime(); startTimer(timerKey, dayKey); buzz();}}><Icon name="play" size={18}/>Start</button>
  : <>
   <button className="secondary" onClick={() => {if (running) pauseTimer(timerKey); else {void prime(); resumeTimer(timerKey);}}} aria-pressed={!running}>{running ? <><Icon name="pause" size={18}/>Pause</> : <><Icon name="play" size={18}/>Resume</>}</button>
   <button className="primary" onClick={onFinish}><Icon name="check" size={18}/>{finishLabel}</button>
  </>}
 </div>;
}
// A timer left over from another day: the user chooses where it goes rather than silently backfilling.
function StaleCard({timer, elapsed, label, onFinish}: {timer: Timer; elapsed: number; label: string; onFinish: () => void}) {
 return <div className="card done-card stale-card"><span className="done-mark"><Icon name="timer" size={22}/></span><div><strong>{label} from {shortDate(timer.day)}</strong><p>{clock(elapsed)} on the clock. Log it to that day, or start fresh today.</p></div><div className="stale-actions"><button className="text-button" onClick={onFinish}>Log to {shortDate(timer.day)}</button><button className="text-button" onClick={() => clearTimer(timer.key)}>Start fresh</button></div></div>;
}
function DoneCard({title, detail, onUndo}: {title: string; detail: string; onUndo: () => void}) {
 return <div className="card done-card"><span className="done-mark"><Icon name="check" size={22}/></span><div><strong>{title}</strong><p>{detail}</p></div><button className="text-button" onClick={onUndo}><Icon name="undo" size={16}/>Undo</button></div>;
}
function WeekStrip({habit, label}: {habit: Habit | 'rest'; label: string}) {
 const {state, dayKey, today, day, done} = useApp();
 const week = Array.from({length: 7}, (_, i) => addDays(weekStart(dayKey), i)).map(d => ({day: d, done: d === dayKey ? (habit === 'rest' ? day.rest : done[habit]) : habit === 'rest' ? !!state.days[d]?.rest : !!completion(state.days[d])[habit], future: d > today}));
 return <div className="week-strip" role="group" aria-label={`${label} this week`}><span className="week-strip-head">This week<b>{week.filter(d => d.done).length} of 7</b></span><div className="week-dots">{week.map(d => <span key={d.day} className={`week-dot ${d.done ? 'is-done' : ''} ${d.future ? 'is-future' : ''}`} aria-label={`${shortDate(d.day)} ${d.done ? 'done' : d.future ? 'ahead' : 'not done'}`}><i/><small>{weekInitials[(dayDiff(weekStart(d.day), d.day) + 7) % 7]}</small></span>)}</div></div>;
}
export function Walk() {
 const {day, done, selected, dayKey, change, bump} = useApp();
 const {timer, elapsed, running} = useTimer('walk'); useWakeLock(running);
 const stale = !!timer && timer.day !== dayKey && !running;
 const target = (day.targets.walkMinutes ?? 30) * 60; const share = Math.min(1, elapsed / target);
 const session = day.sessions?.walk;
 function finish() {if (finishTimer('walk', (seconds, creditDay) => change({type: 'session', habit: 'walk', seconds, done: true}, creditDay))) {bump('walk', 2000); beep('done'); buzz(80);}}
 return <section className={`activity ${timer ? 'is-live' : ''}`}>
  <div className={`stage walk ${done.walk ? 'is-done' : ''} ${running ? 'is-active' : ''}`}><Hills phase="day" walked={done.walk} progress={done.walk ? 1 : share}/><span className="stage-copy"><strong>{done.walk ? 'Walked.' : running ? 'Walking.' : timer ? 'Paused.' : selected ? 'A walk that day.' : 'A walk today.'}</strong><span>{done.walk ? `${Math.round((session?.seconds ?? 0) / 60)} minutes` : `${Math.round(target / 60)} minutes keeps it simple`}</span></span></div>
  {done.walk ? <DoneCard title="Walk logged" detail={session ? `${clock(session.seconds)} on the path.` : 'Marked done without a timer.'} onUndo={() => change({type: 'session', habit: 'walk', seconds: 0, done: false})}/>
  : selected ? <button className="primary" onClick={() => change({type: 'check', habit: 'walk', value: true})}>Mark walked on this day</button>
  : stale ? <StaleCard timer={timer} elapsed={elapsed} label="Walk" onFinish={finish}/>
  : <>
   <div className="card timer-card"><Dial share={share}><strong className="dial-time" aria-live={running ? 'off' : 'polite'} aria-label={`Walk time ${clock(elapsed)}`}>{clock(elapsed)}</strong><span>{running ? 'walking' : timer ? 'paused' : 'ready'}</span></Dial><p className="fine-print">Counts for {dayKey === timer?.day || !timer ? 'today' : shortDate(timer.day)}. Keeps counting while the phone is locked or the app is in the background; the time comes from the clock, not from ticks. No chime or buzz can play while the phone is locked.{elapsed > maxSessionSeconds ? ' Sessions longer than 24 hours are logged as 24 hours.' : ''}</p></div>
   <Controls timerKey="walk" running={running} hasTimer={!!timer} onFinish={finish}/>
   {!timer && <button className="text-button" onClick={() => {if (change({type: 'check', habit: 'walk', value: true})) bump('walk', 2000);}}>Already walked · mark done</button>}
  </>}
  <WeekStrip habit="walk" label="Walks"/>
 </section>;
}
export function Workout() {
 const {state, day, done, selected, dayKey, change, open, bump} = useApp();
 const plan = state.profile?.plan?.length ? state.profile.plan : defaultPlan;
 const {timer, elapsed, running} = useTimer('workout'); useWakeLock(running);
 const stale = !!timer && timer.day !== dayKey && !running;
 const checked = new Set((timer?.meta?.items as string | undefined)?.split('\n').filter(Boolean) ?? []);
 const session = day.sessions?.workout;
 // Ticking a move starts the session clock if it is not running yet; the ticks live with the timer so they survive a reload.
 function toggleItem(item: string) {if (selected || stale) return; if (!timer) {void prime(); startTimer('workout', dayKey, {items: ''});} const next = new Set(checked); if (next.has(item)) next.delete(item); else next.add(item); updateTimer('workout', {items: [...next].join('\n')}); buzz(20);}
 function finish() {const items = [...checked]; const ok = timer ? finishTimer('workout', (seconds, creditDay) => change({type: 'session', habit: 'workout', seconds, done: true, items}, creditDay)) : change({type: 'session', habit: 'workout', seconds: 0, done: true, items}, dayKey); if (ok) {bump('workout'); beep('done'); buzz(80);}}
 return <section className={`activity ${timer ? 'is-live' : ''}`}>
  <div className={`stage workout ${done.workout ? 'is-done' : ''} ${running ? 'is-active' : ''}`}><Gym done={done.workout} active={running}/><span className="stage-copy"><strong>{done.workout ? 'Lifted.' : running ? 'In session.' : selected ? 'Lift that day.' : 'Lift today.'}</strong><span>{done.workout ? `${session?.items?.length ?? 0} of ${plan.length} moves` : `${checked.size} of ${plan.length} checked`}</span></span><span className="stage-tag">{timer && !stale ? clock(elapsed) : done.workout ? <><Icon name="check" size={14}/>Done</> : 'Plan'}</span></div>
  {done.workout ? <DoneCard title="Workout logged" detail={session ? `${session.items?.length ? session.items.join(', ') + '. ' : ''}${session.seconds ? clock(session.seconds) : 'No timer'}.` : 'Marked done.'} onUndo={() => change({type: 'session', habit: 'workout', seconds: 0, done: false})}/>
  : <>
   <div className="card checklist" role="group" aria-label="Workout checklist">
    <div className="card-head"><h2>{selected ? 'That day’s plan' : 'Today’s plan'}</h2><button className="text-button" onClick={() => open('plan')}><Icon name="edit" size={16}/>Edit plan</button></div>
    {plan.map(item => <label key={item} className={`check-row ${checked.has(item) ? 'is-done' : ''}`}><input type="checkbox" checked={checked.has(item)} disabled={!!selected || stale} onChange={() => toggleItem(item)}/><span className="check-box"><Icon name="check" size={14}/></span><span>{item}</span></label>)}
   </div>
   {selected ? <button className="primary" onClick={() => change({type: 'check', habit: 'workout', value: true})}>Mark done on this day</button>
   : stale ? <StaleCard timer={timer} elapsed={elapsed} label="Workout" onFinish={finish}/>
   : <Controls timerKey="workout" running={running} hasTimer={!!timer} onFinish={finish} finishLabel="Finish"/>}
   {!timer && !selected && <button className="text-button" onClick={() => {if (change({type: 'check', habit: 'workout', value: true})) bump('workout');}}>Already done · mark it</button>}
  </>}
  <WeekStrip habit="workout" label="Workouts"/>
 </section>;
}
export function Abs() {
 const {day, done, selected, dayKey, change, bump} = useApp();
 const {timer, elapsed, running} = useTimer('abs'); useWakeLock(running);
 const stale = !!timer && timer.day !== dayKey && !running;
 const routine: Routine = routines.find(r => r.id === timer?.meta?.routine) ?? routines[1];
 const phase = phaseAt(routine, elapsed);
 const lastIndex = useRef(-1); const [flash, setFlash] = useState('');
 const session = day.sessions?.abs;
 // Interval cues: a beep and a flash whenever the interval changes, the done chord when the routine ends. Derived from elapsed time, so a backgrounded run catches up correctly.
 useEffect(() => {if (!timer) {lastIndex.current = -1; return;} if (phase.index !== lastIndex.current) {if (lastIndex.current >= 0) {beep(phase.finished ? 'done' : phase.interval.kind === 'work' ? 'go' : 'tick'); buzz(phase.finished ? 120 : 40); setFlash(phase.finished ? 'is-finished' : phase.interval.kind === 'work' ? 'flash-go' : 'flash-rest'); setTimeout(() => setFlash(''), 700);} lastIndex.current = phase.index;}}, [phase.index, phase.finished, phase.interval.kind, timer]);
 function finish() {if (finishTimer('abs', (seconds, creditDay) => change({type: 'session', habit: 'abs', seconds: Math.min(seconds, routineSeconds(routine)), done: true, routine: routine.name}, creditDay))) {bump('abs'); beep('done');}}
 const total = routineSeconds(routine); const intervals = intervalsOf(routine);
 return <section className={`activity ${timer ? 'is-live' : ''}`}>
  <div className={`stage abs ${done.abs ? 'is-done' : ''} ${running ? 'is-active' : ''} ${flash}`}><Mat done={done.abs} active={running}/><span className="stage-copy"><strong>{done.abs ? 'Core done.' : timer ? phase.interval.exercise.name : selected ? 'Core that day.' : 'Core today.'}</strong><span>{done.abs ? session?.routine ?? 'Marked done' : timer ? (phase.interval.kind === 'rest' ? `Rest · next ${phase.interval.next?.name ?? 'finish'}` : `Move ${phase.interval.index + 1} of ${routine.exercises.length}`) : 'Pick a routine below'}</span></span>{timer && !stale && <span className="stage-tag">{clock(Math.ceil(phase.remaining))}</span>}</div>
  {done.abs ? <DoneCard title="Abs logged" detail={session ? `${session.routine ?? 'Routine'} · ${clock(session.seconds)}.` : 'Marked done.'} onUndo={() => change({type: 'session', habit: 'abs', seconds: 0, done: false})}/>
  : stale ? <StaleCard timer={timer} elapsed={elapsed} label="Abs" onFinish={finish}/>
  : timer ? <>
   <div className={`card guide ${phase.interval.kind}`}>
    <Dial share={1 - phase.remaining / phase.interval.seconds} tone={phase.interval.kind === 'rest' ? 'is-rest' : ''}><strong className="dial-time" aria-label={`${Math.ceil(phase.remaining)} seconds left`}>{Math.ceil(phase.remaining)}</strong><span>{phase.interval.kind}</span></Dial>
    <div className="guide-copy"><h2>{phase.interval.kind === 'rest' ? 'Breathe.' : phase.interval.exercise.name}</h2><p>{phase.interval.kind === 'rest' ? `Up next: ${phase.interval.next?.name}. ${phase.interval.next?.cue ?? ''}` : phase.interval.exercise.cue}</p></div>
    <div className="guide-steps" aria-hidden="true">{intervals.map((iv, i) => <i key={i} className={`${iv.kind} ${i < phase.index ? 'is-past' : i === phase.index ? 'is-now' : ''}`}/>)}</div>
    <p className="fine-print">{clock(Math.max(0, total - elapsed))} left of {clock(total)}{soundOn() ? ' · sound on' : ' · sound off (Settings)'}</p>
   </div>
   <Controls timerKey="abs" running={running} hasTimer onFinish={finish} finishLabel="Finish early"/>
   <button className="text-button" onClick={() => clearTimer('abs')}>Stop without logging</button>
  </> : <>
   <div className="card list library" role="group" aria-label="Ab routines">{routines.map(r => <button key={r.id} className="library-row" onClick={() => {if (selected) return; void prime(); startTimer('abs', dayKey, {routine: r.id}); buzz();}} disabled={!!selected}><span className="row-copy"><span className="row-title">{r.name}</span><span className="row-status">{r.note}</span><span className="row-status">{r.exercises.map(e => e.name).join(' · ')}</span></span><span className="library-time">{clock(routineSeconds(r))}<Icon name="play" size={16}/></span></button>)}</div>
   {selected ? <button className="primary" onClick={() => change({type: 'check', habit: 'abs', value: true})}>Mark done on this day</button> : <button className="text-button" onClick={() => {if (change({type: 'check', habit: 'abs', value: true})) bump('abs');}}>Already done · mark it</button>}
  </>}
  <WeekStrip habit="abs" label="Abs"/>
 </section>;
}
export function Floss() {
 const {done, pulse, selected, change, bump} = useApp();
 const mark = () => {if (change({type: 'check', habit: 'floss', value: true})) bump('floss');};
 return <section className="activity">
  <div className={`stage floss ${done.floss ? 'is-done' : ''} ${pulse.floss ? 'is-active' : ''}`}><Tooth done={done.floss} active={!!pulse.floss}/><span className="stage-copy"><strong>{done.floss ? 'Flossed.' : `Floss ${selected ? 'that day' : 'today'}.`}</strong><span>{done.floss ? 'Once is enough.' : 'Once a day keeps the streak.'}</span></span><span className="stage-tag">{done.floss ? <><Icon name="check" size={14}/>Done</> : 'Once'}</span></div>
  {done.floss ? <DoneCard title="Floss logged" detail={selected ? 'Marked for that day.' : 'Marked for today.'} onUndo={() => change({type: 'check', habit: 'floss', value: false})}/>
  : <button className="primary" onClick={mark}><Icon name="check" size={18}/>Mark flossed</button>}
  <WeekStrip habit="floss" label="Floss"/>
 </section>;
}
export function Water() {
 const {state, day, done, pulse, units, notice, change, bump, open} = useApp();
 const {list, default: main} = containersOf(state.profile);
 const [pick, setPick] = useState(main.id); const container = list.find(c => c.id === pick) ?? main;
 const [text, setText] = useState(''); const [pending, setPending] = useState<Parsed | null>(null); const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
 const log = day.waterLog ?? [];
 // The label is trimmed to the account's bound (a long container name plus "three quarters of a" can exceed it); a refusal shows right here.
 function pour(ml: number, label: string) {if (change({type: 'water', amount: ml, label: label.slice(0, limits.waterLabel)})) {bump('water', 900); setPending(null); setText(''); setNote('');} else setNote('refused');}
 function undoLast() {const last = log.at(-1); if (!last) return; change({type: 'water', amount: -last.ml});}
 // Typed phrases: the local parser first. If it cannot read the note, the model may name the container and the share; the app does the arithmetic.
 async function read() {
  const local = parsePhrase(text, list, container); if (local.kind !== 'none') {setPending(local); return;}
  setBusy(true); setNote('');
  try {
   const res = await fetch('/api/water', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text, containers: list.map(c => c.name)})});
   const r = await res.json() as {container: string | null; fraction: number | null; count: number | null; error?: string};
   if (!res.ok) throw new Error(r.error);
   const c = (r.container ? list.find(x => x.name.toLowerCase() === r.container!.toLowerCase()) : null) ?? container;
   if (r.fraction === null || r.fraction <= 0) setPending({kind: 'ask', container: c, question: `How much of the ${c.name}?`});
   else {const n = r.count && r.count > 0 ? Math.min(20, Math.round(r.count)) : 1; const f = Math.min(1, r.fraction); setPending({kind: 'ok', container: c, fraction: f, count: n, ml: pourMl(c, f, n), label: describe(c, f, n)});}
  } catch {setPending({kind: 'ask', container, question: `How much of the ${container.name}?`});}
  finally {setBusy(false);}
 }
 return <section className="activity">
  <div className={`card water-card ${done.water ? 'is-done' : ''} ${pulse.water ? 'pouring' : ''}`}>
   <div className="water-art"><Glass level={day.water / day.targets.water} pouring={!!pulse.water}/></div>
   <div className="water-copy"><strong className="big">{formatVolume(day.water, units)}</strong><p>{inContainers(day.water, day.targets.water, main)} · target {formatVolume(day.targets.water, units)}</p>
    <Meter label="" value={day.water} max={day.targets.water} unit="" done={done.water} display=""/></div>
  </div>
  <div className="card list pour-card">
   <div className="card-head"><h2>Log a pour</h2><button className="text-button" onClick={() => open('containers')}><Icon name="edit" size={16}/>Containers</button></div>
   <div className="chips left" role="group" aria-label="Container">{list.map(c => <button key={c.id} className={`chip ${c.id === container.id ? 'active' : ''}`} aria-pressed={c.id === container.id} onClick={() => setPick(c.id)}>{c.name} · {formatVolume(c.ml, units)}</button>)}</div>
   <div className="fractions" role="group" aria-label={`Share of the ${container.name}`}>{([[.25, '¼'], [.5, '½'], [.75, '¾'], [1, 'Full']] as const).map(([f, l]) => <button key={f} className="fraction" aria-label={`Log ${describe(container, f, 1)}`} onClick={() => pour(pourMl(container, f, 1), describe(container, f, 1))}><b>{l}</b><small>{formatVolume(container.ml * f, units)}</small></button>)}</div>
   <form className="phrase" onSubmit={e => {e.preventDefault(); if (text.trim()) void read();}}><label>Or say it<input value={text} onChange={e => {setText(e.target.value); setPending(null);}} maxLength={200} placeholder="half my Stanley" aria-label="Or say it"/></label><button className="secondary" disabled={busy || !text.trim()}>{busy ? 'Reading…' : 'Read it'}</button></form>
   {pending?.kind === 'ok' && <div className="confirm"><p><strong>{formatVolume(pending.ml, units)}</strong> · {pending.label}. {pending.count > 1 || pending.fraction !== 1 ? `${formatVolume(pending.container.ml, units)} × ${pending.fraction === 1 ? '' : pending.fraction === .5 ? '½' : pending.fraction === .25 ? '¼' : pending.fraction === .75 ? '¾' : Math.round(pending.fraction * 100) + '%'}${pending.count > 1 ? ` × ${pending.count}` : ''}` : ''}</p><div className="controls"><button className="secondary" onClick={() => setPending(null)}>Not this</button><button className="primary" onClick={() => pending.kind === 'ok' && pour(pending.ml, pending.label)}>Add {formatVolume(pending.ml, units)}</button></div></div>}
   {pending?.kind === 'ask' && <div className="confirm" role="group" aria-label={pending.question}><p><strong>{pending.question}</strong> Pick a share; nothing is guessed.</p><div className="fractions">{([[.25, '¼'], [.5, '½'], [.75, '¾'], [1, 'All']] as const).map(([f, l]) => <button key={f} className="fraction" aria-label={`${l} of the ${pending.container!.name}`} onClick={() => pour(pourMl(pending.container!, f, 1), describe(pending.container!, f, 1))}><b>{l}</b><small>{formatVolume(pending.container!.ml * f, units)}</small></button>)}</div></div>}
   {pending?.kind === 'none' && <p className="form-error" role="alert">Name a container and how much of it, like “half my Stanley”.</p>}
   {note && <p className="form-error" role="alert">{note === 'refused' ? (notice || 'That pour could not be logged.') : note}</p>}
  </div>
  {log.length > 0 && <div className="card list" role="group" aria-label="Today’s pours"><div className="card-head"><h2>Today</h2><button className="text-button" aria-label="Undo last pour" onClick={undoLast}><Icon name="undo" size={16}/>Undo last</button></div>{log.map((e, i) => <div key={i} className="meal-row"><div><strong>{formatVolume(e.ml, units)}</strong><p>{e.label ?? 'Water'}</p></div></div>)}</div>}
  <p className="fine-print">Sizes are stored once, in millilitres, and shown in your unit. A pour is the container size times the share you drank; the app does that arithmetic, never the model. Water counts on its own once the target is reached.</p>
  <WeekStrip habit="water" label="Water"/>
 </section>;
}
export function Rest() {
 const {state, today, dayKey, change, bump} = useApp();
 const week = Array.from({length: 7}, (_, i) => addDays(weekStart(dayKey), i));
 const left = restsLeft(state, dayKey);
 const status = (d: string) => {const e = state.days[d]; if (e?.rest) return d > today ? 'planned rest' : 'rest'; if (isComplete(e)) return 'complete'; if (isKept(e)) return 'rescued'; if (d > today) return 'ahead'; if (d === today) return 'today'; return d < (state.profile?.startDay ?? d) ? 'before start' : 'missed';};
 return <section className="activity">
  <div className={`stage rest ${state.days[dayKey]?.rest ? 'is-done' : ''}`}><NightRest done={!!state.days[dayKey]?.rest}/><span className="stage-copy"><strong>{left ? `${left} rest day${left === 1 ? '' : 's'} left this week.` : 'Both rest days planned.'}</strong><span>Rest keeps the streak. It is never a miss.</span></span></div>
  <div className="card list" role="group" aria-label="This week">
   {week.map(d => {const s = status(d); const rest = !!state.days[d]?.rest; const canPlan = d <= addDays(weekStart(today), 6); return <div key={d} className={`plan-row ${s.replace(' ', '-')} ${d === today ? 'is-today' : ''}`}><span className="row-copy"><span className="row-title">{longDate(d).split(',')[0]}{d === today ? ' · today' : ''}</span><span className="row-status">{s === 'planned rest' ? 'Planned rest' : s === 'rest' ? 'Rest day' : s === 'complete' ? 'Complete' : s === 'rescued' ? 'Rescued' : s === 'ahead' ? 'Ahead' : s === 'today' ? 'In progress' : s === 'missed' ? 'Missed · rescue from Progress' : 'Before you started'}</span></span>
    <button className="row-action" aria-pressed={rest} aria-label={`${rest ? 'Undo rest for' : 'Rest on'} ${shortDate(d)}`} disabled={!rest && (!left || !canPlan || s === 'complete')} onClick={() => {if (change({type: 'rest', value: !rest}, d)) bump('rest', 1600);}}>{rest ? <><Icon name="check" size={16}/>Rest</> : 'Rest'}</button></div>;})}
  </div>
  <p className="fine-print">{restDaysPerWeek} planned rest days each Monday–Sunday week. Plan them ahead or take one on the day. Missed days can still be rescued from Progress; earlier weeks keep whatever they had.</p>
 </section>;
}
const meditateMinutes = [3, 5, 10, 15, 20];
export function Meditate() {
 const {day, dayKey, selected, change, bump} = useApp();
 const {timer, elapsed, running} = useTimer('meditate'); useWakeLock(running);
 const minutes = Number(timer?.meta?.minutes ?? 5); const target = minutes * 60; const remaining = Math.max(0, target - elapsed);
 const [choice, setChoice] = useState(5);
 function finish(seconds?: number) {if (finishTimer('meditate', (elapsedCapped, creditDay) => change({type: 'meditate', seconds: seconds ?? elapsedCapped}, creditDay))) {bump('meditate'); beep('done'); buzz(80);}}
 // Completion itself is settled app-wide (lib/settle.ts); this page only shows the count.
 return <section className="activity">
  <div className="card timer-card optional-card">
   <p className="optional-tag">Optional · never counted toward the streak</p>
   <Dial share={timer ? 1 - remaining / target : 0} tone="is-calm"><strong className="dial-time" aria-label={timer ? `${clock(remaining)} left` : 'Ready'}>{timer ? clock(remaining) : clock(choice * 60)}</strong><span>{running ? 'breathing' : timer ? 'paused' : 'ready'}</span></Dial>
   {!timer && <div className="chips" role="group" aria-label="Minutes">{meditateMinutes.map(m => <button key={m} className={`chip ${choice === m ? 'active' : ''}`} aria-pressed={choice === m} onClick={() => setChoice(m)}>{m} min</button>)}</div>}
   <p className="fine-print">{timer && timer.day !== dayKey ? `Started ${shortDate(timer.day)}; it will log to that day. ` : ''}{day.meditate ? `${Math.round(day.meditate / 60)} min logged today.` : 'Sit, breathe, let the count run. A chime marks the end when sound is on and the screen is awake.'}</p>
  </div>
  {selected ? <p className="fine-print">Timers run for today only. Past days show what was logged; nothing here can be backfilled.</p>
  : !timer ? <button className="primary" onClick={() => {void prime(); startTimer('meditate', dayKey, {minutes: choice}); buzz();}}><Icon name="play" size={18}/>Start {choice} minutes</button>
  : <Controls timerKey="meditate" running={running} hasTimer onFinish={() => finish()} finishLabel="Finish early"/>}
  {timer && <button className="text-button" onClick={() => clearTimer('meditate')}>Stop without logging</button>}
 </section>;
}
export function Focus() {
 const {day, dayKey, selected} = useApp();
 const {timer, elapsed, running} = useTimer('focus'); useWakeLock(running);
 const [work, setWork] = useState(25); const [rest, setRest] = useState(5);
 const w = Number(timer?.meta?.work ?? work) * 60, r = Number(timer?.meta?.rest ?? rest) * 60; const cycle = w + r;
 const block = Math.floor(elapsed / cycle); const inCycle = elapsed - block * cycle; const working = inCycle < w; const remaining = working ? w - inCycle : cycle - inCycle;
 const logged = Number(timer?.meta?.logged ?? 0);
 const lastPhase = useRef<string>('');
 // Blocks are credited app-wide by lib/settle.ts (also while this page is closed); this effect only plays the cue when the phase turns.
 useEffect(() => {if (!timer) {lastPhase.current = ''; return;} const phase = working ? 'work' : 'rest'; if (lastPhase.current && lastPhase.current !== phase) {beep(phase === 'work' ? 'go' : 'done'); buzz(60);} lastPhase.current = phase;}, [working, timer]);
 return <section className="activity">
  <div className={`card timer-card optional-card ${timer ? (working ? 'is-work' : 'is-break') : ''}`}>
   <p className="optional-tag">Optional · never counted toward the streak</p>
   <Dial share={timer ? 1 - remaining / (working ? w : r) : 0} tone={timer && !working ? 'is-rest' : ''}><strong className="dial-time" aria-label={timer ? `${clock(remaining)} left in ${working ? 'work' : 'break'}` : 'Ready'}>{timer ? clock(remaining) : clock(work * 60)}</strong><span>{timer ? (working ? 'work' : 'break') : 'ready'}</span></Dial>
   {!timer && <div className="chips" role="group" aria-label="Work and break minutes"><label className="chip-select">Work<select aria-label="Work minutes" value={work} onChange={e => setWork(Number(e.target.value))}>{[15, 20, 25, 30, 45, 50].map(m => <option key={m} value={m}>{m} min</option>)}</select></label><label className="chip-select">Break<select aria-label="Break minutes" value={rest} onChange={e => setRest(Number(e.target.value))}>{[3, 5, 10, 15].map(m => <option key={m} value={m}>{m} min</option>)}</select></label></div>}
   <p className="fine-print">{timer ? `Block ${block + 1} of ${maxFocusBlocks} · ${logged} finished this run` : ''}{day.focus ? `${timer ? ' · ' : ''}${Math.round(day.focus / 60)} min focused today.` : timer ? '' : `Work blocks are logged when they end, up to ${maxFocusBlocks} per session. Breaks are yours. This app does not block other apps.`}</p>
  </div>
  {selected ? <p className="fine-print">Timers run for today only. Past days show what was logged; nothing here can be backfilled.</p>
  : !timer ? <button className="primary" onClick={() => {void prime(); startTimer('focus', dayKey, {work, rest, logged: 0, run: crypto.randomUUID()}); buzz();}}><Icon name="play" size={18}/>Start focus</button>
  : <Controls timerKey="focus" running={running} hasTimer onFinish={() => clearTimer('focus')} finishLabel="End session"/>}
 </section>;
}
export {Mark};

// Lazy entry: one component, one `kind`, so App loads this chunk only when an activity page is opened.
export default function ActivitiesChunk({kind}: {kind: 'walk' | 'workout' | 'abs' | 'floss' | 'water' | 'rest' | 'meditate' | 'focus'}) {
 switch (kind) {case 'walk': return <Walk/>; case 'workout': return <Workout/>; case 'abs': return <Abs/>; case 'floss': return <Floss/>; case 'water': return <Water/>; case 'rest': return <Rest/>; case 'meditate': return <Meditate/>; default: return <Focus/>;}
}
