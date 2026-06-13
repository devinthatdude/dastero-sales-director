// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useLeads(){
  const [leads,setLeads]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [userId,setUserId]=useState(null);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>setUserId(data.user?.id??null));
  },[]);

  const fetchAll=useCallback(async ()=>{
    const {data:rows,error:e}=await supabase
      .from('leads').select('*, lead_tags(tag_id)')
      .order('action_date',{ascending:true,nullsFirst:false});
    if(e){ setError(e.message); setLoading(false); return; }
    setLeads((rows||[]).map(r=>({ ...r, tagIds:(r.lead_tags||[]).map(t=>t.tag_id) })));
    setLoading(false);
  },[]);

  useEffect(()=>{
    fetchAll();
    const ch=supabase.channel('leads-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'leads'},fetchAll)
      .on('postgres_changes',{event:'*',schema:'public',table:'lead_tags'},fetchAll)
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[fetchAll]);

  const run=async(op)=>{ const {error:e}=await op; if(e) setError(e.message); else fetchAll(); };

  const addLead=async(fields)=>{
    const {data,error:e}=await supabase.from('leads').insert({...fields,user_id:userId}).select('id').single();
    if(e){ setError(e.message); return null; }
    fetchAll(); return data?.id??null;
  };
  const updateLead=(id,patch)=>run(supabase.from('leads').update(patch).eq('id',id));
  const deleteLead=(id)=>run(supabase.from('leads').delete().eq('id',id));
  const setLeadTags=async(leadId,tagIds)=>{
    await supabase.from('lead_tags').delete().eq('lead_id',leadId);
    if(tagIds.length){
      const {error:e}=await supabase.from('lead_tags').insert(tagIds.map(t=>({lead_id:leadId,tag_id:t})));
      if(e){ setError(e.message); return; }
    }
    fetchAll();
  };

  return { leads, loading, error, userId, addLead, updateLead, deleteLead, setLeadTags, clearError:()=>setError(null) };
}
