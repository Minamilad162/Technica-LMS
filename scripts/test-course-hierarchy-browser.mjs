import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';

const ROOT='http://127.0.0.1:4182';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4182','--strictPort'],{stdio:['ignore','pipe','pipe']});
let output='';
for(const stream of [server.stdout,server.stderr]) stream.on('data',b=>{output+=String(b).slice(-1500);});
async function ready(){for(let n=0;n<90;n++){try{if((await fetch(ROOT)).ok)return}catch{}if(server.exitCode!==null)throw Error('Vite stopped: '+output);await sleep(250);}throw Error('Vite startup timeout: '+output);}
const account={id:'demo-admin',name:'Technica Admin',employeeId:'TC9001',email:'admin.demo@technica.example',role:'admin'};
let browser;
const passed=[],failed=[];
async function test(name,fn){try{await fn();passed.push(name);console.log('PASS',name)}catch(error){failed.push(name+': '+error.message);console.log('FAIL',name,error.stack)}}
try{
 await ready();browser=await chromium.launch({headless:true});
 for(const device of [{name:'desktop',width:1366,height:900,touch:false},{name:'mobile390',width:390,height:844,touch:true}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:device.touch,isMobile:device.touch});
  await context.addInitScript(account=>{
   sessionStorage.setItem('technica-lms-demo-auth-session-v1',JSON.stringify(account));
   localStorage.setItem('technica-lms-demo-v1-asp5',JSON.stringify({role:'admin'}));
  },account);
  const page=await context.newPage();page.setDefaultTimeout(8000);
  await test(device.name+' create nested hierarchy, isolate other course and persist',async()=>{
   await page.goto(ROOT+'/#/builder?courseId=asp',{waitUntil:'domcontentloaded'});
   await page.locator('.hierarchy-editor').waitFor();
   assert.match(await page.locator('.hierarchy-editor').innerText(),/Learning structure/);
   assert.match(await page.locator('.hierarchy-editor').innerText(),/Unmapped legacy content/);
   await page.getByRole('button',{name:'Add domain',exact:true}).click();
   await page.getByRole('dialog').getByRole('textbox').fill('Safety Domain');
   await page.getByRole('dialog').getByRole('button',{name:'Save',exact:true}).click();
   await page.getByRole('button',{name:'Add topic to Safety Domain'}).click();
   await page.getByRole('dialog').getByRole('textbox').fill('Risk Assessment');
   await page.getByRole('dialog').getByRole('button',{name:'Save',exact:true}).click();
   await page.getByRole('button',{name:'Add lesson'}).last().click();
   await page.getByRole('dialog').getByRole('textbox').first().fill('Hazard controls');
   await page.getByRole('dialog').getByRole('button',{name:'Save lesson'}).click();
   assert.match(await page.locator('.hierarchy-editor').innerText(),/Hazard controls/);
   let data=await page.evaluate(()=>JSON.parse(localStorage.getItem('technica-lms-demo-v1-asp5')));
   assert.equal(data.courseHierarchies.asp.length,2);
   assert.equal(data.courseHierarchies.asp[1].topics[0].lessons[0].title,'Hazard controls');
   assert.equal(data.modules[0].title,'PSM Foundations');
   assert.equal(data.courseModules?.psee,undefined);
   const savedIds=data.courseHierarchies.asp[1].topics[0].lessons[0].id;
   await page.reload();
   await page.locator('.hierarchy-editor').waitFor();
   data=await page.evaluate(()=>JSON.parse(localStorage.getItem('technica-lms-demo-v1-asp5')));
   assert.equal(data.courseHierarchies.asp[1].topics[0].lessons[0].id,savedIds);
   assert.match(await page.locator('.hierarchy-editor').innerText(),/Hazard controls/);
   await page.goto(ROOT+'/#/builder?courseId=psee');
   await page.locator('.hierarchy-editor').waitFor();
   assert.equal(await page.locator('.hierarchy-editor .hierarchy-domain').count(),0);
   const overflow=await page.evaluate(()=>{const el=document.querySelector('.hierarchy-editor');return el.scrollWidth-el.clientWidth;});
   assert.ok(overflow<3,'hierarchy editor has horizontal overflow: '+overflow);
  });
  await context.close();
 }
}finally{await browser?.close();server.kill('SIGTERM');}
console.log('Hierarchy browser checks:',passed.length,'PASS,',failed.length,'FAIL');
if(failed.length)throw Error(failed.join('\n'));
