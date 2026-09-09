import foods from './foods.json';
// USDA FoodData Central (SR Legacy 2018-04 and Foundation Foods 2025-04-24), public domain.
// Each row: [fdcId, description, kcal per 100 g, protein g per 100 g, [[grams, portion label], ...]].
type Row=[number,string,number,number,[number,string][]];
export type Food={id:number;description:string;kcalPer100g:number;proteinPer100g:number;portions:{grams:number;label:string}[]};
const rows=foods as Row[];
const penalised=new Set(['mix','dry','artificial','powder','dehydrated','unprepared','frozen','imitation','baby','substitute','flavored','low','reduced','light','lite','diet','nonfat','fat']);
const stop=new Set(['and','with','of','the','a','an','some','plain','fresh','regular','prepared','commercially','added','without','or','to','in','on']);
const stem=(word:string)=>word.length>4&&word.endsWith('es')?word.slice(0,-2):word.length>3&&word.endsWith('s')?word.slice(0,-1):word;
export function tokens(text:string){return text.toLowerCase().replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(t=>t&&!stop.has(t)).map(stem);}
const index=rows.map(row=>({row,words:tokens(row[1]),head:tokens(row[1].split(',')[0])}));
const scored=new Map<string,Food|null>();
export function findFood(name:string):Food|null{
 const query=tokens(name);if(!query.length)return null;const key=query.join(' ');if(scored.has(key))return scored.get(key)!;
 let best:{score:number;row:Row}|null=null;
 for(const {row,words,head} of index){
  let hits=0,score=0;
  for(const q of query){if(words.includes(q)){hits++;score+=2;}else if(words.some(w=>w.startsWith(q)&&q.length>=4)){hits++;score+=1;}}
  if(hits<Math.ceil(query.length/2))continue;
  if(!query.includes(head[0])&&!head.includes(query[0]))continue;
  if(query.includes(head[0]))score+=1;
  for(const w of words)if(penalised.has(w)&&!query.includes(w))score-=1.5;
  score-=words.length*0.08;if(/raw|uncooked/.test(row[1].toLowerCase())&&!query.includes('raw'))score-=0.5;
  if(!best||score>best.score)best={score,row};
 }
 const found=best?{id:best.row[0],description:best.row[1],kcalPer100g:best.row[2],proteinPer100g:best.row[3],portions:best.row[4].map(([grams,label])=>({grams,label}))}:null;
 scored.set(key,found);return found;
}
export const foodCount=rows.length;
