// Read-only browser diagnostics for the *actual Supabase* ASP reviewer.
// Never print access tokens, API keys, passwords, question text, or emails.
const check=(id,status,detail)=>({id,status,detail});
export function describeDbError(error){
 const code=String(error?.code||'').slice(0,24);
 const status=Number(error?.status||0);
 const message=String(error?.message||'').toLowerCase();
 if(code==='PGRST202'||/could not find the function/.test(message))
   return 'P6A review RPC is not installed in this Supabase project, or its API schema cache is outdated.';
 if(code==='PGRST205'||/could not find the table/.test(message))
   return 'Required LMS tables are missing from this Supabase project or inaccessible to the Data API.';
 if(code==='42501'||status===403||/permission denied|row-level security/.test(message))
   return 'Supabase answered, but this JWT has insufficient table/RLS/RPC permissions.';
 if(status===401||/invalid api key|invalid jwt|jwt expired|invalid login/.test(message))
   return 'Supabase rejected the current public key or session. Check project-key pairing and sign in again.';
 if(/failed to fetch|networkerror|network request|cors|load failed|connection refused/.test(message))
   return 'The request could not reach Supabase from this browser. Check URL, browser network/CORS and extensions.';
 return code?'Database/API rejected the request (code '+code+').':'Database/API request could not be completed.';
}
function validatePublicUrl(value){
 try { const u=new URL(value); return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password; }
 catch{return false;}
}
export async function diagnoseReviewConnection(db,{build={},session=null,identity=null,course=null,identityError=''}={}){
 const checks=[];
 const urlPresent=Boolean(build.url);
 const keyPresent=Boolean(build.publicKey);
 const urlValid=urlPresent&&validatePublicUrl(build.url);
 checks.push(check('build',urlPresent&&keyPresent&&urlValid?'pass':'fail',
   !urlPresent||!keyPresent?'The published browser bundle is missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. These must exist during the Cloudflare BUILD, not only Worker runtime.':
   !urlValid?'The compiled Supabase URL is not a valid HTTPS address.':
   'Both public build values are compiled into this page. No key value is displayed.'));
 if(!db||!urlPresent||!keyPresent||!urlValid){
  checks.push(check('api','pending','Cannot test the Data API until the public browser configuration is valid.'));
  return checks;
 }
 try{
  const result=await db.from('lms_courses').select('id',{head:true,count:'exact'});
  if(result.error) {
   checks.push(check('api','fail',describeDbError(result.error)));
   return checks;
  }
  checks.push(check('api','pass','Supabase Data API responded to a read-only request. This does not prove administrator access.'));
 }catch(error){
  checks.push(check('api','fail',describeDbError(error)));
  return checks;
 }
 if(!session?.user?.id){
  checks.push(check('auth','pending','You are not signed in to genuine Supabase Auth. The original Demo account does not grant review access.'));
  return checks;
 }
 try{
  const {data,error}=await db.auth.getUser();
  if(error||data?.user?.id!==session.user.id){
   checks.push(check('auth','fail',describeDbError(error||{status:401})));return checks;
  }
  checks.push(check('auth','pass','Supabase verified the current signed-in account.'));
 }catch(error){checks.push(check('auth','fail',describeDbError(error)));return checks;}
 let profile;
 try{
  const p=await db.from('lms_profiles').select('account_status').eq('id',session.user.id).maybeSingle();
  if(p.error){checks.push(check('profile','fail',describeDbError(p.error)));return checks;}
  profile=p.data;
  if(!profile){checks.push(check('profile','fail','The Supabase Auth user has no visible lms_profiles row. P1 signup/bootstrap and RLS need verification.'));return checks;}
  if(profile.account_status!=='active'){checks.push(check('profile','fail','This LMS account profile is not active.'));return checks;}
  checks.push(check('profile','pass','An active LMS profile exists for this authenticated user.'));
 }catch(error){checks.push(check('profile','fail',describeDbError(error)));return checks;}
 try{
  const r=await db.from('lms_role_assignments').select('role').eq('user_id',session.user.id).is('revoked_at',null);
  if(r.error){checks.push(check('admin','fail',describeDbError(r.error)));return checks;}
  if(!(r.data||[]).some(x=>x.role==='admin')||identity?.isAdmin!==true){
   checks.push(check('admin','fail','No active LMS admin assignment was confirmed. Demo Admin is separate from Supabase Admin; use the controlled P3 admin bootstrap.'));return checks;
  }
  checks.push(check('admin','pass','Your LMS account has an active, verified Admin assignment.'));
 }catch(error){checks.push(check('admin','fail',describeDbError(error)));return checks;}
 if(!course?.id){
  checks.push(check('asp','fail','No ASP course with exact slug asp is visible. Create/verify the real ASP course after confirming the project.'));
  return checks;
 }
 checks.push(check('asp','pass','ASP course exists in the authenticated database catalog.'));
 try{
  const {data,error}=await db.rpc('lms_p6_bank_summary',{p_course_id:course.id});
  if(error){checks.push(check('p6a','fail',describeDbError(error)));return checks;}
  const count=Number(data?.total||0);
  checks.push(check('p6a','pass','P6A protected review RPC responded. '+(count===0?'The real ASP question bank has 0 imported questions; source Demo questions are not imported automatically.':'ASP review records are accessible.')));
 }catch(error){checks.push(check('p6a','fail',describeDbError(error)));}
 if(identityError&&!checks.some(x=>x.status==='fail')){
  checks.push(check('ui','warn','A separate LMS loading request failed. Reopen the card to refresh the current session.'));
 }
 return checks;
}
