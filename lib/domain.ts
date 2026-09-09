export const habits = ['workout','abs','walk','water','protein','calories'] as const;
export type Habit = typeof habits[number];
export type Targets = {calorieMin:number;calorieMax:number;protein:number;water:number;steps:number};
export type Stats = {height:number;weight:number;age:number;activity:0|1|2|3;goal:'maintain'|'lose'|'gain'};
export type Profile = Stats & {targets:Targets;overrides:Partial<Targets>;baselineWeight:number;startDay:string};
export type Day = {checks:Partial<Record<Habit,boolean>>;water:number;meals:Record<string,{calories:number;protein:number}>;targets:Targets;rest:boolean;rescued:boolean;backfilled:boolean};
export type Clock = {zone:string;anchorDay:string;anchorLocal:string};
export type State = {profile:Profile|null;clock:Clock|null;days:Record<string,Day>;weights:Record<string,number>};
export type Operation = {id:string;at:string;day:string;zone:string} & (
 | {type:'profile';stats:Stats;overrides:Partial<Targets>}
 | {type:'check';habit:Habit;value:boolean}
 | {type:'water';amount:number}
 | {type:'meal';mealId:string;calories:number;protein:number}
 | {type:'deleteMeal';mealId:string}
 | {type:'rest'|'rescue';value:boolean}
 | {type:'weight';weight:number}
 | {type:'zone'});
export const emptyState = ():State=>({profile:null,clock:null,days:{},weights:{}});
export function localDate(at:string|Date,zone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));}
export function addDays(day:string,n:number){return new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);}
export function dayDiff(a:string,b:string){return Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);}
export function dayAt(clock:Clock|null,at:string|Date,zone='UTC'){return clock?addDays(clock.anchorDay,Math.max(0,dayDiff(clock.anchorLocal,localDate(at,clock.zone)))):localDate(at,zone);}
export function changeZone(clock:Clock,at:string,zone:string):Clock{return {zone,anchorDay:dayAt(clock,at),anchorLocal:localDate(at,zone)};}
export function weekStart(day:string){const d=new Date(day+'T12:00:00Z').getUTCDay();return addDays(day,-((d+6)%7));}
export function computeTargets(s:Stats):Targets{
 const rmr=10*s.weight+6.25*s.height-5*s.age-161;
 const center=Math.round(rmr*[1.2,1.375,1.55,1.725][s.activity]*(s.goal==='lose'?.9:s.goal==='gain'?1.1:1)/50)*50;
 return {calorieMin:Math.max(1500,center-100),calorieMax:Math.max(1700,center+100),protein:Math.round(s.weight*1.6/5)*5,water:Math.min(3500,Math.max(1500,Math.round(s.weight*30/250)*250)),steps:Math.round([6000,7000,8000,10000][s.activity]*(s.age>=65?.8:1)/500)*500};
}
export function weightTrend(weights:Record<string,number>){let smooth=0,last='';return Object.entries(weights).sort(([a],[b])=>a.localeCompare(b)).map(([day,value])=>{const alpha=last?1-Math.exp(-Math.max(1,dayDiff(last,day))/7):1;smooth=last?smooth+alpha*(value-smooth):value;last=day;return {day,value:Math.round(smooth*10)/10};});}
export function newDay(targets:Targets):Day{return {checks:{},water:0,meals:{},targets:{...targets},rest:false,rescued:false,backfilled:false};}
export function totals(day:Day){return Object.values(day.meals).reduce((a,b)=>({calories:a.calories+b.calories,protein:a.protein+b.protein}),{calories:0,protein:0});}
export function completion(day?:Day):Record<Habit,boolean>{const t=day?totals(day):{protein:0,calories:0};return Object.fromEntries(habits.map(h=>[h,day?.checks[h]??(!day?false:h==='water'?day.water>=day.targets.water:h==='protein'?t.protein>=day.targets.protein:h==='calories'?t.calories>=day.targets.calorieMin&&t.calories<=day.targets.calorieMax:false)])) as Record<Habit,boolean>;}
export function isComplete(d?:Day){return !!d&&Object.values(completion(d)).every(Boolean);}
export function isKept(d?:Day){return !!d&&(isComplete(d)||d.rest||d.rescued);}
export function missing(d?:Day){const c=completion(d);return habits.filter(h=>!c[h]);}
export function restsLeft(state:State,day:string){const start=weekStart(day);return Math.max(0,1-Object.entries(state.days).filter(([k,v])=>weekStart(k)===start&&v.rest).length);}
export function streaks(state:State,today:string){let current=0,longest=0;const history:{day:string;value:number}[]=[];if(!state.profile)return {current,longest,history};for(let d=state.profile.startDay;d<=today;d=addDays(d,1)){const entry=state.days[d];if(isKept(entry)){if(isComplete(entry))current++;}else if(d!==today)current=0;longest=Math.max(longest,current);history.push({day:d,value:current});}return {current,longest,history};}
export function apply(state:State,op:Operation):State{
 const next:State=structuredClone(state);
 if(op.type==='profile'){
  const targets={...computeTargets(op.stats),...op.overrides};
  next.profile={...op.stats,targets,overrides:op.overrides,baselineWeight:op.stats.weight,startDay:state.profile?.startDay??op.day};
  next.clock??={zone:op.zone,anchorDay:op.day,anchorLocal:localDate(op.at,op.zone)};
  if(next.days[op.day])next.days[op.day].targets={...targets};
  return next;
 }
 if(!next.profile||!next.clock)throw new Error('Set up your targets first.');
 if(op.type==='zone'){next.clock=changeZone(next.clock,op.at,op.zone);return next;}
 if(op.day>dayAt(next.clock,op.at)||op.day<'2000-01-01')throw new Error('Choose today or a past day.');
 if(op.day<next.profile.startDay)next.profile.startDay=op.day;
 if(op.type==='weight'){
  next.weights[op.day]=op.weight;
  const trend=weightTrend(next.weights).at(-1)!.value;
  if(Math.abs(trend/next.profile.baselineWeight-1)>=.02){next.profile.targets={...computeTargets({...next.profile,weight:trend}),...next.profile.overrides};next.profile.baselineWeight=trend;const current=dayAt(next.clock,op.at);if(next.days[current])next.days[current].targets={...next.profile.targets};}
  return next;
 }
 const day=next.days[op.day]??=newDay(next.profile.targets);
 if(op.day<dayAt(next.clock,op.at))day.backfilled=true;
 switch(op.type){
  case 'check':day.checks[op.habit]=op.value;break;
  case 'water':day.water=Math.max(0,day.water+op.amount);delete day.checks.water;break;
  case 'meal':day.meals[op.mealId]={calories:op.calories,protein:op.protein};delete day.checks.calories;delete day.checks.protein;break;
  case 'deleteMeal':delete day.meals[op.mealId];delete day.checks.calories;delete day.checks.protein;break;
  case 'rest':if(op.value&&!day.rest&&restsLeft(next,op.day)===0)throw new Error('This week’s rest day is already used.');day.rest=op.value;break;
  case 'rescue':day.rescued=op.value;break;
 }
 return next;
}
