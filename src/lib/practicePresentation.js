import {isFullscreenActive,requestQuestionFullscreen} from './questionFullscreen.js';

export async function startPracticePresentation(element){
 const result=await requestQuestionFullscreen(element);
 if(result.reason==='unsupported'&&element?.isConnected){
  return {ok:true,mode:'focused'};
 }
 return {...result,mode:'fullscreen'};
}

export function isPracticePresentationActive(element,mode){
 if(!element?.isConnected||element.ownerDocument.visibilityState==='hidden')return false;
 return mode==='focused'||isFullscreenActive(element.ownerDocument,element);
}
