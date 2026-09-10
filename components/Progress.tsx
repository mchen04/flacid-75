'use client';
import {useState} from 'react';
import {Hills, Mark} from './Scenes';
import {Icon} from './Icon';
import {habits, addDays, weekStart, completion, isComplete, isKept, missing, streaks, weightTrend, totals, milestones, completeDays, pointsEarned, dayDiff, type State} from '@/lib/domain';
import {formatWeight, toLb} from '@/lib/units';
import {useApp, names, weekInitials, longDate} from './shared';
export function Progress() {
 const {state, today, units, navigate, select, open} = useApp();
 const [mode, setMode] = useState('week'); const [anchor, setAnchor] = useState(today); const [detail, setDetail] = useState(today); const streak = streaks(state, today);
 const first = mode === 'month' ? anchor.slice(0, 7) + '-01' : weekStart(anchor); const days = mode === 'month' ? new Date(Number(first.slice(0, 4)), Number(first.slice(5, 7)), 0).getDate() : 7;
 const entries = Array.from({length: days}, (_, i) => addDays(first, i));
 const entry = state.days[detail]; const start = state.profile!.startDay; const tracked = detail >= start;
 const status = (d: string) => isComplete(state.days[d]) ? 'complete' : state.days[d]?.rest ? (d > today ? 'planned rest' : 'rest') : state.days[d]?.rescued ? 'rescued' : d < start ? 'not tracked' : d < today ? 'missed' : d === today ? 'in progress' : 'ahead';
 const label = (d: string) => `${d} ${status(d)}${state.days[d]?.backfilled ? ' backfilled' : ''}`;
 const heading = new Date(first + 'T12:00Z').toLocaleDateString('en', {month: 'long', year: 'numeric', timeZone: 'UTC'});
 const badges = milestones(state, today); const reached = badges.filter(b => b.reached);
 return <section className="progress-view">
  <div className="progress-hero"><Hills phase="day" walked quiet/><div className="big-number"><strong>{streak.current}</strong><span>day streak{streak.longest > streak.current ? ` · longest ${streak.longest}` : streak.current > 1 ? ' · your longest' : ''}</span></div></div>
  <div className="card medals" role="group" aria-label="Milestones">
   <div className="card-head"><h2>Milestones</h2><span className="row-status">{completeDays(state, today)} complete days · {pointsEarned(state, today).toLocaleString()} points earned</span></div>
   <div className="medal-row">{badges.map(b => <span key={b.days} className={`medal ${b.reached ? 'is-reached' : ''} ${b.current ? 'is-current' : ''}`} aria-label={`${b.days} day streak ${b.reached ? 'reached' + (b.day ? ' on ' + b.day : '') : 'not yet'}`}><Mark name="star"/><b>{b.days}</b></span>)}</div>
   <p className="row-status">{reached.length ? `${reached.length} of ${badges.length} milestones. ${badges.find(b => !b.reached) ? `Next: ${badges.find(b => !b.reached)!.days} days.` : 'All of them.'}` : `First milestone at ${badges[0].days} days.`}</p>
  </div>
  <div className="card streak-card">
   <div className="segmented" role="tablist">{[['week', 'Week'], ['month', 'Month'], ['trends', 'Trends']].map(([value, text]) => <button key={value} id={`tab-${value}`} role="tab" aria-selected={mode === value} aria-controls="tab-panel" className={mode === value ? 'active' : ''} onClick={() => setMode(value)}>{text}</button>)}</div>
   <div id="tab-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} className="tab-panel">
   {mode === 'trends' ? <Trends state={state} today={today} units={units}/> : <>
   <div className="calendar-heading"><button aria-label="Previous period" onClick={() => setAnchor(addDays(first, -1))}><Icon name="back" size={18}/></button><h2>{heading}</h2><button aria-label="Next period" disabled={entries.at(-1)! >= today} onClick={() => setAnchor(addDays(entries.at(-1)!, 1))}><Icon name="arrow" size={18}/></button></div>
   <div className="calendar-body">{mode === 'week' ? <div className="bars">{entries.map((d, i) => {const n = d > today ? 0 : Object.values(completion(state.days[d])).filter(Boolean).length; const kept = isKept(state.days[d]); return <button key={d} disabled={d > today && !state.days[d]?.rest} aria-label={label(d)} className={`bar ${d === today ? 'is-today' : ''} ${kept ? 'is-kept' : ''} ${state.days[d]?.rest ? 'is-rest' : ''} ${d > today ? 'is-future' : ''} ${detail === d ? 'selected' : ''}`} onClick={() => setDetail(d)}><span className="bar-track">{n > 0 && <span className="bar-fill" style={{height: `${Math.max(16, n / habits.length * 100)}%`}}><b>{n}</b></span>}{state.days[d]?.rest && <span className="bar-moon"><Mark name="rest"/></span>}</span><small>{weekInitials[i]}</small></button>;})}</div>
   : <div className="calendar-grid">{weekInitials.map((d, i) => <span key={i}>{d}</span>)}{Array.from({length: (new Date(first + 'T12:00Z').getUTCDay() + 6) % 7}, (_, i) => <i key={'blank' + i}/>)}{entries.map(d => <button key={d} disabled={d > today && !state.days[d]?.rest} aria-label={label(d)} className={`${detail === d ? 'selected' : ''} ${isKept(state.days[d]) ? 'kept' : d < today && d >= start ? 'broken' : ''} ${state.days[d]?.rest ? 'rest' : ''} ${d === today ? 'today' : ''}`} onClick={() => setDetail(d)}><strong>{Number(d.slice(-2))}</strong><small>{state.days[d]?.rescued ? '♡' : state.days[d]?.rest ? '☾' : ''}{state.days[d]?.backfilled ? '*' : ''}</small></button>)}</div>}</div>
   <div className="day-detail"><p className="date">{longDate(detail)}{entry?.backfilled ? ' · backfilled' : ''}{entry?.rescued ? ' · rescued' : ''}</p><h2>{isComplete(entry) ? 'Complete.' : entry?.rest ? (detail > today ? 'Rest day planned.' : 'Rest day.') : entry?.rescued ? 'Rescued.' : detail === today ? 'In progress.' : detail > today ? 'Ahead.' : !tracked ? 'Before you started.' : 'A day to rescue.'}</h2><p>{entry?.rest ? 'Rest keeps the streak. Not a miss.' : !tracked ? 'Backfill it if you like.' : detail > today ? 'Plan a rest day here if you need one.' : !isComplete(entry) ? `${detail === today ? 'Left today' : 'Not checked'}: ${missing(entry).map(h => names[h]).join(', ')}.` : `All ${habits.length} habits.`}</p></div>
   <div className="detail-actions">{detail <= today && <button className="primary" onClick={() => {select(detail === today ? null : detail); navigate('');}}>{detail === today ? 'Open today' : 'Backfill this day'}</button>}{detail < today && !isKept(entry) && tracked && <button className="secondary" onClick={() => {select(detail); open('rescue');}}>Rescue day</button>}{detail > today && <button className="secondary" onClick={() => navigate('rest')}>Plan rest</button>}</div>
   <label className="date-pick">Open any past day<input aria-label="Open any past day" type="date" max={today} value={detail} onChange={e => {if (e.target.value) {setDetail(e.target.value); setAnchor(e.target.value);}}}/></label>
   </>}
   </div>
  </div>
 </section>;}
function Sparkline({values, label}: {values: {day: string; value: number}[]; label: string}) {if (!values.length) return <p className="empty-chart">Nothing yet.</p>; const min = Math.min(...values.map(v => v.value)), max = Math.max(...values.map(v => v.value)); return <><svg className="sparkline" viewBox="0 0 300 90" role="img" aria-label={label}><path d="M10 80h280" className="axis"/><polyline points={values.map(v => `${10 + dayDiff(values[0].day, v.day) / Math.max(1, dayDiff(values[0].day, values.at(-1)!.day)) * 280},${70 - (v.value - min) / Math.max(1, max - min) * 50}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{values.length === 1 && <circle cx="10" cy="70" r="4" fill="currentColor"/>}</svg><div className="chart-dates"><span>{values[0].day}</span><span>{values.at(-1)!.day}</span></div></>;}
function Trends({state, today, units}: {state: State; today: string; units: {weight: 'lb' | 'kg'; height: 'ftin' | 'cm'}}) {
 const weight = weightTrend(state.weights).slice(1).map(w => ({day: w.day, value: units.weight === 'lb' ? Math.round(toLb(w.value) * 10) / 10 : w.value})); const protein = Object.entries(state.days).sort(([a], [b]) => a.localeCompare(b)).filter(([d]) => d <= today).map(([day, d]) => ({day, value: totals(d).protein})); const streak = streaks(state, today);
 const last = weightTrend(state.weights).at(-1);
 return <div className="trends-body">
  <article className="trend-card"><h2>Weight</h2><strong>{weight.length && last ? formatWeight(last.value, units) : 'Two weigh-ins start a trend'}</strong><Sparkline values={weight.slice(-60)} label={`Smoothed weight trend in ${units.weight}`}/></article>
  <article className="trend-card"><h2>Protein</h2><strong>{protein.length ? `${Math.round(protein.at(-1)!.value)} g today` : 'No meals yet'}</strong><Sparkline values={protein.slice(-30)} label="Protein estimates over time"/></article>
  <article className="trend-card"><h2>Streak</h2><strong>{streak.current} day{streak.current === 1 ? '' : 's'}</strong><Sparkline values={streak.history.slice(-60)} label="Daily streak history"/></article>
 </div>;
}

export default function ProgressChunk() {return <Progress/>;}
