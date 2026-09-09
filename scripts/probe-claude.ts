import {estimateMeal} from '../lib/estimate';
const start=Date.now();
estimateMeal({text:'two boiled eggs and one slice of plain toast'}).then(result=>console.log(JSON.stringify({ok:true,result,milliseconds:Date.now()-start}))).catch(()=>{console.log(JSON.stringify({ok:false,milliseconds:Date.now()-start}));process.exitCode=1;});
