// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { urgency, TONE, money, STAGES } from '../lib/pipeline';

const stageName = (id) => STAGES.find((s) => s.id === id)?.name || id;

// Detailed lead card (Today / overdue). Left accent bar + stage & service pills + age.
export default function LeadCard({ lead, onOpen }){
  const u = urgency(lead);
  const c = TONE[u.tone];
  const service = (lead.services || [])[0];

  return (
    <div onClick={()=>onOpen(lead.id)}
      className="surface rounded-xl px-3.5 py-3 mb-3 cursor-pointer relative overflow-hidden flex flex-col gap-2.5">
      <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded" style={{background:c}}/>
      <div className="flex justify-between items-start gap-2.5 pl-1.5">
        <div className="min-w-0">
          <div className="font-bold text-[15px] leading-tight truncate" style={{letterSpacing:'-0.01em'}}>{lead.company}</div>
          {lead.contact_name && (
            <div className="text-xs soft mt-0.5 truncate">{lead.contact_name}{lead.contact_title?` · ${lead.contact_title}`:''}</div>
          )}
        </div>
        <div className="mono font-bold text-[14.5px] whitespace-nowrap">{money(lead.value)}</div>
      </div>
      <div className="flex items-center gap-2 flex-wrap pl-1.5">
        <span className="text-[10.5px] font-bold px-2.5 py-[3px] rounded-full" style={{background:'rgba(47,107,240,.09)',color:'#2F6BF0'}}>{stageName(lead.stage)}</span>
        {service && <span className="text-[10.5px] font-bold px-2.5 py-[3px] rounded-full" style={{background:'rgba(20,181,192,.12)',color:'#0B8C95'}}>{service}</span>}
        <span className="ml-auto text-[11px] font-bold" style={{color:c}}>{u.label}</span>
      </div>
    </div>
  );
}
