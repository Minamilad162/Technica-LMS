// P44 Build Your Own user choices. All constraints are revalidated on
// protected server RPCs; this client module is UI validation only.
export const DEFAULT_BUILD_YOUR_OWN=Object.freeze({
 count:50,timerMode:'whole',totalMinutes:90,secondsPerQuestion:90,
 feedbackTiming:'end',difficulty:'mixed',camera:false,domainId:''
});
export const BUILD_COUNTS=Object.freeze([10,25,50,100]);
export const BUILD_DIFFICULTIES=Object.freeze(['mixed','low','medium','high','adaptive']);
export const BUILD_TIMER_MODES=Object.freeze(['none','whole','question','both']);
export function prepareBuildYourOwn(value){
 const config={...DEFAULT_BUILD_YOUR_OWN,...value};
 const count=Number(config.count),totalMinutes=Number(config.totalMinutes);
 const questionSeconds=Number(config.secondsPerQuestion);
 if(!Number.isInteger(count)||count<1||count>100)
  throw Error('Choose a question count from 1 to 100.');
 if(!BUILD_DIFFICULTIES.includes(config.difficulty))
  throw Error('Choose a supported difficulty level.');
 if(!BUILD_TIMER_MODES.includes(config.timerMode))
  throw Error('Choose a valid timing mode.');
 if(!['each','end'].includes(config.feedbackTiming))
  throw Error('Choose when to show answers.');
 if(typeof config.camera!=='boolean')
  throw Error('Camera preference must be explicit.');
 const totalOn=['whole','both'].includes(config.timerMode);
 const eachOn=['question','both'].includes(config.timerMode);
 if(totalOn&&(!Number.isInteger(totalMinutes)||totalMinutes<1||totalMinutes>300))
  throw Error('Choose a total test time between 1 and 300 minutes.');
 if(eachOn&&(!Number.isInteger(questionSeconds)||questionSeconds<10||questionSeconds>600))
  throw Error('Choose 10 to 600 seconds for each question.');
 return {count,durationSeconds:totalOn?totalMinutes*60:0,
  perQuestionSeconds:eachOn?questionSeconds:0,
  difficulty:config.difficulty,feedbackTiming:config.feedbackTiming,
  camera:config.camera,domainId:config.domainId||null};
}
export const remainingQuestionSeconds=(attempt,now=Date.now())=>{
 if(!attempt?.questionDeadlineAt)return null;
 const fakeAttempt={...attempt,deadlineAt:attempt.questionDeadlineAt};
 const server=Date.parse(attempt.serverNow||''),deadline=Date.parse(attempt.questionDeadlineAt||'');
 if(!Number.isFinite(server)||!Number.isFinite(deadline))return null;
 return Math.max(0,Math.ceil((deadline-server-(now-(attempt.observedAtEpoch??now)))/1000));
};
