import React from 'react';
import {Camera,CheckCircle2,Clock3,Eye,EyeOff,Layers3,SlidersHorizontal,Target} from 'lucide-react';
import {BUILD_COUNTS,BUILD_DIFFICULTIES,BUILD_TIMER_MODES} from './buildYourOwnConfig.js';
import './buildYourOwn.css';

const clockOptions=[
 {id:'none',title:'No timer',detail:'Practice at your own pace'},
 {id:'whole',title:'Whole test',detail:'One countdown for the session'},
 {id:'question',title:'Each question',detail:'New countdown every question'},
 {id:'both',title:'Both timers',detail:'Overall and per-question limits'}
];
const difficultOptions=[
 {id:'mixed',title:'Mixed',detail:'Random approved difficulty levels'},
 {id:'low',title:'Easy',detail:'Focus on the fundamentals'},
 {id:'medium',title:'Medium',detail:'Build exam confidence'},
 {id:'high',title:'Hard',detail:'Challenge yourself'},
 {id:'adaptive',title:'Adaptive',detail:'Difficulty increases after 70% mastery'}
];
function ChoiceGrid({label,options,value,onSelect,columns='default'}){
 return <div className="byo-choice-block"><strong>{label}</strong>
  <div className={'byo-choices byo-choices-'+columns} role="group" aria-label={label}>
   {options.map(option=><button key={option.id} type="button"
    className={'byo-choice '+(value===option.id?'selected':'')}
    aria-pressed={value===option.id} onClick={()=>onSelect(option.id)}>
    <span><b>{option.title}</b><small>{option.detail}</small></span>
    {value===option.id&&<CheckCircle2 size={18}/>}
   </button>)}
  </div>
 </div>;
}
export default function BuildYourOwnSettings({value,onChange,domains=[]}){
 const set=(key,next)=>onChange({...value,[key]:next});
 const total=['whole','both'].includes(value.timerMode);
 const each=['question','both'].includes(value.timerMode);
 return <div className="byo-panel" aria-label="Build Your Own practice setup">
  <div className="byo-panel-heading"><span className="byo-emblem"><SlidersHorizontal size={20}/></span>
   <div><span className="byo-eyebrow">YOUR SESSION · YOUR RULES</span>
    <h4>Build Your Own Practice</h4>
    <p>Choose exactly how you'd like to practice. Your settings apply only to this session.</p>
   </div>
  </div>
  <div className="byo-field"><div className="byo-field-heading">
   <strong><Target size={17}/> Number of questions</strong><b>Maximum 100</b>
  </div>
   <div className="byo-count-row"><input type="number" min="1" max="100" step="1"
    aria-label="Custom question count" value={value.count}
    onChange={e=>set('count',e.target.value)}/>
    <div className="byo-count-presets" aria-label="Quick question counts">
     {BUILD_COUNTS.map(n=><button type="button" key={n} className={Number(value.count)===n?'active':''}
      aria-pressed={Number(value.count)===n} onClick={()=>set('count',n)}>{n}</button>)}
    </div>
   </div>
  </div>
  <ChoiceGrid label="When should the answers appear?"
   options={[{id:'each',title:'After each question',detail:'See the correct answer and explanation right away'},
    {id:'end',title:'At the end',detail:'Review everything after submitting your practice'}]}
   value={value.feedbackTiming} onSelect={v=>set('feedbackTiming',v)} columns="two"/>
  <ChoiceGrid label="How do you want to be timed?" options={clockOptions}
   value={value.timerMode} onSelect={v=>set('timerMode',v)} columns="two"/>
  {(total||each)&&<div className="byo-timer-inputs">
   {total&&<label><Clock3 size={16}/> Total test duration (minutes)
    <input type="number" min="1" max="300" step="1" value={value.totalMinutes}
     onChange={e=>set('totalMinutes',e.target.value)}/><small>1–300 minutes</small></label>}
   {each&&<label><Clock3 size={16}/> Time for each question (seconds)
    <input type="number" min="10" max="600" step="1" value={value.secondsPerQuestion}
     onChange={e=>set('secondsPerQuestion',e.target.value)}/><small>10–600 seconds</small></label>}
  </div>}
  <ChoiceGrid label="Question difficulty" options={difficultOptions}
   value={value.difficulty} onSelect={v=>set('difficulty',v)} columns="difficulty"/>
  {domains.length>0&&<label className="byo-domain"><Layers3 size={17}/> Focus on a domain (optional)
   <select value={value.domainId||''} onChange={e=>set('domainId',e.target.value)}>
    <option value="">All course domains</option>
    {domains.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
   </select></label>}
  <div className="byo-camera">
   <div><Camera size={20}/><div><strong>Camera preview</strong>
    <p>Optional live camera view during Practice. The camera is not recorded or sent to an examiner.</p></div></div>
   <label className="byo-camera-switch">
    <input type="checkbox" checked={value.camera} onChange={e=>set('camera',e.target.checked)}
     aria-label="Use camera during Practice"/>
    <span>{value.camera?'On':'Off'}</span>
   </label>
  </div>
  <div className="byo-summary"><Eye size={15}/>
   {value.feedbackTiming==='each'?'Answers after every question':'Answers at the end'}
   <span>·</span>
   {clockOptions.find(o=>o.id===value.timerMode)?.title}
   <span>·</span>
   {difficultOptions.find(o=>o.id===value.difficulty)?.title}
   <span>·</span>{Number(value.count)||0} questions
  </div>
 </div>;
}
