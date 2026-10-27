/** Original sample lesson and self-check material for the Technica LMS UI demo.
 * Deliberately separate from ASP certification and admin assessment banks.
 */
export const learningDemo = {
  id: 'process-safety-foundations',
  title: 'Process Safety Essentials',
  eyebrow: 'FEATURED LEARNING COURSE',
  category: 'Process Safety',
  level: 'Foundation',
  image: '/images/refinery.webp',
  description: 'A practical introduction to loss of containment, barrier thinking, and safe operational decisions.',
  objectives: ['Recognise the difference between personal and process safety', 'Identify a top event and its possible consequences', 'Distinguish preventive and mitigative barriers', 'Apply a short pre-start verification checklist'],
  modules: [
    {id:'fundamentals',title:'01 · Understand the risk',lessons:[
      {id:'intro-video', title:'What process safety protects', type:'Video', eyebrow:'WATCH & LEARN', image:'/images/hero-plant.webp', youtubeId:'XuJtdQOU_Z4', youtubeUrl:'https://www.youtube.com/watch?v=XuJtdQOU_Z4', videoTitle:'Anatomy of a Disaster — U.S. Chemical Safety Board', blocks:[
        {title:'Why process safety matters',text:'Process safety is about preventing major incidents caused by uncontrolled releases of hazardous material or energy. It focuses on equipment, operating limits, engineered safeguards and management systems—not only individual behaviour.'},
        {title:'What to look for in the case study',text:'The CSB video examines the 2005 Texas City refinery explosion. As you watch, look for breakdowns in operating decisions, equipment safeguards, warning signals and emergency readiness.'}
      ],takeaway:'A plant can have good personal safety statistics and still have serious process-safety exposure.'},
      {id:'top-event',title:'From hazard to top event',type:'PDF',eyebrow:'READ & EXPLORE',image:'/images/process-vessel.webp',pdf:'/materials/process-safety-quick-guide.pdf',blocks:[
        {title:'Hazard, threat, top event',text:'A hazard is a potential source of harm. A threat is a condition or event that can lead to loss of control. The top event is the moment control is lost—for example, hydrocarbon escaping from a pressurised flange.'},
        {title:'Consequences of a release',text:'Once containment is lost, consequences may include fire, explosion, toxic exposure, environmental damage, and interruption of operations.'}
      ],takeaway:'Keep the top event specific: “loss of containment from a flange” is more useful than “an accident”.'}
    ]},
    {id:'barriers',title:'02 · Control the risk',lessons:[
      {id:'barrier-check',title:'Preventive and mitigative barriers',type:'PDF',eyebrow:'READ & APPLY',image:'/images/pha-plant.webp',pdf:'/materials/process-safety-quick-guide.pdf',blocks:[
        {title:'Before the top event · Prevention',text:'Preventive barriers reduce the likelihood of the top event. Examples include correct joint assembly, suitable bolt preload, operating procedures, inspection, isolation and verification before start-up.'},
        {title:'After the top event · Mitigation',text:'Mitigative barriers limit consequences if prevention fails. Examples include effective detection, alarms, operator response, emergency isolation, fire protection and evacuation.'},
        {title:'The verification habit',text:'Ask who owns each critical barrier, how it is checked, what evidence demonstrates readiness, and what happens if the barrier is unavailable.'}
      ],takeaway:'A barrier only protects the plant when it is present, effective and verified.'}
    ]}
  ],
  quizTitle:'Knowledge check · 10 questions',
};

// Original educational questions, separate from all uploaded ASP and PSEE banks.
export const learningQuiz = [
  {id:1,q:'What is the primary goal of process safety?',options:['Improve office attendance','Prevent major incidents from hazardous material or energy releases','Make every activity faster','Eliminate the need for inspections'],correct:1,why:'Process safety protects against major hazardous releases and the serious events they can cause.'},
  {id:2,q:'Which situation is the best example of a process-safety top event?',options:['A delayed toolbox talk','A dropped pen','Hydrocarbon escaping from a pressurised flange','An untidy meeting room'],correct:2,why:'Loss of containment marks the point at which control of hazardous material is lost.'},
  {id:3,q:'What is a preventive barrier?',options:['A control intended to stop the top event occurring','A first-aid kit used after a fire','A recovery report written after shutdown','An evacuation assembly point'],correct:0,why:'Preventive barriers operate before the top event and reduce its likelihood.'},
  {id:4,q:'Which is a mitigative barrier?',options:['Correct flange torque before commissioning','A pre-start isolation checklist','A gasket inspection before assembly','Emergency isolation after a release is detected'],correct:3,why:'Mitigative barriers act after a top event to limit escalation or consequences.'},
  {id:5,q:'Why is bolt preload relevant to flange integrity?',options:['It changes the paint colour','It helps maintain gasket compression for sealing','It replaces the need for a gasket','It is only a documentation requirement'],correct:1,why:'Correct and uniform bolt preload supports a reliable flange gasket seal.'},
  {id:6,q:'Which question best verifies a critical barrier?',options:['Does the document use a modern font?','Is the equipment painted?','Who checks the barrier, and what evidence proves it works?','How many people attended the meeting?'],correct:2,why:'Ownership, testing and evidence are central to critical barrier assurance.'},
  {id:7,q:'What may follow a loss of hydrocarbon containment?',options:['Only a paperwork delay','No effects if the leak is small','Guaranteed immediate shutdown with no exposure','Fire, explosion or environmental harm depending on conditions'],correct:3,why:'Consequences depend on the released substance, ignition sources, detection and response.'},
  {id:8,q:'Which action is most appropriate when a critical pre-start barrier is unavailable?',options:['Proceed and monitor casually','Stop, escalate and restore or formally manage the risk','Hide the observation','Ignore it if the schedule is tight'],correct:1,why:'An unavailable critical barrier requires a controlled response, not an informal assumption.'},
  {id:9,q:'What is the correct distinction between personal safety and process safety?',options:['They are identical measures','Process safety focuses only on slips','Personal safety focuses on individual injuries; process safety focuses on major hazardous events','Process safety is only relevant to office work'],correct:2,why:'Both matter, but they address different risk profiles and need different indicators.'},
  {id:10,q:'How should warning signs during abnormal operations be handled?',options:['Recognise, communicate and follow defined safe response procedures','Wait for the next routine meeting','Disable the alarm permanently','Continue regardless of deviations'],correct:0,why:'Timely recognition, communication and defined actions help prevent escalation.'},
];

export const demoLessonList = learningDemo.modules.flatMap(m=>m.lessons.map(l=>({...l,moduleId:m.id,moduleTitle:m.title})));
export const learningProgressKey = learnerId => `technica-learning-v1:${String(learnerId||'demo-learner').replace(/[^a-zA-Z0-9_-]/g,'_')}:${learningDemo.id}`;
export function normaliseLearningProgress(raw){
 const completed=(Array.isArray(raw?.completed)?raw.completed:[]).filter(id=>demoLessonList.some(l=>l.id===id));
 const quizPassed=Boolean(raw?.quizPassed);
 const bestScore=Number.isFinite(raw?.bestScore)?Math.max(0,Math.min(10,raw.bestScore)):0;
 return {completed:[...new Set(completed)],quizPassed,bestScore,attempts:Math.max(0,Number(raw?.attempts)||0)};
}
export function learningCompletion(progress){return Math.round(((progress.completed.length+(progress.quizPassed?1:0))/(demoLessonList.length+1))*100)};
