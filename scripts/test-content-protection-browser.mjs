import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';
const ROOT='http://127.0.0.1:4175';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4175','--strictPort'],{stdio:['ignore','pipe','pipe']});
let output='';
for(const stream of [server.stdout,server.stderr])stream.on('data',b=>{output+=String(b).slice(-1200)});
async function ready(){
 for(let n=0;n<90;n++){
  try{if((await fetch(ROOT)).ok)return}catch{}
  if(server.exitCode!==null)throw Error('Vite stopped: '+output);
  await sleep(250);
 }
 throw Error('Vite readiness timeout: '+output);
}
const passed=[],failed=[];
async function check(name,fn){try{await fn();passed.push(name);console.log('PASS:',name)}catch(e){failed.push(name+' → '+e.message);console.log('FAIL:',name,e.message)}}
let browser;
try{
 await ready();
 browser=await chromium.launch({headless:true});
 for(const device of [{name:'desktop',width:1366,height:900,touch:false},{name:'mobile375',width:375,height:812,touch:true},{name:'mobile390',width:390,height:844,touch:true},{name:'mobile430',width:430,height:932,touch:true}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:device.touch,isMobile:device.touch});
  await context.addInitScript(()=>{
   sessionStorage.setItem('technica-lms-demo-auth-session-v1',
    JSON.stringify({id:'demo-learner',name:'Alex Morgan',employeeId:'TC1001',
      email:'alex.demo@technica.example',role:'learner'}));
  });
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  const page=await context.newPage(),errors=[];
  page.setDefaultTimeout(10000);
  page.on('pageerror',e=>errors.push(String(e)));
  await check(device.name+' practice opens',async()=>{
   await page.goto(ROOT+'/#/practice',{waitUntil:'domcontentloaded'});
   await page.locator('.start-practice').click();
   await page.locator('.question-panel h1').waitFor();
  });
  await check(device.name+' subtle watermark and learner-session label',async()=>{
   const protectedArea=page.locator('.question-panel.tc-protected-content');
   await protectedArea.waitFor();
   assert.equal(await protectedArea.locator('.tc-watermark-cell').count(),9);
   const label=await protectedArea.locator('.tc-watermark-cell').first().innerText();
   assert.ok(label.includes('TC1001')&&label.includes('TECHNICA')&&!label.includes('@'));
   const alpha=Number(await protectedArea.locator('.tc-watermark-layer').evaluate(el=>getComputedStyle(el).opacity));
   assert.ok(alpha>0&&alpha<=.11,'Watermark should be faint: '+alpha);
  });
  await check(device.name+' block protected copy/cut/context menu/drag only',async()=>{
   const state=await page.locator('.question-panel h1').evaluate(el=>{
    const result={};
    for(const type of ['copy','cut','contextmenu','dragstart','selectstart']){
     const event=new Event(type,{bubbles:true,cancelable:true});
     el.dispatchEvent(event);
     result[type]=event.defaultPrevented;
    }
    const outside=document.querySelector('.quiz-status strong');
    const external=new Event('copy',{bubbles:true,cancelable:true});
    outside.dispatchEvent(external);
    result.unprotected=external.defaultPrevented;
    return result;
   });
   for(const type of ['copy','cut','contextmenu','dragstart','selectstart'])
    assert.equal(state[type],true,'Expected protected '+type+' to be prevented');
   assert.equal(state.unprotected,false,'Unprotected workspace should still allow copying');
  });
  await check(device.name+' actual keyboard copy protects selected question (not outside UI)',async()=>{
   await page.evaluate(async()=>{
    await navigator.clipboard.writeText('ORIGINAL-CLIPBOARD');
    const node=document.querySelector('.question-panel h1');
    const selection=window.getSelection(),range=document.createRange();
    range.selectNodeContents(node);selection.removeAllRanges();selection.addRange(range);
   });
   await page.keyboard.press('Control+c');
   const blocked=await page.evaluate(()=>navigator.clipboard.readText());
   assert.equal(blocked,'ORIGINAL-CLIPBOARD','Question text leaked into native clipboard');
   // The browser may dispatch copy on document.body instead of selection node.
   const handled=await page.evaluate(()=>{
    const e=new Event('copy',{bubbles:true,cancelable:true});
    document.body.dispatchEvent(e);return e.defaultPrevented;
   });
   assert.equal(handled,true,'Document-root native copy should respect question selection');
   await page.evaluate(()=>{
    const selection=window.getSelection(),range=document.createRange();
    range.selectNodeContents(document.querySelector('.quiz-status strong'));
    selection.removeAllRanges();selection.addRange(range);
   });
   await page.keyboard.press('Control+c');
   const outside=await page.evaluate(()=>navigator.clipboard.readText());
   assert.notEqual(outside,'ORIGINAL-CLIPBOARD','Copying normal status text must stay allowed');
   await page.evaluate(()=>window.getSelection().removeAllRanges());
  });
  await check(device.name+' answer options remain clickable despite watermark',async()=>{
   const answer=page.locator('.answer-option').first();
   await answer.click();
   assert.ok((await answer.getAttribute('class')).includes('selected'));
   assert.equal(await page.locator('.question-panel .tc-watermark-layer').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
   await page.locator('button.tc-calc-launch').click();
   const mathInput=page.locator('.tc-calc-window input.tc-math-field').first();
   await mathInput.fill('3+2');
   const copyAllowed=await mathInput.evaluate(el=>{
    const event=new Event('copy',{bubbles:true,cancelable:true});
    el.dispatchEvent(event);
    return !event.defaultPrevented;
   });
   assert.equal(copyAllowed,true,'Calculator math field must not be blocked');
  });
  await check(device.name+' PrintScreen heuristic shows then clears curtain',async()=>{
   await page.evaluate(()=>{
    window.dispatchEvent(new KeyboardEvent('keydown',{key:'PrintScreen',code:'PrintScreen',bubbles:true,cancelable:true}));
   });
   const curtain=page.locator('.tc-capture-curtain');
   await curtain.waitFor({state:'visible'});
   const bg=await curtain.evaluate(el=>getComputedStyle(el).backgroundColor);
   assert.equal(bg,'rgb(3, 6, 11)');
   await curtain.waitFor({state:'hidden',timeout:3500});
   assert.ok(await page.locator('.answer-option').first().isVisible(),'Screen restored after keyboard attempt');
  });
  await check(device.name+' platform-appropriate focus handling',async()=>{
   const curtain=page.locator('.tc-capture-curtain');
   if(device.touch){
    // Mobile keyboard controls can blur the window without the tab being hidden.
    const editor=page.locator('.tc-calc-window input.tc-math-field').first();
    await editor.focus();
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    await page.waitForTimeout(85);
    assert.equal(await curtain.isVisible(),false,'Soft keyboard window blur must not black exam');
    await page.evaluate(()=>window.visualViewport?.dispatchEvent(new Event('resize')));
    assert.equal(await curtain.isVisible(),false,'Virtual keyboard resizing must not black exam');
    await editor.blur();
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    assert.equal(await curtain.isVisible(),false,'Soft keyboard dismissal must not black exam');
    await page.getByRole('button',{name:'Minimize calculator'}).click();
    assert.ok(await page.locator('.tc-calc-minimized').isVisible());
    assert.equal(await curtain.isVisible(),false,'Minimizing calculator must not blackout exam');
    await page.getByRole('button',{name:'Restore calculator'}).click();
    assert.equal(await curtain.isVisible(),false,'Restoring calculator must not blackout exam');
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   }else{
    // Preserve the desktop protection that already works for the user.
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    await curtain.waitFor({state:'visible'});
    assert.equal(await curtain.getAttribute('data-reason'),'focus-loss');
    assert.equal(await curtain.evaluate(el=>el.parentElement===document.body),true);
    const png=await page.screenshot();
    const pixel=await page.evaluate(async base64=>{
     const img=new Image();
     return await new Promise((resolve,reject)=>{
      img.onload=()=>{
       const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
       const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
       resolve(Array.from(ctx.getImageData(12,12,1,1).data));
      };
      img.onerror=reject;img.src='data:image/png;base64,'+base64;
     });
    },png.toString('base64'));
    assert.deepEqual(pixel.slice(0,3),[3,6,11],'Desktop black screenshot under active shield');
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await curtain.waitFor({state:'hidden'});
   }
   assert.ok(await page.locator('.question-panel h1').isVisible());
  });
  await check(device.name+' true background visibility still masks protected questions',async()=>{
   const curtain=page.locator('.tc-capture-curtain');
   try{
    await page.evaluate(()=>{
      Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await curtain.waitFor({state:'visible'});
    assert.equal(await curtain.getAttribute('data-reason'),'focus-loss');
   }finally{
    await page.evaluate(()=>{
      Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
      document.dispatchEvent(new Event('visibilitychange'));
      delete document.visibilityState;
      window.dispatchEvent(new Event('focus'));
    });
   }
   await curtain.waitFor({state:'hidden'});
  });
  await check(device.name+' PrintScreen keyup fallback shows a temporary black shield',async()=>{
   await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keyup',{key:'PrintScreen',code:'PrintScreen',bubbles:true,cancelable:true})));
   const curtain=page.locator('.tc-capture-curtain');
   await curtain.waitFor({state:'visible'});
   assert.equal(await curtain.getAttribute('data-reason'),'keyboard-shortcut');
   await curtain.waitFor({state:'hidden',timeout:3500});
  });
  await check(device.name+' browser print preview masks protected content',async()=>{
   await page.emulateMedia({media:'print'});
   const snapshot=await page.evaluate(()=>({
    rootDisplay:getComputedStyle(document.querySelector('#root')).display,
    warning:getComputedStyle(document.body,'::before').content,
    active:document.documentElement.classList.contains('tc-has-protected-content')
   }));
   assert.equal(snapshot.rootDisplay,'none','Protected route still included in print output');
   assert.ok(snapshot.active,'Document must carry print-protection scope');
   assert.ok(snapshot.warning.includes('PRINTING DISABLED'),snapshot.warning);
   await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
   assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('tc-print-in-progress')),true);
   await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
   assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('tc-print-in-progress')),false);
   // Exercise the actual Chromium print-to-PDF path, not merely CSS values.
   const protectedQuestion=(await page.locator('.question-panel h1').innerText()).trim().slice(0,28);
   const pdf=await page.pdf({format:'A4',printBackground:true});
   const extracted=spawnSync('pdftotext',['-','-'],{input:pdf,encoding:'utf8'});
   assert.equal(extracted.status,0,'pdftotext must be available for print audit: '+(extracted.stderr||''));
   assert.ok(extracted.stdout.includes('PROTECTED CONTENT'),'Printed PDF missing blocked-content notice');
   assert.ok(!extracted.stdout.includes(protectedQuestion),'Actual printable PDF leaked question text');
   await page.emulateMedia({media:'screen'});
  });
  await check(device.name+' video and lesson quiz watermark',async()=>{
   await page.goto(ROOT+'/#/learning/process-safety-foundations',{waitUntil:'domcontentloaded'});
   await page.locator('.learn-lesson-content.tc-protected-content').waitFor();
   assert.equal(await page.locator('.learn-lesson-content .tc-watermark-layer').count(),1);
   assert.ok(await page.locator('.learn-video-container iframe').count()>0);
   const stamp=page.locator('.learn-video-container .tc-video-stamp');
   assert.ok(await stamp.isVisible(),'Video needs its own visible watermark over iframe');
   assert.ok((await stamp.innerText()).includes('TC1001'));
   assert.equal(await stamp.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
   // Embedded videos can move focus to an iframe during normal playback.
   // The focus-loss screen must NOT interrupt them.
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   assert.equal(await page.locator('.tc-capture-curtain').isVisible(),false,'Video focus must not trigger exam shield');
   await page.evaluate(()=>window.dispatchEvent(new Event('focus')));

   if(device.touch)await page.locator('.learn-outline-toggle').click();
   await page.locator('.learn-outline-lesson').filter({hasText:'10-question knowledge check'}).first().click();
   await page.locator('.learn-quiz-content.tc-protected-content').waitFor();
   assert.ok(await page.locator('.learn-quiz-options button').count()>1);
   await page.locator('.learn-quiz-options button').first().click();
   assert.equal(await page.locator('.learn-quiz-options button.selected').count(),1);
  });
  await check(device.name+' no JavaScript crashes',async()=>assert.deepEqual(errors,[]));
  await context.close();
 }
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
console.log('Content protection browser checks:',passed.length,'PASS,',failed.length,'FAIL');
if(failed.length)throw Error(failed.join('\n'));
