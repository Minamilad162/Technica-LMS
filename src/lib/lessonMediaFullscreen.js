/**
 * P19 Media Shield uses the SAME existing assessment browser heuristics and
 * native fullscreen primitive; neither detects real OS screenshots or DRM.
 */
import {isMobileWebContext,isPotentialCaptureShortcut} from './contentProtection.js';
import {isNativeFullscreenAvailable,isFullscreenActive,requestQuestionFullscreen}
 from './questionFullscreen.js';

export {isPotentialCaptureShortcut,requestQuestionFullscreen};
export const PROTECTED_MEDIA_NOTICE='PROTECTED LEARNING CONTENT';
export const MEDIA_URL_REFRESH_MS=95000; // Before P14's 120-second signed read expiry.

export function isMobileMediaBrowser(win){
 if(!win)return false;
 return isMobileWebContext({
  pointerCoarse:win.matchMedia?.('(pointer: coarse)')?.matches===true,
  touchPoints:win.navigator?.maxTouchPoints||0,
  viewportWidth:win.innerWidth||1024,
  userAgent:win.navigator?.userAgent||''
 });
}
export function mediaFullscreenPolicy(doc,element,win){
 if(isNativeFullscreenAvailable(doc,element))return 'required';
 // Some mobile browsers (notably iPhone Safari) lack Element fullscreen.
 // Allow a visibly labeled inline fallback; private P14 tokens remain required.
 return isMobileMediaBrowser(win)?'mobile-fallback':'unsupported';
}
export function canRenderAuthorizedMedia({phase,inlineFallback,doc,element}={}){
 if(phase!=='active'||doc?.visibilityState==='hidden')return false;
 if(inlineFallback===true)return true;
 return !!element&&isFullscreenActive(doc,element);
}
export function shouldShieldMediaOnBlur({mobile=false,activeTag='',visibility='visible'}={}){
 // PDF iframe focus and iOS soft keyboards generate legitimate blur.
 return !mobile&&visibility==='visible'&&activeTag!=='iframe';
}
export function isGuardedMediaShortcut(event){
 const key=String(event?.key||'').toLowerCase();
 return isPotentialCaptureShortcut(event)||
  ((event?.ctrlKey||event?.metaKey)&&['p','s'].includes(key));
}
