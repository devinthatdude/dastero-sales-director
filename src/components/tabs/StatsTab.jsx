// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { OPEN_STAGES, money, repName } from '../../lib/pipeline';

const SVC_COLORS = ['#2F6BF0','#0B8C95','#C77A1A','#6E5BD6','#1B9E6E','#3F5FA6'];
const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`;

export default function StatsTab({ leads, profiles=[], isAdmin }){
  const open=leads.filter(l=>OPEN_STAGES.includes(l.stage));
  const won=leads.filter(l=>l.stage==='closed_won');
  const lost=leads.filter(l=>l.stage==='closed_lost');
  const now=new Date();

  // --- Metric tiles (real where possible; deltas only when prior-period data exists) ---
  const wonThis=won.filter(l=>l.updated_at && monthKey(new Date(l.updated_at))===monthKey(now));
  const lastMonthDate=new Date(now.getFullYear(),now.getMonth()-1,1);
  const wonLast=won.filter(l=>l.updated_at && monthKey(new Date(l.updated_at))===monthKey(lastMonthDate));
  const wonThisVal=wonThis.reduce((s,l)=>s+ +l.value,0);
  const wonLastVal=wonLast.reduce((s,l)=>s+ +l.value,0);
  const momDelta = wonLastVal>0 ? Math.round((wonThisVal-wonLastVal)/wonLastVal*100) : null;
  const winRate = (won.length+lost.length)>0 ? Math.round(won.length/(won.length+lost.length)*100)+'%' : '—';
  const avgDeal = open.length>0 ? money(Math.round(open.reduce((s,l)=>s+ +l.value,0)/open.length)) : '—';
  const cycles = won.filter(l=>l.created_at&&l.updated_at).map(l=>(new Date(l.updated_at)-new Date(l.created_at))/86400000);
  const avgCycle = cycles.length>0 ? Math.round(cycles.reduce((a,b)=>a+b,0)/cycles.length)+' days' : '—';

  const metrics=[
    { label:`Closed won · ${now.toLocaleString('en-US',{month:'short'})}`, value:money(wonThisVal),
      delta: momDelta!==null?`${momDelta>=0?'+':''}${momDelta}% MoM`:null, deltaColor: momDelta>=0?'#1B9E6E':'#DC4B43' },
    { label:'Win rate', value:winRate, delta:null },
    { label:'Avg deal size', value:avgDeal, delta:null },
    { label:'Avg cycle', value:avgCycle, delta:null },
  ];

  // --- 6-month closed-won revenue ---
  const months=[];
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const v=won.filter(l=>l.updated_at && monthKey(new Date(l.updated_at))===monthKey(d)).reduce((s,l)=>s+ +l.value,0);
    months.push({ mo:d.toLocaleString('en-US',{month:'short'}), v });
  }
  const maxMo=Math.max(1,...months.map(m=>m.v));
  const hasRevenue=months.some(m=>m.v>0);

  // --- Pipeline by service (open value) ---
  const svc={}; open.forEach(l=>(l.services||[]).forEach(s=>{ svc[s]=(svc[s]||0)+ +l.value; }));
  const svcEntries=Object.entries(svc).sort((a,b)=>b[1]-a[1]);
  const svcTotal=svcEntries.reduce((s,[,v])=>s+v,0)||1;

  // --- Rep leaderboard (admin, preserved) ---
  const repStats=profiles.map(p=>{
    const rl=leads.filter(l=>l.user_id===p.id);
    return { name:repName(p), open:rl.filter(l=>OPEN_STAGES.includes(l.stage)).length,
      pipeline:rl.filter(l=>OPEN_STAGES.includes(l.stage)).reduce((s,l)=>s+ +l.value,0),
      won:rl.filter(l=>l.stage==='closed_won').reduce((s,l)=>s+ +l.value,0) };
  }).filter(r=>r.pipeline>0||r.won>0).sort((a,b)=>b.pipeline-a.pipeline);
  const maxPipe=Math.max(1,...repStats.map(r=>r.pipeline));

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="grid grid-cols-2 gap-2.5">
        {metrics.map(m=>(
          <div key={m.label} className="panel rounded-xl p-3.5">
            <div className="dim text-[10px] uppercase tracking-wide font-bold">{m.label}</div>
            <div className="mono text-[26px] font-bold mt-1.5" style={{letterSpacing:'-0.02em'}}>{m.value}</div>
            {m.delta && <div className="text-[11px] font-bold mt-1" style={{color:m.deltaColor}}>{m.delta}</div>}
          </div>
        ))}
      </div>

      {/* Closed revenue · 6 months */}
      <div className="panel rounded-2xl p-4">
        <div className="dim text-[10.5px] tracking-wider uppercase font-bold">Closed revenue · last 6 months</div>
        {hasRevenue ? (
          <div className="flex items-end gap-2 mt-3.5" style={{height:'128px'}}>
            {months.map((m,i)=>(
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 justify-end h-full">
                <div className="mono text-[9px] font-bold soft">{m.v?'$'+Math.round(m.v/1000)+'k':''}</div>
                <div className="w-full rounded-t-md" style={{maxWidth:'24px',height:Math.round(m.v/maxMo*100)+'%',minHeight:m.v?'4px':'0',background:i===months.length-1?'#2F6BF0':'#C9D6EE'}}/>
                <div className="text-[9.5px] font-bold dim">{m.mo}</div>
              </div>
            ))}
          </div>
        ) : <div className="dim text-sm py-4">No closed-won history yet — this fills in as deals close.</div>}
      </div>

      {/* Pipeline by service */}
      <div className="panel rounded-2xl p-4 flex flex-col gap-2.5">
        <div className="dim text-[10.5px] tracking-wider uppercase font-bold">Pipeline by service</div>
        {svcEntries.length ? svcEntries.map(([name,v],i)=>(
          <div key={name} className="flex items-center gap-2.5">
            <div className="w-[120px] text-[12px] font-bold truncate">{name}</div>
            <div className="flex-1 h-2 rounded-lg overflow-hidden" style={{background:'#EEF2F9'}}>
              <div className="h-full rounded-lg" style={{width:Math.round(v/svcTotal*100)+'%',background:SVC_COLORS[i%SVC_COLORS.length]}}/>
            </div>
            <div className="mono text-[11px] font-bold soft w-9 text-right">{Math.round(v/svcTotal*100)}%</div>
          </div>
        )) : <div className="dim text-sm">No services tagged on open deals yet.</div>}
      </div>

      {isAdmin && repStats.length>0 && (
        <div className="panel rounded-2xl p-4 flex flex-col gap-1">
          <div className="dim text-[10.5px] tracking-wider uppercase font-bold mb-1">Rep leaderboard</div>
          {repStats.map((r,i)=>(
            <div key={r.name} className="flex items-center gap-3 py-1.5">
              <span className="text-xs font-bold w-4 text-center dim">{i+1}</span>
              <span className="text-sm font-semibold w-24 truncate">{r.name}</span>
              <div className="flex-1 h-2 rounded-full" style={{background:'#EEF2F9'}}>
                <div className="h-2 rounded-full" style={{width:Math.round(r.pipeline/maxPipe*100)+'%',background:'#2F6BF0'}}/>
              </div>
              <div className="text-right w-20 flex-none">
                <div className="mono text-xs font-bold">{money(r.pipeline)}</div>
                <div className="text-[10px] dim">{r.open} open · {money(r.won)} won</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="dim text-[11px] leading-relaxed px-0.5">
        Trend figures (MoM, win rate, cycle, 6-month revenue) populate from closed-deal history — sparse until more deals close.
      </div>
    </div>
  );
}
