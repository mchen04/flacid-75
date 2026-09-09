import {estimateMeal} from '../lib/estimate';
import {findFood,foodCount} from '../lib/foods';
const meals=process.argv.slice(2).length?process.argv.slice(2):['two eggs and toast','chipotle bowl with chicken','half a costco muffin'];
console.log(JSON.stringify({foodCount,sample:['egg whole cooked scrambled','bread white toasted','chicken breast grilled','blueberry muffin'].map(q=>({q,match:findFood(q)?.description}))}));
for(const text of meals){const start=Date.now();try{const result=await estimateMeal({text});console.log(JSON.stringify({text,ms:Date.now()-start,...result}));}catch(error){console.log(JSON.stringify({text,ms:Date.now()-start,error:String(error)}));}}
