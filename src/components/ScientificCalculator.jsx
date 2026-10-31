import React,{useCallback,useEffect,useRef,useState} from 'react';
import{createPortal}from'react-dom';
import{Calculator,Grip,Minus,X,Delete}from'lucide-react';
import{evaluateScientific,formatScientific,oneVariableStats,twoVariableStats}from'../lib/scientificCalculator';
import{exactScientific,formatExactPlain,formatWithMode,freshVariables,makeListState,makeFunctionTable}from'../lib/scientificCalculatorExtended';
import{VariablePanel,ListPanel,AnglePanel,ConstantPanel}from'./CalculatorAdvancedPanels';

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
export default function ScientificCalculator({context='Quiz'}){
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
 const root=useRef(null),textField=useRef(null),drag=useRef(null);
 const insert=useCallback(s=>{setExpression(e=>e.length+s.length<=220?e+s:e);setError('')},[]);
 const evaluate=useCallback(()=>{
   try{
     const v=evaluateScientific(expression,{angleMode:angle,ans:answer,memory,variables});
     const exact=exactScientific(v,expression);
     const formatted=(showExact&&viewMode==='MATH'&&exact)?formatExactPlain(exact):formatWithMode(v,{notation,fixed:fixed==='FLOAT'?null:Number(fixed),asFraction:fraction,mixed});
     setLastExact(exact);setLastCalcExpression(expression);setPercentView(false);
     setAnswer(v);setResult(formatted);setHistory(h=>[{expression,value:v},...h].slice(0,12));
     setExpression(formatScientific(v));setShowHistory(false);setError('');
   }catch(e){setError(e.message||'Math error')}
 },[expression,angle,answer,memory,variables,notation,fraction,mixed,fixed,showExact,viewMode]);
 const press=useCallback(key=>{
   if(key==='second'){setSecond(s=>!s);return}
   if(key==='mode'){setAngle(a=>a==='DEG'?'RAD':a==='RAD'?'GRAD':'DEG');return}
   if(key==='delete'){setExpression(e=>e.slice(0,-1));setError('');return}
   if(key==='clear'){setExpression('');setResult('0');setError('');return}
   if(key==='history'){setShowHistory(s=>!s);return}
   if(key==='enter'){evaluate();return}
   if(key==='nCr'||key==='nPr'){setExpression(e=>key+'('+e+',');setError('');return}
   if(key==='store'){try{setMemory(evaluateScientific(expression||String(answer),{angleMode:angle,ans:answer,memory,variables}));setError('')}catch(e){setError(e.message)}return}
   if(key==='fraction'){insert('/');return}
   if(key==='mixed'){setFraction(true);setMixed(x=>!x);setResult(formatScientific(answer,{notation,asFraction:true,mixed:!mixed}));return}
   if(second){
     const alt={log:'pow10(',ln:'exp(',sin:'asin(',cos:'acos(',tan:'atan(',sqrt:'cbrt(',square:'sqrt(',fact:'rand()',inv:'abs('};
     if(alt[key]){insert(alt[key]);setSecond(false);return}
   }
   const dict={add:'+',subtract:'-',multiply:'×',divide:'÷',pow:'^',square:'^2',cube:'^3',
     sqrt:'√(',cbrt:'cbrt(',log:'log(',ln:'ln(',sin:'sin(',cos:'cos(',tan:'tan(',
     pi:'π',fact:'!',inv:'^(-1)',left:'(',right:')',percent:'%',ans:'Ans',
     neg:'-',ee:'E',nCr:'nCr(',nPr:'nPr('};
   const value=NUMBERS.has(key)?(key==='dot'?'.':key):dict[key];
   if(value)insert(value);
 },[expression,answer,angle,memory,second,insert,evaluate,fraction,mixed,notation,variables]);
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
 useEffect(()=>{if(open&&!minimized&&tab==='keys')textField.current?.focus({preventScroll:true})},[open,minimized,tab]);
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
     <Grip size={15}/><strong>TECHNICA <span>SCIENTIFIC</span></strong><small>{context}</small>
     <button type="button" title={minimized?'Restore':'Minimize'} aria-label={minimized?'Restore calculator':'Minimize calculator'}
      onClick={()=>setMinimized(v=>!v)}><Minus size={15}/></button>
     <button type="button" aria-label="Close calculator" title="Close" onClick={()=>setOpen(false)}><X size={18}/></button>
   </header>
   {!minimized&&<div className="tc-calc-body">
     <div className="tc-calc-display">
       <div className="tc-calc-display-status"><span>{angle} · {notation} · {fixed==='FLOAT'?'FLOAT':'FIX '+fixed} · {viewMode}</span><span>{second?'2nd · ':''}{memory?'M · ':''}{fraction?'FRAC':''}</span></div>
       <label className="tc-calc-sr-only" htmlFor="tc-calc-expression">Expression</label>
       <input ref={textField} id="tc-calc-expression" spellCheck={false} autoComplete="off"
        aria-label="Calculator expression" value={expression}
        onChange={e=>{if(e.target.value.length<=220){setExpression(e.target.value);setError('')}}}
        placeholder="Type an expression…" />
       <div className="tc-calc-lcd-history" aria-label="Previous calculation">{history[0]&&<span>{history[0].expression} = {formatScientific(history[0].value)}</span>}</div>
       <div className="tc-calc-display-result" aria-live="polite">{error?<span className="tc-calc-error">{error}</span>:
    percentView?formatScientific(answer*100)+'%':lastExact&&viewMode==='MATH'&&showExact?<ExactOutput exact={lastExact}/>:result}</div>
     </div>
     <div className="tc-calc-modebar">
       {['DEG','RAD','GRAD'].map(a=><button key={a} type="button" className={angle===a?'active':''} onClick={()=>setAngle(a)}>{a}</button>)}
       <span className="tc-calc-mode-separator"/><button type="button" title="Toggle exact/approximate result"
       onClick={()=>{setShowExact(v=>!v);const e=exactScientific(answer,lastCalcExpression);setResult(!showExact&&viewMode==='MATH'&&e?formatExactPlain(e):formatWithMode(answer,{notation,fixed:fixed==='FLOAT'?null:Number(fixed),asFraction:fraction,mixed}))}}>≈/≡</button>
       <button type="button" title="Toggle fraction/decimal" onClick={()=>{setFraction(v=>!v);setShowExact(false);setPercentView(false);setResult(formatWithMode(answer,{notation,fixed:fixed==='FLOAT'?null:Number(fixed),asFraction:!fraction,mixed}))}}>f↔d</button>
       <button type="button" title="Toggle percent/decimal display" onClick={()=>setPercentView(v=>!v)}>%↔d</button>
       {['NORM','SCI','ENG'].map(a=><button key={a} type="button" className={notation===a?'active':''}
        onClick={()=>{setNotation(a);setShowExact(false);setResult(formatWithMode(answer,{notation:a,fixed:fixed==='FLOAT'?null:Number(fixed),asFraction:fraction,mixed}))}}>{a}</button>)}
     </div>
     <div className="tc-calc-display-settings">
       <button type="button" className={viewMode==='MATH'?'active':''} onClick={()=>{setViewMode('MATH');setPercentView(false)}}>Textbook</button>
       <button type="button" className={viewMode==='CLASSIC'?'active':''} onClick={()=>{setViewMode('CLASSIC');setPercentView(false);setResult(formatWithMode(answer,{notation,fixed:fixed==='FLOAT'?null:Number(fixed),asFraction:fraction,mixed}))}}>Classic</button>
       <label>Decimals <select value={fixed} onChange={e=>{setFixed(e.target.value);setShowExact(false);setResult(formatWithMode(answer,{notation,fixed:e.target.value==='FLOAT'?null:Number(e.target.value),asFraction:fraction,mixed}))}}>
        <option value="FLOAT">FLOAT</option>{Array.from({length:10},(_,i)=><option value={String(i)} key={i}>FIX {i}</option>)}
       </select></label>
     </div>
     <nav className="tc-calc-tabs" aria-label="Calculator tools">
       {[['keys','Keypad'],['extra','Functions'],['stats','Stats'],['lists','L1–L3'],['table','Table'],['vars','Memory'],['angle','Angle'],['constant','K']].map(([k,label])=>
        <button type="button" key={k} className={tab===k?'active':''} onClick={()=>{setTab(k);setError('')}}>{label}</button>)}
     </nav>
     {tab==='keys'&&<div className="tc-calc-keys" aria-label="Scientific calculator keypad">
       {KEYS.map(([label,key])=><button type="button" key={key} data-calc-key={key}
        className={['tc-calc-key',NUMBERS.has(key)?'tc-calc-num':'',OPERATIONS.has(key)?'tc-calc-operator':'',
          key==='enter'?'tc-calc-enter':'',['second','mode','delete','clear','history'].includes(key)?'tc-calc-utility':'',
          second&&key==='second'?'tc-calc-2nd-active':''].join(' ')}
        onClick={()=>press(key)} title={second&&SECONDARY[key]?SECONDARY[key]:label}
        aria-label={second&&SECONDARY[key]?SECONDARY[key]+' function':label}>{second&&SECONDARY[key]?SECONDARY[key]:label}</button>)}
     </div>}
     {tab==='extra'&&<div className="tc-calc-extra">
       <p>Insert a function. Use commas to separate inputs.</p>
       <div>{ADVANCED.map(([label,value])=><button type="button" key={label} onClick={()=>{insert(value);setTab('keys')}}>{label}</button>)}</div>
       <div className="tc-calc-memory"><b>M: {formatScientific(memory)}</b>
         <button onClick={()=>setMemory(0)}>MC</button><button onClick={()=>insert('M')}>MR</button>
         <button onClick={()=>{try{const amount=evaluateScientific(expression||String(answer),{angleMode:angle,ans:answer,memory,variables});setMemory(m=>m+amount);setError('')}catch(e){setError(e.message)}}}>M+</button>
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
     {showHistory&&<div className="tc-calc-history" aria-label="Calculation history">
       <div><b>Recent calculations</b><button onClick={()=>setHistory([])}>Clear</button></div>
       {!history.length?<p>No calculations yet</p>:history.map((h,i)=>
        <button type="button" key={i} onClick={()=>{setExpression(h.expression);setShowHistory(false)}} title="Reuse and edit previous expression">
         <small>{h.expression}</small><b>{formatScientific(h.value)} ↵</b></button>)}
     </div>}
     <div className="tc-calc-footer"><span>Independent scientific calculator</span>
      <button type="button" onClick={()=>{setExpression('');setResult('0');setAnswer(0);setError('');setHistory([]);setSecond(false)}}><Delete size={13}/> Reset</button></div>
   </div>}
  </section>}
 </>,document.body);
}
