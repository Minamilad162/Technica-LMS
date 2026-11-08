// P30 pure staged edits. No network requests until Save All Changes is clicked.
// Keep the server-side P29 and immutable P9B gates as the final authority.
export const BANK_DIFFICULTIES=['unclassified','low','medium','high'];
export function originalQuestionValues(q){
 return {isActive:q.isActive===true,mockCandidate:q.mockCandidate===true,
  difficulty:q.difficulty||'unclassified',addLessonId:''};
}
export function canStageQuestion(q,field,value,current){
 if(typeof q.isActive!=='boolean'||typeof q.mockCandidate!=='boolean')
  throw Error('P29 Question Bank controls are not installed on this database.');
 if(q.mockExclusive||q.approvalState==='archived')
  throw Error('Official reserved or archived questions cannot be edited here.');
 const next={...originalQuestionValues(q),...(current?.next||{})};
 if(field==='difficulty'){
  if(!BANK_DIFFICULTIES.includes(value))throw Error('Choose an available Difficulty.');
  if(q.approvalState!=='draft'&&value!==q.difficulty)
   throw Error('Approved question difficulty requires independent review.');
 }
 if(field==='mockCandidate'&&value===true){
  if(q.approvalState!=='draft'||q.linkedCount>0)
   throw Error('Mock Exam candidates must be unused Draft questions not linked to Lessons.');
  if(!next.isActive)throw Error('Enable this question before selecting it for Mock Exam.');
 }
 if(field==='addLessonId'&&value){
  if(!next.isActive||next.mockCandidate)
   throw Error('Only Active non-Mock questions can be added to Lesson Quizzes.');
  if((q.linkedLessonIds||[]).includes(value))throw Error('Question already belongs to that Lesson Quiz.');
 }
 return next;
}
export function stagedQuestionEdit(q,current,field,value){
 const next=canStageQuestion(q,field,value,current);
 next[field]=value;
 if(field==='isActive'&&value===false)next.mockCandidate=false;
 const base=originalQuestionValues(q);
 const changed=Object.keys(base).some(k=>next[k]!==base[k]);
 if(!changed)return null;
 return {base:{isActive:base.isActive,mockCandidate:base.mockCandidate,
   difficulty:base.difficulty,approvalState:q.approvalState},
  next};
}
export function stagedToBatch(changes){
 return Object.entries(changes).map(([questionId,patch])=>({
  questionId,
  expectedActive:patch.base.isActive,
  expectedMockCandidate:patch.base.mockCandidate,
  expectedDifficulty:patch.base.difficulty,
  expectedApprovalState:patch.base.approvalState,
  isActive:patch.next.isActive,
  mockCandidate:patch.next.mockCandidate,
  difficulty:patch.next.difficulty,
  addLessonId:patch.next.addLessonId||null
 }));
}
