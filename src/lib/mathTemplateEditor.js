/**
 * Original Technica structured textbook-expression editor, not TI firmware.
 * Four levels of nested fraction / mixed / radical / exponent templates.
 */
let nextId=1;
const id=()=> 'math-'+(nextId++);
export const MAX_TEMPLATE_DEPTH=4;
const text=(value='')=>({type:'text',id:id(),value});
const seq=(value='')=>({type:'seq',parts:[text(value)]});
const FIELDS={fraction:['numerator','denominator'],mixed:['whole','numerator','denominator'],
 squareRoot:['radicand'],nthRoot:['index','radicand'],power:['exponent'],
 expE:['exponent'],exp10:['exponent']};
export const MATH_TEMPLATE_TYPES=Object.freeze(Object.keys(FIELDS));
export const createMathDocument=(value='')=>seq(String(value));
export function isMathDocument(doc){return doc?.type==='seq'&&Array.isArray(doc.parts)}
export function findMathField(doc,fieldId,depth=0){
 if(!isMathDocument(doc))return null;
 for(const p of doc.parts){
  if(p.type==='text'&&p.id===fieldId)return {field:p,depth};
  if(FIELDS[p.type]){
   for(const k of FIELDS[p.type]){
    const found=findMathField(p[k],fieldId,depth+1);
    if(found)return found;
   }
  }
 }
 return null;
}
export function updateMathField(doc,fieldId,value){
 const v=String(value);
 if(v.length>220)throw Error('Expression is too long');
 let found=false;
 function walk(node){return {type:'seq',parts:node.parts.map(p=>{
   if(p.type==='text'&&p.id===fieldId){found=true;return {...p,value:v}}
   if(FIELDS[p.type])return {...p,...Object.fromEntries(FIELDS[p.type].map(k=>[k,walk(p[k])]))};
   return p;
  })};
 }
 const result=walk(doc);
 if(!found)throw Error('Math field not found');
 return result;
}
export function insertMathTemplate(doc,fieldId,kind,start=0,end=start){
 if(!FIELDS[kind])throw Error('Unknown math template');
 const found=findMathField(doc,fieldId);
 if(!found)throw Error('Select a math input field');
 if(found.depth>=MAX_TEMPLATE_DEPTH)throw Error('Maximum 4 nested template levels');
 const current=found.field.value;
 const a=Math.max(0,Math.min(start,current.length));
 const b=Math.max(a,Math.min(end,current.length));
 let newPart={type:kind,id:id()};
 for(const k of FIELDS[kind])newPart[k]=seq();
 const focusId=newPart[FIELDS[kind][0]].parts[0].id;
 let changed=false;
 function walk(node){return {type:'seq',parts:node.parts.flatMap(p=>{
   if(p.type==='text'&&p.id===fieldId){
    changed=true;return [{...p,value:current.slice(0,a)},newPart,text(current.slice(b))];
   }
   if(FIELDS[p.type])return [{...p,...Object.fromEntries(FIELDS[p.type].map(k=>[k,walk(p[k])]))}];
   return [p];
  })}}
 const result=walk(doc);
 if(!changed)throw Error('Target field not found');
 return {doc:result,focusId,nodeId:newPart.id};
}
export function mathFieldIds(doc){
 const all=[];
 function visit(node){
  for(const p of node.parts){
   if(p.type==='text')all.push(p.id);
   else if(FIELDS[p.type])for(const k of FIELDS[p.type])visit(p[k]);
  }
 }
 if(!isMathDocument(doc))throw Error('Invalid math document');
 visit(doc);return all;
}
export function mathFieldContext(doc,targetId){
 let result=null;
 function visit(node,parent=null,partName=null){
  for(const p of node.parts){
   if(p.type==='text'&&p.id===targetId)result={parentId:parent?.id||null,parentType:parent?.type||null,field:partName};
   else if(FIELDS[p.type])for(const k of FIELDS[p.type])visit(p[k],p,k);
  }
 }
 visit(doc);return result;
}
export function serializeMathDocument(doc,{allowIncomplete=false}={}){
 if(!isMathDocument(doc))throw Error('Invalid math document');
 function read(node,level=0){
  return node.parts.map(p=>{
   if(p.type==='text')return p.value;
   if(!FIELDS[p.type]||level>=MAX_TEMPLATE_DEPTH)throw Error('Invalid math template');
   const slots=Object.fromEntries(FIELDS[p.type].map(k=>[k,read(p[k],level+1)]));
   for(const [key,v]of Object.entries(slots)){
    if(!v.trim()&&!allowIncomplete)throw Error('Fill the '+key+' field');
   }
   switch(p.type){
    case 'fraction':return '(('+slots.numerator+')/('+slots.denominator+'))';
    case 'mixed':return 'mixed('+slots.whole+','+slots.numerator+','+slots.denominator+')';
    case 'squareRoot':return 'sqrt('+slots.radicand+')';
    case 'nthRoot':return 'root('+slots.index+','+slots.radicand+')';
    case 'power':return '^('+slots.exponent+')';
    case 'expE':return 'exp('+slots.exponent+')';
    case 'exp10':return 'pow10('+slots.exponent+')';
    default:throw Error('Invalid math template');
   }
  }).join('');
 }
 return read(doc);
}
export function mathDocumentDepth(doc){
 function depth(s,level){return Math.max(level,...s.parts.filter(p=>FIELDS[p.type]).flatMap(p=>FIELDS[p.type].map(k=>depth(p[k],level+1))))}
 return depth(doc,0);
}
