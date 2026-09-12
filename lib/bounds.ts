// The bounds the server enforces (lib/validation.ts), restated for the browser without pulling the schema library into the bundle.
// `checkBounds` runs before a change is queued, so ordinary input cannot produce a change the server would refuse.
// tests/bounds.test.ts holds this file to the server schema on the same good and bad operations.
import type {Operation} from './domain';
export const limits = {rewardCost: [1, 10000], rewards: 30, rewardName: 60, planLine: 60, planLines: 40, waterLabel: 60, mealDescription: 1000, mealItems: 12, calories: [0, 10000], protein: [0, 1000], water: [-6000, 6000], seconds: [0, 86400], containerName: 30, containerMl: [30, 6000], containers: 12, weight: [35, 300], height: [120, 230], age: [18, 100], overrides: {calorieMin: [1200, 6000], calorieMax: [1200, 6500], protein: [20, 400], water: [500, 6000], steps: [500, 40000], walkMinutes: [5, 300]}} as const;
const out = 'Outside the range the app accepts.';
const inRange = (v: unknown, [lo, hi]: readonly [number, number]) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
// Free text is measured in characters (code points, so an emoji is one), must be well-formed (no lone surrogate half) and may not hold NUL:
// PostgreSQL refuses either inside JSON, which would refuse a whole batch. The same rule is applied by the server schema and the database layer.
export const wellFormed = (v: string) => (typeof v.isWellFormed === 'function' ? v.isWellFormed() : !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(v)) && !v.includes('\u0000');
export const chars = (v: string) => [...v].length;
// Cuts free text to `max` characters without splitting a character, and drops what cannot be stored.
export function clip(v: string, max: number) {return [...v.replaceAll('\u0000', '')].filter(c => !(c.length === 1 && /[\uD800-\uDFFF]/.test(c))).slice(0, max).join('');}
const text = (v: unknown, max: number) => typeof v === 'string' && wellFormed(v) && chars(v.trim()) >= 1 && chars(v.trim()) <= max;
const textOptional = (v: unknown, max: number) => typeof v === 'string' && wellFormed(v) && chars(v) <= max;
const isUuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
// Returns a short reason when the change is outside what the account accepts, else null.
export function checkBounds(op: Operation): string | null {
 if (!isUuid(op.id)) return out;
 switch (op.type) {
  case 'water': return inRange(op.amount, limits.water) && op.amount !== 0 && (op.label === undefined || text(op.label, limits.waterLabel)) ? null : out;
  case 'meal': return isUuid(op.mealId) && inRange(op.calories, limits.calories) && inRange(op.protein, limits.protein) && (op.description === undefined || textOptional(op.description, limits.mealDescription)) && (op.items === undefined || (op.items.length <= limits.mealItems && op.items.every(i => textOptional(i.name, 120) && inRange(i.grams, [0, 5000]) && inRange(i.calories, limits.calories) && inRange(i.protein, limits.protein) && ['usda', 'estimate'].includes(i.source) && (i.match === undefined || textOptional(i.match, 200)) && (i.fdcId === undefined || (Number.isSafeInteger(i.fdcId) && i.fdcId >= 0))))) ? null : 'A meal must be 0–10,000 kcal and 0–1,000 g protein.';
  case 'session': return inRange(op.seconds, limits.seconds) && (op.walkId === undefined || isUuid(op.walkId)) && (op.items === undefined || (op.items.length <= limits.planLines && op.items.every(i => textOptional(i, limits.planLine)))) && (op.routine === undefined || textOptional(op.routine, 60)) ? null : out;
  case 'meditate': case 'focus': return inRange(op.seconds, limits.seconds) ? null : out;
  case 'rewards': return op.rewards.length <= limits.rewards && op.rewards.every(r => isUuid(r.id) && text(r.name, limits.rewardName) && Number.isInteger(r.cost) && inRange(r.cost, limits.rewardCost)) ? null : `Treats need a name and a whole number of points from 1 to ${limits.rewardCost[1].toLocaleString()}, up to ${limits.rewards} treats.`;
  case 'redeem': return isUuid(op.rewardId) && text(op.name, limits.rewardName) && Number.isInteger(op.cost) && inRange(op.cost, limits.rewardCost) ? null : out;
  case 'unredeem': return isUuid(op.rewardId) ? null : out;
  case 'plan': return op.workout.length <= limits.planLines && op.workout.every(l => text(l, limits.planLine)) ? null : `Each move needs 1–${limits.planLine} characters, up to ${limits.planLines} moves.`;
  case 'containers': return op.containers.length >= 1 && op.containers.length <= limits.containers && op.containers.every(c => typeof c.id === 'string' && c.id.length >= 1 && c.id.length <= 40 && wellFormed(c.id) && text(c.name, limits.containerName) && inRange(c.ml, limits.containerMl)) && (op.defaultContainer === undefined || (typeof op.defaultContainer === 'string' && op.defaultContainer.length <= 40 && wellFormed(op.defaultContainer))) ? null : out;
  case 'profile': return inRange(op.stats.height, limits.height) && inRange(op.stats.weight, limits.weight) && Number.isInteger(op.stats.age) && inRange(op.stats.age, limits.age) && (Object.keys(op.overrides) as (keyof typeof limits.overrides)[]).every(k => k in limits.overrides && inRange(op.overrides[k], limits.overrides[k])) ? null : 'A target is outside the range the app accepts.';
  case 'weight': return inRange(op.weight, limits.weight) ? null : out;
  case 'deleteMeal': return isUuid(op.mealId) ? null : out;
  default: return null;
 }
}
