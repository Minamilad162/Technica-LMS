// P9A ASP release preflight. Read-only authenticated Admin RPC ONLY.
// No browser query to protected lms_questions/reviews, no release action.
const safeCount=(value,label)=>{
 if(!Number.isSafeInteger(value)||value<0)
  throw new Error('Invalid release-preflight count: '+label);
 return value;
};
const FIELDS=['total','draft','reviewedReadyDraft','needsHumanReview',
 'eligibleCandidates','candidateLow','candidateMedium','candidateHigh',
 'approved','approvedWithClassificationGaps','mockReserved',
 'mockReservedReviewed','officialDomainCount'];

export function validateAspReleasePreflight(data,expectedCourseId){
 if(!data||typeof data!=='object'||data.mode!=='read_only'
    ||data.releaseAllowed!==false||data.courseId!==expectedCourseId)
  throw new Error('Unverified ASP release preflight; no publish action is allowed.');
 const result={mode:'read_only',releaseAllowed:false,courseId:expectedCourseId};
 for(const name of FIELDS)result[name]=safeCount(data[name],name);
 if(result.officialDomainCount>9||
    result.draft>result.total||result.approved>result.total||
    result.reviewedReadyDraft>result.draft||
    result.needsHumanReview>result.draft||
    result.eligibleCandidates>result.reviewedReadyDraft||
    result.candidateLow+result.candidateMedium+result.candidateHigh!==result.eligibleCandidates||
    result.mockReserved>result.total||result.mockReservedReviewed>result.mockReserved||
    result.approvedWithClassificationGaps>result.approved)
  throw new Error('Inconsistent ASP release-preflight counts; contact the administrator.');
 if(!Array.isArray(data.blockedReasons)||data.blockedReasons.length<1||
    !data.blockedReasons.every(reason=>typeof reason==='string'&&reason.length>0&&reason.length<400))
  throw new Error('Release preflight did not return mandatory blockers.');
 if(!Array.isArray(data.domainCandidates)||data.domainCandidates.length!==result.officialDomainCount)
  throw new Error('Invalid ASP11 domain preflight report.');
 const names=new Set();
 result.domainCandidates=data.domainCandidates.map(d=>{
  if(!d||typeof d.slug!=='string'||!/^asp11-0[1-9]$/.test(d.slug)
    ||names.has(d.slug)||typeof d.title!=='string'||!d.title.trim())
   throw new Error('Invalid ASP11 domain in release preflight.');
  names.add(d.slug);
  return {slug:d.slug,title:d.title,
   low:safeCount(d.low,'domain.low'),medium:safeCount(d.medium,'domain.medium'),
   high:safeCount(d.high,'domain.high')};
 });
 result.blockedReasons=data.blockedReasons.slice(0,10);
 // Aggregate values only; never forward arbitrary server response fields.
 return result;
}

export async function fetchAspReleasePreflight(db,courseId){
 if(!db||!courseId)throw new Error('Verified ASP course required.');
 const {data,error}=await db.rpc('lms_p9a_release_preflight',{p_course_id:courseId});
 if(error){
  if(error.code==='PGRST202')
   throw new Error('P9A preflight RPC is not installed in this environment. This stage needs a separately approved staging migration.');
  throw new Error(error.message||'ASP preflight check failed');
 }
 return validateAspReleasePreflight(data,courseId);
}
