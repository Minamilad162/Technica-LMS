import React from 'react';
import {ArrowUpRight,ChartPie,Info} from 'lucide-react';
import {buildAdminDashboardDistributions} from './adminDashboardCharts.js';
import './adminDashboardCharts.css';

const circumference=2*Math.PI*70;
const format=v=>Number(v||0).toLocaleString();
export function AdminDonut({data,onNavigate}){
 let cursor=0;
 const sections=data.slices.map((slice,index)=>{
  const portion=data.total>0?slice.value/data.total:0;
  const length=circumference*portion;
  const item={...slice,index,strokeDasharray:length+' '+(circumference-length),
   strokeDashoffset:-cursor};
  cursor+=length;
  return item;
 });
 return <article className="at-donut-card" aria-label={data.title}>
  <div className="at-donut-head">
   <div><h3>{data.title}</h3><p>{data.subtitle}</p></div>
   <button type="button" className="at-donut-action" onClick={()=>onNavigate(data.target)}
    aria-label={'Explore '+data.title}><ArrowUpRight size={17}/></button>
  </div>
  <div className="at-donut-body">
   <div className="at-donut-graphic">
    <svg viewBox="0 0 180 180" role="img"
     aria-label={data.total===0?data.title+': no records':data.title+': '+
      data.slices.map(s=>s.label+' '+s.value).join(', ')}>
     <circle cx="90" cy="90" r="70" fill="none" stroke="#edf2f2" strokeWidth="22"/>
     {data.total>0&&sections.filter(s=>s.value>0).map(s=>
      <circle key={s.label} cx="90" cy="90" r="70" fill="none" stroke={s.color}
       strokeWidth="22" strokeDasharray={s.strokeDasharray}
       strokeDashoffset={s.strokeDashoffset} transform="rotate(-90 90 90)"
       strokeLinecap="butt"><title>{s.label}: {format(s.value)} ({Math.round(s.value/data.total*100)}%)</title></circle>)}
     <text x="90" y="83" textAnchor="middle" className="at-donut-value">{data.centerValue}</text>
     <text x="90" y="106" textAnchor="middle" className="at-donut-centerlabel">{data.centerLabel}</text>
    </svg>
   </div>
   <div className="at-donut-legend">
    {data.slices.map(s=><div key={s.label} className="at-donut-slice">
     <span className="at-donut-dot" style={{backgroundColor:s.color}} aria-hidden="true"/>
     <div className="at-donut-slicename"><span>{s.label}</span>
      <strong>{format(s.value)} <small>{data.total?Math.round(s.value/data.total*100)+'%':'—'}</small></strong>
     </div>
    </div>)}
    {!data.total&&<div className="at-donut-nodata">No verified records yet.</div>}
   </div>
  </div>
  <p className="at-donut-insight"><Info size={15}/>{data.insight}</p>
 </article>;
}
export default function AdminAnalyticsCharts({report,onNavigate}){
 const charts=buildAdminDashboardDistributions(report);
 return <section className="at-dashboard-analytics" aria-label="Admin analytics charts">
  <div className="at-section-title"><div><span className="at-eyebrow"><ChartPie size={14}/> PERFORMANCE BREAKDOWN</span>
   <h2>Understand your LMS at a glance</h2>
   <p>Actual Supabase records · publication, question allocation, accounts and completed attempts</p>
  </div></div>
  <div className="at-donuts-grid">{charts.map(chart=><AdminDonut
    key={chart.id} data={chart} onNavigate={onNavigate}/>)}</div>
 </section>;
}
