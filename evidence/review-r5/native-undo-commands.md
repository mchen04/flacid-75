# Exact native control probes

These run without application code or credentials. Their output explains the test setup change; they are not application regression failures.

First probe (exit 0; WebKit returns the pre-fill text for both grouping variants):

```sh
node --input-type=module > evidence/review-r5/native-undo-probe.txt <<'JS'
import {chromium,webkit} from '@playwright/test';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){const browser=await engine.launch();try{for(const split of [false,true]){const page=await browser.newPage();await page.setContent('<textarea>Three bowls</textarea><button>Elsewhere</button>');const field=page.locator('textarea'),value='A'+'x'.repeat(998)+'Z';await field.fill(value);if(split){await page.locator('button').focus();await field.focus();}await field.evaluate(el=>el.setSelectionRange(1,2));await field.pressSequentially('Q');await field.press('ControlOrMeta+z');const result=await field.inputValue();console.log(JSON.stringify({engine:name,blurBetweenEdits:split,restoresFullText:result===value,length:result.length}));await page.close();}}finally{await browser.close();}}
JS
```

Arrow-key probe (exit 0; WebKit still groups the fill and replacement):

```sh
node --input-type=module > evidence/review-r5/native-undo-keystrokes.txt <<'JS'
import {chromium,webkit} from '@playwright/test';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){const browser=await engine.launch();try{for(const char of ['x','🍚']){const page=await browser.newPage();await page.setContent('<textarea>Three bowls</textarea>');const field=page.locator('textarea'),value='A'+char.repeat(998)+'Z';await field.fill(value);await field.evaluate(el=>el.setSelectionRange(1,1));await field.press('ArrowRight');await field.press('Shift+ArrowLeft');await field.pressSequentially('Q');await field.press('ControlOrMeta+z');const result=await field.inputValue();console.log(JSON.stringify({engine:name,character:char,restoresFullText:result===value,length:[...result].length}));await page.close();}}finally{await browser.close();}}
JS
```

Initial-value probe (exit 0; both engines restore the full text, for ASCII and emoji):

```sh
node --input-type=module > evidence/review-r5/native-undo-reopened.txt <<'JS'
import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){const browser=await engine.launch();try{for(const char of ['x','🍚']){const page=await browser.newPage(),value='A'+char.repeat(998)+'Z';await page.setContent('<textarea>'+value+'</textarea>');const field=page.locator('textarea');await field.focus();await field.evaluate(el=>el.setSelectionRange(1,1));await field.press('ArrowRight');await field.press('Shift+ArrowLeft');await field.pressSequentially('Q');await field.press('ControlOrMeta+z');const result=await field.inputValue();console.log(JSON.stringify({engine:name,character:char,restoresFullText:result===value,length:[...result].length}));assert.equal(result,value);await page.close();}}finally{await browser.close();}}
JS
```
