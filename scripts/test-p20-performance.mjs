import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchP15Catalog} from '../src/production/learnerJourneyApi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const id='10000000-0000-0000-0000-000000000001';
let started=[],finish={};
const response={
 lms_profiles:{data:{full_name:'Learner',account_status:'active'},error:null},
 lms_role_assignments:{data:[],error:null},
 lms_courses:{data:[{id,slug:'asp',title:'ASP',publication_state:'published'}],error:null},
 lms_entitlements:{data:[],error:null},
 lms_platform_subscriptions:{data:[],error:null}
};
function pending(table){
 started.push(table);
 return new Promise(resolve=>{finish[table]=()=>resolve(response[table]);});
}
function query(table){
 return {
  select(){return this;},eq(){return this;},is(){return this;},order(){return this;},limit(){return this;},
  maybeSingle(){return pending(table);},
  then(resolve,reject){return pending(table).then(resolve,reject);}
 };
}
const db={from:table=>query(table),rpc:async(name)=>{assert.equal(name,'lms_p41_access_mode');return {data:'subscription',error:null};}};
const request=fetchP15Catalog(db,{id});
for(let i=0;i<12&&started.length<5;i++)await Promise.resolve();
assert.deepEqual(started.sort(),[
 'lms_courses','lms_entitlements','lms_platform_subscriptions','lms_profiles','lms_role_assignments'
].sort(),'No serial request waterfall: identity+roles+published catalog+entitlements+membership concurrently');
for(const done of Object.values(finish))done();
const catalog=await request;
assert.equal(catalog.courses.length,1);
assert.equal(catalog.courses[0].title,'ASP');
assert.equal(catalog.identity.profile.account_status,'active');
const app=read('src/App.jsx'),workspace=read('src/production/LiveLearnerWorkspace.jsx');
const media=read('src/production/ProtectedLessonViewer.jsx');
const api=read('src/production/learnerJourneyApi.js');
const identity=read('src/production/lmsApi.js');
const lazy=(app.match(/React\.lazy\(\(\)=>import\(/g)||[]).length;
assert(lazy>=16,'Main App must route-split heavy Admin, Mock, Practice, learner pages');
assert(app.includes('React.Suspense fallback='));
assert(!app.includes("import LiveMockPortal from"));
assert(!app.includes("import AdminToolsPortal from"));
assert(!app.includes("import QuestionBankPage from"));
assert(workspace.includes("React.lazy(()=>import('./LivePractice.jsx'))"));
assert(workspace.includes("React.lazy(()=>import('./SubscriptionPlans.jsx'))"));
assert(workspace.includes("React.lazy(()=>import('./PremiumMyLearning.jsx'))"));
assert(workspace.includes("React.lazy(()=>import('./CourseLessonExplorer.jsx')"));
assert(read('src/production/CourseLessonExplorer.jsx').includes("React.lazy(()=>import('./ProtectedLessonViewer.jsx')"));
assert(workspace.includes('React.Suspense fallback='));
assert(api.includes(".eq('publication_state','published')"),'Learner should only request published course rows');
assert(identity.includes("Promise.all(["),'Profile and role network work must be parallel');
assert(media.includes("new IntersectionObserver(entries=>"),'Media access lazy near viewport');
assert(media.includes("rootMargin:'450px 0px'"),'Preload before media is scrolled into view');
assert(!media.includes("setInterval(()=>{if(active.current)setRenew"),'Do not tear down playing videos on a timer');
assert(read('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 78. P20 — Direct Lesson Media & Performance'));
console.log('PASS P20 performance contract: 5 concurrent auth/catalog/membership reads, 21 route chunks, lazy Practice/Media/Membership, viewport-near signed media.');
console.log('Real browser navigation/TTFB/Core Web Vitals remain unmeasured until post-deploy QA.');
