/**
 * Fullscreen is an exam UX condition on supported browsers, NOT screenshot DRM.
 * requestFullscreen must be called synchronously from the user's Start click,
 * before any await, network call, notification or navigation.
 */
export function isNativeFullscreenAvailable(doc, element=doc?.documentElement) {
 return !!element && typeof element.requestFullscreen==='function' &&
   doc?.fullscreenEnabled!==false;
}
export function isFullscreenActive(doc,element=doc?.documentElement) {
 return !!element && doc?.fullscreenElement===element;
}
export async function requestQuestionFullscreen(element,doc=element?.ownerDocument) {
 if(!isNativeFullscreenAvailable(doc,element)){
  return {ok:false,reason:'unsupported'};
 }
 try{
  if(!isFullscreenActive(doc,element)){
   await element.requestFullscreen({navigationUI:'hide'});
  }
  return isFullscreenActive(doc,element)
   ?{ok:true,reason:'entered'}
   :{ok:false,reason:'denied'};
 }catch{
  return {ok:false,reason:'denied'};
 }
}
export async function leaveQuestionFullscreen(doc) {
 if(doc?.fullscreenElement&&typeof doc.exitFullscreen==='function'){
  try{await doc.exitFullscreen();}catch{}
 }
}
export function fullscreenStartError(result) {
 return result?.reason==='unsupported'
 ?'This browser cannot open protected questions in true fullscreen. Use a supported desktop browser, Android Chrome or supported iPad browser. On iPhone, fullscreen for a normal webpage is not available.'
 :'Fullscreen permission was denied or interrupted. Allow fullscreen and tap Start again; the questions have not opened.';
}
