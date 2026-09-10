// Water in her own terms. A phrase names a container and a share of it; the app multiplies container size by share.
// The parser is deterministic and covers everyday phrasing; anything it cannot resolve is asked about, never guessed.
import type {Container} from './domain';
export type Parsed = {kind: 'ok'; container: Container; fraction: number; count: number; ml: number; label: string} | {kind: 'ask'; container: Container | null; question: string} | {kind: 'none'};
const words: Record<string, number> = {a: 1, an: 1, one: 1, once: 1, two: 2, twice: 2, three: 3, thrice: 3, four: 4, five: 5, six: 6};
const shares: [RegExp, number][] = [
 [/\b(three[- ]quarters?|3\/4|¾)\b/, .75], [/\b(two[- ]thirds?|2\/3)\b/, 2 / 3], [/\b(half|1\/2|½)\b/, .5], [/\b(a )?third\b|1\/3/, 1 / 3], [/\b(a )?quarter\b|1\/4|¼/, .25],
 [/\bmost\b/, .75], [/\b(whole|all of|all|entire|full|finished|drank it all|emptied|the lot)\b/, 1], [/\b(a (little|bit|sip|splash|few sips))\b/, NaN],
];
// The longest matching name wins, so "Stanley Quencher" is not read as "Stanley".
export function findContainer(text: string, containers: Container[]) {const t = text.toLowerCase(); return [...containers].sort((a, b) => b.name.length - a.name.length).find(c => t.includes(c.name.toLowerCase())) ?? null;}
export function fractionOf(text: string): number | null {const t = text.toLowerCase(); for (const [re, f] of shares) if (re.test(t)) return f; return null;}
// "refilled it twice" means two containers were emptied to be refilled; "two Stanleys" is plainly two.
export function countOf(text: string): number | null {
 const t = text.toLowerCase();
 if (/refill/.test(t)) {const times = t.match(/(\w+)\s+times?\b/); const w = times?.[1] ?? (/\btwice\b/.test(t) ? 'twice' : /\bthrice\b/.test(t) ? 'thrice' : /\bonce\b/.test(t) ? 'once' : null); if (w === null) return 1; const n = words[w] ?? Number(w); return Number.isFinite(n) && n > 0 && n <= 20 ? n : 1;}
 // A number that starts a share ("three quarters", "two thirds") is not a count.
 const explicit = t.match(/\b(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six)\s+(?:x\s+)?(?!quarters?\b|thirds?\b|halves\b|half\b)[a-z]/); if (explicit) {const n = words[explicit[1]] ?? Number(explicit[1]); if (Number.isFinite(n) && n > 0 && n <= 20) return n;}
 return null;
}
export function pourMl(container: Container, fraction: number, count = 1) {return container.ml * fraction * count;}
export function describe(container: Container, fraction: number, count: number) {
 const share = fraction === 1 ? '' : fraction === .5 ? 'half a ' : fraction === .25 ? 'a quarter of a ' : fraction === .75 ? 'three quarters of a ' : Math.abs(fraction - 1 / 3) < .01 ? 'a third of a ' : `${Math.round(fraction * 100)}% of a `;
 const plural = /s$/i.test(container.name) ? `${container.name}es` : `${container.name}s`;
 if (fraction === 1) return count === 1 ? `a ${container.name}` : `${count} ${plural}`;
 return count === 1 ? `${share}${container.name}` : `${count} × ${share}${container.name}`;
}
export function parsePhrase(text: string, containers: Container[], fallback: Container): Parsed {
 const t = text.trim(); if (!t) return {kind: 'none'};
 const container = findContainer(t, containers) ?? (/\b(glass|cup|bottle|it|one|refill)\b/i.test(t) ? fallback : null);
 // The container's own name (which may hold a number, "40 oz") is set aside before the share and the count are read.
 const rest = container ? t.replace(new RegExp(container.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), 'it') : t;
 const fraction = fractionOf(rest); const count = countOf(rest);
 if (fraction !== null && Number.isNaN(fraction)) return {kind: 'ask', container: container ?? fallback, question: `How much of the ${(container ?? fallback).name}?`};
 // A bare count ("a run", "twice") is not a pour: without a container or a share there is nothing to log.
 if (!container && fraction === null) return {kind: 'none'};
 const c = container ?? fallback;
 if (fraction === null && count === null) return {kind: 'ask', container: c, question: `How much of the ${c.name}?`};
 const f = fraction ?? 1; const n = count ?? 1;
 return {kind: 'ok', container: c, fraction: f, count: n, ml: pourMl(c, f, n), label: describe(c, f, n)};
}
// Progress in her terms: "about 1½ of 3 Stanleys". Halves are the finest step worth showing.
// Progress in her terms: both numbers to the nearest quarter, so "about 1½ of 2¼ Stanleys" agrees with the exact volume next to it.
export function inContainers(ml: number, target: number, container: Container, about = true) {
 const q = (v: number) => Math.round(v / container.ml * 4) / 4; const had = q(ml), of = q(target);
 const num = (n: number) => {const w = Math.floor(n), f = n - w; const part = f === .25 ? '¼' : f === .5 ? '½' : f === .75 ? '¾' : ''; return `${w || (part ? '' : '0')}${part}`;};
 return `${about ? 'about ' : ''}${num(had)} of ${num(of)} ${container.name}${of === 1 ? '' : 's'}`;
}
