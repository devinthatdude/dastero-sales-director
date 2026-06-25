// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
//
// Device-local app settings (localStorage). No DB migration required; settings
// apply instantly and are per-browser. `useSettings()` re-renders subscribers on
// any change so toggles take effect app-wide without a reload.
import { useEffect, useState } from 'react';
import { STAGE_PROBABILITY } from './pipeline';

const KEY = 'dastero_settings';

export const SETTINGS_DEFAULTS = {
  todayPanel: 'hidden',                     // 'maps' | 'claude' | 'hidden' — hidden by default so a keyless prod looks clean

  startTab: 'today',                        // which tab the app opens on
  defaultStage: 'prospect',                 // stage applied to new leads
  followUpDays: 7,                          // new leads get a next-action date this many days out (0 = none)
  stageProbability: { ...STAGE_PROBABILITY },// tunes the weighted forecast
  outreachCompany: 'Dastero Tech',          // sender company in Import templates
  outreachSender: '',                       // optional sender name appended to outreach
  displayName: '',                          // optional local override for the greeting/avatar
};

let cache = null;
function read(){
  if(cache) return cache;
  try{ cache = { ...SETTINGS_DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
  catch{ cache = { ...SETTINGS_DEFAULTS }; }
  return cache;
}

const listeners = new Set();
const emit = () => listeners.forEach(l => l(cache));

export function getSettings(){ return read(); }
export function setSettings(patch){
  cache = { ...read(), ...patch };
  try{ localStorage.setItem(KEY, JSON.stringify(cache)); }catch{ /* ignore quota */ }
  emit();
}
export function resetSettings(){
  cache = { ...SETTINGS_DEFAULTS };
  try{ localStorage.removeItem(KEY); }catch{ /* ignore */ }
  emit();
}

// Initial field values for a newly-created lead, from the user's defaults.
export function newLeadDefaults(){
  const s = read();
  let action_date = '';
  const days = Number(s.followUpDays) || 0;
  if(days > 0){ const d = new Date(); d.setDate(d.getDate() + days); action_date = d.toISOString().slice(0,10); }
  return { stage: s.defaultStage || 'prospect', action_date };
}

export function useSettings(){
  const [s, setS] = useState(read);
  useEffect(()=>{ const l = (next)=>setS(next); listeners.add(l); return ()=>listeners.delete(l); },[]);
  return s;
}
