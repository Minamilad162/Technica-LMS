import React,{useEffect,useLayoutEffect,useMemo,useRef,useState}from'react';
import {createPortal} from 'react-dom';
import {isGuardedMediaShortcut} from '../lib/lessonMediaFullscreen.js';
import '../contentProtection.css';
import {
 PROTECTION_HOLD_MS,WATERMARK_POSITIONS,formatWatermarkLabel,
 getContentProtectionSession,isPotentialCaptureShortcut,shouldFocusShield,
 isMobileWebContext,shouldBlackoutForBlur,shouldBlackoutForVisibility,
 shouldBlockContentEvent,shouldBlockClipboardEvent,selectionTouchesProtected,watermarkIdentity
}from'../lib/contentProtection';

/**
 * Browser-based deterrence for learner content, not screenshot/DRM enforcement.
 * Does NOT monitor other apps or detect actual screenshots/screen recordings.
 * Does NOT affect calculator input fields, navigation outside protected content,
 * browser accessibility focus or the surrounding LMS workspace.
 */
let activeProtectedContainers=0;
export default function LiveProtectedContent({as:Tag='div',className='',kind='questions',identity:identitySource,lessonId='',children}){
 const ref=useRef(null),timeout=useRef(null),shieldRef=useRef(null);
 const keyShield=useRef(false),focusShield=useRef(false);
 const [mockConcealed,setMockConcealed]=useState(false);
 const isMock=kind==='mock-exam-surface';
 const enabledFocusShield=shouldFocusShield(kind);
 // Keep exam captures shielded until the learner explicitly resumes in
 // fullscreen, just like the lesson curtain. Browser signals are best-effort.
 const manualCaptureResume=kind==='lesson-surface'||kind==='mock-exam-surface';
 const[minute,setMinute]=useState(()=>new Date());
 const[sessionId]=useState(getContentProtectionSession);
 const identity=watermarkIdentity(identitySource);
 const label=useMemo(()=>formatWatermarkLabel({identity,sessionId,time:minute}),[identity,sessionId,minute]);
 useEffect(()=>{
  const interval=setInterval(()=>setMinute(new Date()),60000);
  return()=>clearInterval(interval);
 },[]);
 // Change the pre-mounted curtain synchronously; React state commits can
 // happen too late for a key shortcut. Neither technique guarantees interception.
 const syncCurtain=()=>{
  const el=shieldRef.current;
  if(!el)return;
  const visible=keyShield.current||focusShield.current;
  // Like ProtectedLessonViewer.conceal(), first hide the actual sensitive
  // content synchronously via a DOM attribute. React then removes question
  // elements so the black curtain is not the only protective layer.
  if(isMock){
   if(ref.current)ref.current.dataset.mediaShielded=visible?'true':'false';
   setMockConcealed(previous=>previous===visible?previous:visible);
  }
  el.hidden=!visible;
  el.dataset.reason=focusShield.current?'focus-loss':keyShield.current?'keyboard-shortcut':'none';
 };
 const cloak=()=>{
  keyShield.current=true;
  syncCurtain();
  if(timeout.current)clearTimeout(timeout.current);
  // The full Lesson and full Mock Exam hold their black curtain until a
  // deliberate Resume; standalone Practice questions keep the short hold.
  if(manualCaptureResume){timeout.current=null;return;}
  timeout.current=setTimeout(()=>{
   keyShield.current=false;
   syncCurtain();
   timeout.current=null;
  },PROTECTION_HOLD_MS);
 };
 // Register scoped print/privacy listeners before first Lesson paint.
 // Native OS screenshot and recording are not intercepted by this web API.
 useLayoutEffect(()=>{
  activeProtectedContainers++;
  document.documentElement.classList.add('tc-has-protected-content');
  const onBeforePrint=()=>{
   document.documentElement.classList.add('tc-print-in-progress');
   // Match the video viewer: printing actively conceals Mock content rather
   // than depending solely on the browser's print-media styling.
   if(isMock)cloak();
  };
  const onAfterPrint=()=>document.documentElement.classList.remove('tc-print-in-progress');
  const onClipboard=e=>{
   if(shouldBlockClipboardEvent(e,ref.current,window.getSelection(),document.activeElement)){
    if(e.cancelable)e.preventDefault();
    e.clipboardData?.clearData?.();
    e.stopImmediatePropagation?.();
   }
  };
  const onCaptureKey=e=>{
   if(isMock?isGuardedMediaShortcut(e):isPotentialCaptureShortcut(e)){
    // Match video: capture-like shortcuts and Ctrl+P/Ctrl+S become a
    // persistent black Mock until explicit fullscreen-only Resume.
    // OS-native capture may deliver neither event: this is not DRM.
    if(e.cancelable)e.preventDefault();
    cloak();
   }
  };
  const onKeyDown=e=>{
   onCaptureKey(e);
   if((e.ctrlKey||e.metaKey)&&['c','x'].includes(String(e.key).toLowerCase())&&
      selectionTouchesProtected(window.getSelection(),ref.current)){
    if(e.cancelable)e.preventDefault();
   }
  };
  const isMobile=()=>isMobileWebContext({
   pointerCoarse:window.matchMedia?.('(pointer: coarse)')?.matches===true,
   touchPoints:navigator.maxTouchPoints||0,
   viewportWidth:window.innerWidth,
   userAgent:navigator.userAgent
  });
  const onBlur=()=>{
   // Mobile keyboard opening/dismissing and focusing calculator controls may
   // blur the window while the webpage is still fully visible. Never blackout
   // mobile on blur alone. Desktop retains the proven focus-loss behavior.
   if(!shouldBlackoutForBlur(kind,isMobile()))return;
   // Native PDF iframe focus is a legitimate blur, not a window switch.
   if(kind==='lesson-surface'&&String(document.activeElement?.tagName||'').toLowerCase()==='iframe')return;
   focusShield.current=true;
   syncCurtain();
  };
  const onFocus=()=>{
   if(document.visibilityState==='hidden')return;
   focusShield.current=false;
   syncCurtain();
  };
  const onVisibility=()=>{
   if(!enabledFocusShield)return;
   // Page Visibility is different from focus. This is privacy on genuine
   // backgrounding, NOT screenshot detection or prevention on mobile.
   focusShield.current=shouldBlackoutForVisibility(kind,document.visibilityState);
   syncCurtain();
  };
  const onViewportChange=()=>{
   // A soft keyboard can resize VisualViewport and move focus. Reset only
   // accidental stale shields while the browser is still in the foreground.
   if(isMobile()&&document.visibilityState==='visible'&&focusShield.current){
    focusShield.current=false;
    syncCurtain();
   }
  };
  const onPageHide=()=>{
   if(!isMock)return;
   focusShield.current=true;
   syncCurtain();
  };
  const onReturnPointer=()=>{
   // Mobile Safari occasionally skips focus when returning to an already
   // foregrounded tab. A real pointer action restores a legible screen.
   if(document.visibilityState==='visible'&&focusShield.current){
    focusShield.current=false;
    syncCurtain();
   }
  };
  document.addEventListener('copy',onClipboard,true);
  document.addEventListener('cut',onClipboard,true);
  window.addEventListener('keydown',onKeyDown,true);
  window.addEventListener('keyup',onCaptureKey,true);
  if(enabledFocusShield){
   window.addEventListener('blur',onBlur);
   window.addEventListener('focus',onFocus);
   window.addEventListener('pageshow',onFocus);
   document.addEventListener('visibilitychange',onVisibility);
   window.addEventListener('pointerdown',onReturnPointer,true);
   window.addEventListener('touchstart',onReturnPointer,true);
   window.visualViewport?.addEventListener('resize',onViewportChange);
  }
  window.addEventListener('beforeprint',onBeforePrint);
  window.addEventListener('afterprint',onAfterPrint);
  if(isMock)window.addEventListener('pagehide',onPageHide);
  return()=>{
   document.removeEventListener('copy',onClipboard,true);
   document.removeEventListener('cut',onClipboard,true);
   window.removeEventListener('keydown',onKeyDown,true);
   window.removeEventListener('keyup',onCaptureKey,true);
   if(enabledFocusShield){
    window.removeEventListener('blur',onBlur);
    window.removeEventListener('focus',onFocus);
    window.removeEventListener('pageshow',onFocus);
    document.removeEventListener('visibilitychange',onVisibility);
    window.removeEventListener('pointerdown',onReturnPointer,true);
    window.removeEventListener('touchstart',onReturnPointer,true);
    window.visualViewport?.removeEventListener('resize',onViewportChange);
   }
   window.removeEventListener('beforeprint',onBeforePrint);
   window.removeEventListener('afterprint',onAfterPrint);
   if(isMock)window.removeEventListener('pagehide',onPageHide);
   document.documentElement.classList.remove('tc-print-in-progress');
   activeProtectedContainers=Math.max(0,activeProtectedContainers-1);
   if(activeProtectedContainers===0)document.documentElement.classList.remove('tc-has-protected-content');
   if(timeout.current)clearTimeout(timeout.current);
   keyShield.current=false;focusShield.current=false;
  };
 },[enabledFocusShield,kind,isMock]);
 useEffect(()=>{
  const node=ref.current;
  if(!node)return;
  const onSelectStart=e=>{
   if(shouldBlockContentEvent(e.target,node)&&e.cancelable)e.preventDefault();
  };
  node.addEventListener('selectstart',onSelectStart,true);
  return()=>node.removeEventListener('selectstart',onSelectStart,true);
 },[]);
 const block=e=>{
  if(shouldBlockContentEvent(e.target,ref.current)){
   e.preventDefault();
   if(e.type==='copy'||e.type==='cut')e.clipboardData?.clearData?.();
  }
 };
 const resumeLesson=()=>{
  if(document.visibilityState==='hidden')return;
  // A Mock screen can only be revealed inside the required exam fullscreen.
  if(kind==='mock-exam-surface'&&!document.fullscreenElement?.contains(ref.current))return;
  keyShield.current=false;focusShield.current=false;
  if(timeout.current){clearTimeout(timeout.current);timeout.current=null;}
  syncCurtain();
  // Restore the *same* scoped private video/PDF viewer in one action. No
  // blanket media unlock; each viewer reauthorizes via the existing service.
  if(kind==='lesson-surface'&&lessonId){
   window.dispatchEvent(new CustomEvent('technica:lesson-resume',{detail:{lessonId}}));
  }
 };
 const shield=<div ref={shieldRef} hidden
   className={'tc-capture-curtain'+(kind==='lesson-surface'?' tc-lesson-curtain':
     kind==='mock-exam-surface'?' tc-mock-curtain':'')}
   data-capture-curtain="browser-best-effort" data-reason="none"
   aria-hidden={manualCaptureResume?undefined:'true'}
   role={manualCaptureResume?'alert':undefined}>
   <span>{kind==='mock-exam-surface'?'PROTECTED MOCK EXAM':'PROTECTED LEARNING CONTENT'}</span>
   {manualCaptureResume&&<button type="button" className="tc-lesson-resume" onClick={resumeLesson}>
    {kind==='mock-exam-surface'?'Resume exam':'Resume lesson'}</button>}
  </div>;
 return <>
  <Tag className={['tc-protected-content',className].filter(Boolean).join(' ')}
   data-protected-kind={kind}
   data-media-shielded={isMock?(mockConcealed?'true':'false'):undefined}
   ref={ref}
   onCopyCapture={block} onCutCapture={block}
   onContextMenuCapture={block} onDragStartCapture={block}
   >
   {isMock&&mockConcealed?null:children}
   <div className="tc-watermark-layer" data-watermark={identity} aria-hidden="true">
    {Array.from({length:WATERMARK_POSITIONS},(_,i)=>
      <span key={i} className="tc-watermark-cell">{label}</span>)}
   </div>
  </Tag>
  {kind==='lesson-surface'&&typeof document!=='undefined'
   ?createPortal(shield,document.body):shield}
 </>;
}
