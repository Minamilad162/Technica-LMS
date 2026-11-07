/**
 * P19 Media Shield uses the SAME existing assessment browser heuristics and
 * native fullscreen primitive; neither detects real OS screenshots or DRM.
 */
import {isMobileWebContext,isPotentialCaptureShortcut} from './contentProtection.js';
import {isNativeFullscreenAvailable,requestQuestionFullscreen}
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
export function mediaFullscreenPolicy(doc,element){
 // Fullscreen is an optional viewing preference, not a prerequisite to access.
 return isNativeFullscreenAvailable(doc,element)?'optional':'inline';
}
export function canRenderAuthorizedMedia({phase,doc}={}){
 // P14/P15 server-side authorization is always required for a real URL.
 return phase==='ready'&&doc?.visibilityState!=='hidden';
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
