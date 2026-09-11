import {test,expect} from './fixtures';
import {writeFile} from 'node:fs/promises';
import {open,seed} from './helpers';
test('camera capture reaches a correctable estimate in four actions without storing the image',async({page})=>{
 let imageMarker='';let imageBytes=0;
 await open(page,seed(),{go:false});
 await page.route('**/api/estimate',r=>{const request=r.request().postDataJSON();imageBytes=request.image.length;imageMarker=request.image.slice(200,350);return r.fulfill({json:{items:[{name:'chicken bowl',grams:350,calories:420,protein:25,source:'estimate'}],calories:420,protein:25,model:'test'}});});
 const start=Date.now();await page.goto('/');await page.getByRole('button',{name:'Log a meal'}).click();await page.getByRole('button',{name:'Photo',exact:true}).click();await page.getByRole('button',{name:'Take meal photo'}).click();await expect(page.getByText('350 g · estimate')).toBeVisible();await page.screenshot({path:'evidence/my-wellness/camera-estimate.png'});await page.getByRole('button',{name:'Add to today'}).click();await expect(page.getByText('420 kcal · 25/105 g')).toBeVisible();const elapsedMs=Date.now()-start;expect(imageBytes).toBeGreaterThan(500);expect(await page.locator('input[type=file]').inputValue()).toBe('');const saved=await page.evaluate(()=>localStorage.getItem('flaccid75-v1')!);expect(saved).not.toContain(imageMarker);expect(saved).not.toContain('data:image');expect(elapsedMs).toBeLessThan(8000);await writeFile('evidence/my-wellness/camera-actions.json',JSON.stringify({actions:['Open app','Tap meal','Tap photo','Take photo','Add'],elapsedMs,source:'Chromium simulated camera; mocked model response; not physical-device timing',imageBytesSent:imageBytes,imagePersistedInClient:false},null,2));
});
