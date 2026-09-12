'use client';
import {createContext, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {Icon} from './Icon';
import {Mark} from './Scenes';
import {defaultUnits, type Day, type Habit, type Operation, type State, type Units} from '@/lib/domain';
export const names: Record<Habit, string> = {workout: 'Workout', abs: 'Abs', walk: 'Walk', water: 'Water', protein: 'Protein', calories: 'Calories', floss: 'Floss'};
export type Change = Operation extends infer O ? O extends Operation ? Omit<O, 'id' | 'at' | 'day' | 'zone'> : never : never;
export const todayZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export const format = (n: number) => Math.round(n).toLocaleString();
export const litres = (ml: number) => (ml / 1000).toFixed(2).replace(/\.?0+$/, '');
export const weekInitials = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
export const longDate = (day: string) => new Intl.DateTimeFormat('en', {weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC'}).format(new Date(day + 'T12:00:00Z'));
export const shortDate = (day: string) => new Intl.DateTimeFormat('en', {weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC'}).format(new Date(day + 'T12:00:00Z'));
export type Pulse = Partial<Record<Habit | 'meal' | 'rest' | 'reward' | 'meditate' | 'focus', boolean>>;
export type Ctx = {
 state: State; today: string; dayKey: string; selected: string | null; day: Day; done: Record<Habit, boolean>; units: Units; pulse: Pulse; notice: string;
 change: (payload: Change, date?: string, id?: string) => boolean; navigate: (page: string) => void; open: (sheet: string) => void; select: (day: string | null) => void; bump: (key: keyof Pulse, ms?: number) => void;
};
export const AppContext = createContext<Ctx | null>(null);
export function useApp() {const ctx = useContext(AppContext); if (!ctx) throw new Error('outside app'); return ctx;}
export const unitsOf = (state: State) => state.profile?.units ?? defaultUnits;
// Hash routing keeps every page addressable and lets the browser's own back button work. The hash is the page name.
export function useHash() {
 const [hash, setHash] = useState(() => typeof location === 'undefined' ? '' : location.hash.replace(/^#\/?/, ''));
 useEffect(() => {const read = () => setHash(location.hash.replace(/^#\/?/, '')); window.addEventListener('hashchange', read); read(); return () => window.removeEventListener('hashchange', read);}, []);
 return hash;
}
export function Meter({label, value, min, max, unit, done, display}: {label: string; value: number; min?: number; max: number; unit: string; done: boolean; display?: string}) {
 // A range band (calories) keeps headroom past its upper edge so the band is visible; a plain goal (water, protein) fills the bar exactly at the goal.
 const span = min ? Math.max(max * 1.15, value) : Math.max(max, value); const width = Math.min(100, value / span * 100);
 return <span className={`meter ${done ? 'is-done' : ''}`}><span className="meter-head"><span>{label}</span><span>{display ?? `${format(value)}${min ? '' : ` / ${format(max)}`} ${unit}`}</span></span><span className="meter-bar">{min && <span className="meter-range" style={{left: `${min / span * 100}%`, width: `${(max - min) / span * 100}%`}}/>}<span className="meter-fill" style={{width: `${width}%`}}/></span></span>;
}
export function Sheet({title, onClose, children}: {title: string; onClose: () => void; children: ReactNode}) {
 const ref = useRef<HTMLDialogElement>(null);
 useEffect(() => {const el = ref.current; el?.showModal(); return () => el?.close();}, []);
 return <dialog ref={ref} className="sheet" aria-labelledby="sheet-title" onCancel={e => {e.preventDefault(); onClose();}} onClick={e => {if (e.target === e.currentTarget) onClose();}}><div className="sheet-inner"><div className="sheet-handle"/><header><h2 id="sheet-title">{title}</h2><button aria-label="Close" className="icon-button" onClick={onClose}><Icon name="close"/></button></header>{children}</div></dialog>;
}
// A progress ring for timers. Geometry is SVG user units; the stroke colours are tokens through CSS.
export function Dial({share, children, small = false, tone = ''}: {share: number; children: ReactNode; small?: boolean; tone?: string}) {
 const r = 54; const c = 2 * Math.PI * r; const s = Math.max(0, Math.min(1, share));
 return <div className={`dial ${small ? 'is-small' : ''} ${tone}`}><svg viewBox="0 0 120 120" aria-hidden="true"><circle className="dial-track" cx="60" cy="60" r={r}/><circle className="dial-fill" cx="60" cy="60" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - s)} transform="rotate(-90 60 60)"/></svg><div className="dial-copy">{children}</div></div>;
}
export function CompletionToggle({label, labelledBy, id, checked, onChange, disabled = false}: {label: string; labelledBy?: string; id?: string; checked: boolean; onChange: () => void; disabled?: boolean}) {
 return <button type="button" id={id} role="checkbox" aria-checked={checked} aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label} disabled={disabled} className={`row-action completion-toggle ${checked ? 'is-done' : ''}`} onClick={onChange}><span className="completion-box" aria-hidden="true">{checked && <Icon name="check" size={16}/>}</span></button>;
}
// The row every dashboard card shares: art, name, one line of status, then two separate targets: open the page, or log in one tap.
export function Row({mark, title, status, done, onOpen, action, actionLabel, onAction, pulse = '', tone = '', pressed}: {mark: Parameters<typeof Mark>[0]['name']; title: string; status: string; done?: boolean; onOpen: () => void; action?: ReactNode; actionLabel?: string; onAction?: () => void; pulse?: string; tone?: string; pressed?: boolean}) {
 return <div className={`row ${done ? 'is-done' : ''} ${pulse} ${tone}`}>
  <button className="row-open" onClick={onOpen} aria-label={`Open ${title.toLowerCase()}`}><span className="row-art"><Mark name={mark}/><span className="row-check"><Icon name="check" size={12}/></span></span><span className="row-copy"><span className="row-title">{title}</span><span className="row-status">{status}</span></span><span className="row-chevron"><Icon name="arrow" size={18}/></span></button>
  {action ?? (onAction && <CompletionToggle label={actionLabel ?? `${title} complete`} checked={!!pressed} onChange={onAction}/>)}
 </div>;
}
