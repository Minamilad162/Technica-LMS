/* Real Chromium UI smoke. Run with npm ci + Playwright installed in isolated CI job.
 * Browser tests are not a proof of TI hardware equivalence. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';
const ROOT='http://127.0.0.1:4173';
const vite=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:['ignore','pipe','pipe'],env:{...process.env}});
let logs='';
for(const stream of [vite.stdout,vite.stderr])stream.on('data',chunk=>{logs+=String(chunk).slice(-1500)});
async function serverReady(){
 for(let i=0;i<90;i++){try{if((await fetch(ROOT)).ok)return}catch{}
  if(vite.exitCode!==null)throw Error('Vite quit: '+logs);
  await sleep(300);
 }
 throw Error('Vite did not start: '+logs);
}
async function demoLogin(page){
 await page.addInitScript(()=>{
  sessionStorage.setItem('technica-lms-demo-auth-session-v1',JSON.stringify({
   id:'demo-learner',name:'Alex Morgan',employeeId:'TC1001',
   email:'alex.demo@technica.example',role:'learner'
  }));
 });
}
const failures=[],passed=[];
async function check(name,fn){try{await fn();passed.push(name);console.log('PASS Browser:',name)}catch(e){failures.push(name+': '+e.message);console.error('FAIL Browser:',name,e.message)}}
let browser;
try{
 await serverReady();
 browser=await chromium.launch({headless:true});
 for(const device of [{name:'desktop',viewport:{width:1440,height:900},touch:false},{name:'mobile375',viewport:{width:375,height:812},touch:true},{name:'mobile390',viewport:{width:390,height:844},touch:true},{name:'mobile430',viewport:{width:430,height:932},touch:true}]){
  const context=await browser.newContext({viewport:device.viewport,hasTouch:device.touch,isMobile:device.touch});
  const page=await context.newPage(),exceptions=[];
  page.setDefaultTimeout(6500);
  page.on('pageerror',e=>exceptions.push(String(e)));
  await demoLogin(page);
  await check(device.name+' login and start practice',async()=>{
   await page.goto(ROOT+'/#/practice',{waitUntil:'domcontentloaded'});
   await page.locator('.start-practice').waitFor({timeout:12000});
   await page.locator('.start-practice').click();
   await page.locator('.quiz-page').waitFor({timeout:12000});
   assert.ok(await page.locator('.question-panel h1').count());
  });
  await check(device.name+' floating calculator opens without hiding quiz',async()=>{
   await page.locator('button.tc-calc-launch').click();
   await page.locator('.tc-calc-window').waitFor({state:'visible'});
   assert.ok(await page.locator('.answer-option').count()>1);
   assert.ok(await page.locator('.tc-calc-window').isVisible());
  });
  await check(device.name+' physical keypad matches reference layout without internal scrolling',async()=>{
   const keys=page.locator('.tc-calc-main-grid .tc-calc-physical-key');
   assert.equal(await keys.count(),35,'Expected seven rows of five scientific keys');
   const top=page.locator('.tc-calc-top-grid .tc-calc-physical-key');
   assert.equal(await top.count(),6,'Expected six upper functions around arrow pad');
   assert.ok(await page.locator('.tc-calc-direction-pad').isVisible());
   const order=await keys.evaluateAll(els=>els.map(el=>el.dataset.calcKey));
   assert.deepEqual(order.slice(0,5),['ln','fraction','ee','table','clear']);
   assert.deepEqual(order.slice(15,20),['square','7','8','9','subtract']);
   assert.deepEqual(order.slice(30,35),['on','0','dot','neg','enter']);
   const geometry=await page.locator('.tc-calc-body').evaluate(el=>({
     height:el.getBoundingClientRect().height,
     viewport:el.closest('.tc-calc-window').getBoundingClientRect().height,
     screen:window.innerHeight,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,
     keyHeight:el.querySelector('.tc-calc-keys').getBoundingClientRect().height,
     bodyBottom:el.getBoundingClientRect().bottom,
     winBottom:el.closest('.tc-calc-window').getBoundingClientRect().bottom
   }));
   assert.ok(geometry.scrollHeight-geometry.clientHeight<=4,'Calculator requires body scrolling: '+JSON.stringify(geometry));
   assert.ok(geometry.winBottom<=geometry.screen+2,'Calculator extends below visible viewport: '+JSON.stringify(geometry));
   const last=await page.locator('.tc-calc-main-grid [data-calc-key="enter"]').boundingBox();
   const win=await page.locator('.tc-calc-window').boundingBox();
   assert.ok(last.y+last.height<=win.y+win.height-2,'Last row clipped behind shell');
  });
  await check(device.name+' 2nd function layer and real menu controls',async()=>{
   await page.locator('.tc-calc-top-grid [data-calc-key="second"]').click();
   assert.ok(await page.locator('.tc-calc-top-grid [data-calc-key="second"]').getAttribute('aria-pressed')==='true');
   await page.locator('.tc-calc-top-grid [data-calc-key="prb"]').click();
   assert.ok(await page.locator('.tc-calc-menu-title').innerText().then(x=>x.includes('Angle')));
   await page.getByRole('button',{name:'Return to calculator keypad'}).click();
   await page.locator('.tc-calc-top-grid [data-calc-key="mode"]').click();
   assert.ok(await page.locator('.tc-calc-display-settings').isVisible());
   await page.getByRole('button',{name:'Return to calculator keypad'}).click();
   await page.locator('.tc-calc-top-grid [data-calc-key="data"]').click();
   assert.ok(await page.getByText('Data editor · L1 / L2 / L3').isVisible());
   await page.getByRole('button',{name:'Return to calculator keypad'}).click();
  });
  await check(device.name+' mathematical input and keyboard ENTER',async()=>{
   const input=page.locator('input.tc-math-field').first();
   await input.fill('2+3*4');
   await input.press('Enter');
   await page.waitForFunction(()=>document.querySelector('.tc-calc-display-result')?.textContent.trim()==='14');
   assert.equal((await page.locator('.tc-calc-display-result').innerText()).trim(),'14');
  });
  await check(device.name+' editable numerator and denominator',async()=>{
   await page.locator('button[data-calc-key="clear"]').click();
   await page.locator('.tc-math-template-tools button[title^="Insert fraction"]').click();
   const slots=page.locator('.tc-math-fraction input.tc-math-field');
   await slots.nth(0).fill('1');
   await slots.nth(1).fill('2');
   await slots.nth(1).press('Enter');
   const output=await page.locator('.tc-calc-display-result').innerText();
   assert.ok(output.includes('1')&&output.includes('2'), 'Fraction not rendered: '+output);
  });
  await check(device.name+' select quiz answer while calculator open',async()=>{
   const answer=page.locator('.answer-option').first();
   await answer.click();
   assert.ok((await answer.getAttribute('class')).includes('selected'));
   assert.ok(await page.locator('.tc-calc-window').isVisible());
  });
  await check(device.name+' question navigation preserves calculator',async()=>{
   const next=page.locator('.quiz-action-row button').last();
   await next.click();
   assert.ok(await page.locator('.tc-calc-window').isVisible());
   assert.ok((await page.locator('.quiz-status').innerText()).includes('Question 2'));
  });
  if(device.name==='desktop'){
   await check('desktop draggable header changes floating window position',async()=>{
    const win=page.locator('.tc-calc-window');
    const before=await win.boundingBox();
    const header=await page.locator('.tc-calc-window-header').boundingBox();
    const x=header.x+30,y=header.y+19;
    await page.mouse.move(x,y);await page.mouse.down();
    await page.mouse.move(x-60,y-55,{steps:6});await page.mouse.up();
    const after=await win.boundingBox();
    assert.ok(Math.abs(after.x-before.x)>8||Math.abs(after.y-before.y)>8,'Did not move');
   });
  }else await check('mobile calculator within viewport and tappable',async()=>{
   const box=await page.locator('.tc-calc-window').boundingBox();
   assert.ok(box.x>=0&&box.x+box.width<=device.viewport.width+1,'Horizontal overflow');
   assert.ok(box.y>=0&&box.y+box.height<=device.viewport.height+1,'Vertical overflow');
   assert.ok(await page.locator('.question-panel h1').isVisible(),'Question hidden');
  });
  await check(device.name+' close and reopen keeps calculator state',async()=>{
   await page.getByRole('button',{name:'Close calculator'}).click();
   assert.equal(await page.locator('.tc-calc-window').count(),0);
   await page.locator('button.tc-calc-launch').click();
   assert.ok(await page.locator('.tc-calc-window').isVisible());
  });
  await check(device.name+' no uncaught browser exceptions',async()=>assert.deepEqual(exceptions,[]));
  await context.close();
 }
 const ctx=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await ctx.newPage();
 page.setDefaultTimeout(6500);
 await demoLogin(page);
 await check('assessment route opens scientific calculator',async()=>{
   await page.goto(ROOT+'/#/assessments',{waitUntil:'domcontentloaded'});
   await page.locator('.assessment-start-button').waitFor({timeout:12000});
   await page.locator('label.checkbox-line input[type="checkbox"]').check();
   assert.equal(await page.locator('.assessment-start-button').isDisabled(),false,'Assessment start unexpectedly disabled');
   await page.locator('.assessment-start-button').click();
   await page.locator('.quiz-page').waitFor({timeout:10000});
   await page.locator('button.tc-calc-launch').click();
   assert.ok(await page.locator('.tc-calc-window').isVisible());
   assert.ok(await page.locator('.quiz-status').innerText().then(t=>t.includes('Assessment')));
 });
 await check('learning knowledge check opens scientific calculator',async()=>{
   await page.goto(ROOT+'/#/learning/process-safety-foundations',{waitUntil:'domcontentloaded'});
   await page.locator('.learn-outline-lesson').filter({hasText:'10-question knowledge check'}).first().click();
   await page.locator('.learn-quiz-content').waitFor({timeout:10000});
   await page.locator('button.tc-calc-launch').click();
   assert.ok(await page.locator('.tc-calc-window').isVisible());
   assert.ok(await page.locator('.learn-quiz-options button').count()>1);
 });
 await ctx.close();
}finally{
 if(browser)await browser.close();
 vite.kill('SIGTERM');
}
console.log('Browser checks:',passed.length,'PASS /',failures.length,'FAIL');
if(failures.length)throw Error('Browser audit failures:\n'+failures.join('\n'));
