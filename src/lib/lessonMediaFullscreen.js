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
export function mediaFullscreenPolicy(doc,element,kind='video'){
 // P70: only video playback requires browser-controlled fullscreen.
 // PDF/reading remain inline and do not claim screenshot-proof rendering.
 if(kind!=='video')return isNativeFullscreenAvailable(doc,element)?'optional':'inline';
 return isNativeFullscreenAvailable(doc,element)?'required':'blocked';
}
export function canPlayVideoInFullscreen(doc,element){
 return !!element && doc?.fullscreenElement===element && doc?.visibilityState!=='hidden';
}
export function canRenderAuthorizedMedia({phase,doc,element,kind='pdf'}={}){
 // Rendering PDFs inline is still allowed. Video playback is separately gated.
 return phase==='ready'&&doc?.visibilityState!=='hidden'&&
   (kind!=='video'||canPlayVideoInFullscreen(doc,element));
}
export function videoFullscreenError(result){
 return result?.reason==='unsupported'
  ?'This browser cannot open protected video in true fullscreen. Use a supported desktop browser, Android Chrome or supported iPad browser; iPhone browsers may not support this full-lesson fullscreen mode.'
  :'Fullscreen was denied or interrupted. Allow fullscreen and tap Play again. Video will not play inline.';
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
