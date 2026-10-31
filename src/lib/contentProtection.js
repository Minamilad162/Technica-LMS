/**
 * Best-effort browser-only content deterrence.
 * Not a security boundary: native screenshots, screen recording, DevTools,
 * browser extensions, network extraction and a second camera remain possible.
 * Future production identity should use the authenticated server session.
 */
export const PROTECTION_HOLD_MS=1250;
export const WATERMARK_POSITIONS=9;
/** Use lost-focus blackout only for exam question surfaces, not iframe video. */
export function shouldFocusShield(kind){
 return kind==='exam-question'||kind==='lesson-quiz';
}

/**
 * Mobile on-screen keyboards can emit window.blur without backgrounding a tab.
 * Avoid treating that as capture. The signal is intentionally conservative:
 * real native phone screenshots have NO standard web callback.
 */
export function isMobileWebContext({pointerCoarse=false,touchPoints=0,viewportWidth=1024,userAgent=''}={}){
 return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) ||
  (pointerCoarse && touchPoints>0 && viewportWidth<=1280);
}
export function shouldBlackoutForBlur(kind,mobile){
 return shouldFocusShield(kind)&&!mobile;
}
export function shouldBlackoutForVisibility(kind,visibilityState){
 return shouldFocusShield(kind)&&visibilityState==='hidden';
}

const SESSION_KEY='technica-content-watermark-session-v1';
export function isEditableElement(el){
 return !!el?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]');
}
export function shouldBlockContentEvent(target,container){
 return !!container?.contains?.(target)&&!isEditableElement(target);
}
/**
 * Some browsers send native copy events to document/body or the currently
 * focused control, not the element containing the selected question text.
 * Check the actual Selection range, not only event.target.
 */
export function selectionTouchesProtected(selection,container){
 if(!selection||!container||selection.isCollapsed)return false;
 if(container.contains(selection.anchorNode)||container.contains(selection.focusNode))return true;
 try{
  for(let i=0;i<selection.rangeCount;i++){
   if(selection.getRangeAt(i).intersectsNode(container))return true;
  }
 }catch{}
 return false;
}
export function shouldBlockClipboardEvent(event,container,selection,activeElement){
 if(selectionTouchesProtected(selection,container))return true;
 if(isEditableElement(activeElement)||isEditableElement(event?.target))return false;
 return shouldBlockContentEvent(event?.target,container);
}

export function isPotentialCaptureShortcut(event){
 if(!event||event.repeat)return false;
 const key=String(event.key||'').toLowerCase();
 const code=String(event.code||'').toLowerCase();
 const print=key==='printscreen'||code==='printscreen'||Number(event.keyCode)===44;
 const macCapture=!!event.metaKey&&!!event.shiftKey&&['3','4','5'].includes(key);
 const winSnip=!!event.metaKey&&!!event.shiftKey&&key==='s';
 return print||macCapture||winSnip;
}
export function getContentProtectionSession(){
 try{
  let value=sessionStorage.getItem(SESSION_KEY);
  if(value&&/^[A-Z0-9]{6,12}$/.test(value))return value;
  if(globalThis.crypto?.getRandomValues){
   const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);
   value=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
  }else value=(Math.random().toString(36).slice(2,12)).toUpperCase().padEnd(8,'0').slice(0,12);
  sessionStorage.setItem(SESSION_KEY,value);
  return value;
 }catch{return 'SESSION'}
}
export function watermarkIdentity(session){
 const value=String(session?.employeeId||session?.id||'LEARNER').trim().replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24);
 return value||'LEARNER';
}
export function formatWatermarkLabel({identity,sessionId,time}){
 const date=time instanceof Date?time:new Date(time);
 const dateStr=Number.isFinite(date.getTime())?date.toISOString().slice(0,16).replace('T',' '):'';
 return 'TECHNICA · '+identity+' · '+sessionId+' · '+dateStr+' UTC';
}
