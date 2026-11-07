// P24: Pure read-only views of the existing P13 verified Admin overview.
// A zero/unknown value is never silently replaced with demo data.
const assertCount=(x,label)=>{
 if(!Number.isSafeInteger(x)||x<0)throw Error('Invalid verified dashboard count: '+label);
 return x;
};
export function buildAdminDashboardDistributions(report){
 const k=report?.kpis;
 if(!k||!Array.isArray(report.courses))throw Error('Verified P13 overview is required.');
 const number=(key)=>assertCount(k[key],key);
 const users=number('users'),active=number('activeAccounts');
 const totalCourses=number('courses'),published=number('publishedCourses');
 const questions=number('questions'),practice=number('practiceApproved'),mock=number('mockReserved');
 const practiceAttempts=number('practiceCompleted'),mockAttempts=number('mockCompleted');
 if(active>users||published>totalCourses||practice+mock>questions)
  throw Error('Inconsistent Admin overview data.');
 // P13 emits all courses. Use its statuses only when the complete count
 // matches; else use the safe published/unpublished P13 totals.
 const complete=report.courses.length===totalCourses&&
   report.courses.every(c=>['draft','published','archived'].includes(c.status))&&
   report.courses.filter(c=>c.status==='published').length===published;
 const draft=complete?report.courses.filter(c=>c.status==='draft').length:null;
 const archived=complete?report.courses.filter(c=>c.status==='archived').length:null;
 const groups=[
  {id:'questions',title:'Question bank',subtitle:'Approval and Mock allocation',
   centerLabel:'Questions',total:questions,target:'questions',
   slices:[
    {label:'Approved for Practice',value:practice,color:'#118c87'},
    {label:'Mock exclusive',value:mock,color:'#4776b9'},
    {label:'Other / not allocated',value:questions-practice-mock,color:'#d9a04a'}
   ],
   insight:(questions-practice-mock).toLocaleString()+' questions are neither Practice-approved nor Mock-exclusive.'},
  {id:'courses',title:'Course publication',subtitle:'Live publishing status',
   centerLabel:'Courses',total:totalCourses,target:'courses',
   slices:complete?[
    {label:'Published',value:published,color:'#118c87'},
    {label:'Draft',value:draft,color:'#d9a04a'},
    {label:'Archived',value:archived,color:'#7a98aa'}
   ]:[
    {label:'Published',value:published,color:'#118c87'},
    {label:'Not published',value:totalCourses-published,color:'#d9a04a'}
   ],
   insight:published.toLocaleString()+' of '+totalCourses.toLocaleString()+' courses are published.'},
  {id:'users',title:'User accounts',subtitle:'Account access status',
   centerLabel:'Accounts',total:users,target:'users',
   slices:[
    {label:'Active',value:active,color:'#118c87'},
    {label:'Not active',value:users-active,color:'#c9a35a'}
   ],insight:number('engaged30Days').toLocaleString()+' profiles had learning activity in the last 30 days.'},
  {id:'activity',title:'Practice & Mock activity',subtitle:'All-time submitted or expired attempts',
   centerLabel:'Attempts',total:practiceAttempts+mockAttempts,target:'exams',
   slices:[
    {label:'Practice',value:practiceAttempts,color:'#118c87'},
    {label:'Mock exams',value:mockAttempts,color:'#4776b9'}
   ],insight:'Counts reflect completed or expired attempts, not unique learners.'}
 ];
 return groups.map(group=>({...group,centerValue:group.total.toLocaleString()}));
}
