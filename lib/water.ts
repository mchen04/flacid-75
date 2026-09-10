// Water in her own terms. A phrase names a container and a share of it; the app multiplies container size by share.
// The parser is deterministic and covers everyday phrasing; anything it cannot resolve is asked about, never guessed.
import type {Container} from './domain';
export type Parsed = {kind: 'ok'; container: Container; fraction: number; count: number; ml: number; label: string} | {kind: 'ask'; container: Container | null; question: string} | {kind: 'none'};
const words: Record<string, number> = {a: 1, an: 1, one: 1, once: 1, two: 2, twice: 2, three: 3, thrice: 3, four: 4, five: 5, six: 6};
const shares: [RegExp, number][] = [
 [/\b(three[- ]quarters?|3\/4|¾)\b/, .75], [/\b(two[- ]thirds?|2\/3)\b/, 2 / 3], [/\b(half|1\/2|½)\b/, .5], [/\b(a )?third\b|1\/3/, 1 / 3], [/\b(a )?quarter\b|1\/4|¼/, .25],
 [/\bmost\b/, .75], [/\b(whole|all of|all|entire|full|finished|drank it all|emptied|the lot)\b/, 1], [/\b(a (little|bit|sip|splash|few sips))\b/, NaN],
];
export function findContainer(text: string, containers: Container[]) {const t = text.toLowerCase(); return containers.find(c => t.includes(c.name.toLowerCase())) ?? null;}
export function fractionOf(text: string): number | null {const t = text.toLowerCase(); for (const [re, f] of shares) if (re.test(t)) return f; return null;}
// "refilled it twice" means two containers were emptied to be refilled; "two Stanleys" is plainly two.
export function countOf(text: string): number | null {
 const t = text.toLowerCase();
 const refill = t.match(/refill(?:ed|s)?(?: it| the \w+)?(?: (\w+) times?| (\w+))?/); if (refill) {const w = refill[1] ?? refill[2] ?? 'once'; const n = words[w] ?? Number(w); return Number.isFinite(n) && n > 0 ? n : 1;}
 const explicit = t.match(/\b(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six)\s+(?:x\s+)?[a-z]/); if (explicit) {const n = words[explicit[1]] ?? Number(explicit[1]); if (Number.isFinite(n) && n > 0 && n <= 20) return n;}
 return null;
}
export function pourMl(container: Container, fraction: number, count = 1) {return container.ml * fraction * count;}
export function describe(container: Container, fraction: number, count: number) {
 const share = fraction === 1 ? '' : fraction === .5 ? 'half a ' : fraction === .25 ? 'a quarter of a ' : fraction === .75 ? 'three quarters of a ' : Math.abs(fraction - 1 / 3) < .01 ? 'a third of a ' : `${Math.round(fraction * 100)}% of a `;
 if (fraction === 1) return count === 1 ? `a ${container.name}` : `${count} ${container.name}s`;
 return count === 1 ? `${share}${container.name}` : `${count} × ${share}${container.name}`;
}
export function parsePhrase(text: string, containers: Container[], fallback: Container): Parsed {
 const t = text.trim(); if (!t) return {kind: 'none'};
 const container = findContainer(t, containers) ?? (/\b(glass|cup|bottle|it|one|refill)\b/i.test(t) ? fallback : null);
 const fraction = fractionOf(t); const count = countOf(t);
 if (fraction !== null && Number.isNaN(fraction)) return {kind: 'ask', container: container ?? fallback, question: `How much of the ${(container ?? fallback).name}?`};
 // A bare count ("a run", "twice") is not a pour: without a container or a share there is nothing to log.
 if (!container && fraction === null) return {kind: 'none'};
 const c = container ?? fallback;
 if (fraction === null && count === null) return {kind: 'ask', container: c, question: `How much of the ${c.name}?`};
 const f = fraction ?? 1; const n = count ?? 1;
 return {kind: 'ok', container: c, fraction: f, count: n, ml: pourMl(c, f, n), label: describe(c, f, n)};
}
// Progress in her terms: "about 1½ of 3 Stanleys". Halves are the finest step worth showing.
export function inContainers(ml: number, target: number, container: Container) {
 const had = Math.round(ml / container.ml * 2) / 2; const of = Math.ceil(target / container.ml - 1e-9);
 const num = (n: number) => n % 1 === 0 ? String(n) : `${Math.floor(n) || ''}½`;
 return `about ${num(had)} of ${of} ${container.name}${of === 1 ? '' : 's'}`;
}
