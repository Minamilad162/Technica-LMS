import React from 'react';
import {
 ArrowUpRight,BrainCircuit,Camera,ChartNoAxesColumnIncreasing,Check,ChevronDown,
 ChevronUp,ClipboardCheck,Clock3,Eye,Flame,Layers3,Play,Shuffle,
 SlidersHorizontal,Target,Timer
} from 'lucide-react';
import {BUILD_COUNTS} from './buildYourOwnConfig.js';
import './buildYourOwn.css';

// P45: faithful, code-built rendition of the owner's compact violet reference.
// Values are still passed unchanged to the existing P44 server configuration.
const difficultyChoices=[
 {id:'mixed',title:'Mixed',Icon:Shuffle},
 {id:'low',title:'Easy',Icon:Target},
 {id:'medium',title:'Medium',Icon:ChartNoAxesColumnIncreasing},
 {id:'high',title:'Hard',Icon:Flame},
 {id:'adaptive',title:'Adaptive',Icon:BrainCircuit}
];
const timerChoices=[
 {id:'none',title:'No timer'},
 {id:'whole',title:'Total time'},
 {id:'question',title:'Per question'},
 {id:'both',title:'Both'}
];
const feedbackChoices=[
 {id:'each',title:'After each question'},
 {id:'end',title:'At the end (summary)'}
];

function HeaderArt(){
 return <div className="byo-hero-art" aria-hidden="true">
  <span className="byo-target-graphic">
   <span className="byo-target-middle"><span className="byo-target-bullseye"/></span>
   <span className="byo-target-arrow"><ArrowUpRight size={48} strokeWidth={3}/></span>
  </span>
  <span className="byo-checklist-graphic">
   <span className="byo-checklist-clip"/>
   <span className="byo-checklist-line"><Check size={20}/><i/></span>
   <span className="byo-checklist-line"><Check size={20}/><i/></span>
   <span className="byo-checklist-line"><Check size={20}/><i/></span>
  </span>
 </div>;
}

function SelectOption({option,selected,onSelect,showIcon=true,variant=''}){
 const Icon=option.Icon;
 return <button type="button"
  className={'byo-pill byo-pill-'+variant+(selected?' is-active':'')}
  onClick={()=>onSelect(option.id)} aria-pressed={selected}>
  {showIcon&&Icon?<Icon size={21} strokeWidth={2.35} aria-hidden="true"/>:null}
  {!showIcon&&<span className="byo-radio" aria-hidden="true"/>}
  <span>{option.title}</span>
 </button>;
}

function CardTitle({icon:Icon,title,extra}){
 return <div className="byo-card-title">
  <div className="byo-card-title-main"><Icon size={28} strokeWidth={2.55} aria-hidden="true"/>
   <h5>{title}</h5></div>
  {extra&&<span className="byo-card-tag">{extra}</span>}
 </div>;
}

function NumberStepper({value,onChange,min=1,max=100,unit}){
 const number=Number(value);
 const step=delta=>onChange(Math.min(max,Math.max(min,(Number.isInteger(number)?number:min)+delta)));
 return <div className="byo-number-stepper">
  <input type="number" min={min} max={max} step="1" value={value}
   aria-label={unit} onChange={e=>onChange(e.target.value)}/>
  <div className="byo-stepper-buttons">
   <button type="button" aria-label={'Increase '+unit} disabled={number>=max}
    onClick={()=>step(1)}><ChevronUp size={21}/></button>
   <button type="button" aria-label={'Decrease '+unit} disabled={number<=min}
    onClick={()=>step(-1)}><ChevronDown size={21}/></button>
  </div>
 </div>;
}

export default function BuildYourOwnSettings({
 value,onChange,domains=[],onStart,busy=false,access=true
}){
 const set=(key,next)=>onChange({...value,[key]:next});
 const total=['whole','both'].includes(value.timerMode);
 const each=['question','both'].includes(value.timerMode);
 const difficulty=difficultyChoices.find(d=>d.id===value.difficulty)||difficultyChoices[0];
 const timerSummary=value.timerMode==='none'?'No timer':
  value.timerMode==='whole'?String(value.totalMinutes)+' Minutes':
  value.timerMode==='question'?String(value.secondsPerQuestion)+'s / question':
  String(value.totalMinutes)+' min + '+String(value.secondsPerQuestion)+'s/question';
 const feedbackSummary=value.feedbackTiming==='each'?'After each question':'Answers at the end';
 return <div className="byo-premium" aria-label="Build Your Own practice setup">
  <header className="byo-hero">
   <div className="byo-hero-intro">
    <span className="byo-hero-logo"><SlidersHorizontal size={40} strokeWidth={2.1}/></span>
    <div><h3>Build Your Own Practice</h3>
     <p>Customize your practice session exactly the way you want.</p></div>
   </div>
   <HeaderArt/>
  </header>

  <div className="byo-premium-content">
   <div className="byo-card-grid">
    <section className="byo-settings-card byo-questions-card" aria-label="Number of Questions">
     <CardTitle icon={Layers3} title="Number of Questions" extra="Max 100"/>
     <div className="byo-count-config">
      <div className="byo-count-presets" role="group" aria-label="Quick question counts">
       {BUILD_COUNTS.map(n=><button key={n} type="button"
        className={Number(value.count)===n?'is-active':''}
        onClick={()=>set('count',n)} aria-pressed={Number(value.count)===n}>{n}</button>)}
      </div>
      <span className="byo-count-divider" aria-hidden="true"/>
      <NumberStepper value={value.count} onChange={n=>set('count',n)}
       min={1} max={100} unit="Number of questions"/>
     </div>
    </section>

    <section className="byo-settings-card byo-difficulty-card" aria-label="Question Difficulty">
     <CardTitle icon={ChartNoAxesColumnIncreasing} title="Question Difficulty"/>
     <div className="byo-difficulty-options" role="group" aria-label="Question difficulty">
      {difficultyChoices.map(choice=><SelectOption key={choice.id} option={choice}
       selected={value.difficulty===choice.id} onSelect={v=>set('difficulty',v)}
       variant={'difficulty-'+choice.id}/>)}
     </div>
    </section>

    <section className="byo-settings-card byo-answer-card" aria-label="Answer Display">
     <CardTitle icon={Eye} title="Answer Display"/>
     <div className="byo-answer-options" role="group" aria-label="Answer display">
      {feedbackChoices.map(choice=><SelectOption key={choice.id} option={choice}
       selected={value.feedbackTiming===choice.id} onSelect={v=>set('feedbackTiming',v)}
       showIcon={false} variant="answer"/>)}
     </div>
    </section>

    <section className="byo-settings-card byo-timing-card" aria-label="Timing">
     <CardTitle icon={Clock3} title="Timing"/>
     <div className="byo-timing-options" role="group" aria-label="Timing">
      {timerChoices.map(choice=><SelectOption key={choice.id} option={choice}
       selected={value.timerMode===choice.id} onSelect={v=>set('timerMode',v)}
       showIcon={false} variant="timing"/>)}
     </div>
     {(total||each)&&<div className="byo-timing-values">
      {total&&<div className="byo-timing-value">
       <span><Timer size={25} strokeWidth={2.3}/> Total Exam Time</span>
       <span className="byo-timing-value-control">
        <NumberStepper value={value.totalMinutes} min={1} max={300}
         unit="Total exam time in minutes" onChange={n=>set('totalMinutes',n)}/>
        <em>minutes</em>
       </span>
      </div>}
      {each&&<div className="byo-timing-value">
       <span><Clock3 size={23} strokeWidth={2.3}/> Time Per Question</span>
       <span className="byo-timing-value-control">
        <NumberStepper value={value.secondsPerQuestion} min={10} max={600}
         unit="Time per question in seconds" onChange={n=>set('secondsPerQuestion',n)}/>
        <em>seconds</em>
       </span>
      </div>}
     </div>}
    </section>
   </div>

   <section className="byo-bottom-card" aria-label="Focus and camera options">
    <label className="byo-focus-field">
     <span className="byo-bottom-title"><Layers3 size={30} strokeWidth={2.5}/> Focus (Domain)</span>
     <span className="byo-select-shell">
      <select aria-label="Focus on a domain" value={value.domainId||''}
       onChange={e=>set('domainId',e.target.value)}>
       <option value="">All course domains</option>
       {domains.map(d=><option value={d.id} key={d.id}>{d.title}</option>)}
      </select>
      <ChevronDown size={23} aria-hidden="true"/>
     </span>
    </label>
    <div className="byo-bottom-divider" aria-hidden="true"/>
    <div className="byo-camera-field">
     <div className="byo-camera-label"><Camera size={32} strokeWidth={2.3}/>
      <div><strong>Camera (Optional)</strong><p>Live camera preview during the practice</p>
       <small>Preview only — not recorded or sent to an examiner.</small></div>
     </div>
     <label className="byo-switch-wrap">
      <input type="checkbox" checked={value.camera}
       onChange={e=>set('camera',e.target.checked)}
       aria-label="Camera preview"/>
      <span className="byo-switch-track" aria-hidden="true"><span/></span>
      <span>{value.camera?'On':'Off'}</span>
     </label>
    </div>
   </section>

   <footer className="byo-session-summary" aria-label="Session Summary">
    <div className="byo-summary-heading"><ClipboardCheck size={31} strokeWidth={2.15}/>
     <strong>Session Summary</strong></div>
    <div className="byo-summary-metrics" role="status" aria-live="polite">
     <span><Layers3 size={24}/>{Number(value.count)||0} Questions</span>
     <span><Clock3 size={24}/>{timerSummary}</span>
     <span><Shuffle size={24}/>{difficulty.title}</span>
     <span><Eye size={24}/>{feedbackSummary}</span>
     <span><Camera size={24}/>Camera: {value.camera?'On':'Off'}</span>
    </div>
    <button type="button" className="byo-start-button" onClick={onStart}
     disabled={busy||!access}>
     <Play size={23} fill="currentColor" aria-hidden="true"/>
     {busy?'Preparing…':'Start Practice'}
    </button>
   </footer>
  </div>
 </div>;
}
