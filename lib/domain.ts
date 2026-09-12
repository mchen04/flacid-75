// The rules of the day. Every field added for My Wellness is optional on read so state saved by earlier versions loads unchanged.
export const habits = ['workout', 'abs', 'walk', 'water', 'protein', 'calories', 'floss'] as const;
export type Habit = typeof habits[number];
export type Targets = {calorieMin: number; calorieMax: number; protein: number; water: number; steps: number; walkMinutes?: number};
export type Stats = {height: number; weight: number; age: number; activity: 0 | 1 | 2 | 3; goal: 'maintain' | 'lose' | 'gain'};
export type Units = {weight: 'lb' | 'kg'; height: 'ftin' | 'cm'; volume?: 'oz' | 'ml'};
// A named drinking container. Size is canonical millilitres; the name is whatever she calls it.
export type Container = {id: string; name: string; ml: number};
export type Reward = {id: string; name: string; cost: number};
export type MealItem = {name: string; grams: number; calories: number; protein: number; source: 'usda' | 'estimate'; match?: string; fdcId?: number};
export type MealRecord = {calories: number; protein: number; description?: string; items?: MealItem[]};
export type Session = {seconds: number; items?: string[]; routine?: string};
export type Profile = Stats & {targets: Targets; overrides: Partial<Targets>; baselineWeight: number; startDay: string; units?: Units; rewards?: Reward[]; plan?: string[]; containers?: Container[]; defaultContainer?: string};
export type Day = {
 checks: Partial<Record<Habit, boolean>>; water: number; meals: Record<string, MealRecord>; targets: Targets; rest: boolean; rescued: boolean; backfilled: boolean;
 sessions?: Partial<Record<'walk' | 'workout' | 'abs', Session>>; meditate?: number; focus?: number; redeemed?: Record<string, {name: string; cost: number}>;
 // Every pour, in order, so the last one can be undone and the day can be read back in her own terms.
 walkLog?: Record<string, Session>; walkOrder?: string[]; mealOrder?: string[];
 waterLog?: {ml: number; label?: string}[];
};
export type Clock = {zone: string; anchorDay: string; anchorLocal: string};
export type State = {profile: Profile | null; clock: Clock | null; days: Record<string, Day>; weights: Record<string, number>};
export type Operation = {id: string; at: string; day: string; zone: string} & (
 | {type: 'profile'; stats: Stats; overrides: Partial<Targets>}
 | {type: 'check'; habit: Habit; value: boolean}
 | {type: 'water'; amount: number; label?: string}
 | ({type: 'meal'; mealId: string} & MealRecord)
 | {type: 'deleteMeal'; mealId: string}
 | {type: 'rest' | 'rescue'; value: boolean}
 | {type: 'weight'; weight: number}
 | {type: 'zone'}
 | {type: 'session'; habit: 'walk' | 'workout' | 'abs'; seconds: number; done: boolean; items?: string[]; routine?: string; walkId?: string}
 | {type: 'meditate' | 'focus'; seconds: number}
 | {type: 'rewards'; rewards: Reward[]}
 | {type: 'redeem'; rewardId: string; name: string; cost: number}
 | {type: 'unredeem'; rewardId: string}
 | {type: 'units'; units: Units}
 | {type: 'plan'; workout: string[]}
 | {type: 'containers'; containers: Container[]; defaultContainer?: string});
export const restDaysPerWeek = 2;
export const defaultUnits: Units = {weight: 'lb', height: 'ftin'};
export const defaultWalkMinutes = 30;
export const defaultPlan = ['Warm up', 'Squats', 'Push-ups', 'Rows', 'Plank', 'Stretch'];
// One US fluid ounce in millilitres. Containers are entered in her unit and stored in millilitres at full precision.
export const mlPerOz = 29.5735295625;
export const glassMl = 250;
// The seeded container: a 30 oz Stanley, the default for one-tap logging. A plain glass stays available.
export const seedContainers = (): Container[] => [{id: 'stanley', name: 'Stanley', ml: 30 * mlPerOz}, {id: 'glass', name: 'Glass', ml: glassMl}];
export function containersOf(profile: Profile | null) {const list = profile?.containers?.length ? profile.containers : seedContainers(); const def = list.find(c => c.id === profile?.defaultContainer) ?? list[0]; return {list, default: def};}
// Points are a small, transparent game: ten for each required habit, thirty more for a whole day. Treats are chosen by the user and cost points.
export const pointsPerHabit = 10, pointsPerDay = 30;
export const milestoneDays = [3, 7, 14, 21, 30, 50, 75, 100];
export const emptyState = (): State => ({profile: null, clock: null, days: {}, weights: {}});
export function localDate(at: string | Date, zone: string) {return new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(at));}
export function addDays(day: string, n: number) {return new Date(Date.parse(day + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);}
export function dayDiff(a: string, b: string) {return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);}
export function dayAt(clock: Clock | null, at: string | Date, zone = 'UTC') {return clock ? addDays(clock.anchorDay, Math.max(0, dayDiff(clock.anchorLocal, localDate(at, clock.zone)))) : localDate(at, zone);}
export function changeZone(clock: Clock, at: string, zone: string): Clock {return {zone, anchorDay: dayAt(clock, at), anchorLocal: localDate(at, zone)};}
export function weekStart(day: string) {const d = new Date(day + 'T12:00:00Z').getUTCDay(); return addDays(day, -((d + 6) % 7));}
export function computeTargets(s: Stats): Targets {
 const rmr = 10 * s.weight + 6.25 * s.height - 5 * s.age - 161;
 const center = Math.round(rmr * [1.2, 1.375, 1.55, 1.725][s.activity] * (s.goal === 'lose' ? .9 : s.goal === 'gain' ? 1.1 : 1) / 50) * 50;
 return {calorieMin: Math.max(1500, center - 100), calorieMax: Math.max(1700, center + 100), protein: Math.round(s.weight * 1.6 / 5) * 5, water: Math.min(3500, Math.max(1500, Math.round(s.weight * 30 / 250) * 250)), steps: Math.round([6000, 7000, 8000, 10000][s.activity] * (s.age >= 65 ? .8 : 1) / 500) * 500, walkMinutes: defaultWalkMinutes};
}
export function weightTrend(weights: Record<string, number>) {let smooth = 0, last = ''; return Object.entries(weights).sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => {const alpha = last ? 1 - Math.exp(-Math.max(1, dayDiff(last, day)) / 7) : 1; smooth = last ? smooth + alpha * (value - smooth) : value; last = day; return {day, value: Math.round(smooth * 10) / 10};});}
export function newDay(targets: Targets): Day {return {checks: {}, water: 0, meals: {}, targets: {...targets}, rest: false, rescued: false, backfilled: false};}
export function entriesInOrder<T>(entries: Record<string, T>, order?: string[]) {
 return [...new Set([...(order ?? []), ...Object.keys(entries).sort()])].filter(id => entries[id] !== undefined).map(id => [id, entries[id]] as const);
}
export function totals(day: Day) {return Object.values(day.meals).reduce((a, b) => ({calories: a.calories + b.calories, protein: a.protein + b.protein}), {calories: 0, protein: 0});}
// Water is summed from pours stored at full precision (an ounce is 29.5735295625 ml), so a target met exactly can fall short by a
// billionth of a millilitre. A hundredth of a millilitre of tolerance covers that and grants nothing a person could pour.
export const waterTolerance = 0.01;
export function completion(day?: Day): Record<Habit, boolean> {const t = day ? totals(day) : {protein: 0, calories: 0}; return Object.fromEntries(habits.map(h => [h, day?.checks[h] ?? (!day ? false : h === 'water' ? day.water >= day.targets.water - waterTolerance : h === 'protein' ? t.protein >= day.targets.protein : h === 'calories' ? t.calories >= day.targets.calorieMin && t.calories <= day.targets.calorieMax : false)])) as Record<Habit, boolean>;}
export function isComplete(d?: Day) {return !!d && Object.values(completion(d)).every(Boolean);}
export function isKept(d?: Day) {return !!d && (isComplete(d) || d.rest || d.rescued);}
export function missing(d?: Day) {const c = completion(d); return habits.filter(h => !c[h]);}
export function restsUsed(state: State, day: string) {const start = weekStart(day); return Object.entries(state.days).filter(([k, v]) => weekStart(k) === start && v.rest).map(([k]) => k).sort();}
export function restsLeft(state: State, day: string) {return Math.max(0, restDaysPerWeek - restsUsed(state, day).length);}
export function streaks(state: State, today: string) {let current = 0, longest = 0; const history: {day: string; value: number}[] = []; if (!state.profile) return {current, longest, history}; for (let d = state.profile.startDay; d <= today; d = addDays(d, 1)) {const entry = state.days[d]; if (isKept(entry)) {if (isComplete(entry)) current++;} else if (d !== today) current = 0; longest = Math.max(longest, current); history.push({day: d, value: current});} return {current, longest, history};}
// Points earned so far: every checked required habit on every day up to today, plus the daily bonus for complete days.
export function pointsEarned(state: State, today: string) {let n = 0; for (const [day, entry] of Object.entries(state.days)) {if (day > today) continue; const done = Object.values(completion(entry)).filter(Boolean).length; n += done * pointsPerHabit + (done === habits.length ? pointsPerDay : 0);} return n;}
export function pointsSpent(state: State) {let n = 0; for (const entry of Object.values(state.days)) for (const r of Object.values(entry.redeemed ?? {})) n += r.cost; return n;}
export function pointsBalance(state: State, today: string) {return pointsEarned(state, today) - pointsSpent(state);}
// Milestones are streak lengths reached at least once; each carries the first day it was reached.
export function milestones(state: State, today: string) {const {history, longest, current} = streaks(state, today); return milestoneDays.map(days => ({days, reached: longest >= days, day: history.find(h => h.value >= days)?.day ?? null, current: current >= days}));}
export function completeDays(state: State, today: string) {return Object.entries(state.days).filter(([d, e]) => d <= today && isComplete(e)).length;}
export function apply(state: State, op: Operation): State {
 const next: State = structuredClone(state);
 if (op.type === 'profile') {
  // Saving targets or details without changing the weight keeps the trend baseline and recomputes from it; a changed weight resets the baseline.
  const sameWeight = !!state.profile && state.profile.weight === op.stats.weight;
  const baselineWeight = sameWeight ? state.profile!.baselineWeight : op.stats.weight;
  const targets = {...computeTargets({...op.stats, weight: baselineWeight}), ...op.overrides};
  // Only the five measurements come from the change; treats, plan, containers and units on the profile are never touched by a targets or details save.
  const {height, weight, age, activity, goal} = op.stats;
  next.profile = {...next.profile, height, weight, age, activity, goal, targets, overrides: op.overrides, baselineWeight, startDay: state.profile?.startDay ?? op.day};
  next.clock ??= {zone: op.zone, anchorDay: op.day, anchorLocal: localDate(op.at, op.zone)};
  if (next.days[op.day]) next.days[op.day].targets = {...targets};
  return next;
 }
 if (!next.profile || !next.clock) throw new Error('Set up your targets first.');
 if (op.type === 'zone') {next.clock = changeZone(next.clock, op.at, op.zone); return next;}
 if (op.type === 'units') {next.profile.units = op.units; return next;}
 if (op.type === 'rewards') {next.profile.rewards = op.rewards; return next;}
 if (op.type === 'plan') {next.profile.plan = op.workout; return next;}
 if (op.type === 'containers') {next.profile.containers = op.containers; next.profile.defaultContainer = op.defaultContainer ?? op.containers[0]?.id; return next;}
 const today = dayAt(next.clock, op.at);
 // Rest days may be planned ahead within the current Monday–Sunday week. Everything else is today or the past.
 const plannable = op.type === 'rest' && op.day <= addDays(weekStart(today), 6);
 if ((op.day > today && !plannable) || op.day < '2000-01-01') throw new Error('Choose today or a past day.');
 if (op.day < next.profile.startDay) next.profile.startDay = op.day;
 if (op.type === 'weight') {
  next.weights[op.day] = op.weight;
  const trend = weightTrend(next.weights).at(-1)!.value;
  if (Math.abs(trend / next.profile.baselineWeight - 1) >= .02) {next.profile.targets = {...computeTargets({...next.profile, weight: trend}), ...next.profile.overrides}; next.profile.baselineWeight = trend; if (next.days[today]) next.days[today].targets = {...next.profile.targets};}
  return next;
 }
 const day = next.days[op.day] ??= newDay(next.profile.targets);
 if (op.day < today) day.backfilled = true;
 switch (op.type) {
  case 'check': day.checks[op.habit] = op.value; break;
  case 'water': {
   // Positive amounts append a pour; a negative amount removes the matching last pour (or just subtracts, for old clients).
   day.waterLog ??= [];
   if (op.amount > 0) day.waterLog.push({ml: op.amount, ...(op.label ? {label: op.label} : {})});
   else {const i = day.waterLog.map(e => e.ml).lastIndexOf(-op.amount); if (i >= 0) day.waterLog.splice(i, 1);}
   day.water = Math.max(0, day.water + op.amount); delete day.checks.water; break;
  }
  case 'meal': day.mealOrder ??= Object.keys(day.meals).sort(); if (!day.meals[op.mealId]) day.mealOrder.push(op.mealId); day.meals[op.mealId] = {...day.meals[op.mealId], calories: op.calories, protein: op.protein, ...(op.description !== undefined ? {description: op.description} : {}), ...(op.items !== undefined ? {items: op.items} : {})}; delete day.checks.calories; delete day.checks.protein; break;
  case 'deleteMeal': delete day.meals[op.mealId]; if (day.mealOrder) day.mealOrder = day.mealOrder.filter(id => id !== op.mealId); delete day.checks.calories; delete day.checks.protein; break;
  case 'rest': if (op.value && !day.rest && restsLeft(next, op.day) === 0) throw new Error(`This week’s ${restDaysPerWeek} rest days are already planned.`); day.rest = op.value; break;
  case 'rescue': day.rescued = op.value; break;
  case 'session':
   day.sessions ??= {};
   if (op.habit === 'walk' && op.done) {
    // Import the single legacy session once. New entries use stable ids, including timer retries.
    day.walkLog ??= day.sessions.walk ? {legacy: day.sessions.walk} : {};
    day.walkOrder ??= Object.keys(day.walkLog).sort();
    if (!day.walkLog[op.walkId ?? op.id]) day.walkOrder.push(op.walkId ?? op.id);
    day.walkLog[op.walkId ?? op.id] ??= {seconds: Math.max(0, Math.round(op.seconds))};
    day.sessions.walk = {seconds: Object.values(day.walkLog).reduce((sum, entry) => sum + entry.seconds, 0)};
    day.checks.walk = true;
    break;
   }
   if (op.habit === 'walk' && !op.done) {delete day.walkLog; delete day.walkOrder;}
   if (op.done) day.sessions[op.habit] = {seconds: Math.max(0, Math.round(op.seconds)), ...(op.items ? {items: op.items} : {}), ...(op.routine ? {routine: op.routine} : {})}; else delete day.sessions[op.habit]; day.checks[op.habit] = op.done; break;
  case 'meditate': day.meditate = (day.meditate ?? 0) + Math.max(0, Math.round(op.seconds)); break;
  case 'focus': day.focus = (day.focus ?? 0) + Math.max(0, Math.round(op.seconds)); break;
  case 'redeem': {day.redeemed ??= {}; if (day.redeemed[op.rewardId]) break; if (pointsBalance(next, today) < op.cost) throw new Error('Not enough points yet.'); day.redeemed[op.rewardId] = {name: op.name, cost: op.cost}; break;}
  case 'unredeem': if (day.redeemed) delete day.redeemed[op.rewardId]; break;
 }
 return next;
}
