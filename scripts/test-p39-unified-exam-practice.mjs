import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOCK_QUESTION_COUNT,MOCK_DURATION_SECONDS,validateMockReadiness}
 from '../src/production/mockApi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('src/App.jsx');
const menu=read('src/components/Layout.jsx');
const hub=read('src/production/LiveExamPracticeHub.jsx');
const css=read('src/production/liveExamPracticeHub.css');
const legacyPortal=read('src/production/LiveMockPortal.jsx');
const practice=read('src/production/LivePractice.jsx');
const mock=read('src/production/LiveMockExam.jsx');
const bridge=read('src/production/LiveLearnerPortal.jsx');
const workspace=read('src/production/LiveLearnerWorkspace.jsx');
const bank=read('src/production/AdminCourseBank.jsx');
const finalizer=read('src/production/OfficialMockBankFinalizer.jsx');
const reservationUi=read('src/production/AspMockReservation.jsx');
const bankApi=read('src/production/courseQuestionBankApi.js');
const mockSql=read('supabase/migrations/202611050001_p10_mock_engine.sql');
const oldForm=read('supabase/migrations/202611040005_p9b_controlled_mock_reservation_and_practice_approval.sql');
const check=(body,phrase,what)=>assert(body.includes(phrase),what+': '+phrase);
assert.equal(MOCK_QUESTION_COUNT,200);
assert.equal(MOCK_DURATION_SECONDS,18000);
assert.equal(validateMockReadiness({
 ready:true,verifiedReserved:200,totalExclusiveFlags:200,required:200,durationSeconds:18000,
 engineVersion:'p10-mock-v1'}).ready,true);
assert.throws(()=>validateMockReadiness({
 ready:true,verifiedReserved:199,totalExclusiveFlags:199,required:200,durationSeconds:18000,
 engineVersion:'p10-mock-v1'}),/not ready/);
check(app,'<LiveExamPracticeHub/>','Real /assessments hub active');
check(app,'<Route path="/assessments"','Unified Mock & Practice route');
check(app,'<Navigate to="/assessments?tab=practice" replace/>','Legacy /practice path redirects to Practice tab');
assert(!app.includes('<AssessmentOverview/>'),'Old demo assessment overview must not be learner entrypoint');
check(app,'<Route path="/assessments/mock/live"','Existing P10 direct link retained');
check(app,'<Route path="/assessments/take" element={legacyBrowserQa?','Direct old Demo Assessment must be DEV-only');
check(app,'<Navigate to="/assessments?tab=mock" replace/>','Legacy assessment URLs must resolve to fixed Mock in production');
check(app,'<Route path="/practice/session" element={legacyBrowserQa?','Legacy Demo Practice session must be DEV-only');
check(menu,"['/assessments','Mock Exam & Practice',GraduationCap]",'Single sidebar link');
assert(!menu.includes("['/practice','Practice',NotebookTabs]"),'Remove standalone learner Practice menu');
assert(!menu.includes("['/assessments','Assessments'"),'Remove old Assessments label');
check(menu,"['/assessments','Mock & Practice',NotebookTabs]",'Mobile menu single entry');
check(bridge,"onPracticeRoute={()=>navigate('/assessments?tab=practice')}",'My Learning Practice quick link');
for(const k of [
 "examPracticeTab(params.get('tab'))","const TAB_IDS=['practice','mock','history']",
 'role="tablist"','role="tab"','aria-selected={tab===\'practice\'}',
 'aria-selected={tab===\'mock\'}','id="lep-tab-practice"','id="lep-tab-mock"',
 'Mock Exam','My Practice','lep-tab-history',
 'LivePractice','LiveSelectedMockExam','loadStructure(db,course.id)',
 'fetchLiveLearningCatalog(db)','mayReadLiveCourse(catalog,course)',
 'hasPlatformAccess(catalog.subscription)',"catalog?.courses.find(c=>c.id===mockCourseId)",
 'defaultMode="quick10"','onClick={()=>activate(\'mock\')}',
 'id={\'lep-panel-\'+tab}'
])check(hub,k,'Three-tab secure Supabase hub');
assert(hub.includes('LiveSelectedMockExam')&&!hub.includes('<LiveMockExam'),
 'Course Mock tab uses fixed-200 selected-bank engine, not the historical ASP reserved form');
assert(!hub.includes('../data/mock'),'Mock must not load demo bank');
assert(!hub.includes('assessmentSettings('),'Mock settings must never be customized');
assert(!legacyPortal.includes('LiveSelectedMockExam'),'Legacy /mock/live route must be official only');
assert(!legacyPortal.includes('mockMode'),'No third Selected Mock mode');
check(legacyPortal,'<LiveMockExam','Existing deep link uses official P10 engine');
for(const k of ['Quick 10','Timed Quiz','Build Your Own','Practice by Domain','Level Up',
 'setMinutes','setCount','startSecurePractice','startAdaptivePractice',
 'requestQuestionFullscreen','useQuestionFullscreenGuard'])
 check(practice,k,'Old customizable Practice preserved');
for(const k of ['getMockReadiness(db,course.id)','startOfficialMock(db,course.id,requestId)',
 'saveOfficialMock(db,attempt.attemptId','submitOfficialMock(db,attempt.attemptId)',
 '200 fixed questions · 300 minutes','05:00','useQuestionFullscreenGuard'])
 check(mock,k,'Official protected ASP 200/5h still used');
for(const marker of ["DEFAULT 200 CHECK(question_count=200)","interval '300 minutes'",
 "q.mock_exclusive AND q.approval_state='draft'",'lms_p10_mock_readiness(uuid)'])
 check(mockSql,marker,'Server enforces official Mock invariants');
check(oldForm,'Exactly 200 explicit question IDs required','P9B fixed Mock reservation unchanged');
assert(!read('src/production/liveExamPracticeHub.css').includes('width:1900px'),'Responsive width not fixed');
for(const m of ['@media(max-width:760px)','@media(max-width:520px)',
 '.lep-tabs','.lep-content','prefers-reduced-motion'])check(css,m,'Responsive tab UI');
check(workspace,"label:'Mock Exam & Practice'",'Alternate learner workspace menu');
check(workspace,"preparationTab==='mock'",'Alternate learner workspace Mock tab');
check(workspace,"<LiveSelectedMockExam", 'Alternate learner workspace uses Course Mock from saved bank');
check(bank,"q.mockExclusive?'mock':q.mockCandidate?'candidate'",'Bank distinguishes official reserved vs candidates');
assert(!bank.includes('Mock-selected questions are available in the separate Selected Mock Test.'),
 'Question Bank must not promise hidden variable Selected Mock as the official exam');
check(bank,'<OfficialMockBankFinalizer','Bank finalizer alongside P10 readiness');
check(bank,'disabled={pendingCount>0||busy||aspIdentityMismatch||repairingAsp}','Cannot finalize before all edits are saved and ASP identity is valid');
check(finalizer,'loadMarkedMockCandidateIds(db,course.id)','Load only saved marked IDs');
check(finalizer,'marked.length>200','More than 200 rejected');
check(finalizer,'new Set(marked).size!==marked.length','Duplicate IDs rejected');
check(finalizer,'ids?.length===200&&!disabled','Exactly 200 saved IDs required');
check(finalizer,'<AspMockReservation','Protected P9B reservation reused');
check(bankApi,'lms_p29_mock_candidate_ids','Read Admin saved candidate IDs');
check(reservationUi,'previewAspMockReservation(db,course.id,selected)','Read-only human preflight');
check(reservationUi,'reserveAspMock(db,course.id,selected,phrase)','Explicit Admin reservation');
check(oldForm,'v_check:=public.lms_p9b_mock_preflight','Server rechecks under locks');
assert(!finalizer.includes('lms_p9b_reserve_mock('),'Cannot bypass protected P9B');
console.log('PASS P40 saved Question Bank candidates require reviewed exact-200 P9B reservation.');
console.log('PASS P39/P71: Course Mock tab uses saved Bank selection with 200/300; immutable P10 legacy stays unchanged.');
