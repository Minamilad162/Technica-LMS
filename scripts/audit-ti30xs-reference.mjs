import assert from 'node:assert/strict';
import{evaluateScientific as calc,formatScientific}from'../src/lib/scientificCalculator.js';
import{exactScientific,formatWithMode,statsFromLists,applyConstantOperator,makeFunctionTable,recalculateListFormulas}from'../src/lib/scientificCalculatorExtended.js';
import{seededCalculatorRandom}from'../src/lib/calculatorRandom.js';
import{finishCalculatorEntry}from'../src/lib/calculatorEntry.js';
import{createMathDocument,insertMathTemplate,mathFieldIds,updateMathField,serializeMathDocument,removeMathTemplate,mathDocumentDepth}from'../src/lib/mathTemplateEditor.js';
import{exactRationalExpression,fractionString,formatCalculatorDisplay}from'../src/lib/calculatorPrecision.js';
const near=(actual,expected,label,tol=1e-10)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=Math.max(1,Math.abs(expected))*tol,label+': '+actual+' != '+expected);
let checks=0;
const same=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++};
const close=(actual,expected,label)=>{near(actual,expected,label);checks++};
const rejected=(expr,regex,opts={})=>{assert.throws(()=>calc(expr,opts),regex,expr);checks++};
const vectors=[
 ['2+3*4',14],['4(2+3)',20],['3.5e-4',.00035],['.125+0.375',.5],
 ['25%*320',80],['1/3+1/6',.5],['-2^2',-4],['(-2)^2',4],
 ['3²²',81],['10^(-2)',.01],['root(3,-8)',-2],
 ['root(-3,-8)',-.5],['log(1000)',3],['ln(e)',1],['pow10(3)',1000],
 ['sqrt(49)',7],['cbrt(-125)',-5],['mod(17,5)',2],
 ['inv(4)',.25],['sin(30)',.5],['cos(60)',.5],['tan(45)',1],
 ['asin(.5)',30],['acos(.5)',60],['atan(1)',45],['nPr(8,3)',336],
 ['nCr(25,3)',2300],['6!',720],['0!',1],['dms(30,15,0)',30.25],
 ['RtoPr(3,4)',5],['PtoRy(5,30)',2.5]
];
for(const [expression,value]of vectors)close(calc(expression),value,expression);
close(calc('sin(pi/2)',{angleMode:'RAD'}),1,'Radian sin');
close(calc('sin(100)',{angleMode:'GRAD'}),1,'Gradian sin');
same(finishCalculatorEntry('2*(3+4'),'2*(3+4)','TI Enter auto closes pending parentheses');
same(finishCalculatorEntry('(2+(3+4))'),'(2+(3+4))','Balanced parens preserved');
assert.throws(()=>finishCalculatorEntry('2*(3+4))'),/Unexpected closing/);checks++;
assert.throws(()=>finishCalculatorEntry('('.repeat(24)+'1'),/23 maximum/);checks++;
same(calc('2^3^2',{viewMode:'CLASSIC'}),64,'Classic associativity');
same(calc('2^3^2',{viewMode:'MATH'}),512,'Textbook associativity');
same(fractionString(exactRationalExpression('0.1+0.2')),'3/10','Exact decimal rational');
same(fractionString(exactRationalExpression('1/3+1/6')),'1/2','Exact fraction');
same(formatCalculatorDisplay(1/3),'0.3333333333','10 significant digits');
same(formatCalculatorDisplay(12.3456,{fixed:2}),'12.35','FIX 2');
same(formatWithMode(1/4,{asFraction:true}),'1/4','Result fraction');
same(exactScientific(Math.sqrt(8),'sqrt(8)').radicand,2,'Integer radical');
rejected('70!',/0 to 69/);rejected('fact(70)',/0 to 69/);
rejected('root(2,-4)',/Even root/);rejected('1/0',/Division by zero/);
rejected('log(0)',/Math error/);rejected('tan(90)',/undefined/);
rejected('asin(2)',/Math error/);rejected('nPr(1.2,1)',/invalid integers/);
rejected('nCr(3,4)',/invalid integers/);
const rngA=seededCalculatorRandom(12345),rngB=seededCalculatorRandom(12345);
for(let j=0;j<12;j++){
 const a=calc('rand()',{random:rngA}),b=calc('rand()',{random:rngB});
 same(a,b,'Seed reproducibility '+j);
 assert.ok(a>=0&&a<1,'RNG bounds');
}
const rnd=seededCalculatorRandom(14);
for(let j=0;j<20;j++){const n=calc('randInt(2,5)',{random:rnd});assert.ok(n>=2&&n<=5&&Number.isInteger(n));checks++}
assert.throws(()=>seededCalculatorRandom(-1),/seed/i);checks++;
assert.throws(()=>seededCalculatorRandom(1.4),/seed/i);checks++;
same(applyConstantOperator(4,'*2+3'),11,'TI K operator syntax');
same(applyConstantOperator(6,'*2+3'),15,'TI K second example');
assert.throws(()=>applyConstantOperator(4,'x+'+'3'.repeat(44)),/44/);checks++;
const base={L1:[1,2,3],L2:[],L3:[],formulas:{L2:'L1*2',L3:'L2+1'}};
const linked=recalculateListFormulas(base);
same(linked.L2,[2,4,6],'Dependent L2 formula');
same(linked.L3,[3,5,7],'Dependent L3 formula');
assert.throws(()=>recalculateListFormulas({...base,formulas:{L1:'L2+1',L2:'L1+1'}}),/Circular/);checks++;
assert.throws(()=>recalculateListFormulas({...base,L2:[5],formulas:{L3:'L1+L2'}}),/DIM MISMATCH/);checks++;
assert.throws(()=>recalculateListFormulas({...base,formulas:{L2:'x+1'}}),/must reference/);checks++;
const one=statsFromLists({L1:[1,2,3],L2:[1,1,1]},'1var','L1','L2','L2');
close(one.mean,2,'Frequency mean');close(one.sX,1,'Sample SD');close(one.sigmaX,Math.sqrt(2/3),'Population SD');
assert.throws(()=>statsFromLists({L1:[1,2],L2:[100,1]},'1var','L1','L2','L2'),/0–99/);checks++;
assert.throws(()=>statsFromLists({L1:[1,2],L2:[-1,2]},'1var','L1','L2','L2'),/0–99/);checks++;
same(makeFunctionTable('x^2',{start:0,step:2,count:3}),[{x:0,y:0},{x:2,y:4},{x:4,y:16}],'TABLE auto');
same(makeFunctionTable('x+1',{mode:'ask',values:[10,20]}),[{x:10,y:11},{x:20,y:21}],'TABLE ASK-X');
let doc=createMathDocument('');
const inserted=insertMathTemplate(doc,mathFieldIds(doc)[0],'fraction');doc=inserted.doc;
let ids=mathFieldIds(doc);doc=updateMathField(doc,ids[1],'2');doc=updateMathField(doc,ids[2],'5');
same(serializeMathDocument(doc),'((2)/(5))','Textbook fractional template');
const deleted=removeMathTemplate(doc,ids[1]);same(serializeMathDocument(deleted.doc),'','Template removal');
let nested=createMathDocument(''),focusId=mathFieldIds(nested)[0];
for(let n=0;n<4;n++){
 const v=insertMathTemplate(nested,focusId,'squareRoot');nested=v.doc;focusId=v.focusId;
}
same(mathDocumentDepth(nested),4,'Four nested templates');
assert.throws(()=>insertMathTemplate(nested,focusId,'fraction'),/Maximum 4/);checks++;
console.log('PASS TI reference-guided functional checks:',checks);
console.log('SCOPE: functional and bounded source checks only; not a hardware/display firmware-equivalence certification.');
