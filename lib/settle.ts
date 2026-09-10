// Timers settle themselves wherever the app is open: a finished ab routine or meditation logs itself, and finished focus blocks are
// credited, whether or not their page is on screen. Pure over the stored timers, so it is unit-testable and runs from one place (App).
import {useEffect, useRef} from 'react';
import {getTimer, elapsedSeconds, clearTimer, updateTimer, type Timer} from './timer';
import {routines, phaseAt, routineSeconds} from './abs';
import type {Operation} from './domain';
type Distribute<O> = O extends Operation ? Omit<O, 'id' | 'at' | 'zone'> : never;
export type SettledOp = Distribute<Operation>;
export type Settled = {op: SettledOp; timer: Timer; clear: boolean; id: string};
// A stable id for a settlement, derived from the timer's identity and the block it credits. Two tabs that settle the same timer
// produce the same id, the device queues it once, and the account applies it once. Formatted as a version-8 UUID.
export function stableId(seed: string) {let h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0xdeadbeef, h4 = 0x9e3779b9; for (let i = 0; i < seed.length; i++) {const c = seed.charCodeAt(i); h1 = Math.imul(h1 ^ c, 0x01000193); h2 = Math.imul(h2 ^ c, 0x9e3779b1); h3 = Math.imul(h3 ^ c, 0x85ebca6b); h4 = Math.imul(h4 ^ c, 0xc2b2ae35);} const hex = [h1, h2, h3, h4].map(n => (n >>> 0).toString(16).padStart(8, '0')).join(''); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${(8 + (parseInt(hex[16], 16) & 3)).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;}
const identity = (t: Timer) => `${t.key}|${t.day}|${t.startedAt ?? 'p'}|${t.banked}|${JSON.stringify(t.meta ?? {})}`;
// Focus sessions end on their own after this many work blocks, so a forgotten session cannot credit blocks all night.
export const maxFocusBlocks = 8;
export function settle(now = Date.now()): Settled[] {
 const out: Settled[] = [];
 const abs = getTimer('abs');
 if (abs) {const routine = routines.find(r => r.id === abs.meta?.routine) ?? routines[1]; const elapsed = elapsedSeconds(abs, now); if (phaseAt(routine, elapsed).finished) out.push({timer: abs, clear: true, id: stableId('abs|' + identity(abs)), op: {type: 'session', habit: 'abs', seconds: routineSeconds(routine), done: true, routine: routine.name, day: abs.day}});}
 const med = getTimer('meditate');
 if (med) {const target = Number(med.meta?.minutes ?? 5) * 60; if (elapsedSeconds(med, now) >= target) out.push({timer: med, clear: true, id: stableId('meditate|' + identity(med)), op: {type: 'meditate', seconds: target, day: med.day}});}
 const focus = getTimer('focus');
 if (focus) {
  const w = Number(focus.meta?.work ?? 25) * 60, r = Number(focus.meta?.rest ?? 5) * 60; const cycle = w + r; const elapsed = elapsedSeconds(focus, now);
  const block = Math.floor(elapsed / cycle); const working = elapsed - block * cycle < w; const completed = Math.min(maxFocusBlocks, block + (working ? 0 : 1)); const logged = Number(focus.meta?.logged ?? 0);
  for (let i = logged; i < completed; i++) out.push({timer: focus, clear: false, id: stableId(`focus|${focus.key}|${focus.day}|${focus.meta?.work}|${focus.meta?.rest}|block${i}`), op: {type: 'focus', seconds: w, day: focus.day}});
  if (completed > logged) updateTimer('focus', {logged: completed});
  if (completed >= maxFocusBlocks) out.push({timer: focus, clear: true, id: stableId('focus-end|' + identity(focus)), op: {type: 'focus', seconds: 0, day: focus.day}});
 }
 return out;
}
// Polls once a second and on every return to the app. Nothing re-renders unless something actually settled, so this costs nothing while idle.
export function useSettle(change: (op: SettledOp, id: string) => boolean, active: boolean) {
 const ref = useRef(change);
 useEffect(() => {ref.current = change;});
 useEffect(() => {
  if (!active) return;
  const run = () => applySettled(settle(), (op, id) => ref.current(op, id));
  run(); const id = setInterval(run, 1000);
  document.addEventListener('visibilitychange', run); window.addEventListener('pageshow', run); window.addEventListener('focus', run);
  return () => {clearInterval(id); document.removeEventListener('visibilitychange', run); window.removeEventListener('pageshow', run); window.removeEventListener('focus', run);};
 }, [active]);
}
// Apply the settled operations through the app's dispatcher. Clears each timer before dispatching so a failed dispatch cannot repeat a log.
export function applySettled(list: Settled[], change: (op: Settled['op'], id: string) => boolean) {
 for (const item of list) {if (item.clear) clearTimer(item.timer.key); if (item.op.type === 'focus' && item.op.seconds === 0) continue; change(item.op, item.id);}
 return list.length;
}
