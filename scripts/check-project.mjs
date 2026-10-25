import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const requireFile=(p)=>{if(!existsSync(join(root,p)))throw Error(`Missing: ${p}`)};
const pages=['HomePage','PracticePage','AnalyticsPage','BuilderPage','AssessmentOverview','QuizPage','ResultsPage'];
const refs=['01_learning_workspace','02_build_your_practice','03_learning_analytics','04_course_builder','05_assessment_overview','06_assessment_in_progress','07_results_review'];
const app=readFileSync(join(root,'src/App.jsx'),'utf8');
for(const page of pages)requireFile(`src/pages/${page}.jsx`);
requireFile('src/pages/AuthPage.jsx');
requireFile('src/lib/demoAuth.js');
for(const route of ['/login','/signup','/forgot-password'])if(!app.includes(`path="${route}"`))throw Error(`Missing authentication route: ${route}`);
for(const ref of refs)requireFile(`design-reference/${ref}.jpeg`);
for(const path of ['/home','/practice','/analytics','/builder','/assessments','/assessments/take','/results']){
  if(!app.includes(`path="${path}"`))throw Error(`Missing route: ${path}`);
}
const imgs=readdirSync(join(root,'public/images')).filter(f=>f.endsWith('.webp'));
if(imgs.length<10)throw Error('Missing industrial art assets');
requireFile('supabase/001_lms_schema_PROPOSED.sql');
console.log(`PASS: ${pages.length} core screen components, ${refs.length} original reference images, ${imgs.length} local images, core routes and planned Supabase schema.`);
console.log('Note: this is a source integrity check, not a Vite production build or browser test.');
