// Timers are wall-clock timers. Only the start instant and the time banked before the last pause are stored, so a lock, a backgrounded
// tab or a reopened app all resume at the right count: elapsed is recomputed from the clock, never from ticks.
import {useEffect, useState} from 'react';
export type Timer = {key: string; startedAt: number | null; banked: number; day: string; meta?: Record<string, string | number>};
const KEY = 'my-wellness-timers';
type Stored = Record<string, Timer>;
const listeners = new Set<() => void>();
function read(): Stored {try {return JSON.parse(localStorage.getItem(KEY) ?? '{}');} catch {return {};}}
function write(all: Stored) {try {localStorage.setItem(KEY, JSON.stringify(all));} catch {} for (const l of listeners) l();}
export function getTimer(key: string): Timer | null {return read()[key] ?? null;}
export function elapsedSeconds(timer: Timer | null, now = Date.now()) {if (!timer) return 0; return (timer.banked + (timer.startedAt ? Math.max(0, now - timer.startedAt) : 0)) / 1000;}
export const isRunning = (timer: Timer | null) => !!timer?.startedAt;
export function startTimer(key: string, day: string, meta?: Timer['meta']) {const all = read(); const existing = all[key]; all[key] = existing && existing.day === day ? {...existing, startedAt: existing.startedAt ?? Date.now(), meta: meta ?? existing.meta} : {key, startedAt: Date.now(), banked: 0, day, meta}; write(all); return all[key];}
export function resumeTimer(key: string) {const all = read(); const t = all[key]; if (!t) return null; if (!t.startedAt) {all[key] = {...t, startedAt: Date.now()}; write(all);} return all[key];}
export function pauseTimer(key: string) {const all = read(); const t = all[key]; if (!t || !t.startedAt) return t ?? null; all[key] = {...t, banked: t.banked + Math.max(0, Date.now() - t.startedAt), startedAt: null}; write(all); return all[key];}
export function updateTimer(key: string, meta: Timer['meta']) {const all = read(); const t = all[key]; if (!t) return null; all[key] = {...t, meta: {...t.meta, ...meta}}; write(all); return all[key];}
export function clearTimer(key: string) {const all = read(); delete all[key]; write(all);}
export function useTimer(key: string) {
 const [, tick] = useState(0);
 useEffect(() => {
  const bump = () => tick(n => n + 1);
  listeners.add(bump);
  const id = setInterval(bump, 250);
  document.addEventListener('visibilitychange', bump); window.addEventListener('pageshow', bump); window.addEventListener('focus', bump);
  window.addEventListener('storage', bump);
  return () => {listeners.delete(bump); clearInterval(id); document.removeEventListener('visibilitychange', bump); window.removeEventListener('pageshow', bump); window.removeEventListener('focus', bump); window.removeEventListener('storage', bump);};
 }, []);
 const timer = getTimer(key);
 return {timer, elapsed: elapsedSeconds(timer), running: isRunning(timer)};
}
// A screen wake lock while a timer runs, where the browser offers one. Silently absent elsewhere.
export function useWakeLock(active: boolean) {
 useEffect(() => {
  if (!active) return;
  let lock: {release: () => Promise<void>} | null = null; let gone = false;
  const request = async () => {try {const n = navigator as Navigator & {wakeLock?: {request: (type: 'screen') => Promise<{release: () => Promise<void>}>}}; if (!n.wakeLock || document.visibilityState !== 'visible') return; lock = await n.wakeLock.request('screen'); if (gone) await lock.release();} catch {}};
  void request(); document.addEventListener('visibilitychange', request);
  return () => {gone = true; document.removeEventListener('visibilitychange', request); void lock?.release().catch(() => {});};
 }, [active]);
}
export function clock(seconds: number) {const s = Math.max(0, Math.floor(seconds)); const m = Math.floor(s / 60), r = s % 60; const h = Math.floor(m / 60); return h ? `${h}:${String(m % 60).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;}
