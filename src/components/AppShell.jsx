// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { useLeads } from '../hooks/useLeads';
import { useTags } from '../hooks/useTags';
import { useProfiles } from '../hooks/useProfiles';
import TodayTab from './tabs/TodayTab';
import PipelineTab from './tabs/PipelineTab';
import CoachTab from './tabs/CoachTab';
import LeadsTab from './tabs/LeadsTab';
import StatsTab from './tabs/StatsTab';
import ImportTab from './tabs/ImportTab';
import LeadDetail from './LeadDetail';

const TABS=[
  {id:'today',label:'Today',icon:'☀️'},
  {id:'pipeline',label:'Pipeline',icon:'📊'},
  {id:'coach',label:'Coach',icon:'🎯'},
  {id:'leads',label:'Leads',icon:'👥'},
  {id:'stats',label:'Stats',icon:'📈'},
  {id:'import',label:'Import',icon:'📥'},
];

export default function AppShell({ profile, isAdmin, onSignOut }){
  const data=useLeads();
  const tags=useTags();
  const profiles=useProfiles(isAdmin);
  const [tab,setTab]=useState('today');
  const [detail,setDetail]=useState(null);

  const shared={ ...data, tags, isAdmin, profile, profiles, onSignOut, onOpen:(id)=>setDetail(id) };

  return (
    <div className="min-h-screen pb-20 max-w-2xl mx-auto">
      {data.error && (
        <div className="mx-4 mt-3 text-sm rounded-lg px-3 py-2 flex justify-between"
          style={{background:'rgba(240,88,78,.12)',color:'#F0584E',border:'1px solid rgba(240,88,78,.3)'}}>
          <span>{data.error}</span><button onClick={data.clearError} className="font-semibold">Dismiss</button>
        </div>
      )}

      {tab==='today'    && <TodayTab {...shared} />}
      {tab==='pipeline' && <PipelineTab {...shared} />}
      {tab==='coach'    && <CoachTab />}
      {tab==='leads'    && <LeadsTab {...shared} />}
      {tab==='stats'    && <StatsTab {...shared} />}
      {tab==='import'   && <ImportTab {...shared} />}

      <button onClick={()=>setDetail('new')} aria-label="Add lead"
        className="fixed right-4 bottom-20 w-14 h-14 rounded-full brandbtn text-3xl leading-none shadow-lg z-40">+</button>

      <nav className="fixed bottom-0 inset-x-0 panel border-t flex justify-around items-center h-16 z-30 max-w-2xl mx-auto">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className="flex flex-col items-center gap-0.5 px-2">
            <span className="text-lg" style={{filter: tab===t.id?'none':'grayscale(1)',opacity: tab===t.id?1:.55}}>{t.icon}</span>
            <span className="text-[10px] font-semibold tracking-wide" style={{color: tab===t.id?'#2FB6C8':'#626E8B'}}>{t.id.toUpperCase()}</span>
          </button>
        ))}
      </nav>

      {detail!==null && (
        <LeadDetail leadId={detail==='new'?null:detail} {...data} tags={tags} profiles={profiles} isAdmin={isAdmin} onClose={()=>setDetail(null)} />
      )}
    </div>
  );
}
