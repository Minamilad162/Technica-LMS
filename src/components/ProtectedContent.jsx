import React,{useCallback,useEffect,useMemo,useRef,useState}from'react';
import {getAuthSession} from '../lib/demoAuth';
import {
 PROTECTION_HOLD_MS,WATERMARK_POSITIONS,formatWatermarkLabel,
 getContentProtectionSession,isPotentialCaptureShortcut,
 shouldBlockContentEvent,watermarkIdentity
}from'../lib/contentProtection';

/**
 * Browser-based deterrence for learner content, not screenshot/DRM enforcement.
 * Does NOT monitor other apps or detect actual screenshots/screen recordings.
 * Does NOT affect calculator input fields, navigation outside protected content,
 * browser accessibility focus or the surrounding LMS workspace.
 */
export default function ProtectedContent({as:Tag='div',className='',kind='questions',children}){
 const ref=useRef(null),timeout=useRef(null);
 const[covered,setCovered]=useState(false);
 const[minute,setMinute]=useState(()=>new Date());
 const[sessionId]=useState(getContentProtectionSession);
 const identity=watermarkIdentity(getAuthSession());
 const label=useMemo(()=>formatWatermarkLabel({identity,sessionId,time:minute}),[identity,sessionId,minute]);
 useEffect(()=>{
  const interval=setInterval(()=>setMinute(new Date()),60000);
  return()=>clearInterval(interval);
 },[]);
 const cloak=useCallback(()=>{
  setCovered(true);
  if(timeout.current)clearTimeout(timeout.current);
  timeout.current=setTimeout(()=>{setCovered(false);timeout.current=null},PROTECTION_HOLD_MS);
 },[]);
 useEffect(()=>{
  const onKeyDown=e=>{
   if(isPotentialCaptureShortcut(e)){
    // Browser/OS may process the screenshot BEFORE this event, or never send
    // the event. Blackout only occurs if the browser delivers the shortcut.
    if(e.cancelable)e.preventDefault();
    cloak();
   }
   if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='p'){
    if(e.cancelable)e.preventDefault();
    cloak();
   }
  };
  window.addEventListener('keydown',onKeyDown,true);
  return()=>{
   window.removeEventListener('keydown',onKeyDown,true);
   if(timeout.current)clearTimeout(timeout.current);
  };
 },[cloak]);
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
  {covered&&<div className="tc-capture-curtain" data-capture-curtain="keyboard-heuristic" role="status" aria-live="polite">
    <span>PROTECTED LEARNING CONTENT</span>
   </div>}
 </>;
}
