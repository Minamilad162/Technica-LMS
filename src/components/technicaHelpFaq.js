// P65: verified, locally searchable LMS help. No AI, external prompts or account data.
export const TECHNICA_FAQS=Object.freeze([
 {id:'create-account',category:'Account',question:'How do I create an account?',
  answer:'Choose Sign Up to register with an email and password, or Continue with Google. A new account starts as a Learner without an active subscription.',
  keywords:'signup register google oauth learner',action:null},
 {id:'forgot-password',category:'Account',question:'What if I forget my password?',
  answer:'On the Sign In screen, choose Forgot password, enter your registered email, and follow the recovery instructions. If no message arrives, check your spam folder or contact your administrator.',
  keywords:'password reset recovery sign in email login',action:null},
 {id:'blocked-account',category:'Account',question:'Why is my account blocked?',
  answer:'An administrator can block an account and may add a reason. Read the blocked-account message and contact the LMS administrator to request a review. Only an authorized administrator can remove the block.',
  keywords:'suspended disabled banned account note unblock',action:null},
 {id:'find-courses',category:'Courses & Lessons',question:'Where can I find available courses?',
  answer:'Choose Courses in the sidebar to see published courses. Open a course to view its overview and available lessons.',
  keywords:'catalog library browse available learning',action:{label:'Browse courses',path:'/course-catalog'}},
 {id:'missing-lessons',category:'Courses & Lessons',question:"Why can't I see lessons in my course?",
  answer:'A Course can be published while individual Lessons are still in Draft. Only Lessons explicitly published by an administrator appear to learners, even if you have a valid subscription. You do not need to purchase a second plan.',
  keywords:'hidden draft missing lesson published subscription',action:{label:'Open my learning',path:'/my-learning'}},
 {id:'free-intro',category:'Courses & Lessons',question:'Can I try a course before subscribing?',
  answer:'A Free Intro is available only if the administrator has enabled it for a published course and its introductory Lesson. Other protected lessons require appropriate access.',
  keywords:'free trial preview introduction sample',action:{label:'Explore courses',path:'/course-catalog'}},
 {id:'subscribe',category:'Subscriptions',question:'How do I subscribe to a plan?',
  answer:'Open Subscription to view currently published plans. Choose an available plan and follow the request process. An administrator may need to activate access; submitting a request does not by itself prove payment or activate the subscription.',
  keywords:'buy payment plans checkout enroll membership activation',action:{label:'View subscription plans',path:'/subscription-plans'}},
 {id:'days-left',category:'Subscriptions',question:'How many days are left on my subscription?',
  answer:'Your plan and total remaining days appear in the header and My Profile. Remaining days are calculated using the actual subscription end date.',
  keywords:'expiry expires duration countdown remaining renew 3 months',action:{label:'Open My Profile',path:'/my-profile'}},
 {id:'all-courses',category:'Subscriptions',question:'Does one subscription cover all courses?',
  answer:'An active platform subscription provides access to eligible published courses during its validity period. Draft courses and lessons are not made visible until an administrator publishes them.',
  keywords:'all access membership entitlement included subscription',action:{label:'Explore courses',path:'/course-catalog'}},
 {id:'lesson-media',category:'Courses & Lessons',question:'How do I watch videos or read lesson PDFs?',
  answer:'Open a published course, choose Your lessons, then open an authorized Lesson. Its protected video, material and attachments are presented together, followed by the quiz.',
  keywords:'video pdf download material attachment protected player lesson',action:{label:'Open My Learning',path:'/my-learning'}},
 {id:'video-troubleshoot',category:'Courses & Lessons',question:"What should I do if a lesson video doesn't play?",
  answer:'Try Retry secure playback or reopen the Lesson. If the issue continues, send the course and lesson names to your administrator. Some MP4 files use codecs that are not supported by every browser.',
  keywords:'black screen buffering video play codec h264 aac',action:{label:'Open My Learning',path:'/my-learning'}},
 {id:'practice-customize',category:'Exams & Practice',question:'How do I customize a Practice session?',
  answer:'Open Mock Exam & Practice, select the Practice tab, choose a course and an available practice mode, then configure the question count and time options offered for that mode.',
  keywords:'quiz quick 10 timed build your own questions timer',action:{label:'Open Practice',path:'/assessments?tab=practice'}},
 {id:'practice-all',category:'Exams & Practice',question:'Can I practice questions from all courses?',
  answer:'Yes. In the Practice course selector choose All Courses. The session uses eligible questions from courses your account can access, subject to the question-bank rules.',
  keywords:'all courses combined mixed random practice',action:{label:'Choose Practice courses',path:'/assessments?tab=practice'}},
 {id:'level-up',category:'Exams & Practice',question:'How does Level Up Practice work?',
  answer:'Level Up is an adaptive Practice mode. It changes question difficulty according to your performance while keeping the total question limit you selected. The fixed Mock Exam is not adaptive.',
  keywords:'adaptive levels difficulty easy medium hard 70 percent progression',action:{label:'Open Practice modes',path:'/assessments?tab=practice'}},
 {id:'practice-vs-mock',category:'Exams & Practice',question:'What is the difference between Practice and Mock Exam?',
  answer:'Practice supports configurable sessions for learning. The ASP Mock Exam is a fixed, five-hour assessment of 200 dedicated questions once its form has been configured and released by the administrator. Mock-reserved questions are not mixed into ordinary Practice.',
  keywords:'official mock 200 5 hours 300 minutes fixed exam',action:{label:'Open Mock Exam',path:'/assessments?tab=mock'}},
 {id:'kill-mistakes',category:'Exams & Practice',question:'What is Kill Mistakes?',
  answer:'Kill Mistakes collects questions answered incorrectly or left unanswered in completed Practice, Mock and Lesson Quiz attempts. A question leaves your active list only after you answer it correctly inside Kill Mistakes. If you miss it again later, it returns.',
  keywords:'incorrect wrong missed retry wrong answers weak errors',action:{label:'Open Kill Mistakes',path:'/kill-mistakes'}},
 {id:'previous-results',category:'Exams & Practice',question:'Where can I find my previous results?',
  answer:'Open Mock Exam & Practice → History for previous attempts and results. My Progress shows verified lesson completion and assessment performance.',
  keywords:'history score graded results analytics attempts progress',action:{label:'View Practice History',path:'/assessments?tab=history'}},
 {id:'admin-create-course',category:'Admin',audience:'admin',question:'How do I create a course and lessons?',
  answer:'In Admin Tools → Courses, create a Course and organize it as Course → Domain → Topic → Lesson. Add approved video, PDF, text and quiz content to the Lesson before publishing.',
  keywords:'course builder hierarchy domain topic lesson admin upload editor',action:{label:'Manage courses',path:'/admin-tools?tab=courses'}},
 {id:'admin-publish-lessons',category:'Admin',audience:'admin',question:"Why aren't my new lessons visible to learners?",
  answer:'Creating a Lesson or uploading a file does not publish it automatically. Publish the Course and each approved Lesson in Admin Tools. Draft Lessons stay hidden even from users with active plans.',
  keywords:'unpublished draft lesson hidden publish all admin',action:{label:'Review Lesson publication',path:'/admin-tools?tab=courses'}},
 {id:'admin-manage',category:'Admin',audience:'admin',question:'How do I manage questions, Mock Exams, and users?',
  answer:'Use Admin Tools → Question Bank to review course questions, Exams & Mock to configure assessments, and Users to review accounts, manually assign plans, block or unblock users and record block notes. A manual plan activation does not confirm a payment.',
  keywords:'admin users subscription note block question bank excel mock activation',action:{label:'Open User Directory',path:'/admin-tools?tab=users'}}
]);
export const TECHNICA_FAQ_CATEGORIES=Object.freeze(['All','Account','Subscriptions','Courses & Lessons','Exams & Practice','Admin']);
export function visibleTechnicaFaqs(isAdmin=false){return TECHNICA_FAQS.filter(x=>x.audience!=='admin'||isAdmin===true)}
const normalize=text=>String(text??'').toLocaleLowerCase('en').replace(/[^a-z0-9\s]+/g,' ').replace(/\s+/g,' ').trim();
export function searchTechnicaFaqs(items,query,category='All'){
 const terms=normalize(query).split(' ').filter(Boolean);
 return items.filter(f=>(category==='All'||f.category===category)&&(
  !terms.length||terms.every(word=>normalize(f.question+' '+f.answer+' '+f.keywords).includes(word))
 ));
}
export function suggestTechnicaFaqs(items,query){
 const normalized=normalize(query);
 if(!normalized||normalized.length<3)return [];
 const terms=normalized.split(' ').filter(x=>x.length>2);
 const ranked=items.map(f=>{
  const title=normalize(f.question),text=normalize(f.question+' '+f.keywords);
  let score=title.includes(normalized)?20:0;
  for(const term of terms){if(title.includes(term))score+=4;else if(text.includes(term))score+=2}
  return {f,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 return ranked.slice(0,4).map(x=>x.f);
}
