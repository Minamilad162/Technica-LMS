// Derive display state only from the authorised portfolio and task RPC.
export const editableStates=['not_started','draft','changes_requested'];
export const outcomeState=o=>o.claim?.state||'not_started';
export function taskDetails(task,portfolio){
 const ids=new Set(task?.spec?.criteria||[]);
 const groups=(portfolio.units||[]).map((unit,index)=>({unit,index,outcomes:unit.outcomes.map(outcome=>{
  const state=outcomeState(outcome);
  const mapping=editableStates.includes(state)?outcome.claim?.mapping||{}:outcome.submissions?.[0]?.snapshot?.mapping||{};
  const criteria=outcome.criteria.filter(c=>ids.has(c.id)).map(c=>({...c,linked:!!mapping[c.id]?.length,verified:state==='verified'}));
  return {outcome,state,criteria,allCovered:outcome.criteria.length>0&&outcome.criteria.every(c=>mapping[c.id]?.length)};
 }).filter(o=>o.criteria.length)})).filter(g=>g.outcomes.length);
 const outcomes=groups.flatMap(g=>g.outcomes);
 const criteria=outcomes.flatMap(o=>o.criteria);
 const mapped=criteria.filter(c=>c.linked).length;
 const verified=criteria.filter(c=>c.verified).length;
 const feedback=groups.flatMap(g=>g.outcomes.flatMap(({outcome})=>(outcome.submissions||[]).flatMap(s=>(s.reviews||[]).filter(r=>r.feedback).map(r=>({...r,unit:g.unit.code,outcome:outcome.code,revision:s.revision,outcomeId:outcome.id}))))).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
 const active=outcomes.filter(o=>editableStates.includes(o.state));
 return {groups,outcomes,criteria,mapped,verified,feedback,active,percent:ids.size?Math.round(100*verified/ids.size):0,missing:ids.size-criteria.length};
}
export function taskCounts(tasks){
 const live=tasks.filter(t=>t.status!=='Cancelled');
 return {total:live.length,submitted:live.filter(t=>t.status==='Awaiting review').length,changes:live.filter(t=>t.status==='Changes requested').length,inProgress:live.filter(t=>t.status==='In progress').length,completed:live.filter(t=>t.status==='Verified').length,active:live.filter(t=>!['Verified','Cancelled'].includes(t.status)).length,overdue:live.filter(t=>t.overdue).length,cancelled:tasks.length-live.length};
}
export function matchesTask(t,filter){
 return filter==='all'||filter==='active'&&!['Verified','Cancelled'].includes(t.status)||filter==='overdue'&&t.status!=='Cancelled'&&t.overdue||filter==='submitted'&&t.status==='Awaiting review'||filter==='changes'&&t.status==='Changes requested'||filter==='completed'&&t.status==='Verified'||filter==='cancelled'&&t.status==='Cancelled';
}
