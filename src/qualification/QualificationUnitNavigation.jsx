import React, {useEffect, useRef} from 'react';
import './qualifications.css';

export default function QualificationUnitNavigation({units, selectedIndex, onSelect}) {
  const selectedButton = useRef(null);
  useEffect(() => {
    const button = selectedButton.current;
    const strip = button?.parentElement;
    if (!strip) return;
    const buttonBounds = button.getBoundingClientRect();
    const stripBounds = strip.getBoundingClientRect();
    if (buttonBounds.left < stripBounds.left) strip.scrollLeft += buttonBounds.left - stripBounds.left;
    if (buttonBounds.right > stripBounds.right) strip.scrollLeft += buttonBounds.right - stripBounds.right;
  }, [selectedIndex, units]);

  if (!units.length) return null;
  return <nav className="qf-unit-strip qf-programme-unit-strip" aria-label="Qualification units">
    <span className="qf-unit-strip-label" aria-hidden="true">UNITS</span>
    <div className="qf-number-tabs">
      {units.map((unit, index) => {
        const selected = index === selectedIndex;
        const number = /^\d+$/.test(unit.code) ? unit.code.padStart(2, '0') : String(index + 1).padStart(2, '0');
        const label = ['induction', 'cpd'].includes(unit.code?.toLowerCase()) ? unit.code : number;
        return <button key={unit.id || unit.code} ref={selected ? selectedButton : null} type="button"
          className={selected ? 'qf-number-tab active' : 'qf-number-tab'} aria-pressed={selected}
          aria-label={label + ' · ' + unit.title} title={unit.title} onClick={() => onSelect(index)}>
          {label}
        </button>;
      })}
    </div>
  </nav>;
}
