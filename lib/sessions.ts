// Finishing a timer: the elapsed time is capped to the longest session the account accepts, the change is queued first, and the
// timer is cleared only once the change was accepted. A refused change leaves the timer in place, so nothing is lost silently.
import {clearTimer, elapsedSeconds, getTimer} from './timer';
import {limits} from './bounds';
export const maxSessionSeconds = limits.seconds[1];
export const cappedSeconds = (seconds: number) => Math.min(maxSessionSeconds, Math.max(0, Math.round(seconds)));
export function finishTimer(key: string, build: (seconds: number, day: string) => boolean, now = Date.now()) {
 const timer = getTimer(key); if (!timer) return false;
 const ok = build(cappedSeconds(elapsedSeconds(timer, now)), timer.day);
 if (ok) clearTimer(key);
 return ok;
}
