import React,{useCallback,useEffect,useRef,useState} from 'react';
import{createPortal}from'react-dom';
import{Calculator,Grip,Minus,X,Delete}from'lucide-react';
import{evaluateScientific,formatScientific,oneVariableStats,twoVariableStats}from'../lib/scientificCalculator';
import{exactScientific,formatExactPlain,formatWithMode,freshVariables,makeListState,makeFunctionTable}from'../lib/scientificCalculatorExtended';
import{VariablePanel,ListPanel,AnglePanel,ConstantPanel}from'./CalculatorAdvancedPanels';
import MathTemplateEditor from './MathTemplateEditor';
import{createMathDocument,serializeMathDocument}from'../lib/mathTemplateEditor';
import{seededCalculatorRandom}from'../lib/calculatorRandom';
import{finishCalculatorEntry}from'../lib/calculatorEntry';
import CalculatorPhysicalKeypad from './CalculatorPhysicalKeypad';

// Original Technica keypad and calculation code; no third-party calculator emulator.
const KEYS=[
 ['2nd','second'],['MODE','mode'],['DEL','delete'],['CLEAR','clear'],['HIST','history'],
 ['log','log'],['ln','ln'],['1/x','inv'],['√','sqrt'],['x!','fact'],
 ['sin','sin'],['cos','cos'],['tan','tan'],['π','pi'],['÷','divide'],
 ['xʸ','pow'],['x²','square'],['(','left'],[')','right'],['×','multiply'],
 ['7','7'],['8','8'],['9','9'],['nCr','nCr'],['−','subtract'],
 ['4','4'],['5','5'],['6','6'],['nPr','nPr'],['+','add'],
 ['1','1'],['2','2'],['3','3'],['%','percent'],['Ans','ans'],
 ['0','0'],['.','dot'],['(−)','neg'],['EE','ee'],['ENTER','enter'],
 ['n/d','fraction'],['a b/c','mixed'],['x³','cube'],['∛','cbrt'],['STO►','store']
];
const SECONDARY={log:'10ˣ',ln:'eˣ',sin:'sin⁻¹',cos:'cos⁻¹',tan:'tan⁻¹',sqrt:'∛',square:'√',fact:'rand',inv:'abs'};
const ADVANCED=[
 ['sinh','sinh('],['cosh','cosh('],['tanh','tanh('],['asinh','asinh('],['acosh','acosh('],
 ['atanh','atanh('],['log₂','log2('],['∛','cbrt('],['|x|','abs('],['x√y','root('],
 ['mod','mod('],['rand','rand()'],['randInt','randInt('],['floor','floor('],
 ['ceil','ceil('],['round','round('],['fact','fact('],['nCr','nCr('],['nPr','nPr('],
 ['π','pi'],['e','e'],[',',',']
];
const NUMBERS=new Set(['7','8','9','4','5','6','1','2','3','0','dot']);
const OPERATIONS=new Set(['divide','multiply','add','subtract','pow','nCr','nPr']);
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
function ExactOutput({exact}){
 if(!exact)return null;
 const piece=(n,d)=><span className="tc-exact-fraction"><span>{n}</span><span>{d}</span></span>;
 if(exact.type==='fraction')return piece(exact.numerator,exact.denominator);
 if(exact.type==='pi'){
  const prefix=exact.numerator===1?'π':exact.numerator===-1?'−π':exact.numerator+'π';
  return exact.denominator===1?prefix:piece(prefix,exact.denominator);
 }
 if(exact.type==='radical')return <span className="tc-exact-radical">{exact.coefficient===1?'':exact.coefficient}<span>√{exact.radicand}</span></span>;
 return exact.value;
}
export default function ScientificCalculator({context='Quiz',onNext=null,onPrevious=null,canPrevious=false,currentQuestion=null,questionCount=null}){
 const[open,setOpen]=useState(false),[minimized,setMinimized]=useState(false);
 const[expression,setExpression]=useState(''),[result,setResult]=useState('0');
 const[answer,setAnswer]=useState(0),[memory,setMemory]=useState(0),[history,setHistory]=useState([]);
 const[error,setError]=useState(''),[angle,setAngle]=useState('DEG'),[notation,setNotation]=useState('NORM');
 const[second,setSecond]=useState(false),[fraction,setFraction]=useState(false),[mixed,setMixed]=useState(false);
 const[tab,setTab]=useState('keys'),[statsInput,setStatsInput]=useState(''),[statsType,setStatsType]=useState('1var');
 const[statsResult,setStatsResult]=useState(null),[tableFormula,setTableFormula]=useState('x^2');
 const[tableStart,setTableStart]=useState('0'),[tableStep,setTableStep]=useState('1'),[tableRows,setTableRows]=useState([]);
 const[coords,setCoords]=useState(null),[showHistory,setShowHistory]=useState(false);
 const[variables,setVariables]=useState(freshVariables);
 const[lists,setLists]=useState(makeListState);
 const[fixed,setFixed]=useState('FLOAT'),[viewMode,setViewMode]=useState('MATH'),[showExact,setShowExact]=useState(true);
 const[lastExact,setLastExact]=useState(null),[lastCalcExpression,setLastCalcExpression]=useState(''),[percentView,setPercentView]=useState(false);
 const[tableMode,setTableMode]=useState('auto'),[askValues,setAskValues]=useState('1,2,3'),[tableCount,setTableCount]=useState(8);
 const root=useRef(null),textField=useRef(null),drag=useRef(null),mathEditor=useRef(null);
 const rngRef=useRef(null),[randSeed,setRandSeed]=useState(''),[seeded,setSeeded]=useState(false);
 const random=useCallback(()=>rngRef.current?rngRef.current():Math.random(),[]);
 const[mathDoc,setMathDoc]=useState(()=>createMathDocument());
 const insert=useCallback(s=>{
   if(viewMode==='MATH'){mathEditor.current?.insertText(s)}
   else setExpression(e=>e.length+s.length<=220?e+s:e);
   setError('');
 },[viewMode]);
 const template=kind=>{if(viewMode==='MATH')mathEditor.current?.insertTemplate(kind);else insert(kind==='fraction'?'/':kind==='power'?'^(':kind==='squareRoot'?'sqrt(':kind==='mixed'?'mixed(':kind==='nthRoot'?'root(':kind==='exp10'?'pow10(':'exp(')};
 const evaluate=useCallback(()=>{
   try{
     const input=finishCalculatorEntry(viewMode==='MATH'?serializeMathDocument(mathDoc):expression);
     const v=evaluateScientific(input,{angleMode:angle,ans:answer,memory,variables,viewMode,random});
     const exact=exactScientific(v,input);
     const formatted=(showExact&&viewMode==='MATH'&&exact)?formatExactPlain(exact):formatWithMode(v,{notation,fixed:fixed==='FLOAT'?null:Number(fixed),asFraction:fraction,mixed});
     setLastExact(exact);setLastCalcExpression(input);setPercentView(false);
     setAnswer(v);setResult(formatted);setHistory(h=>[{expression:input,value:v},...h].slice(0,12));
     setExpression(formatScientific(v));setMathDoc(createMathDocument(formatScientific(v)));setShowHistory(false);setError('');
   }catch(e){setError(e.message||'Math error')}
 },[expression,mathDoc,angle,answer,memory,variables,notation,fraction,mixed,fixed,showExact,viewMode,random]);
 const press=useCallback(key=>{
   if(key==='second'){setSecond(v=>!v);return}
   const openMenu=name=>{setSecond(false);setTab(current=>current===name?'keys':name);setShowHistory(false)};
   // Hardware-inspired 2nd layer: secondary marks above the photographed keys.
   if(second){
     if(key==='mode'){setSecond(false);setTab('keys');return}
     if(key==='delete'){setSecond(false);mathEditor.current?.focus();return}
     if(key==='prb'){openMenu('angle');return}
     if(key==='data'){openMenu('stats');return}
     if(key==='pi'){openMenu('extra');return}
     if(key==='divide'){openMenu('constant');return}
     if(key==='ee'){openMenu('extra');return}
     if(key==='table'){setSecond(false);setShowExact(v=>!v);return}
     if(key==='clear'||key==='0'){setSecond(false);resetCalculator();return}
     if(key==='fraction'){setSecond(false);setFraction(v=>!v);setShowExact(false);setResult(formatWithMode(answer,{notation,fixed:fixed==='FLOAT'?null:Number(fixed),asFraction:!fraction,mixed}));return}
     if(key==='mixed'){openMenu('vars');return}
     if(key==='store'){setSecond(false);insert('M');return}
     if(key==='neg'){setSecond(false);insert('Ans');return}
     if(key==='on'){setSecond(false);setMinimized(true);return}
     if(key==='history'){setSecond(false);insert('Ans');return}
     if(key==='pow'){setSecond(false);template('nthRoot');return}
     if(key==='inv'){setSecond(false);template('squareRoot');return}
     if(key==='multiply'){setSecond(false);insert('%');return}
     if(key==='dot'){setSecond(false);openMenu('mode');return}
     if(key==='enter'){setSecond(false);setShowHistory(v=>!v);return}
   }
   if(key==='mode'){openMenu('mode');return}
   if(key==='prb'){openMenu('prb');return}
   if(key==='data'){openMenu('lists');return}
   if(key==='table'){openMenu('table');return}
   if(key==='on'){setTab('keys');setMinimized(false);return}
   if(key==='history'){setShowHistory(v=>!v);return}
   if(key==='delete'){if(viewMode==='MATH')mathEditor.current?.deleteBackward();else setExpression(e=>e.slice(0,-1));setError('');return}
   if(key==='clear'){setExpression('');setMathDoc(createMathDocument());setResult('0');setError('');setTab('keys');return}
   if(key==='history'){setShowHistory(s=>!s);return}
   if(key==='enter'){evaluate();return}
   if(key==='nCr'||key==='nPr'){insert(key+'(');return}
   if(key==='store'){try{setMemory(evaluateScientific(expression||String(answer),{angleMode:angle,ans:answer,memory,variables}));setError('')}catch(e){setError(e.message)}return}
   if(key==='fraction'){template('fraction');return}
   if(key==='mixed'){template('mixed');return}
   if(second){
     const alt={log:'pow10(',ln:'exp(',sin:'asin(',cos:'acos(',tan:'atan(',sqrt:'cbrt(',square:'sqrt(',fact:'rand()',inv:'sqrt(',square:'sqrt('};
     if(alt[key]){insert(alt[key]);setSecond(false);return}
   }
   const dict={add:'+',subtract:'-',multiply:'×',divide:'÷',pow:'^',square:'^2',cube:'^3',
     sqrt:'√(',cbrt:'cbrt(',log:'log(',ln:'ln(',sin:'sin(',cos:'cos(',tan:'tan(',
     pi:'π',fact:'!',inv:'^(-1)',left:'(',right:')',percent:'%',ans:'Ans',
     neg:'-',ee:'E',nCr:'nCr(',nPr:'nPr('};
   if(viewMode==='MATH'&&key==='sqrt'){template('squareRoot');return}
   if(viewMode==='MATH'&&key==='pow'){template('power');return}
   const value=NUMBERS.has(key)?(key==='dot'?'.':key):dict[key];
   if(value)insert(value);
 },[expression,answer,angle,memory,second,insert,evaluate,fraction,mixed,notation,variables,viewMode,showExact,fixed]);
 useEffect(()=>{
   if(!open||minimized)return;
   function onKey(e){
     if(e.altKey||e.metaKey||e.ctrlKey)return;
     const el=e.target;
     // Never hijack question controls or auxiliary list/table input and buttons.
     if(el?.closest?.('input,textarea,select,[contenteditable=true]')&&el!==textField.current)return;
     if(el?.closest?.('button,[role=button]'))return;
     if(e.key==='Escape'){setOpen(false);return}
     if(e.key==='Enter'||e.key==='='){e.preventDefault();evaluate();return}
     if(el===textField.current)return; // keep selection/caret and native text editing
     if(e.key==='Backspace'){e.preventDefault();press('delete');return}
     if(e.key==='Delete'){e.preventDefault();press('clear');return}
     const map={'+':'add','-':'subtract','*':'multiply','/':'divide','^':'pow','%':'percent','(':'left',')':'right','.':'dot'};
     if(/^[0-9]$/.test(e.key)||map[e.key]){e.preventDefault();press(map[e.key]||e.key)}
   }
   document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);
 },[open,minimized,evaluate,press]);
 useEffect(()=>{if(open&&!minimized&&tab==='keys'&&viewMode==='CLASSIC')textField.current?.focus({preventScroll:true})},[open,minimized,tab,viewMode]);
 function dragStart(e){
   if(e.pointerType==='touch'||e.button!==0||window.innerWidth<=700||e.target.closest('button'))return;
   const rect=root.current?.getBoundingClientRect();
   if(!rect)return;
   drag.current={x:e.clientX-rect.left,y:e.clientY-rect.top};
   e.currentTarget.setPointerCapture(e.pointerId);
 }
 function dragMove(e){
   if(!drag.current||window.innerWidth<=700)return;
   const rect=root.current?.getBoundingClientRect();if(!rect)return;
   setCoords({left:clamp(e.clientX-drag.current.x,8,Math.max(8,window.innerWidth-rect.width-8)),
              top:clamp(e.clientY-drag.current.y,8,Math.max(8,window.innerHeight-rect.height-8))});
 }
 function navigate(direction){
   if(tab!=='keys'){if(direction==='left'||direction==='right')setTab('keys');return}
   if(viewMode==='MATH'){mathEditor.current?.move(direction);return}
   const el=textField.current;
   if(!el){if(direction==='up'||direction==='down')setShowHistory(v=>!v);return}
   const cursor=el.selectionStart||0;
   const next=direction==='left'?Math.max(0,cursor-1):direction==='right'?Math.min(el.value.length,cursor+1):direction==='up'?0:el.value.length;
   el.focus({preventScroll:true});el.setSelectionRange(next,next);
 }
 function makeStats(){
   try{setStatsResult(statsType==='1var'?oneVariableStats(statsInput):twoVariableStats(statsInput));setError('')}
   catch(e){setError(e.message)}
 }
 function useComputedValue(v,formula){
   const exp=formula||String(v),exact=exactScientific(v,exp);
   setAnswer(v);setLastExact(exact);setLastCalcExpression(exp);setPercentView(false);
   setResult(showExact&&viewMode==='MATH'&&exact?formatExactPlain(exact):formatWithMode(v,{notation,fixed:fixed==='FLOAT'?null:Number(fixed),asFraction:fraction,mixed}));
   setExpression(formatScientific(v));setHistory(h=>[{expression:exp,value:v},...h].slice(0,12));setError('');
 }
 function resetCalculator(){
   if(!window.confirm('Reset all calculator settings, memory, data, and calculation history?'))return;
   setExpression('');setMathDoc(createMathDocument());setResult('0');setAnswer(0);setMemory(0);
   setHistory([]);setVariables(freshVariables());setLists(makeListState());setSecond(false);
   setError('');setAngle('DEG');setNotation('NORM');setFixed('FLOAT');setViewMode('MATH');
   setFraction(false);setMixed(false);setLastExact(null);setLastCalcExpression('');setShowExact(true);
   setPercentView(false);setStatsInput('');setStatsResult(null);setTableRows([]);setTableFormula('x^2');setTableMode('auto');setTab('keys');
   rngRef.current=null;setRandSeed('');setSeeded(false);
 }
 function makeTable(){
   try{
     const start=Number(tableStart),step=Number(tableStep);
     if(tableMode==='auto'&&(!Number.isFinite(start)||!Number.isFinite(step)||step===0))throw Error('Enter valid Start and Step');
     setTableRows(makeFunctionTable(tableFormula,{mode:tableMode,start,step,values:tableMode==='ask'?askValues.split(/[,;\s]+/).filter(Boolean).map(Number):[],count:tableCount,angleMode:angle,ans:answer,memory,variables}));
     setError('');
   }catch(e){setError(e.message)}
 }
 return createPortal(<>
  <button className={'tc-calc-launch '+(open?'is-open':'')} type="button"
   aria-label={open?'Hide scientific calculator':'Open scientific calculator'} aria-expanded={open}
   title="Scientific calculator" onClick={()=>{setOpen(o=>!o);setMinimized(false)}}>
   <Calculator size={21}/><span>Calculator</span>
  </button>
  {open&&<section ref={root} className={'tc-calc-window '+(minimized?'tc-calc-minimized':'')} role="region"
   aria-label={'Scientific calculator for '+context}
   style={coords&&window.innerWidth>700?{left:coords.left,top:coords.top,right:'auto',bottom:'auto'}:undefined}>
   <header className="tc-calc-window-header" onPointerDown={dragStart} onPointerMove={dragMove}
     onPointerUp={()=>drag.current=null} onLostPointerCapture={()=>drag.current=null} title="Drag to move">
     <Grip size={15}/><strong>TECHNICA <span>SCIENTIFIC</span></strong>
     {onNext&&<div className="tc-calc-quiz-navigation" role="group" aria-label="Navigate questions while calculator open">
       <button type="button" onClick={onPrevious} disabled={!canPrevious} aria-label="Previous question while calculator open">‹</button>
       <span title={context}>{currentQuestion}/{questionCount}</span>
       <button type="button" onClick={onNext} aria-label="Next question while calculator open">›</button>
     </div>}
     <small>{context}</small>
     <button type="button" title={minimized?'Restore':'Minimize'} aria-label={minimized?'Restore calculator':'Minimize calculator'}
      onClick={()=>setMinimized(v=>!v)}><Minus size={15}/></button>
     <button type="button" aria-label="Close calculator" title="Close" onClick={()=>setOpen(false)}><X size={18}/></button>
   </header>
   {!minimized&&<div className="tc-calc-body">
     <div className="tc-calc-identity" aria-label="Technica scientific calculator"><span>TECHNICA</span><em>MultiView Scientific</em><button type="button" aria-label="Open advanced calculator functions" onClick={()=>setTab(v=>v==='extra'?'keys':'extra')}>TOOLS</button></div>
     <div className="tc-calc-display">
       <div className="tc-calc-display-status"><span>{angle} · {notation} · {fixed==='FLOAT'?'FLOAT':'FIX '+fixed} · {viewMode}</span><span>{second?'2nd · ':''}{memory?'M · ':''}{fraction?'FRAC':''}</span></div>
       {viewMode==='MATH'
         ?<MathTemplateEditor ref={mathEditor} document={mathDoc} onChange={setMathDoc} onEvaluate={evaluate} onError={setError}/>
         :<><label className="tc-calc-sr-only" htmlFor="tc-calc-expression">Expression</label>
           <input ref={textField} id="tc-calc-expression" spellCheck={false} autoComplete="off"
            aria-label="Calculator expression" value={expression}
            onChange={e=>{if(e.target.value.length<=220){setExpression(e.target.value);setError('')}}}
            placeholder="Type an expression…" /></>}
       <div className="tc-calc-lcd-history" aria-label="Previous calculation">{history[0]&&<span>{history[0].expression} = {formatScientific(history[0].value)}</span>}</div>
       <div className="tc-calc-display-result" aria-live="polite">{error?<span className="tc-calc-error">{error}</span>:
    percentView?formatScientific(answer*100)+'%':lastExact&&viewMode==='MATH'&&showExact?<ExactOutput exact={lastExact}/>:result}</div>
     </div>
     <CalculatorPhysicalKeypad second={second} onPress={press} onNavigate={navigate}/>
     {tab!=='keys'&&<div className="tc-calc-menu-panel" aria-label="Scientific calculator functions menu">
       <div className="tc-calc-menu-title"><strong>{({mode:'Mode & settings',prb:'Probability',extra:'Additional functions',stats:'Statistics',lists:'Data lists',table:'Function table',vars:'Memory registers',angle:'Angle tools',constant:'Constant K'})[tab]||'Tools'}</strong>
        <button type="button" onClick={()=>setTab('keys')} aria-label="Return to calculator keypad">✕</button></div>
       <nav className="tc-calc-menu-shortcuts" aria-label="Calculator menu shortcuts">
         {[['mode','MODE'],['prb','PRB'],['lists','DATA'],['stats','STAT'],['table','TABLE'],['vars','MEM'],['extra','f(x)']].map(([key,label])=>
           <button type="button" key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}
       </nav>
       {tab==='mode'&&<div className="tc-calc-settings-panel">
         <label>Angle mode</label>
         <div className="tc-calc-modebar">
           {['DEG','RAD','GRAD'].map(a=><button key={a} type="button" className={angle===a?'active':''} onClick={()=>setAngle(a)}>{a}</button>)}
         </div>
         <label>Number notation</label>
         <div className="tc-calc-modebar">
           {['NORM','SCI','ENG'].map(a=><button key={a} type="button" className={notation===a?'active':''}
            onClick={()=>{setNotation(a);setShowExact(false);setResult(formatWithMode(answer,{notation:a,fixed:fixed==='FLOAT'?null:Number(fixed),asFraction:fraction,mixed}))}}>{a}</button>)}
         </div>
         <div className="tc-calc-display-settings">
           <button type="button" className={viewMode==='MATH'?'active':''} onClick={()=>{setMathDoc(createMathDocument(expression));setViewMode('MATH');setPercentView(false)}}>Textbook</button>
           <button type="button" className={viewMode==='CLASSIC'?'active':''} onClick={()=>{try{setExpression(serializeMathDocument(mathDoc))}catch(e){setError(e.message);return}setViewMode('CLASSIC');setPercentView(false);setResult(formatWithMode(answer,{notation,fixed:fixed==='FLOAT'?null:Number(fixed),asFraction:fraction,mixed}))}}>Classic</button>
           <label>Decimals <select aria-label="Decimal precision" value={fixed} onChange={e=>{setFixed(e.target.value);setShowExact(false);setResult(formatWithMode(answer,{notation,fixed:e.target.value==='FLOAT'?null:Number(e.target.value),asFraction:fraction,mixed}))}}>
             <option value="FLOAT">FLOAT</option>{Array.from({length:10},(_,i)=><option value={String(i)} key={i}>FIX {i}</option>)}
           </select></label>
         </div>
         <div className="tc-calc-tool-actions">
           <button type="button" onClick={()=>{setShowExact(v=>!v);setResult(formatWithMode(answer,{notation,fixed:fixed==='FLOAT'?null:Number(fixed),asFraction:fraction,mixed}))}}>Exact / Approx</button>
           <button type="button" onClick={()=>{setFraction(v=>!v);setShowExact(false);setResult(formatWithMode(answer,{notation,fixed:fixed==='FLOAT'?null:Number(fixed),asFraction:!fraction,mixed}))}}>Fraction / Decimal</button>
           <button type="button" onClick={()=>setPercentView(v=>!v)}>Percent / Decimal</button>
         </div>
       </div>}
       {tab==='prb'&&<div className="tc-calc-extra tc-calc-prb-menu">
         <p>Probability operations</p><div>
          {[['nPr','nPr('],['nCr','nCr('],['x!','!'],['rand','rand()'],['randInt','randInt(']].map(([label,value])=>
            <button key={label} type="button" onClick={()=>{insert(value);setTab('keys')}}>{label}</button>)}
         </div>
       </div>}
     {tab==='extra'&&<div className="tc-calc-extra">
       <p>Insert a function. Use commas to separate inputs.</p>
       <div>{ADVANCED.map(([label,value])=><button type="button" key={label} onClick={()=>{insert(value);setTab('keys')}}>{label}</button>)}</div>
       <div className="tc-calc-memory"><b>M: {formatScientific(memory)}</b>
         <button onClick={()=>setMemory(0)}>MC</button><button onClick={()=>insert('M')}>MR</button>
         <button onClick={()=>{try{const amount=evaluateScientific(expression||String(answer),{angleMode:angle,ans:answer,memory,variables});setMemory(m=>m+amount);setError('')}catch(e){setError(e.message)}}}>M+</button>
       </div>
       <div className="tc-calc-random-seed">
        <label>RAND seed (non-negative integer)
         <input value={randSeed} inputMode="numeric" onChange={e=>setRandSeed(e.target.value)} placeholder="e.g. 42"/>
        </label>
        <button type="button" onClick={()=>{try{const seed=Number(randSeed);rngRef.current=seededCalculatorRandom(seed);setSeeded(true);setError('')}catch(e){setError(e.message)}}}>Set seed</button>
        <button type="button" onClick={()=>{rngRef.current=null;setSeeded(false);setError('')}}>Unseeded</button>
        <small>{seeded?'Deterministic seed active':'Unseeded random'} · original Technica sequence, not TI firmware RNG</small>
       </div>
     </div>}
     {tab==='vars'&&<VariablePanel variables={variables} setVariables={setVariables} answer={answer} expression={expression} angle={angle} memory={memory} onInsert={insert} onError={setError}/>}
     {tab==='lists'&&<ListPanel lists={lists} setLists={setLists} angle={angle} memory={memory} answer={answer} variables={variables} onError={setError} onInsert={insert}/>}
     {tab==='angle'&&<AnglePanel angle={angle} onError={setError} onUseValue={useComputedValue}/>}
     {tab==='constant'&&<ConstantPanel answer={answer} angle={angle} memory={memory} variables={variables} onUseValue={useComputedValue} onError={setError}/>}
     {tab==='stats'&&<div className="tc-calc-data">
       <div className="tc-calc-modes">{[['1var','1-Var'],['2var','2-Var']].map(([k,label])=>
        <button type="button" key={k} className={statsType===k?'active':''} onClick={()=>{setStatsType(k);setStatsResult(null)}}>{label}</button>)}</div>
       <label>{statsType==='1var'?'Data (comma-separated)':'Data (x,y pairs separated by ;)'}
        <textarea rows={3} value={statsInput} onChange={e=>setStatsInput(e.target.value)}
         placeholder={statsType==='1var'?'1, 2, 4, 8':'1,2; 2,4; 3,6'}/></label>
       <button className="tc-calc-data-submit" onClick={makeStats}>Calculate statistics</button>
       {statsResult&&<dl className="tc-calc-output">{Object.entries(statsResult).filter(([,v])=>v!==null).map(([k,v])=>
        <React.Fragment key={k}><dt>{k}</dt><dd>{formatScientific(v)}</dd></React.Fragment>)}</dl>}
     </div>}
     {tab==='table'&&<div className="tc-calc-data">
       <div className="tc-calc-modes"><button type="button" className={tableMode==='auto'?'active':''} onClick={()=>setTableMode('auto')}>Auto</button><button type="button" className={tableMode==='ask'?'active':''} onClick={()=>setTableMode('ask')}>Ask-x</button></div>
       <label>f(x)<input value={tableFormula} onChange={e=>setTableFormula(e.target.value)} placeholder="x^2+1"/></label>
       {tableMode==='auto'?<><div className="tc-calc-table-inputs"><label>Start<input value={tableStart} onChange={e=>setTableStart(e.target.value)}/></label>
        <label>Step<input value={tableStep} onChange={e=>setTableStep(e.target.value)}/></label></div>
        <label>Rows<input type="number" min="1" max="25" value={tableCount} onChange={e=>setTableCount(Number(e.target.value))}/></label></>
        :<label>x values (comma separated)<input value={askValues} onChange={e=>setAskValues(e.target.value)} placeholder="0, 1, 2.5"/></label>}
       <button className="tc-calc-data-submit" onClick={makeTable}>Calculate table</button>
       {!!tableRows.length&&<div className="tc-calc-table-results"><table><thead><tr><th>x</th><th>f(x)</th></tr></thead>
        <tbody>{tableRows.map((r,i)=><tr key={i}><td>{formatScientific(r.x)}</td><td>{formatScientific(r.y)}</td></tr>)}</tbody></table></div>}
     </div>}
     </div>}
     {showHistory&&<div className="tc-calc-history" aria-label="Calculation history">
       <div><b>Recent calculations</b><button onClick={()=>setHistory([])}>Clear</button></div>
       {!history.length?<p>No calculations yet</p>:history.map((h,i)=>
        <button type="button" key={i} onClick={()=>{setExpression(h.expression);setMathDoc(createMathDocument(h.expression));setShowHistory(false)}} title="Reuse and edit previous expression">
         <small>{h.expression}</small><b>{formatScientific(h.value)} ↵</b></button>)}
     </div>}
   </div>}
  </section>}
 </>,document.body);
}
