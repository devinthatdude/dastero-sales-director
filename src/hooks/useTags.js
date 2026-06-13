// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useTags(){
  const [tags,setTags]=useState([]);
  useEffect(()=>{
    supabase.from('tags').select('*').order('label').then(({data})=>setTags(data||[]));
  },[]);
  return tags;
}
