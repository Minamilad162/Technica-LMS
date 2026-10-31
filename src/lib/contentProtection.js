/**
 * Best-effort browser-only content deterrence.
 * Not a security boundary: native screenshots, screen recording, DevTools,
 * browser extensions, network extraction and a second camera remain possible.
 * Future production identity should use the authenticated server session.
 */
export const PROTECTION_HOLD_MS=1250;
export const WATERMARK_POSITIONS=9;
const SESSION_KEY='technica-content-watermark-session-v1';
export function isEditableElement(el){
 return !!el?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]');
}
export function shouldBlockContentEvent(target,container){
 return !!container?.contains?.(target)&&!isEditableElement(target);
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
