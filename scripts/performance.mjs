import{chromium}from'playwright';
import lighthouse from'lighthouse';
import{writeFile}from'node:fs/promises';
const url=process.env.PERF_URL??'http://localhost:3075';
const browser=await chromium.launch({headless:true,args:['--remote-debugging-port=9227']});
try{const result=await lighthouse(url,{port:9227,output:'json',onlyCategories:['performance','accessibility','best-practices'],logLevel:'error',formFactor:'mobile',screenEmulation:{mobile:true,width:390,height:844,deviceScaleFactor:1,disabled:false}});await writeFile('evidence/lighthouse-current.json',result.report);const summary={url,scores:Object.fromEntries(Object.entries(result.lhr.categories).map(([k,v])=>[k,v.score])),metrics:Object.fromEntries(['first-contentful-paint','largest-contentful-paint','interactive','total-blocking-time'].map(k=>[k,result.lhr.audits[k]?.numericValue])),throttling:result.lhr.configSettings.throttling};await writeFile('evidence/performance.json',JSON.stringify(summary,null,2));console.log(summary);}finally{await browser.close();}
