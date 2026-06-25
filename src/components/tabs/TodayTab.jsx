// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { daysUntil, money, OPEN_STAGES } from '../../lib/pipeline';
import LeadCard from '../LeadCard';
import ChangePassword from '../ChangePassword';
import NetworkField from '../NetworkField';

export default function TodayTab({ leads, tags, onOpen, onSignOut }){
  const [pwOpen, setPwOpen] = useState(false);
  const now=new Date(); const hr=now.getHours();
  const greet=hr<12?'Good morning.':hr<18?'Good afternoon.':'Good evening.';
  const dateStr=now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}).toUpperCase();

  const open=leads.filter(l=>OPEN_STAGES.includes(l.stage));
  const openVal=open.reduce((s,l)=>s+ +l.value,0);
  const withDate=open.filter(l=>l.action_date);
  const overdue=withDate.filter(l=>daysUntil(l.action_date)<0).sort((a,b)=>daysUntil(a.action_date)-daysUntil(b.action_date));
  const todayCt=withDate.filter(l=>daysUntil(l.action_date)===0).length;
  const upcoming=withDate.filter(l=>daysUntil(l.action_date)>0).length;

  return (
    <div className="px-4 pt-5">
      <div className="relative overflow-hidden">
        <NetworkField/>
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <div className="text-[11px] uppercase tracking-widest font-semibold" style={{color:'#2F6BF0'}}>{dateStr}</div>
            <h1 className="text-3xl font-bold mt-0.5">{greet}</h1>
            <div className="soft text-sm mt-1">Here's what needs your attention today.</div>
          </div>
          <div className="flex flex-col items-end gap-1 mt-1">
            <button onClick={onSignOut} className="dim text-xs font-semibold">Sign out</button>
            <button onClick={() => setPwOpen(true)} className="dim text-xs font-semibold">Change password</button>
          </div>
        </div>
      </div>

      <div className="surface rounded-2xl p-5 mt-5">
        <div className="text-[11px] uppercase tracking-widest font-semibold" style={{color:'#1B9E6E'}}>Active Pipeline</div>
        <div className="mono text-4xl font-bold mt-1" style={{color:'#1B9E6E'}}>{money(openVal)}</div>
        <div className="soft text-sm mt-1">{open.length} deal{open.length!==1?'s':''} in motion</div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mt-3">
        {[['Overdue',overdue.length,'#DC4B43'],['Today',todayCt,'#D98A2B'],['Upcoming',upcoming,'#1B9E6E']].map(([lbl,n,c])=>(
          <div key={lbl} className="surface rounded-xl py-4 text-center">
            <div className="mono text-2xl font-bold" style={{color:c}}>{n}</div>
            <div className="dim text-[11px] uppercase tracking-wide font-semibold mt-0.5">{lbl}</div>
          </div>
        ))}
      </div>

      {overdue.length>0 && (
        <>
          <h2 className="text-xl font-bold mt-6 mb-2">Overdue</h2>
          {overdue.map(l=> <LeadCard key={l.id} lead={l} tags={tags} onOpen={onOpen} />)}
        </>
      )}
      {leads.length===0 && <div className="dim text-sm text-center py-10">No leads yet — tap + to add your first.</div>}
      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
    </div>
  );
}
