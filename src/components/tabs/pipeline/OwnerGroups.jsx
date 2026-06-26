// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { STAGES, money, repName, initials, avatarColor, urgency, TONE } from '../../../lib/pipeline';

const stageColor = (id) => STAGES.find(s => s.id === id)?.color || '#92A0B8';

function LeadRow({ lead, onOpen }) {
  const u = urgency(lead);
  return (
    <button onClick={() => onOpen(lead.id)}
      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#F4F7FC]">
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: stageColor(lead.stage) }} />
      <span className="font-semibold text-[13px] truncate flex-1">{lead.company || '(no name)'}</span>
      <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: TONE[u.tone] }}>{u.label}</span>
      <span className="mono text-[12.5px] font-bold whitespace-nowrap">{money(lead.value)}</span>
    </button>
  );
}

function OwnerPanel({ group, defaultOpen, onOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const name = group.isUnassigned ? 'Unassigned' : repName(group.owner);
  const seed = group.isUnassigned ? '—' : (group.owner?.id || name);
  return (
    <div className="surface rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-3.5 py-3">
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-none"
          style={{ background: avatarColor(seed) }}>{initials(name)}</span>
        <span className="min-w-0 flex-1 text-left">
          <span className="font-bold text-[14px] truncate flex items-center gap-1.5">
            {name}
            {group.isYou && <span className="text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(47,107,240,.12)', color: '#2F6BF0' }}>You</span>}
          </span>
          <span className="text-[11px] soft block">{group.count} deal{group.count !== 1 ? 's' : ''} · {money(group.value)}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className="dim flex-none transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      {open && <div className="px-1.5 pb-1.5 flex flex-col gap-0.5">
        {group.leads.map(l => <LeadRow key={l.id} lead={l} onOpen={onOpen} />)}
      </div>}
    </div>
  );
}

export default function OwnerGroups({ groups, onOpen }) {
  if (!groups.length) return <div className="dim text-sm text-center py-10">No deals to group yet — add one with +.</div>;
  return (
    <div className="flex flex-col gap-3 pt-1">
      {groups.map((g, i) => (
        <OwnerPanel key={g.isUnassigned ? '__unassigned__' : (g.owner?.id || i)}
          group={g} defaultOpen={g.isYou} onOpen={onOpen} />
      ))}
    </div>
  );
}
