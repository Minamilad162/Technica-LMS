/* Original Technica extensions for textbook-like exact results, TI-style lists,
   memories, angle tools and constant operator. No vendor firmware/emulation. */
import {evaluateScientific,formatScientific,toFraction,oneVariableStats,twoVariableStats} from './scientificCalculator.js';
import {exactRationalExpression,formatCalculatorDisplay} from './calculatorPrecision.js';
export const STORED_VARIABLES=Object.freeze(['x','y','z','t','a','b','c']);
export const freshVariables=()=>Object.fromEntries(STORED_VARIABLES.map(k=>[k,0]));
const finite=v=>{if(!Number.isFinite(v))throw Error('Math error');return Object.is(v,-0)?0:v};
const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
const sign=(v)=>v<0?-1:1;
export function exactScientific(value,expression=''){
 if(!Number.isFinite(value)||Math.abs(value)>1e10)return null;
 const exp=String(expression).replace(/\s/g,'');
 // Prefer simple exact π multiples for input involving π.
 if(/(?:pi|π)/.test(exp)){
  const piFraction=toFraction(value/Math.PI,144);
  if(piFraction && Math.abs(value-piFraction.numerator/ piFraction.denominator*Math.PI)<1e-9){
   return {type:'pi',numerator:piFraction.numerator,denominator:piFraction.denominator};
  }
 }
 // Simplify integer radicals n=k²r rather than claiming arbitrary symbolic algebra.
 const radical=exp.match(/^(?:sqrt|√)\(?([0-9]{1,7})\)?$/);
 if(radical){
  const n=Number(radical[1]);
  if(n===0)return {type:'integer',value:'0'};
  let radicand=n,coefficient=1;
  for(let i=2;i*i<=radicand;i++){
   while(radicand%(i*i)===0){radicand/=(i*i);coefficient*=i}
  }
  if(radicand===1)return {type:'integer',value:String(coefficient)};
  return {type:'radical',coefficient,radicand};
 }
 // Rational display is only used for explicit rational input, not all measured decimals.
 if(/[/%]/.test(exp)||/^mixed\(/.test(exp)){
  const rational=exactRationalExpression(expression);
  if(rational){
   const n=Number(rational.n),d=Number(rational.d);
   if(Number.isSafeInteger(n)&&Number.isSafeInteger(d)&&d>0&&Math.abs(value-n/d)<1e-10)
     return {type:d===1?'integer':'fraction',numerator:n,denominator:d,value:String(n)};
  }
  const f=toFraction(value,100000);
  if(f&&Math.abs(value-f.numerator/f.denominator)<1e-10){
   return {type:f.denominator===1?'integer':'fraction',numerator:f.numerator,denominator:f.denominator,value:String(f.numerator)};
  }
 }
 return null;
}
export function formatExactPlain(exact){
 if(!exact)return null;
 if(exact.type==='integer')return exact.value;
 if(exact.type==='fraction')return exact.numerator+'/'+exact.denominator;
 if(exact.type==='radical')return (exact.coefficient===1?'':exact.coefficient)+'√'+exact.radicand;
 if(exact.type==='pi'){
  if(exact.numerator===0)return '0';
  return (exact.numerator===1?'':exact.numerator===-1?'-':exact.numerator)+'π'+(exact.denominator===1?'':'/'+exact.denominator);
 }
 return null;
}
export function convertAngle(value,from,to){
 const units={DEG:Math.PI/180,RAD:1,GRAD:Math.PI/200};
 if(!Object.hasOwn(units,from)||!Object.hasOwn(units,to))throw Error('Invalid angle units');
 return finite(value*units[from]/units[to]);
}
export function degreesToDMS(value,precision=3){
 finite(value);
 const abs=Math.abs(value),degrees=Math.floor(abs),minutesFloat=(abs-degrees)*60;
 let minutes=Math.floor(minutesFloat),seconds=Number(((minutesFloat-minutes)*60).toFixed(precision));
 let d=degrees;
 if(seconds>=60){seconds=0;minutes++}
 if(minutes>=60){minutes=0;d++}
 return {negative:value<0,degrees:d,minutes,seconds};
}
export function dmsToDegrees(degrees,minutes=0,seconds=0){
 if(![degrees,minutes,seconds].every(Number.isFinite)||minutes<0||minutes>=60||seconds<0||seconds>=60)throw Error('DMS requires 0 ≤ minutes/seconds < 60');
 return finite(sign(degrees)*(Math.abs(degrees)+minutes/60+seconds/3600));
}
export function formatDMS(v){
 const a=degreesToDMS(v);
 return (a.negative?'-':'')+a.degrees+'° '+String(a.minutes).padStart(2,'0')+'′ '+String(a.seconds).padStart(2,'0')+'″';
}
export function rectToPolar(x,y,mode='DEG'){
 finite(x);finite(y);
 return {r:Math.hypot(x,y),theta:convertAngle(Math.atan2(y,x),'RAD',mode)};
}
export function polarToRect(r,theta,mode='DEG'){
 finite(r);finite(theta);
 const radians=convertAngle(theta,mode,'RAD');
 return {x:finite(r*Math.cos(radians)),y:finite(r*Math.sin(radians))};
}
export function makeListState(){return {L1:[],L2:[],L3:[],formulas:{L1:'',L2:'',L3:''}}}
const validateList=arr=>{
 if(!Array.isArray(arr)||arr.length>42||arr.some(x=>!Number.isFinite(x)))throw Error('Each list must contain at most 42 finite values');
 return arr;
};
export function parseNumericList(raw){
 const input=String(raw||'').trim();
 if(!input)return [];
 const parts=input.split(/[;,\s]+/).filter(Boolean);
 if(parts.length>42)throw Error('Use 42 entries or fewer in each list');
 const numbers=parts.map(x=>Number(x));
 return validateList(numbers);
}
export function applyListFormula(lists,column,formula,options={}){
 if(!['L1','L2','L3'].includes(column))throw Error('Unknown list');
 const base=Object.fromEntries(['L1','L2','L3'].map(k=>[k,validateList(lists[k]||[])]));
 const rows=Math.max(0,...Object.values(base).map(x=>x.length));
 if(!rows)throw Error('Add list data before applying a formula');
 if(!formula||formula.length>110)throw Error('Enter a list formula');
 if(new RegExp('\\b'+column+'\\b').test(formula))throw Error('List formula cannot refer to itself');
 const values=Array.from({length:rows},(_,i)=>evaluateScientific(formula,{
  ...options,variables:{...options.variables,L1:base.L1[i]??0,L2:base.L2[i]??0,L3:base.L3[i]??0,x:i+1}
 }));
 validateList(values);
 return {...base,[column]:values};
}
const halfMedian=arr=>{
 if(!arr.length)return null;
 const i=Math.floor(arr.length/2);
 return arr.length%2?arr[i]:(arr[i-1]+arr[i])/2;
};
const quantiles=values=>{
 const sorted=[...values].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);
 return {Q1:halfMedian(sorted.slice(0,mid)),Q3:halfMedian(sorted.slice(sorted.length%2?mid+1:mid))};
};
/**
 * TI-style formula dependency propagation: change L1 recalculates formula-fed L2/L3.
 * Detect indirect circular references and restore raw independent list values.
 */
export function recalculateListFormulas(state,opts={}){
 const base=Object.fromEntries(['L1','L2','L3'].map(k=>[k, state[k]||[]]));
 const formulas={...(state.formulas||{})};
 const done=new Set(),active=new Set();
 function visit(k){
  if(done.has(k))return;
  if(active.has(k))throw Error('Circular list formula');
  active.add(k);
  const formula=String(formulas[k]||'').trim();
  if(formula){
   for(const other of ['L1','L2','L3']){
    if(new RegExp('\\b'+other+'\\b').test(formula)&&other!==k)visit(other);
   }
   if(new RegExp('\\b'+k+'\\b').test(formula))throw Error('Circular list formula');
   const result=applyListFormula(base,k,formula,opts);
   base[k]=result[k];
  }
  active.delete(k);done.add(k);
 }
 for(const k of ['L1','L2','L3'])visit(k);
 return {...base,formulas};
}
export function updateStoredList(state,key,values,opts={}){
 if(!['L1','L2','L3'].includes(key))throw Error('Unknown list');
 validateList(values);
 const formulas={...(state.formulas||{})};
 delete formulas[key];
 return recalculateListFormulas({...state,[key]:[...values],formulas},opts);
}

export function statsFromLists(lists,kind='1var',xKey='L1',yKey='L2',frequencyKey=null){
 const x=validateList(lists[xKey]||[]);
 if(!x.length)throw Error('Enter data in '+xKey);
 if(kind==='2var'){
  const y=validateList(lists[yKey]||[]);
  if(x.length!==y.length)throw Error('Lists for regression need equal lengths');
  const base=twoVariableStats(x.map((v,i)=>v+','+y[i]).join(';'));
  const n=x.length,sumX=x.reduce((a,b)=>a+b,0),sumY=y.reduce((a,b)=>a+b,0);
  return {...base,meanX:sumX/n,meanY:sumY/n,sumX,sumY,
   sumX2:x.reduce((a,b)=>a+b*b,0),sumY2:y.reduce((a,b)=>a+b*b,0),
   sumXY:x.reduce((a,b,i)=>a+b*y[i],0),
   predictY:base.slope!==null?'y = '+formatScientific(base.slope)+'x + '+formatScientific(base.intercept):null};
 }
 if(frequencyKey){
  const freq=validateList(lists[frequencyKey]||[]);
  if(x.length!==freq.length||freq.some(v=>v<0||v>99)||!freq.some(v=>v>0))throw Error('Invalid frequencies (0–99 per item)');
  const n=freq.reduce((a,b)=>a+b,0),sum=x.reduce((a,b,i)=>a+b*freq[i],0);
  if(!Number.isFinite(n)||n<=0||n>2000)throw Error('Frequency total must be 0–2000');
  const mean=sum/n,variance=x.reduce((a,b,i)=>a+freq[i]*(b-mean)**2,0)/n;
  // Integer frequencies admit an exact expanded median/quartile.
  const integer=freq.every(Number.isInteger);
  const expanded=integer?x.flatMap((v,i)=>Array.from({length:freq[i]},()=>v)).sort((a,b)=>a-b):[];
  const median=integer?halfMedian(expanded):null;
  const extra=integer?quantiles(expanded):{Q1:null,Q3:null};
  return {n,sum,mean,median,min:Math.min(...x),max:Math.max(...x),
   sumX2:x.reduce((a,b,i)=>a+freq[i]*b*b,0),sigmaX:Math.sqrt(Math.max(0,variance)),
   sX:integer&&n>1?Math.sqrt(variance*n/(n-1)):null,...extra};
 }
 const base=oneVariableStats(x.join(','));
 return {...base,sumX2:x.reduce((a,b)=>a+b*b,0),...quantiles(x)};
}
export function makeFunctionTable(formula,{mode='auto',start=0,step=1,values=[],count=8,angleMode='DEG',ans=0,memory=0,variables={}}={}){
 if(!formula||formula.length>220)throw Error('Enter f(x)');
 if(!['auto','ask'].includes(mode))throw Error('Unknown table mode');
 let xs;
 if(mode==='ask'){
  xs=validateList(values);
  if(!xs.length)throw Error('Enter x values');
 }else{
  if(!Number.isFinite(start)||!Number.isFinite(step)||step===0||count<1||count>25)throw Error('Invalid Start, Step or count');
  xs=Array.from({length:count},(_,i)=>finite(start+i*step));
 }
 return xs.map(x=>({x,y:evaluateScientific(formula,{angleMode,ans,memory,variables:{...variables,x},x})}));
}
export function applyConstantOperator(previousValue,expression,opts={}){
 if(!Number.isFinite(previousValue)||!String(expression).trim())throw Error('Enter a constant operation');
 if(!/\bx\b/.test(expression))throw Error('Use x as the previous answer, e.g. x+2');
 return evaluateScientific(expression,{...opts,x:previousValue,variables:{...opts.variables,x:previousValue}});
}
export function formatWithMode(value,{notation='NORM',fixed=null,asFraction=false,mixed=false}={}){
 if(asFraction)return formatScientific(value,{notation,digits:fixed,asFraction,mixed});
 return formatCalculatorDisplay(value,{notation,fixed});
}
