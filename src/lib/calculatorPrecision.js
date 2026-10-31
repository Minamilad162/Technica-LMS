/**
 * Bounded exact rational arithmetic for rational expressions.
 * Numerators and denominators use BigInt; no eval, code execution or imports.
 * Trigonometry and irrational expressions use existing JS floating math engine.
 */
const LIMIT=260;
const abs=x=>x<0n?-x:x;
const gcd=(a,b)=>{a=abs(a);b=abs(b);while(b){const t=a%b;a=b;b=t}return a||1n};
const fraction=(n,d=1n)=>{
 if(d===0n)throw Error('Division by zero');
 if(d<0n){n=-n;d=-d}
 const g=gcd(n,d);
 const x={n:n/g,d:d/g};
 if(x.n.toString().length>LIMIT||x.d.toString().length>LIMIT)throw Error('Exact calculation too large');
 return x;
};
const add=(a,b)=>fraction(a.n*b.d+b.n*a.d,a.d*b.d);
const sub=(a,b)=>fraction(a.n*b.d-b.n*a.d,a.d*b.d);
const mul=(a,b)=>fraction(a.n*b.n,a.d*b.d);
const div=(a,b)=>fraction(a.n*b.d,a.d*b.n);
function pow(a,b){
 if(b.d!==1n||abs(b.n)>100n)throw Error('Exact exponent too large or noninteger');
 const n=Number(abs(b.n)),v=fraction(a.n**BigInt(n),a.d**BigInt(n));
 return b.n<0n?fraction(v.d,v.n):v;
}
function literal(value){
 const m=value.match(/^(\d*\.?\d+)(?:[eE]([+-]?\d+))?$/);
 if(!m)throw Error('Unsupported exact number');
 const [raw,exponent]=[m[1],Number(m[2]||0)];
 if(Math.abs(exponent)>100)throw Error('Exact exponent too large');
 const decimals=(raw.split('.')[1]||'').length;
 const digits=raw.replace('.','');
 const n=BigInt(digits)*10n**BigInt(Math.max(0,exponent-decimals));
 const d=10n**BigInt(Math.max(0,decimals-exponent));
 return fraction(n,d);
}
export function exactRationalExpression(expression,{mode='MATH'}={}){
 const input=String(expression||'').replace(/[×]/g,'*').replace(/[÷]/g,'/').replace(/[−]/g,'-').replace(/[²]/g,'^2').replace(/[³]/g,'^3').replace(/٪/g,'%');
 if(input.length>220||!input.trim()||!/^[\d.eE+\-*/^()%\s]+$/.test(input))return null;
 const tokens=[];let i=0;
 try{
  while(i<input.length){
   if(/\s/.test(input[i])){i++;continue}
   const number=input.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
   if(number){tokens.push({type:'num',value:literal(number[0])});i+=number[0].length;continue}
   if('+-*/^()%'.includes(input[i])){tokens.push({type:input[i++]});continue}
   return null;
  }
  tokens.push({type:'end'});
  let pos=0,depth=0;
  const peek=()=>tokens[pos];
  function parse(min=0){
   if(++depth>30)throw Error('Nested exact math too complex');
   const t=tokens[pos++];let left;
   if(t.type==='num')left=t.value;
   else if(t.type==='-')left=mul(fraction(-1n),parse(29));
   else if(t.type==='+')left=parse(29);
   else if(t.type==='('){left=parse();if(tokens[pos++]?.type!==')')throw Error('Missing )')}
   else throw Error('Invalid exact expression');
   while(true){
    const op=peek()?.type;
    if(op==='%'&&50>=min){pos++;left=div(left,fraction(100n));continue}
    let lbp,rbp,operator=op,implicit=false;
    if(op==='+'||op==='-'){lbp=10;rbp=11}
    else if(op==='*'||op==='/'){lbp=20;rbp=21}
    else if(op==='^'){lbp=30;rbp=mode==='CLASSIC'?31:30}
    else if(op==='num'||op==='('){lbp=20;rbp=21;operator='*';implicit=true}
    else break;
    if(lbp<min)break;
    if(!implicit)pos++;
    const right=parse(rbp);
    left=operator==='+'?add(left,right):operator==='-'?sub(left,right):operator==='*'?mul(left,right):operator==='/'?div(left,right):pow(left,right);
   }
   depth--;return left;
  }
  const value=parse();
  return peek()?.type==='end'?value:null;
 }catch{return null}
}
export function exactRationalNumber(exact){
 if(!exact)return null;
 const n=Number(exact.n),d=Number(exact.d);
 if(!Number.isFinite(n)||!Number.isFinite(d)||d===0)return null;
 return n/d;
}
export function fractionString(exact){
 return exact?String(exact.n)+(exact.d===1n?'':'/'+exact.d):null;
}
export function formatCalculatorDisplay(value,{notation='NORM',fixed=null,digits=10}={}){
 if(!Number.isFinite(value))return 'Math error';
 if(Object.is(value,-0)||value===0)return fixed!==null&&fixed!==undefined?Number(0).toFixed(fixed):'0';
 const p=Math.max(1,Math.min(10,Number(digits)));
 if(fixed!==null&&fixed!==undefined){
  const n=Math.min(9,Math.max(0,Number(fixed)));
  const rounded=Number(value.toPrecision(p));
  return rounded.toFixed(n);
 }
 if(notation==='SCI')return value.toExponential(p-1).replace(/\.?0+e/,'e');
 if(notation==='ENG'){
  const exp=Math.floor(Math.log10(Math.abs(value))/3)*3;
  return Number((value/Math.pow(10,exp)).toPrecision(p))+'e'+exp;
 }
 const rounded=Number(value.toPrecision(p));
 if(Math.abs(rounded)>=1e10||Math.abs(rounded)<1e-9)return rounded.toExponential(p-1).replace(/\.?0+e/,'e');
 return String(rounded);
}
