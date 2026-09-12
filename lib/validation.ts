import {z} from 'zod';
import {wellFormed, chars} from './bounds';
// Free text: well-formed, no NUL, at most `max` characters (code points); `str` is also trimmed and non-empty.
const fits = (s: z.ZodString, max: number) => s.refine(wellFormed, 'must be well-formed text without NUL').refine(v => chars(v) <= max, `must be at most ${max} characters`);
const str = (max: number) => fits(z.string().trim().min(1), max);
const strOptional = (max: number) => fits(z.string(), max);
const day = z.iso.date();
const zone = z.string().max(80).refine(v => {try {new Intl.DateTimeFormat('en', {timeZone: v}); return true;} catch {return false;}});
const n = (min: number, max: number) => z.number().finite().min(min).max(max);
export const statsSchema = z.object({height: n(120, 230), weight: n(35, 300), age: n(18, 100).int(), activity: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), goal: z.enum(['maintain', 'lose', 'gain'])});
const overrides = z.object({calorieMin: n(1200, 6000).optional(), calorieMax: n(1200, 6500).optional(), protein: n(20, 400).optional(), water: n(500, 6000).optional(), steps: n(500, 40000).optional(), walkMinutes: n(5, 300).optional()}).strict();
const common = {id: z.uuid(), at: z.iso.datetime(), day, zone};
const mealItem = z.object({name: strOptional(120), grams: n(0, 5000), calories: n(0, 10000), protein: n(0, 1000), source: z.enum(['usda', 'estimate']), match: strOptional(200).optional(), fdcId: n(0, Number.MAX_SAFE_INTEGER).int().optional()});
const reward = z.object({id: z.uuid(), name: str(60), cost: n(1, 10000).int()});
export const operationSchema = z.discriminatedUnion('type', [
 z.object({...common, type: z.literal('profile'), stats: statsSchema, overrides}),
 z.object({...common, type: z.literal('check'), habit: z.enum(['workout', 'abs', 'walk', 'water', 'protein', 'calories', 'floss']), value: z.boolean()}),
 z.object({...common, type: z.literal('water'), amount: n(-6000, 6000).refine(v => v !== 0), label: str(60).optional()}),
 z.object({...common, type: z.literal('meal'), mealId: z.uuid(), calories: n(0, 10000), protein: n(0, 1000), description: strOptional(1000).optional(), items: z.array(mealItem).max(12).optional()}),
 z.object({...common, type: z.literal('deleteMeal'), mealId: z.uuid()}),
 z.object({...common, type: z.literal('deleteWalk'), walkId: z.union([z.uuid(), z.literal('legacy')])}),
 z.object({...common, type: z.enum(['rest', 'rescue']), value: z.boolean()}),
 z.object({...common, type: z.literal('weight'), weight: n(35, 300)}),
 z.object({...common, type: z.literal('zone')}),
 z.object({...common, type: z.literal('session'), habit: z.enum(['walk', 'workout', 'abs']), seconds: n(0, 86400), done: z.boolean(), items: z.array(strOptional(60)).max(40).optional(), routine: strOptional(60).optional(), walkId: z.uuid().optional()}),
 z.object({...common, type: z.enum(['meditate', 'focus']), seconds: n(0, 86400)}),
 z.object({...common, type: z.literal('rewards'), rewards: z.array(reward).max(30)}),
 z.object({...common, type: z.literal('redeem'), rewardId: z.uuid(), name: str(60), cost: n(1, 10000).int()}),
 z.object({...common, type: z.literal('unredeem'), rewardId: z.uuid()}),
 z.object({...common, type: z.literal('units'), units: z.object({weight: z.enum(['lb', 'kg']), height: z.enum(['ftin', 'cm']), volume: z.enum(['oz', 'ml']).optional()})}),
 z.object({...common, type: z.literal('containers'), containers: z.array(z.object({id: z.string().min(1).max(40).refine(wellFormed), name: str(30), ml: n(30, 6000)})).min(1).max(12), defaultContainer: z.string().max(40).refine(wellFormed).optional()}),
 z.object({...common, type: z.literal('plan'), workout: z.array(str(60)).max(40)}),
]);
// A batch is checked one change at a time: malformed changes are rejected by id with a reason and never strand the valid ones.
export function validateBatch(raw: unknown): {valid: z.infer<typeof operationSchema>[]; invalid: {id: string; reason: string}[]} | null {
 if (!Array.isArray(raw) || raw.length < 1 || raw.length > 100) return null;
 const valid: z.infer<typeof operationSchema>[] = []; const invalid: {id: string; reason: string}[] = [];
 for (const item of raw) {const parsed = operationSchema.safeParse(item); if (parsed.success) valid.push(parsed.data); else {const id = item && typeof item === 'object' && typeof (item as {id?: unknown}).id === 'string' ? (item as {id: string}).id : ''; const issue = parsed.error.issues[0]; invalid.push({id, reason: `A change was refused: ${issue ? issue.path.join('.') + ' ' + issue.message : 'invalid'}.`});}}
 return {valid, invalid};
}
const rawItem = z.object({name: z.string().max(120), grams: n(0, 5000), calories: n(0, 10000).catch(0), protein: n(0, 1000).catch(0)});
export const estimateSchema = z.object({items: z.array(rawItem).max(12)});
export type {MealItem as EstimateItem} from './domain';
import type {MealItem as EstimateItem} from './domain';
export type Estimate = {items: EstimateItem[]; calories: number; protein: number; model: string};
// What the model may return for a water phrase: which container and what share of it. Never a volume.
export const waterPhraseSchema = z.object({container: z.string().max(40).nullable().catch(null), fraction: n(0, 1).nullable().catch(null), count: n(0, 20).nullable().catch(null)});
