import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateScientific as evaluate} from '../src/lib/scientificCalculator.js';
import {
 STORED_VARIABLES,freshVariables,exactScientific,formatExactPlain,formatWithMode,
 convertAngle,degreesToDMS,dmsToDegrees,formatDMS,rectToPolar,polarToRect,
 parseNumericList,makeListState,applyListFormula,statsFromLists,makeFunctionTable,
 applyConstantOperator
} from '../src/lib/scientificCalculatorExtended.js';
const near=(a,b,description='value',epsilon=1e-9)=>{
 assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=epsilon*Math.max(1,Math.abs(b)),description+': '+a+' !== '+b);
};
assert.deepEqual(STORED_VARIABLES,['x','y','z','t','a','b','c']);
assert.deepEqual(freshVariables(),{x:0,y:0,z:0,t:0,a:0,b:0,c:0});
near(evaluate('x+y+z+t+a+b+c',{variables:{x:1,y:2,z:3,t:4,a:5,b:6,c:7}}),28,'Seven memory variables');
assert.throws(()=>evaluate('secret',{variables:{secret:42}}),/Unknown symbol/);
near(evaluate('2x+L1',{variables:{x:3,L1:4}}),10,'List formula memory');
near(evaluate('root(3,-8)'),-2,'Odd signed root');
near(evaluate('root(-3,-8)'),-.5,'Negative odd signed root');
assert.throws(()=>evaluate('root(2,-8)'),/Even root/);
near(evaluate('sin(rad(pi/6))',{angleMode:'DEG'}),.5,'Explicit radians in degree mode');
near(evaluate('sin(deg(30))',{angleMode:'RAD'}),.5,'Explicit degrees in radian mode');
near(evaluate('sin(grad(50))',{angleMode:'DEG'}),Math.SQRT1_2,'Explicit gradians');
near(evaluate('dms(30,15,30)'),30+15/60+30/3600,'DMS expression');
near(evaluate('RtoPr(3,4)'),5,'Rect radius');
near(evaluate('RtoPtheta(3,4)'),53.13010235415598,'Rect angle');
near(evaluate('PtoRx(5,30)'),5*Math.sqrt(3)/2,'Polar x');
near(evaluate('PtoRy(5,30)'),2.5,'Polar y');
const radical=exactScientific(Math.sqrt(8),'sqrt(8)');
assert.deepEqual(radical,{type:'radical',coefficient:2,radicand:2});
assert.equal(formatExactPlain(radical),'2√2');
assert.equal(formatExactPlain(exactScientific(9,'sqrt(81)')),'9');
assert.equal(formatExactPlain(exactScientific(Math.PI/2,'pi/2')),'π/2');
assert.equal(formatExactPlain(exactScientific(-Math.PI/3,'-pi/3')),'-π/3');
assert.equal(formatExactPlain(exactScientific(1/2,'1/3+1/6')),'1/2');
assert.equal(exactScientific(.123456789,'0.123456789'),null);
assert.equal(formatWithMode(11.2345,{fixed:2}),'11.23');
assert.equal(formatWithMode(1/3,{asFraction:true}),'1/3');
near(convertAngle(180,'DEG','RAD'),Math.PI,'Degrees to radians');
near(convertAngle(200,'GRAD','DEG'),180,'Gradians to degrees');
const val=39+26/60+23/3600;
const dms=degreesToDMS(val);
assert.deepEqual(dms,{negative:false,degrees:39,minutes:26,seconds:23});
near(dmsToDegrees(39,26,23),val,'DMS to decimal');
assert.equal(formatDMS(39.5),'39° 30′ 00″');
assert.throws(()=>dmsToDegrees(30,60,0),/DMS/);
near(rectToPolar(3,4,'DEG').r,5,'Polar radius');
near(rectToPolar(3,4,'DEG').theta,53.13010235415598,'Polar theta');
near(polarToRect(5,30,'DEG').x,5*Math.sqrt(3)/2,'Rectangle x');
near(polarToRect(5,30,'DEG').y,2.5,'Rectangle y');
assert.deepEqual(parseNumericList('1, 2; 3'),[1,2,3]);
assert.throws(()=>parseNumericList('1,not_a_number'),/finite/);
assert.throws(()=>parseNumericList(Array(44).fill(1).join(',')),/42/);
const lists=makeListState();
assert.deepEqual(lists,{L1:[],L2:[],L3:[],formulas:{L1:'',L2:'',L3:''}});
const sumList=applyListFormula({L1:[1,2,3],L2:[10,20,30],L3:[]},'L3','L1+L2');
assert.deepEqual(sumList.L3,[11,22,33]);
const indexed=applyListFormula({L1:[5,10],L2:[],L3:[]},'L3','L1*2+x');
assert.deepEqual(indexed.L3,[11,22]);
assert.throws(()=>applyListFormula({L1:[1],L2:[],L3:[]},'L1','L1+1'),/cannot refer to itself/);
const single=statsFromLists({L1:[1,2,3,4]},'1var');
near(single.mean,2.5);near(single.Q1,1.5);near(single.Q3,3.5);near(single.sumX2,30);
const weighted=statsFromLists({L1:[10,20],L2:[1,.5]},'1var','L1','L2','L2');
near(weighted.n,1.5);near(weighted.mean,40/3);assert.equal(weighted.sX,null);
const regression=statsFromLists({L1:[1,2,3],L2:[2,4,6]},'2var');
near(regression.slope,2);near(regression.sumXY,28);
near(regression.sumX2,14);near(regression.meanY,4);
const auto=makeFunctionTable('x^2',{start:-1,step:1,count:3});
assert.deepEqual(auto,[{x:-1,y:1},{x:0,y:0},{x:1,y:1}]);
const ask=makeFunctionTable('2x+1',{mode:'ask',values:[0,2,10]});
assert.deepEqual(ask,[{x:0,y:1},{x:2,y:5},{x:10,y:21}]);
assert.throws(()=>makeFunctionTable('x',{start:1,step:0}),/Invalid/);
near(applyConstantOperator(6,'x+2'),8);
near(applyConstantOperator(8,'x+2'),10);
assert.throws(()=>applyConstantOperator(8,'2+2'),/Use x/);
const comp=readFileSync(new URL('../src/components/ScientificCalculator.jsx',import.meta.url),'utf8');
const advanced=readFileSync(new URL('../src/components/CalculatorAdvancedPanels.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/scientificCalculator.css',import.meta.url),'utf8');
for(const s of ['VariablePanel','ListPanel','AnglePanel','ConstantPanel','makeFunctionTable','exactScientific','viewMode','setFixed','setShowExact']){
 assert.ok(comp.includes(s),'Calculator must integrate '+s);
}
assert.match(comp,/function ExactOutput/);
assert.match(comp,/tc-exact-fraction/);
assert.match(advanced,/applyListFormula/);
assert.match(advanced,/applyConstantOperator/);
assert.match(css,/tc-calc-display-settings/);
assert.match(css,/tc-exact-fraction/);
assert.doesNotMatch(comp,/\beval\s*\(/);
console.log('PASS: TI-style extended calculator, exact fractions/pi/radicals, modes, seven registers, angle/DMS, 3 lists, formulas, weighted statistics, Auto/Ask-x table, K operator, UI wiring.');
