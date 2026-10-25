import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

// Progressive-enhancement motion: never controls data, route access, or user actions.
// Interactive assessment sessions are deliberately excluded from scroll choreography.
const TARGETS = [
  '.home-top-grid > *', '.course-grid > *', '.weekly-grid > *',
  '.asp-home-panel', '.asp-home-domains > *',
  '.practice-main', '.practice-summary', '.practice-topics > *',
  '.analytics-stats > *', '.analytics-mid > *', '.asp-analytics-panel',
  '.asp-coverage-item', '.learners-panel',
  '.builder-header', '.builder-tab-body', '.module-panel', '.builder-aside-card',
  '.assessment-banner', '.assessment-stat-grid > *', '.assessment-content-grid > *',
  '.result-summary', '.result-stats > *', '.results-detail-grid > *',
  '.auth-story-bottom', '.auth-form-card',
  '.bank-entry', '.saved-list > *',
].join(',');

export default function MotionSystem(){
  const {pathname} = useLocation();
  useEffect(()=>{
    if(typeof window === 'undefined' || !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      /\/(take|session)(?:\/|$)/.test(pathname)) return;
    const root = document.querySelector('.auth-page') || document.querySelector('.page-content');
    if(!root) return;
    let disposed = false;
    let frame = 0;
    const seen = new WeakSet();
    const observer = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('motion-seen');
          observer.unobserve(entry.target);
        }
      });
    },{threshold:0.05,rootMargin:'0px 0px -25px 0px'});
    const register = ()=>{
      if(disposed) return;
      root.querySelectorAll(TARGETS).forEach((node,index)=>{
        if(seen.has(node)) return;
        seen.add(node);
        // Stagger only short groups; do not create delays on long lists.
        node.style.setProperty('--motion-order',String(index%4));
        node.classList.add('motion-reveal');
        observer.observe(node);
      });
    };
    register();
    // React filters and module editing may insert cards without changing routes.
    const mutations = new MutationObserver(()=>{
      if(frame) return;
      frame=window.requestAnimationFrame(()=>{frame=0;register();});
    });
    mutations.observe(root,{childList:true,subtree:true});
    return ()=>{
      disposed=true;
      if(frame) window.cancelAnimationFrame(frame);
      mutations.disconnect();
      observer.disconnect();
      root.querySelectorAll('.motion-reveal').forEach(n=>{
        n.classList.remove('motion-reveal','motion-seen');
        n.style.removeProperty('--motion-order');
      });
    };
  },[pathname]);
  return null;
}
