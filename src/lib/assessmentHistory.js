/** Assessment-only, user-scoped demo history. No fabricated attempts.
 * ASP workbook question references keep browser storage small even with repeat attempts.
 * For production, move this data behind authenticated Supabase tables and RLS.
 */
export const DEMO_LEARNER_ID = 'demo-learner';

export function archiveAssessment(result, learnerId = DEMO_LEARNER_ID) {
  if (!result || result.kind !== 'assessment') return null;
  const questions = Array.isArray(result.questions) ? result.questions : [];
  return {
    id: result.id || `attempt-${result.submittedAt || Date.now()}-${result.courseId || 'asp'}-${result.attempt || 1}`,
    kind: 'assessment', learnerId, courseId: result.courseId || 'asp',
    courseName: result.courseName || 'ASP Course', attempt: result.attempt || 1,
    submittedAt: result.submittedAt, timeTaken: result.timeTaken,
    passMark: result.passMark ?? 70,
    answers: {...(result.answers || {})}, flags: [...(result.flags || [])],
    questionRefs: questions.map(q=>({id:q.id, bankId:q.bankId || null})),
    questionSnapshots: questions.filter(q=>!q.bankId || String(q.bankId).startsWith('custom-')),
  };
}

export function hydrateAssessment(record, bank = []) {
  if (!record || record.kind !== 'assessment') return null;
  if (Array.isArray(record.questions) && record.questions.length) return record;
  const byBankId = new Map(bank.map(q=>[q.bankId,q]));
  const snapshots = new Map((record.questionSnapshots || []).map(q=>[q.id,q]));
  const questions = (record.questionRefs || []).map(ref=>{
    const q = snapshots.get(ref.id) || byBankId.get(ref.bankId);
    return q ? {...q,id:ref.id} : {
      id:ref.id,bankId:ref.bankId,topic:'Archived question',prompt:'This question is not available in the current demo bank.',
      options:[],correct:-1,explanation:'The original question bank is not available.',reference:'Unavailable'
    };
  });
  return {...record,questions};
}

export function assessmentHistoryForUser(state, learnerId = DEMO_LEARNER_ID, bank = []) {
  // Old v1.9.2 stored only lastResult; allow its migration solely for the original demo account.
  const records = (state?.assessmentHistory || []).filter(r=>r?.kind === 'assessment' && (r.learnerId || DEMO_LEARNER_ID) === learnerId);
  const old = state?.lastResult;
  if (learnerId === (old?.learnerId || DEMO_LEARNER_ID) && old?.kind === 'assessment') {
    const exists = records.some(r=>r.courseId === (old.courseId || 'asp') && r.submittedAt === old.submittedAt && (r.attempt||1)===(old.attempt||1));
    if(!exists)records.push(archiveAssessment(old,learnerId));
  }
  return records.map(r=>hydrateAssessment(r,bank)).filter(Boolean)
    .sort((a,b)=>String(b.submittedAt||'').localeCompare(String(a.submittedAt||'')) || (b.attempt||0)-(a.attempt||0));
}

export function groupAssessmentHistory(records) {
  const map=new Map();
  for(const r of records){
    const id=r.courseId||'asp';
    if(!map.has(id))map.set(id,{courseId:id,courseName:r.courseName||id,attempts:[]});
    map.get(id).attempts.push(r);
  }
  return [...map.values()];
}
