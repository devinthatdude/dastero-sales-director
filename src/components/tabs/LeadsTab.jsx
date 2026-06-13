// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import LeadCard from '../LeadCard';
import { money } from '../../lib/pipeline';

function exportCSV(leads){
  const headers=['Company','Contact','Title','Industry','Stage','Value','Phone','Email','Address','Source','Services','Next Action','Action Date','Notes'];
  const rows=leads.map(l=>[
    l.company, l.contact_name, l.contact_title, l.industry, l.stage,
    l.value, l.phone, l.email, l.address, l.source,
    (l.services||[]).join('; '), l.next_action, l.action_date, l.notes,
  ]);
  const csv=[headers,...rows].map(r=>r.map(v=>`"${(v??'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=`leads-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

export default function LeadsTab({ leads, tags, onOpen }){
  const [q,setQ]=useState('');
  const filtered=leads.filter(l=>(`${l.company} ${l.contact_name||''} ${l.industry||''}`).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="px-4 pt-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-semibold" style={{color:'#2FB6C8'}}>Database</div>
          <h1 className="text-3xl font-bold text-white mt-0.5">Leads</h1>
        </div>
        <button onClick={()=>exportCSV(filtered)}
          className="mt-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{background:'rgba(53,194,138,.12)',color:'#35C28A',border:'1px solid rgba(53,194,138,.3)'}}>
          ↓ CSV
        </button>
      </div>
      <input className="input mb-4" placeholder="Search company, contact, industry…" value={q} onChange={e=>setQ(e.target.value)} />
      {filtered.length===0
        ? <div className="dim text-sm py-10 text-center">{leads.length===0?'No leads yet — tap + to add one.':'No leads match.'}</div>
        : filtered.map(l=> <LeadCard key={l.id} lead={l} tags={tags} onOpen={onOpen} />)}
    </div>
  );
}
