// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { daysUntil, OPEN_STAGES } from '../../lib/pipeline';
import { useSettings } from '../../lib/settings';
import LeadCard from '../LeadCard';
import MapsPanel from '../MapsPanel';
import AskClaudePanel from '../AskClaudePanel';

export default function TodayTab({ leads, addLead, onOpen }){
  const settings=useSettings();
  const open=leads.filter(l=>OPEN_STAGES.includes(l.stage));
  const dated=open.filter(l=>l.action_date);
  const overdue=dated.filter(l=>daysUntil(l.action_date)<0).sort((a,b)=>daysUntil(a.action_date)-daysUntil(b.action_date));
  const todayCt=dated.filter(l=>daysUntil(l.action_date)===0).length;
  const upcoming=dated.filter(l=>daysUntil(l.action_date)>0).length;

  const panel=settings.todayPanel;

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* ---------- Top panel (Settings → Today panel) ---------- */}
      {panel==='maps' && (
        <>
          <div className="text-[10.5px] tracking-[0.18em] uppercase font-bold px-0.5" style={{color:'#2F6BF0'}}>Find leads nearby</div>
          <MapsPanel addLead={addLead} leads={leads} />
        </>
      )}
      {panel==='claude' && <AskClaudePanel leads={leads} />}

      {/* ---------- Stat tiles ---------- */}
      <div className="grid grid-cols-3 gap-2.5">
        {[['Overdue',overdue.length,'#DC4B43'],['Today',todayCt,'#D98A2B'],['Upcoming',upcoming,'#1B9E6E']].map(([lbl,n,c])=>(
          <div key={lbl} className="panel rounded-xl px-3 py-3.5">
            <div className="mono text-[25px] font-bold" style={{color:c,letterSpacing:'-0.02em'}}>{n}</div>
            <div className="dim text-[10px] uppercase tracking-wide font-bold mt-1">{lbl}</div>
          </div>
        ))}
      </div>

      {/* ---------- Overdue ---------- */}
      {overdue.length>0 && (
        <>
          <div className="flex items-center gap-2.5 mt-0.5 px-0.5">
            <div className="text-[15px] font-extrabold" style={{letterSpacing:'-0.01em'}}>Overdue</div>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{color:'#DC4B43',background:'rgba(220,75,67,.1)'}}>{overdue.length}</span>
            <div className="flex-1 h-px" style={{background:'var(--line)'}}/>
          </div>
          {overdue.map(l=> <LeadCard key={l.id} lead={l} onOpen={onOpen} />)}
        </>
      )}
      {leads.length===0 && <div className="dim text-sm text-center py-10">No leads yet — tap + to add your first.</div>}
    </div>
  );
}
