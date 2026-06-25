// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useRef } from 'react';
import { urgency, TONE, money } from '../lib/pipeline';

export default function LeadCard({ lead, tags, draggable=false, onOpen, onLongPress }){
  const u=urgency(lead);
  const c=TONE[u.tone];
  const leadTags=(lead.tagIds||[]).map(id=>tags.find(t=>t.id===id)).filter(Boolean);
  const timer = useRef(null);

  const onTouchStart = onLongPress ? () => {
    timer.current = setTimeout(() => onLongPress(), 500);
  } : undefined;

  const cancelLong = onLongPress ? () => clearTimeout(timer.current) : undefined;

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e)=>e.dataTransfer.setData('text/plain',lead.id) : undefined}
      onClick={()=>onOpen(lead.id)}
      onTouchStart={onTouchStart}
      onTouchEnd={cancelLong}
      onTouchMove={cancelLong}
      className="surface rounded-xl p-3 mb-2 shadow-sm cursor-pointer transition"
      style={{borderLeftColor:c,borderLeftWidth:'3px'}}
    >
      <div className="flex justify-between items-baseline gap-2">
        <span className="font-semibold text-sm leading-tight">{lead.company}</span>
        <span className="font-semibold text-sm whitespace-nowrap mono" style={{color:'#0C1626'}}>{money(lead.value)}</span>
      </div>
      {lead.contact_name && (
        <div className="text-xs soft mt-0.5">{lead.contact_name}{lead.contact_title?` · ${lead.contact_title}`:''}</div>
      )}
      {(lead.services||[]).length>0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lead.services.map(s=>(
            <span key={s} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{background:'rgba(27,158,110,.12)',color:'#1B9E6E'}}>{s}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-2.5 gap-2">
        <span className="text-[11px] font-semibold" style={{color:c}}>{u.label}</span>
        {leadTags.length>0 && (
          <span className="flex gap-1">
            {leadTags.slice(0,5).map(t=>(
              <span key={t.id} title={t.label} className="w-2 h-2 rounded-full" style={{background:t.color}} />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
