// Optional cues. Sound is off until the user turns it on, and the preference lives on this device only.
const KEY = 'my-wellness-sound';
let context: AudioContext | null = null;
export function soundOn() {try {return localStorage.getItem(KEY) === '1';} catch {return false;}}
export function setSound(on: boolean) {try {localStorage.setItem(KEY, on ? '1' : '0');} catch {} if (on) void prime();}
// Browsers only start audio inside a user gesture; call this from the tap that starts a timer so later cues can play.
export async function prime() {try {const Ctor = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext; if (!Ctor) return; context ??= new Ctor(); if (context.state === 'suspended') await context.resume();} catch {}}
export function beep(kind: 'tick' | 'go' | 'done' = 'go') {
 if (!soundOn() || !context) return;
 try {
  const pattern = kind === 'done' ? [[880, 0], [1175, .18], [1568, .36]] : kind === 'go' ? [[988, 0]] : [[660, 0]];
  for (const [freq, at] of pattern) {const osc = context.createOscillator(); const gain = context.createGain(); osc.type = 'sine'; osc.frequency.value = freq; gain.gain.value = .0001; osc.connect(gain); gain.connect(context.destination); const t = context.currentTime + at; gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(.25, t + .02); gain.gain.exponentialRampToValueAtTime(.0001, t + .18); osc.start(t); osc.stop(t + .2);}
 } catch {}
}
export function buzz(ms = 40) {try {navigator.vibrate?.(ms);} catch {}}
