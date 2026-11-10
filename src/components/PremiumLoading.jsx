import React from 'react';
import './premiumLoading.css';

// Presentation-only. Authorization, subscriptions and RLS remain server-verified.
const acceptedVariants=new Set(['fullscreen','page','compact']);
export default function PremiumLoading({variant='page'}){
 const mode=acceptedVariants.has(variant)?variant:'page';
 return <div className={'tlm-premium-loading tlm-premium-loading--'+mode}
   role="status" aria-live="polite" aria-label="Loading">
  <div className="tlm-loading-ambient tlm-loading-ambient-a" aria-hidden="true"/>
  <div className="tlm-loading-ambient tlm-loading-ambient-b" aria-hidden="true"/>
  <div className="tlm-premium-inner">
   <div className="tlm-loading-emblem" aria-hidden="true">
    <div className="tlm-loading-orbit tlm-loading-orbit-outer"/>
    <div className="tlm-loading-orbit tlm-loading-orbit-inner"/>
    <span className="tlm-loading-logo"><img src="/images/technica-logo.webp" alt=""/></span>
   </div>
   <div className="tlm-loading-brand" aria-hidden="true">
    <strong>TECHNICA <span>CONSULT</span></strong><small>LMS</small>
   </div>
   <p className="tlm-loading-caption">Loading<span className="tlm-loading-dots" aria-hidden="true"><i/><i/><i/></span></p>
   <div className="tlm-loading-line" aria-hidden="true"><span/></div>
  </div>
 </div>;
}
