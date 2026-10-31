import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState}from'react';
import{
 createMathDocument,findMathField,insertMathTemplate,mathFieldIds,mathFieldContext,
 serializeMathDocument,updateMathField
}from'../lib/mathTemplateEditor';

/** Interactive structured textbook input. Templates are bounded four levels and
 * can contain expressions/functions/templates in numerator, radicand and powers.
 * Original Technica UI: no proprietary MathPrint firmware or artwork. */
const TOOLS=[
 ['fraction','a / b'],['mixed','a b/c'],['squareRoot','√□'],
 ['nthRoot','ⁿ√□'],['power','xⁿ'],['expE','eˣ'],['exp10','10ˣ']
];
function TemplateShape({node,renderSeq}){
 switch(node.type){
 case 'fraction':return <span className="tc-math-shape tc-math-fraction"><span>{renderSeq(node.numerator)}</span><span>{renderSeq(node.denominator)}</span></span>;
 case 'mixed':return <span className="tc-math-shape tc-math-mixed"><span>{renderSeq(node.whole)}</span><span className="tc-math-fraction"><span>{renderSeq(node.numerator)}</span><span>{renderSeq(node.denominator)}</span></span></span>;
 case 'squareRoot':return <span className="tc-math-shape tc-math-root"><span>√</span><span className="tc-math-radicand">{renderSeq(node.radicand)}</span></span>;
 case 'nthRoot':return <span className="tc-math-shape tc-math-root"><sup>{renderSeq(node.index)}</sup><span>√</span><span className="tc-math-radicand">{renderSeq(node.radicand)}</span></span>;
 case 'power':return <span className="tc-math-shape tc-math-power"><sup>{renderSeq(node.exponent)}</sup></span>;
 case 'expE':return <span className="tc-math-shape tc-math-power">e<sup>{renderSeq(node.exponent)}</sup></span>;
 case 'exp10':return <span className="tc-math-shape tc-math-power">10<sup>{renderSeq(node.exponent)}</sup></span>;
 default:return null;
 }
}
const MathTemplateEditor=forwardRef(function MathTemplateEditor({document,onChange,onEvaluate,onError},ref){
 const container=useRef(null),selection=useRef({fieldId:null,start:0,end:0}),pendingFocus=useRef(null);
 const[active,setActive]=useState(null);
 const commit=(doc,focus)=>{onChange(doc);if(focus)pendingFocus.current=focus};
 function focusField(id,index=0){
  const target=[...container.current?.querySelectorAll('input[data-math-field]')||[]].find(el=>el.dataset.mathField===id);
  if(target){target.focus({preventScroll:true});target.setSelectionRange(index,index)}
 }
 useEffect(()=>{
  if(!pendingFocus.current)return;
  const next=pendingFocus.current;pendingFocus.current=null;
  focusField(next.fieldId,next.index||0);
 },[document]);
 const location=()=>{
  const activeEl=document && container.current?.contains(globalThis.document?.activeElement)?globalThis.document.activeElement:null;
  if(activeEl?.dataset?.mathField){
   const fieldId=activeEl.dataset.mathField;
   return {fieldId,start:activeEl.selectionStart||0,end:activeEl.selectionEnd||0};
  }
  const saved=selection.current;
  return saved.fieldId&&findMathField(document,saved.fieldId)?saved:{fieldId:mathFieldIds(document).at(-1),start:0,end:0};
 };
 const append=chars=>{
  const {fieldId,start,end}=location(),found=findMathField(document,fieldId);
  if(!found)return;
  const nextValue=found.field.value.slice(0,start)+chars+found.field.value.slice(end);
  try{commit(updateMathField(document,fieldId,nextValue),{fieldId,index:start+chars.length});onError?.('')}
  catch(e){onError?.(e.message)}
 };
 const makeTemplate=kind=>{
  const {fieldId,start,end}=location();
  try{const next=insertMathTemplate(document,fieldId,kind,start,end);commit(next.doc,{fieldId:next.focusId,index:0});onError?.('')}
  catch(e){onError?.(e.message)}
 };
 const move=(currentId,direction)=>{
  const ids=mathFieldIds(document);const ix=ids.indexOf(currentId);
  if(ix<0)return false;const next=ids[ix+direction];if(!next)return false;
  focusField(next,direction>0?0:(findMathField(document,next)?.field.value.length||0));return true;
 };
 useImperativeHandle(ref,()=>({
  insertText:append,insertTemplate:makeTemplate,
  focus:()=>{const id=location().fieldId;focusField(id)}
 }),[document]);
 const renderSeq=node=><span className="tc-math-sequence">{node.parts.map(p=>p.type==='text'?
  <input key={p.id} data-math-field={p.id} autoComplete="off" spellCheck={false}
   aria-label="Math expression field" className={'tc-math-field '+(active===p.id?'active':'')}
   value={p.value} size={Math.min(17,Math.max(1,p.value.length||1))}
   onFocus={e=>{setActive(p.id);selection.current={fieldId:p.id,start:e.target.selectionStart||0,end:e.target.selectionEnd||0}}}
   onSelect={e=>{selection.current={fieldId:p.id,start:e.target.selectionStart||0,end:e.target.selectionEnd||0}}}
   onChange={e=>{try{commit(updateMathField(document,p.id,e.target.value));onError?.('')}catch(err){onError?.(err.message)}}}
   onKeyDown={e=>{
    if(e.key==='Enter'){e.preventDefault();e.stopPropagation();onEvaluate?.();return}
    if(e.ctrlKey&&e.key==='/'){e.preventDefault();makeTemplate('fraction');return}
    if(e.ctrlKey&&e.key==='r'){e.preventDefault();makeTemplate('squareRoot');return}
    if(e.ctrlKey&&e.key==='^'){e.preventDefault();makeTemplate('power');return}
    const atLeft=e.target.selectionStart===0&&e.target.selectionEnd===0;
    const atRight=e.target.selectionStart===e.target.value.length&&e.target.selectionEnd===e.target.value.length;
    if(e.key==='ArrowLeft'&&atLeft&&move(p.id,-1)){e.preventDefault();return}
    if(e.key==='ArrowRight'&&atRight&&move(p.id,1)){e.preventDefault();return}
    const c=mathFieldContext(document,p.id);
    if(c?.parentType==='fraction'&&((c.field==='numerator'&&e.key==='ArrowDown')||(c.field==='denominator'&&e.key==='ArrowUp'))){
      e.preventDefault();move(p.id,c.field==='numerator'?1:-1);
    }
   }}
  />:<TemplateShape key={p.id} node={p} renderSeq={renderSeq}/> )}</span>;
 return <div className="tc-math-editor" ref={container}>
   <div className="tc-math-entry-scroll" aria-label="Structured textbook math input">{renderSeq(document)}</div>
   <div className="tc-math-template-tools" aria-label="Insert math template">
    {TOOLS.map(([kind,label])=><button type="button" key={kind}
      onPointerDown={e=>e.preventDefault()} onClick={()=>makeTemplate(kind)}
      title={'Insert '+kind+' (maximum four nested levels)'}>{label}</button>)}
   </div>
   <div className="tc-math-hint">Arrow keys move between slots · Ctrl+/ fraction · Ctrl+R root · Enter calculate</div>
 </div>;
});
export default MathTemplateEditor;
