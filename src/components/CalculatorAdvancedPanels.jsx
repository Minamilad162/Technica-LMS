import React,{useMemo,useState} from 'react';
import{STORED_VARIABLES,parseNumericList,applyListFormula,statsFromLists,makeListState,recalculateListFormulas,convertAngle,dmsToDegrees,formatDMS,rectToPolar,polarToRect,applyConstantOperator}from'../lib/scientificCalculatorExtended';
import{evaluateScientific,formatScientific}from'../lib/scientificCalculator';

// Self-contained auxiliary menus for the original Technica scientific calculator.
// Values stay inside the current quiz's React state; no external service or sharing.
const display=v=>formatScientific(v);
const safe=(fn,onError)=>{try{onError('');fn()}catch(e){onError(e.message||'Math error')}};
export function VariablePanel({variables,setVariables,answer,expression,angle,memory,onInsert,onError}){
 const[selected,setSelected]=useState('x');
 const getValue=()=>evaluateScientific(expression||String(answer),{angleMode:angle,ans:answer,memory,variables});
 return <div className="tc-calc-data tc-calc-advanced">
  <b>Stored variables — x, y, z, t, a, b, c</b>
  <p>Store and recall independent values. Variables stay available while navigating questions in this quiz.</p>
  <div className="tc-calc-variable-grid">
   {STORED_VARIABLES.map(k=><button type="button" key={k} className={selected===k?'active':''} onClick={()=>setSelected(k)}>
    <b>{k}</b><small>{display(variables[k])}</small></button>)}
  </div>
  <div className="tc-calc-tool-actions">
   <button type="button" onClick={()=>safe(()=>{const v=getValue();setVariables(prev=>({...prev,[selected]:v}))},onError)}>STO → {selected}</button>
   <button type="button" onClick={()=>onInsert(selected)}>RCL {selected}</button>
   <button type="button" onClick={()=>setVariables(v=>({...v,[selected]:0}))}>Clear {selected}</button>
   <button type="button" onClick={()=>setVariables(Object.fromEntries(STORED_VARIABLES.map(k=>[k,0])))}>Clear all vars</button>
  </div>
 </div>;
}
export function ListPanel({lists,setLists,angle,memory,answer,variables,onError,onInsert}){
 const[target,setTarget]=useState('L3'),[formula,setFormula]=useState('L1+L2');
 const[kind,setKind]=useState('1var'),[frequency,setFrequency]=useState('none'),[result,setResult]=useState(null);
 const[menu,setMenu]=useState('DATA');
 const [raw,setRaw]=useState(()=>Object.fromEntries(['L1','L2','L3'].map(k=>[k,(lists[k]||[]).join(',')])));
 const parsed=useMemo(()=>{try{return Object.fromEntries(['L1','L2','L3'].map(k=>[k,parseNumericList(raw[k])]))}catch{return null}},[raw]);
 function updateRaw(k,v){setRaw(s=>({...s,[k]:v}));setResult(null)}
 const opts={angleMode:angle,ans:answer,memory,variables};
 const readCurrent=()=>Object.fromEntries(['L1','L2','L3'].map(k=>[k,parseNumericList(raw[k])]));
 const persist=next=>{setLists(next);setRaw(Object.fromEntries(['L1','L2','L3'].map(k=>[k,(next[k]||[]).join(',')])));setResult(null)};
 return <div className="tc-calc-data tc-calc-advanced">
  <b>Data editor · L1 / L2 / L3</b>
  <div className="tc-calc-modes" aria-label="Data menu">
   {['DATA','CLEAR','FORMULA'].map(name=><button type="button" key={name} className={menu===name?'active':''} onClick={()=>setMenu(name)}>{name}</button>)}
  </div>
  <p>Enter up to 42 numbers in each list. Formulas can use other lists and row number x.</p>
  <div className="tc-calc-list-grid">
   {['L1','L2','L3'].map(k=><label key={k}>{k}<textarea rows="2" value={raw[k]} onChange={e=>updateRaw(k,e.target.value)} placeholder="1, 2, 3" /></label>)}
  </div>
  <div className="tc-calc-tool-actions">
   <button type="button" onClick={()=>safe(()=>{
     const base=readCurrent(),formulas={...(lists.formulas||{})};
     // Editing a computed column directly clears its formula.
     for(const k of ['L1','L2','L3']){
      const previous=(lists[k]||[]).join(',');
      if(formulas[k]&&base[k].join(',')!==previous)delete formulas[k];
     }
     persist(recalculateListFormulas({...base,formulas},opts));
    },onError)}>Save lists & update formulas</button>
   <button type="button" onClick={()=>{persist(makeListState());setRaw({L1:'',L2:'',L3:''})}}>Clear all</button>
  </div>
  {menu==='CLEAR'&&<div className="tc-calc-tool-actions" aria-label="Clear list menu">
    {['L1','L2','L3'].map(k=><button key={k} type="button" onClick={()=>safe(()=>{
      const formulas={...(lists.formulas||{})};delete formulas[k];
      persist(recalculateListFormulas({...lists,[k]:[],formulas},opts))
    },onError)}>Clear {k}</button>)}
    <button type="button" onClick={()=>persist(makeListState())}>Clear ALL</button>
   </div>}
  <div className="tc-calc-divider"/>
  <label>Formula for
   <select value={target} onChange={e=>{setTarget(e.target.value);setFormula((lists.formulas||{})[e.target.value]||'')}}>{['L1','L2','L3'].map(k=><option key={k}>{k}</option>)}</select>
  </label>
  <label><input value={formula} onChange={e=>setFormula(e.target.value)} placeholder="L1+L2" /></label>
  <button type="button" className="tc-calc-data-submit" onClick={()=>safe(()=>{
   const base=readCurrent();
   const formulas={...(lists.formulas||{}),[target]:formula};
   persist(recalculateListFormulas({...base,formulas},opts));
  },onError)}>Apply formula</button>
  <div className="tc-calc-tool-actions">
    <button type="button" onClick={()=>safe(()=>{
      const base=readCurrent(),formulas={...(lists.formulas||{})};delete formulas[target];
      persist({...base,formulas});
      setFormula('');
    },onError)}>Clear {target} formula</button>
    <button type="button" onClick={()=>safe(()=>{const base=readCurrent();persist({...base,formulas:{}});setFormula('')},onError)}>Clear ALL formulas</button>
  </div>
  <div className="tc-calc-divider"/>
  <label>Statistics
   <select value={kind} onChange={e=>setKind(e.target.value)}>
    <option value="1var">1-variable (L1)</option><option value="2var">2-variable (L1,L2)</option>
   </select>
  </label>
  {kind==='1var'&&<label>Frequency list
   <select value={frequency} onChange={e=>setFrequency(e.target.value)}>
    <option value="none">None</option><option value="L2">L2</option><option value="L3">L3</option>
   </select>
  </label>}
  <button type="button" className="tc-calc-data-submit" onClick={()=>safe(()=>{
   const input=recalculateListFormulas({...readCurrent(),formulas:lists.formulas||{}},opts);
   persist(input);
   setResult(statsFromLists(input,kind,'L1','L2',kind==='1var'&&frequency!=='none'?frequency:null));
  },onError)}>Calculate statistics</button>
  {result&&<dl className="tc-calc-output">{Object.entries(result).filter(([,v])=>v!==null).map(([k,v])=><React.Fragment key={k}><dt>{k}</dt>
   <dd><button type="button" onClick={()=>onInsert(String(v))}>{display(v)}</button></dd></React.Fragment>)}</dl>}
  {parsed&&<small className="tc-calc-muted">{['L1','L2','L3'].map(k=>k+': '+parsed[k].length+' rows').join(' · ')}</small>}
 </div>;
}
export function AnglePanel({angle,onError,onUseValue}){
 const[value,setValue]=useState('90'),[from,setFrom]=useState('DEG'),[to,setTo]=useState('RAD');
 const [d,setD]=useState('30'),[m,setM]=useState('15'),[s,setS]=useState('0');
 const[a,setA]=useState('3'),[b,setB]=useState('4'),[kind,setKind]=useState('rect');
 const[out,setOut]=useState('');
 const save=(name,val)=>{setOut(name+': '+display(val));onUseValue(val)};
 return <div className="tc-calc-data tc-calc-advanced">
  <b>Angle · DMS · coordinate conversions</b>
  <div className="tc-calc-list-grid">
   <label>Angle<input value={value} onChange={e=>setValue(e.target.value)}/></label>
   <label>From<select value={from} onChange={e=>setFrom(e.target.value)}>{['DEG','RAD','GRAD'].map(k=><option key={k}>{k}</option>)}</select></label>
   <label>To<select value={to} onChange={e=>setTo(e.target.value)}>{['DEG','RAD','GRAD'].map(k=><option key={k}>{k}</option>)}</select></label>
  </div>
  <button className="tc-calc-data-submit" type="button" onClick={()=>safe(()=>save(to,convertAngle(Number(value),from,to)),onError)}>Convert angle</button>
  <div className="tc-calc-divider"/>
  <b>Degrees / minutes / seconds</b>
  <div className="tc-calc-list-grid">{[[d,setD,'°'],[m,setM,'′'],[s,setS,'″']].map(([val,change,label],i)=>
   <label key={i}>{label}<input value={val} onChange={e=>change(e.target.value)}/></label>)}</div>
  <div className="tc-calc-tool-actions"><button onClick={()=>safe(()=>save('Decimal degrees',dmsToDegrees(Number(d),Number(m),Number(s))),onError)}>DMS → decimal</button>
   <button onClick={()=>safe(()=>{const result=formatDMS(Number(value));setOut(result)},onError)}>Decimal → DMS</button></div>
  <div className="tc-calc-divider"/>
  <div className="tc-calc-modes"><button type="button" className={kind==='rect'?'active':''} onClick={()=>setKind('rect')}>Rect → Polar</button>
   <button type="button" className={kind==='polar'?'active':''} onClick={()=>setKind('polar')}>Polar → Rect</button></div>
  <div className="tc-calc-table-inputs">
   <label>{kind==='rect'?'x':'r'}<input value={a} onChange={e=>setA(e.target.value)}/></label>
   <label>{kind==='rect'?'y':'θ'}<input value={b} onChange={e=>setB(e.target.value)}/></label>
  </div>
  <button className="tc-calc-data-submit" type="button" onClick={()=>safe(()=>{
   const res=kind==='rect'?rectToPolar(Number(a),Number(b),angle):polarToRect(Number(a),Number(b),angle);
   setOut(Object.entries(res).map(([k,v])=>k+' = '+display(v)).join(' | '));
  },onError)}>Convert coordinates</button>
  {out&&<p className="tc-calc-result-text" aria-live="polite">{out}</p>}
 </div>;
}
export function ConstantPanel({answer,angle,memory,variables,onUseValue,onError}){
 const[formula,setFormula]=useState('x+2'),[on,setOn]=useState(false);
 return <div className="tc-calc-data tc-calc-advanced">
  <b>Constant operator · K</b>
  <p>Set an expression containing x, then apply it repeatedly to the previous answer, for example x+2, x×3 or x^2.</p>
  <label>Repeat operation<input value={formula} onChange={e=>{setFormula(e.target.value);setOn(false)}}/></label>
  <div className="tc-calc-tool-actions"><button onClick={()=>safe(()=>{
    applyConstantOperator(answer,formula,{angleMode:angle,ans:answer,memory,variables});setOn(true);
   },onError)}>{on?'K enabled':'Enable K'}</button>
   <button disabled={!on} onClick={()=>safe(()=>{
    const v=applyConstantOperator(answer,formula,{angleMode:angle,ans:answer,memory,variables});
    onUseValue(v,formula);
   },onError)}>Apply K ↵</button>
   <button onClick={()=>setOn(false)}>Disable</button></div>
  <p className="tc-calc-muted">Status: {on?'ON':'OFF'}. Reuses the last answer in the current calculator, not question answer choices.</p>
 </div>;
}
