// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// The shared tag catalog. Kept live so in-app create/edit/delete (Settings →
// Tags) reflects everywhere, and refetched when auth settles so a cold-load
// race doesn't leave it empty.
export function useTags() {
  const [tags, setTags] = useState([]);

  useEffect(() => {
    let active = true;
    const load = () =>
      supabase.from('tags').select('*').order('label')
        .then(({ data }) => { if (active) setTags(data || []); });

    load();
    const ch = supabase.channel('tags-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, load)
      .subscribe();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) load();
    });
    return () => { active = false; supabase.removeChannel(ch); sub.subscription.unsubscribe(); };
  }, []);

  return tags;
}
