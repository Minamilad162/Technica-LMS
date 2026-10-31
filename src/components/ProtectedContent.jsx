import React,{useEffect,useMemo,useRef,useState}from'react';
import{createPortal}from'react-dom';
import {getAuthSession} from '../lib/demoAuth';
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
export default function ProtectedContent({as:Tag='div',className='',kind='questions',children}){
 const ref=useRef(null),timeout=useRef(null),shieldRef=useRef(null);
 const keyShield=useRef(false),focusShield=useRef(false);
 const enabledFocusShield=shouldFocusShield(kind);
 const[minute,setMinute]=useState(()=>new Date());
 const[sessionId]=useState(getContentProtectionSession);
 const identity=watermarkIdentity(getAuthSession());
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
  el.hidden=!visible;
  el.dataset.reason=focusShield.current?'focus-loss':keyShield.current?'keyboard-shortcut':'none';
 };
 const cloak=()=>{
  keyShield.current=true;
  syncCurtain();
  if(timeout.current)clearTimeout(timeout.current);
  timeout.current=setTimeout(()=>{
   keyShield.current=false;
   syncCurtain();
   timeout.current=null;
  },PROTECTION_HOLD_MS);
 };
 useEffect(()=>{
  activeProtectedContainers++;
  document.documentElement.classList.add('tc-has-protected-content');
  const onBeforePrint=()=>document.documentElement.classList.add('tc-print-in-progress');
  const onAfterPrint=()=>document.documentElement.classList.remove('tc-print-in-progress');
  const onClipboard=e=>{
   if(shouldBlockClipboardEvent(e,ref.current,window.getSelection(),document.activeElement)){
    if(e.cancelable)e.preventDefault();
    e.clipboardData?.clearData?.();
    e.stopImmediatePropagation?.();
   }
  };
  const onCaptureKey=e=>{
   if(isPotentialCaptureShortcut(e)){
    // Keydown and keyup are both tried because some browsers only deliver
    // one. Many OS-native capture tools deliver NEITHER; never claim protection.
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
   document.documentElement.classList.remove('tc-print-in-progress');
   activeProtectedContainers=Math.max(0,activeProtectedContainers-1);
   if(activeProtectedContainers===0)document.documentElement.classList.remove('tc-has-protected-content');
   if(timeout.current)clearTimeout(timeout.current);
   keyShield.current=false;focusShield.current=false;
  };
 },[enabledFocusShield,kind]);
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
 return <>
  <Tag className={['tc-protected-content',className].filter(Boolean).join(' ')}
   data-protected-kind={kind} ref={ref}
   onCopyCapture={block} onCutCapture={block}
   onContextMenuCapture={block} onDragStartCapture={block}
   >
   {children}
   <div className="tc-watermark-layer" data-watermark={identity} aria-hidden="true">
    {Array.from({length:WATERMARK_POSITIONS},(_,i)=>
      <span key={i} className="tc-watermark-cell">{label}</span>)}
   </div>
  </Tag>
  {createPortal(<div ref={shieldRef} hidden className="tc-capture-curtain" data-capture-curtain="browser-best-effort" data-reason="none" aria-hidden="true">
   <span>PROTECTED LEARNING CONTENT</span>
  </div>,document.body)}
 </>;
}
