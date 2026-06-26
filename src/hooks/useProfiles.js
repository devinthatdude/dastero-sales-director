// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Profiles power owner-name resolution across the shared board. The initial
// fetch can lose the race against session hydration on a cold load, so we also
// refetch whenever the auth state settles — names then resolve without a reload.
export function useProfiles() {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    let active = true;
    const load = () =>
      supabase.from('profiles').select('id,full_name,email,role')
        .then(({ data }) => { if (active) setProfiles(data || []); });

    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) load();
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return profiles;
}
