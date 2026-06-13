// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useProfiles(isAdmin){
  const [profiles,setProfiles]=useState([]);
  useEffect(()=>{
    if(!isAdmin) return;
    supabase.from('profiles').select('id,full_name,email,role').then(({data})=>setProfiles(data||[]));
  },[isAdmin]);
  return profiles;
}
