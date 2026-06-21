// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
// Stages match the old app's funnel; colors match its legend.
export const STAGES = [
  { id:'prospect',           name:'Prospect',           color:'#9AA6C0' },
  { id:'qualified',          name:'Qualified',          color:'#4C9AFF' },
  { id:'discovery_done',     name:'Discovery Done',     color:'#9B8CFF' },
  { id:'solution_presented', name:'Solution Presented', color:'#F0C53C' },
  { id:'negotiating',        name:'Negotiating',        color:'#F0A93C' },
  { id:'closed_won',         name:'Closed Won',         color:'#35C28A' },
  { id:'closed_lost',        name:'Closed Lost',        color:'#626E8B' },
];
export const OPEN_STAGES = ['prospect','qualified','discovery_done','solution_presented','negotiating'];
export const SERVICES = ['Managed IT','Network & Security','Surveillance','M365 / Workspace','Website','Branding'];
export const SOURCES  = ['Cold Outreach','Referral','Inbound','Networking','Existing Client'];

export function daysUntil(iso){
  if(!iso) return null;
  const t=new Date(iso+'T00:00:00'); const n=new Date(); n.setHours(0,0,0,0);
  return Math.round((t-n)/86400000);
}
// Card health from next-action timing (mirrors the old app's overdue emphasis).
export function urgency(lead){
  if(lead.stage==='closed_won') return {tone:'won',label:'Won'};
  if(lead.stage==='closed_lost') return {tone:'lost',label:'Lost'};
  const d=daysUntil(lead.action_date);
  if(d===null) return {tone:'none',label:'No next step'};
  if(d<0)  return {tone:'cold',label:`${-d}d overdue`};
  if(d===0) return {tone:'warm',label:'Due today'};
  return {tone:'fresh',label:`in ${d}d`};
}
export const TONE = {fresh:'#2FB6C8',warm:'#F0A93C',cold:'#F0584E',won:'#35C28A',lost:'#626E8B',none:'#626E8B'};
export const money = (n)=> '$'+(Number(n)||0).toLocaleString('en-US');
// Display name for a profile/rep, resilient to a missing full_name or email.
export function repName(p){
  if(!p) return '—';
  return p.full_name || (p.email ? p.email.split('@')[0] : `Rep ${(p.id||'').slice(0,6)}`);
}
