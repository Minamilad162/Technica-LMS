import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import LiveProtectedContent from '../../src/production/LiveProtectedContent.jsx';

function LiveSessionFixture(){
 const [active,setActive]=useState(false);
 return <section>
  {active?<LiveProtectedContent kind="practice-session-surface">
   <h1>Protected fixture question</h1>
   <button type="button">Question navigator</button>
  </LiveProtectedContent>:<button type="button" onClick={async event=>{
   await event.currentTarget.parentElement.requestFullscreen();
   setActive(true);
  }}>Start fixture</button>}
 </section>;
}

createRoot(document.querySelector('#root')).render(<LiveSessionFixture/>);
