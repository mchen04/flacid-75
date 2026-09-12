import {mkdtempSync,cpSync,symlinkSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {build} from 'esbuild';
import {chromium,webkit,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const scratch=mkdtempSync(join(tmpdir(),'flacid-floss-toggle-mutation-'));
try {
 for(const dir of ['components','lib'])cpSync(dir,join(scratch,dir),{recursive:true});
 for(const file of ['package.json','tsconfig.json'])cpSync(file,join(scratch,file));symlinkSync(resolve('node_modules'),join(scratch,'node_modules'),'dir');
 const target=join(scratch,'components/shared.tsx'),source=readFileSync(target,'utf8');assert.ok(source.includes('aria-checked={checked}'));
 for(const [variant,replacement] of [['baseline','aria-checked={checked}'],['stuck-checked','aria-checked={label === "Floss complete" ? true : checked}']]) {
  writeFileSync(target,source.replace('aria-checked={checked}',replacement));
  const result=await build({absWorkingDir:scratch,stdin:{contents:'import {render} from "preact"; import {useState} from "react"; import {CompletionToggle} from "./components/shared"; function App(){const [checked,setChecked]=useState(true);return <><CompletionToggle label="Floss complete" checked={checked} onChange={()=>setChecked(!checked)}/><output>{String(checked)}</output></>;} render(<App/>,document.body);',resolveDir:scratch,loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',jsxImportSource:'preact',alias:{react:'preact/compat','react/jsx-runtime':'preact/jsx-runtime'}});
  for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]) {
   const browser=await engine.launch();try {const page=await browser.newPage();await page.setContent('<!doctype html><html><body></body></html>');await page.addScriptTag({content:result.outputFiles[0].text});await page.getByRole('checkbox',{name:'Floss complete'}).click();await expect(page.locator('output')).toHaveText('false');await expect(page.getByRole('checkbox',{name:'Floss complete'})).toBeVisible();
    let passes=true;try{await expect(page.getByRole('checkbox',{name:'Floss complete',checked:false})).toBeVisible({timeout:300});}catch{passes=false;}
    console.log(JSON.stringify({engine:engineName,variant,uncheckedAssertionPasses:passes,legacyVisibleAssertionPasses:true,stateIsFalse:true}));assert.equal(passes,variant==='baseline');
   } finally {await browser.close();}
  }
 }
} finally {rmSync(scratch,{recursive:true,force:true});}
