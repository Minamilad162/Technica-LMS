import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const api=read('src/production/courseQuestionBankApi.js');
const bank=read('src/production/AdminCourseBank.jsx');
for(const x of ["await call(db,'lms_p34_bank_capabilities')",
 "await call(db,'lms_p34b_admin_capabilities')",
 "await call(db,'lms_p30_bank_capabilities')",
 "mode:'p30',legacy:true","mode:'p34',selectedMockOnSave:true",
 "mode==='p30'&&releaseLessonId",
 "await call(db,'lms_p30_save_question_bank'",
 "await call(db,'lms_p34_save_question_bank'"]){
 assert(api.includes(x),'Missing P34 compatibility API contract: '+x);
}
for(const x of ["batchMode==='p30'","batchMode==='p34'","Save Settings (P30 Legacy)",
 "Legacy saves do not make Draft Lesson Quiz questions or Selected Mock tests visible",
 "batchMode!=='p34'","saveCourseBankBatch(db,courseId,payload,releaseLessonId||null,batchMode)"]){
 assert(bank.includes(x),'Legacy P30 must not masquerade as P34 direct publication: '+x);
}
assert(bank.includes('getCourseBankBatchCapabilities(db)'));
assert(!bank.includes('>Review Draft questions</button>'));
console.log('PASS P34 pre-migration: legacy P30 settings still work, direct publication disabled/messaging honest until P34A+B installed.');
