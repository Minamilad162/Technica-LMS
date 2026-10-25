import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {capMotionDelay, getPageMotionPlan} from '../lib/motionPlan';

// Each route gets a designed, staggered entrance sequence. The animation never
// controls rendering, access to actions, assessment state, or content loading.
export default function MotionSystem(){
  const {pathname, key} = useLocation();
  useEffect(() => {
    if(typeof window === 'undefined') return;
    const root = document.querySelector('.auth-page') || document.querySelector('.page-content');
    if(!root) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarseQuery = window.matchMedia('(max-width: 700px)');
    if(motionQuery.matches || !('IntersectionObserver' in window)) return;

    const plan = getPageMotionPlan(pathname);
    const registered = new Map();
    let scheduled = 0;
    let disposed = false;
    let observer;

    const finish = node => {
      node.classList.remove('motion-pending','motion-playing');
      node.style.removeProperty('--motion-delay');
      node.style.removeProperty('--motion-x');
      node.style.removeProperty('--motion-y');
      node.style.removeProperty('--motion-scale');
      node.style.removeProperty('--motion-duration');
    };
    const play = node => {
      if(disposed || !registered.has(node)) return;
      node.classList.remove('motion-pending');
      node.classList.add('motion-playing');
    };
    observer = new IntersectionObserver(entries => {
      for(const entry of entries) {
        if(entry.isIntersecting){observer.unobserve(entry.target);play(entry.target);}
      }
    }, {rootMargin:'0px 0px 48px 0px',threshold:0.01});

    const register = () => {
      if(disposed) return;
      const viewport = window.innerHeight;
      const used = new Set();
      for(const group of plan){
        const nodes = [...root.querySelectorAll(group.selector)].slice(0,group.max);
        nodes.forEach((node,index) => {
          if(registered.has(node) || used.has(node)) return;
          used.add(node);
          const bounds = node.getBoundingClientRect();
          // Ignore content inside collapsed details or hidden layout variants.
          if(!node.getClientRects().length || bounds.height === 0 || bounds.width === 0) return;
          const nearTop = bounds.top < viewport * 0.95 && bounds.bottom > -20;
          const delay = capMotionDelay(group.start + group.step*index, nearTop);
          const variant = coarseQuery.matches ? 'up' : group.variant;
          const offsets = {left:[-26,0,.985],right:[26,0,.985],up:[0,19,.985],pop:[0,11,.955],fade:[0,0,1]};
          const [x,y,scale] = offsets[variant] || offsets.up;
          node.style.setProperty('--motion-delay',`${delay}ms`);
          node.style.setProperty('--motion-x',`${x}px`);
          node.style.setProperty('--motion-y',`${y}px`);
          node.style.setProperty('--motion-scale',String(scale));
          node.style.setProperty('--motion-duration',coarseQuery.matches?'420ms':'590ms');
          const onEnd = event => {if(event.target === node){finish(node);node.removeEventListener('animationend',onEnd);}};
          registered.set(node,onEnd);
          node.classList.add('motion-pending');
          node.addEventListener('animationend',onEnd);
          observer.observe(node);
        });
      }
    };

    register();
    // Tabs, filtering and freshly-added course cards should arrive gracefully too.
    const mutations = new MutationObserver(() => {
      if(scheduled || disposed) return;
      scheduled = requestAnimationFrame(() => {scheduled=0;register();});
    });
    mutations.observe(root,{childList:true,subtree:true});
    const stopForReducedMotion = () => {
      if(!motionQuery.matches) return;
      observer.disconnect();
      for(const [node,fn] of registered){node.removeEventListener('animationend',fn);finish(node);}
    };
    motionQuery.addEventListener('change',stopForReducedMotion);
    return () => {
      disposed = true;
      if(scheduled) cancelAnimationFrame(scheduled);
      observer.disconnect();
      mutations.disconnect();
      motionQuery.removeEventListener('change',stopForReducedMotion);
      for(const [node,fn] of registered){node.removeEventListener('animationend',fn);finish(node);}
    };
  },[pathname,key]);
  return null;
}
