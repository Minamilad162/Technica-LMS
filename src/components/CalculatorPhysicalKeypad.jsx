import React from 'react';

/**
 * Technica original, photo-referenced physical layout. Five vertical columns,
 * dedicated circular arrow pad, two upper control rows, seven main keypad rows.
 * Keep keys in photo positions on mobile and desktop — never reorder by media query.
 * The shell is intentionally Technica-branded, not an official TI emulator.
 */
export const PHYSICAL_LAYOUT=[
 {key:'ln',label:'ln',alt:'eˣ',secondary:'eˣ',kind:'fn'},
 {key:'fraction',label:'n/d',alt:'f↔d',secondary:'f ↔ d',kind:'fn'},
 {key:'ee',label:'×10ˣ',alt:'Functions',secondary:'SCI',kind:'fn'},
 {key:'table',label:'table',alt:'≈/≡',secondary:'f ↔ d',kind:'fn'},
 {key:'clear',label:'clear',alt:'RESET',secondary:'reset',kind:'fn'},
 {key:'pi',label:'π',alt:'HYP',secondary:'hyp',kind:'fn'},
 {key:'sin',label:'sin',alt:'sin⁻¹',secondary:'sin⁻¹',kind:'fn'},
 {key:'cos',label:'cos',alt:'cos⁻¹',secondary:'cos⁻¹',kind:'fn'},
 {key:'tan',label:'tan',alt:'tan⁻¹',secondary:'tan⁻¹',kind:'fn'},
 {key:'divide',label:'÷',alt:'K',secondary:'K',kind:'op'},
 {key:'pow',label:'^',alt:'ⁿ√x',secondary:'ⁿ√x',kind:'fn'},
 {key:'inv',label:'x⁻¹',alt:'√',secondary:'√',kind:'fn'},
 {key:'left',label:'(',alt:'◀',secondary:'◀',kind:'fn'},
 {key:'right',label:')',alt:'▶',secondary:'▶',kind:'fn'},
 {key:'multiply',label:'×',alt:'%',secondary:'%',kind:'op'},
 {key:'square',label:'x²',alt:'√x',secondary:'√x',kind:'fn'},
 {key:'7',label:'7',kind:'num'},
 {key:'8',label:'8',kind:'num'},
 {key:'9',label:'9',kind:'num'},
 {key:'subtract',label:'−',kind:'op'},
 {key:'mixed',label:'a b/c',alt:'Clear var',secondary:'clear var',kind:'fn'},
 {key:'4',label:'4',kind:'num'},
 {key:'5',label:'5',kind:'num'},
 {key:'6',label:'6',kind:'num'},
 {key:'add',label:'+',kind:'op'},
 {key:'store',label:'sto▶',alt:'Recall',secondary:'recall',kind:'fn'},
 {key:'1',label:'1',kind:'num'},
 {key:'2',label:'2',kind:'num'},
 {key:'3',label:'3',kind:'num'},
 {key:'history',label:'◀▶',alt:'Ans',secondary:'ans',kind:'light'},
 {key:'on',label:'on',alt:'off',secondary:'off',kind:'fn'},
 {key:'0',label:'0',alt:'reset',secondary:'reset',kind:'num'},
 {key:'dot',label:'.',alt:'Math',secondary:'math',kind:'num'},
 {key:'neg',label:'(−)',alt:'Ans',secondary:'ans',kind:'num'},
 {key:'enter',label:'enter',alt:'History',kind:'enter'}
];
export const UPPER_LAYOUT=[
 {key:'second',label:'2nd',kind:'second'},
 {key:'mode',label:'mode',alt:'quit',secondary:'quit',kind:'fn'},
 {key:'delete',label:'delete',alt:'insert',secondary:'insert',kind:'fn'},
 {key:'log',label:'log',alt:'10ˣ',secondary:'10ˣ',kind:'fn'},
 {key:'prb',label:'prb',alt:'angle',secondary:'angle',kind:'fn'},
 {key:'data',label:'data',alt:'stat',secondary:'stat',kind:'fn'}
];
export function PhysicalKey({item,second,onPress}){
 const isAlt=second&&item.key!=='second'&&!!item.alt;
 const label=isAlt?item.alt:item.label;
 return <button type="button"
  data-calc-key={item.key}
  data-calc-kind={item.kind}
  className={'tc-calc-key tc-calc-physical-key tc-calc-'+item.kind+(isAlt?' tc-calc-alt-active':'')}
  aria-label={label}
  aria-pressed={item.key==='second'?second:undefined}
  title={label}
  onPointerDown={e=>e.preventDefault()}
  onClick={()=>onPress(item.key)}>
  {item.secondary&&<span className="tc-calc-physical-shift" aria-hidden="true">{item.secondary}</span>}
  <span className="tc-calc-physical-label">{label}</span>
 </button>
}
export default function CalculatorPhysicalKeypad({second,onPress,onNavigate}){
 return <div className="tc-calc-physical-pad" aria-label="Scientific calculator physical key layout">
  <div className="tc-calc-top-grid">
   {UPPER_LAYOUT.map(item=><PhysicalKey key={item.key} item={item} second={second} onPress={onPress}/>)}
   <div className="tc-calc-direction-pad" role="group" aria-label="Calculator navigation arrows">
    {[['up','▲'],['left','◀'],['right','▶'],['down','▼']].map(([direction,label])=>
     <button type="button" key={direction} className={'tc-calc-direction tc-calc-direction-'+direction}
      aria-label={'Navigate '+direction} title={'Navigate '+direction}
      onPointerDown={e=>e.preventDefault()} onClick={()=>onNavigate(direction)}>{label}</button>)}
    <span aria-hidden="true" className="tc-calc-direction-hub"/>
   </div>
  </div>
  <div className="tc-calc-keys tc-calc-main-grid" aria-label="Scientific calculator keypad">
   {PHYSICAL_LAYOUT.map(item=><PhysicalKey key={item.key} item={item} second={second} onPress={onPress}/>)}
  </div>
 </div>;
}
