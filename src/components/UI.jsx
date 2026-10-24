import React from 'react';
import{ArrowRight,Check,ChevronRight,X}from'lucide-react';
import{useDemo}from'../lib/store';
export function Pill({children,variant='mint',className=''}){return <span className={`pill pill-${variant} ${className}`}>{children}</span>}
export function SectionTitle({children,sub,action}){return <div className="section-heading"><div><h2>{children}</h2>{sub&&<p>{sub}</p>}</div>{action&&<div>{action}</div>}</div>}
export function MiniProgress({value=0}){return <div className="mini-progress"><span style={{width:`${value}%`}}/></div>}
export function ActionButton({children,onClick,secondary=false,outline=false,className='',disabled=false,icon:Icon=ArrowRight,type='button'}){return <button type={type} className={`btn ${secondary?'btn-secondary':''} ${outline?'btn-outline':''} ${className}`} onClick={onClick} disabled={disabled}>{children}{Icon&&<Icon size={17}/>}</button>}
export function Modal({title,children,onClose,footer}){return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><h3>{title}</h3><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={19}/></button></div><div className="modal-body">{children}</div>{footer&&<div className="modal-foot">{footer}</div>}</div></div>}
export function DemoToast(){const{toast}=useDemo();return <div className={`toast ${toast?'show':''}`} role="status"><Check size={17}/>{toast}</div>}
export function Breadcrumb({items=[]}){return <div className="breadcrumb">{items.map((x,i)=><React.Fragment key={i}>{i>0&&<ChevronRight size={13}/>}<span>{x}</span></React.Fragment>)}</div>}
export function Avatar({name='Alex Morgan',className=''}){const initials=name.split(' ').map(x=>x[0]).slice(0,2).join('');return <span className={`avatar ${className}`}>{initials}</span>}
export function SelectButtons({values,value,onChange,className=''}){return <div className={`segmented ${className}`}>{values.map(v=><button key={v.value??v} className={(v.value??v)===value?'selected':''} onClick={()=>onChange(v.value??v)}>{v.label??v}</button>)}</div>}
