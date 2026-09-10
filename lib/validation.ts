import {z} from 'zod';
const day = z.iso.date();
const zone = z.string().max(80).refine(v => {try {new Intl.DateTimeFormat('en', {timeZone: v}); return true;} catch {return false;}});
const n = (min: number, max: number) => z.number().finite().min(min).max(max);
export const statsSchema = z.object({height: n(120, 230), weight: n(35, 300), age: n(18, 100).int(), activity: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), goal: z.enum(['maintain', 'lose', 'gain'])});
const overrides = z.object({calorieMin: n(1200, 6000).optional(), calorieMax: n(1200, 6500).optional(), protein: n(20, 400).optional(), water: n(500, 6000).optional(), steps: n(500, 40000).optional(), walkMinutes: n(5, 300).optional()}).strict();
const common = {id: z.uuid(), at: z.iso.datetime(), day, zone};
const reward = z.object({id: z.uuid(), name: z.string().trim().min(1).max(60), cost: n(1, 10000).int()});
export const operationSchema = z.discriminatedUnion('type', [
 z.object({...common, type: z.literal('profile'), stats: statsSchema, overrides}),
 z.object({...common, type: z.literal('check'), habit: z.enum(['workout', 'abs', 'walk', 'water', 'protein', 'calories', 'floss']), value: z.boolean()}),
 z.object({...common, type: z.literal('water'), amount: z.union([z.literal(250), z.literal(-250)])}),
 z.object({...common, type: z.literal('meal'), mealId: z.uuid(), calories: n(0, 10000), protein: n(0, 1000)}),
 z.object({...common, type: z.literal('deleteMeal'), mealId: z.uuid()}),
 z.object({...common, type: z.enum(['rest', 'rescue']), value: z.boolean()}),
 z.object({...common, type: z.literal('weight'), weight: n(35, 300)}),
 z.object({...common, type: z.literal('zone')}),
 z.object({...common, type: z.literal('session'), habit: z.enum(['walk', 'workout', 'abs']), seconds: n(0, 86400), done: z.boolean(), items: z.array(z.string().max(60)).max(40).optional(), routine: z.string().max(60).optional()}),
 z.object({...common, type: z.enum(['meditate', 'focus']), seconds: n(0, 86400)}),
 z.object({...common, type: z.literal('rewards'), rewards: z.array(reward).max(30)}),
 z.object({...common, type: z.literal('redeem'), rewardId: z.uuid(), name: z.string().trim().min(1).max(60), cost: n(1, 10000).int()}),
 z.object({...common, type: z.literal('unredeem'), rewardId: z.uuid()}),
 z.object({...common, type: z.literal('units'), units: z.object({weight: z.enum(['lb', 'kg']), height: z.enum(['ftin', 'cm'])})}),
 z.object({...common, type: z.literal('plan'), workout: z.array(z.string().trim().min(1).max(60)).max(40)}),
]);
export const operationsSchema = z.array(operationSchema).min(1).max(100);
const rawItem = z.object({name: z.string().max(120), grams: n(0, 5000), calories: n(0, 10000).catch(0), protein: n(0, 1000).catch(0)});
export const estimateSchema = z.object({items: z.array(rawItem).max(12)});
export type EstimateItem = {name: string; grams: number; calories: number; protein: number; source: 'usda' | 'estimate'; match?: string; fdcId?: number};
export type Estimate = {items: EstimateItem[]; calories: number; protein: number; model: string};
