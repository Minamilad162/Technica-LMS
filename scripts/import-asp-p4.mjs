// Technica P4 bank importer. DRY RUN by default; never publishes questions.
// Example: node scripts/import-asp-p4.mjs --apply
// Required apply env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// SUPABASE_PROJECT_REF_CONFIRM. Never use VITE_ for service role.
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const items=JSON.parse(readFileSync(new URL('../src/data/aspQuestionBank.json',import.meta.url),'utf8'));
const counts=items.reduce((result,q)=>(result[q.domainId]=(result[q.domainId]||0)+1,result),{});
const ids=new Set(items.map(q=>q.bankId));
if(items.length!==1625 || ids.size!==items.length ||
  [250,625,200,300,250].some((n,i)=>counts['domain'+(i+1)]!==n)) {
 throw Error('Source ASP bank unexpected: stop and investigate');
}
for(const q of items){
 if(!Array.isArray(q.options) || q.options.length<2 || !Number.isInteger(q.correct) ||
   q.correct<0 || q.correct>=q.options.length || !q.bankId || !q.prompt)throw Error('Invalid question '+q.bankId);
}
console.log('Validated source ASP bank:',items.length,JSON.stringify(counts));
console.log('Import mode:',process.argv.includes('--apply')?'APPLY DRAFT ONLY':'DRY RUN');
console.log('IMPORTANT: five legacy workbook groups are NOT the approved ASP nine-domain taxonomy.');
if(!process.argv.includes('--apply'))process.exit(0);
const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const confirm=process.env.SUPABASE_PROJECT_REF_CONFIRM;
if(!url||!key||!confirm)throw Error('Missing backend-only SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_PROJECT_REF_CONFIRM');
const hostname=new URL(url).hostname;
if(hostname!==confirm+'.supabase.co')throw Error('Project reference mismatch: refusing to write');
if(/cheiron|belmqkkhboblptrlpglt/i.test(hostname))throw Error('Wrong project: do not import into CHEIRON');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:asp,error:courseError}=await db.from('lms_courses').select('id,slug').eq('slug','asp').maybeSingle();
if(courseError)throw courseError;
if(!asp)throw Error('Create the ASP course with slug "asp" in Technica LMS first. Never auto-create a published course.');
// Read existing IDs without modifying previously published/reviewed questions.
let existing=new Set();
for(let offset=0;;offset+=500){
 const {data,error}=await db.from('lms_questions').select('source_id').eq('course_id',asp.id).range(offset,offset+499);
 if(error)throw error;
 for(const row of data||[])existing.add(row.source_id);
 if((data||[]).length<500)break;
}
const missing=items.filter(q=>!existing.has(q.bankId));
console.log('Existing questions preserved:',items.length-missing.length,'new draft records:',missing.length);
for(let i=0;i<missing.length;i+=100){
 const rows=missing.slice(i,i+100).map(q=>({
  course_id:asp.id,source_id:q.bankId,legacy_group:String(q.domainId),
  domain_id:null,prompt:q.prompt,options:q.options,correct_index:q.correct,
  explanation:q.explanation||'',reference_text:q.reference||'',
  difficulty:'unclassified',approval_state:'draft',mock_exclusive:false
 }));
 const {error}=await db.from('lms_questions').insert(rows);
 if(error)throw new Error('Batch '+(i/100+1)+' failed: '+error.message);
 console.log('Inserted draft questions:',Math.min(i+100,missing.length),'/',missing.length);
}
console.log('Import finished. ALL NEW RECORDS ARE DRAFT. Do not approve or publish without SME audit/mapping and mock reservation.');
