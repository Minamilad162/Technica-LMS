import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROTECTED_MEDIA_NOTICE,mediaFullscreenPolicy,canRenderAuthorizedMedia,
 isMobileMediaBrowser,shouldShieldMediaOnBlur,isGuardedMediaShortcut,
 requestQuestionFullscreen} from '../src/lib/lessonMediaFullscreen.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.equal(PROTECTED_MEDIA_NOTICE,'PROTECTED LEARNING CONTENT');
const doc={fullscreenEnabled:true,visibilityState:'visible',fullscreenElement:null};
const el={ownerDocument:doc,requestFullscreen:async()=>{doc.fullscreenElement=el;}};
doc.documentElement=el;
const desktop={innerWidth:1400,navigator:{maxTouchPoints:0,userAgent:'Mozilla desktop'},matchMedia:()=>({matches:false})};
const mobile={innerWidth:390,navigator:{maxTouchPoints:5,userAgent:'Mozilla/5.0 (iPhone)'},matchMedia:()=>({matches:true})};
assert.equal(mediaFullscreenPolicy(doc,el,'video'),'required');
assert.equal(mediaFullscreenPolicy({...doc,fullscreenEnabled:false},el,'video'),'blocked');
assert.equal(mediaFullscreenPolicy({...doc,fullscreenEnabled:false},el,'video'),'blocked');
assert.equal(mediaFullscreenPolicy(doc,el,'pdf'),'optional');
assert.equal(isMobileMediaBrowser(desktop),false);
assert.equal(isMobileMediaBrowser(mobile),true);
assert.equal(canRenderAuthorizedMedia({phase:'ready',doc,element:el}),true,
 'Inline Lesson media must NOT require fullscreen');
assert.equal(canRenderAuthorizedMedia({phase:'shielded',doc,element:el}),false);
assert.equal(canRenderAuthorizedMedia({phase:'idle',doc,element:el}),false);
assert.equal(canRenderAuthorizedMedia({phase:'opening',doc,element:el}),false);
doc.visibilityState='hidden';
assert.equal(canRenderAuthorizedMedia({phase:'ready',doc}),false);
doc.visibilityState='visible';
assert.deepEqual(await requestQuestionFullscreen(el),{ok:true,reason:'entered'});
assert.equal(shouldShieldMediaOnBlur({mobile:true,visibility:'visible'}),false);
assert.equal(shouldShieldMediaOnBlur({mobile:false,activeTag:'iframe'}),false);
assert.equal(shouldShieldMediaOnBlur({mobile:false,activeTag:'body'}),true);
for(const event of [{key:'PrintScreen'},{key:'s',ctrlKey:true},{key:'p',metaKey:true},
 {key:'5',metaKey:true,shiftKey:true}])assert(isGuardedMediaShortcut(event));
assert(!isGuardedMediaShortcut({key:'Space'}));
const v=read('src/production/ProtectedLessonViewer.jsx');
const parent=read('src/production/SecureLessonMedia.jsx');
const css=read('src/production/protectedLessonViewer.css');
const api=read('src/production/lessonMediaApi.js');
const helper=read('src/lib/lessonMediaFullscreen.js');
assert(v.includes("const [state,setState]=useState('ready')"),'Viewer starts inline, not in idle poster');
assert(v.includes("new IntersectionObserver(entries=>"),'Defer media signing until near viewport');
assert(v.includes("rootMargin:'450px 0px'"));
assert(v.includes("authorizeLessonMedia(db,lessonId,block)"));
assert(v.indexOf("authorizeLessonMedia(db,lessonId,block)")>v.indexOf("if(!nearViewport||state!=='ready'||document.visibilityState==='hidden')"));
assert(!v.includes('Open Protected Video')&&!v.includes('onClick={enter}'),
 'No forced open-protected button');
assert(v.includes("Fullscreen (optional)")&&v.includes("onClick={toggleFullscreen}"),
 'PDF retains optional fullscreen; video is gated at Play');
assert(v.includes('requestQuestionFullscreen(element)'), 'Optional native Fullscreen preserved');
assert(v.includes("conceal('tab-hidden')")&&v.includes("conceal('focus-loss')"));
assert(v.includes("conceal('capture-shortcut')")&&v.includes("conceal('print-request')"));
assert(v.includes("v.currentTime")===false||v.includes("video.current.currentTime"));
assert(v.includes("video.current.pause();video.current.removeAttribute('src');video.current.load()"));
assert(v.includes("pdf.current.src='about:blank'"));
assert(v.includes("role={state==='shielded'?'alert':'status'}"));
assert(v.includes("window.addEventListener('focus',onFocus)"));
assert(v.includes("window.addEventListener('blur',onBlur)"));
assert(v.includes("window.addEventListener('keydown',onShortcut,true)"));
assert(v.includes("doc.addEventListener('visibilitychange',onVisibility)"));
assert(v.includes("window.addEventListener('beforeprint',onPrint)"));
assert(v.includes("setState('ready');setRetry(n=>n+1)"),
 'Resume must request a fresh P14 token without a start-button gate');
assert(v.includes('ViewerWatermark')&&v.includes('disablePictureInPicture')&&v.includes('disableRemotePlayback'));
assert(v.includes('controlsList="nodownload noplaybackrate noremoteplayback"'));
assert(v.includes('<iframe')&&v.includes('referrerPolicy="no-referrer"'));
assert(v.includes('mediaPrintUsers++')&&v.includes("classList.add('tc-has-protected-media')"));
assert(parent.includes('<ProtectedLessonViewer')&&!parent.includes('ProtectedMediaFrame'));
assert(api.includes("action:'view'")&&api.includes("LESSON_BUCKET='technica-private-lessons'"));
assert(!api.includes('.getPublicUrl('));
assert(helper.includes("import {isMobileWebContext,isPotentialCaptureShortcut}"),'Reuse assessment shortcut helper');
assert(helper.includes("import {isNativeFullscreenAvailable,requestQuestionFullscreen}"),'Reuse native fullscreen helper');
assert(css.includes('slm-screen-curtain')&&css.includes('html.tc-has-protected-media #root'));
assert(css.includes('slm-shield-resume')&&css.includes('@media(max-width:650px)'));
assert(read('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 78. P20 — Direct Lesson Media & Performance'));
console.log('PASS P20 media: authorized inline video/PDF without forced click, optional fullscreen, near-viewport signed reads, protected blackout and visible watermarks.');
console.log('LIMITATION: browsers cannot reliably detect OS screenshots or recordings. Native iframe PDF controls may remain available.');
