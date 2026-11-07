import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 PROTECTED_MEDIA_NOTICE,MEDIA_URL_REFRESH_MS,mediaFullscreenPolicy,
 isMobileMediaBrowser,canRenderAuthorizedMedia,shouldShieldMediaOnBlur,
 isGuardedMediaShortcut,requestQuestionFullscreen
} from '../src/lib/lessonMediaFullscreen.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.equal(PROTECTED_MEDIA_NOTICE,'PROTECTED LEARNING CONTENT');
assert(MEDIA_URL_REFRESH_MS<120000&&MEDIA_URL_REFRESH_MS>60000);
const doc={fullscreenEnabled:true,visibilityState:'visible',fullscreenElement:null};
const element={ownerDocument:doc,requestFullscreen:async()=>{doc.fullscreenElement=element;}};
doc.documentElement=element;
const desktop={innerWidth:1440,navigator:{maxTouchPoints:0,userAgent:'Mozilla desktop'},
 matchMedia:()=>({matches:false})};
const mobile={innerWidth:390,navigator:{maxTouchPoints:5,userAgent:'Mozilla/5.0 (iPhone)'},
 matchMedia:()=>({matches:true})};
assert.equal(mediaFullscreenPolicy(doc,element,desktop),'required');
assert.equal(isMobileMediaBrowser(desktop),false);
assert.equal(isMobileMediaBrowser(mobile),true);
assert.deepEqual(await requestQuestionFullscreen(element),{ok:true,reason:'entered'});
assert.equal(canRenderAuthorizedMedia({phase:'active',doc,element}),true);
doc.fullscreenElement=null;
assert.equal(canRenderAuthorizedMedia({phase:'active',doc,element}),false);
assert.equal(canRenderAuthorizedMedia({phase:'blocked',doc,element}),false);
assert.equal(canRenderAuthorizedMedia({phase:'opening',doc,element}),false);
assert.equal(canRenderAuthorizedMedia({phase:'idle',doc,element}),false);
doc.visibilityState='hidden';
assert.equal(canRenderAuthorizedMedia({phase:'active',inlineFallback:true,doc,element}),false,
 'Hidden tab cannot show protected media even on mobile fallback');
doc.visibilityState='visible';
assert.equal(canRenderAuthorizedMedia({phase:'active',inlineFallback:true,doc,element}),true);
assert.equal(mediaFullscreenPolicy({...doc,fullscreenEnabled:false},element,mobile),'mobile-fallback');
assert.equal(mediaFullscreenPolicy({...doc,fullscreenEnabled:false},element,desktop),'unsupported');
assert.equal(shouldShieldMediaOnBlur({mobile:true,visibility:'visible'}),false);
assert.equal(shouldShieldMediaOnBlur({mobile:false,activeTag:'iframe'}),false,
 'Native PDF iframe focus cannot accidentally close viewer');
assert.equal(shouldShieldMediaOnBlur({mobile:false,activeTag:'body'}),true);
assert.equal(shouldShieldMediaOnBlur({mobile:false,activeTag:'body',visibility:'hidden'}),false);
for(const event of [{key:'PrintScreen'},{key:'s',ctrlKey:true},{key:'p',metaKey:true},
 {key:'5',metaKey:true,shiftKey:true}])
 assert(isGuardedMediaShortcut(event),'Capture/print key missing '+JSON.stringify(event));
assert(!isGuardedMediaShortcut({key:'Space'}));
const view=read('src/production/ProtectedLessonViewer.jsx');
const parent=read('src/production/SecureLessonMedia.jsx');
const css=read('src/production/protectedLessonViewer.css');
const api=read('src/production/lessonMediaApi.js');
const source=read('src/lib/lessonMediaFullscreen.js');
for(const marker of [
 'requestQuestionFullscreen(node)','if(policy===\'unsupported\')',
 "policy==='mobile-fallback'", "document.visibilityState==='hidden'",
 "'fullscreenchange'","'visibilitychange'","'beforeprint'","'pagehide'",
 "'keydown'","'keyup'",'isGuardedMediaShortcut(e)',"privacyCurtain('fullscreen-exit')",
 "privacyCurtain('tab-hidden')","privacyCurtain('focus-loss')",
 "privacyCurtain('capture-shortcut')","privacyCurtain('print-request')",
 "v.pause()","v.removeAttribute('src')","pdf.current.src='about:blank'",
 "setUrl('')","authorizeLessonMedia(db,lessonId,block)",
 "if(alive&&active.current&&isValidForPlayback())setUrl(payload.url)",
 "role={phase==='blocked'?'alert':'status'}",
 'onContextMenu={e=>e.preventDefault()}','disablePictureInPicture',
 'disableRemotePlayback','controlsList="nodownload noplaybackrate noremoteplayback"',
 'ViewerWatermark','<iframe','onClick={enter}','onClick={close}'
]) assert(view.includes(marker),'Missing P19 guard: '+marker);
assert(view.indexOf('const permission=policy')<view.indexOf('const result=await permission'),
 'Full-screen request must be called before any awaited operation');
assert(view.includes('tc-has-protected-media'));
assert(view.includes('MEDIA_URL_REFRESH_MS'));
assert(view.includes("inline.current=policy==='mobile-fallback'||!result.ok"),
 'Native fullscreen rejection on mobile needs labeled inline fallback');
assert(view.includes('if(phase!==\'active\'||!isValidForPlayback())'),
 'Secure signed URLs must not be fetched outside protected active state');
assert(!parent.includes('ProtectedMediaFrame'),'Legacy unguarded auto-fetch player must be removed');
assert(parent.includes('<ProtectedLessonViewer'));
assert(!parent.includes('authorizeLessonMedia('),'No unguarded media authorization');
assert(api.includes("action:'view'")&&api.includes("LESSON_BUCKET='technica-private-lessons'"));
assert(!api.includes('.getPublicUrl('),'Protected media must never use public URL');
assert(source.includes("import {isMobileWebContext,isPotentialCaptureShortcut}"),
 'Reuse Assessment protection heuristics');
assert(source.includes("import {isNativeFullscreenAvailable,isFullscreenActive,requestQuestionFullscreen}"),
 'Reuse Assessment fullscreen primitive');
assert(css.includes('PROTECTED')||css.includes('slm-screen-curtain'));
assert(css.includes('html.tc-has-protected-media #root'));
assert(css.includes('@media(max-width:650px)'));
assert(css.includes('slm-protected-viewer:fullscreen'));
assert(read('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 77. P19-M — Protected Course Media Screen'));
console.log('PASS P19: shared assessment heuristics, click-native-fullscreen, desktop lock, iPhone fallback, signed URLs only while allowed, instant blackout, pause/unmount, print/keyboard/visibility behavior.');
console.log('NOT PROVEN/NOT POSSIBLE from browser: interception of every native screenshot, screen recording or signed media extraction; legacy PDF iframe still exposes browser PDF controls.');
