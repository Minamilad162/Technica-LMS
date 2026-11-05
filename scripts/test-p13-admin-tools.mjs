import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyAdminOverview,verifyUserList,verifyUserDetail} from '../src/production/adminToolsApi.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const now='2026-11-05T09:00:00Z';
const months=['2026-06','2026-07','2026-08','2026-09','2026-10','2026-11'];
const overview={
 version:'p13-v1',generatedAt:now,
 kpis:{users:20,activeAccounts:18,engaged30Days:10,courses:1,publishedCourses:1,
  activeEnrollments:15,practiceCompleted:11,mockCompleted:2,completedLessons:19,
  questions:2500,practiceApproved:140,mockReserved:200,
  verifiedRevenue:null,currency:null,revenueTracked:false},
 trend:months.map((month,i)=>({month,registrations:3+i,practice:i,mock:i%2})),
 courses:[{id:uuid(10),title:'ASP',status:'published',enrollments:15,questions:2500}]
};
assert.deepEqual(verifyAdminOverview(overview),overview);
for(const x of [
 {...overview,kpis:{...overview.kpis,verifiedRevenue:3500}},
 {...overview,kpis:{...overview.kpis,revenueTracked:true}},
 {...overview,kpis:{...overview.kpis,users:4}},
 {...overview,kpis:{...overview.kpis,practiceApproved:2401}},
 {...overview,trend:[...overview.trend.slice(0,5)]},
 {...overview,trend:[overview.trend[0],overview.trend[0],...overview.trend.slice(2)]},
 {...overview,courses:[{...overview.courses[0],questions:-1}]},
 {...overview,version:'p12-v1'}
])assert.throws(()=>verifyAdminOverview(x),/Invalid/i);

const users={version:'p13-v1',total:2,limit:20,offset:0,users:[
 {id:uuid(1),name:'Learner A',status:'active',joinedAt:now,activePlans:1,
  lessonsCompleted:7,practiceAttempts:4,mockAttempts:1},
 {id:uuid(2),name:'Learner B',status:'suspended',joinedAt:now,activePlans:0,
  lessonsCompleted:0,practiceAttempts:0,mockAttempts:0}
]};
assert.equal(verifyUserList(users).users.length,2);
for(const x of [
 {...users,users:[users.users[0],users.users[0]]},
 {...users,users:[{...users.users[0],mockAttempts:-1}]},
 {...users,users:[{...users.users[0],status:'admin'}]},
 {...users,total:0}
])assert.throws(()=>verifyUserList(x),/Invalid/i);
const detail={
 version:'p13-v1',profile:{id:uuid(1),name:'Learner A',status:'active',joinedAt:now},
 entitlements:[{courseId:uuid(10),courseTitle:'ASP',type:'paid',status:'active',
  startsAt:now,endsAt:null,amountPaid:null,currency:null,paymentRecorded:false}],
 courseProgress:[{courseId:uuid(10),courseTitle:'ASP',lessonsCompleted:7,practiceCompleted:4,mockCompleted:1}],
 lessonProgressTotal:1,
 lessonProgress:[{courseTitle:'ASP',domainTitle:'Domain',topicTitle:'Topic',lessonTitle:'Lesson',
  readingCompleted:true,videoCompleted:true,quizPassed:true,completedAt:now,lastActivityAt:now}],
 recentAssessments:[{courseTitle:'ASP',mode:'quick10',state:'submitted',
  questionCount:10,correctCount:7,scorePercent:70,submittedAt:now}],
 practice:{completed:4,lastScore:75,latestAt:now},
 mock:{completed:1,lastScore:68,latestAt:now},
 revenueAvailable:false
};
assert.deepEqual(verifyUserDetail(detail,uuid(1)),detail);
for(const x of [
 {...detail,entitlements:[{...detail.entitlements[0],amountPaid:120}]},
 {...detail,entitlements:[{...detail.entitlements[0],paymentRecorded:true}]},
 {...detail,revenueAvailable:true},
 {...detail,courseProgress:[{...detail.courseProgress[0],lessonsCompleted:-1}]},
 {...detail,mock:{...detail.mock,lastScore:125}},
 {...detail,lessonProgressTotal:0},
 {...detail,lessonProgress:[{...detail.lessonProgress[0],lastActivityAt:null}]},
 {...detail,recentAssessments:[{...detail.recentAssessments[0],correctCount:99}]},
 {...detail,profile:{...detail.profile,id:uuid(2)}}
])assert.throws(()=>verifyUserDetail(x,uuid(1)),/Invalid|Unverified/i);

const migration=file('supabase/migrations/202611050003_p13_admin_tools_analytics_read_only.sql');
for(const mark of [
 'CREATE FUNCTION public.lms_p13_admin_overview()',
 'CREATE FUNCTION public.lms_p13_admin_users(',
 'CREATE FUNCTION public.lms_p13_admin_user_detail(p_user_id uuid)',
 "IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()",
 "'verifiedRevenue',NULL",
 "'amountPaid',NULL",
 "'paymentRecorded',false",
 "'revenueAvailable',false",
 "count(*)::integer FROM public.lms_p10_mock_attempts",
 "GRANT EXECUTE ON FUNCTION public.lms_p13_admin_overview() TO authenticated,service_role"
])assert(migration.includes(mark),'P13 SQL missing '+mark);
assert(!migration.includes('CREATE OR REPLACE FUNCTION public.lms_p1_'));
assert(!migration.includes('UPDATE public.lms_questions'));
assert(!migration.includes('INSERT INTO public.lms_entitlements'));
const panels=file('src/production/AdminToolsPanels.jsx');
const workspace=file('src/production/AdminToolsWorkspace.jsx');
const live=file('src/production/SupabaseApp.jsx');
const app=file('src/App.jsx');
const nav=file('src/components/Layout.jsx');
for(const mark of ['AdminDashboardPanel','AdminCoursesPanel','AdminQuestionsPanel',
 'AdminMockPanel','AdminUsersPanel','AdminSystemPanel'])
 assert(workspace.includes(mark),'Hub missing '+mark);
assert(workspace.includes('verifiedLiveAdmin'));
assert(workspace.includes("id:'exams'"));
assert(panels.includes('preflightAdminMock'));
assert(panels.includes('reserveAdminMock'));
assert(panels.includes('RESERVE 200 ASP MOCK QUESTIONS'));
assert(panels.includes('selected.length===200'));
assert(panels.includes('Not recorded'));
assert(panels.includes('getAdminUserDetail'));
assert(live.includes('<AdminToolsWorkspace db={db}'));
assert(live.includes('adminToolsOpen'));
assert(app.includes('path="/admin-tools"'));
assert(nav.includes("['/admin-tools','Admin Tools'"));
assert(!nav.includes("['/learners','Learners',Users]"));
assert(file('.github/workflows/ci-security.yml').includes('npm run test:p13'));
assert(file('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 68. P13 — Unified Admin Tools workspace'));
assert(file('docs/current/LOGIC_REGISTRY.md').includes('LMS-037'));
console.log('PASS P13: unified real live + demo Admin Tools, 6 sub-tabs, authentic Supabase KPI/user contracts, exclusive Mock 200 protections and no fake billing.');
