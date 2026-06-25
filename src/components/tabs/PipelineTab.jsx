// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { STAGES, OPEN_STAGES, money, forecast } from '../../lib/pipeline';

export default function PipelineTab({ leads }){
  const fc = forecast(leads);
  const stages = STAGES.filter(s=>OPEN_STAGES.includes(s.id)).map(s=>{
    const items=leads.filter(l=>l.stage===s.id);
    return { ...s, count:items.length, value:items.reduce((a,l)=>a+ +l.value,0) };
  });
  const maxVal=Math.max(1,...stages.map(s=>s.value));

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* ---------- Weighted forecast hero ---------- */}
      <div className="surface rounded-2xl px-[18px] py-4 flex justify-between items-center">
        <div>
          <div className="text-[10.5px] tracking-[0.18em] uppercase font-bold dim">Weighted forecast</div>
          <div className="mono text-[30px] font-bold mt-1.5 leading-none" style={{letterSpacing:'-0.02em'}}>
            <span style={{color:'#2F6BF0'}}>$</span>{fc.weighted.toLocaleString('en-US')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] soft">of {money(fc.openVal)} open</div>
          <div className="text-[11.5px] font-bold mt-1" style={{color:'#1B9E6E'}}>{fc.pct}% likely</div>
        </div>
      </div>

      {/* ---------- By stage ---------- */}
      <div className="flex items-center gap-2.5 mt-0.5 px-0.5">
        <div className="text-[15px] font-extrabold" style={{letterSpacing:'-0.01em'}}>By stage</div>
        <div className="flex-1 h-px" style={{background:'var(--line)'}}/>
        <div className="text-[11px] dim font-bold">{fc.count} deal{fc.count!==1?'s':''}</div>
      </div>

      {stages.map(s=>(
        <div key={s.id} className="panel rounded-xl px-3.5 py-3">
          <div className="flex justify-between items-baseline">
            <div className="text-[13.5px] font-bold">{s.name}</div>
            <div className="mono text-[13.5px] font-bold">{money(s.value)}</div>
          </div>
          <div className="flex items-center gap-2.5 mt-2.5">
            <div className="flex-1 h-1.5 rounded-md overflow-hidden" style={{background:'#EEF2F9'}}>
              <div className="h-full rounded-md" style={{width:Math.round(s.value/maxVal*100)+'%',background:'linear-gradient(90deg,#2F6BF0,#7AA0F4)'}}/>
            </div>
            <div className="text-[11px] soft font-bold whitespace-nowrap">{s.count} deal{s.count!==1?'s':''}</div>
          </div>
        </div>
      ))}
      {fc.count===0 && <div className="dim text-sm text-center py-10">No open deals yet — add one with +.</div>}
    </div>
  );
}
