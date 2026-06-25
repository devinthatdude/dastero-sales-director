// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
// Stages match the old app's funnel; colors match its legend.
export const STAGES = [
  { id:'prospect',           name:'Prospect',           color:'#7C8AA6' },
  { id:'qualified',          name:'Qualified',          color:'#2F6BF0' },
  { id:'discovery_done',     name:'Discovery Done',     color:'#6E5BE0' },
  { id:'solution_presented', name:'Solution Presented', color:'#C7891B' },
  { id:'negotiating',        name:'Negotiating',        color:'#D98A2B' },
  { id:'closed_won',         name:'Closed Won',         color:'#1B9E6E' },
  { id:'closed_lost',        name:'Closed Lost',        color:'#92A0B8' },
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
export const TONE = {fresh:'#14B5C0',warm:'#D98A2B',cold:'#DC4B43',won:'#1B9E6E',lost:'#92A0B8',none:'#92A0B8'};
export const money = (n)=> '$'+(Number(n)||0).toLocaleString('en-US');

// ASSUMPTION (tune to taste): probability a deal at each stage closes. Used only
// to derive the "weighted forecast" the comp shows — your data has no win-prob field.
export const STAGE_PROBABILITY = {
  prospect:0.10, qualified:0.25, discovery_done:0.45, solution_presented:0.65, negotiating:0.80,
};
// Weighted forecast across open deals: weighted $, total open $, and overall likelihood %.
export function forecast(leads){
  const open = leads.filter(l=>OPEN_STAGES.includes(l.stage));
  const openVal = open.reduce((s,l)=>s+ +l.value,0);
  const weighted = open.reduce((s,l)=>s + (+l.value)*(STAGE_PROBABILITY[l.stage]??0),0);
  const pct = openVal>0 ? Math.round(weighted/openVal*100) : 0;
  return { open, count:open.length, openVal, weighted:Math.round(weighted), pct };
}

// Avatar helpers for lead rows — stable color per company, 2-letter initials.
export const AVATAR_PALETTE = ['#2F6BF0','#0B8C95','#6E5BD6','#1B9E6E','#C77A1A','#3F5FA6','#B0476B'];
export function initials(name){
  const w=(name||'').trim().split(/\s+/).filter(Boolean);
  if(!w.length) return '—';
  return ((w[0][0]||'')+(w[1]?.[0]||'')).toUpperCase();
}
export function avatarColor(seed){
  const s=(seed||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  return AVATAR_PALETTE[s%AVATAR_PALETTE.length];
}
// Display name for a profile/rep, resilient to a missing full_name or email.
export function repName(p){
  if(!p) return '—';
  return p.full_name || (p.email ? p.email.split('@')[0] : `Rep ${(p.id||'').slice(0,6)}`);
}
