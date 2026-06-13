// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import LeadCard from '../LeadCard';

export default function LeadsTab({ leads, tags, onOpen }){
  const [q,setQ]=useState('');
  const filtered=leads.filter(l=>(`${l.company} ${l.contact_name||''} ${l.industry||''}`).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="px-4 pt-5">
      <div className="text-[11px] uppercase tracking-widest font-semibold" style={{color:'#2FB6C8'}}>Database</div>
      <h1 className="text-3xl font-bold text-white mt-0.5 mb-3">Leads</h1>
      <input className="input mb-4" placeholder="Search company, contact, industry…" value={q} onChange={e=>setQ(e.target.value)} />
      {filtered.length===0
        ? <div className="dim text-sm py-10 text-center">{leads.length===0?'No leads yet — tap + to add one.':'No leads match.'}</div>
        : filtered.map(l=> <LeadCard key={l.id} lead={l} tags={tags} onOpen={onOpen} />)}
    </div>
  );
}
