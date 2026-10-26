import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const home=read('src/pages/HomePage.jsx');
const layout=read('src/components/Layout.jsx');
const app=read('src/App.jsx');
const bank=read('src/pages/QuestionBankPage.jsx');
const store=read('src/lib/store.jsx');
const quiz=read('src/pages/QuizPage.jsx');
const practice=read('src/pages/PracticeResultsPage.jsx');
const results=read('src/pages/ResultsPage.jsx');
assert(!home.includes('asp-home-panel'),'Duplicated ASP domains panel removed from Home & My learning');
assert(home.includes('Explore courses')&&home.includes('course-grid'),'Course discovery preserved');
assert(!layout.includes("['/saved'"),'Saved item removed from learner menu');
assert(!app.includes('path="/saved"'),'Saved questions page no longer routable');
assert(app.includes('path="/question-bank" element={<AdminOnly>'),'Admin question bank still protected');
assert(bank.includes('bank-course-selector')&&bank.includes('getCourseBank(state,c.id,questionPool)'));
assert(!bank.includes('saveQuestion')&&!bank.includes('bank-save'),'No bookmark control in admin question bank');
for(const [page,body] of [['Quiz',quiz],['Practice results',practice],['Assessment review',results]]){
 assert(!body.includes('saveQuestion')&&!body.includes('savedQuestions'),'No save-question action in '+page);
}
assert(!store.includes('function saveQuestion')&&!store.includes('saveQuestion,submit'),'Removed obsolete bookmark API');
assert(quiz.includes('Flag for review'),'Flagging during the quiz is retained');
console.log('PASS: ASP panel, Saved navigation/route and per-question bookmarking removed; course discovery, flagged questions, learner results, and admin-only Question Bank preserved.');
