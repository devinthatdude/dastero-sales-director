// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
const SHEETS=[
  {svc:"Managed IT",icon:"⚙️",q:"What would it be worth to never troubleshoot a tech issue again?",
   points:["All the benefits of an in-house team at a fraction of the cost","Proactive, not reactive — caught before it bites","We actually answer the phone"]},
  {svc:"Network & Security",icon:"🔒",q:"If a hacker got in today, would you know within 24 hours?",
   points:["Downtime and breaches cost more than prevention","Free audit of where you stand","Built for businesses that can't afford to be offline"]},
  {svc:"Surveillance Systems",icon:"📷",q:"How much could one camera system save in shrinkage or liability?",
   points:["Check your sites from your phone, on-site or remote","Peace of mind across every location"]},
  {svc:"M365 / Workspace",icon:"📧",q:"Are your employees using personal Gmail for company business?",
   points:["Set the productivity foundation right once","Email, files, and user management handled"]},
  {svc:"Website",icon:"🌐",q:"When did a customer last judge you by your website?",
   points:["Your digital front door — reliable on every device","Clean, fast, and clear"]},
  {svc:"Branding",icon:"🎨",q:"Does your brand look as professional as your work is?",
   points:["Consistent logo, cards, and social","Pairs naturally with a new site"]},
];

export default function CoachTab(){
  return (
    <div className="px-4 pt-5">
      <div className="text-[11px] uppercase tracking-widest font-semibold" style={{color:'#2FB6C8'}}>Sales Coach</div>
      <h1 className="text-3xl font-bold text-white mt-0.5 mb-1">Service Cheat Sheets</h1>
      <div className="soft text-sm mb-4">Tap-ready openers to arm yourself mid-conversation.</div>
      {SHEETS.map(s=>(
        <div key={s.svc} className="surface rounded-2xl p-4 mb-3">
          <div className="text-2xl">{s.icon}</div>
          <div className="font-bold text-lg text-white mt-1">{s.svc}</div>
          <div className="soft italic text-sm mt-1">"{s.q}"</div>
          <ul className="mt-2 space-y-1">
            {s.points.map((p,i)=> <li key={i} className="text-xs dim flex gap-2"><span style={{color:'#35C28A'}}>›</span><span>{p}</span></li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
