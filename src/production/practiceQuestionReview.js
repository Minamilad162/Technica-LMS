// Server-trusted review state for Practice navigation.
// Never infer correctness from chosen answer or bundled question content.
export function practiceQuestionOutcome({question,feedback=null,feedbackTiming='end',finished=false}={}){
 if(!question||question.selectedIndex===null||question.selectedIndex===undefined)return null;
 if(!finished&&feedbackTiming!=='each')return null;
 const review=finished?question:feedback;
 if(typeof review?.correctIndex!=='number')return null;
 return question.selectedIndex===review.correctIndex?'correct':'incorrect';
}
