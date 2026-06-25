// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useEffect, useRef } from 'react';

export default function NetworkField(){
  const ref = useRef(null);
  useEffect(()=>{
    const c = ref.current, ctx = c.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w, h, nodes, raf;
    const seed=()=>{
      const r=c.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
      w=r.width; h=r.height; c.width=w*dpr; c.height=h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      nodes=Array.from({length:16},(_,i)=>({x:((i*97)%100)/100*w,y:((i*53)%100)/100*h,
        vx:(((i*7)%5)-2)*0.05, vy:(((i*11)%5)-2)*0.05}));
    };
    const frame=()=>{
      ctx.clearRect(0,0,w,h);
      for(const n of nodes){ if(!reduce){ n.x+=n.vx; n.y+=n.vy;
        if(n.x<0||n.x>w)n.vx*=-1; if(n.y<0||n.y>h)n.vy*=-1; } }
      for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j],d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<88){ ctx.strokeStyle='rgba(47,107,240,'+(0.13*(1-d/88))+')'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); } }
      for(const n of nodes){ ctx.fillStyle='rgba(47,107,240,0.22)';
        ctx.beginPath(); ctx.arc(n.x,n.y,1.7,0,Math.PI*2); ctx.fill(); }
      if(!reduce) raf=requestAnimationFrame(frame);
    };
    seed(); frame();
    const onR=()=>{ cancelAnimationFrame(raf); seed(); frame(); };
    addEventListener('resize',onR);
    return ()=>{ cancelAnimationFrame(raf); removeEventListener('resize',onR); };
  },[]);
  return <canvas ref={ref} aria-hidden="true"
    style={{position:'absolute',inset:0,width:'100%',height:'100%'}} />;
}
