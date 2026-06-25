// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
// Layered sine waveform for the Ask Claude voice control. Calmer at rest,
// taller and faster while listening. Honors prefers-reduced-motion.
import { useEffect, useRef } from 'react';

export default function VoiceWave({ listening }){
  const ref = useRef(null);
  const listenRef = useRef(listening);
  listenRef.current = listening;

  useEffect(()=>{
    const c = ref.current, ctx = c.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w, h, phase = 0, raf;
    const size = ()=>{
      const r=c.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
      w=r.width; h=r.height; if(!w||!h) return;
      c.width=w*dpr; c.height=h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    size();
    const layers=[
      {amp:1,    freq:0.022, off:0,   color:'rgba(95,224,234,0.95)', lw:2},
      {amp:0.7,  freq:0.030, off:1.8, color:'rgba(47,107,240,0.75)', lw:1.5},
      {amp:0.45, freq:0.017, off:3.4, color:'rgba(255,255,255,0.32)',lw:1},
    ];
    const draw=()=>{
      if(!w||!h){ size(); raf=requestAnimationFrame(draw); return; }
      ctx.clearRect(0,0,w,h);
      const on=listenRef.current, base=on?14:5, mid=h/2;
      phase += on?0.10:0.045;
      for(const L of layers){
        ctx.beginPath();
        for(let x=0;x<=w;x+=2){
          const env=Math.sin((x/w)*Math.PI);
          const y=mid+Math.sin(x*L.freq+phase+L.off)*base*L.amp*(0.35+0.65*env);
          x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.strokeStyle=L.color; ctx.lineWidth=L.lw; ctx.lineJoin='round'; ctx.stroke();
      }
      if(!reduce) raf=requestAnimationFrame(draw);
    };
    draw();
    const onR=()=>size();
    addEventListener('resize',onR);
    return ()=>{ cancelAnimationFrame(raf); removeEventListener('resize',onR); };
  },[]);

  return <canvas ref={ref} aria-hidden="true" style={{display:'block',width:'100%',height:'46px'}} />;
}
