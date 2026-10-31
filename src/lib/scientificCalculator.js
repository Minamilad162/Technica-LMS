/**
 * Technica scientific calculator — independent pure-math engine.
 * Do not eval expressions or download a third-party calculator/emulator.
 * Formulae are parsed explicitly. Values are JS double precision.
 */
const ANGLE={DEG:Math.PI/180,RAD:1,GRAD:Math.PI/200};
const MAX_LEN=220,MAX_DEPTH=44;
const finite=(v)=>{if(!Number.isFinite(v))throw Error('Math error');return Object.is(v,-0)?0:v};
const factorial=(n)=>{if(!Number.isInteger(n)||n<0||n>170)throw Error('Factorial: use an integer from 0 to 170');let r=1;for(let i=2;i<=n;i++)r*=i;return finite(r)};
const choose=(n,r)=>{if(!Number.isInteger(n)||!Number.isInteger(r)||r<0||n<r||n<0||n>170)throw Error('nCr: invalid integers');let z=1;for(let k=1;k<=Math.min(r,n-r);k++)z=z*(n-k+1)/k;return finite(z)};
const permute=(n,r)=>{if(!Number.isInteger(n)||!Number.isInteger(r)||r<0||n<r||n<0||n>170)throw Error('nPr: invalid integers');let z=1;for(let k=0;k<r;k++)z*=n-k;return finite(z)};
const clean=(x)=>{if(x<0&&Math.abs(x)<1e-12)return 0;return finite(x)};
const toRad=(n,mode)=>n*ANGLE[mode],fromRad=(n,mode)=>n/ANGLE[mode];
const calcFunction=(name,args,mode)=>{
 const x=args[0],z=args[1];
 const unary=()=>{if(args.length!==1)throw Error(name+' expects one input')};
 const binary=()=>{if(args.length!==2)throw Error(name+' expects two inputs')};
 const trigAngle=()=>toRad(x,mode);
 switch(name){
 case 'sin':unary();return Math.sin(trigAngle());
 case 'cos':unary();return Math.cos(trigAngle());
 case 'tan':unary();if(Math.abs(Math.cos(trigAngle()))<1e-12)throw Error('tan is undefined here');return Math.tan(trigAngle());
 case 'asin':unary();return fromRad(Math.asin(x),mode);
 case 'acos':unary();return fromRad(Math.acos(x),mode);
 case 'atan':unary();return fromRad(Math.atan(x),mode);
 case 'sinh':unary();return Math.sinh(x);
 case 'cosh':unary();return Math.cosh(x);
 case 'tanh':unary();return Math.tanh(x);
 case 'asinh':unary();return Math.asinh(x);
 case 'acosh':unary();return Math.acosh(x);
 case 'atanh':unary();return Math.atanh(x);
 case 'ln':unary();return Math.log(x);
 case 'log':unary();return Math.log10(x);
 case 'log2':unary();return Math.log2(x);
 case 'exp':unary();return Math.exp(x);
 case 'pow10':unary();return Math.pow(10,x);
 case 'sqrt':unary();return Math.sqrt(x);
 case 'cbrt':unary();return Math.cbrt(x);
 case 'abs':unary();return Math.abs(x);
 case 'inv':unary();return 1/x;
 case 'floor':unary();return Math.floor(x);
 case 'ceil':unary();return Math.ceil(x);
 case 'round':unary();return Math.round(x);
 case 'fact':unary();return factorial(x);
 case 'nCr':binary();return choose(x,z);
 case 'nPr':binary();return permute(x,z);
 case 'root':binary();if(x===0)throw Error('Zero-degree root');if(z<0){if(!Number.isInteger(x)||Math.abs(x)%2!==1)throw Error('Even root of a negative number');return -Math.pow(-z,1/x)}return Math.pow(z,1/x);
 case 'mod':binary();if(z===0)throw Error('Division by zero');return x%z;
 case 'deg':unary();return fromRad(x,mode);
 case 'rad':unary();return x*ANGLE[mode];
 case 'grad':unary();return x*200/Math.PI;
 case 'dms':{if(args.length<1||args.length>3)throw Error('dms expects 1–3 inputs');const deg=x,minutes=args[1]||0,seconds=args[2]||0;if(minutes<0||minutes>=60||seconds<0||seconds>=60)throw Error('Invalid DMS minutes/seconds');return Math.sign(deg||1)*(Math.abs(deg)+minutes/60+seconds/3600)}
 case 'RtoPr':binary();return Math.hypot(x,z);
 case 'RtoPtheta':binary();return fromRad(Math.atan2(z,x),mode);
 case 'PtoRx':binary();return x*Math.cos(toRad(z,mode));
 case 'PtoRy':binary();return x*Math.sin(toRad(z,mode));
 case 'mixed':{if(args.length!==3)throw Error('mixed expects whole, numerator, denominator');if(args[2]===0)throw Error('Division by zero');return args[0]+Math.sign(args[0]||1)*args[1]/args[2]}
 case 'rand':if(args.length)throw Error('rand takes no inputs');return Math.random();
 case 'randInt':binary();if(!Number.isInteger(x)||!Number.isInteger(z)||x>z)throw Error('randInt expects two ordered integers');return Math.floor(Math.random()*(z-x+1))+x;
 default:throw Error('Unknown function: '+name);
 }
};
const KNOWN=new Set('sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh ln log log2 exp pow10 sqrt cbrt abs inv floor ceil round fact nCr nPr root mod mixed rand randInt deg rad grad dms RtoPr RtoPtheta PtoRx PtoRy'.split(' '));
export const CALC_ANGLE_MODES=Object.freeze(['DEG','RAD','GRAD']);
export function evaluateScientific(raw,options={}){
 const expression=String(raw||'').trim();
 if(!expression||expression.length>MAX_LEN)throw Error(expression?'Expression is too long':'Enter an expression');
 const mode=options.angleMode||'DEG';
 if(!(mode in ANGLE))throw Error('Invalid angle mode');
 const tokens=[];
 const text=expression.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/√/g,'sqrt').replace(/π/g,'pi').replace(/²/g,'^2').replace(/³/g,'^3').replace(/٪/g,'%');
 let i=0;
 while(i<text.length){
  const t=text.slice(i),space=t.match(/^\s+/);
  if(space){i+=space[0].length;continue}
  const number=t.match(/^(?:(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/);
  if(number){tokens.push({type:'number',value:Number(number[0])});i+=number[0].length;continue}
  const id=t.match(/^[a-zA-Z_][a-zA-Z_0-9]*/);
  if(id){tokens.push({type:'id',value:id[0]});i+=id[0].length;continue}
  if('+-*/^!%(),'.includes(text[i])){tokens.push({type:text[i]});i++;continue}
  throw Error('Invalid character: '+text[i]);
 }
 tokens.push({type:'end'});
 let pos=0,depth=0;
 const peek=()=>tokens[pos],take=()=>tokens[pos++];
 function parse(min=0){
  if(++depth>MAX_DEPTH)throw Error('Expression is too complex');
  let t=take(),left;
  if(t.type==='number')left=t.value;
  else if(t.type==='+'||t.type==='-'){const val=parse(29);left=t.type==='-'?-val:val}
  else if(t.type==='('){left=parse(0);if(take().type!==')')throw Error('Missing closing parenthesis')}
  else if(t.type==='id'){
    const name=t.value;
    if(peek().type==='('&&KNOWN.has(name)){
      take();const args=[];
      if(peek().type!==')'){do{args.push(parse(0));if(peek().type!==',')break;take()}while(true)}
      if(take().type!==')')throw Error('Expected closing parenthesis');
      left=calcFunction(name,args,mode);
    }else if(name==='pi')left=Math.PI;
    else if(name==='e')left=Math.E;
    else if(name==='Ans')left=Number(options.ans)||0;
    else if(name==='M')left=Number(options.memory)||0;
    else if(name==='x'&&Number.isFinite(options.x))left=options.x;
    else if(Object.prototype.hasOwnProperty.call(options.variables||{},name)&&/^(?:x|y|z|t|a|b|c|L1|L2|L3)$/.test(name)&&Number.isFinite(options.variables[name]))left=options.variables[name];
    else throw Error('Unknown symbol: '+name);
  }else throw Error('Expected a number or function');
  while(true){
   t=peek();
   if((t.type==='!'||t.type==='%')&&50>=min){
    take();left=t.type==='!'?factorial(left):left/100;continue
   }
   let op=t.type,lbp=0,rightBp=0,implicit=false;
   if(op==='+'||op==='-'){lbp=10;rightBp=11}
   else if(op==='*'||op==='/'){lbp=20;rightBp=21}
   else if(op==='^'){lbp=30;rightBp=30}
   else if(op==='('||op==='id'||op==='number'){lbp=20;rightBp=21;op='*';implicit=true}
   else break;
   if(lbp<min)break;
   if(!implicit)take();
   const right=parse(rightBp);
   switch(op){
    case '+':left+=right;break;
    case '-':left-=right;break;
    case '*':left*=right;break;
    case '/':if(right===0)throw Error('Division by zero');left/=right;break;
    case '^':left=Math.pow(left,right);break;
   }
   left=clean(left);
  }
  depth--;
  return clean(left);
 }
 const value=parse();
 if(peek().type!=='end')throw Error('Unexpected input near '+String(peek().value||peek().type));
 return clean(value);
}
export function toFraction(value,maxDenominator=100000){
 if(!Number.isFinite(value))return null;
 if(value===0)return {numerator:0,denominator:1,whole:0,part:0};
 const sign=Math.sign(value),abs=Math.abs(value);
 if(abs>1e9)return null;
 let h0=0,h1=1,k0=1,k1=0,x=abs;
 for(let j=0;j<30;j++){
  const a=Math.floor(x),h=a*h1+h0,k=a*k1+k0;
  if(k>maxDenominator||!Number.isSafeInteger(h)||!Number.isSafeInteger(k))break;
  if(Math.abs(abs-h/k)<1e-10)return {numerator:sign*h,denominator:k,whole:Math.trunc(sign*h/k),part:Math.abs(h%k)};
  h0=h1;h1=h;k0=k1;k1=k;
  const delta=x-a;if(Math.abs(delta)<1e-14)break;x=1/delta;
 }
 return null;
}
export function formatScientific(value,{notation='NORM',digits=null,asFraction=false,mixed=false}={}){
 if(!Number.isFinite(value))return 'Math error';
 const f=asFraction?toFraction(value):null;
 if(f){
  if(f.denominator===1)return String(f.numerator);
  if(mixed&&f.whole!==0&&f.part!==0)return f.whole+' '+f.part+'/'+f.denominator;
  return f.numerator+'/'+f.denominator;
 }
 const d=digits===null?null:Math.min(10,Math.max(0,Number(digits)));
 if(d!==null)return Number(value).toFixed(d);
 if(notation==='SCI')return value.toExponential(8).replace(/\.?0+e/,'e');
 if(notation==='ENG'){
  if(value===0)return '0';
  const exp=Math.floor(Math.log10(Math.abs(value))/3)*3;
  return Number((value/Math.pow(10,exp)).toPrecision(9))+'e'+exp;
 }
 return String(Number(value.toPrecision(11)));
}
export function oneVariableStats(raw){
 const xs=String(raw).split(/[,;\s]+/).filter(Boolean).map(Number);
 if(!xs.length||xs.length>200||xs.some(x=>!Number.isFinite(x)))throw Error('Enter 1–200 numbers separated by commas');
 const n=xs.length,sum=xs.reduce((a,b)=>a+b,0),mean=sum/n,variance=xs.reduce((a,b)=>a+(b-mean)**2,0)/n;
 const sorted=[...xs].sort((a,b)=>a-b),median=n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;
 return {n,sum,mean,median,min:sorted[0],max:sorted[n-1],sigmaX:Math.sqrt(variance),sX:n>1?Math.sqrt(variance*n/(n-1)):null};
}
export function twoVariableStats(raw){
 const lines=String(raw).trim().split(/[;\n]+/).filter(Boolean);
 const points=lines.map(p=>p.trim().split(/[,\s]+/).map(Number));
 if(points.length<2||points.length>200||points.some(p=>p.length!==2||p.some(n=>!Number.isFinite(n))))throw Error('Enter two or more x,y pairs separated by semicolons');
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const x=xs.reduce((a,b)=>a+b,0)/xs.length,y=ys.reduce((a,b)=>a+b,0)/ys.length;
 const xx=xs.reduce((a,b)=>a+(b-x)**2,0),yy=ys.reduce((a,b)=>a+(b-y)**2,0),xy=points.reduce((a,p)=>a+(p[0]-x)*(p[1]-y),0);
 if(xx===0||yy===0)throw Error('Regression requires varying x and y');
 const slope=xy/xx;
 return {n:points.length,slope,intercept:y-slope*x,r:xy/Math.sqrt(xx*yy)};
}
