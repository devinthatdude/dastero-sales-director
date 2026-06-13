// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { STAGES, OPEN_STAGES, money } from '../../lib/pipeline';

function Bar({label,value,max,color}){
  const pct=max>0?Math.round(value/max*100):0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm w-36 truncate text-white">{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{background:'#26314B'}}>
        <div className="h-2 rounded-full" style={{width:pct+'%',background:color}}/>
      </div>
      <span className="text-sm font-semibold w-6 text-right text-white">{value}</span>
    </div>
  );
}
function Section({title,children}){ return <div className="panel rounded-2xl p-4 mb-3"><div className="dim text-[11px] uppercase tracking-wide font-semibold mb-1">{title}</div>{children}</div>; }
function Empty(){ return <div className="dim text-sm py-2">No data yet.</div>; }

export default function StatsTab({ leads, tags, profiles=[], isAdmin }){
  const pipelineVal=leads.filter(l=>OPEN_STAGES.includes(l.stage)).reduce((s,l)=>s+ +l.value,0);
  const wonVal=leads.filter(l=>l.stage==='closed_won').reduce((s,l)=>s+ +l.value,0);
  const stageCounts=STAGES.filter(s=>OPEN_STAGES.includes(s.id)).map(s=>({...s,n:leads.filter(l=>l.stage===s.id).length}));
  const maxStage=Math.max(1,...stageCounts.map(s=>s.n));
  const sources={}; leads.forEach(l=>{ if(l.source) sources[l.source]=(sources[l.source]||0)+1; });
  const services={}; leads.forEach(l=>(l.services||[]).forEach(s=>{ services[s]=(services[s]||0)+1; }));
  const tagCounts={}; leads.forEach(l=>(l.tagIds||[]).forEach(id=>{ tagCounts[id]=(tagCounts[id]||0)+1; }));
  const maxSrc=Math.max(1,...Object.values(sources));
  const maxSvc=Math.max(1,...Object.values(services));
  const maxTag=Math.max(1,...Object.values(tagCounts));

  // Rep leaderboard — admin only
  const repStats=profiles.map(p=>{
    const repLeads=leads.filter(l=>l.user_id===p.id);
    const open=repLeads.filter(l=>OPEN_STAGES.includes(l.stage));
    const won=repLeads.filter(l=>l.stage==='closed_won');
    return {
      name: p.full_name || p.email.split('@')[0],
      open: open.length,
      pipeline: open.reduce((s,l)=>s+ +l.value,0),
      won: won.reduce((s,l)=>s+ +l.value,0),
    };
  }).sort((a,b)=>b.pipeline-a.pipeline);
  const maxPipeline=Math.max(1,...repStats.map(r=>r.pipeline));

  return (
    <div className="px-4 pt-5">
      <div className="text-[11px] uppercase tracking-widest font-semibold" style={{color:'#2FB6C8'}}>Performance</div>
      <h1 className="text-3xl font-bold text-white mt-0.5 mb-4">Stats</h1>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="surface rounded-2xl p-4"><div className="dim text-[11px] uppercase font-semibold">Pipeline</div><div className="text-2xl font-bold text-white mt-1">{money(pipelineVal)}</div></div>
        <div className="surface rounded-2xl p-4"><div className="dim text-[11px] uppercase font-semibold">Closed Won</div><div className="text-2xl font-bold mt-1" style={{color:'#35C28A'}}>{money(wonVal)}</div></div>
      </div>

      {isAdmin && repStats.length>0 && (
        <Section title="Rep Leaderboard">
          {repStats.map((r,i)=>(
            <div key={r.name} className="flex items-center gap-3 py-2">
              <span className="text-xs font-bold w-4 text-center dim">{i+1}</span>
              <span className="text-sm font-semibold text-white w-28 truncate">{r.name}</span>
              <div className="flex-1 h-2 rounded-full" style={{background:'#26314B'}}>
                <div className="h-2 rounded-full" style={{width:Math.round(r.pipeline/maxPipeline*100)+'%',background:'#3B6FF0'}}/>
              </div>
              <div className="text-right w-20 flex-none">
                <div className="text-xs font-semibold text-white">{money(r.pipeline)}</div>
                <div className="text-[10px] dim">{r.open} open · {money(r.won)} won</div>
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section title="Pipeline Funnel">{stageCounts.map(s=> <Bar key={s.id} label={s.name} value={s.n} max={maxStage} color={s.color}/>)}</Section>
      <Section title="Lead Sources">{Object.keys(sources).length? Object.entries(sources).map(([k,v])=> <Bar key={k} label={k} value={v} max={maxSrc} color="#35C28A"/>):<Empty/>}</Section>
      <Section title="Services in Play">{Object.keys(services).length? Object.entries(services).map(([k,v])=> <Bar key={k} label={k} value={v} max={maxSvc} color="#3B6FF0"/>):<Empty/>}</Section>
      <Section title="Tags Breakdown">{Object.keys(tagCounts).length? Object.entries(tagCounts).map(([id,v])=>{const t=tags.find(x=>x.id===id);return <Bar key={id} label={t?`${t.emoji||''} ${t.label}`:'—'} value={v} max={maxTag} color={t?t.color:'#9AA6C0'}/>;}):<Empty/>}</Section>
    </div>
  );
}
