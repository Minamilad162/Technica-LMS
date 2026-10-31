import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateScientific} from '../src/lib/scientificCalculator.js';
import {exactRationalExpression,exactRationalNumber,fractionString,formatCalculatorDisplay} from '../src/lib/calculatorPrecision.js';
import {recalculateListFormulas,exactScientific,formatWithMode} from '../src/lib/scientificCalculatorExtended.js';
import{
 createMathDocument,findMathField,insertMathTemplate,mathFieldIds,mathFieldContext,
 updateMathField,serializeMathDocument,mathDocumentDepth,removeMathTemplate
}from'../src/lib/mathTemplateEditor.js';

const near=(x,y,description)=>assert.ok(Math.abs(x-y)<=Math.max(1,Math.abs(y))*1e-12,description+': '+x+' !== '+y);
const rationalCases=[
 ['1/3+1/6','1/2'],['0.1+0.2','3/10'],['(1/3)*(6/5)','2/5'],
 ['1/3*3','1'],['5/2-3/4','7/4'],['(1+2)/(3+4)','3/7'],
 ['2^(-3)','1/8'],['3^4','81'],['2^3^2','512'],['1/3+2/3','1'],
 ['.125+0.375','1/2'],['1e-3+2e-3','3/1000'],['9%','9/100']
];
for(const [expression,want]of rationalCases){
 const exact=exactRationalExpression(expression);
 assert.equal(fractionString(exact),want,'Exact '+expression);
 near(evaluateScientific(expression),exactRationalNumber(exact),'Numeric '+expression);
}
assert.equal(fractionString(exactRationalExpression('2^3^2',{mode:'CLASSIC'})),'64');
assert.equal(evaluateScientific('2^3^2',{viewMode:'CLASSIC'}),64);
assert.equal(evaluateScientific('2^3^2',{viewMode:'MATH'}),512);
for(const input of ['1/0','(1/2','sin(1)','hello','2^(-101)'])assert.equal(exactRationalExpression(input),null);
assert.equal(formatCalculatorDisplay(1/3),'0.3333333333');
assert.equal(formatCalculatorDisplay(0.1+0.2),'0.3');
assert.equal(formatCalculatorDisplay(12.34567,{fixed:2}),'12.35');
assert.equal(formatWithMode(1/3),'0.3333333333');
assert.equal(formatCalculatorDisplay(1234567890.123),'1234567890');
assert.match(formatCalculatorDisplay(1e-12),/e-/);
assert.equal(formatCalculatorDisplay(0,{fixed:2}),'0.00');
assert.equal(exactScientific(1/2,'1/3+1/6').numerator,1);
assert.equal(exactScientific(1/2,'1/3+1/6').denominator,2);

let doc=createMathDocument();
let first=mathFieldIds(doc)[0];
let add=insertMathTemplate(doc,first,'fraction',0);
doc=add.doc;
assert.equal(mathDocumentDepth(doc),1);
const deleted=removeMathTemplate(doc,add.focusId);
assert.equal(serializeMathDocument(deleted.doc),'');
assert.ok(mathFieldIds(deleted.doc).includes(deleted.focusId));
assert.throws(()=>removeMathTemplate(deleted.doc,deleted.focusId),/No active/);
const numerator=add.focusId;
doc=updateMathField(doc,numerator,'1+1');
let fields=mathFieldIds(doc);
assert.equal(fields.length,4);
const denominator=fields[2];
doc=updateMathField(doc,denominator,'3');
assert.equal(serializeMathDocument(doc),'((1+1)/(3))');
near(evaluateScientific(serializeMathDocument(doc)),2/3,'Nested fraction calculator');
assert.deepEqual(mathFieldContext(doc,numerator),{parentId:add.nodeId,parentType:'fraction',field:'numerator'});
// A square root inside numerator, and fraction inside that root, then power => four levels.
let step=insertMathTemplate(doc,numerator,'squareRoot',3);
doc=step.doc;
let second=insertMathTemplate(doc,step.focusId,'fraction');
doc=second.doc;
let third=insertMathTemplate(doc,second.focusId,'power');
doc=third.doc;
assert.equal(mathDocumentDepth(doc),4);
assert.throws(()=>insertMathTemplate(doc,third.focusId,'fraction'),/Maximum 4 nested/);
assert.throws(()=>serializeMathDocument(doc),/Fill the/);
let empty=createMathDocument('2');
let power=insertMathTemplate(empty,mathFieldIds(empty)[0],'power',1);
empty=updateMathField(power.doc,power.focusId,'3');
assert.equal(serializeMathDocument(empty),'2^(3)');
assert.equal(evaluateScientific(serializeMathDocument(empty)),8);
let root=createMathDocument();
let sq=insertMathTemplate(root,mathFieldIds(root)[0],'squareRoot');
root=updateMathField(sq.doc,sq.focusId,'8');
assert.equal(serializeMathDocument(root),'sqrt(8)');
let mixed=createMathDocument();
let mix=insertMathTemplate(mixed,mathFieldIds(mixed)[0],'mixed');
mixed=mix.doc;
const mixFields=mathFieldIds(mixed);
mixed=updateMathField(mixed,mixFields[1],'2');
mixed=updateMathField(mixed,mixFields[2],'1');
mixed=updateMathField(mixed,mixFields[3],'3');
assert.equal(serializeMathDocument(mixed),'mixed(2,1,3)');
near(evaluateScientific(serializeMathDocument(mixed)),7/3,'Mixed field calculation');
for(const kind of ['nthRoot','exp10','expE']){
 const temp=createMathDocument();const inserted=insertMathTemplate(temp,mathFieldIds(temp)[0],kind);
 assert.ok(serializeMathDocument(inserted.doc,{allowIncomplete:true}).length>2,kind);
}
assert.throws(()=>updateMathField(doc,'missing','x'),/not found/);
const raw={L1:[1,2,3],L2:[],L3:[],formulas:{L2:'L1*2',L3:'L2+10'}};
const initial=recalculateListFormulas(raw);
assert.deepEqual(initial.L2,[2,4,6]);assert.deepEqual(initial.L3,[12,14,16]);
const updated=recalculateListFormulas({...raw,L1:[4,5,6]});
assert.deepEqual(updated.L2,[8,10,12]);assert.deepEqual(updated.L3,[18,20,22]);
assert.throws(()=>recalculateListFormulas({...raw,formulas:{L1:'L2+1',L2:'L1+1'}}),/Circular list formula/);
const ui=readFileSync(new URL('../src/components/ScientificCalculator.jsx',import.meta.url),'utf8');
const editor=readFileSync(new URL('../src/components/MathTemplateEditor.jsx',import.meta.url),'utf8');
const lists=readFileSync(new URL('../src/components/CalculatorAdvancedPanels.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/scientificCalculator.css',import.meta.url),'utf8');
assert.match(ui,/MathTemplateEditor/);
assert.match(ui,/serializeMathDocument\(mathDoc\)/);
assert.match(ui,/viewMode==='MATH'/);
assert.match(ui,/viewMode==='CLASSIC'/);
assert.match(ui,/mathEditor.current\?\.insertTemplate/);
assert.match(editor,/Ctrl\+\/ fraction/);
assert.match(editor,/ArrowDown/);
assert.match(editor,/onEvaluate/);
assert.match(css,/tc-math-fraction/);
assert.match(css,/tc-math-entry-scroll/);
assert.match(lists,/recalculateListFormulas/);
console.log('PASS: '+rationalCases.length+' exact-rational cases, Classic/MathPrint exponent order, 10-digit display, nested editable math templates, guarded 4-depth, 3-list formula propagation and UI integration.');
