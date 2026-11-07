// P19 · Read-only, illustrative UI fixtures. These are NOT enrollment or assessment records.
// Unit titles/codes and the first shown LO/criteria come from supplied awarding-body PDFs.
// Only the approved centre may publish current, complete assessment versions.
export const QUALIFICATIONS=[
 {id:'othm6',body:'OTHM',name:'Level 6 Diploma in Occupational Health and Safety',short:'OTHM Level 6',ref:'603/5002/7',level:6,color:'blue',credits:60,
  units:[
   ['H/617/7539','Health and Safety Management Principles and Policy'],
   ['Y/617/8526','Health and Safety Management Practice'],
   ['Y/617/7540','Risk and Incident Management'],
   ['Y/617/8543','Promoting a Positive Health and Safety Culture'],
   ['R/617/9092','Maintaining a Safe Workplace Environment'],
   ['H/617/7542','Health and Safety Law, Regulation and Influence'],
   ['K/617/7543','Development of the Health and Safety Practitioner']]},
 {id:'othm7',body:'OTHM',name:'Level 7 Diploma in Occupational Health and Safety Management',short:'OTHM Level 7',ref:'603/7782/3',level:7,color:'violet',credits:120,
  units:[
   ['M/618/8236','Health and Safety Management Practice'],
   ['T/618/8237','Effectiveness of Health and Safety Management Systems'],
   ['A/618/8238','Factors Affecting Risk and Strategic Risk Intervention'],
   ['F/618/8239','Strategic Commitment to Health and Well-Being'],
   ['T/618/8240','Sustainability and Ethics in Health and Safety Practice'],
   ['Y/618/8246','Advanced Research Methods']]},
 {id:'nvq6',body:'ProQual',name:'Level 6 NVQ Diploma in Occupational Health and Safety Practice',short:'ProQual NVQ Level 6',ref:'603/3106/9',level:6,color:'orange',
  units:[
   ['D/616/9536','Promote a positive health and safety culture'],
   ['F/616/9531','Develop and implement the health and safety policy'],
   ['J/616/9532','Develop and implement effective communication systems for health and safety information'],
   ['R/616/9534','Develop and maintain individual and organisational competence in health and safety matters'],
   ['Y/616/9535','Identify, assess and control health and safety risks'],
   ['H/616/9537','Develop and implement proactive monitoring systems for health and safety'],
   ['K/616/9538','Develop and implement reactive monitoring systems for health and safety'],
   ['M/616/9539','Develop and implement health and safety emergency response systems and procedures'],
   ['H/616/9540','Develop and implement health and safety review systems'],
   ['K/616/9541','Maintain knowledge of improvements to influence health and safety practice']]}
];
export const FIRST_LO={
 othm6:{code:'1',title:'Understand the principles of health and safety management and its organisational systems.',criteria:[
  ['1.1','Explain the role of performance objectives and targets in effective health and safety management.'],
  ['1.2','Explain in detail the key aspects of effective health and safety systems.'],
  ['1.3','Evaluate the use of recording and communication systems to identify, manage, and distribute relevant health and safety information.'],
  ['1.4','Critically evaluate an organisation’s health and safety management system including its integration with other management systems, and recommend future developments.']]},
 othm7:{code:'1',title:'Understand what contributes to an effective health and safety culture and climate in an organisation.',criteria:[
  ['1.1','Discuss the meaning of health and safety culture and health and safety climate.'],
  ['1.2','Analyse how organisational culture interlinks with health and safety culture.'],
  ['1.3','Assess the main differences between traditional and proactive safety management models.'],
  ['1.4','Critically analyse how perception of risk can affect health and safety in an organisation.']]},
 nvq6:{code:'1',title:'Be able to advocate commitment to a positive health and safety culture in the organisation.',criteria:[
  ['1.1','Provide sufficient and clear information about the benefits of a positive health and safety culture.'],
  ['1.2','Obtain support from directors, managers and employee representatives to promote a positive health and safety culture.'],
  ['1.3','Use opportunities to communicate information about a positive health and safety culture.'],
  ['1.4','Create new opportunities to communicate information about a positive health and safety culture.'],
  ['1.5','Investigate ways to overcome barriers to change.']]}
};
export const SAMPLE_EVIDENCE=[
 {id:'e1',name:'H&S Policy Review.pdf',kind:'Report',size:'1.4 MB',icon:'pdf'},
 {id:'e2',name:'Safety Meeting Notes.docx',kind:'Workplace evidence',size:'340 KB',icon:'doc'},
 {id:'e3',name:'Inspection Photos.jpg',kind:'Workplace evidence',size:'2.1 MB',icon:'image'}
];
export const DEMO_NOTE='UI preview · illustrative learner and evidence data · no Supabase writes';
