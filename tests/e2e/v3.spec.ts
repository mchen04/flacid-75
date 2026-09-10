import {test,expect} from './fixtures';
import type {Page} from '@playwright/test';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {open,seed} from './helpers';
const shellRects=(page:Page)=>page.evaluate(()=>{document.querySelector('.page')!.scrollTo(0,0);return [...document.querySelectorAll<HTMLElement>('.app-shell > *, .home-view > *, .rows > *')].map(el=>{const r=el.getBoundingClientRect();return [el.className.split(' ')[0],Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)].join(':');});});
test('water goes down by one tap with no dialog, and never below zero',async({page})=>{
 await open(page,seed());
 const add=page.getByRole('button',{name:'Add a Stanley'});const minus=page.getByRole('button',{name:'Undo last pour'});
 await expect(minus).toBeDisabled();
 await add.click();await add.click();await expect(page.getByText('2 of 3 Stanleys · 60 oz')).toBeVisible();
 await minus.click();await expect(page.getByText('1 of 3 Stanleys · 30 oz')).toBeVisible();await expect(page.locator('dialog[open]')).toHaveCount(0);
 await minus.click();await expect(page.getByText('0 of 3 Stanleys · 0 oz')).toBeVisible();await expect(minus).toBeDisabled();
});
test('nothing transient appears and nothing shifts on a habit tap, a pour, a meal or a removal',async({page})=>{
 await open(page,seed());
 await page.route('**/api/estimate',r=>r.fulfill({json:{items:[{name:'banana, raw',grams:120,calories:107,protein:1.3,source:'usda',match:'Bananas, raw',fdcId:173944}],calories:107,protein:1.3,model:'test'}}));
 await page.evaluate(()=>{const w=window as unknown as {__added:string[];__removed:string[]};w.__added=[];w.__removed=[];new MutationObserver(list=>{for(const m of list){const inside=(m.target as Element).closest('.hero, dialog, .row');for(const n of m.addedNodes)if(n instanceof Element&&!inside)w.__added.push(n.tagName+'.'+String(n.getAttribute('class')));for(const n of m.removedNodes)if(n instanceof Element&&!inside&&!(n instanceof HTMLDialogElement))w.__removed.push(n.tagName+'.'+String(n.getAttribute('class')));}}).observe(document.body,{childList:true,subtree:true});});
 const before=await shellRects(page);
 for(const name of ['Log workout','Log abs','Log floss','Log walk','Add a Stanley'])await page.getByRole('button',{name}).click();
 await page.getByRole('button',{name:'Log a meal'}).click();await page.getByLabel('What did you eat?').fill('a banana');await page.getByRole('button',{name:'Look it up'}).click();await page.getByRole('button',{name:'Add to today'}).click();await expect(page.getByText('107 kcal · 1/105 g')).toBeVisible();
 await page.waitForTimeout(3000);
 const after=await shellRects(page);expect(after).toEqual(before);
 for(const role of ['status','alert'])await expect(page.getByRole(role as 'status')).toHaveCount(0);
 await expect(page.locator('.toast, .snackbar, .banner, [class*=toast], [class*=snack], [class*=banner]')).toHaveCount(0);
 const churn=await page.evaluate(()=>{const w=window as unknown as {__added:string[];__removed:string[]};return {added:w.__added,removed:w.__removed};});
 expect(churn.removed.filter(n=>!n.startsWith('DIALOG')),JSON.stringify(churn)).toEqual([]);
 await writeFile(`evidence/my-wellness/transient-check-${test.info().project.name}.json`,JSON.stringify({rectsUnchanged:true,statusOrAlertNodes:0,addedOutsideHeroRowsAndSheet:churn.added,removedOutsideHeroRowsAndSheet:churn.removed},null,2));
});
test('the served manifest, icons and splash carry the My Wellness name and the brand art',async({page})=>{
 await open(page,seed());
 const fetchBytes=(path:string)=>page.evaluate(async p=>{const b=new Uint8Array(await (await fetch(p)).arrayBuffer());return btoa(String.fromCharCode(...b));},path).then(b64=>Buffer.from(b64,'base64'));
 const manifest=JSON.parse((await fetchBytes('/manifest.webmanifest')).toString('utf8'));
 expect(manifest.name).toBe('My Wellness');expect(manifest.short_name).toBe('My Wellness');expect(manifest.theme_color).toBe('#f4eee6');
 const html=(await fetchBytes('/')).toString('utf8');expect(html).toContain('<title>My Wellness</title>');expect(html).toContain('content="My Wellness"');expect(html).not.toMatch(/Flaccid/);
 const hashes:Record<string,string>={};
 for(const path of [...manifest.icons.map((i:{src:string})=>i.src),'/apple-touch-icon.png','/splash-1170x2532.png','/icon.svg']){const body=await fetchBytes(path);hashes[path]=createHash('sha256').update(body).digest('hex');expect(body.equals(await readFile('public'+path)),path).toBe(true);}
 await writeFile('evidence/my-wellness/brand-served.json',JSON.stringify({manifestName:manifest.name,served:hashes},null,2));
});
