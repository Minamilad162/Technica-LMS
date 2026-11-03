import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';
const ROOT='http://127.0.0.1:4191';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4191','--strictPort'],{stdio:['ignore','pipe','pipe']});
let logs='';
for(const stream of [server.stdout,server.stderr])stream.on('data',b=>logs+=String(b).slice(-900));
async function waitReady(){
 for(let n=0;n<90;n++){
  try{if((await fetch(ROOT)).ok)return}catch{}
  if(server.exitCode!==null)throw Error('Vite exited: '+logs);
  await sleep(200);
 }
 throw Error('Vite did not start: '+logs);
}
const account={id:'demo-learner',name:'Alex Morgan',employeeId:'TC1001',email:'alex.demo@technica.example',role:'learner'};
let browser;
try{
 await waitReady();
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 await context.addInitScript(value=>{
  sessionStorage.setItem('technica-lms-demo-auth-session-v1',JSON.stringify(value));
 },account);
 const page=await context.newPage();page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(ROOT+'/#/practice');
 await page.locator('.practice-mode-card.quick10').waitFor();
 assert.equal(await page.evaluate(()=>document.fullscreenEnabled),true,'Chromium must support native fullscreen for this test');
 await page.locator('.practice-mode-card.quick10').click();
 await page.locator('.question-panel h1').waitFor();
 assert.equal(await page.evaluate(()=>document.fullscreenElement===document.documentElement),true,'Start must enter native fullscreen');
 console.log('PASS practice start opened true browser fullscreen');
 await page.keyboard.press('Escape');
 // Chromium headless may not route Escape to the native fullscreen controller.
 // If so, request the same fullscreen exit through the browser API; this tests
 // the actual fullscreenchange behavior, not a fake custom DOM event.
 if(await page.evaluate(()=>!!document.fullscreenElement)){
  await page.evaluate(()=>document.exitFullscreen());
 }
 await page.waitForFunction(()=>document.fullscreenElement===null);
 await page.waitForURL(/#\/practice$/);
 assert.equal(await page.locator('.question-panel h1').count(),0,'Esc must remove question panel');
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('technica-lms-demo-v1-asp5')));
 assert.equal(state.practiceSession,null,'Esc must discard active practice session');
 console.log('PASS browser fullscreen exit dismissed questions, discarded session and returned to setup (native Escape requires manual desktop QA)');
 await page.locator('.practice-mode-card.quick10').click();
 await page.locator('.question-panel h1').waitFor();
 assert.equal(await page.evaluate(()=>!!document.fullscreenElement),true);
 await page.getByRole('button',{name:/Exit/i}).first().click();
 await page.waitForURL(/#\/practice$/);
 await page.waitForFunction(()=>document.fullscreenElement===null);
 assert.equal(await page.locator('.question-panel').count(),0);
 console.log('PASS explicit Exit also returns to setup and exits fullscreen');
 await page.goto(ROOT+'/#/assessments');
 const accept=page.locator('input[type="checkbox"]').last();
 await accept.check();
 const start=page.locator('.assessment-start-button');
 assert.equal(await start.isEnabled(),true,'ASP demo assessment expected enabled');
 await start.click();
 await page.locator('.question-panel h1').waitFor();
 assert.equal(await page.evaluate(()=>!!document.fullscreenElement),true);
 await page.evaluate(()=>document.exitFullscreen());
 await page.waitForURL(/#\/assessments$/);
 const state2=await page.evaluate(()=>JSON.parse(localStorage.getItem('technica-lms-demo-v1-asp5')));
 assert.equal(state2.assessmentSession,null,'fullscreenchange must abort assessment');
 console.log('PASS assessment fullscreenchange aborts active attempt and returns to setup');
 assert.deepEqual(errors,[],'JavaScript runtime errors');
 await context.close();
}finally{await browser?.close();server.kill('SIGTERM');}
console.log('PASS fullscreen session browser regression');
