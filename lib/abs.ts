// The guided ab library. Each routine is a list of timed intervals; instructions are plain movement cues, not medical advice.
export type Exercise = {name: string; cue: string};
export type Routine = {id: string; name: string; note: string; work: number; rest: number; exercises: Exercise[]};
export const exercises: Record<string, Exercise> = {
 crunch: {name: 'Crunch', cue: 'Knees bent, hands light behind the head. Lift the shoulder blades, exhale at the top, lower slowly.'},
 deadBug: {name: 'Dead bug', cue: 'On your back, arms up, knees over hips. Lower the opposite arm and leg together. Keep the lower back on the mat.'},
 plank: {name: 'Plank', cue: 'Forearms down, elbows under shoulders. Long line from head to heels. Breathe.'},
 sidePlankL: {name: 'Side plank · left', cue: 'Left forearm down, hips lifted and stacked. Reach the top arm to the ceiling.'},
 sidePlankR: {name: 'Side plank · right', cue: 'Right forearm down, hips lifted and stacked. Reach the top arm to the ceiling.'},
 bicycle: {name: 'Bicycle', cue: 'Slow and controlled: opposite elbow toward the knee, extend the other leg long.'},
 legRaise: {name: 'Leg raise', cue: 'Legs long, hands under hips if you like. Lower with control; stop before the back arches.'},
 mountain: {name: 'Mountain climber', cue: 'High plank. Drive one knee in at a time. Shoulders stay over the wrists.'},
 hollow: {name: 'Hollow hold', cue: 'Lower back pressed down, arms and legs hovering. Make it easier by bending the knees.'},
 birdDog: {name: 'Bird dog', cue: 'On hands and knees. Reach one arm and the opposite leg long. Pause, switch sides.'},
 russian: {name: 'Russian twist', cue: 'Sit tall, lean back a little, rotate the ribs side to side. Feet can stay down.'},
 flutter: {name: 'Flutter kick', cue: 'Small quick kicks with legs long. Keep the lower back planted.'},
};
export const routines: Routine[] = [
 {id: 'gentle', name: 'Gentle core', note: 'Five moves, no crunching. Good on a low-energy day.', work: 30, rest: 15, exercises: [exercises.deadBug, exercises.birdDog, exercises.plank, exercises.hollow, exercises.deadBug]},
 {id: 'classic', name: 'Classic five', note: 'The standard set: five moves, thirty seconds each.', work: 30, rest: 15, exercises: [exercises.crunch, exercises.bicycle, exercises.legRaise, exercises.plank, exercises.russian]},
 {id: 'planks', name: 'Plank circuit', note: 'All holds. Steady breathing beats gritted teeth.', work: 40, rest: 20, exercises: [exercises.plank, exercises.sidePlankL, exercises.sidePlankR, exercises.hollow, exercises.plank]},
 {id: 'quick', name: 'Two-minute burst', note: 'Four quick moves when time is short.', work: 25, rest: 5, exercises: [exercises.mountain, exercises.flutter, exercises.bicycle, exercises.crunch]},
];
export type Interval = {kind: 'work' | 'rest'; seconds: number; exercise: Exercise; index: number; next?: Exercise};
export function intervalsOf(routine: Routine): Interval[] {
 const list: Interval[] = [];
 routine.exercises.forEach((exercise, index) => {list.push({kind: 'work', seconds: routine.work, exercise, index, next: routine.exercises[index + 1]}); if (index < routine.exercises.length - 1) list.push({kind: 'rest', seconds: routine.rest, exercise, index, next: routine.exercises[index + 1]});});
 return list;
}
export function routineSeconds(routine: Routine) {return intervalsOf(routine).reduce((n, i) => n + i.seconds, 0);}
// Which interval a given elapsed time falls in. Deriving the phase from elapsed time is what keeps a backgrounded timer honest.
export function phaseAt(routine: Routine, elapsed: number) {
 let t = 0; const list = intervalsOf(routine);
 for (let i = 0; i < list.length; i++) {if (elapsed < t + list[i].seconds) return {index: i, interval: list[i], remaining: t + list[i].seconds - elapsed, finished: false}; t += list[i].seconds;}
 return {index: list.length, interval: list[list.length - 1], remaining: 0, finished: true};
}
