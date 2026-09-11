'use client';
import {useState} from 'react';
import {Mark} from './Scenes';
import {Icon} from './Icon';
import {pointsBalance, pointsEarned, pointsSpent, pointsPerHabit, pointsPerDay, habits, type Reward} from '@/lib/domain';
import {limits, clip} from '@/lib/bounds';
import {useApp, format, longDate} from './shared';
export function Rewards() {
 const {state, today, dayKey, day, change, open, bump, pulse} = useApp();
 const rewards = state.profile?.rewards ?? []; const raw = pointsBalance(state, today); const balance = Math.max(0, raw);
 const redeemed = Object.entries(day.redeemed ?? {});
 return <section className="activity">
  <div className={`card points-card ${pulse.reward ? 'is-active' : ''}`}><span className="points-art"><Mark name="reward"/></span><div><strong className="big">{format(balance)} points</strong><p>{format(pointsEarned(state, today))} earned · {format(pointsSpent(state))} spent{raw < 0 ? ` · ${format(-raw)} ahead of the earned total after an undo; nothing is owed` : ''}</p></div></div>
  <div className="card list" role="group" aria-label="Your treats">
   <div className="card-head"><h2>Your treats</h2><button className="text-button" onClick={() => open('treats')}><Icon name="edit" size={16}/>Edit</button></div>
   {rewards.length === 0 && <p className="empty">Add anything you would enjoy: a film night, a long bath, new socks, an afternoon off. You choose what counts as a treat.</p>}
   {rewards.map(r => <div key={r.id} className="meal-row"><div><strong>{r.name}</strong><p>{r.cost} points</p></div><button className="row-action" disabled={balance < r.cost} aria-label={`Redeem ${r.name}`} onClick={() => {if (pulse.reward) return; if (change({type: 'redeem', rewardId: crypto.randomUUID(), name: r.name, cost: r.cost}, dayKey)) bump('reward');}}>{balance < r.cost ? `${r.cost - balance} more` : 'Redeem'}</button></div>)}
  </div>
  {redeemed.length > 0 && <div className="card list" role="group" aria-label="Redeemed"><div className="card-head"><h2>Enjoyed {dayKey === today ? 'today' : longDate(dayKey)}</h2></div>{redeemed.map(([id, r]) => <div key={id} className="meal-row"><div><strong>{r.name}</strong><p>{r.cost} points</p></div><button aria-label={`Undo ${r.name}`} onClick={() => change({type: 'unredeem', rewardId: id}, dayKey)}><Icon name="undo" size={16}/>Undo</button></div>)}</div>}
  <p className="fine-print">Each required habit is worth {pointsPerHabit} points and a whole day adds {pointsPerDay}, so a full day is {habits.length * pointsPerHabit + pointsPerDay}. Points are a small game, not a permission slip: nothing here has to be earned, and food is never a reward or a debt.</p>
 </section>;
}
export function RewardsForm({rewards, onSave}: {rewards: Reward[]; onSave: (r: Reward[]) => void}) {
 const [list, setList] = useState<Reward[]>(rewards.length ? rewards : []); const [name, setName] = useState(''); const [cost, setCost] = useState('100');
 const [error, setError] = useState('');
 // Bounded to what the account accepts (lib/bounds.ts), so a treat can never be queued and refused later.
 function add() {const n = clip(name.trim(), limits.rewardName); const c = Math.round(Number(cost)); if (!n || !Number.isFinite(c) || c < limits.rewardCost[0] || c > limits.rewardCost[1]) {setError(`Points must be a whole number from 1 to ${limits.rewardCost[1].toLocaleString()}.`); return;} if (list.length >= limits.rewards) {setError(`Up to ${limits.rewards} treats.`); return;} setList([...list, {id: crypto.randomUUID(), name: n, cost: c}]); setName(''); setCost('100'); setError('');}
 return <div className="treats-form">
  {list.map(r => <div key={r.id} className="meal-row"><div><strong>{r.name}</strong><p>{r.cost} points</p></div><button aria-label={`Remove ${r.name}`} onClick={() => setList(list.filter(x => x.id !== r.id))}><Icon name="close" size={16}/></button></div>)}
  <div className="form-grid treat-add"><label>Treat<input value={name} onChange={e => setName(e.target.value)} maxLength={limits.rewardName} placeholder="Film night"/></label><label>Points<input value={cost} onChange={e => setCost(e.target.value)} type="number" inputMode="numeric" min={limits.rewardCost[0]} max={limits.rewardCost[1]} step="1"/></label></div>
  {error && <p className="form-error" role="alert">{error}</p>}
  <button className="secondary" type="button" onClick={add} disabled={!name.trim()}>Add treat</button>
  <button className="primary" onClick={() => onSave(list)}>Save</button>
 </div>;
}

export default function RewardsChunk(p: {kind: 'page'} | ({kind: 'form'} & Parameters<typeof RewardsForm>[0])) {return p.kind === 'page' ? <Rewards/> : <RewardsForm rewards={p.rewards} onSave={p.onSave}/>;}
