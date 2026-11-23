import React from 'react';
import {BarChart3,BookOpen,CalendarDays,ClipboardList,FolderOpen,GraduationCap,House,Layers3,LibraryBig,MessageSquare,Smartphone} from 'lucide-react';
import './qualificationInternalNav.css';

// This navigation is shared between a real, RLS-scoped enrolled portfolio and
// an awarding-body reference preview. Tabs never grant portfolio permissions.
const icons={
  programme:BookOpen,course:BookOpen,evidence:FolderOpen,
  registration:GraduationCap,contact:MessageSquare,metrics:BarChart3,
  dashboard:House,overview:Layers3,library:LibraryBig,
  tasks:ClipboardList,messages:MessageSquare,appointments:CalendarDays,resources:FolderOpen,app:Smartphone,
};
export const QUALIFICATION_NAV_ITEMS=[
  ['course','Course'],['evidence','Evidence'],['registration','Registration'],
  ['contact','Contact'],['metrics','Metrics'],['overview','Overview'],
  ['library','Study Library'],
];
export default function QualificationInternalNav({
  items=QUALIFICATION_NAV_ITEMS,active,onChange,disabled=false,
  ariaLabel='Qualification sections',readOnly=false,nested=false,
}){
 return <nav className={'qf-live-nav qf-internal-nav' + (nested ? ' qf-internal-nested' : '')} aria-label={ariaLabel}
   data-reference-mode={readOnly?'true':'false'}>
  {items.map(([key,label])=>{
   const Icon=icons[key]||BookOpen;
   const selected=active===key;
   return <button key={key} type="button" disabled={disabled} aria-current={selected?'page':undefined}
     aria-pressed={selected} className={selected?'qf-internal-active':''}
     onClick={()=>onChange(key)}>
     <Icon size={17} aria-hidden="true"/><span>{label}</span>
   </button>;
  })}
  {readOnly&&<span className="qf-internal-preview-label">Reference view</span>}
 </nav>;
}
