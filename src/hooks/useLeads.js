// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useLeads(){
  const [leads,setLeads]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [userId,setUserId]=useState(null);

  // Keep the current user's id in sync with auth state (initial session, login,
  // logout, token refresh) so new leads are always stamped with the right owner.
  useEffect(()=>{
    const {data:{subscription}}=supabase.auth.onAuthStateChange(
      (_event,session)=>setUserId(session?.user?.id??null)
    );
    return ()=>subscription.unsubscribe();
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
    // Never persist an unowned lead on the shared board: if state hasn't caught up,
    // read the session directly (local, no network) and refuse rather than write null.
    let uid=userId;
    if(!uid){ const {data:{session}}=await supabase.auth.getSession(); uid=session?.user?.id??null; }
    if(!uid){ setError('You appear to be signed out — sign in again before adding a lead.'); return null; }
    const {data,error:e}=await supabase.from('leads').insert({...fields,user_id:uid}).select('id').single();
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
