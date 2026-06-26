// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { useLeads } from '../hooks/useLeads';
import { useTags } from '../hooks/useTags';
import { useProfiles } from '../hooks/useProfiles';
import { OPEN_STAGES, money, daysUntil, forecast, repName } from '../lib/pipeline';
import TodayTab from './tabs/TodayTab';
import PipelineTab from './tabs/PipelineTab';
import CoachTab from './tabs/CoachTab';
import LeadsTab from './tabs/LeadsTab';
import StatsTab from './tabs/StatsTab';
import ImportTab from './tabs/ImportTab';
import LeadDetail from './LeadDetail';
import ChangePassword from './ChangePassword';
import NetworkField from './NetworkField';
import SettingsModal from './SettingsModal';
import { useSettings } from '../lib/settings';

// Bottom-nav icons (stroke = currentColor) — mirror the design comp.
const ICONS = {
  today:    <><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></>,
  pipeline: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>,
  coach:    <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>,
  leads:    <><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M17 5.5a3 3 0 0 1 0 5.7M21 20c0-2.5-1.3-4.7-3.3-5.6"/></>,
  stats:    <path d="M4 20V6M12 20v-9M20 20V9M3 20h18"/>,
  import:   <path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>,
};
const TABS = ['today','pipeline','coach','leads','stats','import'];

// Per-tab header copy — derived from live data where the comp shows live numbers.
function header(tab, leads){
  const now = new Date();
  const greet = now.getHours()<12?'Good morning.':now.getHours()<18?'Good afternoon.':'Good evening.';
  const dateStr = now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
  const open = leads.filter(l=>OPEN_STAGES.includes(l.stage));
  const overdue = open.filter(l=>l.action_date && daysUntil(l.action_date)<0).length;
  const fc = forecast(leads);
  switch(tab){
    case 'pipeline': return { eyebrow:'PIPELINE', title:money(fc.openVal), sub:`${fc.count} active deal${fc.count!==1?'s':''} in play.` };
    case 'coach':    return { eyebrow:'COACH', title:'Plays', sub:'Ranked by deal value and time at risk.' };
    case 'leads':    return { eyebrow:'LEADS', title:'Your book', sub:`${leads.length} contact${leads.length!==1?'s':''} · ${open.length} active.` };
    case 'stats':    return { eyebrow:'PERFORMANCE', title:'This month', sub:'Closed-won and pipeline health.' };
    case 'import':   return { eyebrow:'IMPORT', title:'Bring leads in', sub:'CSV, spreadsheets or a connected source.' };
    default:         return { eyebrow:dateStr, title:greet, sub: overdue>0 ? `${overdue} deal${overdue!==1?'s':''} need a touch before end of day.` : 'Your pipeline is on track today.' };
  }
}

export default function AppShell({ profile, isAdmin, onSignOut }){
  const data=useLeads();
  const tags=useTags();
  const profiles=useProfiles();
  const settings=useSettings();
  const [tab,setTab]=useState(settings.startTab);
  const [detail,setDetail]=useState(null);
  const [menuOpen,setMenuOpen]=useState(false);
  const [pwOpen,setPwOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);

  const shared={ ...data, tags, isAdmin, profile, profiles, onSignOut, onOpen:(id)=>setDetail(id) };
  const h = header(tab, data.leads);
  const avatarName = settings.displayName || repName(profile);
  const dsInitials = (avatarName.match(/\b\w/g)||['D','S']).slice(0,2).join('').toUpperCase();
  const showFab = tab==='today' || tab==='leads';

  return (
    <div className="min-h-screen pb-24 max-w-[420px] mx-auto relative">
      {/* ---------- Header (constellation + eyebrow/title/sub + avatar) ---------- */}
      <div className="relative px-5 pt-8 pb-5">
        {tab==='today' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none"><NetworkField/></div>
        )}
        <div className="relative z-10 flex justify-between items-start gap-3">
          <div>
            <div className="text-[10.5px] tracking-[0.2em] uppercase font-bold" style={{color:'#2F6BF0'}}>{h.eyebrow}</div>
            <h1 className="text-[27px] font-extrabold leading-tight mt-1" style={{letterSpacing:'-0.02em'}}>{h.title}</h1>
            <div className="soft text-[13px] mt-1.5">{h.sub}</div>
          </div>
          <div className="relative flex-none">
            <button onClick={()=>setMenuOpen(o=>!o)} aria-label="Account"
              className="w-9 h-9 rounded-full text-white font-bold text-[13px] flex items-center justify-center"
              style={{background:'linear-gradient(150deg,#2F6BF0,#1E4FC8)',boxShadow:'0 4px 12px -4px rgba(47,107,240,.7)'}}>
              {dsInitials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 surface rounded-xl p-1 z-50 text-sm" style={{boxShadow:'0 12px 28px -10px rgba(12,22,38,.45)'}} onMouseLeave={()=>setMenuOpen(false)}>
                <div className="px-3 py-2 dim text-[11px] truncate">{profile?.email || repName(profile)}</div>
                <button onClick={()=>{setSettingsOpen(true);setMenuOpen(false);}} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F4F7FC] font-semibold">Settings</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {data.error && (
        <div className="mx-5 mb-1 text-sm rounded-lg px-3 py-2 flex justify-between"
          style={{background:'rgba(220,75,67,.1)',color:'#DC4B43',border:'1px solid rgba(220,75,67,.3)'}}>
          <span>{data.error}</span><button onClick={data.clearError} className="font-semibold">Dismiss</button>
        </div>
      )}

      {/* ---------- Screens ---------- */}
      <div className="px-4">
        {tab==='today'    && <TodayTab {...shared} />}
        {tab==='pipeline' && <PipelineTab {...shared} />}
        {tab==='coach'    && <CoachTab {...shared} />}
        {tab==='leads'    && <LeadsTab {...shared} />}
        {tab==='stats'    && <StatsTab {...shared} />}
        {tab==='import'   && <ImportTab {...shared} />}
      </div>

      {/* ---------- FAB ---------- */}
      {showFab && (
        <button onClick={()=>setDetail('new')} aria-label="Add lead"
          className="fixed right-5 bottom-[88px] w-[52px] h-[52px] rounded-full brandbtn text-3xl leading-none z-40 flex items-center justify-center"
          style={{maxWidth:'420px'}}>+</button>
      )}

      {/* ---------- Bottom nav ---------- */}
      <nav className="fixed bottom-0 inset-x-0 max-w-[420px] mx-auto flex justify-around items-center z-30 px-1 pt-2 pb-3"
        style={{background:'rgba(255,255,255,.9)',backdropFilter:'blur(8px)',borderTop:'1px solid var(--line)'}}>
        {TABS.map(id=>{
          const active = tab===id;
          return (
            <button key={id} onClick={()=>setTab(id)} className="flex flex-col items-center gap-1 flex-1"
              style={{color: active ? '#2F6BF0' : '#92A0B8'}}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS[id]}</svg>
              <span className="text-[9px] tracking-wider uppercase font-bold">{id}</span>
            </button>
          );
        })}
      </nav>

      {detail!==null && (
        <LeadDetail leadId={detail==='new'?null:detail} {...data} tags={tags} profiles={profiles} isAdmin={isAdmin} onClose={()=>setDetail(null)} />
      )}
      {pwOpen && <ChangePassword onClose={()=>setPwOpen(false)} />}
      {settingsOpen && (
        <SettingsModal onClose={()=>setSettingsOpen(false)} profile={profile} isAdmin={isAdmin}
          tags={tags} leads={data.leads}
          onSignOut={onSignOut} onChangePassword={()=>{setSettingsOpen(false);setPwOpen(true);}} />
      )}
    </div>
  );
}
