// When VIRTUAL_SERVER=1 the production build is served to the browser through request interception (scripts/virtual-server.mjs),
// for sandboxes that forbid listening sockets. The only Chromium that launches there runs single-process and cannot open a second
// context, so each test gets its own browser. API-only checks that need a real server skip themselves in that mode.
import {test as base} from '@playwright/test';
import {install} from '../../scripts/virtual-server.mjs';
export const virtual=process.env.VIRTUAL_SERVER==='1';
export const test=base.extend({
 context:async({browser,playwright,browserName,launchOptions,contextOptions},provide)=>{
  if(!virtual){await provide(await browser.newContext(contextOptions));return;}
  const own=await playwright[browserName].launch(launchOptions);const context=await own.newContext(contextOptions);await install(context);
  await provide(context);await context.close().catch(()=>{});await own.close().catch(()=>{});
 },
});
export {expect} from '@playwright/test';
