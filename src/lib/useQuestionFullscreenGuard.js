import {useEffect,useRef} from 'react';
import {leaveQuestionFullscreen,isFullscreenActive} from './questionFullscreen';

/**
 * A fullscreen exit closes the current question surface immediately.
 * The caller MUST also invalidate its attempt on the server where available.
 * This cannot detect screenshots nor prove a learner is not recording.
 */
export function useQuestionFullscreenGuard({active,targetRef,requireFullscreen=true,onUnexpectedExit}) {
 const onExitRef=useRef(onUnexpectedExit);
 const intentionalRef=useRef(false);
 const exitingRef=useRef(false);
 onExitRef.current=onUnexpectedExit;
 useEffect(()=>{
  if(!active)return;
  intentionalRef.current=false;
  exitingRef.current=false;
  const doc=document;
  const target=targetRef?.current||doc.documentElement;
  const quit=reason=>{
   if(intentionalRef.current||exitingRef.current)return;
   exitingRef.current=true;
   // Hide question pixels synchronously before React completes navigation.
   doc.documentElement.classList.add('tc-quiz-exit-lock');
   onExitRef.current?.(reason);
  };
  const check=()=>{if(requireFullscreen&&!isFullscreenActive(doc,target))quit('fullscreen-exit');};
  const hidden=()=>{if(doc.visibilityState==='hidden')quit('tab-hidden');};
  const startHash=window.location.hash.split('?')[0];
  const locationChanged=()=>{if(window.location.hash.split('?')[0]!==startHash)quit('route-exit');};
  doc.addEventListener('fullscreenchange',check);
  doc.addEventListener('visibilitychange',hidden);
  window.addEventListener('hashchange',locationChanged);
  const userExit=()=>quit('exit-button');
  window.addEventListener('technica-quiz-leave',userExit);
  // Direct navigation/reload of an old question URL must not expose content
  // without a fresh user-initiated fullscreen permission.
  check();
  hidden();
  return()=>{
   doc.removeEventListener('fullscreenchange',check);
   doc.removeEventListener('visibilitychange',hidden);
   window.removeEventListener('hashchange',locationChanged);
   window.removeEventListener('technica-quiz-leave',userExit);
   doc.documentElement.classList.remove('tc-quiz-exit-lock');
  };
 },[active,targetRef,requireFullscreen]);
 const leaveIntentionally=()=>{
  intentionalRef.current=true;
  return leaveQuestionFullscreen(document);
 };
 return {leaveIntentionally};
}
