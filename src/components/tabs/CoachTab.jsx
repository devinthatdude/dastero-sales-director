// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useEffect, useState } from 'react';
import { OPEN_STAGES, money, daysUntil, urgency, TONE } from '../../lib/pipeline';
import { coachPlays } from '../../lib/askClaude';

const enc = encodeURIComponent;

export default function CoachTab({ leads, onOpen }){
  const [plays,setPlays]=useState([]);
  const [ai,setAi]=useState(false);
  const [loading,setLoading]=useState(true);

  // At-risk summary for the focus card.
  const open=leads.filter(l=>OPEN_STAGES.includes(l.stage));
  const atRisk=open.filter(l=>l.action_date && daysUntil(l.action_date)<=0);
  const atRiskVal=atRisk.reduce((s,l)=>s+ +l.value,0);

  useEffect(()=>{
    let alive=true;
    setLoading(true);
    coachPlays(leads).then(r=>{ if(alive){ setPlays(r.plays); setAi(r.ai); setLoading(false); } });
    return ()=>{ alive=false; };
    // Re-rank when the set of open deals meaningfully changes.
  },[leads.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const leadFor=(name)=>leads.find(l=>l.company===name);
  const act=(p)=>{
    const l=leadFor(p.company);
    if(l?.email){ window.location.href=`mailto:${enc(l.email)}?subject=${enc('Following up — '+l.company)}`; }
    else if(l) onOpen(l.id);
  };

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* ---------- Today's focus ---------- */}
      <div className="rounded-2xl px-4 py-4 text-white" style={{background:'linear-gradient(150deg,var(--navy),var(--navy2))'}}>
        <div className="text-[10.5px] tracking-[0.18em] uppercase font-bold" style={{color:'#5FE0EA'}}>Today’s focus</div>
        <div className="text-[16px] font-bold mt-1.5 leading-snug" style={{maxWidth:'30ch'}}>
          {atRisk.length>0
            ? `Recover ${atRisk.length} stalled deal${atRisk.length!==1?'s':''} before ${atRisk.length!==1?'they slip':'it slips'} further.`
            : 'No deals are overdue — keep momentum on your open pipeline.'}
        </div>
        {atRisk.length>0 && (
          <div className="mono text-[12px] mt-2" style={{color:'rgba(255,255,255,.72)'}}>{money(atRiskVal)} at risk</div>
        )}
      </div>

      <div className="flex items-center gap-2.5 px-0.5">
        <div className="text-[15px] font-extrabold" style={{letterSpacing:'-0.01em'}}>Plays</div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'rgba(47,107,240,.09)',color:'#2F6BF0'}}>
          {ai?'AI-ranked':'Auto-ranked'}
        </span>
        <div className="flex-1 h-px" style={{background:'var(--line)'}}/>
      </div>

      {loading && <div className="dim text-sm py-6 text-center">Ranking your plays…</div>}
      {!loading && plays.length===0 && <div className="dim text-sm py-6 text-center">No open deals to coach yet.</div>}

      {!loading && plays.map((p,i)=>{
        const l=leadFor(p.company);
        const c = l ? TONE[urgency(l).tone] : '#D98A2B';
        return (
          <div key={i} className="surface rounded-xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span className="w-[7px] h-[7px] rounded-full" style={{background:c,boxShadow:`0 0 0 3px ${c}2e`}}/>
              <div className="text-[13px] font-bold truncate">{p.company}</div>
              <span className="ml-auto text-[10.5px] font-bold whitespace-nowrap" style={{color:c}}>{p.tag}</span>
            </div>
            <div className="text-[14px] font-bold leading-snug" style={{letterSpacing:'-0.01em'}}>{p.action}</div>
            <div className="text-[12px] soft leading-relaxed">{p.reason}</div>
            <div className="flex gap-2 mt-0.5">
              <button onClick={()=>act(p)} className="flex-1 brandbtn text-white font-bold text-[12.5px] py-2.5 rounded-lg">{p.cta}</button>
              {l && <button onClick={()=>onOpen(l.id)} className="font-bold text-[12.5px] px-4 py-2.5 rounded-lg panel">Open</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
