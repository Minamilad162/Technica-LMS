import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOTION_PLANS,getPageMotionPlan,capMotionDelay,MAX_ENTRANCE_DELAY_MS} from '../src/lib/motionPlan.js';
const mandatory = ['/login','/signup','/home','/my-learning','/practice','/analytics','/builder','/assessments','/results','/learners','/question-bank','/assessments/take','/practice/session','/practice/results'];
for(const route of mandatory){
  const plan=getPageMotionPlan(route);
  assert(plan.length>1,`No animation plan for ${route}`);
  for(const group of plan){
    assert(group.selector && group.max>0,`Missing beat selector for ${route}`);
    assert(group.start>=0 && group.step>=0,`Invalid timing for ${route}`);
    assert(['fade','up','pop','left','right'].includes(group.variant),`Unknown variant for ${route}`);
  }
}
assert.equal(getPageMotionPlan('/assessments/take'),MOTION_PLANS.quiz);
assert(MOTION_PLANS.quiz.every(g => !/answer-options|timer-badge|question-numbers|answer-option/.test(g.selector)), 'Quiz interaction must never be delayed');
assert.equal(capMotionDelay(10000,true),MAX_ENTRANCE_DELAY_MS);
assert.equal(capMotionDelay(10000,false),110);
assert.equal(capMotionDelay(-30,true),0);
const motion=readFileSync(new URL('../src/components/MotionSystem.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/motion.css',import.meta.url),'utf8');
const quiz=readFileSync(new URL('../src/pages/QuizPage.jsx',import.meta.url),'utf8');
assert(motion.includes("prefers-reduced-motion: reduce"));
assert(motion.includes('IntersectionObserver'));
assert(motion.includes('MutationObserver'));
assert(motion.includes('[pathname,key]'), 'Revisit should re-run on navigation');
assert(css.includes('.motion-playing') && css.includes('@keyframes tc-content-arrive'));
assert(css.includes('@media (max-width:700px)'));
assert(css.includes('@media (prefers-reduced-motion:reduce)'));
assert(quiz.includes('key={`answers-${current}`}') && quiz.includes('key={`prompt-${current}`}'));
console.log(`PASS: ${mandatory.length} routes, ${Object.keys(MOTION_PLANS).length} choreographies, animation limits, mobile, accessibility, and question transitions.`);
