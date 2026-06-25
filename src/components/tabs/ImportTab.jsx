// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { useSettings, newLeadDefaults } from '../../lib/settings';

const enc = encodeURIComponent;
const cleanPhone = (v) => ('' + v).replace(/[^\d+]/g, '');
const isEmail = (v) => /.+@.+\..+/.test('' + v);

const firstName = (n) => { const w=(''+n).trim().split(/\s+/)[0]; return (!w||w.startsWith('('))?'':w; };
const tplSms  = (n, co) => `Hi${firstName(n)?` ${firstName(n)}`:''}, this is ${co} — quick question about your IT when you have a minute.`;
const tplSub  = (company) => `Quick question about ${company}'s IT`;
const tplBody = (n, co, sender) => `Hi${firstName(n)?` ${firstName(n)}`:''},\n\nI'm with ${co} — we handle IT support, security, and more for local businesses, and we actually answer the phone.\n\nWorth a quick chat to see if we're a fit?\n\nThanks${sender?`,\n${sender}`:''}`;

function detect(keys){
  const find=(re,not)=>keys.find(k=>re.test(k.toLowerCase()) && !(not&&not.test(k.toLowerCase())));
  return { email:find(/e-?mail/), phone:find(/phone|mobile|cell|tel|number/), name:find(/name|contact/,/company|business/), company:find(/company|business|organi|account|practice/), title:find(/title|role|position|job/) };
}
function resolve(r, col){
  let email = col.email ? r[col.email] : '';
  if(!isEmail(email)) email = Object.values(r).find(isEmail) || '';
  let phoneRaw = col.phone ? r[col.phone] : '';
  if(!cleanPhone(phoneRaw)) phoneRaw = Object.values(r).find(v=>cleanPhone(v).length>=7 && !isEmail(v)) || '';
  const company = col.company ? r[col.company] : '';
  const name = (col.name ? r[col.name] : '') || company || '(no name)';
  const title = col.title ? r[col.title] : '';
  return { name, company, title, email, phoneRaw, phone: cleanPhone(phoneRaw) };
}

// Recent-import history (localStorage — there's no import-log table).
const HKEY='dastero_imports';
const loadHistory=()=>{ try{ return JSON.parse(localStorage.getItem(HKEY))||[]; }catch{ return []; } };
const relTime=(ts)=>{ const d=Math.floor((Date.now()-ts)/86400000); return d<=0?'today':d===1?'yesterday':`${d} days ago`; };

const SOURCES=[
  { name:'HubSpot', sub:'CRM · contacts & deals', tag:'HS', bg:'#FF7A59' },
  { name:'Google Contacts', sub:'Email & phone', tag:'G', bg:'#3F7BF0' },
  { name:'Outlook', sub:'Calendar & contacts', tag:'O', bg:'#1B72C4' },
  { name:'Salesforce', sub:'Accounts & opportunities', tag:'SF', bg:'#1B9E6E' },
];

function Rule({children}){ return (
  <div className="flex items-center gap-2.5 mt-1 px-0.5">
    <div className="text-[15px] font-extrabold" style={{letterSpacing:'-0.01em'}}>{children}</div>
    <div className="flex-1 h-px" style={{background:'var(--line)'}}/>
  </div>
); }

export default function ImportTab({ addLead }){
  const settings=useSettings();
  const company=settings.outreachCompany||'Dastero Tech';
  const sender=settings.outreachSender||'';
  const [rows,setRows]=useState([]);
  const [cols,setCols]=useState({});
  const [added,setAdded]=useState({});
  const [err,setErr]=useState(null);
  const [history,setHistory]=useState(loadHistory());

  const onFile=async(e)=>{
    const f=e.target.files[0]; if(!f) return;
    setErr(null);
    try{
      const XLSX=await import('xlsx');
      const buf=await f.arrayBuffer();
      const wb=XLSX.read(buf,{type:'array'});
      const data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
      setRows(data); setCols(data.length?detect(Object.keys(data[0])):{}); setAdded({});
      const entry={ file:f.name, count:data.length, ts:Date.now() };
      const next=[entry,...history].slice(0,5);
      setHistory(next); localStorage.setItem(HKEY,JSON.stringify(next));
    }catch(e2){
      setErr('Could not read that file. If this is the first run, install the parser: npm install xlsx — '+e2.message);
    }
  };

  const addAsLead=async(c,i)=>{
    const id=await addLead({ company:c.company||c.name, contact_name:c.company?c.name:'', contact_title:c.title||null,
      phone:c.phoneRaw||null, email:isEmail(c.email)?c.email:null, source:'Imported', ...newLeadDefaults() });
    if(id) setAdded(a=>({...a,[i]:true}));
  };

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* Dropzone */}
      <label className="rounded-2xl bg-white px-4 py-6 text-center flex flex-col items-center gap-2.5 cursor-pointer" style={{border:'1.5px dashed #B9C6DD'}}>
        <div className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center" style={{background:'rgba(47,107,240,.1)'}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2F6BF0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>
        </div>
        <div className="text-[14.5px] font-bold">Drop a CSV or spreadsheet</div>
        <div className="text-[12px] soft leading-snug" style={{maxWidth:'30ch'}}>Map columns to leads and contacts — tap a number to call or text, or an email to reach out.</div>
        <span className="brandbtn text-white font-bold text-[12.5px] px-4 py-2 rounded-lg mt-1">Choose file</span>
        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
      </label>
      {err && <div className="text-sm" style={{color:'#DC4B43'}}>{err}</div>}

      {/* Parsed contacts (working importer) */}
      {rows.length>0 && (
        <>
          <div className="dim text-[13px] font-bold mt-1">{rows.length} contact{rows.length!==1?'s':''}</div>
          {rows.map((r,i)=>{
            const c=resolve(r,cols), sub=tplSub(c.company||c.name), body=tplBody(c.name,company,sender);
            return (
              <div key={i} className="surface rounded-xl p-3.5">
                <div className="font-bold text-[15px]">{c.name}</div>
                {((c.company&&c.company!==c.name)||c.title) && <div className="soft text-[12.5px] mt-0.5">{[c.company!==c.name?c.company:'',c.title].filter(Boolean).join(' · ')}</div>}
                <div className="flex flex-col gap-2 mt-3">
                  {c.phone && (
                    <div className="flex gap-2">
                      <a href={`tel:${c.phone}`} className="flex-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 panel font-bold text-sm" style={{border:'1px solid rgba(27,158,110,.4)'}}>
                        <span style={{color:'#1B9E6E'}}>📞</span><span className="flex flex-col leading-tight min-w-0"><span className="dim text-[11px] uppercase tracking-wide">Call</span><span className="truncate">{c.phoneRaw}</span></span>
                      </a>
                      <a href={`sms:${c.phone}&body=${enc(tplSms(c.name,company))}`} className="rounded-xl px-4 flex items-center font-bold text-[13px]" style={{border:'1px solid var(--line)',color:'#2F6BF0'}}>💬 Text</a>
                    </div>
                  )}
                  {isEmail(c.email) && (
                    <div className="flex gap-2">
                      <a href={`mailto:${enc(c.email)}?subject=${enc(sub)}&body=${enc(body)}`} className="flex-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 panel font-bold text-sm" style={{border:'1px solid rgba(47,107,240,.4)'}}>
                        <span style={{color:'#2F6BF0'}}>✉️</span><span className="flex flex-col leading-tight min-w-0"><span className="dim text-[11px] uppercase tracking-wide">Email</span><span className="truncate">{c.email}</span></span>
                      </a>
                    </div>
                  )}
                </div>
                <button onClick={()=>addAsLead(c,i)} disabled={added[i]} className="mt-3 text-[13px] font-bold rounded-lg px-3 py-1.5"
                  style={{color:added[i]?'#92A0B8':'#1B9E6E',background:added[i]?'transparent':'rgba(27,158,110,.12)'}}>
                  {added[i]?'✓ Added to leads':'+ Add as lead'}
                </button>
              </div>
            );
          })}
        </>
      )}

      {/* Connect a source (integrations not yet wired — honestly labeled) */}
      {rows.length===0 && (
        <>
          <Rule>Connect a source</Rule>
          {SOURCES.map(s=>(
            <div key={s.name} className="panel rounded-xl px-3 py-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] text-white font-bold text-[12px] flex items-center justify-center flex-none" style={{background:s.bg}}>{s.tag}</div>
              <div className="flex-1 min-w-0"><div className="text-[13.5px] font-bold">{s.name}</div><div className="text-[11.5px] soft">{s.sub}</div></div>
              <span className="text-[11px] font-bold px-3 py-1.5 rounded-lg flex-none dim" style={{border:'1px solid var(--line)'}}>Soon</span>
            </div>
          ))}

          {history.length>0 && (
            <>
              <Rule>Recent imports</Rule>
              {history.map((h,i)=>(
                <div key={i} className="panel rounded-xl px-3 py-2.5 flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B9E6E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l2 2 4-4"/></svg>
                  <div className="flex-1 min-w-0"><div className="mono text-[13px] font-bold truncate">{h.file}</div><div className="text-[11.5px] soft">{h.count} contact{h.count!==1?'s':''} · {relTime(h.ts)}</div></div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
