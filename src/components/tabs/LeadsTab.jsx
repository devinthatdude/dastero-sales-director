// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { money, repName, urgency, TONE, OPEN_STAGES, STAGES, daysUntil, initials, avatarColor } from '../../lib/pipeline';

const stageName = (id) => STAGES.find((s) => s.id === id)?.name || id;

function exportCSV(leads){
  const headers=['Company','Contact','Title','Industry','Stage','Value','Phone','Email','Address','Source','Services','Next Action','Action Date','Notes'];
  const rows=leads.map(l=>[l.company,l.contact_name,l.contact_title,l.industry,l.stage,l.value,l.phone,l.email,l.address,l.source,(l.services||[]).join('; '),l.next_action,l.action_date,l.notes]);
  const csv=[headers,...rows].map(r=>r.map(v=>`"${(v??'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=`leads-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

const isOverdue=(l)=>OPEN_STAGES.includes(l.stage)&&l.action_date&&daysUntil(l.action_date)<0;

export default function LeadsTab({ leads, isAdmin, profiles=[], onOpen }){
  const [q,setQ]=useState('');
  const [filter,setFilter]=useState('active');
  const [ownerId,setOwnerId]=useState('');

  const owners=[...new Set(leads.map(l=>l.user_id).filter(Boolean))]
    .map(id=>({ id, name: repName(profiles.find(p=>p.id===id) || { id }) }))
    .sort((a,b)=>a.name.localeCompare(b.name));

  const counts={
    active: leads.filter(l=>OPEN_STAGES.includes(l.stage)).length,
    overdue: leads.filter(isOverdue).length,
  };
  const CHIPS=[
    {id:'active',label:'Active',count:counts.active},
    {id:'overdue',label:'Overdue',count:counts.overdue},
    {id:'closing',label:'Closing'},
    {id:'new',label:'New'},
  ];

  const matchFilter=(l)=>{
    if(filter==='active') return OPEN_STAGES.includes(l.stage);
    if(filter==='overdue') return isOverdue(l);
    if(filter==='closing') return l.stage==='negotiating'||l.stage==='solution_presented';
    if(filter==='new') return l.stage==='prospect';
    return true;
  };
  const filtered=leads.filter(l=>{
    const text=(`${l.company} ${l.contact_name||''} ${l.industry||''}`).toLowerCase().includes(q.toLowerCase());
    const owner=ownerId===''||l.user_id===ownerId;
    return text && owner && matchFilter(l);
  });

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* Search (+ admin owner filter / CSV, preserved from the prior app) */}
      <div className="flex gap-2 items-center">
        <div className="flex items-center gap-2.5 panel rounded-xl px-3 py-2.5 flex-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92A0B8" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search leads, companies…"
            className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px]" />
        </div>
        {isAdmin && (
          <button onClick={()=>exportCSV(filtered)} title="Export CSV"
            className="text-xs font-bold px-3 py-2.5 rounded-xl flex-none" style={{background:'rgba(27,158,110,.12)',color:'#1B9E6E',border:'1px solid rgba(27,158,110,.3)'}}>↓ CSV</button>
        )}
      </div>
      {isAdmin && owners.length>1 && (
        <select className="input" value={ownerId} onChange={e=>setOwnerId(e.target.value)}>
          <option value="">All owners</option>
          {owners.map(o=> <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      )}

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {CHIPS.map(c=>{
          const active=filter===c.id;
          return (
            <button key={c.id} onClick={()=>setFilter(c.id)}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={active?{background:'#2F6BF0',color:'#fff'}:{background:'#fff',border:'1px solid var(--line)',color:'#5C6B85'}}>
              {c.label}{c.count!==undefined?` · ${c.count}`:''}
            </button>
          );
        })}
      </div>

      {/* Lead rows */}
      {filtered.length===0
        ? <div className="dim text-sm py-10 text-center">{leads.length===0?'No leads yet — tap + to add one.':'No leads match.'}</div>
        : filtered.map(l=>{
          const u=urgency(l), c=TONE[u.tone];
          return (
            <div key={l.id} onClick={()=>onOpen(l.id)} className="panel rounded-xl px-3 py-2.5 flex items-center gap-3 cursor-pointer">
              <div className="w-[38px] h-[38px] rounded-[11px] text-white font-bold text-[12.5px] flex items-center justify-center flex-none" style={{background:avatarColor(l.company)}}>{initials(l.company)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2 items-baseline">
                  <div className="text-[13.5px] font-bold truncate" style={{letterSpacing:'-0.01em'}}>{l.company}</div>
                  <div className="mono text-[13px] font-bold flex-none">{money(l.value)}</div>
                </div>
                <div className="flex justify-between gap-2 items-center mt-0.5">
                  <div className="text-[11.5px] soft truncate">{stageName(l.stage)} · {u.label}</div>
                  <span className="w-[7px] h-[7px] rounded-full flex-none" style={{background:c}}/>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
