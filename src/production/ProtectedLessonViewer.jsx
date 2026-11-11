import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AlertTriangle,FileText,LockKeyhole,Maximize,Minimize,RotateCcw,
 ShieldCheck} from 'lucide-react';
import {authorizeLessonMedia} from './lessonMediaApi.js';
import {videoPlaybackErrorMessage} from './videoPlaybackDiagnostics.js';
import {PROTECTED_MEDIA_NOTICE,isGuardedMediaShortcut,isMobileMediaBrowser,
 requestQuestionFullscreen,shouldShieldMediaOnBlur} from '../lib/lessonMediaFullscreen.js';
import {formatWatermarkLabel,getContentProtectionSession,mediaWatermarkTiles,watermarkIdentity} from '../lib/contentProtection.js';
import './protectedLessonViewer.css';

// Authorized Lessons display INLINE without an additional Open/Fullscreen gate.
// Native fullscreen is an optional player control, not access authorization.
// Browser events cannot detect all OS screenshots/recordings.
function ViewerWatermark({identity}){
 const [time,setTime]=useState(()=>new Date());
 const [sessionId]=useState(getContentProtectionSession);
 useEffect(()=>{const timer=setInterval(()=>setTime(new Date()),45000);return()=>clearInterval(timer);},[]);
 const label=formatWatermarkLabel({identity:watermarkIdentity(identity),sessionId,time});
 const positions=mediaWatermarkTiles({sessionId,time});
 return <div className="slm-watermark" aria-hidden="true">
  {positions.map(({top,left},i)=><span key={i} style={{top:top+'%',left:left+'%'}}>{label}</span>)}
 </div>;
}
let mediaPrintUsers=0;
const privacyMessage={
 'tab-hidden':'Media was concealed while the learning tab was in the background.',
 'focus-loss':'Media was concealed while the window lost focus.',
 'capture-shortcut':'A protected-content shortcut was detected.',
 'print-request':'Printing protected learning material is not available.'
};
export default function ProtectedLessonViewer({db,lessonId,block,viewerId='',onWatched}){
 const shell=useRef(null),video=useRef(null),pdf=useRef(null),curtain=useRef(null);
 const mounted=useRef(true),active=useRef(false),currentSrc=useRef('');
 const shieldReason=useRef('');
 const lastTime=useRef(0),wasPlaying=useRef(false);
 const watched=useRef({last:null,seconds:new Set(),reported:false});
 const [state,setState]=useState('ready'),[url,setUrl]=useState(''),[error,setError]=useState('');
 const [reason,setReason]=useState(''),[nearViewport,setNearViewport]=useState(false);
 const [fullscreen,setFullscreen]=useState(false),[retry,setRetry]=useState(0);
 const [playing,setPlaying]=useState(false),[starting,setStarting]=useState(false);
 const [videoIssue,setVideoIssue]=useState('');
 const isVideo=block.block_type==='video',title=String(block.payload?.title||(isVideo?'Video':'PDF'));
 const conceal=useCallback(why=>{
  if(!active.current||!mounted.current)return;
  active.current=false;shieldReason.current=why;
  if(shell.current)shell.current.dataset.mediaShielded='true';
  if(curtain.current)curtain.current.hidden=false;
  if(video.current){
   try{
    lastTime.current=video.current.currentTime;
    wasPlaying.current=!video.current.paused;
    video.current.pause();video.current.removeAttribute('src');video.current.load();
   }catch{}
  }
  if(pdf.current){try{pdf.current.src='about:blank';}catch{}}
  currentSrc.current='';
  setPlaying(false);setStarting(false);setVideoIssue('');
  setUrl('');setReason(why);setState('shielded');
 },[]);
 const resume=useCallback(()=>{
  if(typeof document==='undefined'||document.visibilityState==='hidden')return;
  active.current=true;shieldReason.current='';
  if(shell.current)shell.current.dataset.mediaShielded='false';
  if(curtain.current)curtain.current.hidden=true;
  setError('');setVideoIssue('');setPlaying(false);setStarting(false);
  setReason('');setUrl('');setState('ready');setRetry(n=>n+1);
 },[]);
 useEffect(()=>{
  mounted.current=true;active.current=true;
  const element=shell.current;
  if(!element)return;
  if(typeof IntersectionObserver!=='function'){setNearViewport(true);return;}
  const observer=new IntersectionObserver(entries=>{
   if(entries[0]?.isIntersecting)setNearViewport(true);
  },{rootMargin:'450px 0px',threshold:0});
  observer.observe(element);
  return()=>observer.disconnect();
 },[lessonId,block.id]);
 useEffect(()=>{
  let live=true;
  setError('');
  if(!nearViewport||state!=='ready'||document.visibilityState==='hidden')return()=>{live=false;};
  active.current=true;
  authorizeLessonMedia(db,lessonId,block).then(payload=>{
   if(live&&active.current&&document.visibilityState!=='hidden'){
    currentSrc.current=payload.url;setUrl(payload.url);
   }
  }).catch(()=>{
   if(live&&active.current)setError('Media could not be authorized. Check your course access and retry.');
  });
  return()=>{live=false;};
 },[db,lessonId,block.id,nearViewport,state,retry]);
 useEffect(()=>{
  mounted.current=true;
  const doc=document,element=shell.current;
  const onVisibility=()=>{
   if(doc.visibilityState==='hidden')conceal('tab-hidden');
   else if(doc.visibilityState==='visible'&&doc.hasFocus()&&
     element?.dataset.mediaShielded==='true'&&shieldReason.current!=='capture-shortcut')resume();
  };
  const onFocus=()=>{if(doc.visibilityState==='visible'&&element?.dataset.mediaShielded==='true'&&
   shieldReason.current!=='capture-shortcut')resume();};
  const onBlur=()=>{
   if(shouldShieldMediaOnBlur({mobile:isMobileMediaBrowser(window),
    activeTag:String(doc.activeElement?.tagName||'').toLowerCase(),
    visibility:doc.visibilityState}))conceal('focus-loss');
  };
  const onShortcut=e=>{
   if(isGuardedMediaShortcut(e)){
    if(e.cancelable)e.preventDefault();
    conceal('capture-shortcut');
   }
  };
  const onPrint=()=>conceal('print-request');
  const onPageHide=()=>conceal('tab-hidden');
  const onLessonResume=e=>{
   if(e.detail?.lessonId===lessonId&&shieldReason.current==='capture-shortcut'&&
    element?.dataset.mediaShielded==='true')resume();
  };
  const onFullscreen=()=>setFullscreen(doc.fullscreenElement===element);
  doc.addEventListener('visibilitychange',onVisibility);
  doc.addEventListener('fullscreenchange',onFullscreen);
  window.addEventListener('focus',onFocus);
  window.addEventListener('blur',onBlur);
  window.addEventListener('keydown',onShortcut,true);
  window.addEventListener('keyup',onShortcut,true);
  window.addEventListener('beforeprint',onPrint);
  window.addEventListener('pagehide',onPageHide);
  window.addEventListener('technica:lesson-resume',onLessonResume);
  return()=>{
   mounted.current=false;active.current=false;
   doc.removeEventListener('visibilitychange',onVisibility);
   doc.removeEventListener('fullscreenchange',onFullscreen);
   window.removeEventListener('focus',onFocus);
   window.removeEventListener('blur',onBlur);
   window.removeEventListener('keydown',onShortcut,true);
   window.removeEventListener('keyup',onShortcut,true);
   window.removeEventListener('beforeprint',onPrint);
   window.removeEventListener('pagehide',onPageHide);
   window.removeEventListener('technica:lesson-resume',onLessonResume);
   if(doc.fullscreenElement===element)doc.exitFullscreen?.().catch?.(()=>{});
  };
 },[conceal,resume,lessonId]);
 useEffect(()=>{
  // Keep print protection active even while an immediate capture/print event
  // changes the viewer into its black privacy state.
  mediaPrintUsers++;
  document.documentElement.classList.add('tc-has-protected-media');
  return()=>{
   mediaPrintUsers=Math.max(0,mediaPrintUsers-1);
   if(!mediaPrintUsers)document.documentElement.classList.remove('tc-has-protected-media');
  };
 },[]);
 const toggleFullscreen=async()=>{
  const element=shell.current;
  if(!element)return;
  if(document.fullscreenElement===element){
   await document.exitFullscreen?.().catch?.(()=>{});return;
  }
  if(!element.requestFullscreen)return;
  const r=await requestQuestionFullscreen(element);
  if(!r.ok)setError('Fullscreen is unavailable in this browser; continue viewing inline.');
 };
 const remember=()=>{
  const v=video.current;
  if(v){lastTime.current=v.currentTime;wasPlaying.current=!v.paused;}
 };
 const trackWatched=()=>{
  remember();
  const v=video.current;if(!v||!Number.isFinite(v.currentTime))return;
  const data=watched.current,at=v.currentTime,previous=data.last;
  if(!v.paused&&!v.seeking&&previous!==null&&at>=previous&&at-previous<=2.5){
   for(let sec=Math.floor(previous);sec<Math.ceil(at);sec++)data.seconds.add(sec);
  }
  data.last=at;
 };
 const finishWatched=()=>{
  setPlaying(false);
  const v=video.current,data=watched.current;
  if(data.reported||!v||!Number.isFinite(v.duration)||v.duration<=0)return;
  const duration=Math.ceil(v.duration),fraction=data.seconds.size/Math.max(1,duration);
  // Seeking to the end cannot satisfy the watched-segment threshold.
  if(v.currentTime>=v.duration-1.25&&fraction>=.9){
   data.reported=true;onWatched?.();
  }
 };
 const restore=()=>{
  const v=video.current;if(!v||!lastTime.current)return;
  try{
   v.currentTime=lastTime.current;
   if(wasPlaying.current)v.play().catch(()=>{});
  }catch{}
 };
 const retryMedia=()=>{setError('');setVideoIssue('');setPlaying(false);setStarting(false);
  setUrl('');setRetry(n=>n+1);};
 const startVideo=()=>{
  const current=video.current;
  if(!current||starting||videoIssue)return;
  setStarting(true);
  // Run directly in the click gesture: browsers can reject delayed play().
  try{
   const attempt=current.play();
   if(attempt&&typeof attempt.catch==='function')attempt.catch(err=>{
    if(err?.name!=='AbortError')setVideoIssue('The browser could not start video playback. Check the video encoding or try again.');
    setStarting(false);
   });
  }catch{
   setStarting(false);
   setVideoIssue('The browser could not start video playback. Check the video encoding or try again.');
  }
 };
 const failedVideo=()=>{
  const code=video.current?.error?.code;
  setVideoIssue(videoPlaybackErrorMessage(code));
  setPlaying(false);setStarting(false);
 };
 const playingVideo=()=>{remember();setVideoIssue('');setPlaying(true);setStarting(false);};
 const pausedVideo=()=>{remember();setPlaying(false);setStarting(false);};
 return <section ref={shell} className="slm-protected-viewer slm-viewer-active"
  data-media-phase={state} data-media-kind={block.block_type}
  data-media-shielded={state==='shielded'?'true':'false'}
  aria-label={'Protected '+(isVideo?'video':'PDF')+' '+title}
  onCopy={e=>e.preventDefault()} onCut={e=>e.preventDefault()}
  onContextMenu={e=>e.preventDefault()} onDragStart={e=>e.preventDefault()}>
  <div className="slm-media-content" data-secure-media-content>
   {error?<div className="slm-media-loading" role="alert">
    <AlertTriangle size={18}/>{error}
    <button type="button" onClick={retryMedia}>Retry</button></div>:
    !url?<div className="slm-media-loading" role="status">
     <LockKeyhole size={18}/>{nearViewport?'Loading protected '+(isVideo?'video':'PDF')+'…':'Preparing protected lesson…'}</div>:
    isVideo?<video ref={video} key={url} src={url} controls playsInline preload="metadata"
      disablePictureInPicture disableRemotePlayback
      controlsList="nodownload noplaybackrate noremoteplayback"
      onTimeUpdate={trackWatched} onPlay={playingVideo} onPause={pausedVideo}
      onError={failedVideo} onEnded={finishWatched}
      onSeeking={()=>{watched.current.last=null;}}
      onLoadedMetadata={restore} onContextMenu={e=>e.preventDefault()}/>:
     <iframe ref={pdf} key={url} title={'Protected PDF '+title}
      src={url+'#toolbar=0&navpanes=0&scrollbar=1'} loading="eager" referrerPolicy="no-referrer"/>}
   {!!url&&<ViewerWatermark identity={viewerId}/>}
   {isVideo&&!!url&&!videoIssue&&!playing&&
    <div className="slm-video-start-overlay">
     <button type="button" className="slm-video-start-button" onClick={startVideo} disabled={starting}
      aria-label={starting?'Starting protected lesson video':'Play protected lesson video'}>
      <span className="slm-video-play-icon" aria-hidden="true">▶</span>
      <span>{starting?'Starting video…':'Play lesson'}</span>
     </button>
    </div>}
   {isVideo&&!!url&&videoIssue&&<div className="slm-video-error" role="alert">
    <AlertTriangle size={22} aria-hidden="true"/>
    <strong>Video playback unavailable</strong>
    <p>{videoIssue}</p>
    <button type="button" onClick={retryMedia}><RotateCcw size={15}/> Retry secure playback</button>
   </div>}
   <div className="slm-viewer-toolbar">
    <span><ShieldCheck size={14}/> Private Lesson · Watermarked</span>
    <button type="button" onClick={toggleFullscreen}
      aria-label={fullscreen?'Exit fullscreen':'View fullscreen (optional)'}>
      {fullscreen?<Minimize size={16}/>:<Maximize size={16}/>}
      {fullscreen?'Exit Fullscreen':'Fullscreen (optional)'}</button>
   </div>
  </div>
  <div ref={curtain} className="slm-screen-curtain" hidden={state!=='shielded'}
   role={state==='shielded'?'alert':'status'} aria-live="polite">
   <div className="slm-screen-core">
    <span className="slm-screen-title">{PROTECTED_MEDIA_NOTICE}</span>
    <p>{privacyMessage[reason]||'Protected content is concealed.'}</p>
    <button type="button" className="slm-shield-resume" onClick={resume}>
     <RotateCcw size={15}/> Resume lesson</button>
   </div>
  </div>
 </section>;
}
