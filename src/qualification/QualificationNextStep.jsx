import React from 'react';
import {ArrowRight, Info} from 'lucide-react';
import './qualificationNextStep.css';

export default function QualificationNextStep({step, onAction, onEvidence, busy}) {
  return <section className="qf-next-step" aria-label="Next step">
    <div>
      <h3>{step.title}</h3>
      {step.detail && <p>{step.detail}</p>}
      {step.blocked && <p className="qf-next-step-blocked"><Info size={16} aria-hidden="true"/>{step.blocked}</p>}
    </div>
    <div className="qf-next-step-actions">
      {step.action && <button className="qf-button qf-primary" type="button" disabled={busy} onClick={onAction}>{step.action}<ArrowRight size={16}/></button>}
      {onEvidence && <button className="qf-button qf-outline" type="button" disabled={busy} onClick={onEvidence}>Open Evidence Folder</button>}
    </div>
  </section>;
}
