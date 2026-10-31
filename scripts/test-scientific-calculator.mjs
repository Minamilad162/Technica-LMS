import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import{evaluateScientific as evaluate,formatScientific as fmt,toFraction,oneVariableStats,twoVariableStats}from'../src/lib/scientificCalculator.js';

const approx=(label,actual,want,tolerance=1e-9)=>{
 assert.ok(Number.isFinite(actual),label+' nonfinite');
 assert.ok(Math.abs(actual-want)<=Math.max(tolerance,Math.abs(want)*tolerance),label+': '+actual+' != '+want);
};
const vectors=[
 ['2+3*4',14],['(2+3)*4',20],['2^3^2',512],['-2^2',-4],['(-2)^2',4],
 ['25%*200',50],['3(4+5)',27],['2pi',2*Math.PI],['(2+3)(4+1)',25],
 ['sqrt(81)',9],['√(81)',9],['cbrt(-8)',-2],['root(3,27)',3],['abs(-8)',8],
 ['log(1000)',3],['ln(e)',1],['log2(16)',4],['exp(0)',1],['pow10(2)',100],
 ['sin(30)',.5],['cos(60)',.5],['tan(45)',1],['asin(.5)',30],['acos(.5)',60],
 ['atan(1)',45],['sinh(0)',0],['cosh(0)',1],['tanh(0)',0],['asinh(0)',0],
 ['acosh(1)',0],['atanh(0)',0],['5!',120],['nCr(5,2)',10],['nPr(5,2)',20],
 ['7mod(4,3)',7],['mod(7,3)',1],['1/3+1/6',.5],['mixed(2,1,2)',2.5],
 ['3×4+5÷2',14.5],['6−2',4],['10^(-3)',.001],['3²',9],['2³',8],
 ['2Ans',8],['M+2',12],['x^2+1',10],['round(2.6)',3],['floor(2.9)',2],['ceil(2.1)',3],
 ['5E-3',.005],['2^(-3)',.125],['inv(2)',.5]
];
for(const [expr,want] of vectors){
 const opts={ans:4,memory:10,x:3};
 approx(expr,evaluate(expr,opts),want);
}
approx('sin RAD',evaluate('sin(pi/2)',{angleMode:'RAD'}),1);
approx('sin GRAD',evaluate('sin(100)',{angleMode:'GRAD'}),1);
approx('asin RAD',evaluate('asin(1)',{angleMode:'RAD'}),Math.PI/2);
assert.equal(fmt(.75,{asFraction:true}),'3/4');
assert.equal(fmt(2.5,{asFraction:true,mixed:true}),'2 1/2');
assert.equal(fmt(10,{notation:'SCI'}),'1e+1');
assert.equal(fmt(123456,{notation:'ENG'}),'123.456e3');
assert.equal(fmt(1.234567,{digits:2}),'1.23');
assert.deepEqual(toFraction(.125),{numerator:1,denominator:8,whole:0,part:1});
const stats=oneVariableStats('1,2,3,4');
approx('mean',stats.mean,2.5);approx('median',stats.median,2.5);
approx('pop standard deviation',stats.sigmaX,Math.sqrt(1.25));
const regression=twoVariableStats('1,2;2,4;3,6');
approx('regression slope',regression.slope,2);approx('regression intercept',regression.intercept,0);approx('r',regression.r,1);
const failures=['1/0','sqrt(-1)','log(0)','tan(90)','fact(-1)','171!','nCr(4,7)','nPr(7,8)','hello(1)','alert(1)','1+','(1+2','1$4','mixed(2,1,0)','sin(1,2)','2**3','randInt(3,1)'];
for(const expr of failures)assert.throws(()=>evaluate(expr),undefined,'expected rejected '+expr);
assert.throws(()=>evaluate('1'.repeat(221)),/too long/);
const dice=evaluate('randInt(1,6)');
assert.ok(Number.isInteger(dice)&&dice>=1&&dice<=6);
const random=evaluate('rand()');assert.ok(random>=0&&random<1);
const component=readFileSync(new URL('../src/components/ScientificCalculator.jsx',import.meta.url),'utf8');
const quiz=readFileSync(new URL('../src/pages/QuizPage.jsx',import.meta.url),'utf8');
const learning=readFileSync(new URL('../src/pages/LearningPage.jsx',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/scientificCalculator.css',import.meta.url),'utf8');
assert.match(quiz,/ScientificCalculator context=\{isPractice\?'Practice':'Assessment'\}/,'both practice and assessment share the calculator');
assert.match(learning,/ScientificCalculator context="Lesson Quiz"/,'lesson knowledge check has calculator');
assert.match(main,/scientificCalculator\.css/,'calculator styles loaded');
assert.match(component,/createPortal/);
assert.match(component,/onPointerDown=\{dragStart\}/);
assert.match(component,/document\.addEventListener\('keydown'/);
assert.match(component,/e\.target/); // keyboard respects focused answer/input controls
assert.match(css,/@media\(max-width:700px\)/);
assert.match(css,/position:fixed/);
assert.doesNotMatch(component,/Texas Instruments|TI-30XS|<img[^>]+src=/);
console.log('PASS: '+vectors.length+' scientific calculation vectors, 3 angle tests, fraction/notation, regression stats, '+failures.length+' invalid inputs, RNG bounds, mouse/keyboard, and all 3 quiz entry points.');
