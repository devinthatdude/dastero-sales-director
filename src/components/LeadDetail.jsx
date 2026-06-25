// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useEffect, useState } from 'react';
import { STAGES, SERVICES, SOURCES, urgency, TONE, money, repName } from '../lib/pipeline';

// Escape every user-controlled value before it enters the deal-sheet HTML.
// Leads are shared firm-wide and some fields come from imported spreadsheets,
// so an unescaped value (e.g. "<img onerror=…>") would be stored XSS at print time.
const esc = s => (s ?? '').toString()
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function printDealSheet(lead, tags){
  const leadTags=(lead.tagIds||[]).map(id=>tags.find(t=>t.id===id)).filter(Boolean);
  const w=window.open('','_blank','width=800,height=900');
  if(!w){ alert('Pop-ups are blocked. Please allow pop-ups for this site to print deal sheets.'); return; }
  w.document.write(`<!doctype html><html><head><title>${esc(lead.company)} — Deal Sheet</title>
  <style>
    body{font-family:system-ui,sans-serif;margin:40px;color:#111;max-width:680px}
    h1{font-size:24px;margin:0 0 4px} .sub{color:#555;font-size:14px;margin-bottom:24px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:24px}
    .field label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#888;display:block;margin-bottom:2px}
    .field span{font-size:14px;font-weight:600}
    .tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px}
    .tag{font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;border:1px solid #ddd}
    .services{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px}
    .svc{font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;background:#e6f9f1;color:#1a7a4a}
    .notes{font-size:13px;color:#333;white-space:pre-wrap;border:1px solid #eee;border-radius:8px;padding:12px;margin-top:8px}
    .footer{margin-top:32px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px}
  </style></head><body>
  <h1>${esc(lead.company)}</h1>
  <div class="sub">${esc([lead.contact_name,lead.contact_title].filter(Boolean).join(' · '))}</div>
  <div class="grid">
    <div class="field"><label>Stage</label><span>${esc(STAGES.find(s=>s.id===lead.stage)?.name||lead.stage)}</span></div>
    <div class="field"><label>Value</label><span>${money(lead.value)}</span></div>
    <div class="field"><label>Industry</label><span>${esc(lead.industry)||'—'}</span></div>
    <div class="field"><label>Source</label><span>${esc(lead.source)||'—'}</span></div>
    <div class="field"><label>Phone</label><span>${esc(lead.phone)||'—'}</span></div>
    <div class="field"><label>Email</label><span>${esc(lead.email)||'—'}</span></div>
    <div class="field"><label>Address</label><span>${esc(lead.address)||'—'}</span></div>
    <div class="field"><label>Next Action</label><span>${esc(lead.next_action)||'—'}</span></div>
    <div class="field"><label>Action Date</label><span>${esc(lead.action_date)||'—'}</span></div>
  </div>
  ${(lead.services||[]).length?`<div class="services">${lead.services.map(s=>`<span class="svc">${esc(s)}</span>`).join('')}</div>`:''}
  ${leadTags.length?`<div class="tags">${leadTags.map(t=>`<span class="tag" style="border-color:${esc(t.color)};color:${esc(t.color)}">${esc(t.emoji||'')} ${esc(t.label)}</span>`).join('')}</div>`:''}
  ${lead.notes?`<div><label style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#888">Notes</label><div class="notes">${esc(lead.notes)}</div></div>`:''}
  <div class="footer">Dastero Tech LLC · Generated ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
  </body></html>`);
  w.document.close();
  w.print();
}

const empty={company:'',contact_name:'',contact_title:'',industry:'',source:'Cold Outreach',
  stage:'prospect',value:0,phone:'',email:'',address:'',services:[],next_action:'',action_date:'',notes:''};

export default function LeadDetail({ leadId, leads, tags, profiles=[], isAdmin, userId, addLead, updateLead, deleteLead, setLeadTags, onClose }){
  const existing = leadId ? leads.find(l=>l.id===leadId) : null;
  const [sub,setSub]=useState(leadId?'info':'edit');
  const [form,setForm]=useState(empty);
  useEffect(()=>{ setForm(existing?{...empty,...existing,action_date:existing.action_date||''}:empty); },[leadId]); // eslint-disable-line

  const set=(k)=>(e)=>setForm(f=>({...f,[k]:e.target.value}));
  const toggleService=(s)=>setForm(f=>({...f,services:f.services.includes(s)?f.services.filter(x=>x!==s):[...f.services,s]}));

  const save=async()=>{
    if(!form.company.trim()) return;
    const {id,user_id,created_at,updated_at,lead_tags,tagIds,...d}=form;
    d.value=Number(d.value)||0; d.action_date=d.action_date||null;
    if(existing){ updateLead(existing.id,d); setSub('info'); }
    else { const newId=await addLead(d); if(newId) onClose(); }
  };
  const setStage=(stage)=>{ if(existing) updateLead(existing.id,{stage}); setForm(f=>({...f,stage})); };
  const toggleTag=(tagId)=>{
    if(!existing) return;
    const cur=existing.tagIds||[];
    setLeadTags(existing.id, cur.includes(tagId)?cur.filter(t=>t!==tagId):[...cur,tagId]);
  };

  const SUBS = existing ? ['info','edit','tags','cadence','notes'] : ['edit'];
  const u = existing ? urgency(existing) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{background:'rgba(4,7,15,.5)'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="panel w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-auto">
        <div className="flex items-start justify-between p-5 pb-3">
          <div>
            <h2 className="text-xl font-bold leading-tight">{form.company||'New lead'}</h2>
            {existing && <div className="soft text-sm">{existing.contact_name||'—'}{existing.contact_title?` · ${existing.contact_title}`:''}</div>}
          </div>
          <button onClick={onClose} className="dim text-xl px-2">✕</button>
        </div>

        <div className="flex gap-4 px-5 border-b text-sm font-semibold" style={{borderColor:'#DCE4F1'}}>
          {SUBS.map(s=>(
            <button key={s} onClick={()=>setSub(s)} className="pb-2 capitalize"
              style={{color:sub===s?'#2F6BF0':'#92A0B8',borderBottom:sub===s?'2px solid #2F6BF0':'2px solid transparent'}}>{s}</button>
          ))}
        </div>

        <div className="p-5">
          {sub==='info'   && existing && <Info lead={existing} tags={tags} profiles={profiles} u={u} setStage={setStage} canDelete={isAdmin || existing.user_id===userId} onDelete={()=>{deleteLead(existing.id);onClose();}} onPrint={()=>printDealSheet(existing,tags)} />}
          {sub==='edit'   && <Edit form={form} set={set} toggleService={toggleService} save={save} isNew={!existing} />}
          {sub==='tags'   && existing && <Tags tags={tags} active={existing.tagIds||[]} toggle={toggleTag} />}
          {sub==='cadence'&& existing && (
            <div className="soft text-sm">Next: <span style={{color:'#0C1626'}}>{existing.next_action||'—'}</span>{existing.action_date?` · ${existing.action_date}`:''}
              <div className="dim mt-3">Full follow-up sequences arrive in a later update.</div></div>
          )}
          {sub==='notes'  && existing && <Notes lead={existing} updateLead={updateLead} />}
        </div>
      </div>
    </div>
  );
}

function Row({k,v}){ return <div><div className="dim text-[11px] uppercase tracking-wide font-semibold">{k}</div><div className="text-sm mt-0.5">{v||'—'}</div></div>; }

function Info({lead,tags,profiles,u,setStage,canDelete,onDelete,onPrint}){
  const leadTags=(lead.tagIds||[]).map(id=>tags.find(t=>t.id===id)).filter(Boolean);
  const owner=profiles.find(p=>p.id===lead.user_id);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STAGES.map(s=>(
          <button key={s.id} onClick={()=>setStage(s.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{border:`1px solid ${lead.stage===s.id?s.color:'#DCE4F1'}`,color:lead.stage===s.id?s.color:'#5C6B85',
              background:lead.stage===s.id?s.color+'22':'transparent'}}>{s.name}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Row k="Value" v={money(lead.value)}/><Row k="Industry" v={lead.industry}/>
        <Row k="Source" v={lead.source}/><Row k="Phone" v={lead.phone}/>
        <Row k="Email" v={lead.email}/><Row k="Address" v={lead.address}/>
        <Row k="Next action" v={lead.next_action}/><Row k="Action date" v={lead.action_date}/>
      </div>
      {(lead.services||[]).length>0 && (
        <div className="flex flex-wrap gap-1.5">
          {lead.services.map(s=> <span key={s} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{background:'rgba(27,158,110,.12)',color:'#1B9E6E'}}>{s}</span>)}
        </div>
      )}
      {leadTags.length>0 && (
        <div className="flex flex-wrap gap-1.5">
          {leadTags.map(t=> <span key={t.id} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{background:t.color+'22',color:t.color}}>{t.emoji} {t.label}</span>)}
        </div>
      )}
      {u && (u.tone==='cold'||u.tone==='warm') && (
        <div className="text-sm font-semibold rounded-lg px-3 py-2" style={{background:TONE[u.tone]+'1A',color:TONE[u.tone]}}>{u.label} — {lead.next_action||'follow up'}</div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {lead.phone && <a href={`tel:${lead.phone}`} className="surface rounded-xl py-3 text-center text-sm font-semibold">📞 Call</a>}
        {lead.email && <a href={`mailto:${lead.email}`} className="surface rounded-xl py-3 text-center text-sm font-semibold">✉️ Email</a>}
      </div>
      {owner && <div className="text-xs dim">Owner: <span className="font-semibold" style={{color:'#0C1626'}}>{repName(owner)}</span></div>}
      <button onClick={onPrint} className="w-full text-sm font-semibold py-2.5 rounded-xl" style={{color:'#2F6BF0',background:'rgba(47,107,240,.08)',border:'1px solid rgba(47,107,240,.2)'}}>🖨 Print deal sheet</button>
      {canDelete && <button onClick={onDelete} className="w-full text-sm font-semibold py-2.5 rounded-xl" style={{color:'#DC4B43',background:'rgba(220,75,67,.1)'}}>Delete lead</button>}
    </div>
  );
}

function Field({l,children}){ return <label className="block flex-1"><span className="dim text-[11px] uppercase tracking-wide font-semibold block mb-1">{l}</span>{children}</label>; }

function Edit({form,set,toggleService,save,isNew}){
  return (
    <div className="space-y-3">
      <Field l="Company"><input className="input" value={form.company} onChange={set('company')} /></Field>
      <div className="flex gap-3"><Field l="Contact"><input className="input" value={form.contact_name} onChange={set('contact_name')} /></Field><Field l="Title"><input className="input" value={form.contact_title} onChange={set('contact_title')} /></Field></div>
      <div className="flex gap-3"><Field l="Value ($)"><input type="number" className="input" value={form.value} onChange={set('value')} /></Field><Field l="Industry"><input className="input" value={form.industry} onChange={set('industry')} /></Field></div>
      <div className="flex gap-3">
        <Field l="Stage"><select className="input" value={form.stage} onChange={set('stage')}>{STAGES.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field l="Source"><select className="input" value={form.source} onChange={set('source')}>{SOURCES.map(s=> <option key={s}>{s}</option>)}</select></Field>
      </div>
      <div className="flex gap-3"><Field l="Phone"><input className="input" value={form.phone} onChange={set('phone')} /></Field><Field l="Email"><input className="input" value={form.email} onChange={set('email')} /></Field></div>
      <Field l="Address"><input className="input" value={form.address} onChange={set('address')} /></Field>
      <div className="flex gap-3"><Field l="Next action"><input className="input" value={form.next_action} onChange={set('next_action')} /></Field><Field l="Action date"><input type="date" className="input" value={form.action_date} onChange={set('action_date')} /></Field></div>
      <Field l="Services">
        <div className="flex flex-wrap gap-1.5">
          {SERVICES.map(s=>(
            <button key={s} onClick={()=>toggleService(s)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{border:`1px solid ${form.services.includes(s)?'#1B9E6E':'#DCE4F1'}`,color:form.services.includes(s)?'#1B9E6E':'#5C6B85',
                background:form.services.includes(s)?'rgba(27,158,110,.12)':'transparent'}}>{s}</button>
          ))}
        </div>
      </Field>
      <button onClick={save} className="brandbtn w-full rounded-xl py-3 font-semibold text-sm mt-1">{isNew?'Create lead':'Save changes'}</button>
    </div>
  );
}

function Tags({tags,active,toggle}){
  if(tags.length===0) return <div className="dim text-sm">No tags in the catalog yet.</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(t=>{ const on=active.includes(t.id);
        return <button key={t.id} onClick={()=>toggle(t.id)} className="text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{border:`1px solid ${on?t.color:'#DCE4F1'}`,color:on?t.color:'#5C6B85',background:on?t.color+'22':'transparent'}}>{t.emoji} {t.label}</button>;
      })}
    </div>
  );
}

function Notes({lead,updateLead}){
  const [v,setV]=useState(lead.notes||'');
  return (
    <div>
      <textarea className="input" rows={6} value={v} onChange={e=>setV(e.target.value)} placeholder="Call notes, context, next steps…" />
      <button onClick={()=>updateLead(lead.id,{notes:v})} className="brandbtn rounded-xl py-2.5 px-4 font-semibold text-sm mt-2">Save notes</button>
    </div>
  );
}
