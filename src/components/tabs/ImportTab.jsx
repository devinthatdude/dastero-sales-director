// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';

const enc = encodeURIComponent;
const cleanPhone = (v) => ('' + v).replace(/[^\d+]/g, '');
const isEmail = (v) => /.+@.+\..+/.test('' + v);

// --- First-touch templates (edit FROM + copy to taste) ---
const FROM = 'Dastero Tech';
const firstName = (n) => { const w=(''+n).trim().split(/\s+/)[0]; return (!w||w.startsWith('('))?'':w; };
const tplSms  = (n) => `Hi${firstName(n)?` ${firstName(n)}`:''}, this is ${FROM} — quick question about your IT when you have a minute.`;
const tplSub  = (co) => `Quick question about ${co}'s IT`;
const tplBody = (n) => `Hi${firstName(n)?` ${firstName(n)}`:''},\n\nI'm with ${FROM} — we handle IT support, security, and more for local businesses, and we actually answer the phone.\n\nWorth a quick chat to see if we're a fit?\n\nThanks`;

function detect(keys){
  const find=(re,not)=>keys.find(k=>re.test(k.toLowerCase()) && !(not&&not.test(k.toLowerCase())));
  return {
    email:   find(/e-?mail/),
    phone:   find(/phone|mobile|cell|tel|number/),
    name:    find(/name|contact/, /company|business/),
    company: find(/company|business|organi|account|practice/),
    title:   find(/title|role|position|job/),
  };
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

export default function ImportTab({ addLead }){
  const [rows,setRows]=useState([]);
  const [cols,setCols]=useState({});
  const [fileName,setFileName]=useState('');
  const [added,setAdded]=useState({});
  const [err,setErr]=useState(null);

  const onFile=async(e)=>{
    const f=e.target.files[0]; if(!f) return;
    setFileName(f.name); setErr(null);
    try{
      const XLSX = await import('xlsx');           // lazy — keeps the tab alive even if dep isn't installed
      const buf=await f.arrayBuffer();
      const wb=XLSX.read(buf,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const data=XLSX.utils.sheet_to_json(ws,{defval:''});
      setRows(data);
      setCols(data.length?detect(Object.keys(data[0])):{});
    }catch(e2){
      setErr('Could not read that file. If this is the first run, install the parser: npm install xlsx — '+e2.message);
    }
  };

  const addAsLead=async(c,i)=>{
    const id=await addLead({
      company: c.company || c.name,
      contact_name: c.company ? c.name : '',
      contact_title: c.title || null,
      phone: c.phoneRaw || null,
      email: isEmail(c.email)?c.email:null,
      source: 'Imported', stage: 'prospect',
    });
    if(id) setAdded(a=>({...a,[i]:true}));
  };

  return (
    <div className="px-4 pt-5">
      <div className="text-[11px] uppercase tracking-widest font-semibold" style={{color:'#2FB6C8'}}>Import</div>
      <h1 className="text-3xl font-bold text-white mt-0.5 mb-1">Contacts</h1>
      <div className="soft text-sm mb-4">Load an Excel list. Tap a number to call or text, or an email to open Outlook — each opens with a first-touch message ready.</div>

      <label className="block w-full panel rounded-2xl py-6 text-center soft font-semibold text-sm cursor-pointer" style={{borderStyle:'dashed'}}>
        📄 &nbsp;{fileName || 'Choose an Excel file (.xlsx / .csv)'}
        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
      </label>

      {err && <div className="text-sm mt-3" style={{color:'#F0584E'}}>{err}</div>}
      {rows.length>0 && <div className="dim text-[13px] font-semibold mt-4 mb-2">{rows.length} contact{rows.length!==1?'s':''}</div>}

      {rows.map((r,i)=>{
        const c=resolve(r,cols);
        const sub = tplSub(c.company||c.name), body = tplBody(c.name);
        return (
          <div key={i} className="surface rounded-2xl p-3.5 mb-3">
            <div className="font-bold text-white text-base">{c.name}</div>
            {((c.company && c.company!==c.name) || c.title)
              ? <div className="soft text-[13px] mt-0.5">{[c.company!==c.name?c.company:'',c.title].filter(Boolean).join(' · ')}</div> : null}

            <div className="flex flex-col gap-2 mt-3">
              {c.phone && (
                <div className="flex gap-2">
                  <a href={`tel:${c.phone}`} className="flex-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 panel text-white font-semibold text-sm" style={{border:'1px solid rgba(53,194,138,.4)'}}>
                    <span style={{color:'#35C28A'}}>📞</span>
                    <span className="flex flex-col leading-tight min-w-0"><span className="dim text-[11px] uppercase tracking-wide">Call</span><span className="truncate">{c.phoneRaw}</span></span>
                  </a>
                  <a href={`sms:${c.phone}&body=${enc(tplSms(c.name))}`} className="rounded-xl px-4 flex items-center font-semibold text-[13px]" style={{border:'1px solid #26314B',color:'#2FB6C8'}}>💬 Text</a>
                </div>
              )}
              {isEmail(c.email) && (
                <div className="flex gap-2">
                  <a href={`ms-outlook://compose?to=${enc(c.email)}&subject=${enc(sub)}&body=${enc(body)}`} className="flex-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 panel text-white font-semibold text-sm" style={{border:'1px solid rgba(59,111,240,.4)'}}>
                    <span style={{color:'#3B6FF0'}}>✉️</span>
                    <span className="flex flex-col leading-tight min-w-0"><span className="dim text-[11px] uppercase tracking-wide">Outlook</span><span className="truncate">{c.email}</span></span>
                  </a>
                  <a href={`mailto:${enc(c.email)}?subject=${enc(sub)}&body=${enc(body)}`} className="rounded-xl px-4 flex items-center font-semibold text-[13px]" style={{border:'1px solid #26314B',color:'#2FB6C8'}}>Mail</a>
                </div>
              )}
            </div>

            <button onClick={()=>addAsLead(c,i)} disabled={added[i]}
              className="mt-3 text-[13px] font-semibold rounded-lg px-3 py-1.5"
              style={{color:added[i]?'#626E8B':'#35C28A',background:added[i]?'transparent':'rgba(53,194,138,.12)'}}>
              {added[i]?'✓ Added to leads':'+ Add as lead'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
