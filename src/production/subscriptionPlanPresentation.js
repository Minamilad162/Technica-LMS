// P38: presentation-only helpers. All durations/prices come from the real
// published P21 Supabase plans, never from design mockup amounts.
const validPrice=plan=>!!plan&&Number.isFinite(Number(plan.price_amount))&&
 plan.price_amount!==null&&plan.price_amount!==undefined&&
 Number(plan.price_amount)>=0&&typeof plan.currency==='string'&&
 /^[A-Z]{3}$/.test(plan.currency)&&Number.isInteger(Number(plan.duration_months))&&
 Number(plan.duration_months)>0;
export function featuredSubscriptionPlanId(plans=[]){
 if(!plans.length)return '';
 const six=plans.find(p=>Number(p.duration_months)===6);
 return (six||plans[Math.floor((plans.length-1)/2)])?.id||'';
}
export function baselineSubscriptionPlan(plans=[]){
 return [...plans].filter(validPrice).sort((a,b)=>Number(a.duration_months)-Number(b.duration_months))[0]||null;
}
export function subscriptionPlanSavings(plan,baseline){
 if(!validPrice(plan)||!validPrice(baseline)||
  plan.currency!==baseline.currency||
  Number(plan.duration_months)<=Number(baseline.duration_months)||
  Number(baseline.price_amount)<=0)return null;
 const basePerMonth=Number(baseline.price_amount)/Number(baseline.duration_months);
 const planPerMonth=Number(plan.price_amount)/Number(plan.duration_months);
 const pct=Math.round((1-planPerMonth/basePerMonth)*100);
 return pct>0&&pct<=100?pct:null;
}
export const subscriptionTerm=months=>{
 const n=Number(months);
 return n===1?'1 month':Number.isInteger(n)&&n>0?n+' months':'Membership';
};
export function subscriptionPlanCallout(plan,featured=false){
 if(featured)return 'A balanced term to build your learning momentum.';
 if(Number(plan.duration_months)<=3)return 'Full platform access, with flexibility to get started.';
 return 'More time to learn, practice and prepare with confidence.';
}
