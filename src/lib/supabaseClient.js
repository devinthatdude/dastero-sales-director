// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // Surfaced loudly so a missing .env doesn't fail silently at runtime.
  console.error('Missing Supabase env vars — copy .env.example to .env and fill it in.');
}

export const supabase = createClient(url, key);
