// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
// Device-local settings (see src/lib/settings.js). Changes apply app-wide live.
import { STAGES, OPEN_STAGES, repName } from '../lib/pipeline';
import { useSettings, setSettings, resetSettings } from '../lib/settings';

const TABS = ['today','pipeline','coach','leads','stats','import'];
const openStages = STAGES.filter(s=>OPEN_STAGES.includes(s.id));

function Section({title,desc,children}){
  return (
    <div className="panel rounded-2xl p-4">
      <div className="text-[13px] font-extrabold" style={{letterSpacing:'-0.01em'}}>{title}</div>
      {desc && <div className="dim text-[11.5px] mt-0.5 leading-snug">{desc}</div>}
      <div className="mt-3">{children}</div>
    </div>
  );
}
function Seg({value,options,onChange}){
  return (
    <div className="flex gap-1.5">
      {options.map(o=>{
        const on=value===o.v;
        return (
          <button key={o.v} onClick={()=>onChange(o.v)} className="flex-1 text-[12px] font-bold py-2 rounded-lg"
            style={on?{background:'#2F6BF0',color:'#fff'}:{background:'#fff',border:'1px solid var(--line)',color:'#5C6B85'}}>{o.l}</button>
        );
      })}
    </div>
  );
}
function Lbl({children}){ return <div className="dim text-[11px] uppercase tracking-wide font-bold mb-1">{children}</div>; }

export default function SettingsModal({ onClose, profile, isAdmin, onSignOut, onChangePassword }){
  const s = useSettings();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{background:'rgba(4,7,15,.5)'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="panel w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between p-5 pb-3 sticky top-0" style={{background:'var(--panel)'}}>
          <h2 className="text-xl font-bold">Settings</h2>
          <button onClick={onClose} className="dim text-xl px-2" aria-label="Close">✕</button>
        </div>

        <div className="px-4 pb-6 flex flex-col gap-3">
          {/* Today panel */}
          <Section title="Today panel" desc="What shows at the top of the Today tab.">
            <Seg value={s.todayPanel} onChange={v=>setSettings({todayPanel:v})}
              options={[{v:'maps',l:'Google Maps'},{v:'claude',l:'Ask Claude'},{v:'hidden',l:'Hidden'}]} />
          </Section>

          {/* Forecast odds */}
          <Section title="Forecast odds" desc="Close-probability per stage — drives the weighted forecast on Pipeline.">
            <div className="flex flex-col gap-2.5">
              {openStages.map(st=>{
                const pct=Math.round((s.stageProbability[st.id]??0)*100);
                return (
                  <div key={st.id} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full flex-none" style={{background:st.color}}/>
                    <span className="text-[12.5px] font-bold w-28 flex-none">{st.name}</span>
                    <input type="range" min="0" max="100" step="5" value={pct} className="flex-1"
                      onChange={e=>setSettings({stageProbability:{...s.stageProbability,[st.id]:Number(e.target.value)/100}})} />
                    <span className="mono text-[12px] font-bold w-9 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* New-lead defaults */}
          <Section title="New-lead defaults" desc="Applied to every new lead (manual, import, or map).">
            <div className="flex gap-3">
              <label className="flex-1">
                <Lbl>Default stage</Lbl>
                <select className="input" value={s.defaultStage} onChange={e=>setSettings({defaultStage:e.target.value})}>
                  {openStages.map(st=> <option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
              </label>
              <label className="flex-1">
                <Lbl>Follow-up in (days)</Lbl>
                <input type="number" min="0" max="365" className="input" value={s.followUpDays}
                  onChange={e=>setSettings({followUpDays:Math.max(0,Number(e.target.value)||0)})} />
              </label>
            </div>
            <div className="dim text-[11px] mt-2">0 = leave the next-action date blank.</div>
          </Section>

          {/* Outreach identity */}
          <Section title="Outreach identity" desc="Used in the Import call/text/email templates.">
            <label className="block"><Lbl>Company name</Lbl>
              <input className="input" value={s.outreachCompany} onChange={e=>setSettings({outreachCompany:e.target.value})} placeholder="Dastero Tech" /></label>
            <label className="block mt-2"><Lbl>Your name (signature)</Lbl>
              <input className="input" value={s.outreachSender} onChange={e=>setSettings({outreachSender:e.target.value})} placeholder="optional" /></label>
          </Section>

          {/* Start screen */}
          <Section title="Start screen" desc="Which tab opens when you launch the app.">
            <select className="input" value={s.startTab} onChange={e=>setSettings({startTab:e.target.value})}>
              {TABS.map(t=> <option key={t} value={t}>{t[0].toUpperCase()+t.slice(1)}</option>)}
            </select>
          </Section>

          {/* Account */}
          <Section title="Account">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[13px] font-bold truncate">{profile?.email || repName(profile)}</div>
                <div className="dim text-[11.5px]">{isAdmin?'Admin':'Sales rep'}</div>
              </div>
            </div>
            <label className="block mt-3"><Lbl>Display name (this device)</Lbl>
              <input className="input" value={s.displayName} onChange={e=>setSettings({displayName:e.target.value})} placeholder={repName(profile)} /></label>
            <div className="flex gap-2 mt-3">
              <button onClick={onChangePassword} className="flex-1 font-bold text-[12.5px] py-2.5 rounded-lg panel">Change password</button>
              <button onClick={onSignOut} className="flex-1 font-bold text-[12.5px] py-2.5 rounded-lg" style={{color:'#DC4B43',background:'rgba(220,75,67,.1)'}}>Sign out</button>
            </div>
          </Section>

          {/* Data */}
          <Section title="Data" desc="Device-local only — does not touch your Supabase leads.">
            <div className="flex gap-2">
              <button onClick={()=>{ try{ localStorage.removeItem('dastero_imports'); }catch{/* */} }} className="flex-1 font-bold text-[12.5px] py-2.5 rounded-lg panel">Clear recent imports</button>
              <button onClick={()=>{ if(confirm('Reset all settings to defaults?')) resetSettings(); }} className="flex-1 font-bold text-[12.5px] py-2.5 rounded-lg panel">Reset settings</button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
