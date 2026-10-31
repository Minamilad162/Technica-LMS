import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';
const ROOT='http://127.0.0.1:4181';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4181','--strictPort'],{stdio:['ignore','pipe','pipe']});
let output='';
for(const stream of [server.stdout,server.stderr])stream.on('data',b=>{output+=String(b).slice(-1200)});
async function ready(){
 for(let n=0;n<90;n++){
  try{if((await fetch(ROOT)).ok)return}catch{}
  if(server.exitCode!==null)throw Error('Vite stopped: '+output);
  await sleep(250);
 }
 throw Error('Vite startup timeout: '+output);
}
const passed=[],failed=[];
async function check(name,fn){try{await fn();passed.push(name);console.log('PASS:',name)}catch(e){failed.push(name+' → '+e.message);console.log('FAIL:',name,e.message)}}
const account={id:'demo-learner',name:'Alex Morgan',employeeId:'TC1001',email:'alex.demo@technica.example',role:'learner'};
let browser;
try{
 await ready();
 browser=await chromium.launch({headless:true});
 for(const device of [{name:'desktop',width:1366,height:900,touch:false},{name:'mobile390',width:390,height:844,touch:true}]){
  async function session(seed={}){
   const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:device.touch,isMobile:device.touch});
   await context.addInitScript(value=>{
    sessionStorage.setItem('technica-lms-demo-auth-session-v1',JSON.stringify(value.account));
    localStorage.setItem('technica-lms-demo-v1-asp5',JSON.stringify(value.seed));
   },{account,seed});
   const page=await context.newPage();page.setDefaultTimeout(8000);
   await page.goto(ROOT+'/#/practice',{waitUntil:'domcontentloaded'});
   await page.locator('.practice-mode-grid').waitFor();
   return {context,page};
  }
  await check(device.name+' all quick modes shown with honest availability',async()=>{
   const{context,page}=await session();
   try{
    const cards=page.locator('.practice-mode-card');
    assert.equal(await cards.count(),8);
    const names=await cards.locator('.practice-mode-copy strong').allInnerTexts();
    assert.deepEqual(names,['Quick 10','Timed Quiz','Practice by Domain','Weakest Subject','Missed Questions','Build Your Own','Level Up','Mock Exam']);
    assert.equal(await page.locator('.practice-mode-card.levelup').isDisabled(),true);
    assert.equal(await page.locator('.practice-mode-card.mock').isDisabled(),true);
    assert.equal(await page.locator('.practice-mode-card.weakest').isDisabled(),true);
    assert.equal(await page.locator('.practice-mode-card.missed').isDisabled(),true);
    assert.ok(await page.getByText('Customize practice').isVisible());
   }finally{await context.close()}
  });
  await check(device.name+' Quick 10 launches exact untimed practice and immediate feedback',async()=>{
   const{context,page}=await session();
   try{
    await page.locator('.practice-mode-card.quick10').click();
    await page.waitForURL('**/practice/session');
    assert.match(await page.locator('.quiz-status').innerText(),/Quick 10.*Question 1 of 10/s);
    assert.match(await page.locator('.timer-badge').innerText(),/Untimed/);
    await page.locator('.answer-option').first().click();
    assert.ok(await page.locator('.instant-feedback').isVisible(),'Quick 10 shows immediate answer feedback');
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('technica-lms-demo-v1-asp5')));
    assert.equal(stored.practiceSession.practiceMode,'quick10');
    assert.equal(stored.practiceSession.questionSet.length,10);
   }finally{await context.close()}
  });
  await check(device.name+' Timed Quiz launches 25 questions with 20-minute timer',async()=>{
   const{context,page}=await session();
   try{
    await page.locator('.practice-mode-card.timed').click();
    await page.waitForURL('**/practice/session');
    assert.match(await page.locator('.quiz-status').innerText(),/Timed Quiz.*Question 1 of 25/s);
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('technica-lms-demo-v1-asp5')));
    assert.equal(stored.practiceSession.durationSeconds,1200);
    assert.equal(stored.practiceSession.feedbackMode,'end');
    assert.equal(await page.locator('.instant-feedback').count(),0);
   }finally{await context.close()}
  });
  await check(device.name+' Practice by Domain respects selected course domain',async()=>{
   const{context,page}=await session();
   try{
    await page.locator('.practice-mode-card.domain').click();
    await page.locator('#practice-quick-domain').selectOption('domain3');
    await page.getByRole('button',{name:'Start domain practice'}).click();
    await page.waitForURL('**/practice/session');
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('technica-lms-demo-v1-asp5')));
    assert.equal(stored.practiceSession.questionSet.length,25);
    assert.ok(stored.practiceSession.questionSet.every(q=>q.domainId==='domain3'));
    assert.equal(stored.practiceSession.practiceMode,'domain');
   }finally{await context.close()}
  });
  await check(device.name+' custom practice remains independent and editable',async()=>{
   const{context,page}=await session();
   try{
    await page.locator('.practice-mode-card.custom').click();
    await page.getByRole('button',{name:'25',exact:true}).first().click();
    await page.locator('.start-practice').click();
    await page.waitForURL('**/practice/session');
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('technica-lms-demo-v1-asp5')));
    assert.equal(stored.practiceSession.questionSet.length,25);
    assert.equal(stored.practiceSession.practiceMode,'custom');
    assert.equal(stored.questionCount,25);
   }finally{await context.close()}
  });
  await check(device.name+' missed and weakest modes use real last-attempt data',async()=>{
   const seed={lastResult:{
    courseId:'asp',kind:'practice',questions:[
     {id:1,bankId:'D1-0001',domainId:'domain1',correct:0},
     {id:2,bankId:'D1-0002',domainId:'domain1',correct:1},
     {id:3,bankId:'D2-0001',domainId:'domain2',correct:0}
    ],answers:{1:2,2:3,3:0}
   }};
   const miss=await session(seed);
   try{
    assert.equal(await miss.page.locator('.practice-mode-card.missed').isDisabled(),false);
    assert.equal(await miss.page.locator('.practice-mode-card.weakest').isDisabled(),false);
    await miss.page.locator('.practice-mode-card.missed').click();
    await miss.page.waitForURL('**/practice/session');
    const stored=await miss.page.evaluate(()=>JSON.parse(localStorage.getItem('technica-lms-demo-v1-asp5')));
    assert.deepEqual(stored.practiceSession.questionSet.map(q=>q.bankId).sort(),['D1-0001','D1-0002']);
   }finally{await miss.context.close()}
   const weak=await session(seed);
   try{
    await weak.page.locator('.practice-mode-card.weakest').click();
    await weak.page.waitForURL('**/practice/session');
    const stored=await weak.page.evaluate(()=>JSON.parse(localStorage.getItem('technica-lms-demo-v1-asp5')));
    assert.ok(stored.practiceSession.questionSet.every(q=>q.domainId==='domain1'));
    assert.equal(stored.practiceSession.practiceMode,'weakest');
   }finally{await weak.context.close()}
  });
 }
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
console.log('Practice modes browser checks:',passed.length,'PASS,',failed.length,'FAIL');
if(failed.length)throw Error(failed.join('\n'));
